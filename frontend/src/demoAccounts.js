// TEMPORARY dev/demo helper for the Login page's "demo accounts" card.
// Mirrors backend/src/seed/users.data.js and departments.data.js. Delete this
// file and its one usage in Login.jsx once real accounts exist or this is no
// longer needed for demos.

export const demoPassword = "Passw0rd!";

export const demoEmployees = [
  { username: "sara.employee", label_en: "Employee — fresh request", label_ar: "موظف — طلب جديد" },
  { username: "mohamed.retiring", label_en: "Employee — all but IT cleared", label_ar: "موظف — تم إخلاء طرفه عدا تكنولوجيا المعلومات" },
];

export const demoAdmin = {
  username: "admin",
  label_en: "Admin — all departments",
  label_ar: "مسؤول — كل الأقسام",
};

export const demoReviewers = [
  { username: "security.reviewer", label_en: "Security", label_ar: "الأمن" },
  { username: "legal.reviewer", label_en: "Legal Affairs", label_ar: "الشئون القانونية" },
  { username: "medical.reviewer", label_en: "Medical & Treatment Affairs", label_ar: "الشئون الطبية والعلاجية" },
  { username: "healthcare_accounts.reviewer", label_en: "Healthcare Accounts", label_ar: "حسابات الرعاية الصحية" },
  { username: "library.reviewer", label_en: "Library", label_ar: "المكتبة" },
  { username: "warehouses.reviewer", label_en: "General Administration of Warehouses", label_ar: "الإدارة العامة للمخازن" },
  { username: "transport.reviewer", label_en: "General Administration of Transportation Services", label_ar: "أ.ع لخدمات النقل" },
  { username: "hr_development.reviewer", label_en: "HR Development", label_ar: "تنمية الموارد البشرية" },
  { username: "illicit_gains.reviewer", label_en: "Illicit Gains Authority", label_ar: "الكسب غير المشروع" },
  { username: "public_relations.reviewer", label_en: "Public Relations & Social Services", label_ar: "العلاقات العامة والخدمات الاجتماعية" },
  { username: "wages.reviewer", label_en: "Wages & Entitlements", label_ar: "الأجور والاستحقاقات" },
  { username: "finance.reviewer", label_en: "Financial Affairs", label_ar: "الشئون المالية" },
  { username: "it.reviewer", label_en: "IT & Communications Systems — final gate", label_ar: "نظم المعلومات والاتصالات — البوابة الأخيرة" },
];
