# Project Status

Last updated: 2026-07-31 (initial scaffold, by Nader + Claude).
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
- [x] Seed data: 13 of 16 departments (real names), IT's exact 9-step ordered
      checklist, generic single-item placeholder for the other 12, 15 mock AD
      users (1 employee, 1 admin, 1 reviewer per department).
- [x] Frontend: login, employee dashboard (submit + status grid), reviewer
      dashboard (pending list + checklist check-off), Arabic/English toggle
      with RTL, defaults to Arabic.
- [x] Verified: backend syntax/module loading, seed-data structural integrity
      (unique keys, clean ordering, exactly one `isFinal` department, full
      reviewer coverage), and frontend production build — all pass.
- [x] `scripts/smoke-test.js` written to exercise the full flow (order
      enforcement + final gate) against a real running server + MongoDB.
      **Not yet run against a real MongoDB** — the sandbox this was built in
      had no network access to download a MongoDB binary. Someone with
      MongoDB running locally should run this before Monday and confirm it
      passes; see "Needs verification" below.

## In progress / assigned

See `TASKS.md` for the full breakdown. Short version:
- Nader: missing 3 department names, shared MongoDB Atlas cluster, demo script.
- Habiba: manual endpoint testing + input validation.
- Ziad: history/audit endpoint, admin department-edit endpoint.
- Khaled: request-submission form (job title/retirement date), loading/error states.
- Jana: confirmation dialog on the final IT step, full EN/AR + RTL pass.

## Needs verification (do this first, Friday)

- [ ] Run `node backend/scripts/smoke-test.js` against a real local MongoDB +
      running server. It should print "ALL CHECKS PASSED." If it doesn't,
      that's the top priority to fix — everything else depends on this flow
      actually working.

## Blocked / needs real-world input (not solvable by writing more code)

- [ ] **3 missing department names.** EGAS has 16 departments; the brief only
      listed 13 clearly. Nader has the paper form — needs to add the other 3
      to `backend/src/seed/departments.data.js`.
- [ ] **Real checklist requirements for 15 of 16 departments.** Only IT's
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
