# EGAS Employee Clearance System — CLAUDE.md

Read this before doing anything else in this repo. If you're a team member new to
fullstack dev, read PROJECT_STATUS.md and TASKS.md too — they tell you exactly
what to build and what to look up.

## What this project is

Digitizing EGAS's paper-based employee clearance ("إخلاء طرف") process. When an
employee retires or resigns, they used to walk a paper form to 13 departments and
collect signatures. This app replaces that with a website: the employee logs in,
submits a clearance request, and each of the 13 departments checks off their own
checklist for that employee online. The IT department's checklist always finishes
last, because its final step deletes the employee from Active Directory.

Full context and the original department list are in the project brief the team
lead (Nader) has; this file only covers how the codebase is organized.

## Stack

- Backend: Node.js + Express + MongoDB (Mongoose). JWT auth.
- Frontend: React + Vite + React Router + react-i18next (Arabic/English, RTL support).
- Everything is JavaScript (no TypeScript) to keep the learning curve low for a
  team that is mostly new to fullstack dev.

## Repo layout

```
egas-clearance/
  backend/
    src/
      config/db.js          Mongo connection
      models/                Mongoose schemas: User, Department, ClearanceRequest
      routes/                auth, department, request routes
      middleware/            JWT auth + role guard
      seed/                  seed script + seed data (departments, mock AD users)
    scripts/smoke-test.js   manual end-to-end test against a running server
  frontend/
    src/
      api/client.js          axios instance, attaches JWT automatically
      context/AuthContext.jsx
      pages/                 Login, EmployeeDashboard, ReviewerDashboard
      components/            ChecklistPanel, LanguageToggle, DepartmentIcon
      utils/                 formatDate.js, leavingReason.js (small shared helpers)
      assets/                EGAS logo + login background (shared with the org's
                              other internal app, see git history for provenance)
      demoAccounts.js        TEMPORARY: login-page "demo accounts" card data,
                              mirrors backend/src/seed/*.data.js -- delete once
                              real accounts exist
      locales/               en.json, ar.json for i18next
      i18n.js
  PROJECT_STATUS.md   living status tracker — update this as you finish tasks
  TASKS.md            who is doing what, and what tech each task requires
```

## The most important design decision: mock Active Directory

We do NOT have real LDAP/Active Directory access yet. `backend/src/models/User.js`
is a MongoDB collection that STANDS IN for real AD. Only
`backend/src/routes/auth.routes.js` is allowed to know this is a mock — every other
file just receives a JWT with `{ username, fullName, role, departmentKey }` and
doesn't care where it came from. When real LDAP access shows up, only
`auth.routes.js` needs to change (swap the `User.findOne` + `bcrypt.compare` for
an LDAP bind call). Do not leak "this is a mock" assumptions into other files.

Employees who reach the IT department's final step get `archivedFromAD: true` set
on their User record (they are NOT deleted from Mongo) so they can still log in
and see their completed request. This is a placeholder for the "temporary
database" design mentioned in the brief — a real design pass on that is still
needed, see PROJECT_STATUS.md.

## The most important business rule: generic + configurable departments

We only have EXACT checklist requirements for the IT department (9 ordered
items, ending in "Delete from Active Directory"). The other departments' real
requirements haven't been gathered from EGAS yet. Instead of hardcoding 16
different checklists, `Department.checklistItems` is a configurable array
(key/label_ar/label_en/order) stored in the database. Every other department
currently ships with ONE generic placeholder item so the app is demoable end to
end. When real requirements come in, only `backend/src/seed/departments.data.js`
needs to change — no route, model, or frontend logic changes.

Three rules are enforced in `backend/src/routes/request.routes.js`, and ONLY there:

1. **Items within a department must be checked in ascending `order`**
   (`PATCH /:id/departments/:deptKey/items/:itemKey`).
2. **A department with `isFinal: true`** (only IT, right now) **cannot have its
   LAST item checked until every other department on the request has
   `status: "completed"`.** This is what makes "IT signs last" work without
   ever hardcoding the string "it" in the gating logic itself. A department
   that's `"pending"` OR `"rejected"` both block this the same way.
3. **A reviewer/admin can reject a department instead of checking an item**
   (`PATCH /:id/departments/:deptKey/reject`, `{ rejected: true, reason }` —
   reason required), for when something's actually unresolved rather than
   just not done yet. Rejecting one department immediately flips the WHOLE
   request's `status` to `"rejected"` via `computeOverallStatus()` (a small
   helper at the top of the file, shared by both this route and the
   item-check route above) — this is why it lives in one function instead of
   being recomputed inline in two places. A rejected department's checklist
   items are frozen (item-check route 409s) until the same endpoint clears
   the rejection (`{ rejected: false }`), which recomputes the department's
   status from its already-checked items as if nothing had happened.

If you need to change any of this logic, it lives in exactly one place. Don't
duplicate it in the frontend beyond the UX hints in `ChecklistPanel.jsx` — the
frontend checks there are cosmetic; the backend is the source of truth.

## What's on a clearance request

Besides the per-department checklist snapshot, `ClearanceRequest` stores why
the employee is leaving (`reason`: `resignation` / `new_job` / `retirement` —
"retirement" is Egypt's mandatory age-60 policy, referred to as "المعاش") and
their `lastWorkingDay`. Both are required at submission
(`POST /requests`, validated there) and come from the employee's own form —
NOT the department, which still always comes from the (mock) AD login. These,
plus `createdAt` (free from Mongoose `timestamps`), are shown to every
reviewer/admin who opens the request, not just the employee.

## Roles

- `employee`: submits their own request, views their own status.
- `reviewer`: tied to one `departmentKey`, checks off items for THAT department only.
- `admin`: sees everything, can check off any department (useful for testing and
  for whoever runs the initial pilot).

Both managers and regular staff in a department log in as the SAME role
(`reviewer`) for now — there's no manager-vs-staff distinction inside a
department yet. If EGAS wants a "manager approves after staff checks" step
inside a single department, that's a schema change to `Department.checklistItems`
(e.g. a `requiresManagerSignoff` flag) — flag it in PROJECT_STATUS.md rather than
guessing at the design.

## Commands

Backend:
```
cd backend
npm install
cp .env.example .env     # then point MONGO_URI at your local MongoDB
npm run seed              # wipes and reseeds departments + mock AD users
npm run dev                # nodemon, http://localhost:4000
node scripts/smoke-test.js # exercises the full flow against a running server
```

Frontend:
```
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api to localhost:4000
```

Default seeded logins (password `Passw0rd!` for all): `sara.employee` (employee),
`admin` (admin), `it.reviewer` (IT), and `<departmentKey>.reviewer` for every other
department (see `backend/src/seed/users.data.js` for the full list).

## Working conventions for this repo

- Keep the backend and frontend fully decoupled — the frontend only ever talks to
  the backend over `/api/*` HTTP endpoints, never imports backend code directly.
- New department-specific logic belongs in data (`departments.data.js`), not in
  new branches of `if (deptKey === "...")` in route handlers. If you find yourself
  writing that, stop and reconsider the schema instead.
- Every non-trivial change: update `PROJECT_STATUS.md` (move the task, note
  blockers) so the whole team can see progress without asking in the group chat.
- Arabic is the default UI language (`localStorage` lang defaults to `"ar"` in
  `frontend/src/i18n.js`). Always add both `label_ar`/`label_en` (or `_ar`/`_en`)
  when adding user-facing strings — never ship Arabic-only or English-only text.
- Commit small. This is a from-scratch team; large multi-feature commits are hard
  to review and hard to unwind if something's wrong.
