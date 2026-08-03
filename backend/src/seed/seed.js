require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const Department = require("../models/Department");
const User = require("../models/User");
const Employee = require("../models/Employee");
const ClearanceRequest = require("../models/ClearanceRequest");
const departments = require("./departments.data");
const users = require("./users.data");
const employees = require("./employees.data");

const UPLOAD_ROOT = path.resolve(__dirname, "../../uploads");
const DUMMY_SIGNATURES_DIR = path.resolve(__dirname, "../../assets/dummy-signatures");
const DUMMY_SIGNATURE_FILES = ["dummy-signature-1.png", "dummy-signature-2.png", "dummy-signature-3.png"];

// Picks one of the 3 sample signature images (see backend/assets/dummy-signatures/)
// at random and copies it into this request's upload folder, so the demo
// request looks like a real partially-signed clearance instead of leaving
// every "completed" department without any evidence to composite onto the PDF.
function planDummySignature(requestId, deptKey) {
  const source = DUMMY_SIGNATURE_FILES[Math.floor(Math.random() * DUMMY_SIGNATURE_FILES.length)];
  const filename = `${deptKey}-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
  const destDir = path.join(UPLOAD_ROOT, String(requestId));
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(path.join(DUMMY_SIGNATURES_DIR, source), path.join(destDir, filename));
  return {
    fileUrl: `${requestId}/${filename}`,
    mimeType: "image/png",
    originalName: source,
  };
}

async function run() {
  await connectDB();

  console.log("[seed] clearing existing Department / User / Employee / ClearanceRequest data...");
  await Promise.all([
    Department.deleteMany({}),
    User.deleteMany({}),
    Employee.deleteMany({}),
    ClearanceRequest.deleteMany({}),
  ]);

  console.log(`[seed] inserting ${departments.length} departments...`);
  await Department.insertMany(departments);

  console.log(`[seed] inserting ${users.length} mock AD staff accounts...`);
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, passwordHash });
  }

  console.log(`[seed] inserting ${employees.length} mock AD employee directory records...`);
  await Employee.insertMany(employees);

  console.log("[seed] creating demo clearance requests...");
  const allDepartments = await Department.find().sort({ order: 1 });
  // Signed an hour "after" submission -- comfortably later than whatever
  // exact timestamp Mongoose ends up stamping the request's own createdAt
  // with, so dashboard turnaround-time math never sees a negative duration.
  const now = new Date(Date.now() + 60 * 60 * 1000);

  // Sign as the department's real reviewer1 seed account (not a synthetic
  // "seed-script" identity) so demo requests' signer names/IDs and the
  // composited PDF look like an actual in-progress clearance.
  function reviewerOneOf(deptKey) {
    return users.find((u) => u.departmentKey === deptKey && u.userID.endsWith(".reviewer1"));
  }
  function itemOwnerOf(itemKey) {
    return users.find((u) => u.departmentKey === "it" && u.assignedItemKey === itemKey);
  }

  // Builds a request's `departments[]` snapshot with each group of
  // departments signed or left pending per the given flags, reused across
  // every demo request below so each one only has to say *how far along*
  // it should be.
  function buildDepartments(requestId, { signNonItTier1, signIt, signTier2 }) {
    return allDepartments.map((d) => {
      const isIt = d.key === "it";
      const shouldSign = isIt ? signIt : d.tier === 1 ? signNonItTier1 : signTier2;
      const signer = shouldSign && !isIt ? reviewerOneOf(d.key) : null;
      return {
        departmentKey: d.key,
        name_ar: d.name_ar,
        name_en: d.name_en,
        order: d.order,
        tier: d.tier,
        hasOversightDashboard: d.hasOversightDashboard,
        signatureMode: d.signatureMode,
        status: shouldSign ? "completed" : "pending",
        signedByUserID: signer?.userID ?? null,
        signedByFullName: signer?.fullName ?? null,
        signedAt: shouldSign && !isIt ? now : null,
        evidence: shouldSign && !isIt ? planDummySignature(requestId, d.key) : null,
        items: isIt
          ? d.checklistItems.map((i) => {
              if (!signIt) {
                return { key: i.key, label_ar: i.label_ar, label_en: i.label_en, assignedItemKey: i.key, status: "pending" };
              }
              const owner = itemOwnerOf(i.key);
              return {
                key: i.key,
                label_ar: i.label_ar,
                label_en: i.label_en,
                assignedItemKey: i.key,
                status: "completed",
                signedByUserID: owner?.userID ?? null,
                signedByFullName: owner?.fullName ?? null,
                signedAt: now,
                evidence: planDummySignature(requestId, `it-${i.key}`),
              };
            })
          : [],
      };
    });
  }

  // Demo 1: only the last two rows on the paper form (Wages, Finance --
  // tier 2) are left, so this can demo the oversight unlock + signing them
  // without clicking through the other 11 departments live.
  const wagesFinanceEmployee = employees.find((e) => e.employeeNumber === "10567");
  const wagesFinanceRequestId = new mongoose.Types.ObjectId();
  await ClearanceRequest.create({
    _id: wagesFinanceRequestId,
    employeeNumber: wagesFinanceEmployee.employeeNumber,
    employeeFullName: wagesFinanceEmployee.fullName,
    employeeJobTitle: wagesFinanceEmployee.jobTitle,
    employeeDepartment_ar: wagesFinanceEmployee.department_ar,
    employeeDepartment_en: wagesFinanceEmployee.department_en,
    reason: "retirement",
    lastWorkingDay: wagesFinanceEmployee.retirementDate,
    createdByUserID: "file.management",
    departments: buildDepartments(wagesFinanceRequestId, { signNonItTier1: true, signIt: true, signTier2: false }),
  });

  // Demo 2: every one of the 13 departments has already signed -- the only
  // step left is IT's manual "Delete from Active Directory" action.
  const readyForAdEmployee = employees.find((e) => e.employeeNumber === "10932");
  const readyForAdRequestId = new mongoose.Types.ObjectId();
  await ClearanceRequest.create({
    _id: readyForAdRequestId,
    employeeNumber: readyForAdEmployee.employeeNumber,
    employeeFullName: readyForAdEmployee.fullName,
    employeeJobTitle: readyForAdEmployee.jobTitle,
    employeeDepartment_ar: readyForAdEmployee.department_ar,
    employeeDepartment_en: readyForAdEmployee.department_en,
    reason: "resignation",
    lastWorkingDay: new Date("2026-12-31"),
    createdByUserID: "file.management",
    // NOT "completed" -- per the general rule, all 13 departments signing
    // isn't enough on its own; the request stays "in_progress" until IT
    // actually deletes the employee from Active Directory (archive-ad is
    // the only route that can flip this), which is exactly the step this
    // demo request is set up to walk through.
    departments: buildDepartments(readyForAdRequestId, { signNonItTier1: true, signIt: true, signTier2: true }),
  });

  console.log("[seed] done. Sample logins (all passwords are Passw0rd!):");
  console.log("  File Management -> file.management");
  console.log("  Tier-1 reviewer -> security.reviewer1 / security.reviewer2 (every department has '<key>.reviewer1/2')");
  console.log("  IT reviewers    -> it.mobile_data_lines.reviewer, it.phone.reviewer, it.pc_account_mailbox.reviewer,");
  console.log("                     it.sap_service.reviewer, it.sap_account_removal.reviewer");
  console.log("  Oversight (tier 2) -> wages.reviewer1 / finance.reviewer1 (now unlocked, both still pending)");
  console.log("  Demo request 1: employee #10567 (Mohamed Farouk) -- only Wages & Finance left, ready to demo the oversight unlock + AD deletion.");
  console.log("  Demo request 2: employee #10932 (Khaled Mostafa) -- all 13 departments signed, ready to demo IT's 'Delete from Active Directory' as the only remaining step (log in as any it.<item>.reviewer).");

  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
