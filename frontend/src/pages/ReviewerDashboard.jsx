import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";
import ChecklistPanel from "../components/ChecklistPanel";

export default function ReviewerDashboard() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  async function loadList() {
    const { data } = await client.get("/requests");
    setRequests(data);
  }

  useEffect(() => {
    loadList();
  }, []);

  const selected = requests.find((r) => r._id === selectedId);
  const myDept = selected?.departments.find((d) => d.departmentKey === user.departmentKey || user.role === "admin");

  async function handleCheck(itemKey, checked) {
    if (!selected) return;
    const deptKey = user.role === "admin" ? myDept.departmentKey : user.departmentKey;
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
        {!selected && (
          <>
            <h2>{t("reviewer.title")}</h2>
            {requests.length === 0 && <p>{t("reviewer.empty")}</p>}
            <ul className="request-list">
              {requests.map((r) => (
                <li key={r._id}>
                  {t("reviewer.employee")}: {r.employeeFullName}
                  <button onClick={() => setSelectedId(r._id)}>{t("reviewer.open")}</button>
                </li>
              ))}
            </ul>
          </>
        )}

        {selected && myDept && (
          <>
            <button onClick={() => setSelectedId(null)}>&larr; {t("reviewer.backToList")}</button>
            <h2>{selected.employeeFullName}</h2>
            <ChecklistPanel
              department={myDept}
              allDepartments={selected.departments}
              onCheck={handleCheck}
              busyKey={busyKey}
            />
          </>
        )}
      </main>
    </div>
  );
}
