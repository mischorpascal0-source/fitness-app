// Shared, DOM-independent rules for a workout snapshot. The saved plan is never edited.
const workoutState = (() => {
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
    }));
  }

  function changes(active) {
    let original;
    try { original = JSON.parse(active.sourceSession).exercises; } catch { return []; }
    const current = planExercises(active);
    const counts = { swap: 0, sets: 0, reps: 0 };
    active.exercises.forEach((exercise, index) => {
      const before = original[Number(exercise.slotId?.replace("source-", ""))];
      if (!before) return;
      const after = current[index];
      if (before.id !== after.id || before.name !== after.name || before.equipment !== after.equipment) counts.swap++;
      if (before.sets !== after.sets) counts.sets++;
      if (before.reps !== after.reps) counts.reps++;
    });
    const order = active.exercises.map(({ slotId }) => Number(slotId.replace("source-", "")));
    return [
      ...(counts.swap ? [`${counts.swap} Übung${counts.swap === 1 ? "" : "en"} ausgetauscht`] : []),
      ...(order.some((value, index) => index > 0 && value < order[index - 1]) ? ["Reihenfolge geändert"] : []),
      ...(counts.sets ? ["Satzanzahl geändert"] : []),
      ...(counts.reps ? ["Zielwiederholungen geändert"] : []),
      ...(original.length !== current.length ? ["Übungsauswahl geändert"] : []),
    ];
  }

  function resize(active, instanceId, sets, reps) {
    const copy = normalize(active);
    const exercise = copy.exercises.find((entry) => entry.instanceId === instanceId);
    if (!exercise || !Number.isInteger(sets) || sets < 1 || sets > 10 || !Number.isInteger(reps) || reps < 1 || reps > 100) {
      throw new Error("Wähle 1 bis 10 Sätze und 1 bis 100 Zielwiederholungen.");
    }
    if (exercise.done.slice(sets).some(Boolean)) throw new Error("Bereits erledigte Sätze bleiben erhalten. Wähle eine höhere Satzanzahl oder korrigiere zuerst die Erledigt-Markierung.");
    for (const [field, initial] of [["done", false], ["weights", ""], ["setReps", reps], ["touchedReps", false]]) {
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
      touchedReps: Array(sets).fill(false), started: false, skipped: false };
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

  return { normalize, elapsed, pause, resume, summary, complete, planExercises, changes, resize, replace, move, planUpdate };
})();
if (typeof module !== "undefined") module.exports = workoutState;
