const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { DatabaseSync } = require("node:sqlite");
const { mkdtempSync, unlinkSync, rmdirSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { createSupabaseStore, createSqliteStore } = require("./cardio-garmin-store.cjs");
const createAccounts = require("./supabase-accounts.cjs");
const handleGarmin = require("./cardio-garmin.cjs");
process.env.FITNESS_GARMIN_COOKIE_KEY = "ab".repeat(32);

test("local account connections survive a database restart and use revision checks", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fitness-garmin-persistence-"));
  const file = join(directory, "connections.sqlite");
  let db = new DatabaseSync(file);
  try {
    db.exec("CREATE TABLE garmin_connections (account_id TEXT PRIMARY KEY, encrypted_key TEXT, revision INTEGER NOT NULL DEFAULT 1)");
    const original = await createSqliteStore(db, "owner-a").write("encrypted-fixture", null);
    db.close();
    db = new DatabaseSync(file);
    const store = createSqliteStore(db, "owner-a");
    assert.deepEqual(await store.get(), original);
    assert.equal(await createSqliteStore(db, "owner-b").get(), null);
    const updated = await store.write(null, original.revision);
    assert.equal(updated.revision, original.revision + 1);
    await assert.rejects(store.write("old-ciphertext", original.revision), { status: 409 });
    assert.equal((await store.get()).encryptedKey, null);
  } finally { db.close(); unlinkSync(file); rmdirSync(directory); }
});

test("Supabase adapter uses the session owner and token, allows only encrypted data writes, and detects stale changes", async () => {
  const calls = [];
  const responses = [[{ encrypted_key: "ciphertext", revision: 4 }], [{ encrypted_key: null, revision: 5 }], []];
  const store = createSupabaseStore(async (path, options) => {
    calls.push({ path, options }); return { ok: true, body: responses.shift() };
  }, { user: { id: "owner-a" }, access_token: "session-token-a" });
  assert.deepEqual(await store.get(), { encryptedKey: "ciphertext", revision: 4 });
  assert.deepEqual(await store.write(null, 4), { encryptedKey: null, revision: 5 });
  await assert.rejects(store.write("new-ciphertext", 4), { status: 409 });
  for (const call of calls) {
    assert.equal(new URL(call.path, "https://db.example").searchParams.get("owner_id"), "eq.owner-a");
    assert.equal(call.options.token, "session-token-a");
  }
  assert.deepEqual(calls[1].options.data, { encrypted_key: null });
  assert.equal(calls[1].options.method, "PATCH");
  assert.equal(new URL(calls[1].path, "https://db.example").searchParams.get("revision"), "eq.4");
});

test("migration insert never overwrites an existing disconnect record", async () => {
  const store = createSupabaseStore(async (path, options) => {
    assert.equal(options.method, "POST");
    assert.equal(options.prefer, "resolution=ignore-duplicates,return=representation");
    assert.equal(new URL(path, "https://db.example").searchParams.get("on_conflict"), "owner_id");
    assert.deepEqual(options.data, { encrypted_key: "ciphertext" });
    return { ok: true, body: [] };
  }, { user: { id: "owner-a" }, access_token: "owner-token" });
  await assert.rejects(store.write("ciphertext", null), { status: 409 });
});

test("missing database setup, expired auth and upstream errors surface safely", async () => {
  for (const [status, code, expected] of [[404, "PGRST205", 503], [401, "42501", 503], [401, "PGRST301", 401], [500, "internal", 502]]) {
    const store = createSupabaseStore(async () => ({ ok: false, status, body: { code, message: "must-not-leak-secret" } }),
      { user: { id: "owner-a" }, access_token: "secret-token" });
    await assert.rejects(store.get(), error => error.status === expected && !error.message.includes("secret"));
  }
});

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; },
    writeHead(status) { this.status = status; }, end(body) { this.body = JSON.parse(body); } };
}

test("real Supabase session flow restores account keys on a different device and keeps refreshed tokens server-side", async (t) => {
  const users = { alice: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "alice@example.test" }, bob: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", email: "bob@example.test" } };
  const rows = new Map();
  const calls = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://db.example");
    const reply = (status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
    try {
      assert.equal(req.headers.apikey, "sb_publishable_fixture");
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const data = chunks.length ? JSON.parse(Buffer.concat(chunks)) : null;
      const token = req.headers.authorization?.replace(/^Bearer /, "");
      if (url.pathname === "/auth/v1/token") {
        assert.equal(data.refresh_token, "refresh-alice");
        return reply(200, { user: users.alice, access_token: "alice", refresh_token: "refresh-next" });
      }
      const user = users[token];
      if (url.pathname === "/auth/v1/user") return reply(user ? 200 : 401, user ?? {});
      assert.equal(url.pathname, "/rest/v1/fitness_garmin_connections");
      assert.ok(user);
      calls.push({ token, method: req.method, data });
      if (req.method !== "POST") assert.equal(url.searchParams.get("owner_id"), "eq." + user.id);
      let row = rows.get(user.id);
      if (req.method === "POST") {
        assert.deepEqual(Object.keys(data), ["encrypted_key"]);
        assert.match(req.headers.prefer, /ignore-duplicates/);
        if (row) return reply(201, []);
        row = { encrypted_key: data.encrypted_key, revision: 1 }; rows.set(user.id, row);
      } else if (req.method === "PATCH") {
        assert.deepEqual(Object.keys(data), ["encrypted_key"]);
        if (!row || url.searchParams.get("revision") !== "eq." + row.revision) return reply(200, []);
        row = { encrypted_key: data.encrypted_key, revision: row.revision + 1 }; rows.set(user.id, row);
      }
      return reply(200, row ? [row] : []);
    } catch { reply(500, { code: "fixture_failure" }); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const accounts = createAccounts("http://127.0.0.1:" + server.address().port, "sb_publishable_fixture");
  const req = (token, body, method = "POST") => ({ method, headers: {
    cookie: "fitness_cloud_access=" + token, "x-fitness-account": users[token]?.id ?? users.alice.id, "content-type": "application/json",
  }, body });
  const garmin = async () => ({ ok: true, text: async () => "garmin.jwt.token", json: async () => [] });
  const saved = response();
  await handleGarmin(req("alice", { apiKey: "personal-garmin-secret" }), saved, "https://fitness.example", accounts, garmin);
  assert.equal(saved.status, 200);
  assert.doesNotMatch(rows.get(users.alice.id).encrypted_key, /personal-garmin-secret/);
  const anotherDevice = response();
  const refreshed = req("expired-alice", undefined, "GET");
  refreshed.headers.cookie += "; fitness_cloud_refresh=refresh-alice";
  await handleGarmin(refreshed, anotherDevice, "https://fitness.example", accounts);
  assert.deepEqual(anotherDevice.body, { connected: true });
  assert.ok(anotherDevice.headers["Set-Cookie"].some(value => value.startsWith("fitness_cloud_access=alice;")));
  const ownerB = response();
  await handleGarmin(req("bob", undefined, "GET"), ownerB, "https://fitness.example", accounts);
  assert.deepEqual(ownerB.body, { connected: false });
  const mismatch = req("bob", undefined, "GET"); mismatch.headers["x-fitness-account"] = users.alice.id;
  const conflict = response(); const before = calls.length;
  await handleGarmin(mismatch, conflict, "https://fitness.example", accounts);
  assert.equal(conflict.status, 409); assert.equal(calls.length, before);
  const sync = response();
  await handleGarmin(req("alice", {}), sync, "https://fitness.example", accounts, garmin);
  assert.equal(sync.status, 200);
  const logout = response();
  await accounts(req("alice", undefined, "GET"), logout, "/api/session", (_res, status, data) => { logout.status = status; logout.body = data; }, "https://fitness.example");
  assert.deepEqual(Object.keys(logout.body).sort(), ["authMode", "user"]);
  for (const result of [saved, anotherDevice, ownerB, sync, logout]) {
    assert.doesNotMatch(JSON.stringify(result.body), /personal-garmin-secret|garmin.jwt.token|encrypted|access_token|refresh_token/);
  }
});
