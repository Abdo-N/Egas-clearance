const mongoose = require("mongoose");

/**
 * A single checklist item template for a department (e.g. "Phone" for IT).
 * `order` controls the sequence within the department -- items must be
 * checked in ascending order (see requests.routes.js).
 */
const checklistItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // stable id, e.g. "phone"
    label_ar: { type: String, required: true },
    label_en: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * One of the 16 EGAS departments an employee needs clearance from.
 *
 * IMPORTANT: `checklistItems` here is only a TEMPLATE. Real per-department
 * requirements (besides IT) have not been gathered yet from EGAS -- see
 * PROJECT_STATUS.md "Blocked / needs real-world input". Each department
 * currently ships with a single generic placeholder item so the workflow
 * is demonstrable end to end; swap in real items later without touching
 * any other model or route.
 */
const departmentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "it", "security"
    name_ar: { type: String, required: true },
    name_en: { type: String, required: true },
    // Real processing order, not just display: ClearanceRequest snapshots
    // departments in this order at submission time, and a department stays
    // locked until every department before it (by this order) has fully
    // completed -- see isDepartmentUnlocked() in request.routes.js. This is
    // what enforces "IT must sign last" (it just has the highest order)
    // without ever hardcoding "IT" in that logic.
    order: { type: Number, required: true },
    // Exactly one department should have isFinal = true (IT). Unrelated to
    // the ordering/locking above -- this only flags which department's LAST
    // checklist item gets the extra "are you sure?" confirmation dialog on
    // the frontend (see ChecklistPanel.jsx), since that item is the actual
    // AD-deletion action.
    isFinal: { type: Boolean, default: false },
    checklistItems: { type: [checklistItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Department", departmentSchema);
