import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";

export default function EmployeeDashboard() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const isAr = i18n.language === "ar";
  const [request, setRequest] = useState(undefined); // undefined = loading, null = none yet
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { data } = await client.get("/requests/mine");
    setRequest(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitRequest() {
    setSubmitting(true);
    try {
      await client.post("/requests");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard">
      <header>
        <h1>{t("appTitle")}</h1>
        <div className="header-actions">
          <span>{user?.fullName}</span>
          <LanguageToggle />
          <button onClick={logout}>{t("nav.logout")}</button>
        </div>
      </header>

      <main>
        <h2>{t("employee.title")}</h2>

        {request === undefined && <p>{t("common.loading")}</p>}

        {request === null && (
          <div>
            <p>{t("employee.noRequest")}</p>
            <button onClick={submitRequest} disabled={submitting}>
              {submitting ? t("employee.submitting") : t("employee.submitButton")}
            </button>
          </div>
        )}

        {request && (
          <div>
            <p className="overall-status">
              {t("employee.statusLabel")}:{" "}
              <strong>
                {request.status === "completed" ? t("employee.statusCompleted") : t("employee.statusInProgress")}
              </strong>
            </p>
            <div className="progress-bar">
              {request.departments.map((d, idx) => (
                <Fragment key={d.departmentKey}>
                  <div className="progress-step">
                    <div
                      className={`step-circle ${d.status}`}
                      title={d.status === "completed" ? t("employee.departmentCompleted") : t("employee.departmentPending")}
                    >
                      {d.status === "completed" ? "✓" : idx + 1}
                    </div>
                    <div className="step-label">{isAr ? d.name_ar : d.name_en}</div>
                  </div>
                  {idx < request.departments.length - 1 && (
                    <div className={`step-connector ${d.status === "completed" ? "completed" : ""}`} />
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
