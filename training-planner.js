const trainingPlanner = (() => {
  const { splits, goals, levels, equipment, limits, normalizePlan, normalizeOptions } = trainingPlanData;
  const { groups, find } = catalogSearch;
  const storageKey = "fitness-app.training-plan.v2";
  const legacyKey = "fitness-app.training-plan.v1";
  const catalog = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]));
  const settings = document.querySelector("#plan-settings");
  const { split, days, goal, level } = settings.elements;
  const manualForm = document.querySelector("#plan-manual-form");
  const equipmentOptions = settings.querySelector(".plan-equipment-options");
  const equipmentCount = settings.querySelector("#plan-equipment-count");
  const status = document.querySelector("#plan-status");
  const notices = document.querySelector("#plan-notices");
  const result = document.querySelector("#plan-result");
  const sessionTemplate = document.querySelector("#plan-session-template");
  const exerciseTemplate = document.querySelector("#plan-exercise-template");
  const addDialog = document.querySelector("#plan-add-dialog");
  const addForm = document.querySelector("#plan-add-form");
  const addSearch = document.querySelector("#plan-add-search");
  const addGroup = document.querySelector("#plan-add-group");
  const addEquipment = document.querySelector("#plan-add-equipment");
  const addStatus = document.querySelector("#plan-add-status");
  const addResults = document.querySelector("#plan-add-results");
  let activeSession;
  let workspace;
  let localPlan = readLocal();
  let plan = localPlan;
  let creating = false;

  function fillSelect(select, options) {
    for (const [value, label] of options) select.add(new Option(label, value));
  }

  function updateDays() {
    days.replaceChildren(...splits[split.value].days.map((day) => new Option(String(day), String(day))));
  }

  function readLocal() {
    try {
      return normalizePlan(JSON.parse(localStorage.getItem(storageKey) ?? localStorage.getItem(legacyKey)));
    } catch {
      return null;
    }
  }

  function writeLocal() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(localPlan));
      return true;
    } catch {
      return false;
    }
  }

  function save(message) {
    const snapshot = normalizePlan(plan);
    if (workspace) {
      workspace.save(snapshot, message);
    } else {
      localPlan = snapshot;
      status.textContent = writeLocal() ? message : "Der Browser konnte den Plan nicht dauerhaft speichern.";
    }
  }

  function watchName(input, object, label) {
    input.value = object.name;
    input.setAttribute("aria-label", label);
    input.addEventListener("change", () => {
      const name = input.value.trim();
      if (name) {
        object.name = name;
        save("Name gespeichert.");
      }
      input.value = object.name;
    });
  }

  function bindOrder(container, prefix, entries, index, focusSelector, label) {
    for (const [action, offset, direction] of [["up", -1, "nach oben"], ["down", 1, "nach unten"]]) {
      const button = container.querySelector(`.${prefix}-${action}`);
      const target = index + offset;
      button.disabled = target < 0 || target >= entries.length;
      button.setAttribute("aria-label", `${label} ${direction} verschieben`);
      button.addEventListener("click", () => {
        [entries[index], entries[target]] = [entries[target], entries[index]];
        renderPlan(focusSelector(target, action));
        save("Reihenfolge gespeichert.");
      });
    }
  }

  function renderExercise(entry, sessionIndex, index) {
    const item = exerciseTemplate.content.firstElementChild.cloneNode(true);
    const session = plan.sessions[sessionIndex];
    const exercise = catalog.get(entry.id);
    const name = exercise?.name ?? entry.name;
    item.dataset.exerciseIndex = index;
    item.querySelector("strong").textContent = name;
    item.querySelector(".exercise-meta").textContent = exercise?.type ?? (entry.equipment || "Eigene Übung");
    for (const field of item.querySelectorAll("input")) {
      field.value = entry[field.name];
      field.setAttribute("aria-label", `${field.name === "sets" ? "Sätze" : "Wiederholungen"} für ${name}`);
      field.addEventListener("change", () => {
        if (field.validity.valid) {
          entry[field.name] = field.valueAsNumber;
          save("Änderungen gespeichert.");
        }
        field.value = entry[field.name];
      });
    }

    const row = `[data-session-index="${sessionIndex}"]`;
    bindOrder(item, "plan-exercise", session.exercises, index,
      (target, action) => `${row} [data-exercise-index="${target}"] .plan-exercise-${action}`, name);
    const remove = item.querySelector(".plan-remove");
    remove.setAttribute("aria-label", `${name} entfernen`);
    remove.addEventListener("click", () => {
      session.exercises.splice(index, 1);
      renderPlan(`${row} .plan-add-button`);
      save("Übung entfernt.");
    });
    return item;
  }

  function openExercisePicker(session) {
    if (session.exercises.length >= limits.exercises) {
      status.textContent = "Diese Einheit hat die maximale Anzahl Übungen erreicht.";
      return;
    }
    activeSession = session;
    addSearch.value = "";
    addGroup.value = "";
    addEquipment.value = "";
    addForm.reset();
    addForm.closest("details").open = false;
    renderPicker();
    addDialog.showModal();
    addDialog.scrollTop = 0;
  }

  function renderPlan(focusSelector) {
    result.replaceChildren();
    if (!plan) return;
    const header = document.createElement("div");
    header.className = "card library-panel plan-result-header";
    const nameLabel = document.createElement("label");
    nameLabel.className = "plan-editor-label";
    nameLabel.textContent = "Name des Trainingsplans";
    const name = document.createElement("input");
    name.maxLength = limits.name;
    name.required = true;
    watchName(name, plan, "Name des Trainingsplans");
    nameLabel.append(name);
    const summary = document.createElement("p");
    summary.className = "planner-note";
    summary.textContent = plan.sessions.length === 1 ? "1 Einheit" : `${plan.sessions.length} Einheiten`;
    const addSession = document.createElement("button");
    addSession.type = "button";
    addSession.className = "plan-button plan-add-session";
    addSession.textContent = "Einheit hinzufügen";
    addSession.disabled = plan.sessions.length >= limits.sessions;
    addSession.addEventListener("click", () => {
      const index = plan.sessions.length;
      plan.sessions.push({ name: `Einheit ${index + 1}`, exercises: [] });
      renderPlan(`[data-session-index="${index}"] .plan-session-name`);
      save("Einheit hinzugefügt.");
    });
    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.className = "plan-button";
    exportButton.textContent = "Plan exportieren";
    exportButton.addEventListener("click", () => exportPlan(plan));
    const actions = document.createElement("div");
    actions.className = "plan-order-controls";
    actions.append(addSession, exportButton);
    header.append(nameLabel, summary, actions);
    result.append(header);

    plan.sessions.forEach((session, index) => {
      const card = sessionTemplate.content.firstElementChild.cloneNode(true);
      card.dataset.sessionIndex = index;
      card.querySelector(".session-label").textContent = `Einheit ${index + 1}`;
      watchName(card.querySelector(".plan-session-name"), session, `Name der Einheit ${index + 1}`);
      const list = card.querySelector("ul");
      list.append(...session.exercises.map((entry, exerciseIndex) => renderExercise(entry, index, exerciseIndex)));
      card.querySelector(".plan-session-empty").hidden = session.exercises.length > 0;
      card.querySelector(".plan-add-button").addEventListener("click", () => openExercisePicker(session));
      bindOrder(card, "plan-session", plan.sessions, index,
        (target, action) => `[data-session-index="${target}"] .plan-session-${action}`, `Einheit ${index + 1}`);
      card.querySelector(".plan-session-remove").addEventListener("click", () => {
        if (session.exercises.length && !window.confirm(`„${session.name}“ mit allen Übungen entfernen?`)) return;
        plan.sessions.splice(index, 1);
        renderPlan(".plan-add-session");
        save("Einheit entfernt.");
      });
      result.append(card);
    });
    if (focusSelector) {
      const control = result.querySelector(focusSelector);
      const fallback = control?.closest(".plan-exercise, .plan-editor-heading")?.querySelector("input");
      (control?.disabled ? fallback : control)?.focus();
    }
  }

  function addExercise(entry) {
    const index = plan.sessions.indexOf(activeSession);
    if (index < 0 || activeSession.exercises.length >= limits.exercises) return;
    activeSession.exercises.push({ ...entry, sets: 3, reps: 10 });
    addDialog.close();
    renderPlan(`[data-session-index="${index}"] .plan-add-button`);
    save("Übung hinzugefügt.");
  }

  function renderPicker() {
    const matches = find(addSearch.value, addGroup.value, addEquipment.value);
    addStatus.textContent = matches.length === 1 ? "1 Übung" : `${matches.length} Übungen`;
    addResults.replaceChildren();
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "planner-note";
      empty.textContent = "Keine passende Übung gefunden. Ändere die Filter oder lege eine eigene Übung an.";
      addResults.append(empty);
    }
    for (const group of groups) {
      const exercises = matches.filter((exercise) => exercise.group === group);
      if (!exercises.length) continue;
      const heading = document.createElement("h3");
      heading.textContent = group;
      const list = document.createElement("ul");
      list.className = "exercise-grid";
      for (const exercise of exercises) {
        const item = document.querySelector("#exercise-template").content.cloneNode(true);
        const button = item.querySelector("button");
        button.removeAttribute("aria-haspopup");
        item.querySelector("strong").textContent = exercise.name;
        item.querySelector(".exercise-meta").textContent = exercise.type;
        item.querySelector(".arrow use").setAttribute("href", "#icon-plus");
        button.addEventListener("click", () => addExercise({ id: exercise.id }));
        list.append(item);
      }
      addResults.append(heading, list);
    }
  }

  function renderNotices(messages = []) {
    notices.hidden = !messages.length;
    notices.querySelector("ul").replaceChildren(...messages.map((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      return item;
    }));
  }

  function focusPlan() {
    result.focus({ preventScroll: true });
    (notices.hidden ? result : notices).scrollIntoView({ block: "start" });
  }

  async function createPlan(nextPlan, messages) {
    if (creating) return;
    if (!workspace && plan && !window.confirm("Den aktuellen lokalen Plan durch einen neuen Plan ersetzen?")) return;
    const currentWorkspace = workspace;
    if (currentWorkspace) {
      creating = true;
      try {
        if (!await currentWorkspace.create(nextPlan) || workspace !== currentWorkspace) return;
      } finally {
        creating = false;
      }
    }
    plan = nextPlan;
    renderPlan();
    renderNotices(messages);
    if (!workspace) save("Trainingsplan gespeichert.");
    focusPlan();
  }

  fillSelect(split, Object.entries(splits).map(([id, entry]) => [id, entry.label]));
  fillSelect(goal, Object.entries(goals));
  fillSelect(level, Object.entries(levels));
  fillSelect(addGroup, groups.map((group) => [group, group]));
  fillSelect(addEquipment, equipment.map((type) => [type, type]));
  fillSelect(addForm.elements.customEquipment, equipment.map((type) => [type, type]));

  for (const type of equipment) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = type;
    label.append(input, type);
    equipmentOptions.append(label);
  }
  function updateEquipmentCount() {
    equipmentCount.textContent = `· ${equipmentOptions.querySelectorAll(":checked").length} von ${equipment.length}`;
  }
  equipmentOptions.addEventListener("change", updateEquipmentCount);
  for (const [selector, checked] of [["#plan-equipment-all", true], ["#plan-equipment-clear", false]]) {
    settings.querySelector(selector).addEventListener("click", () => {
      equipmentOptions.querySelectorAll("input").forEach((input) => { input.checked = checked; });
      updateEquipmentCount();
    });
  }
  function applyOptions(options) {
    split.value = options?.split ?? Object.keys(splits)[0];
    goal.value = options?.goal ?? Object.keys(goals)[0];
    level.value = options?.level ?? Object.keys(levels)[0];
    updateDays();
    if (options) days.value = String(options.days);
    for (const input of equipmentOptions.querySelectorAll("input")) {
      input.checked = !options || options.equipment.includes(input.value);
    }
    updateEquipmentCount();
  }
  applyOptions(plan?.options);
  split.addEventListener("change", updateDays);
  renderPlan();

  document.querySelector("#plan-add-close").addEventListener("click", () => addDialog.close());
  addSearch.addEventListener("input", renderPicker);
  addGroup.addEventListener("change", renderPicker);
  addEquipment.addEventListener("change", renderPicker);
  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = addForm.elements.custom.value.trim();
    if (!name) {
      addForm.elements.custom.value = "";
      addForm.reportValidity();
      return;
    }
    addExercise({ name, equipment: addForm.elements.customEquipment.value });
  });

  settings.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = [...equipmentOptions.querySelectorAll(":checked")].map((input) => input.value);
    const options = normalizeOptions({ split: split.value, days: Number(days.value), goal: goal.value, level: level.value, equipment: selected });
    const generated = options && generateTrainingPlan(options, plan);
    if (!generated) {
      status.textContent = "Wähle mindestens einen Equipment-Typ aus.";
      settings.querySelector(".plan-equipment").open = true;
      equipmentOptions.querySelector("input").focus();
      return;
    }
    createPlan(generated.plan, generated.notices);
  });

  manualForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const field = manualForm.elements.planName;
    const name = field.value.trim();
    if (!name) {
      field.value = "";
      manualForm.reportValidity();
      return;
    }
    createPlan({ name, options: null, sessions: [] });
  });

  function exportPlan(value) {
    const data = JSON.stringify(normalizePlan(value), null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "fitness-trainingsplan.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    getLocalPlan: () => localPlan,
    exportLocalPlan: () => exportPlan(localPlan),
    focusPlan,
    setWorkspace(nextWorkspace, selectedPlan) {
      if (addDialog.open) addDialog.close();
      workspace = nextWorkspace;
      plan = workspace ? normalizePlan(selectedPlan) : localPlan;
      applyOptions(plan?.options);
      status.textContent = "";
      renderNotices();
      renderPlan();
    },
  };
})();
