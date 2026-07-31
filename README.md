# EGAS Employee Clearance System

Digital replacement for EGAS's paper "إخلاء طرف" (clearance) process. An employee
retiring or resigning submits one request online; each of the 13 departments
checks off their own requirements for that employee instead of signing a paper
form. The IT department's checklist always finishes last, since its last step
deletes the employee from Active Directory.

This repo is an early prototype (built for a Monday demo) — a login + submit
request + check off the IT department's checklist vertical slice, wired up
generically enough that the other 15 departments can be filled in with real
requirements later without rearchitecting anything.

## Quick start

Requires Node.js 18+ and a local MongoDB (or a free MongoDB Atlas cluster —
either works, just point `MONGO_URI` at it).

```bash
# Backend
cd backend
npm install
cp .env.example .env        # edit MONGO_URI if not using local MongoDB
npm run seed                # creates departments + mock AD users
npm run dev                 # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173. Everyone's password is `Passw0rd!`.

| Username | Role | Notes |
|---|---|---|
| `sara.employee` | employee | submits a clearance request |
| `admin` | admin | can check off any department, for testing |
| `it.reviewer` | reviewer | IT department, the 9-step ordered checklist |
| `<departmentKey>.reviewer` | reviewer | every other seeded department (see `backend/src/seed/users.data.js`) |

To confirm the whole flow works end to end (order enforcement + IT-must-be-last
gate) after `npm run seed` + `npm run dev`:
```bash
cd backend
node scripts/smoke-test.js
```

## How the clearance workflow works

1. Employee logs in and submits a request. The request snapshots every
   department's current checklist template at that moment.
2. Every department except IT can check off their items in any order relative
   to other departments (in parallel), but items WITHIN a department must be
   checked in sequence.
3. IT's checklist is fixed and ordered: Phone → PC → Mobile Line → Data Line →
   Account → Mailbox → SAP Services → SAP Account → Delete from Active Directory.
4. The very last IT item ("Delete from Active Directory") is blocked by the
   backend until every other department has fully completed their own checklist.
   Once it's checked, the request is marked `completed` and the employee's mock
   AD record is flagged `archivedFromAD: true`.

## Known gaps / things that still need real-world input

These are intentional placeholders, not bugs — see `PROJECT_STATUS.md` for the
live tracker.

- **Only IT's checklist is real.** Every other department currently has one
  generic placeholder checklist item ("No outstanding items"). Someone needs to
  sit with each department and write down their actual requirements, then update
  `departments.data.js` — no other code changes needed.
- **No real Active Directory/LDAP integration yet.** Login checks a mock `User`
  collection in MongoDB that mimics AD. See "mock Active Directory" in
  `CLAUDE.md` for exactly what changes when real LDAP access is available.
- **"Temporary database" design for AD-deleted employees is a placeholder.**
  Right now we just flag the same Mongo record `archivedFromAD: true` instead of
  actually deleting anything. The brief mentions a more careful design is needed
  here (so an employee can still log in and see their completed clearance after
  IT "deletes" them) — that's an open design task, not yet solved.
- **No manager-vs-staff distinction within a department.** Everyone who reviews
  for a department currently has the same `reviewer` role. If a department needs
  a "staff checks, then manager approves" step, that's a schema change to
  `checklistItems`, not yet designed.

## Tech stack

Backend: Node.js, Express, MongoDB/Mongoose, JWT (jsonwebtoken), bcryptjs.
Frontend: React, Vite, React Router, react-i18next (Arabic default, RTL support).
