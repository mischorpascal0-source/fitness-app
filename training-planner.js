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
  let exerciseDrag;
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

  function bindSessionOrder(card, index) {
    const entries = plan.sessions;
    for (const [action, offset, direction] of [["up", -1, "nach oben"], ["down", 1, "nach unten"]]) {
      const button = card.querySelector(`.plan-session-${action}`);
      const target = index + offset;
      button.disabled = target < 0 || target >= entries.length;
      button.setAttribute("aria-label", `Einheit ${index + 1} ${direction} verschieben`);
      button.addEventListener("click", () => {
        [entries[index], entries[target]] = [entries[target], entries[index]];
        renderPlan(`[data-session-index="${target}"] .plan-session-${action}`);
        save("Reihenfolge gespeichert.");
      });
    }
  }

  function moveExercise(session, from, to, preventScroll = false) {
    if (from === to || to < 0 || to >= session.exercises.length) return;
    const sessionIndex = plan.sessions.indexOf(session);
    const [entry] = session.exercises.splice(from, 1);
    session.exercises.splice(to, 0, entry);
    renderPlan(`[data-session-index="${sessionIndex}"] [data-exercise-index="${to}"] .plan-exercise-grip`, { preventScroll });
    save("Reihenfolge gespeichert.");
  }

  function positionExerciseDrag() {
    const drag = exerciseDrag;
    const { rows, bounds, list, from } = drag;
    const origin = bounds[from];
    const delta = drag.y - drag.startY + drag.listTop - list.getBoundingClientRect().top;
    const offset = Math.max(bounds[0].top - origin.top, Math.min(delta, bounds.at(-1).bottom - origin.bottom));
    let target = from;
    while (offset > 0 && target < rows.length - 1 &&
      origin.bottom + offset > bounds[target + 1].top + bounds[target + 1].height / 2) target++;
    while (offset < 0 && target > 0 &&
      origin.top + offset < bounds[target - 1].bottom - bounds[target - 1].height / 2) target--;

    if (target !== drag.target) {
      rows.forEach((row, index) => {
        if (index === from) return;
        const shift = from < index && index <= target ? -origin.height
          : target <= index && index < from ? origin.height : 0;
        row.style.transform = shift ? `translateY(${shift}px)` : "";
      });
      drag.target = target;
    }
    rows[from].style.transform = `translateY(${offset}px)`;
  }

  function scrollWhileDragging() {
    const drag = exerciseDrag;
    positionExerciseDrag();
    const edge = 64;
    const bottom = window.innerHeight - drag.navigationHeight;
    if (drag.y < edge && drag.target > 0) window.scrollBy(0, -Math.min(16, (edge - drag.y) / 4));
    if (drag.y > bottom - edge && drag.target < drag.rows.length - 1) {
      window.scrollBy(0, Math.min(16, (drag.y - bottom + edge) / 4));
    }
    drag.frame = requestAnimationFrame(scrollWhileDragging);
  }

  function finishExerciseDrag(commit = false) {
    const drag = exerciseDrag;
    if (!drag) return;
    exerciseDrag = null;
    cancelAnimationFrame(drag.frame);
    drag.rows[drag.from].classList.remove("is-dragging");
    for (const row of drag.rows) row.style.transform = "";
    if (drag.handle.hasPointerCapture(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
    if (commit) moveExercise(drag.session, drag.from, drag.target, true);
  }

  function bindExerciseDrag(list, session) {
    list.addEventListener("pointerdown", (event) => {
      const handle = event.target.closest(".plan-exercise-grip:enabled");
      if (!handle || exerciseDrag || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      handle.focus({ preventScroll: true });
      const rows = [...list.children];
      const from = Number(handle.closest(".plan-exercise").dataset.exerciseIndex);
      handle.setPointerCapture(event.pointerId);
      exerciseDrag = {
        handle, list, session, rows, from, target: from, pointerId: event.pointerId,
        bounds: rows.map((row) => row.getBoundingClientRect()),
        listTop: list.getBoundingClientRect().top,
        navigationHeight: document.querySelector(".bottom-nav").offsetHeight,
        startY: event.clientY, y: event.clientY, frame: 0,
      };
    });
    list.addEventListener("pointermove", (event) => {
      const drag = exerciseDrag;
      if (drag?.pointerId !== event.pointerId) return;
      drag.y = event.clientY;
      if (!drag.frame && Math.abs(drag.y - drag.startY) >= 4) {
        drag.rows[drag.from].classList.add("is-dragging");
        scrollWhileDragging();
      }
    });
    list.addEventListener("pointerup", (event) => {
      if (exerciseDrag?.pointerId !== event.pointerId) return;
      if (exerciseDrag.frame) {
        exerciseDrag.y = event.clientY;
        positionExerciseDrag();
      }
      finishExerciseDrag(true);
    });
    for (const eventName of ["pointercancel", "lostpointercapture"]) {
      list.addEventListener(eventName, (event) => {
        if (exerciseDrag?.pointerId === event.pointerId) finishExerciseDrag();
      });
    }
    list.addEventListener("keydown", (event) => {
      const handle = event.target.closest(".plan-exercise-grip:enabled");
      if (!handle) return;
      if (exerciseDrag) {
        if (event.key === "Escape") finishExerciseDrag();
        return;
      }
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      const from = Number(handle.closest(".plan-exercise").dataset.exerciseIndex);
      moveExercise(session, from, from + (event.key === "ArrowUp" ? -1 : 1));
    });
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
    const grip = item.querySelector(".plan-exercise-grip");
    grip.disabled = session.exercises.length < 2;
    grip.setAttribute("aria-label", `${name} verschieben`);
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

  function renderPlan(focusSelector, focusOptions) {
    finishExerciseDrag();
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
      bindExerciseDrag(list, session);
      card.querySelector(".plan-session-empty").hidden = session.exercises.length > 0;
      card.querySelector(".plan-add-button").addEventListener("click", () => openExercisePicker(session));
      bindSessionOrder(card, index);
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
      (control?.disabled ? fallback : control)?.focus(focusOptions);
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
    finishExerciseDrag();
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
