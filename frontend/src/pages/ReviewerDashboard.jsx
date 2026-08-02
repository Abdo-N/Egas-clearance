import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";
import ChecklistPanel from "../components/ChecklistPanel";
import DepartmentIcon from "../components/DepartmentIcon";
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

export default function ReviewerDashboard() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDeptKey, setSelectedDeptKey] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [sortBy, setSortBy] = useState("submitted");

  async function loadList() {
    const { data } = await client.get("/requests");
    setRequests(data);
  }

  useEffect(() => {
    loadList();
  }, []);

  function currentDepartmentLabel(r) {
    const dept = r.departments.find((d) => d.status !== "completed") || r.departments[r.departments.length - 1];
    return isAr ? dept.name_ar : dept.name_en;
  }

  const sortedRequests = [...requests].sort((a, b) => {
    if (sortBy === "lastWorkingDay") {
      return new Date(a.lastWorkingDay) - new Date(b.lastWorkingDay);
    }
    if (sortBy === "department") {
      return currentDepartmentLabel(a).localeCompare(currentDepartmentLabel(b), i18n.language);
    }
    return 0; // "submitted" -- keep the server's order (already sorted by createdAt)
  });

  const selected = requests.find((r) => r._id === selectedId);
  const activeDeptKey = user.role === "admin" ? selectedDeptKey : user.departmentKey;
  const myDept = selected?.departments.find((d) => d.departmentKey === activeDeptKey);

  function openRequest(id) {
    setSelectedId(id);
    setSelectedDeptKey(null);
  }

  function backToList() {
    setSelectedId(null);
    setSelectedDeptKey(null);
  }

  async function handleCheck(itemKey, checked) {
    if (!selected || !myDept) return;
    const deptKey = myDept.departmentKey;
    setBusyKey(itemKey);
    try {
      const { data } = await client.patch(
        `/requests/${selected._id}/departments/${deptKey}/items/${itemKey}`,
        { checked }
      );
      setRequests((prev) => prev.map((r) => (r._id === data._id ? data : r)));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update item");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleFinalize() {
    if (!selected || !myDept) return;
    setFinalizing(true);
    try {
      const { data } = await client.patch(
        `/requests/${selected._id}/departments/${myDept.departmentKey}/finalize`
      );
      setRequests((prev) => prev.map((r) => (r._id === data._id ? data : r)));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to finalize department");
    } finally {
      setFinalizing(false);
    }
  }

  async function handleReject(rejected, reason) {
    if (!selected || !myDept) return;
    setRejecting(true);
    try {
      const { data } = await client.patch(
        `/requests/${selected._id}/departments/${myDept.departmentKey}/reject`,
        { rejected, reason }
      );
      setRequests((prev) => prev.map((r) => (r._id === data._id ? data : r)));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update rejection");
    } finally {
      setRejecting(false);
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
                <h1>{t("reviewer.title")}</h1>
              </div>
              {requests.length === 0 && <p>{t("reviewer.empty")}</p>}
              {requests.length > 0 && (
                <div className="sort-control">
                  <label htmlFor="reviewer-sort">{t("reviewer.sortLabel")}</label>
                  <select id="reviewer-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="submitted">{t("reviewer.sortSubmitted")}</option>
                    <option value="lastWorkingDay">{t("reviewer.sortLastWorkingDay")}</option>
                    <option value="department">{t("reviewer.sortDepartment")}</option>
                  </select>
                </div>
              )}
              <ul className="request-list">
                {sortedRequests.map((r) => (
                  <li key={r._id}>
                    {t("reviewer.employee")}: {r.employeeFullName}
                    <button className="secondary-button" onClick={() => openRequest(r._id)}>
                      {t("reviewer.open")}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {selected && user.role === "admin" && !selectedDeptKey && (
            <>
              <button className="secondary-button" onClick={backToList}>
                &larr; {t("reviewer.backToList")}
              </button>
              <div className="page-heading" style={{ marginTop: 18 }}>
                <h1>{selected.employeeFullName}</h1>
                <p>{t("reviewer.selectDepartment")}</p>
              </div>
              <RequestInfo
                request={selected}
                departmentLabel={isAr ? selected.employeeDepartment_ar : selected.employeeDepartment_en}
                t={t}
                lang={i18n.language}
              />
              <ul className="request-list">
                {selected.departments.map((d, idx) => {
                  const isLocked =
                    d.status === "pending" &&
                    idx > 0 &&
                    selected.departments.slice(0, idx).some((prior) => prior.status !== "completed");

                  return (
                    <li key={d.departmentKey}>
                      <span className="request-list-dept">
                        <DepartmentIcon departmentKey={d.departmentKey} className="request-list-icon" />
                        {isAr ? d.name_ar : d.name_en}
                      </span>
                      <span className={`badge ${isLocked ? "upcoming" : d.status}`}>
                        {d.status === "completed"
                          ? t("employee.departmentCompleted")
                          : d.status === "rejected"
                          ? t("employee.departmentRejected")
                          : isLocked
                          ? t("employee.departmentUpcoming")
                          : t("employee.departmentPending")}
                      </span>
                      <button className="secondary-button" onClick={() => setSelectedDeptKey(d.departmentKey)}>
                        {t("reviewer.open")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {selected && myDept && (
            <>
              <button className="secondary-button" onClick={backToList}>
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
              <ChecklistPanel
                department={myDept}
                allDepartments={selected.departments}
                onCheck={handleCheck}
                onReject={handleReject}
                onFinalize={handleFinalize}
                busyKey={busyKey}
                rejecting={rejecting}
                finalizing={finalizing}
              />
            </>
          )}
        </div>
      </div>

      <LanguageToggle />
    </div>
  );
}
