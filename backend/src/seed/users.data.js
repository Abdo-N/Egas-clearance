/**
 * Mock AD accounts for local dev/demo. Plaintext passwords listed here are
 * for the seed script only -- they get bcrypt-hashed before being written
 * to the DB. Never do this for a real deployment.
 *
 * Employees being cleared are NOT here -- see employees.data.js. This file
 * is staff only: File Management (files requests) and reviewers (13
 * departments, 2+ accounts each so any one of them can sign, except IT
 * which has exactly 5, one per itemized checklist item).
 */
const NON_IT_DEPARTMENTS = [
  { key: "illicit_gains", label: "Illicit Gains" },
  { key: "library", label: "Library" },
  { key: "security", label: "Security" },
  { key: "legal", label: "Legal Affairs" },
  { key: "medical", label: "Medical & Treatment Affairs" },
  { key: "healthcare_accounts", label: "Healthcare Accounts" },
  { key: "hr_development", label: "HR Development" },
  { key: "public_relations", label: "Public Relations & Social Services" },
  { key: "warehouses", label: "Warehouses" },
  { key: "transport", label: "Transportation Services" },
  { key: "wages", label: "Wages & Entitlements" },
  { key: "finance", label: "Financial Affairs" },
];

const reviewerUsers = NON_IT_DEPARTMENTS.flatMap(({ key, label }) => [
  { userID: `${key}.reviewer1`, password: "Passw0rd!", fullName: `${label} Reviewer 1`, role: "reviewer", departmentKey: key },
  { userID: `${key}.reviewer2`, password: "Passw0rd!", fullName: `${label} Reviewer 2`, role: "reviewer", departmentKey: key },
]);

const IT_ITEMS = [
  { itemKey: "mobile_data_lines", label: "Mobile & Data Lines" },
  { itemKey: "phone", label: "Phone" },
  { itemKey: "pc_account_mailbox", label: "PC, Account & Mailbox" },
  { itemKey: "sap_service", label: "SAP Service" },
  { itemKey: "sap_account_removal", label: "SAP Account Removal" },
];

const itUsers = IT_ITEMS.map(({ itemKey, label }) => ({
  userID: `it.${itemKey}.reviewer`,
  password: "Passw0rd!",
  fullName: `IT Reviewer — ${label}`,
  role: "reviewer",
  departmentKey: "it",
  assignedItemKey: itemKey,
}));

const users = [
  { userID: "file.management", password: "Passw0rd!", fullName: "File Management", role: "file_management" },
  ...reviewerUsers,
  ...itUsers,
];

module.exports = users;
