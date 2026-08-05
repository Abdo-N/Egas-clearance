const express = require("express");
const Department = require("../models/Department");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Public: static reference data (13 department names/tiers/signature modes),
// not sensitive. Needed both by logged-in dashboards (13-department oversight
// grid) and by the registration form (Register.jsx), which runs before
// anyone has a token yet.
router.get("/", asyncHandler(async (req, res) => {
  const departments = await Department.find().sort({ order: 1 });
  res.json(departments);
}));

module.exports = router;
