const express = require("express");
const Department = require("../models/Department");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Anyone logged in can see the department list (needed to render the
// 16-department status grid on the employee dashboard).
router.get("/", requireAuth, async (req, res) => {
  const departments = await Department.find().sort({ order: 1 });
  res.json(departments);
});

module.exports = router;
