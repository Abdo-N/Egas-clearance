/**
 * Manual end-to-end smoke test for the revamped clearance flow.
 *
 * Requires a running local MongoDB and the server already started
 * (npm run seed && npm run dev in another terminal), then:
 *   node scripts/smoke-test.js
 *
 * Exercises the real rules:
 *   - File Management (not the employee) files the request.
 *   - Tier-1 departments (1-11, incl. IT) sign in parallel, no gating.
 *   - Tier-2 departments (wages, finance) are locked until every tier-1
 *     department has signed.
 *   - Non-IT departments: single signature, any one of 2 reviewers.
 *   - IT: 5 itemized signatures, each only signable by its assigned reviewer.
 *   - "Delete from Active Directory" only works once all 13 have signed, and
 *     only for IT. General rule: signing alone never marks a request
 *     "completed" -- only archive-ad does, even after all 13 sign.
 *   - A plain reviewer's request list/detail is redacted to their own
 *     department only.
 */
const BASE = process.env.BASE_URL || "http://localhost:4000/api";

const NON_IT_TIER1_KEYS = [
  "illicit_gains", "library", "security", "legal", "medical",
  "healthcare_accounts", "hr_development", "public_relations", "warehouses", "transport",
];
const IT_ITEM_KEYS = ["mobile_data_lines", "phone", "pc_account_mailbox", "sap_service", "sap_account_removal"];

async function login(userID, password = "Passw0rd!") {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userID, password }),
  });
  const json = await res.json();
  if (res.status !== 200) throw new Error(`login failed for ${userID}: ${JSON.stringify(json)}`);
  return json.token;
}

function fakeEvidence() {
  const form = new FormData();
  form.append("password", "Passw0rd!");
  form.append("evidence", new Blob([Buffer.from("fake-signature-bytes")], { type: "image/png" }), "signature.png");
  return form;
}

async function signSingle(requestId, deptKey, token) {
  return fetch(`${BASE}/requests/${requestId}/departments/${deptKey}/sign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fakeEvidence(),
  });
}

async function signItem(requestId, deptKey, itemKey, token) {
  return fetch(`${BASE}/requests/${requestId}/departments/${deptKey}/items/${itemKey}/sign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fakeEvidence(),
  });
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function main() {
  console.log("--- health check ---");
  console.log(await (await fetch(`${BASE}/health`)).json());

  const fileMgmtToken = await login("file.management");

  console.log("--- File Management: file a new clearance request ---");
  const reqRes = await fetch(`${BASE}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${fileMgmtToken}` },
    body: JSON.stringify({ employeeNumber: "10891", reason: "resignation", lastWorkingDay: "2026-12-31" }),
  });
  const request = await reqRes.json();
  if (reqRes.status !== 201) throw new Error(JSON.stringify(request));
  const requestId = request._id;
  console.log(`created request ${requestId} for employee #${request.employeeNumber}`);
  assert(request.departments.length === 13, "expected 13 snapshotted departments");

  console.log("--- tier 2 (wages) is locked before tier 1 has finished (409) ---");
  const wagesToken = await login("wages.reviewer1");
  const tooEarly = await signSingle(requestId, "wages", wagesToken);
  console.log(tooEarly.status, await tooEarly.json());
  assert(tooEarly.status === 409, "expected wages to be locked behind tier 1");

  console.log("--- signing every non-IT tier-1 department (any one of its 2 reviewers) ---");
  for (const deptKey of NON_IT_TIER1_KEYS) {
    const token = await login(`${deptKey}.reviewer1`);
    const res = await signSingle(requestId, deptKey, token);
    if (res.status !== 200) throw new Error(`failed to sign ${deptKey}: ${JSON.stringify(await res.json())}`);
  }
  console.log("done");

  console.log("--- IT: wrong reviewer signing someone else's item is rejected (403) ---");
  const phoneToken = await login("it.phone.reviewer");
  const wrongItem = await signItem(requestId, "it", "sap_service", phoneToken);
  console.log(wrongItem.status, await wrongItem.json());
  assert(wrongItem.status === 403, "expected 403 for signing another reviewer's assigned item");

  console.log("--- IT: each of the 5 reviewers signs their own item ---");
  for (const itemKey of IT_ITEM_KEYS) {
    const token = await login(`it.${itemKey}.reviewer`);
    const res = await signItem(requestId, "it", itemKey, token);
    if (res.status !== 200) throw new Error(`failed to sign IT item ${itemKey}: ${JSON.stringify(await res.json())}`);
  }
  console.log("done");

  console.log("--- tier 2 (wages, finance) now unlocked ---");
  const wagesSign = await signSingle(requestId, "wages", wagesToken);
  if (wagesSign.status !== 200) throw new Error(`failed to sign wages: ${JSON.stringify(await wagesSign.json())}`);
  const financeToken = await login("finance.reviewer1");
  const financeSign = await signSingle(requestId, "finance", financeToken);
  const financeJson = await financeSign.json();
  if (financeSign.status !== 200) throw new Error(`failed to sign finance: ${JSON.stringify(financeJson)}`);

  console.log("--- all 13 signed, but NOT yet 'completed' -- AD deletion is the real final step ---");
  const finalGet = await fetch(`${BASE}/requests/${requestId}`, { headers: { Authorization: `Bearer ${fileMgmtToken}` } });
  const finalRequest = await finalGet.json();
  assert(finalRequest.status === "in_progress", `expected 'in_progress' until AD deletion, got '${finalRequest.status}'`);
  assert(
    finalRequest.departments.every((d) => !("signedByUserID" in d) && !("evidence" in d)),
    "expected File Management's view to omit signer identity and evidence"
  );

  console.log("--- IT sees readyForAdDeletion=true without seeing other departments' detail ---");
  const itPreArchiveGet = await fetch(`${BASE}/requests/${requestId}`, { headers: { Authorization: `Bearer ${phoneToken}` } });
  const itPreArchiveJson = await itPreArchiveGet.json();
  assert(itPreArchiveJson.readyForAdDeletion === true, "expected readyForAdDeletion=true once all 13 have signed");
  assert(itPreArchiveJson.departments.length === 1, "IT should still only see its own department");

  console.log("--- File Management cannot download the PDF yet -- not 'completed' until AD deletion (403) ---");
  const pdfTooEarly = await fetch(`${BASE}/requests/${requestId}/pdf`, { headers: { Authorization: `Bearer ${fileMgmtToken}` } });
  assert(pdfTooEarly.status === 403, "expected 403 fetching PDF before AD deletion");

  console.log("--- a non-IT reviewer cannot delete from Active Directory (403) ---");
  const nonItArchive = await fetch(`${BASE}/requests/${requestId}/archive-ad`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${financeToken}` },
    body: JSON.stringify({ password: "Passw0rd!" }),
  });
  assert(nonItArchive.status === 403, "expected 403 for non-IT archive-ad");

  console.log("--- IT deletes the employee from Active Directory ---");
  const itArchiveToken = await login("it.phone.reviewer");
  const archiveRes = await fetch(`${BASE}/requests/${requestId}/archive-ad`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${itArchiveToken}` },
    body: JSON.stringify({ password: "Passw0rd!" }),
  });
  const archiveJson = await archiveRes.json();
  if (archiveRes.status !== 200) throw new Error(`archive-ad failed: ${JSON.stringify(archiveJson)}`);
  assert(archiveJson.archivedFromAD === true, "expected archivedFromAD to be true");
  assert(archiveJson.status === "completed", `expected 'completed' now that AD deletion happened, got '${archiveJson.status}'`);

  console.log("--- deleting from AD twice is rejected (409) ---");
  const archiveAgain = await fetch(`${BASE}/requests/${requestId}/archive-ad`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${itArchiveToken}` },
    body: JSON.stringify({ password: "Passw0rd!" }),
  });
  assert(archiveAgain.status === 409, "expected 409 for double archive-ad");

  console.log("--- a plain reviewer's list/detail is redacted to their own department only ---");
  const securityToken = await login("security.reviewer1");
  const securityDetail = await fetch(`${BASE}/requests/${requestId}`, { headers: { Authorization: `Bearer ${securityToken}` } });
  const securityJson = await securityDetail.json();
  assert(securityJson.departments.length === 1, "expected exactly one department in a plain reviewer's view");
  assert(securityJson.departments[0].departmentKey === "security", "expected only the reviewer's own department");

  console.log("--- oversight reviewer (finance) can fetch the composited PDF ---");
  const pdfAsOversight = await fetch(`${BASE}/requests/${requestId}/pdf`, { headers: { Authorization: `Bearer ${financeToken}` } });
  assert(pdfAsOversight.status === 200, "expected 200 fetching PDF as oversight reviewer");
  assert(pdfAsOversight.headers.get("content-type") === "application/pdf", "expected application/pdf content type");

  console.log("--- File Management can fetch the PDF now that their own request is completed ---");
  const pdfAsFileMgmt = await fetch(`${BASE}/requests/${requestId}/pdf`, { headers: { Authorization: `Bearer ${fileMgmtToken}` } });
  assert(pdfAsFileMgmt.status === 200, "expected 200 fetching PDF as File Management on their own completed request");

  console.log("--- a plain (non-oversight) reviewer cannot fetch the PDF (403) ---");
  const pdfAsPlain = await fetch(`${BASE}/requests/${requestId}/pdf`, { headers: { Authorization: `Bearer ${securityToken}` } });
  assert(pdfAsPlain.status === 403, "expected 403 fetching PDF as a plain reviewer");

  console.log("\nALL CHECKS PASSED");
}

main().catch((err) => {
  console.error("SMOKE TEST FAILED:", err.message);
  process.exit(1);
});
