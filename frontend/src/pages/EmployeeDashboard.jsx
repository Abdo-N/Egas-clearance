import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";
import DepartmentIcon from "../components/DepartmentIcon";
import { formatDate } from "../utils/formatDate";
import { REASONS, reasonI18nKey } from "../utils/leavingReason";
import logoUrl from "../assets/egas-logo.png";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function EmployeeDashboard() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const isAr = i18n.language === "ar";
  const [request, setRequest] = useState(undefined); // undefined = loading, null = none yet
  const [reason, setReason] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { data } = await client.get("/requests/mine");
    setRequest(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitRequest(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await client.post("/requests", { reason, lastWorkingDay });
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  const firstPendingIndex = request?.departments?.findIndex((d) => d.status === "pending") ?? -1;
  const rejectedDepartments = request?.departments?.filter((d) => d.status === "rejected") ?? [];

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
            <h1>{t("employee.title")}</h1>
          </div>

          {request === undefined && <p>{t("common.loading")}</p>}

          {request === null && (
            <div className="panel-card">
              <p style={{ marginBottom: 20 }}>{t("employee.noRequest")}</p>
              <form onSubmit={submitRequest}>
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

                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? t("employee.submitting") : t("employee.submitButton")}
                </button>
              </form>
            </div>
          )}

          {request && (
            <div className="panel-card">
              <p className="overall-status">
                {t("employee.statusLabel")}:{" "}
                <strong>
                  {request.status === "completed"
                    ? t("employee.statusCompleted")
                    : request.status === "rejected"
                    ? t("employee.statusRejected")
                    : t("employee.statusInProgress")}
                </strong>
              </p>

              {rejectedDepartments.length > 0 && (
                <div className="rejection-alert">
                  <strong>{t("employee.rejectedTitle")}</strong>
                  <ul>
                    {rejectedDepartments.map((d) => (
                      <li key={d.departmentKey}>
                        <strong>{isAr ? d.name_ar : d.name_en}:</strong> {d.rejectedReason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="request-info">
                <div>
                  <span>{t("employee.reasonLabel")}</span>
                  <strong>{t(`employee.${reasonI18nKey(request.reason)}`)}</strong>
                </div>
                <div>
                  <span>{t("employee.lastWorkingDayLabel")}</span>
                  <strong>{formatDate(request.lastWorkingDay, i18n.language)}</strong>
                </div>
                <div>
                  <span>{t("employee.requestedOn")}</span>
                  <strong>{formatDate(request.createdAt, i18n.language)}</strong>
                </div>
              </div>

              <div className="dept-progress-grid">
                {request.departments.map((d, idx) => {
                  const state =
                    d.status === "rejected"
                      ? "rejected"
                      : d.status === "completed"
                      ? "done"
                      : idx === firstPendingIndex
                      ? "current"
                      : "upcoming";
                  const stateLabel =
                    state === "done"
                      ? t("employee.departmentCompleted")
                      : state === "current"
                      ? t("employee.departmentCurrent")
                      : state === "rejected"
                      ? t("employee.departmentRejected")
                      : t("employee.departmentUpcoming");
                  const marker = state === "done" ? "✓" : state === "rejected" ? "✕" : idx + 1;

                  return (
                    <div className="dept-progress-step" data-state={state} key={d.departmentKey}>
                      <div className="dept-progress-icon">
                        <DepartmentIcon departmentKey={d.departmentKey} />
                      </div>
                      <div className="dept-progress-marker">{marker}</div>
                      <div className="dept-progress-label">{isAr ? d.name_ar : d.name_en}</div>
                      <span className="dept-progress-tag">{stateLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <LanguageToggle />
    </div>
  );
}
