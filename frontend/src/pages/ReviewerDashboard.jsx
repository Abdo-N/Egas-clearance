import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";
import SignaturePanel from "../components/SignaturePanel";
import RequestOversightGrid from "../components/RequestOversightGrid";
import DepartmentDashboard from "../components/DepartmentDashboard";
import { formatDate } from "../utils/formatDate";
import { reasonI18nKey } from "../utils/leavingReason";
import logoUrl from "../assets/egas-logo.png";

function RequestInfo({ request, departmentLabel, t, lang }) {
  return (
    <div className="request-info">
      <div>
        <span>{t("reviewer.employee")}</span>
        <strong>{request.employeeFullName}</strong>
      </div>
      {departmentLabel && (
        <div>
          <span>{t("reviewer.requestInfoDepartment")}</span>
          <strong>{departmentLabel}</strong>
        </div>
      )}
      <div>
        <span>{t("reviewer.requestInfoReason")}</span>
        <strong>{t(`employee.${reasonI18nKey(request.reason)}`)}</strong>
      </div>
      <div>
        <span>{t("reviewer.requestInfoLastDay")}</span>
        <strong>{formatDate(request.lastWorkingDay, lang)}</strong>
      </div>
      <div>
        <span>{t("reviewer.requestInfoSubmitted")}</span>
        <strong>{formatDate(request.createdAt, lang)}</strong>
      </div>
    </div>
  );
}

// One row in the dashboard's request list -- shows enough for a reviewer to
// triage without opening it (reason, last working day, status), not just a
// bare employee name.
function RequestRow({ request, dept, t, lang, onOpen, showArchivedMarker }) {
  return (
    <li>
      <span className="request-row-info">
        <strong>{request.employeeFullName}</strong>
        <small>
          {t(`employee.${reasonI18nKey(request.reason)}`)} · {formatDate(request.lastWorkingDay, lang)}
        </small>
      </span>
      <span className={`badge ${dept?.status === "completed" ? "completed" : "pending"}`}>
        {dept?.status === "completed" ? t("employee.departmentCompleted") : t("employee.departmentPending")}
      </span>
      {showArchivedMarker && request.archivedFromAD && (
        <span className="badge archived">{t("common.archivedFromAdBadge")}</span>
      )}
      <button className="secondary-button" onClick={() => onOpen(request._id)}>
        {t("reviewer.open")}
      </button>
    </li>
  );
}

// "Delete from Active Directory" -- IT's capstone action, only enabled once
// every one of the 13 departments has signed. Just a password re-auth, no
// file (it's a system action, not a signature).
function ArchiveAdForm({ onSubmit, busy, t }) {
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    onSubmit(password);
    setPassword("");
  }

  return (
    <form className="signature-form archive-ad-form" onSubmit={handleSubmit}>
      <p>{t("reviewer.archiveAdHint")}</p>
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
      <button type="submit" className="reject-button" disabled={busy || !password}>
        {busy ? t("reviewer.archiving") : t("reviewer.archiveAdButton")}
      </button>
    </form>
  );
}

export default function ReviewerDashboard() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [signing, setSigning] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const isOversight = Boolean(user.hasOversightDashboard);
  const isIT = user.departmentKey === "it";

  async function reload(keepId) {
    const { data } = await client.get("/requests");
    setRequests(data);
    setLoading(false);
    setSelectedId(keepId && data.some((r) => r._id === keepId) ? keepId : null);
  }

  useEffect(() => {
    reload();
  }, []);

  const selected = requests.find((r) => r._id === selectedId);
  const myDept = selected?.departments.find((d) => d.departmentKey === user.departmentKey);

  function myDeptOf(r) {
    return r.departments.find((d) => d.departmentKey === user.departmentKey);
  }
  const needsActionList = requests.filter((r) => myDeptOf(r)?.needsAction);
  const handledList = requests.filter((r) => !myDeptOf(r)?.needsAction);

  function isDeptUnlocked(request, dept) {
    if (!dept) return false;
    return request.departments.filter((d) => d.tier < dept.tier).every((d) => d.status === "completed");
  }

  async function handleSign({ itemKey, password, file }) {
    if (!selected || !myDept) return;
    setSigning(true);
    try {
      const form = new FormData();
      form.append("password", password);
      form.append("evidence", file);
      const url = itemKey
        ? `/requests/${selected._id}/departments/${myDept.departmentKey}/items/${itemKey}/sign`
        : `/requests/${selected._id}/departments/${myDept.departmentKey}/sign`;
      await client.post(url, form);
      await reload(selected._id);
    } catch (err) {
      alert(err.response?.data?.error || t("signature.error"));
    } finally {
      setSigning(false);
    }
  }

  // Undo MY OWN just-signed department/item (e.g. uploaded the wrong file by
  // mistake) -- same backend routes as File Management's reopen
  // (POST .../reopen, .../items/:itemKey/reopen), just called with the
  // reviewer's own token instead of File Management's. The backend tells the
  // two apart by role and re-checks ownership either way, so this is not a
  // client-side-only restriction. Throws (rather than alert()ing like
  // handleSign/handleArchive above) so ReauthConfirmButton can show the
  // error inline next to the password field instead of a jarring popup.
  async function handleUndo({ itemKey, password }) {
    if (!selected || !myDept) return;
    setUndoing(true);
    try {
      const url = itemKey
        ? `/requests/${selected._id}/departments/${myDept.departmentKey}/items/${itemKey}/reopen`
        : `/requests/${selected._id}/departments/${myDept.departmentKey}/reopen`;
      await client.post(url, { password });
      await reload(selected._id);
    } catch (err) {
      throw new Error(err.response?.data?.error || t("signature.error"));
    } finally {
      setUndoing(false);
    }
  }

  async function handleArchive(password) {
    if (!selected) return;
    setArchiving(true);
    try {
      await client.post(`/requests/${selected._id}/archive-ad`, { password });
      await reload(selected._id);
    } catch (err) {
      alert(err.response?.data?.error || t("signature.error"));
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-brand">
          <img src={logoUrl} alt="EGAS" />
          <span>
            <strong>{t("appTitle")}</strong>
          </span>
        </span>
        <div className="app-account">
          <span>
            <strong>{user?.fullName}</strong>
          </span>
          <button onClick={logout}>{t("nav.logout")}</button>
        </div>
      </header>

      <div className="app-shell-content">
        <div className="content-page">
          {!selected && (
            <>
              <div className="page-heading">
                <h1>{isAr ? user.departmentName_ar : user.departmentName_en}</h1>
              </div>
              {loading && <p>{t("common.loading")}</p>}
              {!loading && requests.length === 0 && <p>{t("reviewer.empty")}</p>}

              {!loading && requests.length > 0 && (
                <>
                  <DepartmentDashboard requests={requests} user={user} />

                  {needsActionList.length > 0 && (
                    <>
                      <h2 className="request-list-section-title">{t("reviewer.sectionNeedsAction")}</h2>
                      <ul className="request-list">
                        {needsActionList.map((r) => (
                          <RequestRow
                            key={r._id}
                            request={r}
                            dept={myDeptOf(r)}
                            t={t}
                            lang={i18n.language}
                            onOpen={setSelectedId}
                            showArchivedMarker={isIT}
                          />
                        ))}
                      </ul>
                    </>
                  )}

                  {handledList.length > 0 && (
                    <>
                      <h2 className="request-list-section-title">{t("reviewer.sectionHandled")}</h2>
                      <ul className="request-list">
                        {handledList.map((r) => (
                          <RequestRow
                            key={r._id}
                            request={r}
                            dept={myDeptOf(r)}
                            t={t}
                            lang={i18n.language}
                            onOpen={setSelectedId}
                            showArchivedMarker={isIT}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {selected && (
            <>
              <button className="secondary-button" onClick={() => setSelectedId(null)}>
                &larr; {t("reviewer.backToList")}
              </button>
              <div className="page-heading" style={{ marginTop: 18 }}>
                <h1>{selected.employeeFullName}</h1>
              </div>
              <RequestInfo
                request={selected}
                departmentLabel={isAr ? selected.employeeDepartment_ar : selected.employeeDepartment_en}
                t={t}
                lang={i18n.language}
              />

              {isOversight && <RequestOversightGrid request={selected} detail="full" />}

              {myDept &&
                (isDeptUnlocked(selected, myDept) ? (
                  <SignaturePanel
                    department={myDept}
                    user={user}
                    onSign={handleSign}
                    busy={signing}
                    onUndo={!selected.archivedFromAD ? handleUndo : undefined}
                  />
                ) : (
                  <div className="rejection-banner">
                    <strong>{t("reviewer.departmentLockedTitle")}</strong>
                    <p>{t("reviewer.departmentLockedBody")}</p>
                  </div>
                ))}

              {isIT &&
                (selected.archivedFromAD ? (
                  <div className="success-banner">
                    <strong>{t("reviewer.archivedBanner")}</strong>
                  </div>
                ) : (
                  // NOT selected.status === "completed" -- per the general
                  // rule, the request only reads as "completed" once IT has
                  // actually deleted the employee from AD, which would make
                  // this button impossible to ever reach. `readyForAdDeletion`
                  // now requires every department signed AND File
                  // Management's explicit approval (see request.routes.js).
                  selected.readyForAdDeletion ? (
                    <ArchiveAdForm onSubmit={handleArchive} busy={archiving} t={t} />
                  ) : (
                    // Distinguishes "not everyone's signed yet" (no note --
                    // IT just sees the locked/awaiting state above) from
                    // "signed, but File Management hasn't reviewed it yet" --
                    // without this IT has no way to tell those apart, since
                    // they never see other departments' status.
                    selected.awaitingFileManagementApproval && (
                      <div className="rejection-banner">
                        <strong>{t("reviewer.awaitingFileManagementApprovalTitle")}</strong>
                        <p>{t("reviewer.awaitingFileManagementApprovalBody")}</p>
                      </div>
                    )
                  )
                ))}
            </>
          )}
        </div>
      </div>

      <LanguageToggle />
    </div>
  );
}
