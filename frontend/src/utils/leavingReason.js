// Maps the ClearanceRequest.reason enum (see
// backend/src/models/ClearanceRequest.js) to its i18n key under "employee.*".
export const REASONS = ["resignation", "new_job", "retirement"];

const I18N_KEYS = {
  resignation: "reasonResignation",
  new_job: "reasonNewJob",
  retirement: "reasonRetirement",
};

export function reasonI18nKey(reason) {
  return I18N_KEYS[reason] || "reasonResignation";
}
