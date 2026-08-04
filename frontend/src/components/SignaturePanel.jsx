import { useState } from "react";
import { useTranslation } from "react-i18next";
import DepartmentIcon from "./DepartmentIcon";
import ReauthConfirmButton from "./ReauthConfirmButton";
import { formatDate } from "../utils/formatDate";

/**
 * Re-authentication (password) + evidence upload (photo/PDF of the physical
 * signature or stamp) -- this IS the "signature" now, replacing the old
 * checkbox-based checklist. Shared by both single-signature departments and
 * each of IT's itemized checklist entries.
 */
function SignForm({ onSubmit, busy, t }) {
  const [password, setPassword] = useState("");
  const [file, setFile] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!password || !file) return;
    onSubmit({ password, file });
  }

  return (
    <form className="signature-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>{t("signature.passwordLabel")}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div className="form-group">
        <label>{t("signature.fileLabel")}</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files[0] || null)}
          required
        />
      </div>
      <button type="submit" className="primary-button" disabled={busy || !password || !file}>
        {busy ? t("signature.signing") : t("signature.signButton")}
      </button>
    </form>
  );
}

// A reviewer undoing their OWN just-signed department/item -- e.g. they
// uploaded the wrong file by mistake -- without needing File Management to
// do it for them. Same re-auth pattern and same backend routes as File
// Management's reopen (see request.routes.js), just called by the owning
// reviewer instead; the backend tells the two apart by role, not this
// component.
function UndoControl({ onConfirm, t }) {
  return (
    <ReauthConfirmButton
      openLabel={t("reviewer.undoButton")}
      confirmLabel={t("reviewer.confirmUndo")}
      busyLabel={t("reviewer.undoing")}
      cancelLabel={t("reviewer.cancel")}
      errorFallback={t("reviewer.undoError")}
      onConfirm={onConfirm}
    />
  );
}

export default function SignaturePanel({ department, user, onSign, busy, onUndo }) {
  const { i18n, t } = useTranslation();
  const isAr = i18n.language === "ar";
  const deptLabel = isAr ? department.name_ar : department.name_en;

  if (department.signatureMode === "itemized") {
    return (
      <div className="checklist-panel panel-card">
        <h3 className="checklist-panel-title">
          <DepartmentIcon departmentKey={department.departmentKey} className="checklist-panel-icon" />
          {t("reviewer.signatureFor")} {deptLabel}
        </h3>

        <ul className="signature-item-list">
          {department.items.map((item) => {
            const isMine = item.assignedItemKey === user.assignedItemKey;
            return (
              <li key={item.key} className={item.status === "completed" ? "done" : ""}>
                <div className="signature-item-label">
                  {isAr ? item.label_ar : item.label_en}
                  {isMine && (
                    <span className="badge pending signature-item-mine-tag">{t("reviewer.yourItem")}</span>
                  )}
                </div>

                {item.status === "completed" ? (
                  <div className="signature-confirmed">
                    <span className="badge completed">{t("reviewer.signed")}</span>
                    <small>
                      {item.signedByFullName} · {formatDate(item.signedAt, i18n.language)}
                    </small>
                    {isMine && onUndo && (
                      <UndoControl t={t} onConfirm={(password) => onUndo({ itemKey: item.key, password })} />
                    )}
                  </div>
                ) : isMine ? (
                  <SignForm
                    t={t}
                    busy={busy}
                    onSubmit={({ password, file }) => onSign({ itemKey: item.key, password, file })}
                  />
                ) : (
                  <span className="badge pending">{t("reviewer.awaitingSignature")}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="checklist-panel panel-card">
      <h3 className="checklist-panel-title">
        <DepartmentIcon departmentKey={department.departmentKey} className="checklist-panel-icon" />
        {t("reviewer.signatureFor")} {deptLabel}
      </h3>

      {department.status === "completed" ? (
        <div className="success-banner">
          <strong>{t("reviewer.signedBanner")}</strong>
          <small>
            {department.signedByFullName} · {formatDate(department.signedAt, i18n.language)}
          </small>
          {onUndo && <UndoControl t={t} onConfirm={(password) => onUndo({ password })} />}
        </div>
      ) : (
        <SignForm t={t} busy={busy} onSubmit={({ password, file }) => onSign({ password, file })} />
      )}
    </div>
  );
}
