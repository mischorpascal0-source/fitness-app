const { test } = require("node:test");
const assert = require("node:assert/strict");
const state = require("./workout-state.js");

const active = () => state.normalize({ id: "session-a", date: "2026-11-05", startedAt: 1000, name: "Upper",
  exercises: [
    { name: "Drücken", muscles: ["Brust", "Trizeps"], reps: 8, done: [true, false], weights: [22.5, ""], setReps: [9, 8] },
    { name: "Rudern", muscles: ["Rücken"], reps: 10, done: [false, false] },
  ] });

test("legacy workouts receive stable IDs and editable set arrays without mutating stored input", () => {
  const input = { date: "2026-11-05", startedAt: 1000, name: "Alt", exercises: [{ name: "Eigen", muscles: [], reps: 12, done: [false] }] };
  const first = state.normalize(input);
  assert.equal(first.id, state.normalize(input).id);
  assert.deepEqual(first.exercises[0].setReps, [12]);
  assert.deepEqual(first.exercises[0].weights, [""]);
  assert.equal(first.exerciseIndex, 0);
  assert.equal(input.id, undefined);
});

test("active duration and rest timer exclude repeated pauses, including time away from the app", () => {
  const original = { ...active(), restUntil: 181000 };
  const paused = state.pause(original, 61000);
  assert.equal(state.elapsed(paused, 600000), 60000);
  assert.equal(paused.restRemaining, 120000);
  assert.deepEqual(state.pause(paused, 70000), paused);
  const resumed = state.resume(paused, 361000);
  assert.equal(resumed.restUntil, 481000);
  assert.equal(state.elapsed(resumed, 421000), 120000);
  assert.deepEqual(state.resume(resumed, 422000), resumed);
  const pausedAgain = state.pause(resumed, 421000);
  assert.equal(state.elapsed(state.resume(pausedAgain, 521000), 581000), 180000);
  assert.equal(original.pausedAt, undefined);
});

test("only checked sets contribute actual reps, weight, volume and muscle statistics", () => {
  const workout = active();
  workout.exercises[1].weights = [100, 100];
  const totals = state.summary(workout, 61000);
  assert.equal(totals.totalSets, 1);
  assert.equal(totals.plannedSets, 4);
  assert.equal(totals.completedExercises, 0);
  assert.equal(totals.partialExercises, 1);
  assert.equal(totals.volume, 202.5);
  assert.deepEqual(totals.muscleSets, [["Brust", 1], ["Trizeps", 1]]);
});

test("explicit skipping leaves unfinished sets unchecked and preserves already logged sets", () => {
  const workout = active();
  workout.exercises[0].skipped = true;
  const totals = state.summary(workout);
  assert.equal(totals.skippedExercises, 1);
  assert.equal(totals.skippedSets, 1);
  assert.equal(totals.openSets, 2);
  assert.equal(totals.totalSets, 1);
  assert.equal(totals.completedExercises, 0);
});

test("completion preserves selected past date and actual inputs, without changing the plan snapshot", () => {
  const workout = active();
  const before = structuredClone(workout);
  const journal = { workouts: [], active: workout };
  const next = state.complete(journal, workout.id, 61000);
  assert.equal(next.active, null);
  assert.equal(next.workouts[0].date, "2026-11-05");
  assert.equal(next.workouts[0].exercises[0].setReps[0], 9);
  assert.equal(next.workouts[0].exercises[0].weights[0], 22.5);
  assert.equal(next.workouts[0].minutes, 1);
  assert.deepEqual(workout, before);
  assert.equal(journal.workouts.length, 0);
});

test("double finish, a stale ID, or an already completed snapshot never appends a duplicate", () => {
  const journal = { workouts: [], active: active() };
  const completed = state.complete(journal, "session-a", 61000);
  assert.strictEqual(state.complete(completed, "session-a"), completed);
  assert.strictEqual(state.complete(journal, "another-session"), journal);
  const stale = { ...completed, active: active() };
  assert.strictEqual(state.complete(stale, "session-a"), stale);
});

test("an empty or entirely skipped workout is not recorded as a completed training", () => {
  const workout = active();
  workout.exercises.forEach((exercise) => { exercise.done.fill(false); exercise.skipped = true; });
  const journal = { workouts: [], active: workout };
  assert.strictEqual(state.complete(journal, workout.id), journal);
});

test("fully completed exercises are counted separately from partial exercises", () => {
  const workout = active();
  workout.exercises[0].done.fill(true);
  workout.exercises[0].weights[1] = 0;
  const totals = state.summary(workout);
  assert.equal(totals.completedExercises, 1);
  assert.equal(totals.partialExercises, 0);
  assert.equal(totals.totalSets, 2);
});

function planned() {
  const session = { name: "Upper", exercises: [{ id: "press", sets: 2, reps: 8 }, { id: "row", sets: 2, reps: 10 }], weekday: 3 };
  return state.normalize({ ...active(), sourcePlanId: "plan-a", sourceVersion: 3, sourceSessionIndex: 0, sourceSession: JSON.stringify(session),
    exercises: active().exercises.map((exercise, index) => ({ ...exercise, id: session.exercises[index].id })) });
}

test("reordering duplicate catalog exercises preserves stable instances and their actual set data", () => {
  const workout = planned();
  workout.exercises[1].id = "press";
  const second = workout.exercises[1].instanceId;
  const reordered = state.move(workout, second, 0);
  assert.equal(reordered.exercises[0].instanceId, second);
  assert.equal(reordered.exercises[1].weights[0], 22.5);
  assert.equal(reordered.exercises[1].setReps[0], 9);
  assert.ok(state.changes(reordered).includes("Reihenfolge geändert"));
  assert.equal(workout.exercises[0].id, "press");
  assert.equal(state.normalize(JSON.parse(JSON.stringify(reordered))).exercises[0].instanceId, second);
});

test("target changes preserve entered reps, change untouched defaults, and initialize added sets", () => {
  const workout = planned();
  workout.exercises[0].setReps[1] = 7;
  workout.exercises[0].touchedReps[1] = true;
  const resized = state.resize(workout, workout.exercises[0].instanceId, 3, 12);
  assert.deepEqual(resized.exercises[0].setReps, [9, 7, 12]);
  assert.deepEqual(resized.exercises[0].done, [true, false, false]);
  assert.deepEqual(resized.exercises[0].weights, [22.5, "", ""]);
  assert.equal(resized.exercises[0].reps, 12);
  assert.ok(state.changes(resized).includes("Satzanzahl geändert"));
  assert.ok(state.changes(resized).includes("Zielwiederholungen geändert"));
  const untouched = state.resize(workout, workout.exercises[1].instanceId, 2, 15);
  assert.deepEqual(untouched.exercises[1].setReps, [15, 15]);
});

test("reducing sets cannot delete a checked set, even with unfinished sets before it", () => {
  const workout = planned();
  workout.exercises[1].done = [false, true];
  assert.throws(() => state.resize(workout, workout.exercises[1].instanceId, 1, 10), /Bereits erledigte/);
  assert.throws(() => state.resize(workout, workout.exercises[1].instanceId, 11, 10), /1 bis 10/);
  assert.throws(() => state.resize(workout, workout.exercises[1].instanceId, 2, 0), /1 bis 100/);
  assert.equal(workout.exercises[1].done.length, 2);
});

test("removing skipped open sets leaves the completed remaining exercise in a consistent state", () => {
  const workout = planned();
  workout.exercises[0].skipped = true;
  const resized = state.resize(workout, workout.exercises[0].instanceId, 1, 8);
  assert.equal(resized.exercises[0].skipped, false);
  assert.deepEqual(resized.exercises[0].done, [true]);
  assert.equal(state.summary(resized).completedExercises, 1);
});

test("partial replacement archives the original checked sets and starts clean under a new instance", () => {
  const workout = planned(), old = workout.exercises[0];
  const replaced = state.replace(workout, old.instanceId, { id: "fly", name: "Fly", muscles: ["Brust"], equipment: "Kabelzug" }, "new-instance");
  assert.equal(replaced.exercises[0].instanceId, "new-instance");
  assert.equal(replaced.exercises[0].slotId, old.slotId);
  assert.deepEqual(replaced.exercises[0].done, [false, false]);
  assert.deepEqual(replaced.exercises[0].weights, ["", ""]);
  assert.equal(replaced.replacedExercises[0].id, "press");
  assert.equal(replaced.replacedExercises[0].setReps[0], 9);
  const totals = state.summary(replaced);
  assert.equal(totals.totalSets, 1);
  assert.equal(totals.openSets, 4);
  assert.equal(totals.plannedSets, 5);
  assert.equal(totals.volume, 202.5);
  assert.deepEqual(totals.muscleSets, [["Brust", 1], ["Trizeps", 1]]);
  assert.equal(workout.replacedExercises.length, 0);
});

test("completing a changed session saves the workout once and retains a separate retryable plan decision", () => {
  const workout = planned();
  const changed = state.resize(workout, workout.exercises[0].instanceId, 3, 12);
  const journal = state.complete({ active: changed, workouts: [] }, changed.id, 61000);
  assert.equal(journal.workouts.length, 1);
  assert.equal(journal.pendingPlanChanges.length, 1);
  const pending = journal.pendingPlanChanges[0];
  assert.equal(pending.sourceVersion, 3);
  assert.deepEqual(pending.exercises[0], { id: "press", sets: 3, reps: 12 });
  assert.equal(Object.hasOwn(pending.exercises[0], "weights"), false);
  assert.equal(Object.hasOwn(pending.exercises[0], "done"), false);
  assert.strictEqual(state.complete(journal, changed.id), journal);
});

test("actual weights, actual reps, skipping, and paused time alone do not suggest changing the plan", () => {
  const workout = planned();
  workout.exercises[0].weights[0] = 42;
  workout.exercises[0].setReps[0] = 15;
  workout.exercises[1].skipped = true;
  assert.deepEqual(state.changes(workout), []);
  assert.equal(state.complete({ active: workout, workouts: [] }, workout.id).pendingPlanChanges.length, 0);
});

test("plan application changes only the original session and preserves other training days", () => {
  const workout = planned();
  const changed = state.move(state.resize(workout, workout.exercises[0].instanceId, 3, 12), workout.exercises[1].instanceId, 0);
  const pending = state.complete({ active: changed, workouts: [] }, changed.id).pendingPlanChanges[0];
  const other = { name: "Lower", weekday: 6, exercises: [{ id: "squat", sets: 4, reps: 5 }] };
  const record = { id: "plan-a", version: 3, plan: { name: "Plan", sessions: [JSON.parse(workout.sourceSession), other] } };
  const updated = state.planUpdate(record, pending);
  assert.deepEqual(updated.sessions[1], other);
  assert.equal(updated.sessions[0].weekday, 3);
  assert.equal(updated.sessions[0].name, "Upper");
  assert.deepEqual(updated.sessions[0].exercises, [{ id: "row", sets: 2, reps: 10 }, { id: "press", sets: 3, reps: 12 }]);
  assert.equal(record.plan.sessions[0].exercises[0].sets, 2);
  assert.equal(state.planUpdate({ ...record, version: 4, plan: updated }, pending), null, "retry after a lost successful response must be idempotent");
  assert.throws(() => state.planUpdate({ ...record, version: 4 }, pending), /inzwischen geändert/);
  assert.throws(() => state.planUpdate({ ...record, plan: { ...record.plan, sessions: [other] } }, pending), /inzwischen geändert/);
});
