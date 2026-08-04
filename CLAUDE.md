# EGAS Employee Clearance System — CLAUDE.md

Read this before doing anything else in this repo. If you're a team member new to
fullstack dev, read PROJECT_STATUS.md too — it tells you exactly what's built
and what's still open. TASKS.md is a historical sprint plan from before the
2026-08-03 revamp described below — treat it as an archive, not current guidance.

## What this project is

Digitizing EGAS's paper-based employee clearance ("إخلاء طرف") process. When an
employee retires or resigns, **File Management (إدارة الملفات)** files a
clearance request on their behalf — the employee never logs in. Each of the 13
departments on the paper form then reviews and signs off on that employee.
Departments 1–11 sign in parallel; the last two (Wages, Financial Affairs) are
gated behind all of the first 11 and get a full oversight dashboard. IT is
department #10 and, once every one of the 13 has signed, gets a manual
"Delete from Active Directory" action. General rule: an employee is never
actually cleared just because every department signed off — deleting them
from AD is the real final step, not a formality after the fact, so the
request only reads as "completed" once IT has done that too.

The real department list and paper-form order are in
`backend/assets/clearance-form-template.pdf` (a digital copy of the "إخلاء
طرف" form, currently a native Word-exported PDF rather than a scan — see
"Compositing signatures onto the paper form" below) and mirrored in
`backend/src/seed/departments.data.js`. This file only covers how the
codebase is organized.

## Stack

- Backend: Node.js + Express + MongoDB (Mongoose). JWT auth. `multer` for
  evidence-photo/PDF uploads, `pdf-lib` for compositing signatures onto the
  paper-form template, `pngjs`/`jpeg-js` for stripping evidence photos' white
  backgrounds before compositing.
- Frontend: React + Vite + React Router + react-i18next (Arabic/English, RTL support).
- Everything is JavaScript (no TypeScript) to keep the learning curve low for a
  team that is mostly new to fullstack dev.

## Repo layout

```
egas-clearance/
  backend/
    assets/
      clearance-form-template.pdf   the paper-form template -- the compositing target
    src/
      config/db.js          Mongo connection
      models/                Mongoose schemas: User, Employee, Department, ClearanceRequest
      routes/                auth, department, employee, request routes
      middleware/            JWT auth + role guards
      services/clearancePdf.js   composites signature evidence onto the template PDF
      utils/asyncHandler.js  wraps async route handlers so a thrown error
                              can't crash the whole process (Express 4 doesn't
                              catch rejected promises on its own)
      seed/                  seed script + seed data (departments, staff
                              accounts, employee directory)
    uploads/                 gitignored -- uploaded signature evidence, one
                              subfolder per request ID
    scripts/smoke-test.js   manual end-to-end test against a running server
  frontend/
    src/
      api/client.js          axios instance, attaches JWT automatically
      context/AuthContext.jsx
      pages/                 Login, FileManagementDashboard, ReviewerDashboard
      components/            SignaturePanel, RequestOversightGrid, EmployeePicker,
                              DepartmentIcon, LanguageToggle
      utils/                 formatDate.js, leavingReason.js (small shared helpers)
      assets/                EGAS logo + login background
      demoAccounts.js        TEMPORARY: login-page "demo accounts" card data,
                              mirrors backend/src/seed/*.data.js -- delete once
                              real accounts exist
      locales/               en.json, ar.json for i18next
      i18n.js
  PROJECT_STATUS.md   living status tracker — update this as you finish tasks
  TASKS.md            historical sprint plan, superseded by this revamp
```

## The most important design decision: mock Active Directory

We do NOT have real LDAP/Active Directory access yet, and there are two
separate mock-AD collections:

- `backend/src/models/User.js` — **staff logins**: File Management and
  reviewers (13 departments, 2+ accounts each so any one of them can sign,
  except IT which has exactly 5, one per itemized checklist item). Only
  `backend/src/routes/auth.routes.js` is allowed to know this is a mock —
  every other file just receives a JWT with `{ userID, fullName, role,
  departmentKey, assignedItemKey, hasOversightDashboard }` and doesn't care
  where it came from.
- `backend/src/models/Employee.js` — **the people being cleared**. No auth
  fields; they never log in. This is what File Management searches
  (`GET /api/employees/search`) when filing a new request. `employeeNumber`,
  `department_ar`/`department_en`, `jobTitle` here mirror what a real AD
  lookup will eventually provide (see point 9 of the original brief) — when
  real LDAP access shows up, this becomes a live lookup instead of a seeded
  collection, and `auth.routes.js`'s login handler swaps to an LDAP bind call.
  Do not leak "this is a mock" assumptions into other files.

Once a request is fully signed (`status: "completed"`), any of IT's 5
reviewers can trigger `POST /:id/archive-ad` (re-authenticates with their own
password, no file) which sets `archivedFromAD: true` on both the request and
the `Employee` record. This is a placeholder for the "temporary database"
design mentioned in the brief — a real design pass on that is still needed,
see PROJECT_STATUS.md.

## The most important business rules

The real 13 departments, in the paper form's row order (see
`backend/src/seed/departments.data.js` for exact keys):

1. الكسب غير مشروع, 2. أ.ع المكتبة, 3. الأمن, 4. الشئون القانونية,
5. أ.ع الشئون الطبية والعلاجية, 6. أ.ع حسابات الرعاية الصحية,
7. تنمية الموارد البشرية, 8. العلاقات العامة وخدمات الإجتماعية, 9. المخازن,
10. نظم المعلومات والاتصالات (IT), 11. خدمات النقل, 12. الأجور والاستحقاقات
(oversight), 13. الشئون المالية (oversight).

Everything below is enforced in `backend/src/routes/request.routes.js`, and
ONLY there:

1. **Tier-based locking, not a strict 1-through-13 chain.** `Department.tier`
   (1 for departments 1–11 incl. IT, 2 for Wages/Finance) drives
   `isDepartmentUnlocked()` (a small helper at the top of the file): a
   department is locked until every department with a LOWER tier has
   `status: "completed"`. Tier-1 departments have nothing below them, so they
   sign in parallel — this is a deliberate change (2026-08-03) from the
   original fully-sequential design. Add more tiers later by editing seed
   data only, nothing here.
2. **Two signature modes, config-driven per department
   (`Department.signatureMode`), never hardcoded by key:**
   - `"single"` (12 of 13 departments): any ONE of that department's 2+
     reviewer accounts can sign it — one action, no checklist items.
   - `"itemized"` (IT only): 5 checklist items, each permanently owned by one
     specific reviewer account (`User.assignedItemKey` must match the item's
     `key`). The department completes once all 5 items are signed.
3. **"Signing" is re-authentication + evidence upload, not a checkbox.** Both
   sign routes (`POST .../departments/:deptKey/sign` and
   `POST .../departments/:deptKey/items/:itemKey/sign`) require the
   currently-logged-in reviewer's own password (bcrypt-verified again, same
   identity as the JWT — not a kiosk/shared-login model) plus a
   `multipart/form-data` photo or PDF of the physical signature/stamp,
   captured fresh per request via `multer` (`backend/uploads/<requestId>/...`,
   gitignored). There is no separate "finalize" step and no reject/hold flow
   — a department is either unsigned or signed. Either state is reversible
   though: `POST .../departments/:deptKey/reopen` (and the itemized
   `.../items/:itemKey/reopen`) resets a signed department/item back to
   unsigned, clearing its evidence — callable either by File Management (on
   a request they filed) or by the signing department's own reviewers
   undoing their own mistake (any of a single-mode department's 2+
   accounts, or for an itemized item, only the one reviewer it's assigned
   to — same ownership rule as signing itself). Blocked once the request is
   archived from AD (point 5) — that really is final.
4. **Visibility is need-to-know, enforced server-side, not just hidden in the
   UI:**
   - A plain reviewer's `GET /requests` / `GET /requests/:id` response is
     redacted to ONLY their own department's entry (`redactToOwnDepartment()`)
     — they never see whether other departments have signed. This is every
     request ever unlocked for their department, not just currently-pending
     ones (a real dashboard, not a bare to-do queue), with a `needsAction`
     flag on that entry so the frontend can bucket "waiting on you" vs
     "already signed" without re-deriving the rule.
   - Wages/Finance reviewers (`Department.hasOversightDashboard`, embedded in
     the JWT at login so route logic never hardcodes those two keys) get the
     full, un-redacted request — every department's status, signer, and
     evidence — via `canSeeFull()`.
   - File Management gets neither of the above global views. They can only
     see requests THEY created (`createdByUserID`), and a high-level summary
     (`summarizeForFileManagement()`: department status only, never signer
     identity or timestamps). The one deliberate exception is evidence
     itself: a department's uploaded photo/file is included the moment that
     department's own `status` is `"completed"`, same as oversight sees it —
     not gated on File Management's own approval below. This is what lets
     File Management actually spot an illegible signature and reopen it (see
     the `.../reopen` and `.../items/:itemKey/reopen` routes — password
     re-auth, resets that department/item back to `"pending"`, clears its
     evidence, and revokes `fileManagementApproved` if it had already been
     given) before approving AD deletion, not just after. They can also
     preview/download the composited PDF for their own request once every
     department has signed (`allDepartmentsSigned()`, same condition as
     below — not gated on `status === "completed"`, which would make it
     unreachable until after IT's own final step).
5. **"Delete from Active Directory" is the real final step, not a formality
   after the fact — `request.status` only becomes `"completed"` once IT has
   done it.** This is a general rule, not IT-specific busywork: an employee
   being "fully signed" and an employee being "cleared" are different things.
   `allDepartmentsSigned()` (every one of the 13 `status === "completed"`) is
   necessary but not sufficient — `computeOverallStatus()` also requires
   `archivedFromAD === true`. Concretely: the sign routes can only ever
   recompute `status` back to `"in_progress"`; `POST /:id/archive-ad` is the
   ONLY route that can set it to `"completed"`, and it flips
   `archivedFromAD`/`completedAt` at the same time. Getting there also
   requires a second, independent gate: File Management must explicitly
   `POST /:id/approve-ad-deletion` (their own password re-auth) once
   `allDepartmentsSigned()` — this is the human checkpoint where they're
   expected to have already reviewed every department's evidence (see point
   4) and reopened anything illegible. `archive-ad` itself checks
   `allDepartmentsSigned() && fileManagementApproved`, not
   `status === "completed"` — the latter would be circular, since `status`
   can't reach `"completed"` any other way. Only IT reviewers
   (`departmentKey === "it"`) can call archive-ad — independent of IT's own
   position (#10) in the order — and any of its 5 can trigger it. Since
   `status` alone can't tell IT "all 13 have signed and File Management
   approved" without IT also seeing every other department's detail, every
   reviewer-facing response carries `readyForAdDeletion` (both conditions
   true) and `awaitingFileManagementApproval` (signed but not yet approved) —
   computed from the full departments array before redaction — so IT's
   "Delete from Active Directory" button knows when to appear without ever
   being told which specific other departments are done.

If you need to change any of this logic, it lives in exactly one place. Don't
duplicate it in the frontend beyond the UX hints in `SignaturePanel.jsx`
(showing/hiding the sign form, the "your item" tag) — the frontend checks
there are cosmetic; the backend is the source of truth.

## Compositing signatures onto the paper form

`backend/src/services/clearancePdf.js` loads
`backend/assets/clearance-form-template.pdf` and, for each department that has
signed, draws its uploaded evidence photo into that department's row
(hand-calibrated coordinates — one table-top offset + one row height, keyed by
`ClearanceRequest.departments[].order` — see the comment at the top of that
file for how to re-derive both if this template is ever replaced again;
deriving every row from a per-row eyeball estimate drifted about half a row
off by row 13 on the original scanned version, so don't go back to that
approach) plus the signer's name and date. Both image evidence (jpg/png) and
PDF evidence get embedded — PDF is actually the common case in practice, more
so than a phone photo — and both go through the same pipeline so they blend
in the same way: decoded to raw RGBA pixels, then near-white background
pixels are made transparent (`stripNearWhiteBackground()`, soft-edged near
the threshold so ink strokes don't get a jagged cutout) — a real signature
(photographed on paper, or a scanned/exported PDF page) has a white/off-white
background, and without this it would composite as a visible opaque
rectangle stamped over the printed form instead of blending in. Images
decode directly (`pngjs`/`jpeg-js`); a PDF's first page is rasterized first
(`pdfjs-dist` + `@napi-rs/canvas`, `rasterizePdfPage()` in
`clearancePdf.js`) so it can go through the exact same treatment rather than
being embedded as an untouched vector block. Before the white-strip step,
`cropToContent()` also trims the decoded pixels down to the bounding box of
non-near-white content (small margin kept) — without this, evidence that's a
whole scanned/exported page with the actual ink occupying only a small
portion of it (an A4 PDF export being the common shape here) would scale
down to an illegible sliver once the page's own empty margin has to shrink
along with it to fit the signature cell; cropping first means only the
signature itself gets sized to fill the cell, regardless of how much blank
page surrounds it in the original upload. webp evidence (accepted on
upload, see the multer `fileFilter` in `request.routes.js`) is the one gap
left — still stored/servable via `GET /requests/:id/evidence/...`, just not
composited, since the decode step only handles png/jpeg/pdf.
`GET /requests/:id/pdf` generates this on demand — a partial preview while
in progress, the final artifact once `status === "completed"`.

## What's on a clearance request

Besides the per-department signature snapshot, `ClearanceRequest` stores why
the employee is leaving (`reason`: `resignation` / `new_job` / `retirement` —
"retirement" is Egypt's mandatory age-60 policy, referred to as "المعاش") and
their `lastWorkingDay`. Both are entered by File Management at creation time
(`POST /requests`, validated there) — NOT by the employee, who never
interacts with the system. It also snapshots `employeeNumber`,
`employeeFullName`, `employeeJobTitle`, and `employeeDepartment_ar/en` from
the `Employee` directory record at that moment (same snapshot-at-submission
pattern as the department list, so it doesn't drift if the employee's
directory record changes later).

## Roles

- `file_management`: files requests on an employee's behalf (`POST /requests`,
  looking the employee up via `GET /employees/search`), sees a high-level
  status summary of requests they filed, downloads the final signed PDF once
  complete. Cannot see per-department signer/evidence detail.
- `reviewer`: tied to one `departmentKey`. Any reviewer can sign their
  department (or, for IT, their one assigned item) once it's unlocked.
  Reviewers whose department has `hasOversightDashboard: true` (Wages,
  Finance) additionally get the full 13-department status grid for every
  request, not just their own.

There is no super-admin role. Account provisioning (who's a reviewer for
which department, which 5 people are IT's itemized reviewers) is seed-data
only for now (`backend/src/seed/users.data.js`) — conceptually this
responsibility belongs to real AD once it's connected, not to an in-app admin
screen.

## Commands

Backend:
```
cd backend
npm install
cp .env.example .env     # then point MONGO_URI at your local MongoDB
npm run seed              # wipes and reseeds departments + staff + employee directory
npm run dev                # nodemon, http://localhost:4000
node scripts/smoke-test.js # exercises the full flow against a running server
```

Frontend:
```
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api to localhost:4000
```

Default seeded logins (password `Passw0rd!` for all): `file.management` (File
Management), `<departmentKey>.reviewer1`/`reviewer2` for every department
except IT, and `it.<itemKey>.reviewer` for each of IT's 5 itemized reviewers
— see `backend/src/seed/users.data.js` for the full list.

## Working conventions for this repo

- Keep the backend and frontend fully decoupled — the frontend only ever talks to
  the backend over `/api/*` HTTP endpoints, never imports backend code directly.
- New department-specific logic belongs in data (`departments.data.js` — e.g.
  `tier`, `signatureMode`, `hasOversightDashboard`), not in new branches of
  `if (deptKey === "...")` in route handlers. If you find yourself writing
  that, stop and reconsider the schema instead. (The one intentional
  exception is the `archive-ad` route, which checks `departmentKey === "it"`
  directly — that's inherent to IT's identity as the AD-deletion actor, not
  a checklist template detail.)
- Wrap async route handlers in `asyncHandler` (`backend/src/utils/asyncHandler.js`).
  Express 4 does not catch rejected promises from async handlers on its own —
  an uncaught error (bad input, a corrupt uploaded file, a DB hiccup) becomes
  an unhandled rejection and crashes the whole process, not just that request.
- Every non-trivial change: update `PROJECT_STATUS.md` (move the task, note
  blockers) so the whole team can see progress without asking in the group chat.
- Arabic is the default UI language (`localStorage` lang defaults to `"ar"` in
  `frontend/src/i18n.js`). Always add both `label_ar`/`label_en` (or `_ar`/`_en`)
  when adding user-facing strings — never ship Arabic-only or English-only text.
- Commit small. This is a from-scratch team; large multi-feature commits are hard
  to review and hard to unwind if something's wrong.
