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

  console.log("[seed] done. Sample logins (all passwords are Passw0rd!):");
  console.log("  employee -> sara.employee");
  console.log("  admin    -> admin");
  console.log("  IT rev.  -> it.reviewer");
  console.log("  (every other department has a '<key>.reviewer' account too)");

  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
