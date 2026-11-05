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
        if (stored.active) {
          stored.active.startedAt ??= Date.now();
          for (const exercise of stored.active.exercises) {
            exercise.weights ??= exercise.done.map(() => "");
            exercise.setReps ??= exercise.done.map(() => exercise.reps);
          }
        }
        return stored;
      }
    } catch {
      // An unreadable browser entry has no usable workouts.
    }
    return { workouts: [], active: null };
  }

  function writeJournal(next, messageElement) {
    try {
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
    for (const entry of session.exercises) {
      const exercise = catalog.get(entry.id);
      if (exercise && !equipment.includes(exercise.type)) {
        const alternative = exerciseCatalog.find((candidate) =>
          candidate.group === exercise.group && equipment.includes(candidate.type) &&
          !retained.has(candidate.id) && !selected.some(({ id }) => candidate.id === id));
        if (alternative) selected.push({ id: alternative.id, sets: entry.sets, reps: entry.reps });
      } else if (exercise || !entry.equipment || equipment.includes(entry.equipment)) selected.push({ ...entry });
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
    start.querySelector(".sr-only").textContent = actionLabel;
    document.querySelector("#strength-start-hint").firstChild.textContent = actionLabel + " ";
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
    preview.replaceChildren(...exercises.map((entry) => {
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
      detail.textContent = (entry.sets ?? entry.done.length) + " × " + entry.reps + " · " + (exercise?.type ?? "Eigene Übung");
      copy.append(name, detail);
      row.append(copy);
      return row;
    }));
    customize.hidden = Boolean(journal.active) || !session;
    start.disabled = Boolean(journal.active && !active) || !exercises.length;
    const blocked = document.querySelector("#strength-active-note");
    blocked.hidden = !journal.active || Boolean(active);
    if (!blocked.hidden) blocked.textContent = "Es läuft noch ein anderes Training. Setze es über „Training läuft“ fort oder verwirf es, bevor du diese Einheit startest.";
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
      return row;
    }));
    const trainingDays = new Set(journal.workouts.map(({ date }) => date)).size;
    document.querySelector("#strength-streak").textContent = trainingDays ? trainingDays + " Trainingstage" : "";
  }

  function render() {
    const todayKey = dateKey(new Date());
    if (lastToday !== todayKey && dateKey(selectedDate) === lastToday) selectedDate = new Date();
    lastToday = todayKey;
    activeWidget.hidden = !storageKey || !journal?.active;
    document.body.classList.toggle("has-active-workout", Boolean(storageKey && journal?.active));
    document.querySelector("#active-workout-name").textContent = journal?.active?.name ?? "";
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

  function updateWorkoutProgress() {
    const done = journal.active.exercises.flatMap((exercise) => exercise.done);
    const count = done.filter(Boolean).length;
    workoutStatus.textContent = `${count} von ${done.length} Sätzen abgehakt.`;
    finish.disabled = count === 0;
  }

  function renderWorkout() {
    const active = journal.active;
    workoutTitle.textContent = active.name;
    document.querySelector("#workout-scheduled-date").textContent = "Training für " + fullDate.format(new Date(active.date + "T12:00:00"));
    workoutExercises.replaceChildren(...active.exercises.map((exercise, index) => {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "workout-sets";
      const legend = document.createElement("legend");
      const illustration = exercise.id && exerciseIllustrations.create(catalog.get(exercise.id));
      if (illustration) {
        const image = document.createElement("span");
        image.className = "exercise-preview";
        image.setAttribute("aria-hidden", "true");
        image.append(illustration);
        legend.append(image);
      }
      legend.append(exercise.name);
      const reps = document.createElement("p");
      reps.className = "planner-note";
      reps.textContent = `${exercise.reps} Wiederholungen pro Satz`;
      const boxes = document.createElement("div");
      boxes.className = "workout-set-grid";
      const labels = document.createElement("div");
      labels.className = "workout-set-labels";
      for (const text of ["Satz", "kg", "Wdh.", "Fertig"]) {
        const label = document.createElement("span");
        label.textContent = text;
        labels.append(label);
      }
      boxes.append(labels);
      exercise.done.forEach((checked, set) => {
        const row = document.createElement("div");
        row.className = "workout-set-row";
        const number = document.createElement("span");
        number.textContent = set + 1;
        row.append(number);
        for (const [field, label, min, max, step, value] of [
          ["weights", "Gewicht in kg", 0, 2000, ".5", exercise.weights[set]],
          ["setReps", "Wiederholungen", 1, 1000, "1", exercise.setReps[set]],
        ]) {
          const input = document.createElement("input");
          input.type = "number";
          input.inputMode = "decimal";
          input.min = min;
          input.max = max;
          input.step = step;
          input.required = field === "setReps";
          input.value = value;
          input.setAttribute("aria-label", label + ", Satz " + (set + 1) + ", " + exercise.name);
          input.addEventListener("change", () => {
            if (!input.reportValidity()) return;
            const active = structuredClone(journal.active);
            active.exercises[index][field][set] = input.value === "" ? "" : input.valueAsNumber;
            if (!writeJournal({ ...journal, active }, workoutStatus)) input.value = journal.active.exercises[index][field][set];
          });
          row.append(input);
        }
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = checked;
        box.setAttribute("aria-label", "Satz " + (set + 1) + " für " + exercise.name + " abgeschlossen");
        box.addEventListener("change", () => {
          if ([...row.querySelectorAll('input[type="number"]')].some((input) => !input.reportValidity())) {
            box.checked = journal.active.exercises[index].done[set];
            return;
          }
          const active = structuredClone(journal.active);
          active.exercises[index].done[set] = box.checked;
          if (box.checked) active.restUntil = Date.now() + 3 * 60_000;
          if (writeJournal({ ...journal, active }, workoutStatus)) updateWorkoutProgress();
          else box.checked = journal.active.exercises[index].done[set];
        });
        row.append(box);
        boxes.append(row);
      });
      fieldset.append(legend, reps, boxes);
      return fieldset;
    }));
    updateWorkoutProgress();
  }

  function openWorkout(resume = false) {
    if (!storageKey) return;
    if (resume && !journal.active) return;
    if (journal.active && !resume && !selectedActiveWorkout()) return;
    status.textContent = "";
    if (!journal.active) {
      const session = selectedSession();
      if (!session?.exercises.length) return;
      const entries = exercisesForToday(session);
      if (!entries.length) {
        status.textContent = "Wähle Equipment aus, für das Übungen verfügbar sind.";
        return;
      }
      const active = {
        date: dateKey(selectedDate),
        startedAt: Date.now(),
        sourcePlanId: document.querySelector("#account-plans").value,
        sourceSession: JSON.stringify(session),
        name: session.name,
        exercises: entries.map((entry) => {
          const exercise = catalog.get(entry.id);
          return {
            id: entry.id,
            name: exercise?.name ?? entry.name,
            muscles: primaryMuscles(exercise),
            reps: entry.reps,
            done: Array(entry.sets).fill(false),
            weights: Array(entry.sets).fill(""),
            setReps: Array(entry.sets).fill(entry.reps),
          };
        }),
      };
      if (!writeJournal({ ...journal, active }, status)) return;
    }
    renderWorkout();
    if (optionsDialog.open) optionsDialog.close();
    if (activityDialog.open) activityDialog.close();
    dialog.showModal();
    dialog.scrollTop = 0;
    render();
    renderTimers();
  }
  start.addEventListener("click", () => openWorkout());
  activeWidget.addEventListener("click", () => openWorkout(true));

  finish.addEventListener("click", () => {
    if (!journal.active) return;
    const { date, name, exercises, startedAt } = journal.active;
    const groups = new Map();
    let totalSets = 0;
    let volume = 0;
    for (const exercise of exercises) {
      const count = exercise.done.filter(Boolean).length;
      if (!count) continue;
      totalSets += count;
      exercise.done.forEach((done, index) => {
        if (done) volume += Number(exercise.weights[index] || 0) * exercise.setReps[index];
      });
      for (const muscle of exercise.muscles) groups.set(muscle, (groups.get(muscle) ?? 0) + count);
    }
    if (!totalSets) return;
    const workouts = [...journal.workouts, {
      date, name, totalSets, muscleSets: [...groups], volume, exercises, startedAt,
      minutes: Math.max(1, Math.round((Date.now() - journal.active.startedAt) / 60_000)),
    }];
    if (!writeJournal({ workouts, active: null }, workoutStatus)) return;
    dialog.close();
    status.textContent = "Training gespeichert.";
    render();
  });

  document.querySelector("#strength-discard").addEventListener("click", () => {
    if (!window.confirm("Dieses Training verwerfen?")) return;
    if (!writeJournal({ ...journal, active: null }, workoutStatus)) return;
    dialog.close();
    render();
  });

  document.addEventListener("fitness:planchange", render);
  document.querySelector("#strength-menu").addEventListener("click", () => optionsDialog.showModal());
  document.querySelector("#strength-saved").addEventListener("click", () => historyDialog.showModal());
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
    if (!journal?.active) return;
    const elapsed = Math.max(0, Math.floor((Date.now() - journal.active.startedAt) / 1000));
    document.querySelector("#workout-elapsed").value = Math.floor(elapsed / 60).toString().padStart(2, "0") + ":" + (elapsed % 60).toString().padStart(2, "0");
    const rest = Math.max(0, Math.ceil(((journal.active.restUntil ?? 0) - Date.now()) / 1000));
    restSkip.hidden = rest === 0;
    document.querySelector("#workout-rest").textContent = Math.floor(rest / 60) + ":" + (rest % 60).toString().padStart(2, "0");
  }
  restSkip.addEventListener("click", () => {
    const active = { ...journal.active, restUntil: null };
    if (writeJournal({ ...journal, active }, workoutStatus)) renderTimers();
  });
  window.setInterval(renderTimers, 1000);
  window.addEventListener("storage", (event) => {
    if (!storageKey || (event.key !== storageKey && event.key !== null)) return;
    journal = readJournal();
    if (dialog.open) {
      if (journal.active) renderWorkout();
      else dialog.close();
    }
    render();
  });

  return {
    render,
    getTrainingDates: () => journal?.workouts.map(({ date }) => date) ?? [],
    close() {
      for (const sheet of [dialog, optionsDialog, historyDialog, activityDialog]) {
        if (sheet.open) sheet.close();
      }
      shownPlan = undefined;
    },
    setAccount(id) {
      if (dialog.open) dialog.close();
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
