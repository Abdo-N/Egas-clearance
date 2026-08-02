import { useState } from "react";
import { useTranslation } from "react-i18next";
import DepartmentIcon from "./DepartmentIcon";
import { formatDate } from "../utils/formatDate";

/**
 * Renders one department's checklist for a reviewer, and enforces the
 * same "check items in order" rule client-side that the backend already
 * enforces server-side (this is just for a good UX -- the backend PATCH
 * will reject an out-of-order or too-early-final check regardless).
 */
export default function ChecklistPanel({ department, allDepartments, onCheck, onReject, busyKey, rejecting }) {
  const { i18n, t } = useTranslation();
  const isAr = i18n.language === "ar";
  const isRejected = department.status === "rejected";
  const [reason, setReason] = useState("");
  const [pendingItem, setPendingItem] = useState(null);
  const sorted = [...department.items].sort((a, b) => a.order - b.order);

  const othersDone = allDepartments
    .filter((d) => d.departmentKey !== department.departmentKey)
    .every((d) => d.status === "completed");

  function submitReject() {
    if (!reason.trim()) return;
    onReject(true, reason.trim());
    setReason("");
  }

  return (
    <div className="checklist-panel panel-card">
      <h3 className="checklist-panel-title">
        <DepartmentIcon departmentKey={department.departmentKey} className="checklist-panel-icon" />
        {t("reviewer.checklistFor")} {isAr ? department.name_ar : department.name_en}
      </h3>

      {isRejected && (
        <div className="rejection-banner">
          <strong>{t("reviewer.rejectedBannerTitle")}</strong>
          <p>{department.rejectedReason}</p>
          <small>
            {t("reviewer.rejectedBy")}: {department.rejectedBy} · {formatDate(department.rejectedAt, i18n.language)}
          </small>
          <button type="button" className="secondary-button" disabled={rejecting} onClick={() => onReject(false)}>
            {t("reviewer.clearRejection")}
          </button>
        </div>
      )}

      <ul>
        {sorted.map((item, idx) => {
          const priorUnchecked = sorted.slice(0, idx).some((i) => !i.checked);
          const isLast = idx === sorted.length - 1;
          const finalBlocked = department.isFinal && isLast && !othersDone;
          const isDangerousFinalCheck = department.isFinal && isLast;
          const disabled = item.checked ? false : priorUnchecked || finalBlocked;

          return (
            <li key={item.key} className={item.checked ? "done" : ""}>
              <label>
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={isRejected || disabled || busyKey === item.key}
                  onChange={(e) => {
  if (isDangerousFinalCheck && e.target.checked) {
    setPendingItem(item);
  } else {
    onCheck(item.key, e.target.checked);
  }
}}
                />
                {isAr ? item.label_ar : item.label_en}
              </label>
              {!isRejected && disabled && !item.checked && priorUnchecked && (
                <span className="hint">{t("reviewer.itemBlockedOrder")}</span>
              )}
              {!isRejected && disabled && !item.checked && !priorUnchecked && finalBlocked && (
                <span className="hint">{t("reviewer.itemBlockedFinal")}</span>
              )}
            </li>
          );
        })}
      </ul>
      {pendingItem && (
  <div className="confirm-dialog">
    <p>{t("reviewer.confirmAdDeletionBody")}</p>

    <div className="confirm-dialog-actions">
      <button
        type="button"
        className="secondary-button"
        onClick={() => setPendingItem(null)}
      >
        {t("reviewer.confirmCancel")}
      </button>

      <button
        type="button"
        className="reject-button"
        onClick={() => {
          onCheck(pendingItem.key, true);
          setPendingItem(null);
        }}
      >
        {t("reviewer.confirmAdDeletion")}
      </button>
    </div>
  </div>
)}

      {!isRejected && (
        <div className="reject-action">
          <textarea
            className="reject-reason-input"
            placeholder={t("reviewer.rejectReasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          <button type="button" className="reject-button" disabled={!reason.trim() || rejecting} onClick={submitReject}>
            {t("reviewer.rejectButton")}
          </button>
        </div>
      )}
    </div>
  );
}
