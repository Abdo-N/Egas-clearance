/**
 * Manual end-to-end smoke test for the clearance flow.
 *
 * Requires a running local MongoDB and the server already started
 * (npm run seed && npm run dev in another terminal), then:
 *   node scripts/smoke-test.js
 *
 * It exercises the exact rules from the paper process:
 *   - IT's checklist items must be checked in order.
 *   - IT's final "Delete from Active Directory" item is blocked until every
 *     other department has completed their own checklist.
 */
const BASE = process.env.BASE_URL || "http://localhost:4000/api";

async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (res.status !== 200) throw new Error(`login failed for ${username}: ${JSON.stringify(json)}`);
  return json.token;
}

async function patchItem(requestId, deptKey, itemKey, token, checked = true) {
  return fetch(`${BASE}/requests/${requestId}/departments/${deptKey}/items/${itemKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ checked }),
  });
}

async function main() {
  console.log("--- health check ---");
  console.log(await (await fetch(`${BASE}/health`)).json());

  const empToken = await login("sara.employee", "Passw0rd!");
  const adminToken = await login("admin", "Passw0rd!");
  const itToken = await login("it.reviewer", "Passw0rd!");

  console.log("--- submitting clearance request ---");
  const reqRes = await fetch(`${BASE}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ reason: "resignation", lastWorkingDay: "2026-12-31" }),
  });
  const request = await reqRes.json();
  if (reqRes.status !== 201) throw new Error(JSON.stringify(request));
  console.log(`created request ${request._id} with ${request.departments.length} departments`);

  console.log("--- IT: out-of-order check should be rejected (400) ---");
  const outOfOrder = await patchItem(request._id, "it", "ad_deletion", itToken);
  console.log(outOfOrder.status, await outOfOrder.json());
  if (outOfOrder.status !== 400) throw new Error("expected 400 for out-of-order check");

  console.log("--- IT: checking items 1-8 in order ---");
  for (const key of ["phone", "pc", "mobile_line", "data_line", "account", "mailbox", "sap_services", "sap_account"]) {
    const r = await patchItem(request._id, "it", key, itToken);
    if (r.status !== 200) throw new Error(`failed to check ${key}: ${JSON.stringify(await r.json())}`);
  }
  console.log("done");

  console.log("--- IT: final AD deletion before others finish should be rejected (409) ---");
  const tooEarly = await patchItem(request._id, "it", "ad_deletion", itToken);
  console.log(tooEarly.status, await tooEarly.json());
  if (tooEarly.status !== 409) throw new Error("expected 409 for final-gate violation");

  console.log("--- clearing every other department (as admin) ---");
  const otherKeys = request.departments.map((d) => d.departmentKey).filter((k) => k !== "it");
  for (const deptKey of otherKeys) {
    const r = await patchItem(request._id, deptKey, "clearance", adminToken);
    if (r.status !== 200) throw new Error(`failed to clear ${deptKey}: ${JSON.stringify(await r.json())}`);
  }
  console.log("done");

  console.log("--- IT: final AD deletion now should succeed (200) ---");
  const final = await patchItem(request._id, "it", "ad_deletion", itToken);
  const finalJson = await final.json();
  console.log(final.status, "overall request status:", finalJson.status);
  if (final.status !== 200 || finalJson.status !== "completed") {
    throw new Error("expected request to be fully completed");
  }

  console.log("\nALL CHECKS PASSED");
}

main().catch((err) => {
  console.error("SMOKE TEST FAILED:", err.message);
  process.exit(1);
});
