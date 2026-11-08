// Shared, DOM-independent rules for a workout snapshot. The saved plan is never edited.
const workoutState = (() => {
  const guidance = typeof module === "undefined" ? trainingGuidance : require("./training-guidance.js");
  const planData = typeof module === "undefined" ? trainingPlanData : require("./plan-data.js");
  function normalize(active) {
    if (!active) return null;
    const copy = structuredClone(active);
    copy.startedAt ??= Date.now();
    copy.id ??= `legacy-${copy.date}-${copy.startedAt}-${copy.sourcePlanId ?? copy.name}`;
    copy.pausedMs ??= 0;
    copy.stage ??= "exercise";
    copy.replacedExercises ??= [];
    copy.exerciseIndex = Math.max(0, Math.min(copy.exerciseIndex ?? 0, copy.exercises.length - 1));
    for (const [index, exercise] of copy.exercises.entries()) {
      exercise.instanceId ??= `${copy.id}:exercise:${index}`;
      exercise.slotId ??= `source-${index}`;
      exercise.weights ??= exercise.done.map(() => "");
      exercise.setReps ??= exercise.done.map(() => exercise.reps);
      exercise.skipped ??= false;
      exercise.touchedReps ??= exercise.done.map((done, set) => done || exercise.setReps[set] !== exercise.reps);
      exercise.touchedWeights ??= exercise.weights.map((value) => value !== "");
      exercise.setTypes ??= exercise.done.map(() => "work");
      exercise.setContexts ??= exercise.done.map(() => null);
      exercise.acceptedSuggestions ??= exercise.done.map(() => null);
      exercise.started ??= exercise.done.some(Boolean) || exercise.weights.some((value) => value !== "");
    }
    return copy;
  }

  function elapsed(active, now = Date.now()) {
    return Math.max(0, (active.pausedAt ?? now) - active.startedAt - (active.pausedMs ?? 0));
  }

  function pause(active, now = Date.now()) {
    const copy = normalize(active);
    if (copy.pausedAt == null) {
      copy.pausedAt = now;
      copy.restRemaining = Math.max(0, (copy.restUntil ?? 0) - now);
      copy.restUntil = null;
    }
    return copy;
  }

  function resume(active, now = Date.now()) {
    const copy = normalize(active);
    if (copy.pausedAt != null) {
      copy.pausedMs += Math.max(0, now - copy.pausedAt);
      copy.pausedAt = null;
      copy.restUntil = copy.restRemaining ? now + copy.restRemaining : null;
      copy.restRemaining = 0;
    }
    return copy;
  }

  function summary(active, now = Date.now()) {
    const groups = new Map();
    const result = { totalSets: 0, plannedSets: 0, openSets: 0, skippedSets: 0,
      completedExercises: 0, partialExercises: 0, skippedExercises: 0, volume: 0,
      durationMs: elapsed(active, now) };
    for (const exercise of [...active.exercises, ...(active.replacedExercises ?? [])]) {
      const count = exercise.done.filter(Boolean).length;
      result.totalSets += count;
      result.plannedSets += exercise.archived ? count : exercise.done.length;
      if (!exercise.archived) {
        result[exercise.skipped ? "skippedSets" : "openSets"] += exercise.done.length - count;
        if (exercise.skipped) result.skippedExercises++;
        if (count === exercise.done.length) result.completedExercises++;
        else if (count) result.partialExercises++;
      }
      exercise.done.forEach((done, index) => {
        if (done) result.volume += Number(exercise.weights[index] || 0) * Number(exercise.setReps[index]);
      });
      for (const muscle of exercise.muscles) groups.set(muscle, (groups.get(muscle) ?? 0) + count);
    }
    result.muscleSets = [...groups].filter(([, count]) => count > 0);
    return result;
  }

  function planExercises(active) {
    return active.exercises.map((exercise) => ({
      ...(exercise.id ? { id: exercise.id } : { name: exercise.name, equipment: exercise.equipment || "" }),
      sets: exercise.done.length, reps: exercise.reps,
      ...planData.normalizeExerciseSettings(exercise),
    }));
  }

  function changes(active) {
    let original;
    try { original = JSON.parse(active.sourceSession).exercises; } catch { return []; }
    const current = planExercises(active);
    const counts = { swap: 0, sets: 0, reps: 0, range: 0, profile: 0 };
    active.exercises.forEach((exercise, index) => {
      const before = original[Number(exercise.slotId?.replace("source-", ""))];
      if (!before) return;
      const after = current[index];
      if (before.id !== after.id || before.name !== after.name || before.equipment !== after.equipment) counts.swap++;
      if (before.sets !== after.sets) counts.sets++;
      if (before.reps !== after.reps) counts.reps++;
      if (guidance.rangeFor(before) !== guidance.rangeFor(after)) counts.range++;
      if (["weightStep", "loadMode", "equipmentKey"].some((key) => before[key] !== after[key])) counts.profile++;
    });
    const order = active.exercises.map(({ slotId }) => Number(slotId.replace("source-", "")));
    return [
      ...(counts.swap ? [`${counts.swap} Übung${counts.swap === 1 ? "" : "en"} ausgetauscht`] : []),
      ...(order.some((value, index) => index > 0 && value < order[index - 1]) ? ["Reihenfolge geändert"] : []),
      ...(counts.sets ? ["Satzanzahl geändert"] : []),
      ...(counts.reps ? ["Zielwiederholungen geändert"] : []),
      ...(counts.range ? ["Wiederholungsbereich geändert"] : []),
      ...(counts.profile ? ["Gewichts- oder Geräteeinstellungen geändert"] : []),
      ...(original.length !== current.length ? ["Übungsauswahl geändert"] : []),
    ];
  }

  function resize(active, instanceId, sets, reps, settings = {}) {
    const copy = normalize(active);
    const exercise = copy.exercises.find((entry) => entry.instanceId === instanceId);
    if (!exercise || !Number.isInteger(sets) || sets < 1 || sets > 10 || !Number.isInteger(reps) || reps < 1 || reps > 100) {
      throw new Error("Wähle 1 bis 10 Sätze und 1 bis 100 Zielwiederholungen.");
    }
    if (exercise.done.slice(sets).some(Boolean)) throw new Error("Bereits erledigte Sätze bleiben erhalten. Wähle eine höhere Satzanzahl oder korrigiere zuerst die Erledigt-Markierung.");
    const prescription = planData.normalizeExerciseSettings(settings);
    if (!prescription) throw new Error("Prüfe Wiederholungsbereich, Gewichtsabstufung und Gerätekennung.");
    for (const field of ["repRange", "weightStep", "loadMode", "equipmentKey"]) {
      if (Object.hasOwn(settings, field)) {
        if (settings[field] === undefined) delete exercise[field]; else exercise[field] = prescription[field];
      }
    }
    for (const [field, initial] of [["done", false], ["weights", ""], ["setReps", reps], ["touchedReps", false], ["touchedWeights", false], ["setTypes", "work"], ["setContexts", null], ["acceptedSuggestions", null]]) {
      exercise[field] = Array.from({ length: sets }, (_, index) => exercise[field][index] ?? initial);
    }
    exercise.setReps = exercise.setReps.map((value, index) => !exercise.done[index] && !exercise.touchedReps[index] ? reps : value);
    exercise.reps = reps;
    if (exercise.done.every(Boolean)) exercise.skipped = false;
    return copy;
  }

  function replace(active, instanceId, replacement, newId) {
    const copy = normalize(active);
    const index = copy.exercises.findIndex((entry) => entry.instanceId === instanceId);
    if (index < 0) throw new Error("Die Übung wurde inzwischen geändert. Öffne sie erneut.");
    const previous = copy.exercises[index];
    if (previous.done.some(Boolean)) copy.replacedExercises.push({ ...previous, archived: true });
    const sets = previous.done.length;
    copy.exercises[index] = { ...replacement, instanceId: newId, slotId: previous.slotId, reps: previous.reps,
      done: Array(sets).fill(false), weights: Array(sets).fill(""), setReps: Array(sets).fill(previous.reps),
      touchedReps: Array(sets).fill(false), touchedWeights: Array(sets).fill(false), setTypes: Array(sets).fill("work"),
      setContexts: Array(sets).fill(null), acceptedSuggestions: Array(sets).fill(null),
      ...(previous.repRange ? { repRange: previous.repRange } : {}), started: false, skipped: false };
    copy.restUntil = null; copy.restRemaining = 0;
    return copy;
  }

  function move(active, instanceId, position) {
    const copy = normalize(active);
    const from = copy.exercises.findIndex((entry) => entry.instanceId === instanceId);
    if (from < 0 || !Number.isInteger(position) || position < 0 || position >= copy.exercises.length) return copy;
    copy.exercises.splice(position, 0, ...copy.exercises.splice(from, 1));
    return copy;
  }

  function prepareGuidance(active, workouts, catalog, now = Date.now()) {
    const copy = normalize(active);
    for (const exercise of copy.exercises) {
      exercise.guidance = guidance.suggest({ ...catalog.get(exercise.id), ...exercise }, workouts, copy.checkin, now);
      for (let i = 0; i < exercise.done.length; i++) {
        if (!exercise.acceptedSuggestions[i] || exercise.done[i] || exercise.touchedWeights[i] || exercise.touchedReps[i] || exercise.setTypes[i] === "warmup") continue;
        const day = exercise.guidance.day;
        exercise.weights[i] = day?.weight ?? "";
        exercise.setReps[i] = day?.reps ?? exercise.reps;
        exercise.acceptedSuggestions[i] = day?.weight != null ? guidanceSnapshot(exercise.guidance) : null;
      }
    }
    return copy;
  }

  function guidanceSnapshot(value) {
    // Store the applied numbers and reason, rather than repeating the entire UI explanation per set.
    return structuredClone({ at: value.at, range: value.range, baseline: value.baseline, day: value.day,
      recovery: value.recovery, reason: value.reasons.at(-1), confidence: value.confidence });
  }

  function acceptSuggestion(active, instanceId) {
    const copy = normalize(active), exercise = copy.exercises.find((entry) => entry.instanceId === instanceId);
    if (!exercise?.guidance?.day || exercise.guidance.day.weight == null) return copy;
    for (let i = 0; i < exercise.done.length; i++) {
      if (exercise.done[i] || exercise.touchedWeights[i] || exercise.touchedReps[i] || exercise.setTypes[i] === "warmup") continue;
      exercise.weights[i] = exercise.guidance.day.weight;
      exercise.setReps[i] = exercise.guidance.day.reps;
      exercise.acceptedSuggestions[i] = guidanceSnapshot(exercise.guidance);
    }
    return copy;
  }

  function contextFor(exercise) {
    return { ...guidance.profile(exercise), kind: "work", repRange: guidance.rangeFor(exercise),
      reduced: Boolean(exercise.deload || exercise.guidance?.recovery.adjusted), proposal: null };
  }

  function planUpdate(record, pending) {
    const original = JSON.parse(pending.sourceSession);
    const matches = record.plan.sessions.map((session, index) => JSON.stringify(session) === pending.sourceSession ? index : -1).filter((index) => index >= 0);
    const index = Number.isInteger(pending.sourceSessionIndex) ? pending.sourceSessionIndex : matches.length === 1 ? matches[0] : -1;
    const desired = { ...original, exercises: pending.exercises };
    // A response may have been lost after the server successfully saved this exact change.
    if (JSON.stringify(record.plan.sessions[index]) === JSON.stringify(desired)) return null;
    if (index < 0 || JSON.stringify(record.plan.sessions[index]) !== pending.sourceSession ||
      (pending.sourceVersion != null && record.version !== pending.sourceVersion)) {
      throw new Error("Der ursprüngliche Plan wurde inzwischen geändert. Deine Trainingseinheit ist gespeichert; neuere Planänderungen werden nicht überschrieben.");
    }
    const plan = structuredClone(record.plan);
    plan.sessions[index] = desired;
    return plan;
  }

  function complete(journal, id, now = Date.now()) {
    // Re-read storage before calling: a retried finish can never append this ID twice.
    if (!journal.active || journal.active.id !== id || journal.workouts.some((item) => item.id === id)) return journal;
    const active = normalize(journal.active);
    const totals = summary(active, now);
    if (!totals.totalSets) return journal;
    const workout = { ...active, ...totals, completedAt: now, minutes: Math.max(1, Math.round(totals.durationMs / 60000)) };
    const pendingPlanChanges = [...(journal.pendingPlanChanges ?? [])];
    const labels = changes(active);
    if (labels.length && active.sourcePlanId) pendingPlanChanges.push({
      workoutId: id, name: active.name, date: active.date, durationMs: totals.durationMs, changes: labels,
      sourcePlanId: active.sourcePlanId, sourceVersion: active.sourceVersion,
      sourceSessionIndex: active.sourceSessionIndex, sourceSession: active.sourceSession,
      exercises: planExercises(active),
    });
    return { ...journal, active: null, workouts: [...journal.workouts, workout], pendingPlanChanges };
  }

  return { normalize, elapsed, pause, resume, summary, complete, planExercises, changes, resize, replace, move, planUpdate, prepareGuidance, acceptSuggestion, contextFor };
})();
if (typeof module !== "undefined") module.exports = workoutState;
