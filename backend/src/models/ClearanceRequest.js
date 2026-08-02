const mongoose = require("mongoose");

/**
 * Snapshot of one checklist item's state for THIS request. We copy the
 * department's template into the request at creation time (see
 * requests.routes.js createRequest) so later edits to a Department's
 * template never change requests that are already in flight.
 */
const requestItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label_ar: { type: String, required: true },
    label_en: { type: String, required: true },
    order: { type: Number, required: true },
    checked: { type: Boolean, default: false },
    checkedBy: { type: String, default: null }, // username of reviewer
    checkedAt: { type: Date, default: null },
  },
  { _id: false }
);

const requestDepartmentSchema = new mongoose.Schema(
  {
    departmentKey: { type: String, required: true },
    name_ar: { type: String, required: true },
    name_en: { type: String, required: true },
    isFinal: { type: Boolean, default: false },
    // "rejected" means the department found something unresolved (e.g. an
    // outstanding item) and blocked clearance -- see request.routes.js's
    // PATCH .../reject. It overrides pending/completed until a reviewer or
    // admin clears it.
    status: { type: String, enum: ["pending", "completed", "rejected"], default: "pending" },
    items: { type: [requestItemSchema], default: [] },
    completedAt: { type: Date, default: null },
    rejectedReason: { type: String, default: null },
    rejectedBy: { type: String, default: null }, // username of reviewer/admin
    rejectedAt: { type: Date, default: null },
  },
  { _id: false }
);

// Why the employee is leaving. "retirement" covers Egypt's mandatory
// retirement-at-60 policy, referred to as "المعاش" -- see request.routes.js
// for the values accepted from the submission form.
const LEAVING_REASONS = ["resignation", "new_job", "retirement"];

const clearanceRequestSchema = new mongoose.Schema(
  {
    employeeUsername: { type: String, required: true },
    employeeFullName: { type: String, required: true },
    // Snapshotted from User.employeeMeta at submission (see POST / in
    // request.routes.js) -- which EGAS department the employee actually
    // works in, NOT one of the 13 clearance departments in `departments`
    // below. Shown to reviewers so they have context on who they're
    // clearing, instead of just re-showing the clearance department whose
    // checklist they're already looking at.
    employeeDepartment_ar: { type: String, default: "" },
    employeeDepartment_en: { type: String, default: "" },
    reason: { type: String, enum: LEAVING_REASONS, required: true },
    lastWorkingDay: { type: Date, required: true },
    // Mirrors the "any department rejected?" state across all departments --
    // see computeOverallStatus() in request.routes.js.
    status: { type: String, enum: ["in_progress", "completed", "rejected"], default: "in_progress" },
    departments: { type: [requestDepartmentSchema], default: [] },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const ClearanceRequest = mongoose.model("ClearanceRequest", clearanceRequestSchema);
ClearanceRequest.LEAVING_REASONS = LEAVING_REASONS;
module.exports = ClearanceRequest;
