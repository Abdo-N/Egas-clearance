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
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    items: { type: [requestItemSchema], default: [] },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const clearanceRequestSchema = new mongoose.Schema(
  {
    employeeUsername: { type: String, required: true },
    employeeFullName: { type: String, required: true },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    departments: { type: [requestDepartmentSchema], default: [] },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClearanceRequest", clearanceRequestSchema);
