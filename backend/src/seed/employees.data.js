/**
 * Mock AD directory of employees being cleared (not logins -- see
 * users.data.js for staff accounts). Stand-in for the real AD lookup File
 * Management will eventually have. File Management picks from this list by
 * employee number when filing a new clearance request.
 */
const employees = [
  {
    employeeNumber: "10234",
    fullName: "Sara Ahmed",
    jobTitle: "Senior Accountant",
    department_ar: "الشئون المالية",
    department_en: "Financial Affairs",
    retirementDate: new Date("2026-08-01"),
  },
  // Demo record: seed.js gives this employee a request with all tier-1
  // departments already signed except IT, so the tier-2 lock and the
  // IT-must-finish-before-AD-deletion behavior can be demoed directly
  // instead of clicking through 11 departments live.
  {
    employeeNumber: "10567",
    fullName: "Mohamed Farouk",
    jobTitle: "Warehouse Supervisor",
    department_ar: "المخازن",
    department_en: "Warehouses",
    retirementDate: new Date("2026-08-15"),
  },
  {
    employeeNumber: "10891",
    fullName: "Nour El-Din Hassan",
    jobTitle: "Network Engineer",
    department_ar: "نظم المعلومات والاتصالات",
    department_en: "IT & Communications Systems",
    retirementDate: null,
  },
  // Demo record: seed.js gives this employee a request where all 13
  // departments have already signed -- the only step left is IT's manual
  // "Delete from Active Directory" action, so that flow can be demoed
  // directly instead of clicking through every department live.
  {
    employeeNumber: "10932",
    fullName: "Khaled Mostafa",
    jobTitle: "Procurement Officer",
    department_ar: "المخازن",
    department_en: "Warehouses",
    retirementDate: null,
  },
];

module.exports = employees;
