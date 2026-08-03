import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client";

/**
 * Search-and-select from the (seed-only, mock-AD-stand-in) employee
 * directory. File Management uses this to pick who a new clearance request
 * is for -- see GET /api/employees/search. Loads the full current directory
 * on mount (no query = everything, most recently added first) so it's
 * visible immediately instead of requiring a search first.
 */
export default function EmployeePicker({ selected, onSelect }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [newEmployee, setNewEmployee] = useState({
    employeeNumber: "",
    fullName: "",
    jobTitle: "",
    department_ar: "",
    department_en: "",
  });

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch() {
    setSearching(true);
    try {
      const { data } = await client.get("/employees/search", { params: { q: query.trim() } });
      setResults(data);
    } finally {
      setSearching(false);
    }
  }

  function openAddForm() {
    // Prefill from whatever was searched -- a number goes to employeeNumber,
    // anything else goes to fullName, since we don't know which the tester typed.
    setNewEmployee((prev) => ({
      ...prev,
      employeeNumber: /^\d+$/.test(query.trim()) ? query.trim() : "",
      fullName: /^\d+$/.test(query.trim()) ? "" : query.trim(),
    }));
    setAddError("");
    setShowAddForm(true);
  }

  async function handleAddEmployee() {
    setAddError("");
    setAdding(true);
    try {
      const { data } = await client.post("/employees", newEmployee);
      onSelect(data);
    } catch (err) {
      setAddError(err.response?.data?.error || t("fileManagement.addEmployeeError"));
    } finally {
      setAdding(false);
    }
  }

  if (selected) {
    return (
      <div className="employee-picker-selected">
        <div>
          <strong>{selected.fullName}</strong>
          <small>
            #{selected.employeeNumber} · {isAr ? selected.department_ar : selected.department_en}
          </small>
        </div>
        <button type="button" className="secondary-button" onClick={() => onSelect(null)}>
          {t("fileManagement.changeEmployee")}
        </button>
      </div>
    );
  }

  return (
    <div className="employee-picker">
      {/* Plain div, not a <form> -- this whole component is embedded inside
          FileManagementDashboard's request-creation form, and nested
          <form> elements are invalid HTML (and confuse which submit fires). */}
      <div className="employee-picker-search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder={t("fileManagement.employeeSearchPlaceholder")}
        />
        <button type="button" className="secondary-button" disabled={searching} onClick={handleSearch}>
          {searching ? t("common.loading") : t("fileManagement.searchButton")}
        </button>
      </div>

      {results.length > 0 && (
        <>
          <p className="employee-picker-results-label">
            {query.trim() ? t("fileManagement.searchResultsLabel") : t("fileManagement.allEmployeesLabel")}
          </p>
          <ul className="employee-picker-results">
          {results.map((emp) => (
            <li key={emp.employeeNumber}>
              <div>
                <strong>{emp.fullName}</strong>
                <small>
                  #{emp.employeeNumber} · {isAr ? emp.department_ar : emp.department_en}
                </small>
              </div>
              <button type="button" className="secondary-button" onClick={() => onSelect(emp)}>
                {t("fileManagement.selectEmployee")}
              </button>
            </li>
          ))}
          </ul>
        </>
      )}

      {results.length === 0 && !searching && !showAddForm && (
        <p className="employee-picker-empty">
          {query.trim() ? t("fileManagement.noEmployeesFound") : t("fileManagement.noEmployeesAtAll")}{" "}
          <button type="button" className="employee-picker-add-link" onClick={openAddForm}>
            {t("fileManagement.addEmployeeLink")}
          </button>
        </p>
      )}

      {/* TEMPORARY dev feature -- lets you add a test employee to the mock
          AD directory on the spot instead of editing employees.data.js and
          re-running `npm run seed`. Delete this block + the matching
          POST /api/employees route once real accounts/AD exist. */}
      {showAddForm && (
        <div className="employee-picker-add-form">
          <p className="employee-picker-add-title">{t("fileManagement.addEmployeeTitle")}</p>
          <div className="form-group">
            <label>{t("fileManagement.employeeNumberLabel")}</label>
            <input
              type="text"
              value={newEmployee.employeeNumber}
              onChange={(e) => setNewEmployee({ ...newEmployee, employeeNumber: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t("fileManagement.fullNameLabel")}</label>
            <input
              type="text"
              value={newEmployee.fullName}
              onChange={(e) => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t("fileManagement.jobTitleLabel")}</label>
            <input
              type="text"
              value={newEmployee.jobTitle}
              onChange={(e) => setNewEmployee({ ...newEmployee, jobTitle: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t("fileManagement.departmentArLabel")}</label>
            <input
              type="text"
              value={newEmployee.department_ar}
              onChange={(e) => setNewEmployee({ ...newEmployee, department_ar: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t("fileManagement.departmentEnLabel")}</label>
            <input
              type="text"
              value={newEmployee.department_en}
              onChange={(e) => setNewEmployee({ ...newEmployee, department_en: e.target.value })}
            />
          </div>

          {addError && <p className="login-error">{addError}</p>}

          <div className="employee-picker-add-actions">
            <button type="button" className="secondary-button" onClick={() => setShowAddForm(false)}>
              {t("fileManagement.cancel")}
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={adding || !newEmployee.employeeNumber.trim() || !newEmployee.fullName.trim()}
              onClick={handleAddEmployee}
            >
              {adding ? t("common.loading") : t("fileManagement.addEmployeeSubmit")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
