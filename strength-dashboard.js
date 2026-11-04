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
  const catalog = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]));
  const shortDate = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" });
  let storageKey;
  let journal;
  let shownPlan;
  let shownDate;

  function dateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
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
      if (Array.isArray(stored?.workouts)) return stored;
    } catch {
      // An unreadable browser entry has no usable workouts.
    }
    return { workouts: [], active: null };
  }

  function writeJournal(next, messageElement) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      journal = next;
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

  function render() {
    if (section.hidden || !journal) return;
    const now = new Date();
    const today = dateKey(now);
    const weekday = (now.getDay() + 6) % 7;
    const plan = trainingPlanner.getPlan();
    const sessions = plan?.sessions ?? [];
    const available = sessions.map((session, index) => ({ session, index })).filter(({ session }) => session.exercises.length);
    const scheduled = sessions.filter((session) => session.weekday === weekday);
    if (scheduled.length) schedule.textContent = `Heute geplant · ${scheduled.map(({ name }) => name).join(" · ")}`;
    else if (plan) schedule.textContent = "Heute ist kein Training eingeplant.";
    else schedule.textContent = "Erstelle einen Trainingsplan, um eine Einheit zu starten.";

    const preferred = available.find(({ session }) => session.weekday === weekday) ?? available[0];
    const selection = shownPlan === plan && shownDate === today ? sessionSelect.value : "";
    sessionSelect.replaceChildren(...available.map(({ session, index }) => new Option(session.name, String(index))));
    if (available.some(({ index }) => String(index) === selection)) sessionSelect.value = selection;
    else if (preferred) sessionSelect.value = String(preferred.index);
    shownPlan = plan;
    shownDate = today;
    sessionField.hidden = Boolean(journal.active) || !available.length;
    start.hidden = !storageKey || (!journal.active && !available.length);
    start.textContent = journal.active ? "Training fortsetzen" : "Training starten";
    renderWeek(now, weekday);
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
    workoutExercises.replaceChildren(...active.exercises.map((exercise, index) => {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "workout-sets";
      const legend = document.createElement("legend");
      legend.textContent = exercise.name;
      const reps = document.createElement("p");
      reps.className = "planner-note";
      reps.textContent = `${exercise.reps} Wiederholungen pro Satz`;
      const boxes = document.createElement("div");
      boxes.className = "plan-equipment-options";
      exercise.done.forEach((checked, set) => {
        const label = document.createElement("label");
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = checked;
        box.addEventListener("change", () => {
          const active = structuredClone(journal.active);
          active.exercises[index].done[set] = box.checked;
          if (writeJournal({ ...journal, active }, workoutStatus)) updateWorkoutProgress();
          else box.checked = journal.active.exercises[index].done[set];
        });
        label.append(box, `Satz ${set + 1}`);
        boxes.append(label);
      });
      fieldset.append(legend, reps, boxes);
      return fieldset;
    }));
    updateWorkoutProgress();
  }

  start.addEventListener("click", () => {
    if (!storageKey) return;
    status.textContent = "";
    if (!journal.active) {
      const session = trainingPlanner.getPlan()?.sessions[sessionSelect.value];
      if (!session?.exercises.length) return;
      const active = {
        date: dateKey(new Date()),
        name: session.name,
        exercises: session.exercises.map((entry) => {
          const exercise = catalog.get(entry.id);
          return {
            name: exercise?.name ?? entry.name,
            muscles: primaryMuscles(exercise),
            reps: entry.reps,
            done: Array(entry.sets).fill(false),
          };
        }),
      };
      if (!writeJournal({ ...journal, active }, status)) return;
    }
    renderWorkout();
    dialog.showModal();
    dialog.scrollTop = 0;
    render();
  });

  finish.addEventListener("click", () => {
    if (!journal.active) return;
    const { date, name, exercises } = journal.active;
    const groups = new Map();
    let totalSets = 0;
    for (const exercise of exercises) {
      const count = exercise.done.filter(Boolean).length;
      if (!count) continue;
      totalSets += count;
      for (const muscle of exercise.muscles) groups.set(muscle, (groups.get(muscle) ?? 0) + count);
    }
    if (!totalSets) return;
    const workouts = [...journal.workouts, { date, name, totalSets, muscleSets: [...groups] }];
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
    close() {
      if (dialog.open) dialog.close();
      shownPlan = undefined;
    },
    setAccount(id) {
      if (dialog.open) dialog.close();
      storageKey = id ? `fitness-app.workout-journal.v1.${id}` : null;
      journal = readJournal();
      shownPlan = undefined;
      status.textContent = "";
      render();
    },
  };
})();
