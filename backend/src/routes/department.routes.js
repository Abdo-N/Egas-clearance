const express = require("express");
const Department = require("../models/Department");
const { requireAuth } = require("../middleware/auth.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Anyone logged in can see the department list (needed to render the
// 13-department oversight grid on the wages/finance dashboards).
router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const departments = await Department.find().sort({ order: 1 });
  res.json(departments);
}));

module.exports = router;
