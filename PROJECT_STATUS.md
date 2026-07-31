# Project Status

Last updated: 2026-07-31 (admin bug fix + demo prep, by Nader + Claude).
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
