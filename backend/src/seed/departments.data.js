/**
 * The real 13 EGAS clearance departments, in the exact order/row-number of
 * the paper "إخلاء طرف" form (backend/assets/clearance-form-template.pdf).
 *
 * Tier 1 (order 1-11, incl. IT at #10): sign in parallel, no gating between
 * them. Tier 2 (wages, finance): locked until every tier-1 department has
 * completed, and get the full 13-department oversight dashboard.
 *
 * Only IT has real itemized requirements (5 items, one owned by one of IT's
 * 5 reviewer accounts each -- see users.data.js). Every other department
 * uses "single" signing: any one of its 2+ reviewers signs once and it's done.
 */
const departments = [
  { key: "illicit_gains", name_ar: "الكسب غير مشروع", name_en: "Illicit Gains", order: 1, tier: 1, hasOversightDashboard: false, signatureMode: "single", checklistItems: [] },
  { key: "library", name_ar: "أ.ع المكتبة", name_en: "Library", order: 2, tier: 1, hasOversightDashboard: false, signatureMode: "single", checklistItems: [] },
  { key: "security", name_ar: "الأمن", name_en: "Security", order: 3, tier: 1, hasOversightDashboard: false, signatureMode: "single", checklistItems: [] },
  { key: "legal", name_ar: "الشئون القانونية", name_en: "Legal Affairs", order: 4, tier: 1, hasOversightDashboard: false, signatureMode: "single", checklistItems: [] },
  { key: "medical", name_ar: "أ.ع الشئون الطبية والعلاجية", name_en: "Medical & Treatment Affairs", order: 5, tier: 1, hasOversightDashboard: false, signatureMode: "single", checklistItems: [] },
  { key: "healthcare_accounts", name_ar: "أ.ع حسابات الرعاية الصحية", name_en: "Healthcare Accounts", order: 6, tier: 1, hasOversightDashboard: false, signatureMode: "single", checklistItems: [] },
  { key: "hr_development", name_ar: "تنمية الموارد البشرية", name_en: "HR Development", order: 7, tier: 1, hasOversightDashboard: false, signatureMode: "single", checklistItems: [] },
  { key: "public_relations", name_ar: "العلاقات العامة وخدمات الإجتماعية", name_en: "Public Relations & Social Services", order: 8, tier: 1, hasOversightDashboard: false, signatureMode: "single", checklistItems: [] },
  { key: "warehouses", name_ar: "المخازن", name_en: "Warehouses", order: 9, tier: 1, hasOversightDashboard: false, signatureMode: "single", checklistItems: [] },
  {
    key: "it",
    name_ar: "نظم المعلومات والاتصالات",
    name_en: "IT & Communications Systems",
    order: 10,
    tier: 1,
    hasOversightDashboard: false,
    signatureMode: "itemized",
    checklistItems: [
      { key: "mobile_data_lines", label_ar: "خط المحمول وخط الداتا", label_en: "Mobile Line & Data Line" },
      { key: "phone", label_ar: "الهاتف", label_en: "Phone" },
      { key: "pc_account_mailbox", label_ar: "الكمبيوتر والحساب والبريد الإلكتروني", label_en: "PC, Account & Mailbox" },
      { key: "sap_service", label_ar: "خدمة SAP", label_en: "SAP Service" },
      { key: "sap_account_removal", label_ar: "إزالة حساب SAP", label_en: "SAP Account Removal" },
    ],
  },
  { key: "transport", name_ar: "خدمات النقل", name_en: "Transportation Services", order: 11, tier: 1, hasOversightDashboard: false, signatureMode: "single", checklistItems: [] },
  { key: "wages", name_ar: "الأجور والاستحقاقات", name_en: "Wages & Entitlements", order: 12, tier: 2, hasOversightDashboard: true, signatureMode: "single", checklistItems: [] },
  { key: "finance", name_ar: "الشئون المالية", name_en: "Financial Affairs", order: 13, tier: 2, hasOversightDashboard: true, signatureMode: "single", checklistItems: [] },
];

module.exports = departments;
