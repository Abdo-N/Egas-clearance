/**
 * These are the departments Nader has confirmed so far. Only IT
 * (نظم المعلومات والاتصالات) has a real, exact checklist -- it's given
 * below in the exact required order, ending with AD deletion.
 *
 * KNOWN GAP: EGAS's real process has 16 departments; only 13 names have
 * been provided. The other ~3 plus every non-IT checklist are TBD --
 * see PROJECT_STATUS.md. Each non-IT department below ships with ONE
 * generic placeholder item ("clearance") so the full workflow can be
 * demoed end-to-end. Replace `checklistItems` per department once real
 * requirements are gathered -- nothing else in the codebase needs to change.
 */

const genericPlaceholder = [
  { key: "clearance", label_ar: "لا يوجد مستحقات متبقية", label_en: "No outstanding items", order: 1 },
];

const departments = [
  { key: "security", name_ar: "الأمن", name_en: "Security", order: 1, isFinal: false, checklistItems: genericPlaceholder },
  { key: "legal", name_ar: "الشئون القانونية", name_en: "Legal Affairs", order: 2, isFinal: false, checklistItems: genericPlaceholder },
  { key: "medical", name_ar: "الشئون الطبية والعلاجية", name_en: "Medical & Treatment Affairs", order: 3, isFinal: false, checklistItems: genericPlaceholder },
  { key: "healthcare_accounts", name_ar: "حسابات الرعاية الصحية", name_en: "Healthcare Accounts", order: 4, isFinal: false, checklistItems: genericPlaceholder },
  { key: "library", name_ar: "المكتبة", name_en: "Library", order: 5, isFinal: false, checklistItems: genericPlaceholder },
  { key: "warehouses", name_ar: "الإدارة العامة للمخازن", name_en: "General Administration of Warehouses", order: 6, isFinal: false, checklistItems: genericPlaceholder },
  { key: "transport", name_ar: "أ.ع لخدمات النقل", name_en: "General Administration of Transportation Services", order: 7, isFinal: false, checklistItems: genericPlaceholder },
  { key: "hr_development", name_ar: "تنمية الموارد البشرية", name_en: "HR Development", order: 8, isFinal: false, checklistItems: genericPlaceholder },
  { key: "illicit_gains", name_ar: "الكسب غير المشروع", name_en: "Illicit Gains Authority", order: 9, isFinal: false, checklistItems: genericPlaceholder },
  { key: "public_relations", name_ar: "العلاقات العامة والخدمات الاجتماعية", name_en: "Public Relations & Social Services", order: 10, isFinal: false, checklistItems: genericPlaceholder },
  { key: "wages", name_ar: "الأجور والاستحقاقات", name_en: "Wages & Entitlements", order: 11, isFinal: false, checklistItems: genericPlaceholder },
  { key: "finance", name_ar: "الشئون المالية", name_en: "Financial Affairs", order: 12, isFinal: false, checklistItems: genericPlaceholder },
  {
    key: "it",
    name_ar: "نظم المعلومات والاتصالات",
    name_en: "IT & Communications Systems",
    order: 99, // always rendered/processed last on the UI regardless of literal list position
    isFinal: true,
    checklistItems: [
      { key: "phone", label_ar: "الهاتف", label_en: "Phone", order: 1 },
      { key: "pc", label_ar: "الكومبيوتر", label_en: "PC", order: 2 },
      { key: "mobile_line", label_ar: "خط المحمول", label_en: "Mobile Line", order: 3 },
      { key: "data_line", label_ar: "خط الداتا", label_en: "Data Line", order: 4 },
      { key: "account", label_ar: "الحساب", label_en: "Account", order: 5 },
      { key: "mailbox", label_ar: "البريد الإلكتروني", label_en: "Mailbox", order: 6 },
      { key: "sap_services", label_ar: "خدمات SAP", label_en: "SAP Services", order: 7 },
      { key: "sap_account", label_ar: "حساب SAP", label_en: "SAP Account", order: 8 },
      { key: "ad_deletion", label_ar: "حذف من الـ Active Directory", label_en: "Delete from Active Directory", order: 9 },
    ],
  },
];

module.exports = departments;
