const { test } = require("node:test");
const assert = require("node:assert/strict");
const handleGarmin = require("./cardio-garmin.cjs");
const { routeAccountRequest } = require("./account-http.cjs");
process.env.FITNESS_GARMIN_COOKIE_KEY = "ab".repeat(32);
const account = async (_req, res, _path, json) => json(res, 200, { user: { id: "account-a" } });
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
    [async (_req, res, _path, json) => json(res, 200, { user: null }), request(), 401],
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
  await ui.nodes["#garmin-disconnect"].events.click();
  assert.equal(ui.nodes["#garmin-total-runs"].textContent, "0");
  assert.equal(ui.storage.size, 0);
});

test("a late Garmin response after account switching cannot leak data into the new account", async () => {
  let finish;
  const ui = browserHarness((_url, options) => options.method === "POST" ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve({ ok: true, json: async () => ({ connected: false }) }));
  ui.app.setAccount("account-a");
  ui.submit("private-key");
  ui.app.setAccount("account-b");
  finish({ ok: true, json: async () => ({ runs: [handleGarmin.normalizeRun(run)], syncedAt: new Date().toISOString() }) });
  await tick();
  assert.equal(ui.nodes["#garmin-total-runs"].textContent, "0");
  assert.equal(ui.nodes["#garmin-sync"].hidden, true);
  assert.equal(ui.storage.size, 0);
});

test("saved keys survive a new request, stay HttpOnly/encrypted, and cannot cross accounts or be tampered with", async () => {
  const keys = require("./cardio-garmin-key.cjs");
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
});

test("Cardio restores a saved connection after a new login without exposing the key to JavaScript", async () => {
  const ui = browserHarness(async () => ({ ok: true, json: async () => ({ connected: true }) }));
  ui.app.setAccount("account-a");
  await tick();
  assert.equal(ui.nodes["#garmin-sync"].hidden, false);
  assert.equal(ui.nodes["#garmin-setup"].open, false);
  assert.equal(ui.nodes["#garmin-key"].value, "");
  assert.match(ui.nodes["#garmin-state"].textContent, /gespeichert/);
});
