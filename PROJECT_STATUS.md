# Project Status

Last updated: 2026-08-02 (show employee's own department to reviewers, by Nader + Claude).
Update this file whenever a task moves — don't let it go stale.

## Done

- [x] Repo scaffolded: `backend/` (Express + Mongoose) and `frontend/` (React + Vite).
- [x] Mock Active Directory (`User` model) + JWT login (`/api/auth/login`).
- [x] `Department` model with configurable, ordered `checklistItems` per department.
- [x] `ClearanceRequest` model that snapshots department templates on submit.
- [x] Core workflow endpoint (`PATCH /requests/:id/departments/:deptKey/items/:itemKey`)
      enforcing: (1) items checked in order within a department, (2) a
      `isFinal` department's last item blocked until every other department
      is completed.
- [x] Seed data: all 13 departments (real names, confirmed complete), IT's
      exact 9-step ordered checklist, generic single-item placeholder for the
      other 12, 16 mock AD users (2 employees — `sara.employee` fresh,
      `mohamed.retiring` demo-ready with everything but IT done — 1 admin, 1
      reviewer per department).
- [x] Frontend: login, employee dashboard (submit + status grid), reviewer
      dashboard (pending list + checklist check-off), Arabic/English toggle
      with RTL, defaults to Arabic.
- [x] Verified: backend syntax/module loading, seed-data structural integrity
      (unique keys, clean ordering, exactly one `isFinal` department, full
      reviewer coverage), and frontend production build — all pass.
- [x] Shared MongoDB Atlas cluster set up and confirmed working — login,
      request submission, department check-off, and the IT order/final-gate
      rule all verified live end to end (both backend and frontend running
      against it).
- [x] **Fixed the admin department-picker bug** in `ReviewerDashboard.jsx`
      (was in "Known bugs" below). Admins now get a picker screen (department
      name + status badge, one button per department) between the request
      list and the checklist instead of always landing on Security. Reviewers
      are unaffected — their active department is still always
      `user.departmentKey`.
- [x] **Fixed MongoDB Atlas connection failures caused by local DNS.**
      `backend/src/server.js` now points Node's DNS resolver at `8.8.8.8` /
      `1.1.1.1` before connecting, because some local networks' default
      resolvers were dropping the TXT/SRV lookups `mongodb+srv://` needs
      (`queryTxt ETIMEOUT`) even though plain A-record lookups worked fine.
- [x] **Employee dashboard now shows a horizontal progress bar** instead of a
      status table — one step per department in order, turning green with a
      ✓ once that department's `status` is `completed`. Works in both LTR and
      RTL (Arabic renders it right-to-left automatically via the existing
      `dir` attribute).
- [x] **Added a demo-ready seeded account, `mohamed.retiring`.** Its request
      (created by `backend/src/seed/seed.js`) has all 12 non-IT departments
      already completed and IT untouched, so Monday's demo can go straight to
      showing the IT-must-be-last gate without clicking through every other
      department live. Log in as `it.reviewer` to work that request's
      checklist.
- [x] **Added a root-level `npm run dev`** (`concurrently`) that starts the
      backend and frontend together in one terminal with color-coded,
      prefixed output. Running each inside `backend/`/`frontend/` separately
      still works too.
- [x] **Redesigned the frontend visual style** to match EGAS's other internal
      app (the Travel Reimbursement System), reusing that org's real logo
      (`EGAS.png`) and login background image (both copied into
      `frontend/src/assets/`, same organization/owner, not a third party). New
      teal/green design system lives entirely in `frontend/src/styles.css`
      (CSS variables: `--green-700`, `--card`, `--line`, etc.) — login page,
      sticky app header with brand + logo, pill status badges, the progress
      stepper, checklist cards, and the language toggle (now a floating
      EN/عربي pill, bottom-corner, fixed on every page) were all restyled.
      Cairo (the existing bilingual variable font) was kept rather than
      switching to the other app's Inter/Tahoma split, since it already
      covers Arabic+Latin in one file. No backend, routing, or business-logic
      changes. Verified with `npm run build` (clean) and both dev servers
      running end to end against the shared Atlas cluster; could not get a
      headless browser screenshot in the sandbox environment used for this
      change (Playwright's Chromium download stalled), so a real visual
      pass in an actual browser is still worth doing before calling this done.
- [x] **Added a temporary "demo accounts" card to the login page**, listing
      all 15 seeded accounts (2 employees, admin, 13 department reviewers)
      with click-to-fill. Data lives in `frontend/src/demoAccounts.js`,
      explicitly commented as temporary and mirroring
      `backend/src/seed/users.data.js` / `departments.data.js` — delete that
      one file + its usage in `Login.jsx` once real accounts exist.
- [x] **Clearance requests now capture reason for leaving + suggested last
      working day.** `ClearanceRequest` gained `reason` (enum:
      `resignation` / `new_job` / `retirement` — "retirement" is Egypt's
      mandatory age-60 policy, "المعاش") and `lastWorkingDay` (`Date`).
      `POST /requests` validates both (reason must be one of the three
      values, date must parse and can't be in the past) — see
      `backend/src/models/ClearanceRequest.js` and
      `backend/src/routes/request.routes.js`. The employee's submission
      screen (`EmployeeDashboard.jsx`) is now a real form instead of a bare
      button. The request's `createdAt` (already free from Mongoose
      timestamps) plus reason/last-working-day are now surfaced to
      reviewers/admins via a `request-info` panel shown above every
      department's checklist and on the admin department-picker screen
      (`ReviewerDashboard.jsx`), and to the employee above their own
      progress grid. Did NOT add a department picker to the submission form
      — department already comes from the (mock) AD login, not user input,
      per the existing "mock AD" design.
- [x] **Redesigned the employee progress view as a non-scrolling icon grid.**
      Replaced the old horizontal-scroll step bar with a CSS grid
      (`.dept-progress-grid`) that wraps to fit all 13 departments on
      screen with no horizontal scrolling. Each department now shows one of
      three states purely from its position in the (already-ordered)
      department list: **done** (green, first N completed departments),
      **current** (gold/yellow, the first not-yet-completed one), **upcoming**
      (gray, everything after that). As of the sequential department gating
      change below, this now reflects real backend enforcement — "current"
      really is the one department currently actionable, not just a display
      simplification anymore (see below).
- [x] **Added a small hand-drawn icon per department** (shield for Security,
      scales for Legal, etc. — see `frontend/src/components/DepartmentIcon.jsx`,
      inline SVG, no new asset files/dependencies) shown on the employee
      progress grid, the admin department-picker list, and the reviewer's
      checklist header.
- [x] **A department can now reject a clearance request** instead of just
      leaving items unchecked, for when something's actually wrong (e.g. an
      outstanding item that can't be satisfied) rather than just "not done
      yet." `requestDepartmentSchema.status` gained a third value,
      `"rejected"`, plus `rejectedReason` / `rejectedBy` / `rejectedAt`.
      New endpoint: `PATCH /requests/:id/departments/:deptKey/reject`
      (`{ rejected: true, reason }` to reject — reason is required — or
      `{ rejected: false }` to clear it and let the department resume from
      whatever its checked items already imply). Rejecting a single
      department immediately flips the WHOLE request's `status` to
      `"rejected"` (`computeOverallStatus()` in `request.routes.js`,
      shared by both this route and the existing item-check route) — a
      rejection blocks clearance regardless of how far every other
      department got. While a department is rejected its checklist items
      are frozen (the item-check route now 409s) until the rejection is
      cleared, so `rejectedReason` can never go stale against a
      partially-changed checklist. Also fixed a related bug: the reviewer's
      "my pending requests" list (`GET /requests` as a reviewer) was
      filtering on `status: "pending"` only, which would have silently
      dropped a request the moment that reviewer rejected it — it now
      matches `pending` or `rejected` so the reviewer can still find it to
      clear later.
      On the frontend: `ChecklistPanel.jsx` gained a reject textarea +
      button (reviewer/admin) and a rejection banner (with a "clear
      rejection" button) when the department is already rejected; the
      employee's `EmployeeDashboard.jsx` shows a red alert box listing every
      rejected department and its reason, and that department's tile in the
      progress grid turns red with a ✕ instead of green/gold/gray.
- [x] **Departments now process strictly in order, not in parallel.** This is
      a deliberate change from the original "12 departments parallel + IT
      last" design (Nader's call, 2026-08-02) — a department is now locked
      until every department before it in the request's department order
      (i.e. `Department.order` at submission time, the same order the array
      was already snapshotted in) has fully completed. `isDepartmentUnlocked()`
      in `request.routes.js` is the one place this lives, replacing the old
      IT-only "last item blocked" special case — IT going last now falls out
      naturally from being last in the order, nothing IT-specific left in the
      code. A locked department: doesn't show up in that reviewer's `GET
      /requests` queue at all, 403s on direct `GET /requests/:id`, and 409s on
      both the item-check and reject routes. Admin's top-level request list is
      unaffected (admin still sees every request for oversight), but admin is
      NOT exempt from the lock when acting on a specific department — same as
      the old IT rule never exempted admin either. Frontend:
      `ChecklistPanel.jsx` shows a "waiting on earlier departments" banner and
      disables the whole checklist (not just checkboxes — also hides the
      reject form) when locked; admin's per-department picker list shows a
      "not started yet" badge for anything still locked. Updated
      `backend/scripts/smoke-test.js` to match (it used to check IT's items
      immediately after submission, which is no longer possible). Verified
      live end-to-end against the running dev servers: a locked department's
      queue is empty, direct ID access 403s, and it unlocks the moment the
      department before it completes.
- [x] **Checking every checklist item no longer auto-completes a department —
      finalizing now requires an explicit "Confirm" button.** New endpoint
      `PATCH /requests/:id/departments/:deptKey/finalize` is the only place
      `dept.status` becomes `"completed"` (400s if any item is still
      unchecked, 409s if rejected or still locked behind an earlier
      department — same guards as the item-check route). The item-check and
      reject/clear-rejection routes now only ever set a department back to
      `"pending"` (e.g. reopening one whose item got unchecked); they never
      set `"completed"` themselves anymore. The mock-AD archival side effect
      (`User.archivedFromAD`) moved from the item-check route to finalize,
      since that's the only route that can now actually complete a request.
      Frontend: `ChecklistPanel.jsx` shows a "Confirm department clearance"
      button once every item is checked, and a green "clearance confirmed"
      banner afterward instead of the checklist just silently locking in.
      Note IT's existing AD-deletion confirm dialog (on checking the very
      last item) is unrelated and unchanged — that still fires first, then
      the new finalize button is what actually completes IT's department.
      Updated `backend/scripts/smoke-test.js` (checking the last item no
      longer completes the request — finalize does) and verified the full
      flow live in-browser: check all 9 IT items (including the existing
      AD-deletion confirm), see the new "Confirm department clearance"
      button appear, click it, see the checklist freeze with a green
      confirmation banner.
- [x] **Reviewers now see the employee's actual EGAS department, not the
      clearance department they're already reviewing.** The request-info
      panel's "Department" field used to show `myDept.name_ar/en` — i.e.
      whichever of the 13 clearance departments' checklist you had open,
      which was redundant with the "Checklist for X" heading right below it.
      Added `User.employeeMeta.department_ar/en` (which EGAS department the
      employee actually works in — unrelated to the 13 clearance
      departments, though it can coincidentally share a name, e.g.
      `mohamed.retiring`'s is "General Administration of Warehouses", same
      as one of the clearance departments), threaded through the JWT payload
      (`auth.routes.js`) and snapshotted onto `ClearanceRequest` at
      submission (`employeeDepartment_ar/en`, same pattern as every other
      snapshotted field) so it doesn't drift if the employee's record
      changes later. `RequestInfo` now shows this on both the checklist view
      and admin's department-picker screen. Seeded both demo employees with
      real department names borrowed from `departments.data.js` (Sara →
      Financial Affairs, Mohamed → Warehouses). Verified live in-browser in
      both languages plus the admin picker screen.

## Team update

**Team is now 3 people: Nader (lead), Ziad, Jana.** Habiba and Khaled's
former tasks were redistributed, not dropped — see `TASKS.md` for the full,
detailed breakdown with Core vs. Stretch priority tags. Short version:
- Nader: admin department-picker bug is fixed — remaining: deploy backend +
  frontend, review PRs, own the demo script.
- Ziad: backend input validation, smoke-testing the deployed backend, and
  (stretch) the history endpoint + admin department-edit endpoints.
- Jana: confirmation dialog on IT's final step, loading/error states, full
  EN/AR + RTL pass, and (stretch) the request-submission form fields.

## Known bugs

None currently known — see "Done" above for the admin department-picker bug
that was fixed.

## Blocked / needs real-world input (not solvable by writing more code)

- [ ] **Real checklist requirements for 12 of 13 departments.** Only IT's
      checklist is real. Someone needs to talk to each department (or find
      existing documentation) and get their actual requirements. Until then,
      every non-IT department uses a single generic placeholder item so the
      workflow is demoable but not accurate.
- [ ] **Whether non-IT departments need internal ordering/approval chains.**
      The brief says this wasn't confirmed (e.g. "manager checks it, then a
      second manager checks it"). Current schema supports per-item ordering
      already (`checklistItems[].order`), so a sequential chain WITHIN a
      department is easy to add once confirmed — but a "manager approves
      after staff" step (two different people signing off on the SAME item)
      is a different schema shape and hasn't been designed.
- [ ] **Real Active Directory / LDAP access.** Currently 100% mocked. Nobody
      on the team has real EGAS LDAP credentials yet (per the July 31 kickoff
      conversation). See `CLAUDE.md` "mock Active Directory" for exactly what
      changes when this becomes available.
- [ ] **"Temporary database" design for post-AD-deletion employees.** The
      brief explicitly flags this as a later design decision. Current stopgap:
      flip `archivedFromAD: true` on the same Mongo record instead of actually
      deleting it, so login still works. Needs a real design pass once the
      team has bandwidth — is this still the right approach for production,
      or does EGAS actually want the record physically separated?
- [ ] **Hosting/deployment target.** Not yet decided — local dev only so far.

## Open questions for Nader to raise with whoever assigned this project

- Can any of the 15 non-IT departments' real requirements be gathered before
  the next milestone, even informally (a phone call, an old paper form)?
- Is there a real AD/LDAP test environment the team could get read-only access
  to, even a sandboxed one?
- Who ends up owning the "manager vs. staff sign-off" question — is that
  actually part of scope, or out of scope for v1?
