const mongoose = require("mongoose");

/**
 * MOCK ACTIVE DIRECTORY.
 * This collection stands in for EGAS's real Active Directory until real
 * LDAP access is available (see README "Auth" section). Do not build
 * business logic that assumes this IS real AD -- keep the auth layer
 * (src/routes/auth.routes.js) as the only place that knows about this model,
 * so swapping in real LDAP later only touches that one file.
 */
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true }, // mimics AD sAMAccountName
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true },
    role: {
      type: String,
      enum: ["employee", "reviewer", "admin"],
      required: true,
    },
    // Only set when role === "reviewer": which department this person checks off.
    departmentKey: { type: String, default: null },
    // Only meaningful when role === "employee".
    employeeMeta: {
      jobTitle: { type: String, default: "" },
      retirementDate: { type: Date, default: null },
    },
    // Flips to true once the IT department deletes this person from AD.
    // They are NOT removed from this collection so they can keep logging in
    // to view their (now completed) clearance request. This is a placeholder
    // for the real "temporary database" design mentioned in the project brief.
    archivedFromAD: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
