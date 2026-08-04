// TEMPORARY dev/demo helper for the Login page's "demo accounts" card.
// Mirrors backend/src/seed/users.data.js and departments.data.js. Delete this
// file and its one usage in Login.jsx once real accounts exist or this is no
// longer needed for demos.

export const demoPassword = "Passw0rd!";

export const demoFileManagement = {
  userID: "file.management",
  label_en: "File Management — files requests",
  label_ar: "إدارة الملفات — تنشئ الطلبات",
};

// One reviewer shown per department (each has a "reviewer1"/"reviewer2" pair
// -- either signs -- so only reviewer1 is listed here). IT has 5 accounts,
// one per itemized checklist item, instead of the usual pair. wages/finance
// are flagged (oversight) since they also get the full status dashboard.
export const demoReviewers = [
  { userID: "illicit_gains.reviewer1", label_en: "Illicit Gains", label_ar: "الكسب غير مشروع" },
  { userID: "library.reviewer1", label_en: "Library", label_ar: "أ.ع المكتبة" },
  { userID: "security.reviewer1", label_en: "Security", label_ar: "الأمن" },
  { userID: "legal.reviewer1", label_en: "Legal Affairs", label_ar: "الشئون القانونية" },
  { userID: "medical.reviewer1", label_en: "Medical & Treatment Affairs", label_ar: "أ.ع الشئون الطبية والعلاجية" },
  { userID: "healthcare_accounts.reviewer1", label_en: "Healthcare Accounts", label_ar: "أ.ع حسابات الرعاية الصحية" },
  { userID: "hr_development.reviewer1", label_en: "HR Development", label_ar: "تنمية الموارد البشرية" },
  { userID: "public_relations.reviewer1", label_en: "Public Relations & Social Services", label_ar: "العلاقات العامة وخدمات الإجتماعية" },
  { userID: "warehouses.reviewer1", label_en: "Warehouses", label_ar: "المخازن" },
  { userID: "it.mobile_data_lines.reviewer", label_en: "IT — Mobile & Data Lines", label_ar: "تكنولوجيا المعلومات — خط المحمول والداتا" },
  { userID: "it.phone.reviewer", label_en: "IT — Phone", label_ar: "تكنولوجيا المعلومات — الهاتف" },
  { userID: "it.pc_account_mailbox.reviewer", label_en: "IT — PC, Account & Mailbox", label_ar: "تكنولوجيا المعلومات — الكمبيوتر والحساب والبريد" },
  { userID: "it.sap_service.reviewer", label_en: "IT — SAP Services", label_ar: "تكنولوجيا المعلومات — خدمات SAP" },
  { userID: "it.sap_account_removal.reviewer", label_en: "IT — SAP Account Removal", label_ar: "تكنولوجيا المعلومات — إزالة حساب SAP" },
  { userID: "transport.reviewer1", label_en: "Transportation Services", label_ar: "خدمات النقل" },
  { userID: "wages.reviewer1", label_en: "Wages & Entitlements (oversight)", label_ar: "الأجور والاستحقاقات (إشراف)" },
  { userID: "finance.reviewer1", label_en: "Financial Affairs (oversight)", label_ar: "الشئون المالية (إشراف)" },
];
