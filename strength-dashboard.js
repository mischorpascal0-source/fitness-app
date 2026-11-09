const strengthDashboard = (() => {
  const section = document.querySelector("#strength-dashboard");
  const schedule = document.querySelector("#strength-schedule");
  const sessionField = document.querySelector("#strength-session-field");
  const sessionSelect = document.querySelector("#strength-session");
  const start = document.querySelector("#strength-start");
  const status = document.querySelector("#strength-status");
  const dialog = document.querySelector("#strength-workout-dialog");
  const workoutTitle = document.querySelector("#strength-workout-title");
  const workoutExercises = document.querySelector("#strength-workout-exercises");
  const workoutStatus = document.querySelector("#strength-workout-status");
  const finish = document.querySelector("#strength-finish");
  const weekRange = document.querySelector("#strength-week-range");
  const workoutCount = document.querySelector("#strength-workouts");
  const setCount = document.querySelector("#strength-sets");
  const muscles = document.querySelector("#strength-muscle-sets");
  const muscleNote = document.querySelector("#strength-muscle-note");
  const weekEmpty = document.querySelector("#strength-week-empty");
  const calendar = document.querySelector("#strength-calendar");
  const preview = document.querySelector("#strength-session-preview");
  const facts = document.querySelector("#strength-session-facts");
  const customize = document.querySelector("#strength-customize");
  const minutesInput = document.querySelector("#workout-minutes");
  const minutesOutput = document.querySelector("#workout-minutes-value");
  const equipmentChoices = document.querySelector("#workout-equipment");
  const activeWidget = document.querySelector("#active-workout");
  const restSkip = document.querySelector("#workout-rest-skip");
  const optionsDialog = document.querySelector("#strength-options-dialog");
  const historyDialog = document.querySelector("#strength-history-dialog");
  const shareLatest = document.querySelector("#strength-share-latest");
  let socialShare, latestCompleted;
  const activityDialog = document.querySelector("#activity-dialog");
  const catalog = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]));
  const shortDate = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" });
  const fullDate = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  let storageKey;
  let journal;
  let shownPlan;
  let shownDate;
  let selectedDate = new Date();
  let lastToday = dateKey(selectedDate);

  function dateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function selectedSession() {
    const session = trainingPlanner.getPlan()?.sessions[sessionSelect.value];
    return session?.weekday === (selectedDate.getDay() + 6) % 7 ? session : null;
  }

  function selectedActiveWorkout() {
    const active = journal?.active;
    const session = selectedSession();
    if (!active || !session || active.date !== dateKey(selectedDate)) return null;
    if (active.sourcePlanId && active.sourcePlanId !== document.querySelector("#account-plans").value) return null;
    return (active.sourceSession ? active.sourceSession === JSON.stringify(session) : active.name === session.name) ? active : null;
  }

  function primaryMuscles(exercise) {
    if (!exercise?.primary) return ["Eigene Übungen"];
    return [...new Set(exercise.primary.replace("Vordere und seitliche Schulter", "Vordere Schulter, Seitliche Schulter")
      .split(",").map((value) => {
        const muscle = value.trim();
        return muscle === "Gesäßmuskulatur" ? "Gesäß" : muscle[0].toUpperCase() + muscle.slice(1);
      }))];
  }

  function readJournal() {
    try {
      const stored = storageKey && JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(stored?.workouts)) {
        stored.active = workoutState.normalize(stored.active);
        stored.pendingPlanChanges ??= [];
        return stored;
      }
    } catch {
      // An unreadable browser entry has no usable workouts.
    }
    return { workouts: [], active: null, pendingPlanChanges: [] };
  }

  function writeJournal(next, messageElement) {
    try {
      if (!storageKey) return false;
      // An old tab must not resurrect a workout completed/discarded in another tab.
      const latest = readJournal();
      if ((latest.active?.id ?? null) !== (journal?.active?.id ?? null) || (latest.revision ?? 0) !== (journal?.revision ?? 0)) {
        journal = latest;
        if (sheet.open) sheet.close();
        if (dialog.open) dialog.close();
        render();
        messageElement.textContent = "Die Einheit wurde in einem anderen Fenster geändert. Bitte öffne sie erneut.";
        return false;
      }
      next = { ...next, revision: (latest.revision ?? 0) + 1 };
      localStorage.setItem(storageKey, JSON.stringify(next));
      journal = next;
      document.dispatchEvent(new Event("fitness:workoutchange"));
      return true;
    } catch {
      messageElement.textContent = "Das Training konnte in diesem Browser nicht gespeichert werden.";
      return false;
    }
  }

  function renderWeek(now, weekday) {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday);
    const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday + 6);
    weekRange.textContent = `${shortDate.format(monday)} – ${shortDate.format(sunday)} · In diesem Browser erfasst`;
    const from = dateKey(monday);
    const to = dateKey(sunday);
    const workouts = journal.workouts.filter(({ date }) => date >= from && date <= to);
    const groups = new Map();
    for (const workout of workouts) {
      for (const [group, count] of workout.muscleSets) {
        groups.set(group, (groups.get(group) ?? 0) + count);
      }
    }
    const total = workouts.reduce((sum, workout) => sum + workout.totalSets, 0);
    workoutCount.textContent = workouts.length;
    setCount.textContent = total;
    weekEmpty.hidden = total > 0;
    muscleNote.hidden = total === 0;
    const entries = [...groups].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"));
    muscles.replaceChildren(...entries.map(([group, count]) => {
      const row = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = group;
      const sets = document.createElement("strong");
      sets.textContent = count === 1 ? "1 Satz" : `${count} Sätze`;
      const bar = document.createElement("progress");
      bar.setAttribute("aria-hidden", "true");
      bar.max = entries[0][1];
      bar.value = count;
      row.append(name, sets, bar);
      return row;
    }));
  }

  function renderCalendar(plan) {
    const day = (selectedDate.getDay() + 6) % 7;
    const now = dateKey(new Date());
    const completed = new Set(journal.workouts.map(({ date }) => date));
    document.querySelector("#calendar-month").textContent = new Intl.DateTimeFormat("de-DE", { month: "short", year: "numeric" }).format(selectedDate);
    document.querySelector("#calendar-selected-date").textContent = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric" }).format(selectedDate);
    calendar.replaceChildren(...trainingPlanData.weekdays.map((label, index) => {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - day + index);
      const key = dateKey(date);
      const planned = plan?.sessions.some((session) => session.weekday === index);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day";
      button.classList.toggle("is-today", key === now);
      button.classList.toggle("is-planned", Boolean(planned));
      button.classList.toggle("is-completed", completed.has(key));
      button.setAttribute("aria-pressed", String(key === dateKey(selectedDate)));
      button.setAttribute("aria-label", fullDate.format(date) + (planned ? ", Training geplant" : "") + (completed.has(key) ? ", Training abgeschlossen" : ""));
      const name = document.createElement("small");
      name.textContent = label.slice(0, 2);
      const number = document.createElement("strong");
      number.textContent = completed.has(key) && key !== dateKey(selectedDate) ? "✓" : date.getDate();
      const dot = document.createElement("span");
      dot.className = "calendar-dot";
      button.append(name, number, dot);
      button.addEventListener("click", () => { selectedDate = date; render(); });
      return button;
    }));
  }

  function resetAdjustments() {
    const options = trainingPlanner.getPlan()?.options;
    minutesInput.value = options?.minutes ?? 45;
    minutesOutput.value = minutesInput.value + " Min.";
    for (const input of equipmentChoices.querySelectorAll("input")) input.checked = !options || options.equipment.includes(input.value);
  }

  function exercisesForToday(session) {
    const equipment = [...equipmentChoices.querySelectorAll(":checked")].map(({ value }) => value);
    const retained = new Set(session.exercises.filter((entry) => equipment.includes(catalog.get(entry.id)?.type)).map(({ id }) => id));
    const selected = [];
    for (const [sourceIndex, entry] of session.exercises.entries()) {
      const exercise = catalog.get(entry.id);
      if (exercise && !equipment.includes(exercise.type)) {
        const alternative = exerciseCatalog.find((candidate) =>
          candidate.group === exercise.group && equipment.includes(candidate.type) &&
          !retained.has(candidate.id) && !selected.some(({ id }) => candidate.id === id));
        if (alternative) selected.push({ id: alternative.id, sets: entry.sets, reps: entry.reps, ...(entry.repRange ? { repRange: entry.repRange } : {}), sourceIndex });
      } else if (exercise || !entry.equipment || equipment.includes(entry.equipment)) selected.push({ ...entry, sourceIndex });
    }
    const budget = Math.floor((minutesInput.valueAsNumber + 3) / 4);
    let total = selected.reduce((sum, { sets }) => sum + sets, 0);
    while (total > budget && selected.length) {
      const extra = selected.findLast((entry) => entry.sets > 1);
      if (extra) { extra.sets--; total--; }
      else { selected.pop(); total--; }
    }
    return selected;
  }

  function renderSelectedSession() {
    const session = selectedSession();
    const active = selectedActiveWorkout();
    const exercises = active?.exercises ?? (session ? exercisesForToday(session) : []);
    const name = active?.name ?? session?.name ?? "Dein Trainingsplan";
    document.querySelector("#strength-today").textContent = name;
    start.setAttribute("aria-label", name + (active ? " fortsetzen" : " starten") + ", " + fullDate.format(selectedDate));
    const actionLabel = active ? "Training fortsetzen" : "Training starten";
    start.textContent = actionLabel;
    document.querySelector("#strength-session-date").textContent = fullDate.format(selectedDate);
    const sets = exercises.reduce((sum, entry) => sum + (entry.sets ?? entry.done.length), 0);
    facts.replaceChildren(...[
      ["#icon-clock", trainingPlanData.estimateMinutes(sets) + " Minuten"],
      ["#icon-strength", exercises.length + (exercises.length === 1 ? " Übung" : " Übungen")],
    ].map(([icon, text]) => {
      const chip = document.createElement("span");
      chip.innerHTML = '<svg aria-hidden="true"><use href="' + icon + '"/></svg>';
      chip.append(text);
      return chip;
    }));
    facts.hidden = !exercises.length;
    const muscles = document.querySelector("#strength-session-muscles");
    muscles.textContent = [...new Set(exercises.flatMap((entry) => entry.muscles ?? primaryMuscles(catalog.get(entry.id))))].join(", ");
    muscles.title = muscles.textContent;
    muscles.hidden = !exercises.length;
    preview.replaceChildren(...exercises.slice(0, 3).map((entry) => {
      const exercise = catalog.get(entry.id);
      const row = document.createElement("li");
      const illustration = exercise && exerciseIllustrations.create(exercise);
      if (illustration) {
        const image = document.createElement("span");
        image.className = "exercise-preview";
        image.setAttribute("aria-hidden", "true");
        image.append(illustration);
        row.append(image);
      }
      const copy = document.createElement("div");
      const name = document.createElement("strong");
      name.className = "exercise-name";
      name.textContent = exercise?.name ?? entry.name;
      name.title = name.textContent;
      const detail = document.createElement("small");
      detail.textContent = (entry.sets ?? entry.done.length) + " × " + entry.reps + " · " + (exercise?.type || entry.equipment || "Eigene Übung");
      copy.append(name, detail);
      row.append(copy);
      return row;
    }));
    customize.hidden = Boolean(journal.active || pendingChange()) || !session;
    start.disabled = Boolean(journal.active && !active) || Boolean(pendingChange()) || !exercises.length;
    const blocked = document.querySelector("#strength-active-note");
    blocked.hidden = !(journal.active && !active) && !pendingChange();
    if (!blocked.hidden) blocked.textContent = pendingChange() ? "Dein Training ist gespeichert. Öffne „Planänderungen prüfen“, bevor du eine neue Einheit startest." : "Es läuft noch ein anderes Training. Setze es über „Training läuft“ fort oder verwirf es, bevor du diese Einheit startest.";
  }

  function renderHistory() {
    const recent = [...journal.workouts].reverse().slice(0, 10);
    document.querySelector("#strength-history-empty").hidden = recent.length > 0;
    document.querySelector("#strength-history").replaceChildren(...recent.map((entry) => {
      const row = document.createElement("li");
      const copy = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = entry.name;
      const detail = document.createElement("small");
      detail.textContent = entry.date.split("-").reverse().join(".") + " · " + entry.totalSets + " Sätze";
      if (entry.volume) detail.textContent += " · " + new Intl.NumberFormat("de-DE").format(entry.volume) + " kg bewegt";
      copy.append(name, detail);
      row.append(copy);
      if (socialShare) {
        const share = node("button", "plan-button", "Teilen");
        share.type = "button";
        share.setAttribute("aria-label", entry.name + " teilen");
        share.setAttribute("aria-haspopup", "dialog");
        share.addEventListener("click", () => socialShare?.(entry.id));
        row.append(share);
      }
      return row;
    }));
    const trainingDays = new Set(journal.workouts.map(({ date }) => date)).size;
    document.querySelector("#strength-streak").textContent = trainingDays ? trainingDays + " Trainingstage" : "";
    const tests = (journal.calibrations ?? []).slice(-10).reverse();
    document.querySelector("#strength-calibration-history").hidden = !tests.length;
    document.querySelector("#strength-calibration-list").replaceChildren(...tests.map((test) => {
      const row = node("li");
      const name = node("strong", "", [test.name, test.device].filter(Boolean).join(" · "));
      const detail = node("small", "", `${shortDate.format(test.at)} · ${guidancePair(test, test.profile)}`);
      const copy = node("div"); copy.append(name, detail); row.append(copy);
      return row;
    }));
  }

  function render() {
    const todayKey = dateKey(new Date());
    if (lastToday !== todayKey && dateKey(selectedDate) === lastToday) selectedDate = new Date();
    lastToday = todayKey;
    const resumable = journal?.active ?? pendingChange();
    activeWidget.hidden = !storageKey || !resumable;
    document.body.classList.toggle("has-active-workout", Boolean(storageKey && resumable));
    document.querySelector("#active-workout-name").textContent = resumable?.name ?? "";
    activeWidget.querySelector("strong").textContent = journal?.active ? journal.active.pausedAt != null ? "Training pausiert" : "Training läuft" : "Planänderungen prüfen";
    activeWidget.setAttribute("aria-label", (journal?.active ? "Training fortsetzen: " : "Planänderungen prüfen: ") + (resumable?.name ?? ""));
    if (!journal || (section.hidden && document.querySelector("#statistics-view").hidden)) return;
    const now = selectedDate;
    const today = dateKey(now);
    const weekday = (now.getDay() + 6) % 7;
    const plan = trainingPlanner.getPlan();
    const sessions = plan?.sessions ?? [];
    const available = sessions.map((session, index) => ({ session, index })).filter(({ session }) => session.weekday === weekday && session.exercises.length);
    const scheduled = sessions.filter((session) => session.weekday === weekday);
    const dayLabel = today === dateKey(new Date()) ? "Heute" : shortDate.format(now);
    if (scheduled.length) schedule.textContent = `${dayLabel} geplant · ${scheduled.map(({ name }) => name).join(" · ")}`;
    else if (plan) schedule.textContent = dayLabel + (dayLabel === "Heute" ? " ist kein Training eingeplant." : " · Kein Training eingeplant.");
    else schedule.textContent = "Erstelle einen Trainingsplan, um eine Einheit zu starten.";
    schedule.classList.toggle("sr-only", scheduled.length > 0);

    const selection = shownPlan === plan && shownDate === today ? sessionSelect.value : "";
    sessionSelect.replaceChildren(...available.map(({ session, index }) => new Option(session.name, String(index))));
    if (available.some(({ index }) => String(index) === selection)) sessionSelect.value = selection;
    else if (available.length) sessionSelect.value = String(available[0].index);
    if (shownPlan !== plan || shownDate !== today) resetAdjustments();
    shownPlan = plan;
    shownDate = today;
    sessionField.hidden = Boolean(selectedActiveWorkout()) || available.length < 2;
    start.hidden = !storageKey || !available.length;
    document.querySelector("#strength-session-card").hidden = !available.length;
    document.querySelector("#strength-empty-day").hidden = available.length > 0;
    const emptyTitle = document.querySelector("#strength-empty-title");
    const emptyMessage = document.querySelector("#strength-empty-message");
    const emptyLink = document.querySelector("#strength-empty-plan");
    if (!sessions.length) {
      emptyTitle.textContent = "Dein erster Trainingsplan";
      emptyMessage.textContent = "Erstelle deinen Plan und wähle die Wochentage, an denen du trainieren möchtest.";
      emptyLink.textContent = "Trainingsplan erstellen";
    } else if (scheduled.length) {
      emptyTitle.textContent = scheduled.map(({ name }) => name).join(" · ");
      emptyMessage.textContent = "Füge dieser Einheit im Trainingsplan Übungen hinzu, um sie zu starten.";
      emptyLink.textContent = "Einheit vervollständigen";
    } else if (!sessions.some((session) => Number.isInteger(session.weekday))) {
      emptyTitle.textContent = "Trainingstage festlegen";
      emptyMessage.textContent = "Ordne deinen Einheiten im Trainingsplan feste Wochentage zu. Sie erscheinen dann jede Woche im Kalender.";
      emptyLink.textContent = "Trainingstage festlegen";
    } else {
      emptyTitle.textContent = "Ruhetag";
      emptyMessage.textContent = "Für diesen Tag ist kein Krafttraining eingeplant. Wähle oben einen Trainingstag, um eine Einheit zu starten oder nachzuholen.";
      emptyLink.textContent = "Trainingstage ändern";
    }
    renderCalendar(plan);
    renderSelectedSession();
    renderWeek(now, weekday);
    renderHistory();
  }

  const exerciseStage = document.querySelector("#workout-exercise-stage");
  const summaryStage = document.querySelector("#workout-summary");
  const planStage = document.querySelector("#workout-plan-changes");
  const pauseButton = document.querySelector("#workout-pause");
  const incomplete = document.querySelector("#workout-confirm-incomplete");
  const sheet = document.querySelector("#workout-exercise-dialog");
  const sheetContent = document.querySelector("#workout-exercise-content");
  const sheetStatus = document.querySelector("#workout-exercise-status");
  let accountEpoch = 0, finishing = false, applying = false;
  let planAccess, sheetId, sheetView = "preview", candidate, drag;
  let replaceFilters = { query: "", group: "", type: "" };
  let swapFromList = false;

  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  };
  const pendingChange = () => journal?.pendingPlanChanges?.[0];
  const currentExercise = () => journal?.active?.exercises.find(({ instanceId }) => instanceId === sheetId);
  const checkinDialog = document.querySelector("#workout-checkin-dialog");
  const checkinForm = document.querySelector("#workout-checkin-form");
  const checkinStatus = document.querySelector("#workout-checkin-status");
  let checkinContext;
  const sorenessSections = [
    ["Oberkörper", ["brust", "ruecken", "schultern", "nacken", "bizeps", "trizeps", "unterarme"]],
    ["Körpermitte", ["rumpf", "unterer-ruecken"]],
    ["Beine und Hüfte", ["gesaess", "huefte", "quadrizeps", "hamstrings", "adduktoren", "waden"]],
  ];
  for (const [title, ids] of sorenessSections) {
    const section = node("section", "readiness-section"), heading = node("h3", "", title), list = node("div", "readiness-muscles");
    heading.id = "readiness-section-" + ids[0]; section.setAttribute("aria-labelledby", heading.id);
    for (const id of ids) {
      const group = trainingGuidance.muscleGroups.find((entry) => entry.id === id);
      const card = node("div", "readiness-slider-card"), header = node("div", "readiness-slider-heading");
      const label = node("label", "", group.label), input = node("input"), output = node("output", "readiness-score");
      input.type = "range"; input.name = "sore-" + id; input.id = "soreness-" + id;
      input.min = 0; input.max = 10; input.step = 1; input.defaultValue = "0"; input.value = "0";
      input.className = "readiness-slider"; input.setAttribute("aria-describedby", "workout-checkin-scale-help");
      label.htmlFor = input.id; output.setAttribute("for", input.id); output.setAttribute("aria-hidden", "true");
      const update = () => {
        const value = Number(input.value);
        output.value = `${value} / 10`;
        input.style.setProperty("--score-progress", `${value * 10}%`);
        input.setAttribute("aria-valuetext", `${value} von 10${value === 0 ? ", kein Muskelkater" : value === 10 ? ", sehr starker Muskelkater" : ""}`);
      };
      input.addEventListener("input", update); input.addEventListener("change", update); update();
      const scale = node("div", "readiness-slider-scale"); scale.setAttribute("aria-hidden", "true");
      scale.append(node("span", "", "0 · Kein"), node("span", "", "10 · Sehr stark"));
      header.append(label, output); card.append(header, input, scale); list.append(card);
    }
    section.append(heading, list); document.querySelector("#workout-checkin-scores").append(section);
  }
  function updateSorenessSliders() {
    for (const input of checkinForm.querySelectorAll(".readiness-slider")) input.dispatchEvent(new Event("input"));
  }
  for (const group of [{ id: "all", label: "Unklar / mehrere Bereiche" }, ...trainingGuidance.muscleGroups]) {
    const label = node("label"), box = node("input"); box.type = "checkbox"; box.name = "painGroup"; box.value = group.id;
    label.append(box, group.label); document.querySelector("#workout-checkin-pain-groups").append(label);
  }
  function refreshGuidance(active, source = journal) {
    return workoutState.prepareGuidance(active, source.workouts, catalog, Date.now(), source);
  }
  function toggleCheckinFields() {
    const sore = checkinForm.elements.soreness.value === "yes", pain = checkinForm.elements.pain.value === "yes";
    document.querySelector("#workout-checkin-muscles").hidden = !sore;
    document.querySelector("#workout-checkin-pain").hidden = !pain;
  }
  function openCheckin(edit = false) {
    if (!storageKey || (edit && !journal?.active)) return;
    if (edit && !saveActive(workoutState.pause(journal.active))) return;
    checkinContext = { key: storageKey, epoch: accountEpoch, workoutId: edit ? journal.active.id : null, date: dateKey(selectedDate), session: JSON.stringify(selectedSession()) };
    checkinForm.reset(); checkinStatus.textContent = "";
    const previous = edit ? journal.active.checkin : null;
    if (trainingGuidance.validateCheckin(previous)) {
      checkinForm.elements.soreness.value = Object.values(previous.scores).some((value) => value > 0) ? "yes" : "no";
      checkinForm.elements.pain.value = previous.pain ? "yes" : "no";
      for (const group of trainingGuidance.muscleGroups) checkinForm.elements["sore-" + group.id].value = String(previous.scores[group.id]);
      for (const input of checkinForm.querySelectorAll('[name="painGroup"]')) input.checked = previous.painGroups.includes(input.value);
    }
    updateSorenessSliders();
    document.querySelector("#workout-checkin-date").textContent = "Dein Zustand jetzt · " + fullDate.format(new Date()) + ". Das gilt auch für nachgeholte Trainingstage.";
    document.querySelector("#workout-checkin-submit").textContent = edit ? "Check-in speichern" : "Training starten";
    toggleCheckinFields(); if (sheet.open) sheet.close(); checkinDialog.showModal(); checkinDialog.scrollTop = 0;
  }
  checkinForm.addEventListener("change", toggleCheckinFields);
  document.querySelector("#workout-checkin-reset").addEventListener("click", () => {
    for (const input of checkinForm.querySelectorAll(".readiness-slider")) input.value = "0";
    updateSorenessSliders();
  });
  document.querySelector("#workout-checkin-close").addEventListener("click", () => { checkinDialog.close(); checkinContext = null; if (journal?.active) renderWorkout(); });
  checkinDialog.addEventListener("cancel", () => { checkinContext = null; if (journal?.active) renderWorkout(); });
  document.querySelector("#workout-checkin-edit").addEventListener("click", () => openCheckin(true));
  checkinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!checkinContext || checkinContext.key !== storageKey || checkinContext.epoch !== accountEpoch || !checkinForm.reportValidity()) return;
    const scores = Object.fromEntries(trainingGuidance.muscleGroups.map(({ id }) => [id, checkinForm.elements.soreness.value === "no" ? 0 : Number(checkinForm.elements["sore-" + id].value)]));
    const pain = checkinForm.elements.pain.value === "yes";
    const checkin = { scores, pain, painGroups: pain ? [...checkinForm.querySelectorAll('[name="painGroup"]:checked')].map(({ value }) => value) : [], checkedAt: Date.now() };
    if (!trainingGuidance.validateCheckin(checkin)) { checkinStatus.textContent = "Prüfe die Angaben und wähle bei Beschwerden mindestens einen betroffenen Bereich aus."; return; }
    if (checkinContext.workoutId) {
      journal = readJournal();
      if (journal.active?.id !== checkinContext.workoutId) { checkinStatus.textContent = "Die Einheit wurde inzwischen geändert. Öffne sie erneut."; return; }
      const next = refreshGuidance({ ...journal.active, checkin });
      if (!writeJournal({ ...journal, active: next }, checkinStatus)) return;
      checkinDialog.close(); checkinContext = null; renderWorkout(); render();
    } else {
      if (checkinContext.date !== dateKey(selectedDate) || checkinContext.session !== JSON.stringify(selectedSession())) { checkinStatus.textContent = "Tag oder Trainingsplan wurde geändert. Starte die Einheit erneut."; return; }
      checkinDialog.close(); checkinContext = null; openWorkout(false, checkin);
    }
  });

  const numberFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
  function guidancePair(pair, profile) {
    if (!pair) return "Pause empfohlen";
    const weight = pair.weight == null ? "Gewicht selbst wählen" : profile.mode === "bodyweight" ? "Körpergewicht" : numberFormat.format(pair.weight) + (profile.mode === "assisted" ? " kg Unterstützung" : profile.mode === "added" ? " kg Zusatzlast" : " kg");
    return `${weight} × ${pair.reps} Wdh.`;
  }
  function renderGuidance(exercise) {
    const suggestion = exercise.guidance || trainingGuidance.suggest({ ...catalog.get(exercise.id), ...exercise }, journal.workouts, journal.active.checkin, Date.now(), journal);
    const panel = node("section", "workout-guidance"); panel.setAttribute("aria-label", "Persönlicher Trainingsvorschlag");
    panel.append(node("span", "eyebrow", "Dein Trainingsvorschlag"));
    if (suggestion.last) panel.append(node("p", "planner-note", "Letztes vergleichbares Training: " + guidancePair(suggestion.last, suggestion.profile)));
    if (suggestion.test) panel.append(node("p", "planner-note", "Krafttest: " + guidancePair(suggestion.test, suggestion.profile)));
    if (suggestion.last || suggestion.test) panel.append(node("p", "guidance-baseline", "Basis: " + guidancePair(suggestion.baseline, suggestion.profile)));
    const dayText = suggestion.recovery.level === "unknown" ? "Check-in ergänzen" : guidancePair(suggestion.day, suggestion.profile);
    panel.append(node("strong", "guidance-today", "Heute: " + dayText));
    if (!suggestion.last && !suggestion.test) panel.append(node("p", "planner-note", suggestion.reasons[0]));
    panel.append(node("small", "guidance-confidence", suggestion.confidence === "low" ? "Unsichere Schätzung · bitte selbst prüfen" : "Orientierung aus deiner Trainingshistorie"));
    if (suggestion.recovery.affected.length) panel.append(node("p", "planner-note", "Beteiligte betroffene Bereiche: " + suggestion.recovery.affected.map((id) => trainingGuidance.muscleGroups.find((group) => group.id === id)?.label).join(", ")));
    const details = node("details", "workout-instructions"); details.id = "workout-guidance-reasons"; details.append(node("summary", "", "Warum dieser Vorschlag?"), node("p", "guidance-trend", suggestion.trend.label + ` · ${suggestion.trend.sessions} vergleichbare Einheiten`));
    const list = node("ul"); list.append(...[...suggestion.reasons, ...suggestion.notes].map((text) => node("li", "", text))); details.append(list);
    details.append(node("p", "planner-note", "Produktheuristik, keine gemessene Maximalkraft oder medizinische Belastungsfreigabe."));
    panel.append(details);
    if (["pain", "strong"].includes(suggestion.recovery.level)) panel.append(node("p", "workout-notice", suggestion.reasons.at(-1)));
    const apply = node("button", "plan-button", "Vorschlag für offene Sätze übernehmen"); apply.id = "workout-accept-guidance"; apply.type = "button";
    apply.disabled = suggestion.day?.weight == null || !exercise.done.some((done, index) => !done && !exercise.touchedWeights[index] && !exercise.touchedReps[index] && exercise.setTypes[index] !== "warmup");
    apply.addEventListener("click", () => {
      const next = workoutState.acceptSuggestion(refreshGuidance(journal.active), exercise.instanceId);
      if (saveActive(next)) { renderWorkout(); renderExercise(); sheetStatus.textContent = "Vorschlag in unbearbeitete Sätze übernommen. Erst abgehakte Sätze zählen als absolviert."; }
    });
    if (suggestion.day?.weight != null) panel.append(apply);
    if (!suggestion.last && !suggestion.test && suggestion.canCalibrate && suggestion.day && !exercise.skipped && journal.active.pausedAt == null) {
      panel.append(renderCalibration(exercise, suggestion.profile));
    }
    return panel;
  }

  function renderCalibration(exercise, profile) {
    const details = node("details", "workout-instructions");
    details.append(node("summary", "", "Krafttest starten"), node("p", "planner-note", "Wähle eine Stufe für ungefähr 10–20 saubere Wiederholungen. Beende den Satz, sobald die nächste Wiederholung voraussichtlich nicht mehr sauber gelingt."));
    const form = node("form", "workout-target-form"); form.id = "workout-calibration-form";
    const weightLabel = node("label", "plan-editor-label", trainingGuidance.weightLabel({ ...catalog.get(exercise.id), ...exercise }));
    const weight = node("input"); weight.type = "number"; weight.name = "testWeight"; weight.inputMode = "decimal";
    weight.min = profile.min ?? 0; weight.max = profile.max ?? 2000; weight.step = profile.step; weight.required = true;
    if (profile.mode === "bodyweight") { weight.value = 0; weight.readOnly = true; }
    weightLabel.append(weight);
    const repsLabel = node("label", "plan-editor-label", "Geschaffte Wiederholungen"), reps = node("input");
    reps.type = "number"; reps.name = "testReps"; reps.min = 1; reps.max = 100; reps.inputMode = "numeric"; reps.required = true; repsLabel.append(reps);
    const save = node("button", "plan-button primary", "Krafttest speichern"); save.type = "submit";
    const skip = node("button", "text-button", "Krafttest überspringen"); skip.type = "button";
    skip.addEventListener("click", () => { details.open = false; details.querySelector("summary").focus(); });
    const feedback = node("p", "planner-note workout-target-note"); feedback.setAttribute("role", "status");
    form.append(weightLabel, repsLabel, save, skip, feedback); details.append(form);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const current = currentExercise();
      if (current?.instanceId !== exercise.instanceId || !current.guidance?.day || journal.active.pausedAt != null) return;
      const load = weight.valueAsNumber, count = reps.valueAsNumber;
      if (!trainingGuidance.validTestWeight(load, profile)) {
        feedback.textContent = "Wähle ein verfügbares Testgewicht.";
        return;
      }
      if (count < 10 || count > 20) {
        const heavier = count > 20;
        const sign = profile.mode === "assisted" ? -1 : 1;
        const adjusted = trainingGuidance.roundWeight(load + (heavier ? sign : -sign) * profile.step, profile, "round");
        const alternative = profile.mode !== "bodyweight" && adjusted !== load && trainingGuidance.validTestWeight(adjusted, profile);
        if (alternative) {
          weight.value = adjusted;
          reps.value = "";
          feedback.textContent = `Für einen neuen Versuch ist ${numberFormat.format(adjusted)} kg vorausgewählt.`;
        } else feedback.textContent = "Für diesen Test gibt es keine passendere Gewichtsstufe. Du kannst den Krafttest überspringen und Sätze manuell erfassen.";
        return;
      }
      const key = trainingGuidance.scopeKey({ ...catalog.get(current.id), ...current });
      const test = { key, at: Date.now(), name: current.name, device: current.equipmentKey, weight: load, reps: count, profile: { mode: profile.mode } };
      const next = { ...journal, calibrations: [...(journal.calibrations ?? []), test] };
      next.active = refreshGuidance(journal.active, next);
      if (writeJournal(next, feedback)) { renderWorkout(); renderExercise(); }
    });
    return details;
  }

  function saveActive(active) {
    return writeJournal({ ...journal, active }, sheet.open ? sheetStatus : workoutStatus);
  }
  function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    return Math.floor(seconds / 60).toString().padStart(2, "0") + ":" + (seconds % 60).toString().padStart(2, "0");
  }
  function imageFor(exercise, large = false) {
    const image = node("span", "exercise-preview" + (large ? " workout-exercise-image" : ""));
    image.setAttribute("aria-hidden", "true");
    const source = catalog.get(exercise.id);
    if (source) image.append(exerciseIllustrations.create(source));
    else image.innerHTML = '<svg aria-hidden="true"><use href="#icon-strength"/></svg>';
    return image;
  }

  function updateWorkoutProgress(announce = true) {
    if (!journal?.active) return;
    const totals = workoutState.summary(journal.active);
    document.querySelector("#workout-set-progress").textContent = `${totals.totalSets} / ${totals.plannedSets} Sätze`;
    const progress = document.querySelector("#workout-progress");
    progress.max = totals.plannedSets || 1; progress.value = totals.totalSets;
    if (announce) workoutStatus.textContent = `${totals.totalSets} von ${totals.plannedSets} Sätzen erledigt.`;
    finish.disabled = finishing || !totals.totalSets || (totals.totalSets < totals.plannedSets && !incomplete.checked);
    renderTimers();
  }

  function renderList() {
    finishDrag();
    workoutExercises.replaceChildren(...journal.active.exercises.map((exercise, index) => {
      const count = exercise.done.filter(Boolean).length;
      const state = exercise.skipped ? "Übersprungen" : count === exercise.done.length ? "Abgeschlossen" : exercise.started || count ? "Begonnen" : "Offen";
      const row = node("li", "workout-list-item"); row.dataset.instanceId = exercise.instanceId;
      row.classList.toggle("is-complete", state === "Abgeschlossen");
      row.classList.toggle("is-skipped", exercise.skipped);
      const open = node("button", "workout-exercise-open"); open.type = "button";
      open.setAttribute("aria-haspopup", "dialog");
      const action = exercise.skipped ? "Übung wieder aufnehmen" : state === "Abgeschlossen" ? "Sätze bearbeiten" : exercise.started ? "Übung fortsetzen" : "Übung ansehen";
      open.setAttribute("aria-label", `${action}: ${exercise.name}, ${count} von ${exercise.done.length} Sätzen erledigt`);
      const copy = node("span", "workout-list-copy");
      copy.append(node("small", "workout-item-state", `${index + 1}. Übung · ${state}`), node("strong", "", exercise.name),
        node("small", "", `${exercise.equipment || catalog.get(exercise.id)?.type || "Eigene Übung"} · ${exercise.done.length} × ${exercise.reps} Wdh.`),
        node("span", "workout-row-progress", `${count} von ${exercise.done.length} Sätzen erledigt`));
      if (exercise.started || exercise.skipped) copy.append(node("span", "workout-row-action", action + " ›"));
      open.append(imageFor(exercise), copy);
      open.addEventListener("click", () => openExercise(exercise.instanceId));
      const handle = node("button", "workout-grip", "⠿"); handle.type = "button";
      handle.setAttribute("aria-label", `${exercise.name} verschieben, Position ${index + 1} von ${journal.active.exercises.length}`);
      handle.setAttribute("aria-describedby", "workout-order-help");
      const swap = node("button", "workout-list-swap");
      swap.type = "button";
      swap.setAttribute("aria-label", `${exercise.name} austauschen`);
      swap.setAttribute("aria-haspopup", "dialog");
      swap.innerHTML = '<svg aria-hidden="true"><use href="#icon-swap"/></svg>';
      swap.addEventListener("click", () => openExercise(exercise.instanceId, true));
      row.append(open, handle, swap);
      return row;
    }));
    const archived = journal.active.replacedExercises;
    const history = document.querySelector("#workout-replaced-history");
    history.replaceChildren(); history.hidden = !archived.length;
    if (archived.length) {
      const details = node("details", "workout-instructions");
      details.append(node("summary", "", "Erfasste Sätze ausgetauschter Übungen"));
      const list = node("ul", "workout-archived-list");
      for (const exercise of archived) {
        const values = exercise.done.flatMap((done, index) => done ? [`${exercise.weights[index] || 0} kg × ${exercise.setReps[index]}`] : []);
        const item = node("li"); item.append(node("strong", "", exercise.name), node("p", "planner-note", values.join(" · ")));
        list.append(item);
      }
      details.append(list); history.append(details);
    }
  }

  function renderSummary() {
    const active = journal.active, totals = workoutState.summary(active);
    document.querySelector("#workout-summary-totals").replaceChildren(...[
      ["Aktive Dauer", formatDuration(totals.durationMs)], ["Übungen vollständig", `${totals.completedExercises} / ${active.exercises.length}`], ["Sätze absolviert", `${totals.totalSets} / ${totals.plannedSets}`],
    ].map(([label, value]) => { const item = node("div"); item.append(node("dt", "", label), node("dd", "", value)); return item; }));
    document.querySelector("#workout-summary-exercises").replaceChildren(...[...active.exercises, ...active.replacedExercises].map((exercise) => {
      const row = node("li");
      const entry = node(exercise.archived ? "div" : "button", "workout-summary-exercise");
      const count = exercise.done.filter(Boolean).length;
      entry.append(node("strong", "", exercise.name), node("small", "", exercise.archived ? `${count} Sätze erfasst · Übung ausgetauscht` : `${count} / ${exercise.done.length} Sätze${exercise.skipped ? " · Rest übersprungen" : ""} · Bearbeiten ›`));
      if (!exercise.archived) { entry.type = "button"; entry.dataset.workoutExercise = exercise.instanceId; entry.addEventListener("click", () => openExercise(exercise.instanceId)); }
      row.append(entry); return row;
    }));
    const missing = totals.openSets + totals.skippedSets;
    document.querySelector("#workout-unfinished").textContent = !totals.totalSets ? "Noch kein Satz erledigt. Erfasse mindestens einen Satz, um diese Einheit zu speichern."
      : missing ? `${totals.openSets} offene und ${totals.skippedSets} übersprungene Sätze. Nur die ${totals.totalSets} abgehakten Sätze werden in den Statistiken gezählt.` : "Alle geplanten Sätze erledigt. Du kannst deine Einheit jetzt speichern.";
    document.querySelector("#workout-confirm-label").hidden = !missing || !totals.totalSets;
    incomplete.checked = false;
  }

  function renderWorkout() {
    const active = journal?.active, pending = pendingChange();
    if (!active && !pending) return;
    const record = active ?? pending;
    workoutTitle.textContent = record.name;
    document.querySelector("#workout-scheduled-date").textContent = "Training für " + fullDate.format(new Date(record.date + "T12:00:00"));
    const reviewing = active?.stage === "summary";
    exerciseStage.hidden = !active || reviewing;
    summaryStage.hidden = !reviewing;
    planStage.hidden = Boolean(active) || !pending;
    pauseButton.hidden = !active || reviewing;
    pauseButton.textContent = active?.pausedAt != null ? "Fortsetzen" : "Pausieren";
    pauseButton.setAttribute("aria-pressed", String(active?.pausedAt != null));
    document.querySelector("#workout-paused").hidden = !active || active.pausedAt == null || reviewing;
    document.querySelector("#strength-discard").hidden = !active;
    const checkin = active?.checkin;
    document.querySelector("#workout-checkin-summary").textContent = trainingGuidance.validateCheckin(checkin)
      ? `Check-in gespeichert · ${Object.values(checkin.scores).filter((value) => value > 0).length} Muskelgruppen mit Muskelkater${checkin.pain ? " · Beschwerden angegeben" : ""}` : "Für diese Einheit ist noch kein Check-in gespeichert.";
    if (active) {
      if (reviewing) renderSummary(); else renderList();
      updateWorkoutProgress();
    } else {
      document.querySelector("#workout-plan-change-list").replaceChildren(...pending.changes.map((text) => node("li", "", text)));
      document.querySelector("#workout-apply-plan").disabled = applying;
      document.querySelector("#workout-keep-session").disabled = applying;
      workoutStatus.textContent = "Dein Training ist gespeichert. Entscheide, ob dein Plan angepasst werden soll.";
      renderTimers();
    }
  }

  function closeExercise() {
    if (sheet.open) sheet.close();
    if (journal?.active) { renderList(); updateWorkoutProgress(); }
    const row = [...workoutExercises.children].find((item) => item.dataset.instanceId === sheetId);
    const button = row?.querySelector(swapFromList ? ".workout-list-swap" : ".workout-exercise-open");
    button?.focus({ preventScroll: true });
  }
  function openExercise(id, replace = false) {
    if (!journal?.active?.exercises.some(({ instanceId }) => instanceId === id)) return;
    const next = refreshGuidance(journal.active.stage === "summary" ? workoutState.resume(journal.active) : journal.active);
    next.stage = "overview";
    if (!saveActive(next)) return;
    sheetId = id;
    swapFromList = replace;
    sheetView = currentExercise().started ? "sets" : "preview";
    candidate = null;
    renderWorkout();
    if (replace) openReplacement();
    else renderExercise();
    sheet.showModal(); sheet.scrollTop = 0;
  }

  function openReplacement() {
    replaceFilters = { query: "", group: catalog.get(currentExercise()?.id)?.group ?? "", type: "" };
    sheetView = "replace";
    renderExercise();
    sheet.scrollTop = 0;
  }

  function renderTargets(exercise) {
    const form = node("form", "workout-target-form"); form.id = "workout-target-form";
    const currentRange = trainingGuidance.rangeFor(exercise), profile = trainingGuidance.profile({ ...catalog.get(exercise.id), ...exercise });
    const rangeLabel = node("label", "plan-editor-label guidance-range", "Wiederholungsbereich"), rangeSelect = node("select");
    rangeSelect.id = "workout-rep-range"; rangeSelect.name = "repRange";
    rangeSelect.append(...Object.keys(trainingGuidance.ranges).map((range) => new Option(range.replace("-", "–") + " Wiederholungen", range))); rangeSelect.value = currentRange;
    rangeLabel.append(rangeSelect); form.append(rangeLabel);
    for (const [name, label, value, max] of [["sets", "Geplante Sätze", exercise.done.length, 10], ["reps", "Geplante Zielwiederholungen", exercise.reps, trainingGuidance.ranges[currentRange].max]]) {
      const field = node("label", "plan-editor-label", label), input = node("input");
      input.name = name; input.type = "number"; input.inputMode = "numeric"; input.min = name === "reps" ? trainingGuidance.ranges[currentRange].min : 1;
      input.max = max; input.step = 1; input.required = true; input.value = value; field.append(input); form.append(field);
    }
    rangeSelect.addEventListener("change", () => {
      const range = trainingGuidance.ranges[rangeSelect.value], input = form.elements.reps;
      input.min = range.min; input.max = range.max; input.value = range.target;
    });
    const advanced = node("details", "workout-instructions guidance-profile"); advanced.append(node("summary", "", "Gewichtsangabe und Gerät einstellen"));
    const stepLabel = node("label", "plan-editor-label", "Verfügbarer Gewichtsschritt in kg"), step = node("input");
    step.type = "number"; step.name = "weightStep"; step.inputMode = "decimal"; step.min = .1; step.max = 100; step.step = "any"; step.required = true; step.value = profile.step; stepLabel.append(step);
    const modeLabel = node("label", "plan-editor-label", "Gewichtsart"), mode = node("select"); mode.name = "loadMode";
    mode.append(...Object.entries(trainingGuidance.modes).map(([key, text]) => new Option(text, key))); mode.value = profile.mode; modeLabel.append(mode);
    const deviceLabel = node("label", "plan-editor-label", "Gerätekennung / Variante"), device = node("input"); device.name = "equipmentKey"; device.maxLength = 80; device.value = exercise.equipmentKey || ""; device.placeholder = "z. B. Brustpresse A im Studio"; deviceLabel.append(device);
    const bounds = [["weightMin", "Kleinstes verfügbares Gewicht in kg"], ["weightMax", "Größtes verfügbares Gewicht in kg"]].map(([name, text]) => {
      const label = node("label", "plan-editor-label", text), input = node("input");
      input.name = name; input.type = "number"; input.inputMode = "decimal"; input.min = 0; input.max = 2000; input.step = "any";
      label.append(input); return { label, input };
    });
    const [min, max] = bounds.map(({ input }) => input);
    const preview = node("p", "planner-note");
    const enteredRange = () => trainingGuidance.weightRange(min.valueAsNumber, max.valueAsNumber, step.valueAsNumber);
    function renderWeightPreview() {
      const range = enteredRange();
      if (!range) { preview.textContent = "Minimum und Maximum gemeinsam eingeben. Das Maximum muss auf einer verfügbaren Stufe liegen."; return; }
      const count = Math.round((range.max - range.min) / range.step) + 1;
      const first = Array.from({ length: Math.min(4, count) }, (_, index) => numberFormat.format(range.min + index * range.step));
      preview.textContent = `Verfügbare Stufen · ${first.join(" · ")}${count > 4 ? " … " + numberFormat.format(range.max) : ""} kg`;
    }
    const keyFor = () => trainingGuidance.scopeKey({ ...catalog.get(exercise.id), ...exercise, loadMode: mode.value, equipmentKey: device.value });
    let displayedWeightKey;
    function loadWeightRange() {
      const key = keyFor();
      if (key === displayedWeightKey) return;
      displayedWeightKey = key;
      const saved = journal.weightRanges?.[key];
      min.value = saved?.min ?? "";
      max.value = saved?.max ?? "";
      step.value = saved?.step ?? profile.step;
      const fixed = mode.value === "bodyweight";
      min.disabled = max.disabled = step.disabled = fixed;
      preview.hidden = fixed;
      renderWeightPreview();
    }
    for (const input of [min, max, step]) input.addEventListener("input", renderWeightPreview);
    device.addEventListener("change", loadWeightRange); mode.addEventListener("change", loadWeightRange);
    loadWeightRange();
    const reset = node("button", "plan-button", "Übung zurücksetzen"); reset.type = "button"; reset.id = "workout-reset-exercise";
    reset.addEventListener("click", async () => {
      const current = currentExercise();
      if (current?.instanceId !== exercise.instanceId) return;
      const epoch = accountEpoch, workoutId = journal.active.id;
      const scope = [current.name, current.equipmentKey, trainingGuidance.modes[profile.mode]].filter(Boolean).join(" · ");
      const key = trainingGuidance.scopeKey({ ...catalog.get(current.id), ...current });
      if (!await actionDialog.confirm(reset, "Übung zurücksetzen",
        `Die Satzdaten und Krafttests für „${scope}“ werden im aktuellen Training und in der Historie gelöscht.`, "Übung zurücksetzen")) return;
      if (accountEpoch !== epoch || journal?.active?.id !== workoutId || !sheet.open || currentExercise() !== current) return;
      const next = workoutState.resetExercise(journal, key, catalog);
      if (writeJournal(next, sheetStatus)) {
        render(); renderWorkout(); renderExercise();
        sheetStatus.textContent = "Übung zurückgesetzt. Du kannst einen neuen Krafttest erfassen.";
        sheet.querySelector("#workout-targets-details").open = true;
        sheet.querySelector(".guidance-profile").open = true;
        sheet.querySelector("#workout-reset-exercise").focus({ preventScroll: true });
      }
    });
    const deloadLabel = node("label", "guidance-checkbox"), deload = node("input"); deload.name = "deload"; deload.type = "checkbox"; deload.checked = Boolean(exercise.deload);
    deloadLabel.append(deload, "Heute bewusst leichter trainieren (nicht für den Leistungstrend)");
    advanced.append(modeLabel, deviceLabel, ...bounds.map(({ label }) => label), stepLabel, preview, node("p", "planner-note", "Für Maschine, Kabelzug und Multipresse ist eine Gerätekennung für Gewichtsvorschläge nötig. Kurzhantel: kg pro Hantel. Langhantel: Gesamtgewicht inklusive Stange."), deloadLabel, reset);
    form.append(advanced);
    const apply = node("button", "plan-button", "Vorgaben übernehmen"); apply.type = "submit"; form.append(apply);
    form.append(node("p", "planner-note workout-target-note", "Entfernte offene Sätze verlieren ihre Eingaben. Tatsächlich eingegebene Werte und erledigte Sätze bleiben erhalten."));
    form.addEventListener("submit", (event) => {
      event.preventDefault(); if (!form.reportValidity() || !currentExercise()) return;
      try {
        const range = mode.value === "bodyweight" ? null : enteredRange();
        if (mode.value !== "bodyweight" && (min.value || max.value) && !range) throw new Error("Gib Minimum, Maximum und Gewichtsschritt passend zu den verfügbaren Stufen ein.");
        const settings = {
          repRange: exercise.repRange !== undefined || rangeSelect.value !== currentRange ? rangeSelect.value : undefined,
          weightStep: !range && mode.value !== "bodyweight" && step.valueAsNumber !== profile.step ? step.valueAsNumber : exercise.weightStep,
          loadMode: exercise.loadMode !== undefined || mode.value !== profile.mode ? mode.value : undefined,
          equipmentKey: exercise.equipmentKey !== undefined || device.value.trim() ? device.value.trim() : undefined,
        };
        const next = workoutState.resize(journal.active, exercise.instanceId, form.elements.sets.valueAsNumber, form.elements.reps.valueAsNumber, settings);
        next.exercises.find(({ instanceId }) => instanceId === exercise.instanceId).deload = deload.checked;
        const weightRanges = { ...journal.weightRanges };
        if (range) weightRanges[keyFor()] = range;
        else delete weightRanges[keyFor()];
        const updated = { ...journal, weightRanges };
        updated.active = refreshGuidance(next, updated);
        if (writeJournal(updated, sheetStatus)) { renderWorkout(); renderExercise(); sheetStatus.textContent = "Vorgaben gespeichert und Tagesvorschlag aktualisiert."; }
      } catch (error) { sheetStatus.textContent = error.message; }
    });
    return form;
  }

  function renderSets(exercise) {
    const fieldset = node("fieldset", "workout-sets"); fieldset.disabled = journal.active.pausedAt != null || exercise.skipped;
    fieldset.append(node("legend", "", "Tatsächlich absolviert"), node("p", "planner-note", trainingGuidance.weightLabel({ ...catalog.get(exercise.id), ...exercise }) + ". Vorgeschlagene Werte vor dem Abhaken prüfen."));
    const boxes = node("div", "workout-set-grid"), labels = node("div", "workout-set-labels");
    for (const text of ["Satz", "kg", "Wdh.", "Fertig"]) labels.append(node("span", "", text));
    boxes.append(labels);
    exercise.done.forEach((checked, set) => {
      const row = node("div", "workout-set-row"); row.append(node("span", "", set + 1));
      for (const [field, label, min, max, step] of [["weights", "Gewicht in kg", 0, 2000, "any"], ["setReps", "Wiederholungen", 1, 1000, "1"]]) {
        const input = node("input"); input.type = "number"; input.inputMode = field === "weights" ? "decimal" : "numeric";
        input.min = min; input.max = max; input.step = step; input.required = true; input.value = exercise[field][set]; input.dataset.field = field;
        input.setAttribute("aria-label", `${label}, Satz ${set + 1}, ${exercise.name}`);
        input.addEventListener("input", () => {
          if (!currentExercise() || journal.active.pausedAt != null) return;
          const next = structuredClone(journal.active), entry = next.exercises.find(({ instanceId }) => instanceId === exercise.instanceId);
          if (!entry || set >= entry.done.length) return;
          entry[field][set] = input.value === "" ? "" : input.valueAsNumber;
          if (field === "setReps") entry.touchedReps[set] = true;
          else entry.touchedWeights[set] = true;
          if (!input.validity.valid) { entry.done[set] = false; row.querySelector('[type="checkbox"]').checked = false; }
          if (saveActive(next)) updateWorkoutProgress();
        });
        row.append(input);
      }
      const box = node("input"); box.type = "checkbox"; box.checked = checked;
      box.setAttribute("aria-label", `Satz ${set + 1} für ${exercise.name} abgeschlossen`);
      box.addEventListener("change", () => {
        if (!currentExercise() || journal.active.pausedAt != null) return;
        if (box.checked && [...row.querySelectorAll('[type="number"]')].some((input) => !input.reportValidity())) { box.checked = currentExercise().done[set]; return; }
        const next = structuredClone(journal.active), entry = next.exercises.find(({ instanceId }) => instanceId === exercise.instanceId);
        if (!entry || set >= entry.done.length) return;
        entry.done[set] = box.checked;
        if (box.checked) {
          entry.touchedReps[set] = true; entry.touchedWeights[set] = true; next.restUntil = Date.now() + 180000;
          entry.setContexts[set] = { ...workoutState.contextFor({ ...catalog.get(entry.id), ...entry }), kind: entry.setTypes[set], proposal: entry.acceptedSuggestions[set] };
          entry.acceptedSuggestions[set] = null;
        }
        if (saveActive(next)) updateWorkoutProgress(); else box.checked = checked;
      });
      row.append(box);
      const kindLabel = node("label", "workout-set-kind"), warmup = node("input"); warmup.type = "checkbox"; warmup.checked = exercise.setTypes[set] === "warmup";
      warmup.setAttribute("aria-label", `Satz ${set + 1} als Aufwärmsatz markieren`);
      kindLabel.append(warmup, "Aufwärmsatz · nicht für Gewichtsvorschläge");
      warmup.addEventListener("change", () => {
        if (!currentExercise()) return;
        const next = structuredClone(journal.active), entry = next.exercises.find(({ instanceId }) => instanceId === exercise.instanceId);
        entry.setTypes[set] = warmup.checked ? "warmup" : "work";
        if (warmup.checked) entry.acceptedSuggestions[set] = null;
        if (entry.setContexts[set]) entry.setContexts[set].kind = entry.setTypes[set];
        if (saveActive(refreshGuidance(next))) { renderWorkout(); renderExercise(); }
      });
      row.append(kindLabel); boxes.append(row);
    });
    fieldset.append(boxes); return fieldset;
  }

  function renderExercise() {
    const exercise = currentExercise();
    if (!exercise) { if (sheet.open) sheet.close(); return; }
    document.querySelector("#workout-exercise-dialog-title").textContent = sheetView === "replace" || sheetView === "confirm" ? "Übung austauschen" : exercise.name;
    document.querySelector("#workout-exercise-context").textContent = journal.active.name + " · " + shortDate.format(new Date(journal.active.date + "T12:00:00"));
    sheetStatus.textContent = ""; sheetContent.replaceChildren();
    if (sheetView === "replace") { renderReplacement(exercise); renderTimers(); return; }
    if (sheetView === "confirm") {
      const count = exercise.done.filter(Boolean).length;
      sheetContent.append(imageFor(candidate, true), node("h3", "", candidate.name), node("p", "planner-note", candidate.type),
        node("p", "workout-notice", `${count ? `${count} bereits absolvierte Sätze von „${exercise.name}“ bleiben im Trainingsprotokoll. ` : ""}${exercise.done.length - count} offene Sätze und deren Eingaben werden ersetzt. Die neue Übung startet mit ${exercise.done.length} leeren Sätzen und ${exercise.reps} Zielwiederholungen. Es werden keine tatsächlichen Werte übertragen.`));
      const confirm = node("button", "plan-button primary", "Übung jetzt austauschen"); confirm.type = "button"; confirm.id = "workout-swap-confirm";
      confirm.addEventListener("click", () => {
        if (!currentExercise() || !candidate) return;
        const id = crypto.randomUUID();
        const next = workoutState.replace(journal.active, sheetId, { id: candidate.id, name: candidate.name, equipment: candidate.type, muscles: primaryMuscles(candidate) }, id);
        if (saveActive(refreshGuidance(next))) {
          sheetId = id;
          candidate = null;
          closeExercise();
        }
      });
      const cancel = node("button", "plan-button", "Zurück zur Auswahl"); cancel.type = "button";
      cancel.addEventListener("click", () => { candidate = null; sheetView = "replace"; renderExercise(); });
      const actions = node("div", "planner-actions"); actions.append(confirm, cancel); sheetContent.append(actions); renderTimers(); return;
    }
    const source = catalog.get(exercise.id), hero = node("div", "workout-exercise-hero"), copy = node("div");
    copy.append(node("p", "planner-note", exercise.equipment || source?.type || "Eigene Übung"), node("p", "workout-prescription", `Vorgabe: ${exercise.done.length} × ${exercise.reps} Wiederholungen`));
    hero.append(imageFor(exercise, true), copy); sheetContent.append(hero);
    sheetContent.append(renderGuidance(exercise));
    if (source?.steps?.length) {
      const details = node("details", "workout-instructions"), steps = node("ol"); details.id = "workout-technique";
      details.append(node("summary", "", "Ausführung ansehen"), node("p", "", source.gear));
      steps.append(...source.steps.map((text) => node("li", "", text))); details.append(steps); sheetContent.append(details);
    }
    if (sheetView === "sets") {
      sheetContent.append(renderSets(exercise));
      const targets = node("details", "workout-instructions"); targets.id = "workout-targets-details"; targets.append(node("summary", "", "Wiederholungsbereich und Satzvorgaben anpassen"), renderTargets(exercise)); sheetContent.append(targets);
      const done = node("button", "plan-button primary workout-return", "Zur Trainingsübersicht"); done.type = "button"; done.id = "workout-exercise-done";
      done.addEventListener("click", closeExercise); sheetContent.append(done);
    } else {
      const discouraged = ["pain", "strong"].includes(exercise.guidance?.recovery.level);
      const startExercise = node("button", "plan-button primary workout-return", discouraged ? "Bereits absolvierte Sätze dokumentieren" : exercise.skipped ? "Übung wieder aufnehmen" : exercise.started ? "Übung fortsetzen" : "Übung starten");
      startExercise.type = "button"; startExercise.id = "workout-exercise-start"; startExercise.disabled = journal.active.pausedAt != null;
      startExercise.addEventListener("click", () => {
        if (!currentExercise()) return;
        const next = structuredClone(journal.active), entry = next.exercises.find(({ instanceId }) => instanceId === sheetId);
        entry.started = true; entry.skipped = false;
        if (saveActive(next)) { sheetView = "sets"; renderWorkout(); renderExercise(); sheet.scrollTop = 0; }
      });
      sheetContent.append(startExercise);
      const targets = node("details", "workout-instructions"); targets.id = "workout-targets-details"; targets.append(node("summary", "", "Wiederholungsbereich und Satzvorgaben anpassen"), renderTargets(exercise)); sheetContent.append(targets);
    }
    const swap = node("button", "plan-button", "Übung austauschen"); swap.type = "button"; swap.id = "workout-swap";
    swap.addEventListener("click", openReplacement);
    const skip = node("button", "text-button", exercise.skipped ? "Übung wieder aufnehmen" : exercise.done.some(Boolean) ? "Offene Sätze überspringen" : "Übung überspringen");
    skip.type = "button"; skip.id = "workout-skip"; skip.disabled = exercise.done.every(Boolean);
    skip.addEventListener("click", () => {
      const next = structuredClone(journal.active), entry = next.exercises.find(({ instanceId }) => instanceId === sheetId);
      if (!entry) return;
      entry.skipped = !entry.skipped; next.restUntil = null; next.restRemaining = 0;
      if (saveActive(next)) { renderWorkout(); closeExercise(); }
    });
    const actions = node("div", "planner-actions"); actions.append(swap, skip); sheetContent.append(actions);
    renderTimers();
  }

  function renderReplacement(exercise) {
    sheetContent.append(node("p", "planner-note", "Ersatz für „" + exercise.name + "“. Die Auswahl wird erst nach deiner Bestätigung übernommen."));
    const controls = node("div", "library-controls workout-replacement-controls");
    const searchLabel = node("label", "full-row", "Übung suchen"), search = node("input"); search.type = "search"; search.id = "workout-replace-search"; search.value = replaceFilters.query;
    searchLabel.append(search); controls.append(searchLabel);
    for (const [field, label, values] of [["group", "Muskelgruppe", catalogSearch.groups], ["type", "Equipment", catalogSearch.types]]) {
      const wrapper = node("label", "", label), select = node("select"); select.id = "workout-replace-" + field;
      select.replaceChildren(new Option("Alle", ""), ...values.map((value) => new Option(value, value))); select.value = replaceFilters[field];
      select.addEventListener("change", () => { replaceFilters[field] = select.value; update(); }); wrapper.append(select); controls.append(wrapper);
    }
    const count = node("p", "planner-note"), results = node("div", "workout-replacement-results"); results.id = "workout-replace-results";
    const cancel = node("button", "plan-button", "Austausch abbrechen"); cancel.type = "button"; cancel.id = "workout-replace-cancel";
    cancel.addEventListener("click", () => {
      if (swapFromList) {
        closeExercise();
        return;
      }
      sheetView = exercise.started ? "sets" : "preview";
      renderExercise();
      sheet.scrollTop = 0;
    });
    function update() {
      const matches = catalogSearch.find(replaceFilters.query, replaceFilters.group, replaceFilters.type).filter(({ id }) => id !== exercise.id);
      count.textContent = `${matches.length} passende Übungen`; results.replaceChildren();
      if (!matches.length) results.append(node("p", "workout-notice", "Keine passende Übung gefunden. Ändere Suche oder Filter."));
      for (const group of catalogSearch.groups) {
        const entries = matches.filter((entry) => entry.group === group); if (!entries.length) continue;
        const list = node("ul", "exercise-grid"); results.append(node("h3", "", group), list);
        for (const entry of entries) {
          const item = document.querySelector("#exercise-template").content.cloneNode(true), button = item.querySelector("button");
          button.removeAttribute("aria-haspopup"); button.dataset.replacementId = entry.id; button.prepend(imageFor(entry));
          item.querySelector(".exercise-name").textContent = entry.name; item.querySelector(".exercise-meta").textContent = entry.type;
          item.querySelector(".arrow use").setAttribute("href", "#icon-swap");
          button.addEventListener("click", () => { candidate = entry; sheetView = "confirm"; renderExercise(); sheet.scrollTop = 0; }); list.append(item);
        }
      }
    }
    search.addEventListener("input", () => { replaceFilters.query = search.value; update(); });
    sheetContent.append(controls, count, cancel, results); update();
  }

  function moveExercise(id, position, focus = false) {
    if (!journal?.active) return;
    if (!saveActive(workoutState.move(journal.active, id, position))) return;
    renderWorkout(); workoutStatus.textContent = "Reihenfolge für diese Einheit gespeichert.";
    if (focus) [...workoutExercises.children].find((row) => row.dataset.instanceId === id)?.querySelector(".workout-grip").focus({ preventScroll: true });
  }
  function positionDrag() {
    if (!drag) return;
    const origin = drag.bounds[drag.from], delta = drag.y - drag.startY + dialog.scrollTop - drag.scrollTop;
    const offset = Math.max(drag.bounds[0].top - origin.top, Math.min(delta, drag.bounds.at(-1).bottom - origin.bottom));
    const center = origin.top + origin.height / 2 + offset;
    let target = drag.from;
    while (target < drag.rows.length - 1 && center + .5 >= drag.bounds[target + 1].top + drag.bounds[target + 1].height / 2) target++;
    while (target > 0 && center - .5 <= drag.bounds[target - 1].top + drag.bounds[target - 1].height / 2) target--;
    drag.target = target;
    drag.rows.forEach((row, index) => {
      row.style.transform = index === drag.from ? `translateY(${offset}px)` : drag.from < index && index <= target ? `translateY(-${origin.height + 12}px)` : target <= index && index < drag.from ? `translateY(${origin.height + 12}px)` : "";
    });
  }
  function scrollDrag() {
    if (!drag) return;
    positionDrag();
    const top = document.querySelector(".workout-toolbar").getBoundingClientRect().bottom + 40;
    if (drag.y < top) dialog.scrollBy(0, -12);
    if (drag.y > innerHeight - 64) dialog.scrollBy(0, 12);
    drag.frame = requestAnimationFrame(scrollDrag);
  }
  function finishDrag(commit = false) {
    if (!drag) return;
    const previous = drag; drag = null; cancelAnimationFrame(previous.frame);
    previous.rows.forEach((row) => { row.style.transform = ""; row.classList.remove("is-dragging"); });
    if (previous.handle.hasPointerCapture(previous.pointerId)) previous.handle.releasePointerCapture(previous.pointerId);
    if (commit && previous.from !== previous.target) moveExercise(previous.id, previous.target, true);
  }
  workoutExercises.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest(".workout-grip");
    if (!handle || drag || !event.isPrimary || event.button !== 0 || !journal?.active) return;
    event.preventDefault(); handle.focus({ preventScroll: true }); handle.setPointerCapture(event.pointerId);
    const row = handle.closest(".workout-list-item"), rows = [...workoutExercises.children];
    drag = { handle, id: row.dataset.instanceId, rows, from: rows.indexOf(row), target: rows.indexOf(row), bounds: rows.map((entry) => entry.getBoundingClientRect()), scrollTop: dialog.scrollTop, pointerId: event.pointerId, startY: event.clientY, y: event.clientY, frame: 0 };
  });
  workoutExercises.addEventListener("pointermove", (event) => {
    if (drag?.pointerId !== event.pointerId) return;
    drag.y = event.clientY;
    if (!drag.frame && Math.abs(drag.y - drag.startY) > 5) { drag.rows[drag.from].classList.add("is-dragging"); scrollDrag(); }
  });
  workoutExercises.addEventListener("pointerup", (event) => { if (drag?.pointerId === event.pointerId) { drag.y = event.clientY; positionDrag(); finishDrag(true); } });
  for (const name of ["pointercancel", "lostpointercapture"]) workoutExercises.addEventListener(name, (event) => { if (drag?.pointerId === event.pointerId) finishDrag(); });
  workoutExercises.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drag) { event.preventDefault(); finishDrag(); return; }
    const handle = event.target.closest(".workout-grip");
    if (!handle || !["ArrowUp", "ArrowDown"].includes(event.key) || !journal?.active) return;
    event.preventDefault(); const id = handle.closest("li").dataset.instanceId;
    const from = journal.active.exercises.findIndex((entry) => entry.instanceId === id);
    moveExercise(id, from + (event.key === "ArrowUp" ? -1 : 1), true);
  });

  function showSummary() {
    if (!journal?.active) return;
    const next = workoutState.pause(journal.active); next.stage = "summary";
    if (!saveActive(next)) return;
    if (sheet.open) sheet.close(); renderWorkout(); dialog.scrollTop = 0;
    document.querySelector("#workout-summary-title").focus({ preventScroll: true });
  }
  function pauseAndLeave() {
    if (journal?.active && !saveActive(workoutState.pause(journal.active))) return;
    finishDrag(); if (sheet.open) sheet.close(); dialog.close(); render();
  }
  function openWorkout(resume = false, checkin = null) {
    if (!storageKey) return;
    journal = readJournal();
    if (resume && !journal.active && !pendingChange()) { render(); return; }
    if (journal.active && !resume && !selectedActiveWorkout()) return;
    status.textContent = "";
    if (!journal.active && !pendingChange()) {
      const session = selectedSession(); if (!session?.exercises.length) return;
      const source = planAccess?.snapshot();
      if (!source) { status.textContent = "Bitte warte, bis dein Trainingsplan im Konto gespeichert ist."; return; }
      const entries = exercisesForToday(session); if (!entries.length) { status.textContent = "Wähle Equipment aus, für das Übungen verfügbar sind."; return; }
      if (!trainingGuidance.validateCheckin(checkin)) { openCheckin(); return; }
      const active = workoutState.normalize({ id: crypto.randomUUID(), date: dateKey(selectedDate), startedAt: Date.now(), stage: "overview",
        sourcePlanId: source.id, sourceVersion: source.version, sourceSessionIndex: Number(sessionSelect.value), sourceSession: JSON.stringify(session), name: session.name, checkin,
        exercises: entries.map((entry) => { const exercise = catalog.get(entry.id); return {
          instanceId: crypto.randomUUID(), slotId: `source-${entry.sourceIndex}`, id: entry.id, name: exercise?.name ?? entry.name, equipment: exercise?.type ?? entry.equipment,
          muscles: primaryMuscles(exercise), reps: entry.reps, done: Array(entry.sets).fill(false), weights: Array(entry.sets).fill(""), setReps: Array(entry.sets).fill(entry.reps),
          ...trainingPlanData.normalizeExerciseSettings(entry),
        }; }),
      });
      if (!writeJournal({ ...journal, active: refreshGuidance(active) }, status)) return;
    } else if (journal.active && journal.active.stage !== "summary") {
      const next = refreshGuidance(workoutState.resume(journal.active)); next.stage = "overview"; if (!saveActive(next)) return;
    }
    renderWorkout();
    if (optionsDialog.open) optionsDialog.close(); if (activityDialog.open) activityDialog.close();
    if (!dialog.open) dialog.showModal(); dialog.scrollTop = 0; render(); renderTimers();
  }
  function togglePause() {
    if (!journal?.active) return;
    const next = journal.active.pausedAt != null ? workoutState.resume(journal.active) : workoutState.pause(journal.active);
    if (saveActive(next)) { renderWorkout(); if (sheet.open) renderExercise(); }
  }
  start.addEventListener("click", () => openWorkout());
  activeWidget.addEventListener("click", () => openWorkout(true));
  document.querySelector("#workout-leave").addEventListener("click", pauseAndLeave);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); pauseAndLeave(); });
  sheet.addEventListener("cancel", (event) => { event.preventDefault(); closeExercise(); });
  document.querySelector("#workout-exercise-close").addEventListener("click", closeExercise);
  pauseButton.addEventListener("click", togglePause);
  document.querySelector("#workout-exercise-pause").addEventListener("click", togglePause);
  document.querySelector("#workout-review").addEventListener("click", showSummary);
  document.querySelector("#workout-back").addEventListener("click", () => {
    if (!journal?.active) return;
    const next = workoutState.resume(journal.active); next.stage = "overview";
    if (saveActive(next)) { renderWorkout(); dialog.scrollTop = 0; }
  });
  incomplete.addEventListener("change", () => updateWorkoutProgress());

  finish.addEventListener("click", async () => {
    if (finishing || !journal?.active || journal.active.stage !== "summary" || finish.disabled) return;
    const id = journal.active.id, key = storageKey, epoch = accountEpoch;
    finishing = true; updateWorkoutProgress();
    const commit = () => {
      if (storageKey !== key || accountEpoch !== epoch) return;
      journal = readJournal();
      if (!journal.active || journal.active.id !== id) { if (pendingChange()) renderWorkout(); else dialog.close(); render(); return; }
      if (journal.active.stage !== "summary") { renderWorkout(); return; }
      const totals = workoutState.summary(journal.active);
      if (!totals.totalSets || (totals.totalSets < totals.plannedSets && !incomplete.checked)) { renderWorkout(); return; }
      if (!writeJournal(workoutState.complete(journal, id), workoutStatus)) return;
      latestCompleted = id;
      shareLatest.hidden = !socialShare;
      if (pendingChange()) { renderWorkout(); dialog.scrollTop = 0; document.querySelector("#workout-plan-changes-title").focus({ preventScroll: true }); }
      else { dialog.close(); status.textContent = "Training gespeichert."; }
      render();
    };
    try { if (navigator.locks) await navigator.locks.request(`fitness-workout:${key}`, commit); else commit(); }
    catch { if (accountEpoch === epoch) workoutStatus.textContent = "Speichern fehlgeschlagen. Deine Einheit bleibt fortsetzbar."; }
    finally { if (accountEpoch === epoch) { finishing = false; if (journal?.active) updateWorkoutProgress(false); } }
  });

  async function settlePlanChange(apply) {
    if (applying || !pendingChange()) return;
    const pending = structuredClone(pendingChange()), key = storageKey, epoch = accountEpoch;
    applying = true; renderWorkout();
    const commit = async () => {
      if (accountEpoch !== epoch || storageKey !== key) return;
      journal = readJournal();
      if (!journal.pendingPlanChanges?.some(({ workoutId }) => workoutId === pending.workoutId)) { if (!journal.active) dialog.close(); render(); return; }
      if (apply) await planAccess.apply(pending);
      if (accountEpoch !== epoch || storageKey !== key) return;
      journal = readJournal();
      const next = { ...journal, pendingPlanChanges: (journal.pendingPlanChanges ?? []).filter(({ workoutId }) => workoutId !== pending.workoutId) };
      if (!writeJournal(next, workoutStatus)) return;
      if (journal.active || pendingChange()) renderWorkout(); else dialog.close();
      status.textContent = apply ? "Training gespeichert und Plan für zukünftige Trainings aktualisiert." : "Training gespeichert. Dein Plan bleibt unverändert.";
      render();
    };
    try { if (navigator.locks) await navigator.locks.request(`fitness-workout:${key}`, commit); else await commit(); }
    catch (error) { if (accountEpoch === epoch) workoutStatus.textContent = error.message + " Deine Entscheidung bleibt für einen erneuten Versuch gespeichert."; }
    finally {
      if (accountEpoch === epoch) {
        applying = false; document.querySelector("#workout-apply-plan").disabled = false; document.querySelector("#workout-keep-session").disabled = false;
      }
    }
  }
  document.querySelector("#workout-apply-plan").addEventListener("click", async ({ currentTarget }) => {
    const pending = pendingChange(), epoch = accountEpoch;
    if (!pending || applying || !await actionDialog.confirm(currentTarget, "Änderungen in den Plan übernehmen",
      "Die Änderungen an dieser Einheit gelten dann auch für zukünftige Trainings mit diesem Plan.", "Änderungen übernehmen")) return;
    if (accountEpoch === epoch && pendingChange()?.workoutId === pending.workoutId) settlePlanChange(true);
  });
  document.querySelector("#workout-keep-session").addEventListener("click", () => settlePlanChange(false));
  document.querySelector("#strength-discard").addEventListener("click", async ({ currentTarget }) => {
    const id = journal?.active?.id, epoch = accountEpoch;
    if (!id || !await actionDialog.confirm(currentTarget, "Training verwerfen",
      "Die Eingaben dieser laufenden Einheit werden gelöscht.", "Training verwerfen")) return;
    if (accountEpoch !== epoch || journal?.active?.id !== id) return;
    if (!writeJournal({ ...journal, active: null }, workoutStatus)) return;
    if (sheet.open) sheet.close(); dialog.close(); render();
  });

  document.addEventListener("fitness:planchange", render);
  document.querySelector("#strength-menu").addEventListener("click", () => optionsDialog.showModal());
  document.querySelector("#strength-saved").addEventListener("click", () => historyDialog.showModal());
  shareLatest.addEventListener("click", () => socialShare?.(latestCompleted));
  document.querySelector("#strength-add-activity").addEventListener("click", () => activityDialog.showModal());
  document.querySelector("#activity-strength").addEventListener("click", () => {
    activityDialog.close();
    if (selectedSession()?.exercises.length) optionsDialog.showModal();
    else if (!trainingPlanner.getPlan()?.sessions.length) location.hash = "#trainingsplan";
    else {
      status.textContent = "Wähle im Kalender einen Trainingstag aus, um die geplante Einheit zu starten.";
      calendar.querySelector('[aria-pressed="true"]').focus();
    }
  });
  document.querySelector("#calendar-today").addEventListener("click", () => { selectedDate = new Date(); render(); });
  for (const [selector, offset] of [["#calendar-prev", -7], ["#calendar-next", 7]]) {
    document.querySelector(selector).addEventListener("click", () => {
      selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + offset);
      render();
    });
  }
  for (const type of trainingPlanData.equipment) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = type;
    label.append(input, type);
    equipmentChoices.append(label);
  }
  sessionSelect.addEventListener("change", () => { resetAdjustments(); renderSelectedSession(); });
  equipmentChoices.addEventListener("change", renderSelectedSession);
  minutesInput.addEventListener("input", () => {
    minutesOutput.value = minutesInput.value + " Min.";
    renderSelectedSession();
  });
  function renderTimers() {
    const active = journal?.active;
    const duration = active ? workoutState.elapsed(active) : pendingChange()?.durationMs ?? 0;
    document.querySelector("#workout-elapsed").value = formatDuration(duration);
    document.querySelector(".workout-elapsed-mirror").value = formatDuration(duration);
    const rest = active ? Math.max(0, Math.ceil((active.pausedAt != null ? active.restRemaining ?? 0 : (active.restUntil ?? 0) - Date.now()) / 1000)) : 0;
    restSkip.hidden = rest === 0 || active?.stage === "summary";
    const time = Math.floor(rest / 60) + ":" + (rest % 60).toString().padStart(2, "0");
    document.querySelector("#workout-rest").textContent = time;
    const mirror = document.querySelector("#workout-exercise-rest");
    mirror.hidden = restSkip.hidden; mirror.querySelector("span").textContent = time;
    document.querySelector("#workout-exercise-pause").textContent = active?.pausedAt != null ? "Fortsetzen" : "Pausieren";
    document.querySelector("#workout-exercise-paused").hidden = !active || active.pausedAt == null;
  }
  function endRest() {
    if (!journal?.active) return;
    const active = { ...journal.active, restUntil: null, restRemaining: 0 };
    if (writeJournal({ ...journal, active }, workoutStatus)) renderTimers();
  }
  restSkip.addEventListener("click", endRest);
  document.querySelector("#workout-exercise-rest").addEventListener("click", endRest);
  function syncWorkoutViewport() {
    const viewport = window.visualViewport;
    sheet.style.setProperty("--workout-viewport-height", `${viewport?.height ?? innerHeight}px`);
    sheet.style.setProperty("--workout-keyboard-offset", `${Math.max(0, innerHeight - (viewport?.height ?? innerHeight) - (viewport?.offsetTop ?? 0))}px`);
  }
  window.visualViewport?.addEventListener("resize", syncWorkoutViewport);
  window.visualViewport?.addEventListener("scroll", syncWorkoutViewport);
  syncWorkoutViewport();
  window.setInterval(renderTimers, 1000);
  window.addEventListener("storage", (event) => {
    if (!storageKey || (event.key !== storageKey && event.key !== null)) return;
    actionDialog.dismissWithin(sheet);
    actionDialog.dismissWithin(dialog);
    journal = readJournal();
    if (dialog.open) {
      if (journal.active) renderWorkout();
      else if (pendingChange()) renderWorkout();
      else { if (sheet.open) sheet.close(); dialog.close(); }
    }
    if (sheet.open) renderExercise();
    render();
  });

  return {
    render,
    setPlanAccess(access) { planAccess = access; },
    open() {
      selectedDate = new Date();
      shownDate = undefined;
      render();
    },
    getTrainingDates: () => journal?.workouts.map(({ date }) => date) ?? [],
    getSocialWorkouts: () => (journal?.workouts ?? []).map(({ id, name, date, minutes, totalSets }) =>
      ({ id, name, date, minutes, sets: totalSets })),
    setSocialShare(open) {
      if (socialShare === open) return;
      socialShare = open;
      shareLatest.hidden = !open || !latestCompleted;
      if (historyDialog.open) renderHistory();
    },
    close() {
      checkinContext = null;
      finishDrag();
      actionDialog.dismissWithin(sheet);
      actionDialog.dismissWithin(dialog);
      if (dialog.open && journal?.active) saveActive(workoutState.pause(journal.active));
      for (const sheet of [checkinDialog, document.querySelector("#workout-exercise-dialog"), dialog, optionsDialog, historyDialog, activityDialog]) {
        if (sheet.open) sheet.close();
      }
      shownPlan = undefined;
    },
    setAccount(id) {
      latestCompleted = undefined;
      shareLatest.hidden = true;
      checkinContext = null;
      actionDialog.dismissWithin(sheet);
      actionDialog.dismissWithin(dialog);
      if (checkinDialog.open) checkinDialog.close();
      finishDrag();
      if (storageKey && journal?.active) saveActive(workoutState.pause(journal.active));
      if (dialog.open) dialog.close();
      if (sheet.open) sheet.close();
      accountEpoch++;
      finishing = false;
      applying = false;
      sheetId = undefined;
      sheetContent.replaceChildren();
      workoutExercises.replaceChildren();
      document.querySelector("#workout-summary-exercises").replaceChildren();
      workoutStatus.textContent = "";
      storageKey = id ? `fitness-app.workout-journal.v1.${id}` : null;
      journal = readJournal();
      selectedDate = new Date();
      lastToday = dateKey(selectedDate);
      shownPlan = undefined;
      status.textContent = "";
      render();
      document.dispatchEvent(new Event("fitness:workoutchange"));
    },
  };
})();
