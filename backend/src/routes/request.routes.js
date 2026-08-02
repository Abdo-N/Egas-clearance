const express = require("express");
const Department = require("../models/Department");
const ClearanceRequest = require("../models/ClearanceRequest");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

// A single rejected department blocks the whole request regardless of how
// far along everyone else is; otherwise it's "completed" only once every
// department is, same as before rejection existed.
function computeOverallStatus(departments) {
  if (departments.some((d) => d.status === "rejected")) return "rejected";
  if (departments.every((d) => d.status === "completed")) return "completed";
  return "in_progress";
}

// Departments are snapshotted onto the request in Department.order at
// submission time (see POST / below), so array position IS the processing
// order for that request from then on. A department only becomes visible/
// actionable once every department before it in that order has fully
// completed -- the first department has nothing before it, so it's always
// unlocked. This is what makes IT "go last" (it's simply last in the array)
// without ever hardcoding "it" here.
function isDepartmentUnlocked(departments, deptKey) {
  const idx = departments.findIndex((d) => d.departmentKey === deptKey);
  if (idx <= 0) return true;
  return departments.slice(0, idx).every((d) => d.status === "completed");
}

/**
 * EMPLOYEE: submit a new clearance request.
 * Snapshots every department's current checklist template onto the
 * request so future template edits don't retroactively change
 * requests already in progress.
 */
router.post("/", requireAuth, requireRole("employee"), async (req, res) => {
  const { reason, lastWorkingDay } = req.body;
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
    reason,
    lastWorkingDay: parsedLastWorkingDay,
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
 * ADMIN: list every request (admin sees everything regardless of lock state).
 */
router.get("/", requireAuth, requireRole("reviewer", "admin"), async (req, res) => {
  if (req.user.role === "admin") {
    const all = await ClearanceRequest.find().sort({ createdAt: -1 });
    return res.json(all);
  }

  const mine = await ClearanceRequest.find({
    departments: {
      // "rejected" stays in the queue too, so the reviewer can clear it later.
      $elemMatch: { departmentKey: req.user.departmentKey, status: { $in: ["pending", "rejected"] } },
    },
  }).sort({ createdAt: 1 });

  // Only show it once every department before ours (in submission order)
  // has completed -- see isDepartmentUnlocked.
  const unlocked = mine.filter((r) => isDepartmentUnlocked(r.departments, req.user.departmentKey));
  res.json(unlocked);
});

// Anyone involved in the request can fetch its detail (employee owner,
// reviewer with a matching department entry, or admin).
router.get("/:id", requireAuth, async (req, res) => {
  const request = await ClearanceRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Not found" });

  const isOwner = request.employeeUsername === req.user.username;
  const isReviewerForThis =
    req.user.role === "reviewer" &&
    request.departments.some((d) => d.departmentKey === req.user.departmentKey) &&
    isDepartmentUnlocked(request.departments, req.user.departmentKey);
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
 *   1. A department is locked until every department before it in the
 *      request's department order has fully completed (isDepartmentUnlocked
 *      above). This is what makes IT "go last" -- it's simply last in the
 *      order -- without ever hardcoding "IT" anywhere.
 *   2. Items within an unlocked department must still be checked in order
 *      (matches the IT department's required sequence: Phone -> PC -> ... ->
 *      AD deletion).
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

    if (dept.status === "rejected") {
      return res.status(409).json({
        error: "This department's clearance was rejected. Clear the rejection before updating checklist items.",
      });
    }

    if (!isDepartmentUnlocked(request.departments, dept.departmentKey)) {
      return res.status(409).json({
        error: "Every department before this one must complete their clearance first",
      });
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
    request.status = computeOverallStatus(request.departments);
    request.completedAt = request.status === "completed" ? new Date() : null;

    if (request.status === "completed") {
      await User.findOneAndUpdate(
        { username: request.employeeUsername },
        { archivedFromAD: true, archivedAt: new Date() }
      );
    }

    await request.save();
    res.json(request);
  }
);

/**
 * REVIEWER (or admin): reject or clear a rejection for their department.
 *
 * Rejecting requires a reason and immediately blocks the whole request
 * (computeOverallStatus) regardless of how far every other department got --
 * this is the "one of the items isn't actually met" escape hatch from the
 * paper process, distinct from just not having checked an item yet.
 *
 * Checklist items on a rejected department are frozen (see the item-check
 * route's guard above) until a reviewer/admin clears the rejection here,
 * which recomputes the department's status from its items as if nothing
 * had happened.
 */
router.patch(
  "/:id/departments/:deptKey/reject",
  requireAuth,
  requireRole("reviewer", "admin"),
  async (req, res) => {
    const { rejected, reason } = req.body;
    if (typeof rejected !== "boolean") {
      return res.status(400).json({ error: "'rejected' boolean is required" });
    }
    if (rejected && (!reason || !reason.trim())) {
      return res.status(400).json({ error: "A 'reason' is required to reject a department" });
    }

    const request = await ClearanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Not found" });

    const dept = request.departments.find((d) => d.departmentKey === req.params.deptKey);
    if (!dept) return res.status(404).json({ error: "Department not on this request" });

    if (req.user.role === "reviewer" && req.user.departmentKey !== dept.departmentKey) {
      return res.status(403).json({ error: "You can only reject on behalf of your own department" });
    }

    if (!isDepartmentUnlocked(request.departments, dept.departmentKey)) {
      return res.status(409).json({
        error: "Every department before this one must complete their clearance first",
      });
    }

    if (rejected) {
      dept.status = "rejected";
      dept.rejectedReason = reason.trim();
      dept.rejectedBy = req.user.username;
      dept.rejectedAt = new Date();
    } else {
      const allChecked = dept.items.every((i) => i.checked);
      dept.status = allChecked ? "completed" : "pending";
      dept.completedAt = allChecked ? new Date() : null;
      dept.rejectedReason = null;
      dept.rejectedBy = null;
      dept.rejectedAt = null;
    }

    request.status = computeOverallStatus(request.departments);
    request.completedAt = request.status === "completed" ? new Date() : null;

    await request.save();
    res.json(request);
  }
);

module.exports = router;
