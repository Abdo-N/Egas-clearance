import { useTranslation } from "react-i18next";
import DepartmentIcon from "./DepartmentIcon";
import { formatDate } from "../utils/formatDate";

/**
 * The 13-department status grid. Two visibility levels, matching the
 * backend's redaction rules:
 *   - "full" (wages/finance oversight reviewers): status + who signed + when.
 *   - "summary" (File Management): status only -- no signer identity, no
 *     evidence. File Management files requests but only gets a high-level
 *     view of their own progress, never per-department signer detail.
 */
export default function RequestOversightGrid({ request, detail = "full" }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const sorted = [...request.departments].sort((a, b) => a.order - b.order);

  // Every department signing off is NOT the same as the employee being
  // cleared -- IT deleting them from Active Directory is the real final
  // step (see request.routes.js computeOverallStatus). Without this, a
  // fully-signed-but-not-yet-archived request just reads as generic
  // "in progress" with no hint of what it's actually waiting on.
  const awaitingAdDeletion = !request.archivedFromAD && request.readyForAdDeletion;

  return (
    <>
      {request.archivedFromAD && (
        <div className="archived-marker">
          <span>✓</span>
          {t("common.archivedFromAdMarker")}
          {request.archivedAt && <small> · {formatDate(request.archivedAt, i18n.language)}</small>}
        </div>
      )}
      {awaitingAdDeletion && (
        <div className="awaiting-marker">
          <span>⏳</span>
          {t("common.awaitingAdDeletionMarker")}
        </div>
      )}
      <ul className="oversight-grid">
        {sorted.map((d) => {
          const isIt = d.departmentKey === "it";
          return (
            <li key={d.departmentKey} className="oversight-grid-row">
              <span className="request-list-dept">
                <DepartmentIcon departmentKey={d.departmentKey} className="request-list-icon" />
                {isAr ? d.name_ar : d.name_en}
              </span>
              <span className={`badge ${d.status}`}>
                {d.status === "completed" ? t("employee.departmentCompleted") : t("employee.departmentPending")}
              </span>
              {isIt && d.status === "completed" && awaitingAdDeletion && (
                <small className="oversight-grid-it-note">{t("common.itAdDeletionPendingNote")}</small>
              )}
              {detail === "full" && d.status === "completed" && (
                <small className="oversight-grid-signer">
                  {d.signatureMode === "itemized"
                    ? d.items.map((i) => i.signedByFullName).join(" / ")
                    : d.signedByFullName}{" "}
                  · {formatDate(d.signatureMode === "itemized" ? d.items[d.items.length - 1]?.signedAt : d.signedAt, i18n.language)}
                </small>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
