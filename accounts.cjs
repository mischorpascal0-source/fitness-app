const { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } = require("node:crypto");
const { mkdirSync } = require("node:fs");
const { dirname, join } = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { promisify } = require("node:util");
const { normalizePlan } = require("./plan-data.js");
const { readJson, planIdFromPath, readEmail, readRegistration } = require("./account-http.cjs");

const deriveKey = promisify(scrypt);
const passwordOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const sessionSeconds = 7 * 24 * 60 * 60;
const cookieName = "fitness_session";
const dummySalt = randomBytes(16);
const dummyHash = randomBytes(64);
const databasePath = process.env.FITNESS_DB_PATH ?? join(__dirname, ".data", "fitness.sqlite");
if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });

const db = new DatabaseSync(databasePath, { timeout: 5000 });
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    salt BLOB NOT NULL,
    password_hash BLOB NOT NULL
  ) STRICT;
  CREATE TABLE IF NOT EXISTS account_profiles (
    account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date TEXT NOT NULL
  ) STRICT;
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  ) STRICT;
  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX IF NOT EXISTS plans_by_account ON plans(account_id, updated_at);
`);

const statements = {
  getAccount: db.prepare("SELECT * FROM accounts WHERE username = ?"),
  addAccount: db.prepare("INSERT INTO accounts (id, username, salt, password_hash) VALUES (?, ?, ?, ?) ON CONFLICT(username) DO NOTHING"),
  addProfile: db.prepare("INSERT INTO account_profiles (account_id, first_name, last_name, birth_date) VALUES (?, ?, ?, ?)"),
  getSession: db.prepare(`
    SELECT accounts.id, accounts.username FROM sessions JOIN accounts ON accounts.id = sessions.account_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `),
  addSession: db.prepare("INSERT INTO sessions VALUES (?, ?, ?)"),
  removeSession: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
  expireSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= ?"),
  listPlans: db.prepare("SELECT id, name, version FROM plans WHERE account_id = ? ORDER BY updated_at DESC, id"),
  getPlan: db.prepare("SELECT id, data, version FROM plans WHERE id = ? AND account_id = ?"),
  addPlan: db.prepare("INSERT INTO plans (id, account_id, name, data, updated_at) VALUES (?, ?, ?, ?, ?)"),
  updatePlan: db.prepare(`
    UPDATE plans SET name = ?, data = ?, version = version + 1, updated_at = ?
    WHERE id = ? AND account_id = ? AND version = ?
  `),
  removePlan: db.prepare("DELETE FROM plans WHERE id = ? AND account_id = ? AND version = ?"),
};
let authWindow = 0;
let authAttempts = 0;
let authInFlight = 0;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function readToken(request) {
  return request.headers.cookie?.match(/(?:^|;\s*)fitness_session=([\w-]{43})(?:;|$)/)?.[1];
}

function setCookie(response, token, seconds) {
  response.setHeader("Set-Cookie", `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}`);
}

function publicAccount(account) {
  return account ? { id: account.id, username: account.username } : null;
}

function login(request, response, account) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const previous = readToken(request);
  statements.expireSessions.run(now);
  statements.addSession.run(hashToken(token), account.id, now + sessionSeconds * 1000);
  if (previous) statements.removeSession.run(hashToken(previous));
  setCookie(response, token, sessionSeconds);
  return publicAccount(account);
}

async function authenticate(request, response, sendJson, register) {
  const body = await readJson(request);
  const registration = register ? readRegistration(body) : null;
  if (registration?.error) return sendJson(response, 400, { error: registration.error });
  const username = registration?.email ?? (typeof body?.username === "string" ? body.username.trim() : "");
  const password = body?.password;
  if ((!readEmail(username) && !/^[a-z0-9_.-]{3,32}$/i.test(username)) ||
      typeof password !== "string" || password.length < 12 || password.length > 128) {
    return sendJson(response, 400, { error: "Gib deine E-Mail-Adresse oder deinen Nutzernamen und dein Passwort ein." });
  }

  const now = Date.now();
  if (now >= authWindow + 60_000) {
    authWindow = now;
    authAttempts = 0;
  }
  if (authAttempts >= 12 || authInFlight >= 2) {
    return sendJson(response, 429, { error: "Zu viele Anmeldeversuche. Versuche es gleich erneut." });
  }
  authAttempts++;
  authInFlight++;
  try {
    if (register) {
      const salt = randomBytes(16);
      const hash = await deriveKey(password, salt, 64, passwordOptions);
      const id = randomUUID();
      const profile = registration.profile;
      let created;
      db.exec("BEGIN IMMEDIATE");
      try {
        created = statements.addAccount.run(id, username, salt, hash).changes;
        if (created) statements.addProfile.run(id, profile.first_name, profile.last_name, profile.birth_date);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      if (!created) return sendJson(response, 409, { error: "Diese E-Mail-Adresse ist bereits vergeben." });
      return sendJson(response, 201, { user: login(request, response, { id, username }) });
    }

    const account = statements.getAccount.get(username);
    const hash = await deriveKey(password, account?.salt ?? dummySalt, 64, passwordOptions);
    if (!timingSafeEqual(hash, account?.password_hash ?? dummyHash) || !account) {
      return sendJson(response, 401, { error: "Die Anmeldedaten sind falsch." });
    }
    return sendJson(response, 200, { user: login(request, response, account) });
  } finally {
    authInFlight--;
  }
}

async function handleAccounts(request, response, pathname, sendJson) {
  const method = request.method;
  if (method === "POST" && ["/api/register", "/api/login"].includes(pathname)) {
    return authenticate(request, response, sendJson, pathname === "/api/register");
  }

  const token = readToken(request);
  const tokenHash = token && hashToken(token);
  const account = tokenHash && statements.getSession.get(tokenHash, Date.now());
  if (method === "GET" && pathname === "/api/session") {
    return sendJson(response, 200, { user: publicAccount(account), authMode: "username" });
  }
  const expectedAccount = request.headers["x-fitness-account"];
  if (expectedAccount && account && expectedAccount !== account.id) {
    return sendJson(response, 409, { error: "Das aktive Konto hat sich geändert. Lade die Seite neu." });
  }
  if (method === "POST" && pathname === "/api/logout") {
    if (tokenHash) statements.removeSession.run(tokenHash);
    setCookie(response, "", 0);
    return sendJson(response, 200, { user: null });
  }
  const planId = planIdFromPath(pathname);
  if (pathname !== "/api/plans" && !planId) return sendJson(response, 404, { error: "Seite nicht gefunden." });
  if (!account) return sendJson(response, 401, { error: "Melde dich an, um deine Pläne zu öffnen." });

  if (pathname === "/api/plans" && method === "GET") {
    return sendJson(response, 200, { plans: statements.listPlans.all(account.id) });
  }
  if (pathname === "/api/plans" && method === "POST") {
    const plan = normalizePlan((await readJson(request))?.plan);
    if (!statements.getSession.get(tokenHash, Date.now())) {
      return sendJson(response, 401, { error: "Deine Sitzung ist abgelaufen." });
    }
    if (!plan) return sendJson(response, 400, { error: "Ungültiger Trainingsplan." });
    const id = randomUUID();
    statements.addPlan.run(id, account.id, plan.name, JSON.stringify(plan), Date.now());
    return sendJson(response, 201, { id, plan, version: 1 });
  }

  if (planId && ["GET", "PUT", "DELETE"].includes(method)) {
    const body = method === "GET" ? null : await readJson(request);
    if (method !== "GET" && !statements.getSession.get(tokenHash, Date.now())) {
      return sendJson(response, 401, { error: "Deine Sitzung ist abgelaufen." });
    }
    const existing = statements.getPlan.get(planId, account.id);
    if (!existing) return sendJson(response, 404, { error: "Trainingsplan nicht gefunden." });
    if (method === "GET") {
      return sendJson(response, 200, { id: planId, plan: JSON.parse(existing.data), version: existing.version });
    }
    if (body?.version !== existing.version) {
      return sendJson(response, 409, { error: "Der Plan wurde in einem anderen Fenster geändert. Lade den aktuellen Stand." });
    }
    const plan = method === "PUT" ? normalizePlan(body.plan) : null;
    if (method === "PUT" && !plan) return sendJson(response, 400, { error: "Ungültiger Trainingsplan." });
    const change = method === "PUT"
      ? statements.updatePlan.run(plan.name, JSON.stringify(plan), Date.now(), planId, account.id, existing.version)
      : statements.removePlan.run(planId, account.id, existing.version);
    if (!change.changes) return sendJson(response, 409, { error: "Der Plan wurde inzwischen geändert." });
    return sendJson(response, 200, method === "PUT"
      ? { id: planId, plan, version: existing.version + 1 } : { id: planId });
  }

  return sendJson(response, 405, { error: "Diese Anfrage wird nicht unterstützt." });
}

module.exports = handleAccounts;
