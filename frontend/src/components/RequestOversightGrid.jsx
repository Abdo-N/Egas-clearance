import { useTranslation } from "react-i18next";
import DepartmentIcon from "./DepartmentIcon";
import EvidencePreview from "./EvidencePreview";
import ReauthConfirmButton from "./ReauthConfirmButton";
import { formatDate } from "../utils/formatDate";

// File Management's reopen control -- ReauthConfirmButton wired to the
// fileManagement.* i18n keys. Extracted as its own component only so the
// wiring below doesn't repeat five label props at each of the two call
// sites (department-level and item-level).
function ReopenControl({ onConfirm, t }) {
  return (
    <ReauthConfirmButton
      openLabel={t("fileManagement.reopenButton")}
      confirmLabel={t("fileManagement.confirmReopen")}
      busyLabel={t("fileManagement.reopening")}
      cancelLabel={t("fileManagement.cancel")}
      errorFallback={t("fileManagement.reopenError")}
      onConfirm={onConfirm}
    />
  );
}

/**
 * The 13-department status grid. Two visibility levels, matching the
 * backend's redaction rules:
 *   - "full" (wages/finance oversight reviewers): status + who signed + when.
 *   - "summary" (File Management): status only -- no signer identity, ever.
 *     File Management files requests and only gets a high-level view of
 *     their own progress; the one narrow exception is evidence itself (see
 *     below), never who signed or when.
 * Both levels get an inline evidence photo/file preview next to a completed
 * department/item's status, live as each one signs -- see
 * summarizeForFileManagement in request.routes.js for File Management's
 * side of this (no approval step required to see it).
 *
 * `onReopenDepartment`/`onReopenItem` are optional (File Management only --
 * see FileManagementDashboard.jsx). When provided, a "Reopen" control shows
 * next to any already-signed row/item so File Management can undo a
 * signature that turned out illegible and let the department sign again.
 */
export default function RequestOversightGrid({ request, detail = "full", onReopenDepartment, onReopenItem }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const sorted = [...request.departments].sort((a, b) => a.order - b.order);

  // Every department signing off is NOT the same as the employee being
  // cleared -- IT revoking their system access is the real final
  // step (see request.routes.js computeOverallStatus). Without this, a
  // fully-signed-but-not-yet-revoked request just reads as generic
  // "in progress" with no hint of what it's actually waiting on.
  const awaitingAccessRevocation = !request.accessRevoked && request.readyForAccessRevocation;

  return (
    <>
      {request.accessRevoked && (
        <div className="archived-marker">
          <span>✓</span>
          {t("common.accessRevokedMarker")}
          {request.accessRevokedAt && <small> · {formatDate(request.accessRevokedAt, i18n.language)}</small>}
        </div>
      )}
      {awaitingAccessRevocation && (
        <div className="awaiting-marker">
          <span>⏳</span>
          {t("common.awaitingAccessRevocationMarker")}
        </div>
      )}

      <div className="detail-progress-track">
        {sorted.map((d) => (
          <div
            key={d.departmentKey}
            className={`detail-progress-segment ${d.status}`}
            title={isAr ? d.name_ar : d.name_en}
          />
        ))}
      </div>

      <div className="checklist-box">
        <ul className="checklist-items">
          {sorted.map((d) => {
            const isIt = d.departmentKey === "it";
            const canReopenDept = onReopenDepartment && d.signatureMode === "single" && d.status === "completed";
            return (
              <li key={d.departmentKey}>
                <span className="request-list-dept">
                  <DepartmentIcon departmentKey={d.departmentKey} className="request-list-icon" />
                  {isAr ? d.name_ar : d.name_en}
                </span>
                <span className={`status-pill ${d.status}`}>
                  {d.status === "completed" ? t("employee.departmentCompleted") : t("employee.departmentPending")}
                </span>
                {isIt && d.status === "completed" && awaitingAccessRevocation && (
                  <small className="oversight-grid-it-note">{t("common.itAccessRevocationPendingNote")}</small>
                )}
                {detail === "full" && d.status === "completed" && d.signatureMode === "single" && (
                  <small className="oversight-grid-signer">
                    {d.signedByFullName} · {formatDate(d.signedAt, i18n.language)}
                  </small>
                )}
                {detail === "full" && d.status === "completed" && d.signatureMode === "itemized" && (
                  <small className="oversight-grid-signer">
                    {d.items.map((i) => i.signedByFullName).join(" / ")} ·{" "}
                    {formatDate(d.items[d.items.length - 1]?.signedAt, i18n.language)}
                  </small>
                )}
                {d.status === "completed" && d.evidence && d.signatureMode === "single" && (
                  <EvidencePreview requestId={request._id} deptKey={d.departmentKey} mimeType={d.evidence.mimeType} />
                )}
                {canReopenDept && (
                  <ReopenControl t={t} onConfirm={(password) => onReopenDepartment(d.departmentKey, password)} />
                )}
                {d.signatureMode === "itemized" && d.items?.length > 0 && (
                  <ul className="checklist-items oversight-grid-items">
                    {d.items.map((item) => (
                      <li key={item.key}>
                        <span className="oversight-grid-item-label">
                          {isAr ? item.label_ar : item.label_en}
                        </span>
                        <span className={`status-pill ${item.status}`}>
                          {item.status === "completed" ? t("employee.departmentCompleted") : t("employee.departmentPending")}
                        </span>
                        <span className="oversight-grid-item-actions">
                          {item.status === "completed" && item.evidence && (
                            <EvidencePreview
                              requestId={request._id}
                              deptKey={d.departmentKey}
                              itemKey={item.key}
                              mimeType={item.evidence.mimeType}
                            />
                          )}
                          {item.status === "completed" && onReopenItem && (
                            <ReopenControl
                              t={t}
                              onConfirm={(password) => onReopenItem(d.departmentKey, item.key, password)}
                            />
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
