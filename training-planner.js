const trainingPlanner = (() => {
  const { splits, goals, levels, equipment, limits, sessionTime, estimateMinutes, normalizePlan } = trainingPlanData;
  const { groups, find } = catalogSearch;
  const storageKey = "fitness-app.training-plan.v2";
  const legacyKey = "fitness-app.training-plan.v1";
  const catalog = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]));
  const settings = document.querySelector("#plan-settings");
  const settingsDialog = document.querySelector("#plan-settings-dialog");
  const settingsStatus = document.querySelector("#plan-settings-status");
  const durationOutput = document.querySelector("#plan-minutes-value");
  const { split, days, goal, level, minutes } = settings.elements;
  const manualForm = document.querySelector("#plan-manual-form");
  const equipmentOptions = settings.querySelector(".plan-equipment-options");
  const equipmentCount = settings.querySelector("#plan-equipment-count");
  const status = document.querySelector("#plan-status");
  const notices = document.querySelector("#plan-notices");
  const result = document.querySelector("#plan-result");
  const sessionTemplate = document.querySelector("#plan-session-template");
  const exerciseTemplate = document.querySelector("#plan-exercise-template");
  const addDialog = document.querySelector("#plan-add-dialog");
  const addTitle = document.querySelector("#plan-add-title");
  const replaceContext = document.querySelector("#plan-replace-context");
  const addForm = document.querySelector("#plan-add-form");
  const customExercise = addForm.closest("details");
  const addSearch = document.querySelector("#plan-add-search");
  const addGroup = document.querySelector("#plan-add-group");
  const addEquipment = document.querySelector("#plan-add-equipment");
  const addStatus = document.querySelector("#plan-add-status");
  const addResults = document.querySelector("#plan-add-results");
  let pickerTarget;
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

  function formatMinutes(value) {
    const hours = Math.floor(value / 60);
    const remaining = value % 60;
    if (!hours) return `${remaining} Min.`;
    return remaining ? `${hours} Std. ${remaining} Min.` : `${hours} Std.`;
  }

  function updateDuration() {
    durationOutput.value = formatMinutes(minutes.valueAsNumber);
    minutes.setAttribute("aria-valuetext", durationOutput.value);
  }

  function renderSessionTime(element, session) {
    const sets = session.exercises.reduce((total, entry) => total + entry.sets, 0);
    element.hidden = sets === 0;
    element.textContent = `ca. ${formatMinutes(estimateMinutes(sets))} · ${sets} ${sets === 1 ? "Satz" : "Sätze"}`;
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

  function createPreview(exercise) {
    const preview = document.createElement("span");
    preview.className = "exercise-preview";
    preview.setAttribute("aria-hidden", "true");
    const illustration = exercise && exerciseIllustrations.create(exercise);
    if (illustration) preview.append(illustration);
    else preview.innerHTML = '<svg><use href="#icon-strength"/></svg>';
    return preview;
  }

  function renderExercise(entry, sessionIndex, index, time) {
    const item = exerciseTemplate.content.firstElementChild.cloneNode(true);
    const session = plan.sessions[sessionIndex];
    const exercise = catalog.get(entry.id);
    const name = exercise?.name ?? entry.name;
    item.dataset.exerciseIndex = index;
    const nameLabel = item.querySelector(".exercise-name");
    nameLabel.textContent = name;
    nameLabel.title = name;
    item.querySelector(".exercise-meta").textContent = exercise?.type ?? (entry.equipment || "Eigene Übung");
    item.querySelector(".plan-exercise-label").prepend(createPreview(exercise));
    for (const field of item.querySelectorAll("input")) {
      field.value = entry[field.name];
      field.setAttribute("aria-label", `${field.name === "sets" ? "Sätze" : "Wiederholungen"} für ${name}`);
      field.addEventListener("change", () => {
        if (field.validity.valid) {
          entry[field.name] = field.valueAsNumber;
          if (field.name === "sets") renderSessionTime(time, session);
          save("Änderungen gespeichert.");
        }
        field.value = entry[field.name];
      });
    }

    const row = `[data-session-index="${sessionIndex}"]`;
    bindOrder(item, "plan-exercise", session.exercises, index,
      (target, action) => `${row} [data-exercise-index="${target}"] .plan-exercise-${action}`, name);
    const replace = item.querySelector(".plan-exercise-replace");
    replace.setAttribute("aria-label", `${name} austauschen`);
    replace.addEventListener("click", () => openExercisePicker(session, entry));
    const remove = item.querySelector(".plan-remove");
    remove.setAttribute("aria-label", `${name} entfernen`);
    remove.addEventListener("click", () => {
      session.exercises.splice(index, 1);
      renderPlan(`${row} .plan-add-button`);
      save("Übung entfernt.");
    });
    return item;
  }

  function openExercisePicker(session, entry = null) {
    if (!entry && session.exercises.length >= limits.exercises) {
      status.textContent = "Diese Einheit hat die maximale Anzahl Übungen erreicht.";
      return;
    }
    pickerTarget = { session, entry };
    const exercise = catalog.get(entry?.id);
    addTitle.textContent = entry ? "Übung austauschen" : "Übung hinzufügen";
    replaceContext.hidden = !entry;
    replaceContext.textContent = entry ? `Ersatz für ${exercise?.name ?? entry.name}` : "";
    addSearch.value = "";
    addGroup.value = exercise?.group ?? "";
    addEquipment.value = "";
    addForm.reset();
    customExercise.open = false;
    customExercise.hidden = Boolean(entry);
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
      const time = card.querySelector(".plan-session-time");
      renderSessionTime(time, session);
      list.append(...session.exercises.map((entry, exerciseIndex) => renderExercise(entry, index, exerciseIndex, time)));
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

  function selectExercise(choice) {
    if (!addDialog.open) return;
    const { session, entry } = pickerTarget;
    const sessionIndex = plan?.sessions.indexOf(session) ?? -1;
    if (sessionIndex < 0) return;
    const row = `[data-session-index="${sessionIndex}"]`;
    let focusSelector = `${row} .plan-add-button`;
    if (entry) {
      const exerciseIndex = session.exercises.indexOf(entry);
      if (exerciseIndex < 0 || choice.id === entry.id) return;
      session.exercises[exerciseIndex] = { ...choice, sets: entry.sets, reps: entry.reps };
      focusSelector = `${row} [data-exercise-index="${exerciseIndex}"] .plan-exercise-replace`;
    } else {
      if (session.exercises.length >= limits.exercises) return;
      session.exercises.push({ ...choice, sets: 3, reps: 10 });
    }
    addDialog.close();
    renderPlan(focusSelector);
    save(entry ? "Übung ausgetauscht." : "Übung hinzugefügt.");
  }

  function renderPicker() {
    const entry = pickerTarget?.entry;
    const matches = find(addSearch.value, addGroup.value, addEquipment.value)
      .filter((exercise) => exercise.id !== entry?.id);
    addStatus.textContent = matches.length === 1 ? "1 Übung" : `${matches.length} Übungen`;
    addResults.replaceChildren();
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "planner-note";
      empty.textContent = entry ? "Keine passende Übung gefunden. Ändere die Suche oder die Filter."
        : "Keine passende Übung gefunden. Ändere die Filter oder lege eine eigene Übung an.";
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
        button.prepend(createPreview(exercise));
        const nameLabel = item.querySelector(".exercise-name");
        nameLabel.textContent = exercise.name;
        nameLabel.title = exercise.name;
        item.querySelector(".exercise-meta").textContent = exercise.type;
        item.querySelector(".arrow use").setAttribute("href", entry ? "#icon-swap" : "#icon-plus");
        button.addEventListener("click", () => selectExercise({ id: exercise.id }));
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

  async function createPlan(nextPlan, messages, dialogStatus) {
    if (creating) return;
    if (!workspace && plan && !window.confirm("Den aktuellen lokalen Plan durch einen neuen Plan ersetzen?")) return;
    const currentWorkspace = workspace;
    if (currentWorkspace) {
      creating = true;
      try {
        if (!await currentWorkspace.create(nextPlan, dialogStatus) || workspace !== currentWorkspace) {
          if (dialogStatus && !settingsDialog.open) status.textContent = dialogStatus.textContent;
          return;
        }
      } finally {
        creating = false;
      }
    }
    plan = nextPlan;
    renderPlan();
    renderNotices(messages);
    if (!workspace) save("Trainingsplan gespeichert.");
    if (dialogStatus && settingsDialog.open) settingsDialog.close();
    if (location.hash === "#trainingsplan") focusPlan();
  }

  fillSelect(split, Object.entries(splits).map(([id, entry]) => [id, entry.label]));
  fillSelect(goal, Object.entries(goals));
  fillSelect(level, Object.entries(levels));
  minutes.min = sessionTime.min;
  minutes.max = sessionTime.max;
  minutes.step = sessionTime.step;
  minutes.addEventListener("input", updateDuration);
  document.querySelector("#plan-settings-open").addEventListener("click", () => {
    settingsStatus.textContent = "";
    settingsDialog.showModal();
    settingsDialog.scrollTop = 0;
  });
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
    minutes.value = options?.minutes ?? sessionTime.defaultMinutes;
    updateDuration();
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
    if (customExercise.hidden) return;
    const name = addForm.elements.custom.value.trim();
    if (!name) {
      addForm.elements.custom.value = "";
      addForm.reportValidity();
      return;
    }
    selectExercise({ name, equipment: addForm.elements.customEquipment.value });
  });

  settings.addEventListener("submit", (event) => {
    event.preventDefault();
    settingsStatus.textContent = "";
    const selected = [...equipmentOptions.querySelectorAll(":checked")].map((input) => input.value);
    const options = {
      split: split.value, days: Number(days.value), goal: goal.value, level: level.value,
      minutes: minutes.valueAsNumber, equipment: selected,
    };
    const generated = generateTrainingPlan(options, plan);
    if (!generated) {
      settingsStatus.textContent = "Wähle mindestens einen Equipment-Typ aus.";
      settings.querySelector(".plan-equipment").open = true;
      equipmentOptions.querySelector("input").focus();
      return;
    }
    createPlan(generated.plan, generated.notices, settingsStatus);
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

  function closeDialogs() {
    if (settingsDialog.open) settingsDialog.close();
    if (addDialog.open) addDialog.close();
  }

  return {
    getLocalPlan: () => localPlan,
    exportLocalPlan: () => exportPlan(localPlan),
    focusPlan,
    closeDialogs,
    setWorkspace(nextWorkspace, selectedPlan) {
      closeDialogs();
      workspace = nextWorkspace;
      plan = workspace ? normalizePlan(selectedPlan) : localPlan;
      applyOptions(plan?.options);
      status.textContent = "";
      renderNotices();
      renderPlan();
    },
  };
})();
