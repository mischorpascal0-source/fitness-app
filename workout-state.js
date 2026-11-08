// Shared, DOM-independent rules for a workout snapshot. The saved plan is never edited.
const workoutState = (() => {
  function normalize(active) {
    if (!active) return null;
    const copy = structuredClone(active);
    copy.startedAt ??= Date.now();
    copy.id ??= `legacy-${copy.date}-${copy.startedAt}-${copy.sourcePlanId ?? copy.name}`;
    copy.pausedMs ??= 0;
    copy.stage ??= "exercise";
    copy.exerciseIndex = Math.max(0, Math.min(copy.exerciseIndex ?? 0, copy.exercises.length - 1));
    for (const exercise of copy.exercises) {
      exercise.weights ??= exercise.done.map(() => "");
      exercise.setReps ??= exercise.done.map(() => exercise.reps);
      exercise.skipped ??= false;
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
    for (const exercise of active.exercises) {
      const count = exercise.done.filter(Boolean).length;
      result.totalSets += count;
      result.plannedSets += exercise.done.length;
      result[exercise.skipped ? "skippedSets" : "openSets"] += exercise.done.length - count;
      if (exercise.skipped) result.skippedExercises++;
      if (count === exercise.done.length) result.completedExercises++;
      else if (count) result.partialExercises++;
      exercise.done.forEach((done, index) => {
        if (done) result.volume += Number(exercise.weights[index] || 0) * Number(exercise.setReps[index]);
      });
      for (const muscle of exercise.muscles) groups.set(muscle, (groups.get(muscle) ?? 0) + count);
    }
    result.muscleSets = [...groups].filter(([, count]) => count > 0);
    return result;
  }

  function complete(journal, id, now = Date.now()) {
    // Re-read storage before calling: a retried finish can never append this ID twice.
    if (!journal.active || journal.active.id !== id || journal.workouts.some((item) => item.id === id)) return journal;
    const active = normalize(journal.active);
    const totals = summary(active, now);
    if (!totals.totalSets) return journal;
    const workout = { ...active, ...totals, completedAt: now, minutes: Math.max(1, Math.round(totals.durationMs / 60000)) };
    return { ...journal, active: null, workouts: [...journal.workouts, workout] };
  }

  return { normalize, elapsed, pause, resume, summary, complete };
})();
if (typeof module !== "undefined") module.exports = workoutState;
