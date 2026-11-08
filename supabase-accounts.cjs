const { createHash, randomBytes } = require("node:crypto");
const { readJson, planIdFromPath, readEmail, readRegistration } = require("./account-http.cjs");
const { normalizePlan } = require("./plan-data.js");

const cookieNames = { access: "fitness_cloud_access", refresh: "fitness_cloud_refresh" };
const maxSessionAge = 7 * 24 * 60 * 60;
const tablePath = "/rest/v1/fitness_training_plans";

class CloudError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function publicAccount(user) {
  return user?.id && user?.email ? { id: user.id, username: user.email } : null;
}

function validToken(value) {
  return typeof value === "string" && /^[A-Za-z0-9._~-]{1,3800}$/.test(value);
}

function readCookie(request, name) {
  const entry = request.headers.cookie?.split(/;\s*/).find((value) => value.startsWith(name + "="));
  const token = entry?.slice(name.length + 1);
  return validToken(token) ? token : undefined;
}

function writeCookies(response, origin, session = null) {
  const flags = `Path=/api; HttpOnly; SameSite=Strict${origin.startsWith("https:") ? "; Secure" : ""}`;
  const age = session ? maxSessionAge : 0;
  response.setHeader("Set-Cookie", [
    `${cookieNames.access}=${session?.access_token ?? ""}; ${flags}; Max-Age=${age}`,
    `${cookieNames.refresh}=${session?.refresh_token ?? ""}; ${flags}; Max-Age=${age}`,
  ]);
}

function asSession(data) {
  const user = publicAccount(data?.user);
  if (!user || !validToken(data.access_token) || !validToken(data.refresh_token)) {
    throw new CloudError(502, "Supabase hat keine gültige Anmeldung zurückgegeben.");
  }
  return { user, access_token: data.access_token, refresh_token: data.refresh_token };
}

function createSupabaseAccounts(baseUrl, publishableKey) {
  const base = new URL(baseUrl);
  const localHttp = base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname);
  if ((!localHttp && base.protocol !== "https:") || base.pathname !== "/" ||
      base.search || base.hash || base.username || base.password) {
    throw new Error("SUPABASE_URL muss eine Supabase-Projektadresse sein.");
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY muss ein Supabase Publishable Key sein.");
  }
  const refreshing = new Map();

  async function call(path, { method = "GET", token, data, prefer } = {}) {
    const headers = { apikey: publishableKey };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (data !== undefined) headers["Content-Type"] = "application/json";
    if (prefer) headers.Prefer = prefer;
    try {
      const response = await fetch(new URL(path, base), {
        method, headers, body: data === undefined ? undefined : JSON.stringify(data),
        signal: AbortSignal.timeout(7000), redirect: "error",
      });
      const body = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, body };
    } catch {
      throw new CloudError(502, "Supabase ist gerade nicht erreichbar.");
    }
  }

  async function refresh(token) {
    if (!refreshing.has(token)) {
      const pending = call("/auth/v1/token?grant_type=refresh_token", {
        method: "POST", data: { refresh_token: token },
      }).then((result) => {
        if ([400, 401, 403].includes(result.status)) return null;
        if (!result.ok) throw new CloudError(502, "Deine Anmeldung konnte gerade nicht erneuert werden.");
        return asSession(result.body);
      }).finally(() => refreshing.delete(token));
      refreshing.set(token, pending);
    }
    return refreshing.get(token);
  }

  async function getSession(request, response, origin) {
    const token = readCookie(request, cookieNames.access);
    if (token) {
      const userResponse = await call("/auth/v1/user", { token });
      if (userResponse.ok) {
        const user = publicAccount(userResponse.body);
        if (user) return { user, access_token: token };
        throw new CloudError(502, "Supabase hat keine gültige Kontoinformation geliefert.");
      }
      if (![400, 401, 403].includes(userResponse.status)) {
        throw new CloudError(502, "Deine Anmeldung konnte gerade nicht geprüft werden.");
      }
    }
    const refreshToken = readCookie(request, cookieNames.refresh);
    const session = refreshToken ? await refresh(refreshToken) : null;
    if (session || token || refreshToken) writeCookies(response, origin, session);
    return session;
  }

  async function authenticate(request, response, sendJson, origin, register) {
    const body = await readJson(request);
    const registration = register ? readRegistration(body) : null;
    if (registration?.error) return sendJson(response, 400, { error: registration.error });
    const email = registration?.email ?? readEmail(body?.username);
    const password = body?.password;
    if (!email || typeof password !== "string" || !password.length || password.length > 128) {
      return sendJson(response, 400, { error: "Gib eine gültige E-Mail-Adresse und ein Passwort ein." });
    }
    const data = { email, password };
    let endpoint = "/auth/v1/token?grant_type=password";
    if (register) {
      endpoint = "/auth/v1/signup?" + new URLSearchParams({ redirect_to: origin + "/auth/confirm" });
      data.data = registration.profile;
      // The email verifies the account. The user signs in afterwards, so no verifier or session goes in the email redirect.
      data.code_challenge = createHash("sha256").update(randomBytes(32).toString("base64url")).digest("base64url");
      data.code_challenge_method = "s256";
    }
    const result = await call(endpoint, { method: "POST", data });
    if (!result.ok) {
      if (result.status === 429) throw new CloudError(429, "Zu viele Anmeldeversuche. Warte kurz und versuche es erneut.");
      const code = result.body?.error_code ?? result.body?.code;
      if (code === "email_address_not_authorized") {
        throw new CloudError(503, "Für diese Adresse kann noch keine Bestätigungs-E-Mail verschickt werden. Bitte wende dich an den Betreiber der App.");
      }
      if (code === "email_not_confirmed") {
        throw new CloudError(401, "Bestätige zuerst deine E-Mail-Adresse und melde dich dann an.");
      }
      if (result.status >= 500) throw new CloudError(502, "Supabase Auth ist gerade nicht erreichbar.");
      throw new CloudError(register ? 400 : 401, register
        ? "Das Konto konnte nicht angelegt werden. Prüfe die Angaben."
        : "E-Mail-Adresse oder Passwort ist falsch.");
    }
    if (register && !result.body?.access_token) {
      if (!result.body?.id && !result.body?.user?.id) throw new CloudError(502, "Supabase hat die Registrierung nicht bestätigt.");
      return sendJson(response, 201, { user: null, confirmationRequired: true });
    }
    const session = asSession(result.body);
    writeCookies(response, origin, session);
    return sendJson(response, register ? 201 : 200, { user: session.user });
  }

  async function plansRequest(session, { method = "GET", id, version, plan, list } = {}) {
    const params = new URLSearchParams({ select: list ? "id,name,version" : "id,data,version" });
    if (method !== "POST") params.set("owner_id", "eq." + session.user.id);
    if (id) params.set("id", "eq." + id);
    if (version !== undefined) params.set("version", "eq." + version);
    if (list) params.set("order", "updated_at.desc,id");
    const response = await call(tablePath + "?" + params, {
      method, token: session.access_token, data: plan ? { data: plan } : undefined,
      prefer: method === "GET" ? undefined : "return=representation",
    });
    if (response.status === 401) throw new CloudError(401, "Deine Sitzung ist abgelaufen. Melde dich erneut an.");
    if (!response.ok || !Array.isArray(response.body)) {
      const code = response.body?.code;
      if (["PGRST205", "42P01"].includes(code)) {
        throw new CloudError(503, "Die Datenbankmigration für Trainingspläne fehlt in Supabase.");
      }
      throw new CloudError(502, "Die Trainingspläne konnten in Supabase nicht verarbeitet werden.");
    }
    return response.body;
  }

  const record = ({ id, data, version }) => ({ id, plan: data, version });

  async function handle(request, response, pathname, sendJson, origin) {
    const method = request.method;
    try {
      if (method === "POST" && ["/api/register", "/api/login"].includes(pathname)) {
        return await authenticate(request, response, sendJson, origin, pathname === "/api/register");
      }
      const id = planIdFromPath(pathname);
      if (!id && !["/api/session", "/api/logout", "/api/plans"].includes(pathname)) {
        return sendJson(response, 404, { error: "Seite nicht gefunden." });
      }
      const session = await getSession(request, response, origin);
      if (method === "GET" && pathname === "/api/session") {
        return sendJson(response, 200, { user: session?.user ?? null, authMode: "email" });
      }
      const expected = request.headers["x-fitness-account"];
      if (expected && session && expected !== session.user.id) {
        throw new CloudError(409, "Das aktive Konto hat sich geändert. Lade die Seite neu.");
      }
      if (method === "POST" && pathname === "/api/logout") {
        if (session) {
          const logout = await call("/auth/v1/logout?scope=local", { method: "POST", token: session.access_token });
          if (!logout.ok && logout.status !== 401) throw new CloudError(502, "Die Abmeldung konnte gerade nicht abgeschlossen werden.");
        }
        writeCookies(response, origin);
        return sendJson(response, 200, { user: null });
      }
      if (!session) throw new CloudError(401, "Melde dich an, um deine Pläne zu öffnen.");
      if (method === "GET" && pathname === "/api/plans") {
        return sendJson(response, 200, { plans: await plansRequest(session, { list: true }) });
      }
      if (method === "POST" && pathname === "/api/plans") {
        const plan = normalizePlan((await readJson(request))?.plan);
        if (!plan) throw new CloudError(400, "Ungültiger Trainingsplan.");
        const [created] = await plansRequest(session, { method, plan });
        if (!created) throw new CloudError(502, "Der Trainingsplan konnte nicht gespeichert werden.");
        return sendJson(response, 201, record(created));
      }
      if (id && method === "GET") {
        const [found] = await plansRequest(session, { id });
        if (!found) throw new CloudError(404, "Trainingsplan nicht gefunden.");
        return sendJson(response, 200, record(found));
      }
      if (id && ["PUT", "DELETE"].includes(method)) {
        const body = await readJson(request);
        if (!Number.isSafeInteger(body?.version) || body.version < 1) {
          throw new CloudError(400, "Ungültige Version des Trainingsplans.");
        }
        const plan = method === "PUT" ? normalizePlan(body.plan) : null;
        if (method === "PUT" && !plan) throw new CloudError(400, "Ungültiger Trainingsplan.");
        const [changed] = await plansRequest(session, {
          method: method === "PUT" ? "PATCH" : "DELETE", id, version: body.version, plan,
        });
        if (!changed) {
          const [found] = await plansRequest(session, { id });
          if (!found) throw new CloudError(404, "Trainingsplan nicht gefunden.");
          throw new CloudError(409, "Der Plan wurde in einem anderen Fenster geändert. Lade den aktuellen Stand.");
        }
        return sendJson(response, 200, method === "PUT" ? record(changed) : { id });
      }
      return sendJson(response, 405, { error: "Diese Anfrage wird nicht unterstützt." });
    } catch (error) {
      if (error instanceof CloudError) return sendJson(response, error.status, { error: error.message });
      throw error;
    }
  }
  // Server-only context; access tokens and the integration store never enter /api/session JSON.
  handle.resolveSession = async (request, response, origin) => {
    const session = await getSession(request, response, origin);
    if (!session) return null;
    return { user: session.user, garmin: require("./cardio-garmin-store.cjs").createSupabaseStore(call, session) };
  };
  return handle;
}

module.exports = createSupabaseAccounts;
