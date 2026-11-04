(() => {
  const loginStatus = document.querySelector("#login-status");
  if (location.protocol === "file:") {
    loginStatus.textContent = "Starte den lokalen Server und öffne die App darüber, um dich anzumelden.";
    if (trainingPlanner.getLocalPlan()) {
      const exportDraft = document.querySelector("#login-export-draft");
      exportDraft.hidden = false;
      exportDraft.addEventListener("click", trainingPlanner.exportLocalPlan);
    }
    return;
  }

  const loginView = document.querySelector("#login-view");
  const loginTitle = document.querySelector("#login-title");
  const loginRetry = document.querySelector("#login-retry");
  const navigation = document.querySelector(".bottom-nav");
  const auth = document.querySelector("#account-auth");
  const authSubmit = auth.querySelector('button[type="submit"]');
  const authMode = document.querySelector("#account-mode");
  const identityLabel = document.querySelector("#account-identity-label");
  const authHint = document.querySelector("#account-auth-hint");
  const member = document.querySelector("#account-member");
  const userLabel = document.querySelector("#account-user");
  const logout = document.querySelector("#account-logout");
  const planSelect = document.querySelector("#account-plans");
  const openButton = document.querySelector("#account-open");
  const deleteButton = document.querySelector("#account-delete");
  const localImport = document.querySelector("#account-import-local");
  const fileImport = document.querySelector("#account-import-file");
  const retry = document.querySelector("#account-retry");
  const reload = document.querySelector("#account-reload");
  const status = document.querySelector("#account-status");
  const editorStatus = document.querySelector("#plan-status");
  const editor = document.querySelector("#plan-result");
  const createButtons = document.querySelectorAll('#plan-settings button[type="submit"], #plan-manual-form button[type="submit"]');
  let account = null;
  let plans = [];
  let selected = null;
  let register = false;
  let emailAuth = false;
  let busy = false;
  let saving = false;
  let pendingPlan = null;
  let saveError = null;

  async function api(path, method = "GET", data) {
    const headers = {};
    if (method !== "GET") headers["Content-Type"] = "application/json";
    if (account && !["/api/session", "/api/login", "/api/register"].includes(path)) {
      headers["X-Fitness-Account"] = account.id;
    }
    const response = await fetch(path, {
      method, headers, body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(25_000),
    }).catch(() => { throw new Error("Die App ist gerade nicht erreichbar. Versuche es erneut."); });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) {
      const error = new Error(result?.error ?? "Der Server antwortet gerade nicht.");
      error.status = response.status;
      throw error;
    }
    return result;
  }

  function renderControls() {
    const locked = busy || saving || Boolean(pendingPlan);
    auth.inert = busy;
    editor.inert = busy;
    logout.disabled = locked;
    planSelect.disabled = locked || !plans.length;
    openButton.disabled = busy || !selected;
    deleteButton.disabled = locked || !selected;
    localImport.hidden = !trainingPlanner.getLocalPlan();
    localImport.disabled = locked;
    fileImport.inert = locked;
    retry.hidden = !saveError || [401, 404, 409].includes(saveError.status);
    retry.disabled = busy || saving;
    reload.hidden = !saveError;
    reload.disabled = busy || saving;
    for (const button of createButtons) button.disabled = locked;
  }

  function renderPlanSelect() {
    const options = plans.map(({ id, name }) => new Option(name, id));
    planSelect.replaceChildren(...(options.length ? options : [new Option("Noch keine Pläne", "")]));
    planSelect.value = selected?.id ?? "";
    renderControls();
  }

  async function perform(task, allowPending = false) {
    if (busy || saving || (pendingPlan && !allowPending)) return false;
    busy = true;
    status.textContent = "";
    loginStatus.textContent = "";
    renderControls();
    try {
      await task();
      return true;
    } catch (error) {
      (account ? status : loginStatus).textContent = error.message;
      return false;
    } finally {
      busy = false;
      renderControls();
    }
  }

  async function selectPlan(id) {
    selected = id ? await api(`/api/plans/${id}`) : null;
    trainingPlanner.setWorkspace(workspace, selected?.plan);
    renderPlanSelect();
  }

  async function setAccount(next, focus = true) {
    const wasSignedIn = Boolean(account);
    account = next;
    selected = null;
    plans = [];
    pendingPlan = null;
    saveError = null;
    const signedIn = Boolean(account);
    auth.hidden = signedIn;
    member.hidden = !account;
    loginRetry.hidden = true;
    loginStatus.textContent = "";
    loginView.hidden = signedIn;
    appShell.hidden = !signedIn;
    navigation.hidden = !signedIn;
    userLabel.textContent = account ? `Angemeldet als ${account.username}` : "";
    trainingPlanner.setWorkspace(workspace, null);
    renderPlanSelect();
    if (account) {
      renderRoute(focus);
      ({ plans } = await api("/api/plans"));
      await selectPlan(plans[0]?.id);
    } else {
      document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
      document.title = "Anmelden · Fitness-App";
      if (wasSignedIn && focus) loginTitle.focus();
    }
  }

  async function createRecord(plan) {
    selected = await api("/api/plans", "POST", { plan });
    plans.unshift({ id: selected.id, name: selected.plan.name });
    renderPlanSelect();
  }

  async function flush() {
    if (saving || busy || !pendingPlan) return;
    saving = true;
    saveError = null;
    renderControls();
    editorStatus.textContent = "Plan wird im Konto gespeichert …";
    while (pendingPlan) {
      const snapshot = pendingPlan;
      pendingPlan = null;
      try {
        selected = await api(`/api/plans/${selected.id}`, "PUT", { plan: snapshot, version: selected.version });
        const option = plans.find(({ id }) => id === selected.id);
        option.name = selected.plan.name;
        renderPlanSelect();
      } catch (error) {
        pendingPlan ??= snapshot;
        saveError = error;
        status.textContent = `${error.message} Du kannst deine Änderungen vor dem Neuladen als Datei exportieren.`;
        editorStatus.textContent = "Änderungen sind noch offen. Prüfe den Status unter „Mein Konto“.";
        break;
      }
    }
    saving = false;
    if (!saveError) {
      status.textContent = "";
      editorStatus.textContent = "Im Konto gespeichert.";
    }
    renderControls();
  }

  const workspace = {
    create(plan) {
      return perform(async () => {
        await createRecord(plan);
        editorStatus.textContent = "Im Konto gespeichert.";
      });
    },
    save(plan) {
      pendingPlan = plan;
      if (!saveError) flush();
    },
  };

  function renderAuthMode() {
    loginTitle.textContent = register ? "Konto erstellen" : "Anmelden";
    if (!account) document.title = `${loginTitle.textContent} · Fitness-App`;
    authSubmit.textContent = register ? "Registrieren" : "Anmelden";
    authMode.textContent = register ? "Zur Anmeldung" : "Konto erstellen";
    auth.elements.password.autocomplete = register ? "new-password" : "current-password";
    auth.elements.password.minLength = emailAuth && !register ? 1 : 12;
    authHint.hidden = !register;
  }

  function configureAuthMode(mode) {
    if (mode !== "email") return;
    emailAuth = true;
    const input = auth.elements.username;
    identityLabel.textContent = "E-Mail-Adresse";
    input.type = "email";
    input.removeAttribute("minlength");
    input.removeAttribute("pattern");
    input.maxLength = 254;
    authHint.textContent = "Neue Passwörter brauchen mindestens 12 Zeichen. Bestätige nach der Registrierung deine E-Mail-Adresse.";
    renderAuthMode();
  }

  authMode.addEventListener("click", () => {
    register = !register;
    renderAuthMode();
  });
  auth.addEventListener("submit", (event) => {
    event.preventDefault();
    perform(async () => {
      const { user, confirmationRequired } = await api(register ? "/api/register" : "/api/login", "POST", {
        username: auth.elements.username.value,
        password: auth.elements.password.value,
      });
      auth.reset();
      register = false;
      renderAuthMode();
      await setAccount(user);
      if (confirmationRequired) loginStatus.textContent = "Bestätige deine E-Mail-Adresse über den Link im Postfach und melde dich dann an.";
    });
  });
  logout.addEventListener("click", () => perform(async () => {
    await api("/api/logout", "POST", {});
    await setAccount(null);
  }));
  planSelect.addEventListener("change", async () => {
    const id = planSelect.value;
    if (!await perform(() => selectPlan(id))) renderPlanSelect();
  });
  openButton.addEventListener("click", trainingPlanner.focusPlan);
  deleteButton.addEventListener("click", () => {
    if (!selected || !window.confirm(`„${selected.plan.name}“ aus deinem Konto löschen?`)) return;
    perform(async () => {
      await api(`/api/plans/${selected.id}`, "DELETE", { version: selected.version });
      plans = plans.filter(({ id }) => id !== selected.id);
      await selectPlan(null);
      await selectPlan(plans[0]?.id);
      status.textContent = "Plan gelöscht.";
    });
  });
  localImport.addEventListener("click", () => perform(async () => {
    const draft = trainingPlanner.getLocalPlan();
    if (!draft) return;
    await createRecord(draft);
    trainingPlanner.setWorkspace(workspace, selected.plan);
    status.textContent = "Lokaler Entwurf wurde als neuer Plan übernommen.";
  }));
  fileImport.addEventListener("submit", (event) => {
    event.preventDefault();
    perform(async () => {
      const file = fileImport.elements.planFile.files[0];
      if (!file || file.size > 1024 * 1024) throw new Error("Wähle eine Plandatei bis 1 MB aus.");
      const plan = trainingPlanData.normalizePlan(JSON.parse(await file.text().catch(() => "null")));
      if (!plan) throw new Error("Die Datei enthält keinen gültigen Trainingsplan.");
      await createRecord(plan);
      trainingPlanner.setWorkspace(workspace, selected.plan);
      fileImport.reset();
      status.textContent = "Plandatei wurde übernommen.";
    });
  });
  retry.addEventListener("click", flush);
  reload.addEventListener("click", () => {
    if (!window.confirm("Offene Änderungen verwerfen und den Serverstand laden?")) return;
    perform(async () => {
      const { user } = await api("/api/session");
      await setAccount(user);
    }, true);
  });
  window.addEventListener("beforeunload", (event) => {
    if (pendingPlan || saving) event.preventDefault();
  });

  async function checkSession() {
    loginRetry.hidden = true;
    const ok = await perform(async () => {
      loginStatus.textContent = "Anmeldung wird geprüft …";
      const { user, authMode } = await api("/api/session");
      configureAuthMode(authMode);
      await setAccount(user, false);
    });
    if (!ok && !account) {
      loginRetry.hidden = false;
    }
  }

  loginRetry.addEventListener("click", checkSession);
  trainingPlanner.setWorkspace(workspace, null);
  checkSession();
})();
