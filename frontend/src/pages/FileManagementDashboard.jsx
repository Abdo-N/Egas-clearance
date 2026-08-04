import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";
import EmployeePicker from "../components/EmployeePicker";
import RequestOversightGrid from "../components/RequestOversightGrid";
import DepartmentDashboard from "../components/DepartmentDashboard";
import { formatDate } from "../utils/formatDate";
import { REASONS, reasonI18nKey } from "../utils/leavingReason";
import logoUrl from "../assets/egas-logo.png";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

// Every one of the 13 departments has signed -- doesn't mean approved or
// archived yet, just that there's nothing left to reopen except in response
// to a legibility problem. Derived from the summary departments array (each
// entry only carries `status`, matching File Management's high-level view).
function isFullySigned(request) {
  return request.departments.every((d) => d.status === "completed");
}

// File Management's explicit "I reviewed the signed form, it's OK" gate --
// same re-authentication pattern as signing/archive-ad. Only shown once
// every department has signed and only until it's given (see
// awaitingFileManagementApproval on the request).
function ApproveControl({ onConfirm, t }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(password);
      setPassword("");
    } catch (err) {
      setError(err.message || t("fileManagement.approveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="signature-form" onSubmit={handleSubmit}>
      <p>{t("fileManagement.approveHint")}</p>
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
      <button type="submit" className="primary-button" disabled={submitting || !password}>
        {submitting ? t("fileManagement.approving") : t("fileManagement.approveButton")}
      </button>
      {error && <p className="login-error">{error}</p>}
    </form>
  );
}

export default function FileManagementDashboard() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const [employee, setEmployee] = useState(null);
  const [reason, setReason] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function loadRequests() {
    const { data } = await client.get("/requests");
    setRequests(data);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      await client.post("/requests", {
        employeeNumber: employee.employeeNumber,
        reason,
        lastWorkingDay,
      });
      setEmployee(null);
      setReason("");
      setLastWorkingDay("");
      await loadRequests();
    } catch (err) {
      setSubmitError(err.response?.data?.error || t("fileManagement.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadPdf(requestId) {
    setDownloadingId(requestId);
    try {
      const { data } = await client.get(`/requests/${requestId}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      window.open(url, "_blank");
    } catch {
      alert(t("fileManagement.pdfError"));
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleReopenDepartment(requestId, deptKey, password) {
    try {
      await client.post(`/requests/${requestId}/departments/${deptKey}/reopen`, { password });
      await loadRequests();
    } catch (err) {
      throw new Error(err.response?.data?.error || t("fileManagement.reopenError"));
    }
  }

  async function handleReopenItem(requestId, deptKey, itemKey, password) {
    try {
      await client.post(`/requests/${requestId}/departments/${deptKey}/items/${itemKey}/reopen`, { password });
      await loadRequests();
    } catch (err) {
      throw new Error(err.response?.data?.error || t("fileManagement.reopenError"));
    }
  }

  async function handleApprove(requestId, password) {
    try {
      await client.post(`/requests/${requestId}/approve-ad-deletion`, { password });
      await loadRequests();
    } catch (err) {
      throw new Error(err.response?.data?.error || t("fileManagement.approveError"));
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
          <div className="page-heading">
            <h1>{t("fileManagement.title")}</h1>
          </div>

          {!loading && <DepartmentDashboard requests={requests} user={user} />}

          <div className="panel-card">
            <h3>{t("fileManagement.newRequestTitle")}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t("fileManagement.employeeLabel")}</label>
                <EmployeePicker selected={employee} onSelect={setEmployee} />
              </div>

              <div className="form-group">
                <label>{t("employee.reasonLabel")}</label>
                <div className="reason-options">
                  {REASONS.map((value) => (
                    <label className="reason-option" key={value}>
                      <input
                        type="radio"
                        name="reason"
                        value={value}
                        checked={reason === value}
                        onChange={(e) => setReason(e.target.value)}
                        required
                      />
                      {t(`employee.${reasonI18nKey(value)}`)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="lastWorkingDay">{t("employee.lastWorkingDayLabel")}</label>
                <input
                  id="lastWorkingDay"
                  type="date"
                  min={todayIsoDate()}
                  value={lastWorkingDay}
                  onChange={(e) => setLastWorkingDay(e.target.value)}
                  required
                />
              </div>

              {submitError && <p className="login-error">{submitError}</p>}

              <button type="submit" className="primary-button" disabled={submitting || !employee}>
                {submitting ? t("employee.submitting") : t("fileManagement.submitButton")}
              </button>
            </form>
          </div>

          <div className="page-heading" style={{ marginTop: 28 }}>
            <h1>{t("fileManagement.myRequestsTitle")}</h1>
          </div>

          {loading && <p>{t("common.loading")}</p>}
          {!loading && requests.length === 0 && <p>{t("fileManagement.empty")}</p>}

          <ul className="request-list">
            {requests.map((r) => (
              <li key={r._id} className="request-list-expandable">
                <div className="request-list-row">
                  <span>
                    {r.employeeFullName} <small>#{r.employeeNumber}</small>
                  </span>
                  {r.status === "completed" ? (
                    <span className="badge completed">{t("employee.statusCompleted")}</span>
                  ) : r.readyForAdDeletion ? (
                    <span className="badge awaiting">{t("common.awaitingAdDeletionBadge")}</span>
                  ) : r.awaitingFileManagementApproval ? (
                    <span className="badge awaiting">{t("common.awaitingApprovalBadge")}</span>
                  ) : (
                    <span className="badge pending">{t("employee.statusInProgress")}</span>
                  )}
                  <button
                    className="secondary-button"
                    onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
                  >
                    {expandedId === r._id ? t("fileManagement.hideDetails") : t("fileManagement.viewDetails")}
                  </button>
                  {isFullySigned(r) && (
                    <button
                      className="secondary-button"
                      disabled={downloadingId === r._id}
                      onClick={() => handleDownloadPdf(r._id)}
                    >
                      {downloadingId === r._id
                        ? t("common.loading")
                        : r.status === "completed"
                        ? t("fileManagement.downloadPdf")
                        : t("fileManagement.previewPdf")}
                    </button>
                  )}
                </div>

                {expandedId === r._id && (
                  <div className="request-list-detail">
                    <div className="request-info">
                      <div>
                        <span>{t("employee.reasonLabel")}</span>
                        <strong>{t(`employee.${reasonI18nKey(r.reason)}`)}</strong>
                      </div>
                      <div>
                        <span>{t("employee.lastWorkingDayLabel")}</span>
                        <strong>{formatDate(r.lastWorkingDay, i18n.language)}</strong>
                      </div>
                      <div>
                        <span>{t("employee.requestedOn")}</span>
                        <strong>{formatDate(r.createdAt, i18n.language)}</strong>
                      </div>
                    </div>
                    <RequestOversightGrid
                      request={r}
                      detail="summary"
                      onReopenDepartment={
                        !r.archivedFromAD
                          ? (deptKey, password) => handleReopenDepartment(r._id, deptKey, password)
                          : undefined
                      }
                      onReopenItem={
                        !r.archivedFromAD
                          ? (deptKey, itemKey, password) => handleReopenItem(r._id, deptKey, itemKey, password)
                          : undefined
                      }
                    />
                    {r.awaitingFileManagementApproval && (
                      <ApproveControl t={t} onConfirm={(password) => handleApprove(r._id, password)} />
                    )}
                    {r.readyForAdDeletion && !r.archivedFromAD && (
                      <div className="success-banner">
                        <strong>{t("fileManagement.approvedNote")}</strong>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <LanguageToggle />
    </div>
  );
}
