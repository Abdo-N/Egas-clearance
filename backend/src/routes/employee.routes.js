const express = require("express");
const Employee = require("../models/Employee");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * FILE MANAGEMENT: search the (seed-only, mock-AD-stand-in) employee
 * directory by number or name when filing a new clearance request. With no
 * query, returns the current directory (most recently added first) so
 * File Management can see what's actually in the dummy database instead of
 * guessing a number/name to search for.
 */
router.get("/search", requireAuth, requireRole("file_management"), asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();

  const filter = q
    ? { $or: [{ employeeNumber: new RegExp(escapeRegex(q), "i") }, { fullName: new RegExp(escapeRegex(q), "i") }] }
    : {};
  const employees = await Employee.find(filter).sort({ createdAt: -1 }).limit(50);

  res.json(employees);
}));

/**
 * TEMPORARY DEV FEATURE -- the plan for this repo is that the employee
 * directory is seed-only (a stand-in for a real AD lookup later), not
 * something File Management manages in the app. This endpoint exists so
 * whoever's testing locally can add a test employee on the fly without
 * hand-editing employees.data.js and re-running `npm run seed` (which wipes
 * every in-progress request too). Delete this route + the matching
 * "add employee" UI in EmployeePicker.jsx once real accounts/AD exist, same
 * as demoAccounts.js.
 */
router.post("/", requireAuth, requireRole("file_management"), asyncHandler(async (req, res) => {
  const { employeeNumber, fullName, jobTitle, department_ar, department_en } = req.body;
  if (!employeeNumber || !employeeNumber.trim() || !fullName || !fullName.trim()) {
    return res.status(400).json({ error: "'employeeNumber' and 'fullName' are required" });
  }

  const existing = await Employee.findOne({ employeeNumber: employeeNumber.trim() });
  if (existing) {
    return res.status(409).json({ error: "An employee with that number already exists" });
  }

  const employee = await Employee.create({
    employeeNumber: employeeNumber.trim(),
    fullName: fullName.trim(),
    jobTitle: jobTitle?.trim() || "",
    department_ar: department_ar?.trim() || "",
    department_en: department_en?.trim() || "",
  });

  res.status(201).json(employee);
}));

module.exports = router;
