const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Department = require("../models/Department");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

/**
 * MOCK AD LOGIN.
 * This is the ONLY file that should know the login check is against our
 * mock User collection instead of real Active Directory. When real LDAP
 * access is available, replace the body of this handler with an LDAP bind
 * call and leave everything downstream (JWT issuing, requireAuth, roles)
 * untouched.
 */
router.post("/login", asyncHandler(async (req, res) => {
  const { userID, password } = req.body;
  if (!userID || !password) {
    return res.status(400).json({ error: "userID and password are required" });
  }

  const user = await User.findOne({ userID: userID.trim() });
  if (!user) return res.status(401).json({ error: "Invalid user ID or password" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid user ID or password" });

  // Reviewers get their department's hasOversightDashboard flag embedded in
  // the token so route/UI logic never has to hardcode which department keys
  // (wages, finance) get the oversight dashboard -- that's config on
  // Department, looked up once here.
  let hasOversightDashboard = false;
  if (user.role === "reviewer" && user.departmentKey) {
    const dept = await Department.findOne({ key: user.departmentKey });
    hasOversightDashboard = Boolean(dept?.hasOversightDashboard);
  }

  const payload = {
    userID: user.userID,
    fullName: user.fullName,
    role: user.role,
    departmentKey: user.departmentKey,
    assignedItemKey: user.assignedItemKey,
    hasOversightDashboard,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  res.json({ token, user: payload });
}));

module.exports = router;
