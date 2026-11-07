// Official Garmin Connect Personal API. Keys live in account-bound encrypted HttpOnly cookies.
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
    throw error;
  }
  return method === "POST" ? (await response.text()).trim() : response.json();
}

async function handleGarmin(request, response, origin, handleAccounts, fetcher = fetch) {
  if (!["GET", "POST"].includes(request.method)) return sendJson(response, 405, { error: "Verwende die Synchronisierung im Cardio-Bereich." });
  // Reuse existing local/Supabase session validation, including refreshed session cookies.
  let session;
  let sessionStatus;
  await handleAccounts({ headers: request.headers, method: "GET" }, response, "/api/session", (_res, status, data) => {
    sessionStatus = status;
    session = data;
  }, origin);
  if (sessionStatus !== 200 || !session?.user) return sendJson(response, 401, { error: "Melde dich erneut in der Fitness-App an." });
  if (request.headers["x-fitness-account"] !== session.user.id) {
    return sendJson(response, 409, { error: "Das aktive Konto hat sich geändert. Lade die Seite neu." });
  }
  const storedKey = keyStore.read(request, session.user.id);
  if (request.method === "GET") return sendJson(response, 200, { connected: Boolean(storedKey) });
  const body = await readJson(request);
  if (body?.action === "disconnect") {
    keyStore.save(response, origin, session.user.id, null);
    return sendJson(response, 200, { connected: false });
  }
  const key = typeof body?.apiKey === "string" ? body.apiKey.trim() : storedKey;
  if (!key || key.length > 2048 || /[\s\p{Cc}]/u.test(key)) {
    return sendJson(response, 400, { error: "Gib einen gültigen persönlichen Garmin API-Schlüssel ein." });
  }
  let keySaved = Boolean(storedKey);
  try {
    const token = await garminCall("/personalapitoken-service/personal-api/personal-api-key/token", { Authorization: "ApiKey " + key }, "POST", fetcher);
    const accessToken = token;
    if (typeof accessToken !== "string" || !/^[A-Za-z0-9._~-]+$/.test(accessToken)) throw new Error("Invalid token");
    keyStore.save(response, origin, session.user.id, key);
    keySaved = true;
    const activities = await garminCall("/activitylist-service/activities/search/activities?activityType=running&start=0&limit=100&sortOrder=desc", { Authorization: "Bearer " + accessToken }, "GET", fetcher);
    if (!Array.isArray(activities)) throw new Error("Invalid activities");
    const runs = [...new Map(activities.map(normalizeRun).filter(Boolean).map((run) => [run.id, run])).values()];
    return sendJson(response, 200, { runs, syncedAt: new Date().toISOString(), limit: 100, connected: true });
  } catch (error) {
    if (error.status === 422) { keyStore.save(response, origin, session.user.id, null); keySaved = false; }
    return sendJson(response, error.status ?? 502, { connected: keySaved, error: error.status ? error.message : "Die Garmin-Laufdaten konnten nicht geladen werden. Versuche es erneut." });
  }
}

module.exports = handleGarmin;
module.exports.normalizeRun = normalizeRun;
