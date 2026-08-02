require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const Department = require("../models/Department");
const User = require("../models/User");
const ClearanceRequest = require("../models/ClearanceRequest");
const departments = require("./departments.data");
const users = require("./users.data");

async function run() {
  await connectDB();

  console.log("[seed] clearing existing Department / User / ClearanceRequest data...");
  await Promise.all([
    Department.deleteMany({}),
    User.deleteMany({}),
    ClearanceRequest.deleteMany({}),
  ]);

  console.log(`[seed] inserting ${departments.length} departments...`);
  await Department.insertMany(departments);

  console.log(`[seed] inserting ${users.length} mock AD users...`);
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, passwordHash });
  }

  console.log("[seed] creating demo clearance request (all departments cleared except IT)...");
  const allDepartments = await Department.find().sort({ order: 1 });
  const now = new Date();
  await ClearanceRequest.create({
    employeeUsername: "mohamed.retiring",
    employeeFullName: "Mohamed Farouk",
    employeeDepartment_ar: "الإدارة العامة للمخازن",
    employeeDepartment_en: "General Administration of Warehouses",
    reason: "retirement",
    lastWorkingDay: new Date("2026-08-15"), // matches employeeMeta.retirementDate in users.data.js
    departments: allDepartments.map((d) => ({
      departmentKey: d.key,
      name_ar: d.name_ar,
      name_en: d.name_en,
      isFinal: d.isFinal,
      status: d.isFinal ? "pending" : "completed",
      completedAt: d.isFinal ? null : now,
      items: d.checklistItems
        .sort((a, b) => a.order - b.order)
        .map((i) => ({
          key: i.key,
          label_ar: i.label_ar,
          label_en: i.label_en,
          order: i.order,
          checked: !d.isFinal,
          checkedBy: d.isFinal ? null : "seed-script",
          checkedAt: d.isFinal ? null : now,
        })),
    })),
  });

  console.log("[seed] done. Sample logins (all passwords are Passw0rd!):");
  console.log("  employee -> sara.employee (fresh, no request yet)");
  console.log("  employee -> mohamed.retiring (all departments done except IT -- demo the final gate)");
  console.log("  admin    -> admin");
  console.log("  IT rev.  -> it.reviewer");
  console.log("  (every other department has a '<key>.reviewer' account too)");

  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
