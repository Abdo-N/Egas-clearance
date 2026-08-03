const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const Department = require("../models/Department");
const Employee = require("../models/Employee");
const User = require("../models/User");
const ClearanceRequest = require("../models/ClearanceRequest");
const { requireAuth, requireRole, requireOwnDepartment } = require("../middleware/auth.middleware");
const { generateClearancePdf } = require("../services/clearancePdf");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const UPLOAD_ROOT = path.resolve(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_ROOT, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const label = req.params.itemKey || req.params.deptKey;
    const ext = path.extname(file.originalname) || "";
    cb(null, `${label}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Evidence must be a JPG/PNG/WEBP photo or a PDF"));
    }
    cb(null, true);
  },
});

// Every one of the 13 departments has signed -- necessary, but NOT
// sufficient, for the request to count as "completed" (see
// computeOverallStatus below). This is its own helper because it also gates
// archive-ad and is exposed to reviewers as `readyForAdDeletion` so IT knows
// when the delete-from-AD action becomes available without needing
// visibility into every other department's status.
function allDepartmentsSigned(departments) {
  return departments.every((d) => d.status === "completed");
}

// General rule: an employee is never actually "cleared" just because every
// department signed off -- IT deleting them from Active Directory is the
// real final step, not a formality after the fact. `status` only becomes
// "completed" once BOTH are true; until then (even with all 13 departments
// showing "completed") it stays "in_progress". No more "rejected" state now
// that reject/hold has been dropped entirely.
function computeOverallStatus(departments, archivedFromAD) {
  return allDepartmentsSigned(departments) && archivedFromAD ? "completed" : "in_progress";
}

// Tier-based locking (replaces the old full-chain order lock): a department
// is unlocked once every department with a LOWER tier has completed. Tier-1
// departments (1-11) have nothing below them, so they're always unlocked and
// sign in parallel; tier-2 (wages, finance) waits on all of tier 1. This is
// the one place the rule lives -- add more tiers later without touching
// anything else.
function isDepartmentUnlocked(departments, deptKey) {
  const dept = departments.find((d) => d.departmentKey === deptKey);
  if (!dept) return false;
  return departments.filter((d) => d.tier < dept.tier).every((d) => d.status === "completed");
}

// Only wages/finance (hasOversightDashboard, embedded in the JWT at login
// so this never hardcodes department keys) get full per-department detail
// -- who signed, when, and the uploaded evidence. File Management does NOT
// get this: they file requests and get a high-level progress view of their
// own submissions only, never signer identity or evidence.
function canSeeFull(user) {
  return user.role === "reviewer" && user.hasOversightDashboard === true;
}

// Whichever single department entry belongs to THIS reviewer, matching the
// visibility rule: departments 1-11 (incl. IT) only ever see their own
// slice of a request, never what other departments have signed. Also tags
// that entry with `needsAction` so the reviewer's dashboard can show "waiting
// on you" vs "already signed" without re-deriving the rule client-side.
function redactToOwnDepartment(request, user) {
  const obj = request.toObject ? request.toObject() : request;
  // Computed from the full (pre-redaction) departments array -- a single
  // yes/no flag doesn't leak which specific other departments are done, so
  // it's safe to hand to any reviewer, but it's what IT's UI needs to know
  // when the delete-from-AD action becomes available.
  const readyForAdDeletion = allDepartmentsSigned(obj.departments);
  const own = obj.departments.find((d) => d.departmentKey === user.departmentKey);
  if (!own) return { ...obj, departments: [], readyForAdDeletion };
  // Locked-but-still-"pending" must NOT read as needsAction=true -- matters
  // for oversight reviewers (see withOwnDepartmentAnnotated below), who see
  // every request including ones where their own tier-2 department hasn't
  // unlocked yet.
  const needsAction = isDepartmentUnlocked(obj.departments, user.departmentKey) && isPendingForReviewer(own, user);
  return { ...obj, departments: [{ ...own, needsAction }], readyForAdDeletion };
}

// Same `needsAction` tag as redactToOwnDepartment, but for oversight
// reviewers who get the full (un-redacted) departments array -- only their
// own entry is annotated, since "needs action" is meaningless for a
// department that isn't theirs.
function withOwnDepartmentAnnotated(request, user) {
  const obj = request.toObject ? request.toObject() : request;
  return {
    ...obj,
    readyForAdDeletion: allDepartmentsSigned(obj.departments),
    departments: obj.departments.map((d) => {
      if (d.departmentKey !== user.departmentKey) return d;
      const needsAction = isDepartmentUnlocked(obj.departments, user.departmentKey) && isPendingForReviewer(d, user);
      return { ...d, needsAction };
    }),
  };
}

// File Management's "high view": which of the 13 departments are done vs
// still pending, with no signer identity, timestamps, or evidence -- just
// enough to track where a request they filed is stuck.
function summarizeForFileManagement(request) {
  const obj = request.toObject ? request.toObject() : request;
  return {
    ...obj,
    // Lets File Management's UI distinguish "still waiting on some
    // department" from "every department signed, now just waiting on IT to
    // delete from AD" -- both currently read as the same "in_progress"
    // status otherwise, which is exactly what made this confusing.
    readyForAdDeletion: allDepartmentsSigned(obj.departments),
    departments: obj.departments.map((d) => ({
      departmentKey: d.departmentKey,
      name_ar: d.name_ar,
      name_en: d.name_en,
      order: d.order,
      tier: d.tier,
      status: d.status,
    })),
  };
}

// For itemized (IT) departments, "actionable for me" means MY specific item
// is still unsigned -- not the department as a whole, since teammates might
// have already finished theirs.
function isPendingForReviewer(dept, user) {
  if (dept.signatureMode === "itemized") {
    const item = dept.items.find((i) => i.key === user.assignedItemKey);
    return item ? item.status === "pending" : false;
  }
  return dept.status === "pending";
}

async function verifyPassword(userID, password) {
  const user = await User.findOne({ userID });
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}

/**
 * FILE MANAGEMENT: file a new clearance request on behalf of an employee
 * looked up from the (seed-only, mock-AD-stand-in) Employee directory.
 * Snapshots every department's current template onto the request so later
 * template edits don't retroactively change requests already in flight.
 */
router.post("/", requireAuth, requireRole("file_management"), asyncHandler(async (req, res) => {
  const { employeeNumber, reason, lastWorkingDay } = req.body;
  if (!employeeNumber || !employeeNumber.trim()) {
    return res.status(400).json({ error: "'employeeNumber' is required" });
  }
  if (!ClearanceRequest.LEAVING_REASONS.includes(reason)) {
    return res.status(400).json({
      error: `'reason' must be one of: ${ClearanceRequest.LEAVING_REASONS.join(", ")}`,
    });
  }

  const parsedLastWorkingDay = new Date(lastWorkingDay);
  if (!lastWorkingDay || Number.isNaN(parsedLastWorkingDay.getTime())) {
    return res.status(400).json({ error: "A valid 'lastWorkingDay' date is required" });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsedLastWorkingDay < today) {
    return res.status(400).json({ error: "'lastWorkingDay' cannot be in the past" });
  }

  const employee = await Employee.findOne({ employeeNumber: employeeNumber.trim() });
  if (!employee) {
    return res.status(404).json({ error: "No employee found with that employee number" });
  }

  const existing = await ClearanceRequest.findOne({
    employeeNumber: employee.employeeNumber,
    status: "in_progress",
  });
  if (existing) {
    return res.status(409).json({ error: "This employee already has a clearance request in progress" });
  }

  const departments = await Department.find().sort({ order: 1 });
  if (departments.length === 0) {
    return res.status(500).json({ error: "No departments configured yet -- run the seed script" });
  }

  const request = await ClearanceRequest.create({
    employeeNumber: employee.employeeNumber,
    employeeFullName: employee.fullName,
    employeeJobTitle: employee.jobTitle,
    employeeDepartment_ar: employee.department_ar,
    employeeDepartment_en: employee.department_en,
    reason,
    lastWorkingDay: parsedLastWorkingDay,
    createdByUserID: req.user.userID,
    departments: departments.map((d) => ({
      departmentKey: d.key,
      name_ar: d.name_ar,
      name_en: d.name_en,
      order: d.order,
      tier: d.tier,
      hasOversightDashboard: d.hasOversightDashboard,
      signatureMode: d.signatureMode,
      status: "pending",
      items:
        d.signatureMode === "itemized"
          ? d.checklistItems.map((i) => ({
              key: i.key,
              label_ar: i.label_ar,
              label_en: i.label_en,
              assignedItemKey: i.key,
              status: "pending",
            }))
          : [],
    })),
  });

  res.status(201).json(request);
}));

/**
 * Oversight (wages, finance) reviewers: every request, full per-department
 * detail. File Management: only requests THEY filed, high-level progress
 * only (no signer identity/evidence). Every other reviewer: every request
 * that's ever been unlocked for their department -- both still waiting on
 * them (`needsAction: true`) and already signed -- redacted to that one
 * department. This is what backs each reviewer's dashboard (not just a
 * to-do queue): they can see their own department's full history, not only
 * what's currently pending.
 */
router.get("/", requireAuth, requireRole("file_management", "reviewer"), asyncHandler(async (req, res) => {
  if (canSeeFull(req.user)) {
    const all = await ClearanceRequest.find().sort({ createdAt: -1 });
    return res.json(all.map((r) => withOwnDepartmentAnnotated(r, req.user)));
  }

  if (req.user.role === "file_management") {
    const mine = await ClearanceRequest.find({ createdByUserID: req.user.userID }).sort({ createdAt: -1 });
    return res.json(mine.map(summarizeForFileManagement));
  }

  const mine = await ClearanceRequest.find({
    "departments.departmentKey": req.user.departmentKey,
  }).sort({ createdAt: -1 });

  const visible = mine.filter((r) => {
    const dept = r.departments.find((d) => d.departmentKey === req.user.departmentKey);
    return Boolean(dept) && isDepartmentUnlocked(r.departments, req.user.departmentKey);
  });

  res.json(visible.map((r) => redactToOwnDepartment(r, req.user)));
}));

// Same visibility split as the list route, but doesn't require the
// department to still be pending -- a reviewer can reopen a request to see
// what they already signed.
router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const request = await ClearanceRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Not found" });

  if (canSeeFull(req.user)) return res.json(withOwnDepartmentAnnotated(request, req.user));

  if (req.user.role === "file_management") {
    if (request.createdByUserID !== req.user.userID) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json(summarizeForFileManagement(request));
  }

  if (req.user.role !== "reviewer") return res.status(403).json({ error: "Forbidden" });

  const dept = request.departments.find((d) => d.departmentKey === req.user.departmentKey);
  if (!dept || !isDepartmentUnlocked(request.departments, req.user.departmentKey)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json(redactToOwnDepartment(request, req.user));
}));

/**
 * REVIEWER: sign off a single-signature department -- re-enter your own
 * password (re-authentication, same logged-in identity) and upload a photo
 * or PDF of the physical signature/stamp, fresh for this request. Any one
 * of the department's 2+ reviewers signing is enough.
 */
router.post(
  "/:id/departments/:deptKey/sign",
  requireAuth,
  requireRole("reviewer"),
  requireOwnDepartment,
  upload.single("evidence"),
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "'password' is required to sign" });
    if (!req.file) return res.status(400).json({ error: "A signature photo or PDF is required to sign" });

    const request = await ClearanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Not found" });

    const dept = request.departments.find((d) => d.departmentKey === req.params.deptKey);
    if (!dept) return res.status(404).json({ error: "Department not on this request" });
    if (dept.signatureMode !== "single") {
      return res.status(400).json({ error: "This department uses itemized signing, not single signing" });
    }
    if (!isDepartmentUnlocked(request.departments, dept.departmentKey)) {
      return res.status(409).json({ error: "This department is still locked behind an earlier tier" });
    }
    if (dept.status === "completed") {
      return res.status(409).json({ error: "This department has already signed" });
    }

    const passwordOk = await verifyPassword(req.user.userID, password);
    if (!passwordOk) return res.status(401).json({ error: "Incorrect password" });

    dept.status = "completed";
    dept.signedByUserID = req.user.userID;
    dept.signedByFullName = req.user.fullName;
    dept.signedAt = new Date();
    dept.evidence = {
      fileUrl: `${request._id}/${req.file.filename}`,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    };

    // Signing never completes the request by itself -- see
    // computeOverallStatus. This only ever flips back to "in_progress" here
    // (e.g. re-evaluating after a late sign), never to "completed"; only
    // archive-ad can do that.
    request.status = computeOverallStatus(request.departments, request.archivedFromAD);
    await request.save();

    res.json(redactToOwnDepartment(request, req.user));
  })
);

/**
 * REVIEWER (IT only): sign off ONE of IT's 5 itemized checklist items --
 * only the reviewer whose assignedItemKey matches may sign it. The
 * department completes once all 5 items are signed.
 */
router.post(
  "/:id/departments/:deptKey/items/:itemKey/sign",
  requireAuth,
  requireRole("reviewer"),
  requireOwnDepartment,
  upload.single("evidence"),
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "'password' is required to sign" });
    if (!req.file) return res.status(400).json({ error: "A signature photo or PDF is required to sign" });
    if (req.user.assignedItemKey !== req.params.itemKey) {
      return res.status(403).json({ error: "You can only sign your own assigned item" });
    }

    const request = await ClearanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Not found" });

    const dept = request.departments.find((d) => d.departmentKey === req.params.deptKey);
    if (!dept) return res.status(404).json({ error: "Department not on this request" });
    if (dept.signatureMode !== "itemized") {
      return res.status(400).json({ error: "This department uses single signing, not itemized signing" });
    }
    if (!isDepartmentUnlocked(request.departments, dept.departmentKey)) {
      return res.status(409).json({ error: "This department is still locked behind an earlier tier" });
    }

    const item = dept.items.find((i) => i.key === req.params.itemKey);
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.status === "completed") {
      return res.status(409).json({ error: "This item has already been signed" });
    }

    const passwordOk = await verifyPassword(req.user.userID, password);
    if (!passwordOk) return res.status(401).json({ error: "Incorrect password" });

    item.status = "completed";
    item.signedByUserID = req.user.userID;
    item.signedByFullName = req.user.fullName;
    item.signedAt = new Date();
    item.evidence = {
      fileUrl: `${request._id}/${req.file.filename}`,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    };

    if (dept.items.every((i) => i.status === "completed")) {
      dept.status = "completed";
    }

    request.status = computeOverallStatus(request.departments, request.archivedFromAD);
    await request.save();

    res.json(redactToOwnDepartment(request, req.user));
  })
);

/**
 * REVIEWER (IT only): delete the employee from Active Directory. The real
 * final step of clearance -- only enabled once every one of the 13
 * departments has signed, independent of IT's own position (#10) in the
 * paper order. Any of IT's 5 reviewers may trigger it, re-authenticating the
 * same way signing does. This is the ONLY route that can ever set
 * `request.status` to "completed" -- per the general rule that an employee
 * isn't actually cleared just because every department signed off, signing
 * routes never do (see computeOverallStatus).
 */
router.post("/:id/archive-ad", requireAuth, requireRole("reviewer"), asyncHandler(async (req, res) => {
  if (req.user.departmentKey !== "it") {
    return res.status(403).json({ error: "Only IT can delete an employee from Active Directory" });
  }
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "'password' is required" });

  const request = await ClearanceRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Not found" });

  if (!allDepartmentsSigned(request.departments)) {
    return res.status(400).json({ error: "Every department must sign before deleting from Active Directory" });
  }
  if (request.archivedFromAD) {
    return res.status(409).json({ error: "This employee has already been deleted from Active Directory" });
  }

  const passwordOk = await verifyPassword(req.user.userID, password);
  if (!passwordOk) return res.status(401).json({ error: "Incorrect password" });

  const now = new Date();
  request.archivedFromAD = true;
  request.archivedAt = now;
  request.archivedByUserID = req.user.userID;
  request.status = computeOverallStatus(request.departments, true);
  request.completedAt = now;
  await request.save();

  await Employee.findOneAndUpdate(
    { employeeNumber: request.employeeNumber },
    { archivedFromAD: true, archivedAt: now }
  );

  res.json(redactToOwnDepartment(request, req.user));
}));

// Streams a stored evidence file. Only oversight reviewers and the
// department that produced it can view it -- File Management never sees
// evidence, matching their "high view only" restriction.
router.get("/:id/evidence/:deptKey/:itemKey?", requireAuth, asyncHandler(async (req, res) => {
  const request = await ClearanceRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Not found" });

  const canView =
    canSeeFull(req.user) || (req.user.role === "reviewer" && req.user.departmentKey === req.params.deptKey);
  if (!canView) return res.status(403).json({ error: "Forbidden" });

  const dept = request.departments.find((d) => d.departmentKey === req.params.deptKey);
  if (!dept) return res.status(404).json({ error: "Department not on this request" });

  const evidence = req.params.itemKey
    ? dept.items.find((i) => i.key === req.params.itemKey)?.evidence
    : dept.evidence;
  if (!evidence) return res.status(404).json({ error: "No evidence uploaded yet" });

  res.sendFile(path.join(UPLOAD_ROOT, evidence.fileUrl));
}));

// Generates the composited signature PDF on demand. Oversight reviewers can
// pull it at any time (a live preview of whatever's signed so far). File
// Management can only pull it for a request THEY filed, and only once it's
// fully "completed" -- the finished artifact, not a mid-process preview
// that would otherwise leak per-department progress beyond their high view.
router.get("/:id/pdf", requireAuth, requireRole("file_management", "reviewer"), asyncHandler(async (req, res) => {
  const request = await ClearanceRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Not found" });

  const allowed =
    canSeeFull(req.user) ||
    (req.user.role === "file_management" &&
      request.createdByUserID === req.user.userID &&
      request.status === "completed");
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const buffer = await generateClearancePdf(request);
  res.set("Content-Type", "application/pdf");
  res.set("Content-Disposition", `inline; filename="clearance-${request.employeeNumber}.pdf"`);
  res.send(buffer);
}));

module.exports = router;
