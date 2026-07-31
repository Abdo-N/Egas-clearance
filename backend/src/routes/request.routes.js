const express = require("express");
const Department = require("../models/Department");
const ClearanceRequest = require("../models/ClearanceRequest");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * EMPLOYEE: submit a new clearance request.
 * Snapshots every department's current checklist template onto the
 * request so future template edits don't retroactively change
 * requests already in progress.
 */
router.post("/", requireAuth, requireRole("employee"), async (req, res) => {
  const existing = await ClearanceRequest.findOne({
    employeeUsername: req.user.username,
    status: "in_progress",
  });
  if (existing) {
    return res.status(409).json({ error: "You already have a clearance request in progress" });
  }

  const departments = await Department.find().sort({ order: 1 });
  if (departments.length === 0) {
    return res.status(500).json({ error: "No departments configured yet -- run the seed script" });
  }

  const request = await ClearanceRequest.create({
    employeeUsername: req.user.username,
    employeeFullName: req.user.fullName,
    departments: departments.map((d) => ({
      departmentKey: d.key,
      name_ar: d.name_ar,
      name_en: d.name_en,
      isFinal: d.isFinal,
      status: "pending",
      items: d.checklistItems
        .sort((a, b) => a.order - b.order)
        .map((i) => ({
          key: i.key,
          label_ar: i.label_ar,
          label_en: i.label_en,
          order: i.order,
          checked: false,
          checkedBy: null,
          checkedAt: null,
        })),
    })),
  });

  res.status(201).json(request);
});

// EMPLOYEE: view my own latest request.
router.get("/mine", requireAuth, requireRole("employee"), async (req, res) => {
  const request = await ClearanceRequest.findOne({ employeeUsername: req.user.username }).sort({
    createdAt: -1,
  });
  res.json(request || null);
});

/**
 * REVIEWER: list requests that still need action from MY department.
 * ADMIN: list every request.
 */
router.get("/", requireAuth, requireRole("reviewer", "admin"), async (req, res) => {
  if (req.user.role === "admin") {
    const all = await ClearanceRequest.find().sort({ createdAt: -1 });
    return res.json(all);
  }

  const mine = await ClearanceRequest.find({
    departments: {
      $elemMatch: { departmentKey: req.user.departmentKey, status: "pending" },
    },
  }).sort({ createdAt: 1 });
  res.json(mine);
});

// Anyone involved in the request can fetch its detail (employee owner,
// reviewer with a matching department entry, or admin).
router.get("/:id", requireAuth, async (req, res) => {
  const request = await ClearanceRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Not found" });

  const isOwner = request.employeeUsername === req.user.username;
  const isReviewerForThis =
    req.user.role === "reviewer" &&
    request.departments.some((d) => d.departmentKey === req.user.departmentKey);
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isReviewerForThis && !isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json(request);
});

/**
 * REVIEWER (or admin): check off one checklist item for their department.
 *
 * Enforces two rules baked in from the paper process:
 *   1. Items within a department must be checked in order (matches the
 *      IT department's required sequence: Phone -> PC -> ... -> AD deletion).
 *   2. A department flagged isFinal cannot have its LAST item checked until
 *      every other department on this request is "completed". This is what
 *      makes IT "go last" without hardcoding "IT" anywhere.
 */
router.patch(
  "/:id/departments/:deptKey/items/:itemKey",
  requireAuth,
  requireRole("reviewer", "admin"),
  async (req, res) => {
    const { checked } = req.body;
    if (typeof checked !== "boolean") {
      return res.status(400).json({ error: "'checked' boolean is required" });
    }

    const request = await ClearanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Not found" });

    const dept = request.departments.find((d) => d.departmentKey === req.params.deptKey);
    if (!dept) return res.status(404).json({ error: "Department not on this request" });

    if (req.user.role === "reviewer" && req.user.departmentKey !== dept.departmentKey) {
      return res.status(403).json({ error: "You can only check off your own department" });
    }

    const sortedItems = [...dept.items].sort((a, b) => a.order - b.order);
    const item = sortedItems.find((i) => i.key === req.params.itemKey);
    if (!item) return res.status(404).json({ error: "Item not found" });

    if (checked) {
      const itemIndex = sortedItems.findIndex((i) => i.key === req.params.itemKey);
      const priorUnchecked = sortedItems.slice(0, itemIndex).some((i) => !i.checked);
      if (priorUnchecked) {
        return res.status(400).json({ error: "Previous items in this department must be checked first" });
      }

      const isLastItem = itemIndex === sortedItems.length - 1;
      if (dept.isFinal && isLastItem) {
        const othersDone = request.departments
          .filter((d) => d.departmentKey !== dept.departmentKey)
          .every((d) => d.status === "completed");
        if (!othersDone) {
          return res.status(409).json({
            error:
              "All other departments must complete their clearance before this final step can be checked",
          });
        }
      }
    }

    // Mutate the real (unsorted) subdocument, not the sorted copy.
    const realItem = dept.items.find((i) => i.key === req.params.itemKey);
    realItem.checked = checked;
    realItem.checkedBy = checked ? req.user.username : null;
    realItem.checkedAt = checked ? new Date() : null;

    const allChecked = dept.items.every((i) => i.checked);
    dept.status = allChecked ? "completed" : "pending";
    dept.completedAt = allChecked ? new Date() : null;

    // If this was the final department's last item, the employee is fully
    // cleared. Also flip their mock-AD record so it's visible the "deletion"
    // happened (see User.archivedFromAD).
    const allDepartmentsDone = request.departments.every((d) => d.status === "completed");
    request.status = allDepartmentsDone ? "completed" : "in_progress";
    request.completedAt = allDepartmentsDone ? new Date() : null;

    if (allDepartmentsDone) {
      await User.findOneAndUpdate(
        { username: request.employeeUsername },
        { archivedFromAD: true, archivedAt: new Date() }
      );
    }

    await request.save();
    res.json(request);
  }
);

module.exports = router;
