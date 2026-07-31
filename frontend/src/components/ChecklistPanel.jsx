import { useTranslation } from "react-i18next";

/**
 * Renders one department's checklist for a reviewer, and enforces the
 * same "check items in order" rule client-side that the backend already
 * enforces server-side (this is just for a good UX -- the backend PATCH
 * will reject an out-of-order or too-early-final check regardless).
 */
export default function ChecklistPanel({ department, allDepartments, onCheck, busyKey }) {
  const { i18n, t } = useTranslation();
  const isAr = i18n.language === "ar";
  const sorted = [...department.items].sort((a, b) => a.order - b.order);

  const othersDone = allDepartments
    .filter((d) => d.departmentKey !== department.departmentKey)
    .every((d) => d.status === "completed");

  return (
    <div className="checklist-panel">
      <h3>
        {t("reviewer.checklistFor")} {isAr ? department.name_ar : department.name_en}
      </h3>
      <ul>
        {sorted.map((item, idx) => {
          const priorUnchecked = sorted.slice(0, idx).some((i) => !i.checked);
          const isLast = idx === sorted.length - 1;
          const finalBlocked = department.isFinal && isLast && !othersDone;
          const disabled = item.checked ? false : priorUnchecked || finalBlocked;

          return (
            <li key={item.key} className={item.checked ? "done" : ""}>
              <label>
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={disabled || busyKey === item.key}
                  onChange={(e) => onCheck(item.key, e.target.checked)}
                />
                {isAr ? item.label_ar : item.label_en}
              </label>
              {disabled && !item.checked && priorUnchecked && (
                <span className="hint">{t("reviewer.itemBlockedOrder")}</span>
              )}
              {disabled && !item.checked && !priorUnchecked && finalBlocked && (
                <span className="hint">{t("reviewer.itemBlockedFinal")}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
