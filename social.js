const fitnessSocial = (() => {
  const find = (id) => document.getElementById("social-" + id);
  const enableForm = find("enable"), searchForm = find("search"), shareForm = find("share-form");
  const friendDialog = find("friend-dialog"), shareDialog = find("share-dialog");
  const accountDialog = document.querySelector("#account-dialog"), settings = find("settings");
  const categoryFields = [...find("categories").querySelectorAll("input")];
  const labels = { strength: "Krafttraining", cardio: "Cardio", nutrition: "Ernährung" };
  const dayFormat = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric" });
  let context, viewedFriend, selectedWorkout;

  function element(tag, text, className) {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  }

  function button(text, handler) {
    const item = element("button", text, "plan-button");
    item.type = "button";
    item.addEventListener("click", handler);
    return item;
  }

  async function request(ctx, action, payload) {
    const headers = { "X-Fitness-Account": ctx.id };
    if (action) headers["Content-Type"] = "application/json";
    const response = await fetch("/api/social", {
      method: action ? "POST" : "GET", headers, cache: "no-store",
      body: action ? JSON.stringify({ action, payload }) : undefined,
      signal: AbortSignal.any([ctx.controller.signal, AbortSignal.timeout(12000)]),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      const error = new Error(data?.error ?? "Social ist gerade nicht erreichbar.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function week() {
    const from = new Date();
    from.setDate(from.getDate() - (from.getDay() + 6) % 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    return { from: localDateKey(from), to: localDateKey(to) };
  }

  function prettyDate(date) {
    return dayFormat.format(new Date(date + "T12:00:00"));
  }

  function workoutLine(workout) {
    const sets = workout.sets === 1 ? "Satz" : "Sätze";
    return `${workout.name} · ${prettyDate(workout.date)} · ${workout.minutes}\u00a0Min. · ${workout.sets}\u00a0${sets}`;
  }

  function row(title, description, actions = []) {
    const item = element("li");
    const copy = element("div");
    copy.append(element("strong", title));
    if (description) copy.append(element("small", description));
    item.append(copy);
    if (actions.length) {
      const controls = element("div", undefined, "social-row-actions");
      controls.append(...actions);
      item.append(controls);
    }
    return item;
  }

  function friendHandles(state) {
    return (state?.connections ?? []).filter(({ status }) => status === "friend").map(({ handle }) => handle);
  }

  function renderActivity(ctx) {
    const state = ctx?.state, activity = ctx?.activity;
    const enabled = state?.profile?.enabled === true;
    const friends = new Set(friendHandles(state));
    const entries = enabled && !ctx.loadError
      ? (activity?.entries ?? []).filter(({ handle }) => friends.has(handle)) : [];
    const list = find("activity-list");
    list.replaceChildren(...entries.map((workout) => row(workout.handle, workoutLine(workout))));
    list.hidden = !entries.length;
    find("activity-context").hidden = !entries.length;

    let message = "";
    if (ctx?.loadError) message = ctx.message;
    else if (!state) message = "Aktivitäten werden geladen …";
    else if (!enabled) message = "Schalte Social ein, um geteilte Trainings deiner Freunde zu sehen.";
    else if (!friends.size) message = "Füge Freunde hinzu. Trainings, die sie mit dir teilen, erscheinen hier.";
    else if (activity?.failed) message = entries.length
      ? "Einige Aktivitäten konnten gerade nicht geladen werden." : "Aktivitäten konnten gerade nicht geladen werden.";
    else if (!entries.length) message = !activity || activity.loading
      ? "Aktivitäten werden geladen …" : "Deine Freunde haben noch keine Trainings mit dir geteilt.";
    find("activity-status").textContent = message;
    find("open-settings").hidden = !state || enabled || Boolean(ctx?.loadError);
    find("activity-retry").hidden = !ctx?.loadError && !activity?.failed;
  }

  async function refreshActivity(ctx) {
    if (ctx !== context || ctx.busy || ctx.loadError || location.hash !== "#social" || !ctx.state?.profile?.enabled) return;
    const handles = friendHandles(ctx.state);
    if (!handles.length) return;
    const key = handles.join("\n");
    if (ctx.activity?.key === key && ctx.activity.loading) return;
    const activity = { key, entries: ctx.activity?.entries ?? [], loading: true };
    ctx.activity = activity;
    renderActivity(ctx);

    const entries = [];
    const { from } = week();
    for (let start = 0; start < handles.length; start += 4) {
      const results = await Promise.allSettled(handles.slice(start, start + 4)
        .map((handle) => request(ctx, "friend", { handle, week: from })));
      if (ctx !== context || activity !== ctx.activity) return;
      for (const result of results) {
        if (result.status === "fulfilled") {
          const { handle, shares } = result.value;
          entries.push(...shares.map((workout) => ({ ...workout, handle })));
        } else if (result.reason.status !== 404) activity.failed = true;
      }
    }
    activity.entries = entries.sort((left, right) => right.date.localeCompare(left.date)).slice(0, 5);
    activity.loading = false;
    renderActivity(ctx);
  }

  function renderConnections(ctx) {
    const connections = ctx.state?.connections ?? [];
    const sections = [["friend", "Deine Freunde"], ["incoming", "Eingehende Anfragen"], ["outgoing", "Gesendete Anfragen"]];
    find("connections").replaceChildren(...sections.map(([status, title]) => {
      const section = element("section");
      const list = element("ul", undefined, "entry-list");
      section.append(element("h3", title), list);
      for (const { handle } of connections.filter((entry) => entry.status === status)) {
        const actions = status === "friend" ? [
          button("Profil ansehen", () => openFriend(handle)),
          button("Entfernen", async ({ currentTarget }) => {
            if (await actionDialog.confirm(currentTarget, "Freund entfernen", "Die Freundschaft mit " + handle +
              " und die zwischen euch geteilten Trainings werden entfernt.", "Freund entfernen") && ctx === context) {
              perform("remove", { handle }, "Freund entfernt.");
            }
          }),
        ] : status === "incoming" ? [
          button("Annehmen", () => perform("accept", { handle }, "Freundschaft bestätigt.")),
          button("Ablehnen", () => perform("decline", { handle }, "Anfrage abgelehnt.")),
        ] : [button("Zurückziehen", () => perform("cancel", { handle }, "Anfrage zurückgezogen."))];
        list.append(row(handle, "", actions));
      }
      if (!list.children.length) section.append(element("p", "Keine Einträge.", "planner-note"));
      return section;
    }));
  }

  function render() {
    const ctx = context, state = ctx?.state, profile = state?.profile;
    const enabled = profile?.enabled === true;
    enableForm.hidden = !state || Boolean(profile);
    find("profile").hidden = !profile;
    find("handle").textContent = profile?.handle ?? "";
    find("enabled-state").textContent = enabled ? "Social ist eingeschaltet" : "Social ist ausgeschaltet";
    find("toggle").textContent = enabled ? "Social ausschalten" : "Social wieder einschalten";
    find("toggle").disabled = Boolean(ctx?.busy);
    find("categories").hidden = !enabled;
    find("categories").disabled = Boolean(ctx?.busy);
    find("shared").hidden = !enabled;
    find("content").hidden = !enabled;
    find("retry").hidden = !ctx?.loadError;
    find("status").textContent = ctx?.loadError || (accountDialog.open && settings.open) ? "" : ctx?.message ?? "";
    find("settings-status").textContent = ctx?.message ?? "";
    find("sync-status").textContent = enabled ? ctx.syncMessage ?? "" : "";
    for (const field of categoryFields) field.checked = profile?.categories[field.name] === true;
    for (const form of [enableForm, searchForm, shareForm]) {
      form.querySelector('button[type="submit"]').disabled = Boolean(ctx?.busy);
    }

    const sharing = enabled && profile.categories.strength;
    strengthDashboard.setSocialShare(sharing ? openShare : null);
    if (!enabled && friendDialog.open) friendDialog.close();
    if (!sharing && shareDialog.open) shareDialog.close();
    if (ctx && !enabled) ctx.activity = undefined;
    renderActivity(ctx);
    if (!ctx || !enabled) {
      for (const id of ["match", "connections", "shares"]) find(id).replaceChildren();
      return;
    }

    const { match } = ctx;
    const linked = state.connections.some(({ handle }) => handle === match);
    find("match").hidden = !match;
    find("match").replaceChildren(...(match ? [row(match, linked ? "Bereits verbunden oder angefragt." : "",
      linked ? [] : [button("Anfrage senden", () => perform("request", { handle: match }, "Freundschaftsanfrage gesendet."))])] : []));
    renderConnections(ctx);
    const shares = state.shares;
    find("shares-empty").textContent = !sharing ? "Krafttraining ist privat." : shares.length ? "" : "Du hast noch kein Training geteilt.";
    find("shares").replaceChildren(...shares.map((workout) => row(workoutLine(workout),
      workout.recipients?.join(", ") || "Derzeit für keinen Freund sichtbar.", [
        button("Freigabe zurückziehen", () => perform("withdraw", { id: workout.id }, "Trainingsfreigabe zurückgezogen.")),
      ])));
  }

  function applyState(ctx, state) {
    if (ctx !== context) return;
    ctx.loadError = false;
    if (ctx.activity && ctx.activity.key !== friendHandles(state).join("\n")) ctx.activity = undefined;
    ctx.state = state;
    render();
    queueStats();
  }

  async function reload(ctx = context) {
    if (!ctx || ctx.busy || ctx.loading) return;
    ctx.loading = true;
    try {
      const state = await request(ctx);
      if (ctx === context && !ctx.busy && (ctx.loadError || JSON.stringify(state) !== JSON.stringify(ctx.state))) {
        ctx.message = "";
        applyState(ctx, state);
      }
    } catch (error) {
      if (ctx === context && !ctx.busy) {
        ctx.loadError = true;
        ctx.activity = undefined;
        ctx.message = error.message;
        render();
      }
    } finally {
      ctx.loading = false;
      refreshActivity(ctx);
    }
  }

  async function perform(action, payload, success, feedback = find("status")) {
    const ctx = context;
    if (!ctx || ctx.busy) return false;
    ctx.busy = true;
    ctx.message = "";
    feedback.textContent = "";
    render();
    try {
      const result = await request(ctx, action, payload);
      if (ctx !== context) return false;
      if (action === "find") ctx.match = result.handle;
      else applyState(ctx, await request(ctx));
      if (ctx !== context) return false;
      ctx.message = success;
      return true;
    } catch (error) {
      if (ctx === context) {
        if (action === "find") ctx.match = null;
        if (error.status === 409) {
          try { applyState(ctx, await request(ctx)); } catch { /* Show the original conflict. */ }
        }
        if (ctx === context) {
          if (feedback === find("status")) ctx.message = error.message;
          else feedback.textContent = error.message;
        }
      }
      return false;
    } finally {
      ctx.busy = false;
      if (ctx === context) {
        render();
        if (action !== "find") refreshActivity(ctx);
      }
    }
  }

  function queueStats() {
    const ctx = context;
    if (!ctx?.state?.profile?.enabled) return;
    clearTimeout(ctx.syncTimer);
    ctx.syncTimer = setTimeout(() => syncStats(ctx), 350);
  }

  async function syncStats(ctx) {
    const profile = ctx.state?.profile;
    if (ctx !== context || !profile?.enabled) return;
    if (ctx.syncing) {
      ctx.syncAgain = true;
      return;
    }
    const selected = Object.keys(labels).filter((category) => profile.categories[category]);
    if (!selected.length) return;
    const period = week();
    const sources = dailyTracking.getSocialEntries();
    sources.strength = strengthDashboard.getSocialWorkouts().filter(({ sets }) => sets > 0)
      .map(({ id, date, sets }) => ({ id, date, value: sets }));
    sources.cardio.push(...cardioGarmin.getSnapshot().runs.map(({ id, start, duration }) =>
      ({ id: "garmin:" + id, date: localDateKey(new Date(start)), value: duration == null ? null : duration / 60 })));
    const entries = Object.fromEntries(selected.map((category) => [category, [...new Map(sources[category]
      .filter(({ id, date, value }) => typeof id === "string" && /^[A-Za-z0-9:_-]{1,80}$/.test(id) &&
        date >= period.from && date <= period.to && ((category === "cardio" && value === null) || (Number.isFinite(value) && value >= 0)))
      .map(({ id, value }) => [id, value === null ? null : Math.min(9999, Math.round(value))])).entries()].slice(-1500)]));
    const payload = { week: period.from, device: ctx.device, revision: profile.revision, entries };
    const signature = JSON.stringify(payload);
    if (signature === ctx.lastSync) return;
    ctx.syncing = true;
    try {
      await request(ctx, "stats", payload);
      if (ctx === context && ctx.state.profile?.revision === profile.revision) {
        ctx.lastSync = signature;
        ctx.syncMessage = "";
        find("sync-status").textContent = "";
      }
    } catch (error) {
      if (ctx === context && ctx.state.profile?.revision === profile.revision) {
        ctx.syncMessage = "Wochenstatistik konnte noch nicht aktualisiert werden. " + error.message;
        find("sync-status").textContent = ctx.syncMessage;
        if (error.status === 409 || error.status === 403) reload(ctx);
      }
    } finally {
      ctx.syncing = false;
      if (ctx === context && (ctx.syncAgain || ctx.state.profile?.revision !== profile.revision)) queueStats();
      ctx.syncAgain = false;
    }
  }

  async function refreshFriend() {
    const ctx = context, view = viewedFriend;
    if (!ctx || !view || !friendDialog.open || view.loading) return;
    view.loading = true;
    const period = week();
    try {
      const friend = await request(ctx, "friend", { handle: view.handle, week: period.from });
      if (ctx !== context || view !== viewedFriend || !friendDialog.open) return;
      find("friend-status").textContent = Object.keys(friend.stats).length ? "" : "Für diese Woche sind keine Kategorien freigegeben.";
      find("friend-week").textContent = prettyDate(friend.week) + " bis " + prettyDate(period.to);
      const details = {
        strength: ({ count, total }) => count + " Einheiten · " + total + " Sätze",
        cardio: ({ count, total, missing }) => count + " Aktivitäten · " +
          (count && missing === count ? "Dauer fehlt" : total + " Min." + (missing ? " · Bei " + missing + " fehlt die Dauer" : "")),
        nutrition: ({ count }) => count + " erfasste Mahlzeiten",
      };
      find("friend-stats").replaceChildren(...Object.entries(labels).filter(([key]) => Object.hasOwn(friend.stats, key))
        .map(([key, label]) => {
          const group = element("div");
          group.append(element("dt", label), element("dd", friend.stats[key] ? details[key](friend.stats[key]) : "Noch keine Daten synchronisiert"));
          return group;
        }));
      find("friend-shares").replaceChildren(...friend.shares.map((workout) => row(workoutLine(workout))));
      find("friend-shares-empty").textContent = friend.shares.length ? "" : "Keine Trainings mit dir geteilt.";
    } catch (error) {
      if (ctx === context && view === viewedFriend && friendDialog.open) {
        clearFriend();
        find("friend-status").textContent = error.message;
      }
    } finally {
      view.loading = false;
    }
  }

  function clearFriend() {
    for (const id of ["friend-status", "friend-week", "friend-shares-empty"]) find(id).textContent = "";
    for (const id of ["friend-stats", "friend-shares"]) find(id).replaceChildren();
  }

  function openFriend(handle) {
    viewedFriend = { handle };
    clearFriend();
    find("friend-title").textContent = handle;
    find("friend-status").textContent = "Wochenübersicht wird geladen …";
    if (!friendDialog.open) friendDialog.showModal();
    refreshFriend();
  }

  async function openShare(id) {
    const ctx = context;
    await reload(ctx);
    if (!ctx || ctx !== context || !ctx.state?.profile?.enabled || !ctx.state.profile.categories.strength) return;
    selectedWorkout = strengthDashboard.getSocialWorkouts().find((entry) => entry.id === id);
    if (!selectedWorkout) return;
    find("share-preview").textContent = workoutLine(selectedWorkout);
    const friends = friendHandles(ctx.state);
    find("share-status").textContent = friends.length ? "" : "Füge zuerst im Social-Bereich Freunde hinzu.";
    find("recipients").replaceChildren(...friends.map((handle) => {
      const label = element("label");
      const input = element("input");
      input.type = "checkbox";
      input.value = handle;
      label.append(input, handle);
      return label;
    }));
    if (!shareDialog.open) shareDialog.showModal();
  }

  enableForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (await perform("enable", { name: enableForm.elements.name.value }, "Social ist eingeschaltet.")) {
      enableForm.reset();
      if (accountDialog.open && settings.open) find("toggle").focus({ preventScroll: true });
    }
  });
  find("toggle").addEventListener("click", async ({ currentTarget }) => {
    const ctx = context, profile = ctx?.state?.profile;
    if (!profile) return;
    if (profile.enabled && !await actionDialog.confirm(currentTarget, "Social ausschalten",
      "Dein Profil und deine Wochenstatistiken werden privat. Geteilte Trainings werden zurückgezogen. Dein Nutzername und deine Freundschaften bleiben gespeichert.",
      "Social ausschalten")) return;
    if (ctx === context) perform("settings", { enabled: !profile.enabled, revision: profile.revision },
      profile.enabled ? "Social ist ausgeschaltet." : "Social ist eingeschaltet. Deine Kategorien sind privat.");
  });
  find("categories").addEventListener("change", async ({ target }) => {
    const ctx = context, profile = ctx?.state?.profile;
    if (!profile?.enabled || !Object.hasOwn(labels, target.name)) return;
    const checked = target.checked;
    if (target.name === "strength" && !checked && ctx.state.shares.length &&
      !await actionDialog.confirm(target, "Krafttraining privat machen",
        "Deine Krafttrainingsstatistik wird privat. Bisher geteilte Trainings werden zurückgezogen.", "Privat machen")) {
      if (ctx === context) render();
      return;
    }
    if (ctx === context) perform("settings", {
      enabled: true, revision: profile.revision, categories: { ...profile.categories, [target.name]: checked },
    }, labels[target.name] + (checked ? " ist für Freunde freigegeben." : " ist jetzt privat."));
  });
  find("copy").addEventListener("click", async () => {
    const ctx = context;
    const handle = ctx?.state?.profile?.handle;
    if (!handle) return;
    let message = "Nutzername kopiert.";
    try { await navigator.clipboard.writeText(handle); }
    catch { message = "Markiere deinen Nutzernamen, um ihn zu kopieren."; }
    if (ctx === context) find("settings-status").textContent = ctx.message = message;
  });
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    perform("find", { handle: searchForm.elements.handle.value.trim() }, "");
  });
  shareForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const ctx = context;
    const recipients = [...find("recipients").querySelectorAll(":checked")].map(({ value }) => value);
    if (!ctx || !selectedWorkout || !recipients.length || recipients.length > 25) {
      find("share-status").textContent = "Wähle 1–25 Freunde aus.";
      return;
    }
    if (await perform("share", { ...selectedWorkout, recipients, revision: ctx.state.profile.revision },
      "Training geteilt.", find("share-status")) && ctx === context) {
      shareDialog.close();
      document.querySelector("#strength-status").textContent = "Training geteilt.";
    }
  });
  friendDialog.addEventListener("close", () => {
    if (!friendDialog.open) {
      viewedFriend = null;
      clearFriend();
    }
  });
  find("retry").addEventListener("click", () => reload());
  find("activity-retry").addEventListener("click", () => reload());
  find("open-settings").addEventListener("click", () => {
    settings.open = true;
    accountDialog.showModal();
    settings.querySelector("summary").focus();
  });
  settings.addEventListener("toggle", () => {
    if (settings.open && accountDialog.open) reload();
  });
  accountDialog.addEventListener("close", () => {
    if (!accountDialog.open) settings.open = false;
  });
  for (const name of ["fitness:workoutchange", "fitness:dailychange", "fitness:garminchange"]) document.addEventListener(name, queueStats);
  window.addEventListener("hashchange", () => {
    if (location.hash === "#social") {
      renderActivity(context);
      reload();
    } else {
      if (context) context.activity = undefined;
      if (friendDialog.open) friendDialog.close();
    }
    if (location.hash !== "#krafttraining" && shareDialog.open) shareDialog.close();
  });
  window.addEventListener("focus", () => {
    if (location.hash === "#social") reload();
    refreshFriend();
    queueStats();
  });
  window.setInterval(() => {
    if (!document.hidden) {
      if (location.hash === "#social") reload();
      refreshFriend();
    }
    queueStats();
  }, 30000);

  return {
    setAccount(id) {
      if (context?.id === id) return;
      if (context) {
        context.controller.abort();
        clearTimeout(context.syncTimer);
      }
      if (shareDialog.open) shareDialog.close();
      if (friendDialog.open) friendDialog.close();
      viewedFriend = selectedWorkout = null;
      clearFriend();
      find("friend-title").textContent = "";
      find("share-preview").textContent = "";
      find("share-status").textContent = "";
      find("recipients").replaceChildren();
      searchForm.reset();
      enableForm.reset();
      let device = id ? crypto.randomUUID() : null;
      if (id) {
        try {
          const key = "fitness-app.social-device.v1." + id;
          const stored = localStorage.getItem(key);
          if (/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(stored)) device = stored;
          else localStorage.setItem(key, device);
        } catch { /* Keep a device ID for this session when storage is unavailable. */ }
      }
      context = id ? { id, device, controller: new AbortController(), message: "Social wird geladen …" } : null;
      render();
      reload();
    },
  };
})();
