const mongoose = require("mongoose");

/**
 * MOCK ACTIVE DIRECTORY (staff logins only).
 * This collection stands in for EGAS's real Active Directory until real
 * LDAP access is available. Do not build business logic that assumes this
 * IS real AD -- keep the auth layer (src/routes/auth.routes.js) as the only
 * place that knows about this model, so swapping in real LDAP later only
 * touches that one file.
 *
 * Employees being cleared are NOT in this collection and never log in --
 * see Employee.js for their (auth-less) directory record.
 */
const userSchema = new mongoose.Schema(
  {
    userID: { type: String, required: true, unique: true, trim: true }, // mimics AD sAMAccountName
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true },
    role: {
      type: String,
      enum: ["file_management", "reviewer"],
      required: true,
    },
    // Only set when role === "reviewer": which of the 13 clearance
    // departments this person reviews for. A department can have any number
    // of reviewer accounts (any one of them signing is enough, except IT --
    // see assignedItemKey).
    departmentKey: { type: String, default: null },
    // Only set for IT reviewers (departmentKey === "it"): which of IT's
    // itemized checklist items this specific person is responsible for
    // signing. Must match one of Department("it").checklistItems[].key.
    assignedItemKey: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
