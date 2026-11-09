const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const handleGarmin = require("./cardio-garmin.cjs");
const { routeAccountRequest } = require("./account-http.cjs");
const { createSqliteStore } = require("./cardio-garmin-store.cjs");
const keys = require("./cardio-garmin-key.cjs");
process.env.FITNESS_GARMIN_COOKIE_KEY = "ab".repeat(32);
const db = new DatabaseSync(":memory:");
db.exec("CREATE TABLE garmin_connections (account_id TEXT PRIMARY KEY, encrypted_key TEXT, revision INTEGER NOT NULL DEFAULT 1)");
beforeEach(() => db.exec("DELETE FROM garmin_connections"));
const account = async (_req, res, _path, json) => json(res, 200, { user: { id: "account-a" } });
account.resolveSession = async () => ({ user: { id: "account-a" }, garmin: createSqliteStore(db, "account-a") });
const request = (body = { apiKey: "personal-key" }) => ({ method: "POST", headers: { "x-fitness-account": "account-a", "content-type": "application/json" }, body });
function response() {
  return { cookies: {}, setHeader(name, value) { this.cookies[name] = value; }, getHeader(name) { return this.cookies[name]; }, writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = JSON.parse(body); } };
}
const run = { activityId: 123, activityName: "Morgenlauf", startTimeLocal: "2026-11-07 08:30:00", distance: 5000, duration: 1500, averageHR: 145, calories: 350 };

test("fetches only running activities with server-side credentials and normalizes Garmin units", async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, text: async () => "  token.test\n", json: async () => [run, run, { activityId: 999 }] };
  };
  const res = response();
  await handleGarmin(request(), res, "http://localhost:3000", account, fetcher);
  assert.equal(res.status, 200);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(res.body.runs.length, 1);
  assert.equal(res.body.runs[0].distance, 5000);
  assert.equal(res.body.runs[0].duration, 1500);
  assert.equal(res.body.runs[0].elevationGain, null);
  assert.equal(res.body.runs[0].start, "2026-11-07T08:30:00");
  assert.match(calls[1].url, /activityType=running/);
  assert.equal(calls[0].options.headers.Authorization, "ApiKey personal-key");
  assert.equal(calls[0].options.headers.Accept, "*/*");
  assert.equal(calls[1].options.headers.Authorization, "Bearer token.test");
  assert.equal(calls[0].options.redirect, "error");
  assert.doesNotMatch(JSON.stringify(res.body), /personal-key|token.test/);
});

test("requires an authenticated app account and rejects account switches before calling Garmin", async () => {
  for (const [handler, req, expected] of [
    [{ resolveSession: async () => null }, request(), 401],
    [account, { ...request(), headers: { "x-fitness-account": "account-b" } }, 409],
    [account, { ...request(), method: "PUT" }, 405],
    [account, request({ apiKey: "bad\r\nheader" }), 400],
  ]) {
    const res = response();
    await handleGarmin(req, res, "http://localhost:3000", handler, () => assert.fail("Garmin must not be called"));
    assert.equal(res.status, expected);
  }
});

test("handles Garmin rejection, rate limiting, malformed payloads and network failures without leaking secrets", async () => {
  for (const [fetcher, expected] of [
    [async () => ({ ok: false, status: 401 }), 422],
    [async () => ({ ok: false, status: 429 }), 429],
    [async () => ({ ok: true, json: async () => ({}) }), 502],
    [async () => { throw new Error("personal-key"); }, 502],
  ]) {
    const res = response();
    await handleGarmin(request(), res, "http://localhost:3000", account, fetcher);
    assert.equal(res.status, expected);
    assert.doesNotMatch(JSON.stringify(res.body), /personal-key/);
  }
});

test("shared route rejects cross-origin requests and non-JSON requests before reading keys", async () => {
  for (const [headers, expected] of [
    [{ origin: "https://other.example", "content-type": "application/json" }, 403],
    [{ "content-type": "text/plain" }, 415],
  ]) {
    const res = response();
    await routeAccountRequest({ ...request(), headers }, res, "/api/garmin", "https://fitness.example", () => assert.fail("Auth must not be called"));
    assert.equal(res.status, expected);
  }
});

test("rejects malformed metrics instead of producing invalid pace or missing-value zeros", () => {
  const normalized = handleGarmin.normalizeRun({ ...run, duration: -1, distance: Infinity, averageHR: null, calories: "350" });
  assert.equal(normalized.duration, null);
  assert.equal(normalized.distance, null);
  assert.equal(normalized.averageHR, null);
  assert.equal(normalized.calories, null);
});

function browserHarness(fetcher) {
  const fs = require("node:fs");
  const vm = require("node:vm");
  class Element {
    constructor() { this.value = ""; this.dataset = {}; this.events = {}; this.children = []; this.textContent = ""; }
    querySelector(selector) { return nodes[selector] ??= new Element(); }
    addEventListener(event, callback) { this.events[event] = callback; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute() {}
    reportValidity() { return true; }
  }
  const nodes = {};
  const storage = new Map();
  const context = vm.createContext({
    document: { querySelector: (id) => nodes[id] ??= new Element(), createElement: () => new Element() },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    Intl, Date, AbortController, AbortSignal, fetch: fetcher,
  });
  vm.runInContext(fs.readFileSync(require.resolve("./cardio-recovery.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(require.resolve("./cardio-garmin.js"), "utf8") + "\nglobalThis.app = cardioGarmin;", context);
  nodes["#garmin-period"].value = "all";
  return { app: context.app, nodes, storage, submit: (key) => {
    nodes["#garmin-key"].value = key;
    nodes["#garmin-connect-form"].events.submit({ preventDefault() {} });
  } };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("Cardio UI calculates pace, keeps keys out of storage, resets account state and clears imported data", async () => {
  const normalized = handleGarmin.normalizeRun(run);
  const ui = browserHarness(async () => ({ ok: true, json: async () => ({ runs: [normalized], syncedAt: new Date().toISOString() }) }));
  ui.app.setAccount("account-a");
  await tick();
  ui.submit("private-personal-key");
  await tick();
  assert.equal(ui.nodes["#garmin-total-pace"].textContent, "5:00 /km");
  assert.equal(ui.nodes["#garmin-total-distance"].textContent, "5 km");
  assert.equal(ui.nodes["#garmin-key"].value, "");
  assert.equal(ui.nodes["#garmin-runs"].children.length, 1);
  assert.doesNotMatch([...ui.storage.values()].join(""), /private-personal-key/);
  ui.app.setAccount("account-b");
  assert.equal(ui.nodes["#garmin-total-runs"].textContent, "0");
  assert.equal(ui.nodes["#garmin-sync"].hidden, true);
  ui.app.setAccount("account-a");
  assert.equal(ui.nodes["#garmin-total-runs"].textContent, "1");
  assert.equal(ui.nodes["#garmin-sync"].hidden, true);
  await tick();
  await ui.nodes["#garmin-disconnect"].events.click();
  assert.equal(ui.nodes["#garmin-total-runs"].textContent, "0");
  assert.equal(ui.storage.size, 0);
});

test("a late Garmin response after account switching cannot leak data into the new account", async () => {
  let finish;
  const ui = browserHarness((_url, options) => options.method === "POST" ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve({ ok: true, json: async () => ({ connected: false }) }));
  ui.app.setAccount("account-a");
  await tick();
  ui.submit("private-key");
  ui.app.setAccount("account-b");
  finish({ ok: true, json: async () => ({ runs: [handleGarmin.normalizeRun(run)], syncedAt: new Date().toISOString() }) });
  await tick();
  assert.equal(ui.nodes["#garmin-total-runs"].textContent, "0");
  assert.equal(ui.nodes["#garmin-sync"].hidden, true);
  assert.equal(ui.storage.size, 0);
});

test("legacy browser keys migrate into the account and old cookies cannot undo a disconnect", async () => {
  const res = response();
  res.setHeader("Set-Cookie", ["existing-session=preserved"]);
  keys.save(res, "https://fitness.example", "account-a", "secret-garmin-key");
  const cookie = res.cookies["Set-Cookie"][1];
  assert.match(cookie, /HttpOnly; SameSite=Strict; Max-Age=31536000; Secure/);
  assert.doesNotMatch(cookie, /secret-garmin-key/);
  assert.equal(res.cookies["Set-Cookie"][0], "existing-session=preserved");
  const req = { ...request({}), headers: { ...request().headers, cookie: cookie.split(";")[0] } };
  assert.equal(keys.read(req, "account-a"), "secret-garmin-key");
  assert.equal(keys.read(req, "account-b"), null);
  const bad = { ...req, headers: { ...req.headers, cookie: req.headers.cookie.slice(0, -5) + "AAAAA" } };
  assert.equal(keys.read(bad, "account-a"), null);
  const status = response();
  await handleGarmin({ ...req, method: "GET" }, status, "https://fitness.example", account);
  assert.deepEqual(status.body, { connected: true });
  const stored = await createSqliteStore(db, "account-a").get();
  assert.equal(keys.open("account-a", stored.encryptedKey), "secret-garmin-key");
  assert.doesNotMatch(stored.encryptedKey, /secret-garmin-key/);
  assert.match(status.cookies["Set-Cookie"][0], /Max-Age=0/);
  const calls = [];
  const refreshed = response();
  await handleGarmin(req, refreshed, "https://fitness.example", account, async (url, options) => {
    calls.push(options);
    return { ok: true, text: async () => "raw.jwt.token", json: async () => [] };
  });
  assert.equal(refreshed.status, 200);
  assert.equal(calls[0].headers.Authorization, "ApiKey secret-garmin-key");
  const deleted = response();
  await handleGarmin({ ...req, body: { action: "disconnect" } }, deleted, "https://fitness.example", account);
  assert.match(deleted.cookies["Set-Cookie"][0], /Max-Age=0/);
  assert.equal(keys.read({ headers: { cookie: deleted.cookies["Set-Cookie"][0].split(";")[0] } }, "account-a"), null);
  const oldDevice = response();
  await handleGarmin({ ...req, method: "GET" }, oldDevice, "https://fitness.example", account);
  assert.deepEqual(oldDevice.body, { connected: false });
  assert.equal((await createSqliteStore(db, "account-a").get()).encryptedKey, null);
});

test("Cardio restores a saved connection after a new login without exposing the key to JavaScript", async () => {
  const ui = browserHarness(async () => ({ ok: true, json: async () => ({ connected: true }) }));
  ui.app.setAccount("account-a");
  await tick();
  assert.equal(ui.nodes["#garmin-sync"].hidden, false);
  assert.equal(ui.nodes["#garmin-setup"].open, false);
  assert.equal(ui.nodes["#garmin-key"].value, "");
  assert.match(ui.nodes["#garmin-state"].textContent, /Im Konto gespeichert/);
  assert.match(ui.nodes["#garmin-empty"].textContent, /Jetzt synchronisieren/);
});

const garminSuccess = async () => ({ ok: true, text: async () => "raw.jwt.token", json: async () => [run] });
test("a saved key is available on another device without any Garmin cookie and remains private to its owner", async () => {
  const firstDevice = response();
  await handleGarmin(request({ apiKey: "account-personal-key" }), firstDevice, "https://fitness.example", account, garminSuccess);
  assert.equal(firstDevice.status, 200);
  const stored = await createSqliteStore(db, "account-a").get();
  assert.equal(keys.open("account-a", stored.encryptedKey), "account-personal-key");
  assert.equal(keys.open("account-b", stored.encryptedKey), null);
  const secondDevice = response();
  await handleGarmin({ ...request(), method: "GET" }, secondDevice, "https://fitness.example", account);
  assert.deepEqual(secondDevice.body, { connected: true });
  const calls = [];
  const sync = response();
  await handleGarmin(request({}), sync, "https://fitness.example", account, async (_url, options) => { calls.push(options); return garminSuccess(); });
  assert.equal(sync.status, 200);
  assert.equal(calls[0].headers.Authorization, "ApiKey account-personal-key");
  const other = { resolveSession: async () => ({ user: { id: "account-b" }, garmin: createSqliteStore(db, "account-b") }) };
  const otherDevice = response();
  await handleGarmin({ ...request(), method: "GET", headers: { "x-fitness-account": "account-b" } }, otherDevice, "https://fitness.example", other);
  assert.deepEqual(otherDevice.body, { connected: false });
  for (const res of [firstDevice, secondDevice, sync, otherDevice]) {
    assert.doesNotMatch(JSON.stringify(res.body) + JSON.stringify(res.cookies), /account-personal-key|raw.jwt.token|v1\./);
  }
});

test("invalid replacement and transient Garmin failures preserve the saved account key", async () => {
  const store = createSqliteStore(db, "account-a");
  await store.write(keys.seal("account-a", "still-valid-key"), null);
  const original = await store.get();
  const rejected = response();
  await handleGarmin(request({ apiKey: "wrong-replacement" }), rejected, "https://fitness.example", account, async () => ({ ok: false, status: 401 }));
  assert.equal(rejected.status, 422);
  assert.equal(rejected.body.connected, true);
  assert.deepEqual(await store.get(), original);
  for (const status of [429, 503]) {
    const res = response();
    await handleGarmin(request({}), res, "https://fitness.example", account, async () => ({ ok: false, status }));
    assert.equal(res.body.connected, true);
    assert.deepEqual(await store.get(), original);
  }
  const expired = response();
  await handleGarmin(request({}), expired, "https://fitness.example", account, async () => ({ ok: false, status: 401 }));
  assert.equal(expired.body.connected, false);
  assert.equal((await store.get()).encryptedKey, null);
});

test("disconnecting on one device prevents an in-flight sync on another device from restoring the connection", async () => {
  const store = createSqliteStore(db, "account-a");
  await store.write(keys.seal("account-a", "shared-key"), null);
  let release;
  const activities = new Promise(resolve => { release = resolve; });
  let started;
  const fetching = new Promise(resolve => { started = resolve; });
  const res = response();
  const syncing = handleGarmin(request({}), res, "https://fitness.example", account, async (_url, options) => {
    if (options.method === "POST") return garminSuccess();
    started(); return activities;
  });
  await fetching;
  const disconnected = response();
  await handleGarmin(request({ action: "disconnect" }), disconnected, "https://fitness.example", account);
  release({ ok: true, json: async () => [run] });
  await syncing;
  assert.equal(disconnected.status, 200);
  assert.equal(res.status, 409);
  assert.equal(res.body.connected, false);
  assert.equal((await store.get()).encryptedKey, null);
});

test("an account storage failure never reports a key as saved", async () => {
  const broken = { resolveSession: async () => ({ user: { id: "account-a" }, garmin: {
    get: async () => null, write: async () => { throw Object.assign(new Error("Speicherung nicht verfügbar."), { status: 503 }); },
  } }) };
  const res = response();
  await handleGarmin(request(), res, "https://fitness.example", broken, garminSuccess);
  assert.equal(res.status, 503);
  assert.equal(res.body.connected, false);
  assert.doesNotMatch(JSON.stringify(res.body), /personal-key/);
});

test("maximum supported key length fits the encrypted record and tampering cannot cross account boundaries", () => {
  const key = "x".repeat(2048);
  const encrypted = keys.seal("account-a", key);
  assert.ok(encrypted.length <= 4096);
  assert.equal(keys.open("account-a", encrypted), key);
  assert.equal(keys.open("account-b", encrypted), null);
  const tampered = encrypted.slice(0, -12) + "AAAAAAAAAAAA";
  assert.equal(keys.open("account-a", tampered), null);
});

test("wellness summary provides only bounded recovery metrics and Garmin measurement time", async () => {
  const res = response();
  await handleGarmin(request({ apiKey: "personal-key", calendarDate: "2026-11-09" }), res, "http://localhost:3000", account, async (url, options) => {
    if (options.method === "POST") return { ok: true, text: async () => "token.test" };
    return { ok: true, json: async () => url.includes("usersummary") ? {
      calendarDate: "2026-11-09", includesWellnessData: true, bodyBatteryMostRecentValue: 22,
      averageStressLevel: -1, wellnessEndTimeGmt: "2026-11-09T10:00:00", displayName: "private",
    } : [run] };
  });
  assert.deepEqual(res.body.health, { calendarDate: "2026-11-09", bodyBattery: 22, stress: null, measuredAt: "2026-11-09T10:00:00Z" });
  assert.doesNotMatch(JSON.stringify(res.body), /private/);
});

test("optional wellness failure preserves synchronized runs", async () => {
  const res = response();
  await handleGarmin(request(), res, "http://localhost:3000", account, async (url, options) => {
    if (url.includes("usersummary")) return { ok: false, status: 404 };
    return garminSuccess(url, options);
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.runs.length, 1);
  assert.equal(res.body.health, null);
});
