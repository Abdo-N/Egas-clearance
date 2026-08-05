const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Department = require("../models/Department");
const { isPasswordStrongEnough, MIN_LENGTH } = require("../utils/passwordPolicy");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Login by email + password. `userID` is the underlying field name (kept as
// unchanged plumbing throughout the codebase -- see User.js) but every
// account is now created via self-registration below, so in practice it
// always holds the person's email address.
router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await User.findOne({ userID: email.trim().toLowerCase() });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const payload = await buildTokenPayload(user);
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  res.json({ token, user: payload });
}));

/**
 * Self-registration: anyone can create their own File Management or reviewer
 * account with an email + password, choosing their own role/department (and,
 * for IT, which of the 5 itemized checklist items they own) -- no approval
 * step. Department/item choices are still validated against real
 * `Department` data so a request's tier-locking and itemized-signing logic
 * never has to trust unvalidated input; the one integrity rule enforced here
 * is that each IT checklist item can only ever have one owning account.
 */
router.post("/register", asyncHandler(async (req, res) => {
  const { email, password, fullName, role, departmentKey, assignedItemKey } = req.body;

  if (!email || !email.trim() || !fullName || !fullName.trim()) {
    return res.status(400).json({ error: "'email' and 'fullName' are required" });
  }
  if (!["file_management", "reviewer"].includes(role)) {
    return res.status(400).json({ error: "'role' must be 'file_management' or 'reviewer'" });
  }
  if (!isPasswordStrongEnough(password)) {
    return res.status(400).json({ error: `Password must be at least ${MIN_LENGTH} characters and include a symbol` });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ userID: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  let department = null;
  if (role === "reviewer") {
    if (!departmentKey) {
      return res.status(400).json({ error: "'departmentKey' is required for a reviewer account" });
    }
    department = await Department.findOne({ key: departmentKey });
    if (!department) {
      return res.status(400).json({ error: "Unknown department" });
    }

    if (department.signatureMode === "itemized") {
      const item = department.checklistItems.find((i) => i.key === assignedItemKey);
      if (!item) {
        return res.status(400).json({ error: "'assignedItemKey' must be one of this department's checklist items" });
      }
      const itemTaken = await User.findOne({ departmentKey, assignedItemKey });
      if (itemTaken) {
        return res.status(409).json({ error: "That checklist item already has an account assigned to it" });
      }
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    userID: normalizedEmail,
    passwordHash,
    fullName: fullName.trim(),
    role,
    departmentKey: role === "reviewer" ? departmentKey : null,
    assignedItemKey: role === "reviewer" && department.signatureMode === "itemized" ? assignedItemKey : null,
  });

  const payload = await buildTokenPayload(user);
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  res.status(201).json({ token, user: payload });
}));

// Shared by login and register: reviewers get their department's
// hasOversightDashboard flag (and display name) embedded in the token so
// route/UI logic never has to hardcode which department keys (wages,
// finance) get the oversight dashboard, or maintain a second copy of the
// department name list -- that's all config on Department, looked up once
// here.
async function buildTokenPayload(user) {
  let hasOversightDashboard = false;
  let departmentName_ar = null;
  let departmentName_en = null;
  if (user.role === "reviewer" && user.departmentKey) {
    const dept = await Department.findOne({ key: user.departmentKey });
    hasOversightDashboard = Boolean(dept?.hasOversightDashboard);
    departmentName_ar = dept?.name_ar || null;
    departmentName_en = dept?.name_en || null;
  }

  return {
    userID: user.userID,
    fullName: user.fullName,
    fullName_ar: user.fullName_ar || null,
    role: user.role,
    departmentKey: user.departmentKey,
    assignedItemKey: user.assignedItemKey,
    hasOversightDashboard,
    departmentName_ar,
    departmentName_en,
  };
}

module.exports = router;
