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
