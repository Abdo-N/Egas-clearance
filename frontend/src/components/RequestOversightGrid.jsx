import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client";
import DepartmentIcon from "./DepartmentIcon";
import ReauthConfirmButton from "./ReauthConfirmButton";
import { formatDate } from "../utils/formatDate";

// A small photo/file preview of the uploaded evidence, fetched lazily (the
// underlying route requires the same auth token as everything else, so this
// can't just be a plain <img src="..."> -- pull it as a blob and hand the
// browser an object URL, same trick as the PDF download). Rendered as soon
// as the department/item it belongs to is completed -- both oversight
// (wages/finance, "full") and File Management ("summary") see this beside
// the green status the moment it appears, not just once the whole request
// is done and approved.
function EvidencePreview({ requestId, deptKey, itemKey, mimeType, t }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    async function load() {
      try {
        const path = itemKey
          ? `/requests/${requestId}/evidence/${deptKey}/${itemKey}`
          : `/requests/${requestId}/evidence/${deptKey}`;
        const { data } = await client.get(path, { responseType: "blob" });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [requestId, deptKey, itemKey]);

  if (failed) return null;
  if (!url) return <small className="evidence-preview-loading">{t("common.loading")}</small>;

  const isImage = /^image\//.test(mimeType || "");
  return (
    <a href={url} target="_blank" rel="noreferrer" className="evidence-preview-link">
      {isImage ? (
        <img src={url} alt={t("common.evidencePreviewAlt")} className="evidence-preview-thumb" />
      ) : (
        <span className="secondary-button">{t("common.viewEvidenceFile")}</span>
      )}
    </a>
  );
}

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
          const canReopenDept = onReopenDepartment && d.signatureMode === "single" && d.status === "completed";
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
                <EvidencePreview
                  requestId={request._id}
                  deptKey={d.departmentKey}
                  mimeType={d.evidence.mimeType}
                  t={t}
                />
              )}
              {canReopenDept && (
                <ReopenControl t={t} onConfirm={(password) => onReopenDepartment(d.departmentKey, password)} />
              )}
              {d.signatureMode === "itemized" && d.items?.length > 0 && (
                <ul className="oversight-grid-items">
                  {d.items.map((item) => (
                    <li key={item.key} className="oversight-grid-item-row">
                      <span>{isAr ? item.label_ar : item.label_en}</span>
                      <span className={`badge ${item.status}`}>
                        {item.status === "completed" ? t("employee.departmentCompleted") : t("employee.departmentPending")}
                      </span>
                      {item.status === "completed" && item.evidence && (
                        <EvidencePreview
                          requestId={request._id}
                          deptKey={d.departmentKey}
                          itemKey={item.key}
                          mimeType={item.evidence.mimeType}
                          t={t}
                        />
                      )}
                      {item.status === "completed" && onReopenItem && (
                        <ReopenControl
                          t={t}
                          onConfirm={(password) => onReopenItem(d.departmentKey, item.key, password)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
