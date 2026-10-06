import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "../server/index.mjs";

const tempDirs = [];
const services = [];
const secret = "test-sync-secret-that-is-at-least-32-characters";

afterEach(async () => {
  while (services.length) await services.pop().close();
  while (tempDirs.length) fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
});

async function freePort() {
  const { createServer: createNetServer } = await import("node:net");
  const netServer = createNetServer();
  netServer.listen(0, "127.0.0.1");
  await new Promise((resolve) => netServer.once("listening", resolve));
  const port = netServer.address().port;
  await new Promise((resolve) => netServer.close(resolve));
  return port;
}

async function boot({ nodeId = "mobile-off", port = 0, syncSecret = "", syncPeers = "" } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "export-mobile-api-"));
  tempDirs.push(directory);
  const service = createServer({ host: "127.0.0.1", port, nodeId, syncSecret, syncPeers, dbPath: path.join(directory, "api.sqlite") });
  const started = await service.start();
  services.push(service);
  return { service, base: `http://127.0.0.1:${started.port}` };
}

async function waitForTracking(base, code) {
  for (let attempt = 0; attempt < 70; attempt += 1) {
    const response = await fetch(`${base}/api/v1/inquiries/${code}`);
    if (response.ok) return response.json();
    assert.equal(response.status, 404);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Inquiry ${code} did not replicate to ${base}`);
}

test("health, catalog, create and tracking match the shared API contract", async () => {
  const { base } = await boot();
  const health = await (await fetch(`${base}/health`)).json();
  assert.deepEqual(health, { status: "ok", nodeId: "mobile-off", syncEnabled: false });
  const catalog = await (await fetch(`${base}/api/v1/products`)).json();
  assert.deepEqual(catalog.data.map((product) => product.id), ["cocoa-beans", "green-coffee", "dried-spices"]);
  const createdResponse = await fetch(`${base}/api/v1/inquiries`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ customerName: "Demo Client", customerEmail: "demo@example.com", destinationCountry: "Japan", productId: "green-coffee", quantity: 100 }),
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.match(created.trackingCode, /^[A-F0-9]{24}$/);
  const tracked = await (await fetch(`${base}/api/v1/inquiries/${created.trackingCode}`)).json();
  assert.deepEqual(tracked.data, { status: "received", createdAt: created.createdAt, productName: "Kopi Arabika hijau" });
  assert.equal("customerEmail" in tracked.data, false);
});

test("sync is off by default and rejects unauthenticated or malformed peer records", async () => {
  const { base } = await boot();
  const disabled = await fetch(`${base}/api/v1/sync/inquiries`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(disabled.status, 503);

  const enabled = await boot({ nodeId: "mobile-auth", syncSecret: secret });
  const unauthorized = await fetch(`${enabled.base}/api/v1/sync/inquiries`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(unauthorized.status, 401);
  const malformed = await fetch(`${enabled.base}/api/v1/sync/inquiries`, {
    method: "POST", headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: "{}",
  });
  assert.equal(malformed.status, 400);
});

test("peer replication is idempotent and conflicts never overwrite stored data", async () => {
  const portA = await freePort();
  const portB = await freePort();
  const nodeA = await boot({ nodeId: "mobile-a", port: portA, syncSecret: secret, syncPeers: `mobile-b=http://127.0.0.1:${portB}` });
  const nodeB = await boot({ nodeId: "mobile-b", port: portB, syncSecret: secret, syncPeers: `mobile-a=http://127.0.0.1:${portA}` });
  const createdResponse = await fetch(`${nodeA.base}/api/v1/inquiries`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ customerName: "Peer Client", customerEmail: "peer@example.com", destinationCountry: "Japan", productId: "green-coffee", quantity: 12 }),
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  const replicated = await waitForTracking(nodeB.base, created.trackingCode);
  assert.equal(replicated.data.productName, "Kopi Arabika hijau");

  const record = nodeA.service.db.prepare(`SELECT id,tracking_code AS trackingCode,customer_name AS customerName,
    customer_email AS customerEmail,destination_country AS destinationCountry,product_id AS productId,
    quantity,unit,status,created_at AS createdAt,origin_node_id AS originNodeId FROM inquiries WHERE tracking_code=?`).get(created.trackingCode);
  assert(record);
  const send = (payload) => fetch(`${nodeB.base}/api/v1/sync/inquiries`, {
    method: "POST", headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify(payload),
  });
  const wrongUnit = await send({ ...record, id: "22222222-2222-4222-8222-222222222222", trackingCode: "B".repeat(24), unit: "piece" });
  assert.equal(wrongUnit.status, 404);
  const duplicate = await send(record);
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).result, "duplicate");

  const conflict = await send({ ...record, customerName: "Different Payload" });
  assert.equal(conflict.status, 409);
  const conflictBody = await conflict.json();
  assert.equal(conflictBody.error, "sync_conflict");
  assert.match(conflictBody.existingHash, /^[a-f0-9]{64}$/);
  assert.match(conflictBody.incomingHash, /^[a-f0-9]{64}$/);
  const collisionId = "33333333-3333-4333-8333-333333333333";
  const codeCollision = await send({ ...record, id: collisionId, customerName: "Tracking Code Collision" });
  assert.equal(codeCollision.status, 409);
  const collisionBody = await codeCollision.json();
  assert.equal(collisionBody.error, "sync_conflict");
  assert.match(collisionBody.existingHash, /^[a-f0-9]{64}$/);
  assert.match(collisionBody.incomingHash, /^[a-f0-9]{64}$/);
  const collision = nodeB.service.db.prepare("SELECT reason FROM sync_conflicts WHERE inquiry_id=?").get(collisionId);
  assert.equal(collision.reason, "tracking_code_collision");
  assert.equal(nodeB.service.db.prepare("SELECT customer_name FROM inquiries WHERE id=?").get(record.id).customer_name, "Peer Client");
  assert.equal(nodeB.service.db.prepare("SELECT COUNT(*) AS count FROM sync_conflicts WHERE inquiry_id=?").get(record.id).count, 1);
});
