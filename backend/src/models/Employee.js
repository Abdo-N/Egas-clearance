const mongoose = require("mongoose");

/**
 * MOCK ACTIVE DIRECTORY (employees being cleared).
 * Stand-in for the real AD lookup File Management will eventually have --
 * employee number, name, department, job title. Employees never log in
 * (see User.js for staff accounts), so this collection has no auth fields.
 * Seed-only for now (backend/src/seed/employees.data.js); File Management
 * picks from this list when filing a request (POST /api/requests).
 */
const employeeSchema = new mongoose.Schema(
  {
    employeeNumber: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true },
    jobTitle: { type: String, default: "" },
    // Which EGAS department the employee actually WORKS in -- unrelated to
    // the 13 clearance departments in Department.js, which are who signs
    // off on their clearance, not where they work.
    department_ar: { type: String, default: "" },
    department_en: { type: String, default: "" },
    retirementDate: { type: Date, default: null },
    // Flipped by the IT "Delete from Active Directory" action once every
    // one of the 13 departments has signed off on a request for this
    // employee (see POST /api/requests/:id/archive-ad).
    archivedFromAD: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);
