const mongoose = require("mongoose");

/**
 * A single checklist item template for IT (the only department with real,
 * itemized requirements). `assignedItemKey` on a reviewer's User record
 * must match one of these `key`s -- that's how the sign route knows which
 * specific IT reviewer owns which item. Every other department ships with
 * an empty `checklistItems` array (see `signatureMode` below).
 */
const checklistItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // stable id, e.g. "sap_account_removal"
    label_ar: { type: String, required: true },
    label_en: { type: String, required: true },
  },
  { _id: false }
);

/**
 * One of the 13 EGAS departments an employee needs clearance from, in the
 * real paper-form order (see the sample "إخلاء طرف" form).
 */
const departmentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "it", "security"
    name_ar: { type: String, required: true },
    name_en: { type: String, required: true },
    // Row order on the paper form (1-13). Doubles as display order.
    order: { type: Number, required: true },
    // Tier-based locking (see isDepartmentUnlocked() in request.routes.js):
    // tier 1 departments (1-11) are always unlocked and sign in parallel.
    // tier 2 departments (wages, finance) are locked until every tier-1
    // department has completed. Generalizes to more tiers later without
    // touching route logic.
    tier: { type: Number, required: true },
    // Only wages/finance (tier 2) get the full 13-department oversight
    // dashboard -- same visibility as File Management. Config-driven so
    // request.routes.js never hardcodes department keys.
    hasOversightDashboard: { type: Boolean, default: false },
    // "single": any one of the department's 2+ reviewers signs once and the
    // department is done. "itemized": only IT -- each checklistItems entry
    // needs its own assigned reviewer to sign it; the department completes
    // once every item is signed.
    signatureMode: { type: String, enum: ["single", "itemized"], required: true },
    checklistItems: { type: [checklistItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Department", departmentSchema);
