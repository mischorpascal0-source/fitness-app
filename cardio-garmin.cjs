// Official Garmin Connect Personal API. Encrypted keys belong to the signed-in app account.
const { readJson, sendJson } = require("./account-http.cjs");
const keyStore = require("./cardio-garmin-key.cjs");
const base = "https://personal.connectapi.garmin.com";

function metric(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeRun(activity) {
  const date = activity?.startTimeLocal;
  if (!activity || !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(date ?? "") ||
      !Number.isSafeInteger(activity.activityId) || activity.activityId <= 0) return null;
  return {
    id: String(activity.activityId), name: String(activity.activityName ?? "Lauf").slice(0, 200),
    start: date.replace(" ", "T"), distance: metric(activity.distance), duration: metric(activity.duration),
    averageHR: metric(activity.averageHR), maxHR: metric(activity.maxHR),
    elevationGain: metric(activity.elevationGain), calories: metric(activity.calories),
    device: typeof activity.deviceName === "string" ? activity.deviceName.slice(0, 100) : null,
  };
}

async function garminCall(path, headers, method, fetcher) {
  const response = await fetcher(base + path, {
    method, headers: { Accept: method === "POST" ? "*/*" : "application/json", ...headers },
    redirect: "error", signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) {
    const rejected = [401, 403].includes(response.status) || (method === "POST" && response.status === 400);
    const stage = method === "POST" ? "Anmeldung" : "Laufdaten";
    console.warn("Garmin API error", { stage, status: response.status });
    const error = new Error(rejected
      ? "Garmin hat den Zugriff abgelehnt. Prüfe, ob dein persönlicher API-Schlüssel gültig und nicht abgelaufen ist."
      : response.status === 429 ? "Garmin erhält zu viele Anfragen. Versuche es in ein paar Minuten erneut."
        : `Garmin-Anfrage fehlgeschlagen (${stage}, HTTP ${response.status}). Versuche es später erneut.`);
    error.status = response.status === 429 ? 429 : rejected ? 422 : 502;
    error.garminAuthentication = method === "POST";
    throw error;
  }
  return method === "POST" ? (await response.text()).trim() : response.json();
}

async function handleGarmin(request, response, origin, handleAccounts, fetcher = fetch) {
  if (!["GET", "POST"].includes(request.method)) return sendJson(response, 405, { error: "Verwende die Synchronisierung im Cardio-Bereich." });
  let connection;
  let record;
  let storedKey;
  let suppliedKey = false;
  let usingStoredKey = false;
  let connected = false;
  try {
    // Session tokens and storage adapters remain server-side, including after token refresh.
    const session = await handleAccounts.resolveSession(request, response, origin);
    if (!session?.user) return sendJson(response, 401, { error: "Melde dich erneut in der Fitness-App an." });
    const accountId = session.user.id;
    if (request.headers["x-fitness-account"] !== accountId) {
      return sendJson(response, 409, { error: "Das aktive Konto hat sich geändert. Lade die Seite neu." });
    }
    connection = session.garmin;
    record = await connection.get();
    const body = request.method === "POST" ? await readJson(request) : null;
    if (body?.action === "disconnect") {
      // Keep an empty record to prevent old device cookies from restoring a removed key.
      await connection.write(null, record?.revision ?? null);
      keyStore.save(response, origin, accountId, null);
      return sendJson(response, 200, { connected: false });
    }
    if (!record) {
      const legacyKey = keyStore.read(request, accountId);
      if (legacyKey) {
        try { record = await connection.write(keyStore.seal(accountId, legacyKey), null); }
        catch (error) {
          if (error.status !== 409) throw error;
          record = await connection.get();
        }
      }
    }
    if (record) keyStore.save(response, origin, accountId, null);
    storedKey = keyStore.open(accountId, record?.encryptedKey);
    connected = Boolean(storedKey);
    if (request.method === "GET") return sendJson(response, 200, { connected });
    suppliedKey = typeof body?.apiKey === "string";
    const key = suppliedKey ? body.apiKey.trim() : storedKey;
    usingStoredKey = Boolean(storedKey && key === storedKey);
    if (!key && !suppliedKey) {
      return sendJson(response, 409, { connected: false, error: "Deine Garmin-Verbindung ist nicht mehr im Konto gespeichert. Verbinde Garmin erneut." });
    }
    if (!key || key.length > 2048 || /[\s\p{Cc}]/u.test(key)) {
      return sendJson(response, 400, { connected, error: "Gib einen gültigen persönlichen Garmin API-Schlüssel ein." });
    }
    const token = await garminCall("/personalapitoken-service/personal-api/personal-api-key/token", { Authorization: "ApiKey " + key }, "POST", fetcher);
    const accessToken = token;
    if (typeof accessToken !== "string" || !/^[A-Za-z0-9._~-]+$/.test(accessToken)) throw new Error("Invalid token");
    if (key !== storedKey) {
      record = await connection.write(keyStore.seal(accountId, key), record?.revision ?? null);
      connected = true;
      keyStore.save(response, origin, accountId, null);
    }
    const headers = { Authorization: "Bearer " + accessToken };
    const calendarInput = typeof body?.calendarDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.calendarDate)
      ? new Date(body.calendarDate + "T00:00:00Z") : null;
    const calendarDate = calendarInput?.getUTCFullYear() > 0 &&
      calendarInput.toISOString().slice(0, 10) === body.calendarDate ? body.calendarDate : new Date().toISOString().slice(0, 10);
    const firstDay = new Date(calendarDate + "T00:00:00Z");
    firstDay.setUTCDate(firstDay.getUTCDate() - 6);
    const startDate = firstDay.toISOString().slice(0, 10);
    // Both wellness calls are optional and share the existing Garmin authentication.
    const [activities, summary, stepDays] = await Promise.all([
      garminCall("/activitylist-service/activities/search/activities?activityType=running&start=0&limit=100&sortOrder=desc", headers, "GET", fetcher),
      garminCall("/usersummary-service/usersummary/daily?calendarDate=" + calendarDate, headers, "GET", fetcher).catch(() => null),
      garminCall("/usersummary-service/stats/steps/daily/" + startDate + "/" + calendarDate, headers, "GET", fetcher).catch(() => null),
    ]);
    if (!Array.isArray(activities)) throw new Error("Invalid activities");
    let health = null;
    if (summary?.calendarDate === calendarDate && summary.includesWellnessData === true) {
      const bounded = (n) => metric(n) !== null && n <= 100 ? n : null;
      const rawTime = summary.wellnessEndTimeGmt;
      const measuredAt = typeof rawTime === "string" ? rawTime + (/Z$|[+-]\d{2}:\d{2}$/.test(rawTime) ? "" : "Z") : null;
      health = { calendarDate, measuredAt: Number.isFinite(Date.parse(measuredAt)) ? measuredAt : null,
        bodyBattery: bounded(summary.bodyBatteryMostRecentValue), stress: bounded(summary.averageStressLevel) };
    }
    const steps = {};
    for (let index = 0; index < 7; index++, firstDay.setUTCDate(firstDay.getUTCDate() + 1)) {
      const date = firstDay.toISOString().slice(0, 10);
      const count = Array.isArray(stepDays) ? stepDays.findLast((entry) =>
        entry?.calendarDate === date && Number.isSafeInteger(entry.totalSteps) && entry.totalSteps >= 0)?.totalSteps : undefined;
      if (count !== undefined) steps[date] = count;
    }
    const latest = await connection.get();
    if (latest?.revision !== record.revision) {
      return sendJson(response, 409, { connected: false, error: "Die Garmin-Verbindung wurde auf einem anderen Gerät geändert. Lade die Seite neu." });
    }
    const runs = [...new Map(activities.map(normalizeRun).filter(Boolean).map((run) => [run.id, run])).values()];
    return sendJson(response, 200, { runs, health, steps, syncedAt: new Date().toISOString(), limit: 100, connected: true });
  } catch (error) {
    // An invalid replacement must not remove a previously valid account connection.
    if (error.status === 422 && error.garminAuthentication && usingStoredKey) {
      try { await connection.write(null, record.revision); connected = false; }
      catch (storageError) { error = storageError; connected = false; }
    }
    return sendJson(response, error.status ?? 502, { connected, error: error.status ? error.message : "Die Garmin-Laufdaten konnten nicht geladen werden. Versuche es erneut." });
  }
}

module.exports = handleGarmin;
module.exports.normalizeRun = normalizeRun;
