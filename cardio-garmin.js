const cardioGarmin = (() => {
  const root = document.querySelector("#garmin-cardio");
  const find = (id) => root.querySelector("#garmin-" + id);
  const form = find("connect-form");
  const keyInput = find("key");
  const status = find("status");
  const number = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
  const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });
  let accountId = null;
  let connected = false;
  let saved = { runs: [], syncedAt: null };
  let controller = null;
  let revision = 0;
  let syncError = false;
  const cacheKey = () => "fitness-app.cardio.garmin.v1." + accountId;
  const valid = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
  const readSteps = (value) => Object.fromEntries(Object.entries(value ?? {}).filter(([date, count]) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isSafeInteger(count) && count >= 0));
  const distance = (meters) => valid(meters) ? number.format(meters / 1000) + " km" : "–";
  function duration(seconds) {
    if (!valid(seconds)) return "–";
    const total = Math.round(seconds);
    return total >= 3600 ? `${Math.floor(total / 3600)}:${String(Math.floor(total / 60) % 60).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
      : `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }
  function pace(seconds, meters) {
    if (!valid(seconds) || !valid(meters) || meters === 0 || seconds === 0) return "–";
    return duration(Math.round(seconds / (meters / 1000))) + " /km";
  }
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function runCard(run) {
    const item = element("li", undefined, "garmin-run");
    const time = element("time", dateFormat.format(new Date(run.start)));
    time.dateTime = run.start;
    const title = element("h4", run.name);
    const metrics = element("dl");
    for (const [label, value] of [
      ["Distanz", distance(run.distance)], ["Dauer", duration(run.duration)], ["Ø Pace", pace(run.duration, run.distance)],
      ["Ø Puls", valid(run.averageHR) && run.averageHR > 0 ? Math.round(run.averageHR) + " bpm" : "–"],
      ["Höhenmeter", valid(run.elevationGain) ? number.format(run.elevationGain) + " m" : "–"],
      ["Kalorien", valid(run.calories) ? number.format(run.calories) + " kcal" : "–"],
    ]) {
      const group = element("div");
      group.append(element("dt", label), element("dd", value));
      metrics.append(group);
    }
    const link = element("a", "In Garmin Connect ansehen");
    link.href = "https://connect.garmin.com/modern/activity/" + run.id;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    item.append(time, title, metrics, link, element("span", run.device ? "Garmin · " + run.device : "Garmin", "garmin-source"));
    return item;
  }
  function render() {
    const busy = Boolean(controller);
    form.querySelector("button").disabled = busy || !accountId;
    keyInput.disabled = busy || !accountId;
    find("sync").hidden = !connected;
    find("sync").disabled = busy;
    find("disconnect").hidden = !connected && !saved.syncedAt;
    find("disconnect").disabled = busy;
    find("state").textContent = connected ? "Verbunden · Im Konto gespeichert" : saved.syncedAt ? "Gespeicherte Laufdaten" : "Nicht verbunden";
    find("state").dataset.connected = String(connected);
    const health = saved.health;
    find("battery").textContent = valid(health?.bodyBattery) && health.bodyBattery <= 100 ? number.format(health.bodyBattery) + " / 100" : "–";
    find("stress").textContent = valid(health?.stress) && health.stress <= 100 ? number.format(health.stress) + " / 100" : "–";
    find("health-time").textContent = Number.isFinite(Date.parse(health?.measuredAt)) ? "Uhrdaten vom " + dateFormat.format(new Date(health.measuredAt)) + " · Anpassung nur mit höchstens 6 Stunden alten Daten" : "Keine aktuellen Garmin-Erholungsdaten verfügbar.";
    const minutes = Number(find("base-minutes").value);
    const advice = cardioRecommendation(health, [20, 30, 45, 60].includes(minutes) ? minutes : 30);
    const recommendation = find("recommendation");
    recommendation.dataset.level = advice.level;
    recommendation.replaceChildren(element("h4", advice.title), element("p", `${advice.minutes} Minuten · ${advice.intensity}`), element("p", advice.reason, "planner-note"));
    const period = find("period").value;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - Number(period) + 1);
    const runs = saved.runs.filter((run) => period === "all" || new Date(run.start) >= cutoff).sort((a, b) => b.start.localeCompare(a.start));
    const totalDistance = runs.reduce((sum, run) => sum + (run.distance ?? 0), 0);
    const totalDuration = runs.reduce((sum, run) => sum + (run.duration ?? 0), 0);
    // Pace only combines runs for which both measurements exist.
    const timed = runs.filter((run) => valid(run.distance) && run.distance > 0 && valid(run.duration) && run.duration > 0);
    find("total-runs").textContent = number.format(runs.length);
    find("total-distance").textContent = distance(totalDistance);
    find("total-duration").textContent = duration(totalDuration);
    find("total-pace").textContent = pace(timed.reduce((sum, run) => sum + run.duration, 0), timed.reduce((sum, run) => sum + run.distance, 0));
    find("runs").replaceChildren(...runs.map(runCard));
    find("empty").hidden = runs.length > 0;
    find("empty").textContent = saved.syncedAt ? "Keine Garmin-Läufe in diesem Zeitraum. Wähle einen anderen Zeitraum oder synchronisiere erneut."
      : connected ? (busy ? "Garmin-Läufe werden geladen …" : "Tippe auf „Jetzt synchronisieren“, um deine Garmin-Läufe zu laden.")
        : "Verbinde Garmin, um deine Laufdaten zu laden.";
    find("updated").textContent = saved.syncedAt ? "Zuletzt geladen: " + dateFormat.format(new Date(saved.syncedAt)) + " · Bis zu 100 letzte Läufe · Auf diesem Gerät gespeichert" : "";
    root.setAttribute("aria-busy", String(busy));
    if (typeof document.dispatchEvent === "function") document.dispatchEvent(new Event("fitness:garminchange"));
  }
  async function sync(key) {
    if (controller || !accountId) return;
    revision++;
    const currentRevision = revision;
    const currentAccount = accountId;
    controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]);
    syncError = false;
    status.textContent = "Läufe und Schritte werden von Garmin geladen …";
    render();
    try {
      const response = await fetch("/api/garmin", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Fitness-Account": currentAccount },
        body: JSON.stringify({ apiKey: key, calendarDate: new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0") + "-" + String(new Date().getDate()).padStart(2, "0") }), signal,
      });
      const result = await response.json().catch(() => null);
      if (currentRevision !== revision) return;
      if (!response.ok) {
        if (typeof result?.connected === "boolean") connected = result.connected;
        if (response.status === 422 || !connected) find("setup").open = true;
        throw new Error(result?.error ?? "Garmin konnte nicht verbunden werden.");
      }
      if (!Array.isArray(result?.runs) || !Number.isFinite(Date.parse(result.syncedAt))) throw new Error("Ungültige Antwort beim Laden der Laufdaten.");
      saved = { runs: result.runs, syncedAt: result.syncedAt, health: result.health ?? null, steps: readSteps(result.steps) };
      connected = true;
      keyInput.value = "";
      find("setup").open = false;
      status.textContent = `${saved.runs.length} Läufe geladen.` +
        (Object.keys(saved.steps).length ? " Garmin-Schritte aktualisiert." : " Garmin hat keine Schrittwerte geliefert.");
      try { localStorage.setItem(cacheKey(), JSON.stringify(saved)); }
      catch { status.textContent += " Der Browser konnte sie nicht dauerhaft speichern."; }
    } catch (error) {
      if (currentRevision !== revision) return;
      syncError = true;
      status.textContent = error.name === "TimeoutError" ? "Die Anfrage dauert zu lange. Versuche es erneut." : error.message || "Verbindung fehlgeschlagen. Versuche es erneut.";
    } finally {
      if (currentRevision === revision) { controller = null; render(); }
    }
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (form.reportValidity()) {
      const key = keyInput.value.trim();
      keyInput.value = "";
      sync(key);
    }
  });
  find("sync").addEventListener("click", () => sync());
  find("period").addEventListener("change", render);
  find("base-minutes").addEventListener("change", render);
  // Re-evaluate freshness after a background tab resumes or the clock advances.
  if (typeof window !== "undefined") {
    window.addEventListener("focus", render);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && connected) sync();
    });
    setInterval(() => { if (accountId) render(); }, 60000);
  }
  find("disconnect").addEventListener("click", async () => {
    if (controller || !accountId) return;
    const account = accountId;
    const version = revision;
    controller = new AbortController();
    render();
    try {
      const response = await fetch("/api/garmin", { method: "POST", headers: { "Content-Type": "application/json", "X-Fitness-Account": account }, body: JSON.stringify({ action: "disconnect" }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]) });
      if (version !== revision) return;
      if (!response.ok) throw new Error("Der gespeicherte Garmin-Schlüssel konnte nicht entfernt werden. Versuche es erneut.");
    } catch (error) {
      if (version === revision) { controller = null; status.textContent = error.message; render(); }
      return;
    }
    revision++;
    controller?.abort();
    controller = null;
    connected = false;
    keyInput.value = "";
    saved = { runs: [], syncedAt: null };
    try { localStorage.removeItem(cacheKey()); status.textContent = "Garmin vom Konto getrennt. Der Schlüssel wurde für alle Geräte entfernt und die Laufdaten auf diesem Gerät gelöscht."; }
    catch { status.textContent = "Verbindung getrennt. Gespeicherte Laufdaten konnten nicht entfernt werden. Lösche sie über die Browser-Einstellungen."; }
    find("setup").open = true;
    render();
  });
  return {
    getSnapshot: () => ({ ...saved, connected, busy: Boolean(controller), error: syncError }),
    sync,
    setAccount(id) {
      revision++;
      controller?.abort();
      controller = null;
      accountId = id ?? null;
      syncError = false;
      connected = false;
      keyInput.value = "";
      saved = { runs: [], syncedAt: null };
      if (accountId) {
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey()));
          if (Array.isArray(cached?.runs) && Number.isFinite(Date.parse(cached.syncedAt))) {
            saved = { health: cached.health ?? null, syncedAt: cached.syncedAt, steps: readSteps(cached.steps), runs: cached.runs.filter((run) =>
              /^\d+$/.test(run?.id) && typeof run.name === "string" && typeof run.start === "string" && Number.isFinite(Date.parse(run.start)) &&
              [run.distance, run.duration, run.averageHR, run.maxHR, run.elevationGain, run.calories].every((value) => value === null || valid(value))) };
          }
        } catch { /* A disabled storage area or damaged cache starts with an empty view. */ }
      }
      status.textContent = "";
      find("setup").open = true;
      render();
      if (accountId) {
        const version = revision;
        controller = new AbortController();
        status.textContent = "Gespeicherte Garmin-Verbindung wird aus deinem Konto geladen …";
        render();
        fetch("/api/garmin", { headers: { "X-Fitness-Account": accountId }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]) })
          .then((response) => { if (!response.ok) throw new Error("Die gespeicherte Garmin-Verbindung konnte nicht geprüft werden."); return response.json(); })
          .then((result) => { if (version === revision) { connected = result.connected === true; find("setup").open = !connected; status.textContent = ""; } })
          .catch((error) => { if (version === revision) { syncError = true; status.textContent = error.message; } })
          .finally(() => {
            if (version !== revision) return;
            controller = null;
            if (connected && !document.hidden) sync();
            else render();
          });
      }
    },
  };
})();
