> **Superseded 2026-08-03.** This was the task split for the original
> "employee submits, IT signs last, 9-item checklist" design. The whole
> workflow was rebuilt to match the real paper process (File Management
> files requests, tier-based parallel signing, re-auth + evidence-photo
> signatures, no more admin role) -- see `CLAUDE.md` and `PROJECT_STATUS.md`
> for the current design. Kept below as a historical record of the first
> sprint, not as current guidance.

# Task Split — Fri → Mon Demo Sprint

**Updated: team is now 3 people — Nader (lead), Ziad, Jana.** Habiba and
Khaled's former tasks have been folded into Ziad's and Jana's lists below.
With fewer hands, every task is tagged **[Core]** (must be done for Monday) or
**[Stretch]** (do it only after your Core tasks are finished and merged — cut
it without guilt if you run out of time).

The repo already has a working vertical slice: mock-AD login, employee submits
a request, IT reviewer checks off the 9-step ordered checklist, other
departments have a placeholder checklist, Arabic/English toggle. All of that
is confirmed working end to end against a shared MongoDB Atlas cluster. This
sprint is about hardening it into something that survives a live demo and
doesn't visibly break.

Read `CLAUDE.md` and `README.md` in the repo root before picking anything up
here if you haven't already.

**Nader only, before/while others work (do this first if not already done):**
1. Confirm the GitHub repo is pushed and Ziad + Jana are added as
   collaborators (GitHub Settings &rarr; Collaborators).
2. Confirm both have the shared `MONGO_URI` and `JWT_SECRET` values (sent
   privately, not in the group chat) for their own `backend/.env`.
3. Confirm Atlas Network Access has `0.0.0.0/0` added so both their laptops
   can connect regardless of network.

**Everyone, baseline setup (skip anything already done):**
- Node.js 18+, Git, a GitHub account, VS Code. *Search "install Node.js LTS
  [your OS]"*, *"install git [your OS]"*.
- Clone the repo, follow the Quick Start in `README.md`, confirm both servers
  run and you can log in as `sara.employee` / `Passw0rd!`.
- Read `CLAUDE.md` &rarr; `README.md` &rarr; your section below, in that order.

If you get stuck, ask Claude Code directly with the exact error message
rather than guessing. Don't sit stuck alone more than ~20-30 minutes before
messaging the other two — with only 3 people, one person stuck silently for
hours is a much bigger hit to the timeline than it was with 5.

---

## Nader (lead — spans both backend and frontend)

You're the floater: fix the one known bug, get the app somewhere that isn't
just your laptop, then review and rehearse.

1. **[Core] Fix the admin department-picker bug. — DONE, see `PROJECT_STATUS.md`.**
   File: `frontend/src/pages/ReviewerDashboard.jsx`.
   Bug: `const myDept = selected?.departments.find((d) => d.departmentKey === user.departmentKey || user.role === "admin")`
   always matches the *first* department in the array for an admin (since
   `user.role === "admin"` is true on every element, `.find()` stops at index
   0), so an admin account can currently only ever act on the Security
   department no matter what they intend.
   Fix shape: add a second piece of state (e.g. `selectedDeptKey`). For a
   `reviewer`, the active department stays `user.departmentKey` as before
   (unchanged, not broken). For an `admin`, add a screen between "request
   list" and "checklist" that lists `selected.departments` (name + status
   badge, reuse the `.badge` CSS classes already used in
   `EmployeeDashboard.jsx`) with a button per department that sets
   `selectedDeptKey`. Update `myDept`'s lookup and the `deptKey` used in
   `handleCheck` (currently also broken on the same logic) to use this new
   "active department" concept instead.
   Test: log in as `admin`, open Sara's request, confirm you see a picker
   listing all 13 departments instead of jumping straight into Security's
   checklist.
   *Tech: React `useState` for a second selection variable, conditional
   rendering blocks (same pattern already used for `!selected` vs
   `selected && myDept` in that file).*

2. **[Core] Deploy the app somewhere other than a laptop.** With only 3
   people and one demo slot, you do not want Monday's demo to depend on
   whoever's machine is plugged in having no wifi issues. Deploy the backend
   to Render (free tier) and the frontend to Vercel or Netlify (free tier).
   Both need the same environment variables you have locally (`MONGO_URI`,
   `JWT_SECRET`, `JWT_EXPIRES_IN` for the backend) set in their dashboards,
   not committed to git. The frontend's `vite.config.js` proxy only works in
   local dev — once deployed, `frontend/src/api/client.js`'s `baseURL: "/api"`
   needs to point at the deployed backend's real URL instead (an environment
   variable is the clean way to do this — ask Claude Code to help wire up
   `import.meta.env.VITE_API_URL` if you're not sure how).
   *Tech to look up: "deploy Node Express app to Render," "deploy Vite React
   app to Vercel," "Vite environment variables."*

3. **[Core] Review Ziad's and Jana's pull requests** before merging, and keep
   `PROJECT_STATUS.md` current as things move — with 3 people, an out-of-date
   status file causes real confusion fast.

4. **[Core] Own the Monday demo script** — exact logins, exact clicks, in an
   order that shows the IT-must-be-last rule actually blocking a too-early
   check. Rehearse it once end to end Monday morning on the deployed version,
   not localhost.
   *Seeded demo account `mohamed.retiring` (see `PROJECT_STATUS.md`) already
   has all 12 non-IT departments completed, so the script can jump straight to
   `it.reviewer` checking off IT's 9 items and showing the final gate — no
   need to click through every other department live.*

---

## Ziad (backend)

Habiba's old tasks are folded in as Core since a live demo crashing on bad
input looks bad; her old testing task is trimmed to be fast.

1. **[Core] Add input validation** to `backend/src/routes/auth.routes.js` and
   `backend/src/routes/request.routes.js` — reject empty/garbage input (empty
   username, missing `checked` boolean, etc.) with a clear 400 error instead
   of letting it fall through to a 500 crash. Look at how
   `request.routes.js` already does this for the `checked` field
   (`if (typeof checked !== "boolean")`) and apply the same pattern anywhere
   it's missing.
   *Tech: "Express request validation," "Node.js try/catch with
   async/await."*

2. **[Core] Smoke-test the deployed backend once Nader has it live.** Run
   through: submitting two requests as the same employee (second should be
   rejected, 409), checking an IT item out of order (400), a reviewer
   checking a department that isn't theirs (403). Use `backend/scripts/smoke-test.js`
   as a starting point (`BASE_URL=<deployed-url>/api node scripts/smoke-test.js`)
   or Postman if you want to click through it manually. Log anything broken
   in `PROJECT_STATUS.md` under a "Known bugs" heading.
   *Tech: "Postman basics" or just reuse the existing smoke-test script,
   "HTTP status codes 400 401 403 409."*

3. **[Stretch] Build `GET /api/requests/:id/history`** — surface who-checked-
   what-when in a clean shape for the frontend. The data already exists on
   every checklist item (`checkedBy`, `checkedAt` in
   `backend/src/models/ClearanceRequest.js`); you're exposing it, not storing
   anything new. This is a nice demo flourish (shows real audit trail) but
   not required for the core flow to work — do it only after items 1 and 2
   are done and merged.
   *Tech: "Mongoose subdocuments," reading `ClearanceRequest.js`.*

4. **[Stretch, cut first if short on time] Admin department-edit endpoints**
   — `GET /api/departments/:key` and `PATCH /api/departments/:key`
   (admin-only, edits `checklistItems`) so real per-department requirements
   can be added later without touching code. Lowest priority of your four
   tasks — if Monday's close and this isn't started, skip it; Nader can edit
   seed data directly in the meantime.

---

## Jana (frontend)

Khaled's old tasks are folded in — trimmed to what actually matters for a
live demo looking solid.

1. **[Core] Confirmation dialog on IT's final checklist item.** In
   `frontend/src/components/ChecklistPanel.jsx`, before checking "Delete from
   Active Directory" (the last IT item), show a confirmation
   (`window.confirm(...)` is fine, doesn't need to be fancy) so it feels
   deliberately irreversible — this is the dramatic moment of the demo, it
   should not feel like an accidental checkbox click.
   *Tech: "window.confirm in React," reading `ChecklistPanel.jsx`'s existing
   `onCheck` prop.*

2. **[Core] Add loading and error states everywhere a fetch happens.** Right
   now some pages just render blank if a request fails or is slow — bad look
   mid-demo if Atlas has a hiccup. Look at how `EmployeeDashboard.jsx`
   already handles `request === undefined` (shows a loading message) and
   replicate that pattern in `ReviewerDashboard.jsx` and anywhere else a
   `client.get`/`client.post`/`client.patch` call happens without one.
   *Tech: "React conditional rendering," "try/catch around async calls in
   React," "axios error handling."*

3. **[Core] Full Arabic/English + RTL pass.** Toggle between languages on
   every screen (login, employee dashboard, reviewer dashboard, and Nader's
   new admin department-picker once he's done with it) and fix any layout
   that visually breaks in RTL. Add any missing strings to BOTH
   `frontend/src/locales/en.json` and `ar.json` together — never add one
   without the other, or the missing language will just show the raw
   translation key on screen.
   *Tech: "CSS RTL / dir attribute," "react-i18next useTranslation hook,"
   skim `frontend/src/i18n.js`.*

4. **[Stretch] Request submission form. — DONE, see `PROJECT_STATUS.md`.**
   `EmployeeDashboard.jsx`'s submit button is now a real form: reason for
   leaving (resignation / new job / retirement) and a suggested last working
   day, both required and validated server-side in
   `backend/src/routes/request.routes.js`. (Shipped as `reason` +
   `lastWorkingDay` on `ClearanceRequest` rather than reusing `User.employeeMeta`,
   since those fields describe the request, not the employee record.)
   *Tech: "React controlled form inputs," "HTML date input."*

---

## Sprint shape (adjust as needed, but don't skip step 1)

- **Today:** if you haven't already, get the app running locally — nobody
  starts their individual tasks until `npm run dev` works for both frontend
  and backend, and Nader confirms repo access + secrets are sent.
- **Next day:** work your Core tasks first, in a branch, committing often,
  opening a PR even if small. Only move to Stretch tasks once your Core
  tasks are done and merged.
- **Day after:** merge everything into one branch together, fix integration
  issues as a group (budget real time for this — it always takes longer than
  expected with 3 people juggling both layers).
- **Demo day (Mon), early:** Nader runs the demo script once, end to end, on
  the deployed version, before presenting.
