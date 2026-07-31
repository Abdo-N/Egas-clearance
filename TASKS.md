# Task Split — Fri → Mon Demo Sprint

Team: Nader (lead), Habiba, Ziad, Khaled, Jana.
Split: Nader + Habiba + Ziad on backend. Khaled + Jana on frontend.

The repo already has a working vertical slice: mock-AD login, employee submits
a request, IT reviewer checks off the 9-step ordered checklist, other
departments have a placeholder checklist, Arabic/English toggle. Your job for
this sprint is to get it running on your own machine, understand it, and push
it from "prototype" to "demo-ready." Read `CLAUDE.md` and `README.md` in the
repo root before picking anything up here.

**Everyone, before anything else (Friday):**
1. Install Node.js 18+ and either local MongoDB Community Server or a free
   MongoDB Atlas cluster. *Look up: "install MongoDB Community Edition"* or
   *"MongoDB Atlas free tier setup."*
   Note: If you have Claude Code installed, you can literally ask it "help me
   install MongoDB / Node.js on my machine" and it will walk you through it.
2. Clone the repo, follow the Quick Start in `README.md`, get both servers
   running and log in as `sara.employee` / `Passw0rd!`. If this doesn't work,
   post in the group chat before doing anything else — a broken local setup
   blocks everything downstream.
3. Skim `backend/src/models/*.js` and `frontend/src/pages/*.jsx` once, even if
   they're not your area, so you know roughly what exists.

If you get stuck at any point, ask Claude Code directly — paste the error and
say what you were trying to do. That's faster than guessing.

---

## Backend (Nader, Habiba, Ziad)

### Nader (team lead)
- Confirm the 3 missing department names (16 total, only 13 are in
  `backend/src/seed/departments.data.js`) and add them.
  *Tech to look up: none new — this is just editing a JS array, same shape as
  the existing entries.*
- Review Habiba's and Ziad's work before it's merged; keep `PROJECT_STATUS.md`
  current as tasks move.
- Get a shared MongoDB Atlas cluster set up so the whole team (and the Monday
  demo) hits the same database instead of 5 separate local databases.
  *Look up: "MongoDB Atlas free tier," "MongoDB Atlas network access / IP
  allowlist" (needed so everyone's laptop can connect).*
- Own the Monday demo script: which login, which clicks, in what order, to
  show the IT-must-be-last rule actually blocking a too-early check.

### Habiba
- Test every backend endpoint by hand with Postman (or `curl`) and write down
  what you find in `PROJECT_STATUS.md` under "Known bugs." Specifically try:
  submitting two requests in a row as the same employee (should be rejected),
  checking an IT item out of order (should be rejected), a reviewer trying to
  check off a department that isn't theirs (should be rejected).
  *Tech to look up: "Postman basics," "HTTP status codes 400 401 403 409,"
  reading `backend/src/routes/request.routes.js` alongside your tests so you
  know what SHOULD happen.*
- Add basic input validation to `auth.routes.js` and `request.routes.js` where
  it's missing (e.g. reject empty/garbage input with a clear error message
  instead of a 500).
  *Tech to look up: "Express request validation," "Node.js try/catch with
  async/await."*

### Ziad
- Build a small `GET /api/requests/:id/history` (or extend the existing
  detail response) that surfaces who-checked-what-when in a clean shape for
  the frontend — the data already exists on each item (`checkedBy`,
  `checkedAt` in `ClearanceRequest.js`), you're exposing it, not storing new
  data.
  *Tech to look up: "Mongoose subdocuments," "Array.prototype.flatMap /
  sort in JS," reading `backend/src/models/ClearanceRequest.js`.*
- Add a `GET /api/departments/:key` (single department) and a rough
  `PATCH /api/departments/:key` (admin-only, edits `checklistItems`) so that
  once real per-department requirements arrive, someone can update them
  without touching code or redeploying.
  *Tech to look up: "Express route params," "Mongoose findOneAndUpdate,"
  re-read the "role" middleware in `backend/src/middleware/auth.middleware.js`
  to reuse `requireRole("admin")`.*

---

## Frontend (Khaled, Jana)

### Khaled
- Turn the "submit request" button on `EmployeeDashboard.jsx` into a small
  form (job title, retirement date) that POSTs those fields along with the
  request — the backend model already has `employeeMeta` on `User`, but the
  request-creation endpoint doesn't collect anything yet. Coordinate with
  Ziad/Habiba on the exact request body shape before changing the backend.
  *Tech to look up: "React controlled form inputs," "React useState," "HTML
  date input."*
- Add loading and error states everywhere a fetch happens (right now some
  pages just don't render if a request fails). Look at how
  `EmployeeDashboard.jsx` handles `request === undefined` and replicate that
  pattern where it's missing.
  *Tech to look up: "React conditional rendering," "try/catch around async
  calls in React," "axios error handling."*

### Jana
- Polish `ReviewerDashboard.jsx` and `ChecklistPanel.jsx`: add a confirmation
  dialog before checking the final IT item ("Delete from Active Directory") —
  it should feel deliberately irreversible in the UI even though the backend
  is the real guard.
  *Tech to look up: "React component props," "window.confirm vs a custom
  modal," reading `frontend/src/components/ChecklistPanel.jsx`.*
- Go through both languages end to end (toggle EN/AR on every page) and fix
  any layout that breaks in RTL. Add any missing strings to BOTH
  `frontend/src/locales/en.json` and `ar.json` — never add one without the
  other.
  *Tech to look up: "CSS RTL / dir attribute," "react-i18next useTranslation
  hook," skim `frontend/src/i18n.js`.*

---

## Sprint shape (adjust as needed, but don't skip step 1)

- **Fri (today):** everyone gets the app running locally. Nobody starts their
  individual task until `npm run dev` works for both frontend and backend.
- **Sat:** everyone works their task above in a branch, commits often, opens a
  PR even if small.
- **Sun:** merge everything into one branch, fix integration issues together
  (this always takes longer than expected — start Sunday morning, not night).
- **Mon (early):** Nader runs through the demo script once, end to end, on the
  shared Atlas database, before presenting.
