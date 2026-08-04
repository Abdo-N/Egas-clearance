import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../utils/formatDate";
import { reasonI18nKey } from "../utils/leavingReason";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const REASON_KEYS = ["resignation", "new_job", "retirement"];
const OVERDUE_DAYS = 7;
const RECENT_LIMIT = 8;
const TOP_EMPLOYEE_DEPTS = 8;

function monthLabel(key, lang) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    month: "short",
    year: "2-digit",
  });
}

function lastNMonthKeys(n) {
  const keys = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function ownDeptOf(request, departmentKey) {
  return request.departments.find((d) => d.departmentKey === departmentKey);
}

// Which real EGAS department the employees going through clearance actually
// work in (`employeeDepartment_ar/en` -- unrelated to the 13 signing
// departments). Every reviewer already sees this per-request (it's never
// redacted), so surfacing it aggregated on the dashboard doesn't expose
// anything new.
function employeeDeptBreakdown(plainRequests) {
  const byDept = {};
  plainRequests.forEach((r) => {
    const key = r.employeeDepartment_en || r.employeeDepartment_ar || "—";
    if (!byDept[key]) byDept[key] = { name_ar: r.employeeDepartment_ar || "—", name_en: r.employeeDepartment_en || "—", count: 0 };
    byDept[key].count += 1;
  });
  return Object.values(byDept)
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_EMPLOYEE_DEPTS);
}

// A department entry is "done" once its single signature landed, or (IT)
// once every itemized checklist entry has. Returns the timestamp that
// counts as "signed off" for turnaround-time math, or null if not done yet.
function deptSignedAt(dept) {
  if (!dept) return null;
  if (dept.signatureMode === "itemized") {
    if (!dept.items.length || !dept.items.every((i) => i.status === "completed")) return null;
    return dept.items.reduce(
      (latest, i) => (!latest || new Date(i.signedAt) > new Date(latest) ? i.signedAt : latest),
      null
    );
  }
  return dept.status === "completed" ? dept.signedAt : null;
}

// Everything a single (tier-1 or itemized) department needs for its own
// dashboard: scoped strictly to requests that ever reached THIS department,
// never other departments' data -- matches the same need-to-know visibility
// the backend already enforces on `requests`.
function computeOwnStats(requests, departmentKey) {
  const entries = requests
    .map((r) => ({ request: r, dept: ownDeptOf(r, departmentKey) }))
    .filter((e) => e.dept);

  const completedEntries = entries.filter((e) => e.dept.status === "completed");
  const pendingEntries = entries.filter((e) => e.dept.needsAction);
  const now = new Date();
  const overdueCount = pendingEntries.filter(
    (e) => (now - new Date(e.request.createdAt)) / MS_PER_DAY > OVERDUE_DAYS
  ).length;

  const turnarounds = completedEntries
    .map((e) => {
      const signedAt = deptSignedAt(e.dept);
      return signedAt ? (new Date(signedAt) - new Date(e.request.createdAt)) / MS_PER_DAY : null;
    })
    .filter((v) => v != null);
  const avgTurnaround = turnarounds.length
    ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length
    : null;

  const byReason = Object.fromEntries(REASON_KEYS.map((k) => [k, 0]));
  entries.forEach((e) => {
    byReason[e.request.reason] = (byReason[e.request.reason] || 0) + 1;
  });

  const monthKeys = lastNMonthKeys(6);
  const monthly = Object.fromEntries(monthKeys.map((k) => [k, 0]));
  entries.forEach((e) => {
    const d = new Date(e.request.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthly) monthly[key] += 1;
  });

  const recent = [...entries]
    .sort((a, b) => new Date(b.request.updatedAt || b.request.createdAt) - new Date(a.request.updatedAt || a.request.createdAt))
    .slice(0, RECENT_LIMIT);

  return {
    total: entries.length,
    completedCount: completedEntries.length,
    pendingCount: pendingEntries.length,
    overdueCount,
    avgTurnaround,
    byReason,
    monthKeys,
    monthly,
    byEmployeeDept: employeeDeptBreakdown(entries.map((e) => e.request)),
    recent,
  };
}

// IT-only: which of the 5 itemized checklist items tends to lag, aggregated
// across every request that has reached IT.
function computeItemStats(requests) {
  const items = {};
  requests.forEach((r) => {
    const dept = ownDeptOf(r, "it");
    if (!dept || dept.signatureMode !== "itemized") return;
    dept.items.forEach((i) => {
      if (!items[i.key]) items[i.key] = { label_ar: i.label_ar, label_en: i.label_en, total: 0, completed: 0 };
      items[i.key].total += 1;
      if (i.status === "completed") items[i.key].completed += 1;
    });
  });
  return items;
}

// Oversight (wages/finance) reviewers get the un-redacted `departments[]` on
// every request, so their dashboard can aggregate across all 13 departments
// instead of just their own -- this is the one dashboard flavor that's
// allowed to show company-wide numbers, matching their existing full-grid
// visibility.
function computeCompanyStats(requests) {
  const completed = requests.filter((r) => r.status === "completed");
  const now = new Date();
  const overdueCount = requests.filter(
    (r) => r.status !== "completed" && (now - new Date(r.createdAt)) / MS_PER_DAY > OVERDUE_DAYS
  ).length;
  const turnarounds = completed
    .filter((r) => r.completedAt)
    .map((r) => (new Date(r.completedAt) - new Date(r.createdAt)) / MS_PER_DAY);
  const avgTurnaround = turnarounds.length
    ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length
    : null;

  const byReason = Object.fromEntries(REASON_KEYS.map((k) => [k, 0]));
  requests.forEach((r) => {
    byReason[r.reason] = (byReason[r.reason] || 0) + 1;
  });

  const monthKeys = lastNMonthKeys(6);
  const monthly = Object.fromEntries(monthKeys.map((k) => [k, 0]));
  requests.forEach((r) => {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthly) monthly[key] += 1;
  });

  const byDept = {};
  requests.forEach((r) => {
    r.departments.forEach((d) => {
      if (!byDept[d.departmentKey]) {
        byDept[d.departmentKey] = { name_ar: d.name_ar, name_en: d.name_en, order: d.order, total: 0, completed: 0 };
      }
      byDept[d.departmentKey].total += 1;
      if (d.status === "completed") byDept[d.departmentKey].completed += 1;
    });
  });

  const recent = [...requests]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, RECENT_LIMIT);

  return {
    total: requests.length,
    completedCount: completed.length,
    inProgressCount: requests.length - completed.length,
    overdueCount,
    avgTurnaround,
    byReason,
    monthKeys,
    monthly,
    byDept: Object.entries(byDept).sort((a, b) => a[1].order - b[1].order),
    byEmployeeDept: employeeDeptBreakdown(requests),
    recent,
  };
}

function StatTile({ value, label, tone }) {
  return (
    <div className={`dept-stat-tile${tone ? ` dept-stat-tile--${tone}` : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Donut({ segments, centerValue, centerLabel }) {
  let cursor = 0;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const stops = segments
    .map((s) => {
      const start = (cursor / total) * 360;
      cursor += s.value;
      const end = (cursor / total) * 360;
      return `${s.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="donut-chart-row">
      <div className="donut-chart" style={{ background: `conic-gradient(${stops})` }}>
        <div className="donut-chart-center">
          <strong>{centerValue}</strong>
          {centerLabel && <span>{centerLabel}</span>}
        </div>
      </div>
      <ul className="donut-legend">
        {segments.map((s) => (
          <li key={s.label}>
            <span className="donut-legend-swatch" style={{ background: s.color }} />
            {s.label} <strong>{s.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarList({ rows, maxValue }) {
  const max = maxValue ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="bar-list">
      {rows.map((r) => (
        <li key={r.label} className="bar-list-row">
          <span className="bar-list-label">{r.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${max ? (r.value / max) * 100 : 0}%`, background: r.color }} />
          </span>
          <span className="bar-list-value">{r.display ?? r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DepartmentDashboard({ requests, user }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const isOversight = Boolean(user.hasOversightDashboard);
  const isIT = user.departmentKey === "it";
  const isFileManagement = user.role === "file_management";
  // Oversight reviewers (Wages/Finance) and File Management both already see
  // every one of a request's 13 departments (full detail for oversight, a
  // status-only summary for File Management) -- neither is scoped to a
  // single department, so both get the aggregated company-wide dashboard
  // instead of the own-department one.
  const useCompanyStats = isOversight || isFileManagement;

  const ownStats = useMemo(
    () => (useCompanyStats ? null : computeOwnStats(requests, user.departmentKey)),
    [requests, user.departmentKey, useCompanyStats]
  );
  const itemStats = useMemo(() => (isIT ? computeItemStats(requests) : null), [requests, isIT]);
  const companyStats = useMemo(() => (useCompanyStats ? computeCompanyStats(requests) : null), [requests, useCompanyStats]);

  const stats = useCompanyStats ? companyStats : ownStats;
  if (!stats || requests.length === 0) return null;

  const reasonRows = REASON_KEYS.map((key) => ({
    label: t(`employee.${reasonI18nKey(key)}`),
    value: stats.byReason[key],
    color: "var(--green-700)",
  }));

  const monthRows = stats.monthKeys.map((key) => ({
    label: monthLabel(key, i18n.language),
    value: stats.monthly[key],
    color: "var(--gold-600)",
  }));

  return (
    <div className="analytics-dashboard">
      {useCompanyStats && <p className="analytics-dashboard-subtitle">{t("reviewer.dashboardCompanyOverview")}</p>}

      <div className="dept-stats-row">
        <StatTile value={stats.total} label={t("reviewer.dashboardTotal")} />
        {useCompanyStats ? (
          <>
            <StatTile value={stats.completedCount} label={t("reviewer.dashboardOverallCompleted")} tone="completed" />
            <StatTile value={stats.inProgressCount} label={t("reviewer.dashboardOverallInProgress")} tone="pending" />
          </>
        ) : (
          <>
            <StatTile value={stats.pendingCount} label={t("reviewer.dashboardPending")} tone="pending" />
            <StatTile value={stats.completedCount} label={t("reviewer.dashboardCompleted")} tone="completed" />
          </>
        )}
        <StatTile
          value={stats.avgTurnaround != null ? `${stats.avgTurnaround.toFixed(1)} ${t("reviewer.dashboardAvgTurnaroundUnit")}` : "—"}
          label={t("reviewer.dashboardAvgTurnaround")}
        />
        <StatTile value={stats.overdueCount} label={t("reviewer.dashboardOverdue")} tone={stats.overdueCount > 0 ? "overdue" : undefined} />
      </div>

      <div className="analytics-grid">
        <div className="panel-card analytics-card">
          <h3>{t("reviewer.dashboardStatusBreakdown")}</h3>
          <Donut
            centerValue={stats.total}
            centerLabel={t("reviewer.dashboardTotal")}
            segments={
              useCompanyStats
                ? [
                    { label: t("reviewer.dashboardOverallCompleted"), value: stats.completedCount, color: "var(--green-700)" },
                    { label: t("reviewer.dashboardOverallInProgress"), value: stats.inProgressCount, color: "var(--gold-600)" },
                  ]
                : [
                    { label: t("reviewer.dashboardCompleted"), value: stats.completedCount, color: "var(--green-700)" },
                    { label: t("reviewer.dashboardPending"), value: stats.pendingCount, color: "var(--gold-600)" },
                    {
                      label: t("employee.statusInProgress"),
                      value: Math.max(0, stats.total - stats.completedCount - stats.pendingCount),
                      color: "var(--ink-500)",
                    },
                  ]
            }
          />
        </div>

        <div className="panel-card analytics-card">
          <h3>{t("reviewer.dashboardReasonBreakdown")}</h3>
          <BarList rows={reasonRows} />
        </div>

        <div className="panel-card analytics-card">
          <h3>{t("reviewer.dashboardMonthlyTrend")}</h3>
          <BarList rows={monthRows} />
        </div>

        {isIT && itemStats && (
          <div className="panel-card analytics-card">
            <h3>{t("reviewer.dashboardItemBreakdown")}</h3>
            <BarList
              rows={Object.values(itemStats).map((i) => ({
                label: isAr ? i.label_ar : i.label_en,
                value: i.completed,
                display: `${i.completed} ${t("reviewer.dashboardOf")} ${i.total}`,
                color: "var(--green-700)",
              }))}
              maxValue={Math.max(1, ...Object.values(itemStats).map((i) => i.total))}
            />
          </div>
        )}

        {useCompanyStats && (
          <>
            <div className="panel-card analytics-card">
              <h3>{t("reviewer.dashboardDeptWorkload")}</h3>
              <BarList
                rows={stats.byDept.map(([, d]) => ({
                  label: isAr ? d.name_ar : d.name_en,
                  value: d.total - d.completed,
                  color: "var(--gold-600)",
                }))}
              />
            </div>
            <div className="panel-card analytics-card">
              <h3>{t("reviewer.dashboardDeptPerformance")}</h3>
              <BarList
                rows={stats.byDept.map(([, d]) => ({
                  label: isAr ? d.name_ar : d.name_en,
                  value: d.total ? Math.round((d.completed / d.total) * 100) : 0,
                  display: `${d.total ? Math.round((d.completed / d.total) * 100) : 0}%`,
                  color: "var(--green-700)",
                }))}
                maxValue={100}
              />
            </div>
          </>
        )}

        {stats.byEmployeeDept.length > 0 && (
          <div className="panel-card analytics-card">
            <h3>{t("reviewer.dashboardEmployeeDeptBreakdown")}</h3>
            <BarList
              rows={stats.byEmployeeDept.map((d) => ({
                label: isAr ? d.name_ar : d.name_en,
                value: d.count,
                color: "var(--indigo-600)",
              }))}
            />
          </div>
        )}

        <div className="panel-card analytics-card analytics-card--wide">
          <h3>{t("reviewer.dashboardRecentActivity")}</h3>
          {stats.recent.length === 0 ? (
            <p>{t("reviewer.dashboardNoActivity")}</p>
          ) : (
            <ul className="activity-list">
              {stats.recent.map((entry) => {
                const request = useCompanyStats ? entry : entry.request;
                const dept = useCompanyStats ? null : entry.dept;
                const status = useCompanyStats ? request.status : dept.status;
                return (
                  <li key={request._id} className="activity-list-row">
                    <span className="activity-list-employee">
                      <strong>{request.employeeFullName}</strong>
                      <small>{t(`employee.${reasonI18nKey(request.reason)}`)}</small>
                    </span>
                    <span className={`badge ${status === "completed" ? "completed" : "pending"}`}>
                      {status === "completed" ? t("employee.departmentCompleted") : t("employee.departmentPending")}
                    </span>
                    {request.archivedFromAD && (isIT || useCompanyStats) && (
                      <span className="badge archived">{t("common.archivedFromAdBadge")}</span>
                    )}
                    <small className="activity-list-date">
                      {formatDate(request.updatedAt || request.createdAt, i18n.language)}
                    </small>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
