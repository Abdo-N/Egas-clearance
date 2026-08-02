/**
 * Mock AD accounts for local dev/demo. Plaintext passwords listed here are
 * for the seed script only -- they get bcrypt-hashed before being written
 * to the DB. Never do this for a real deployment.
 */
const users = [
  { username: "sara.employee", password: "Passw0rd!", fullName: "Sara Ahmed", role: "employee", employeeMeta: { jobTitle: "Senior Accountant", department_ar: "الشئون المالية", department_en: "Financial Affairs", retirementDate: new Date("2026-08-01") } },
  // Demo account: seed.js gives this employee a request with every
  // department already cleared except IT, so the "IT signs last" gate can
  // be demoed directly instead of clicking through 12 departments live.
  { username: "mohamed.retiring", password: "Passw0rd!", fullName: "Mohamed Farouk", role: "employee", employeeMeta: { jobTitle: "Warehouse Supervisor", department_ar: "الإدارة العامة للمخازن", department_en: "General Administration of Warehouses", retirementDate: new Date("2026-08-15") } },
  { username: "admin", password: "Passw0rd!", fullName: "System Admin", role: "admin" },

  // One reviewer per seeded department, username = "<deptKey>.reviewer"
  { username: "security.reviewer", password: "Passw0rd!", fullName: "Security Reviewer", role: "reviewer", departmentKey: "security" },
  { username: "legal.reviewer", password: "Passw0rd!", fullName: "Legal Reviewer", role: "reviewer", departmentKey: "legal" },
  { username: "medical.reviewer", password: "Passw0rd!", fullName: "Medical Reviewer", role: "reviewer", departmentKey: "medical" },
  { username: "healthcare_accounts.reviewer", password: "Passw0rd!", fullName: "Healthcare Accounts Reviewer", role: "reviewer", departmentKey: "healthcare_accounts" },
  { username: "library.reviewer", password: "Passw0rd!", fullName: "Library Reviewer", role: "reviewer", departmentKey: "library" },
  { username: "warehouses.reviewer", password: "Passw0rd!", fullName: "Warehouses Reviewer", role: "reviewer", departmentKey: "warehouses" },
  { username: "transport.reviewer", password: "Passw0rd!", fullName: "Transport Reviewer", role: "reviewer", departmentKey: "transport" },
  { username: "hr_development.reviewer", password: "Passw0rd!", fullName: "HR Development Reviewer", role: "reviewer", departmentKey: "hr_development" },
  { username: "illicit_gains.reviewer", password: "Passw0rd!", fullName: "Illicit Gains Reviewer", role: "reviewer", departmentKey: "illicit_gains" },
  { username: "public_relations.reviewer", password: "Passw0rd!", fullName: "Public Relations Reviewer", role: "reviewer", departmentKey: "public_relations" },
  { username: "wages.reviewer", password: "Passw0rd!", fullName: "Wages Reviewer", role: "reviewer", departmentKey: "wages" },
  { username: "finance.reviewer", password: "Passw0rd!", fullName: "Finance Reviewer", role: "reviewer", departmentKey: "finance" },
  { username: "it.reviewer", password: "Passw0rd!", fullName: "IT Reviewer", role: "reviewer", departmentKey: "it" },
];

module.exports = users;
