const { test } = require("node:test");
const assert = require("node:assert/strict");
const guidance = require("./training-guidance.js");
const state = require("./workout-state.js");
const data = require("./plan-data.js");
const catalog = require("./exercises.js");
const now = new Date("2026-11-08T12:00:00Z").getTime();
const exercise = (extra = {}) => ({ id: "lh-test", name: "Bankdrücken", equipment: "Langhantel", primary: "Brustmuskulatur", secondary: "Trizeps, vordere Schulter", reps: 10, repRange: "8-12", weightStep: 2.5, ...extra });
const checkin = (scores = {}, painGroups = []) => ({ checkedAt: now, scores: Object.fromEntries(guidance.muscleGroups.map(({ id }) => [id, scores[id] ?? 0])), pain: painGroups.length > 0, painGroups });
function visit(weight = 50, reps = 9, days = 1, fields = {}, setFields = {}) {
  const entry = exercise(fields);
  return { completedAt: now - days * 86400000, date: "2026-11-" + String(8 - days).padStart(2, "0"), exercises: [{ ...entry,
    done: [true, true], weights: [weight, weight], setReps: [reps, reps], setTypes: ["work", "work"],
    setContexts: [0, 1].map(() => ({ ...guidance.profile(entry), repRange: entry.repRange, kind: "work", reduced: false, ...setFields })) }] };
}
const suggest = (entry = exercise(), visits = [], ready = checkin()) => guidance.suggest(entry, visits, ready, now);

test("a device-specific Krafttest gives 30 kg × 8 from 25 kg × 15 and yields to work history", () => {
  const machine = exercise({ equipment: "Maschine", equipmentKey: "A" });
  const key = guidance.scopeKey(machine);
  const settings = { weightRanges: { [key]: guidance.weightRange(5, 95, 5) }, calibrations: [{ key, weight: 25, reps: 15, at: now - 1000 }] };
  const result = guidance.suggest(machine, [], checkin(), now, settings);
  assert.deepEqual(result.day, { weight: 30, reps: 8 });
  assert.equal(result.trend.sessions, 0);
  assert.equal(guidance.suggest({ ...machine, equipmentKey: "B" }, [], checkin(), now, settings).day.weight, null);
  assert.equal(guidance.suggest(machine, [], checkin({ brust: 9 }), now, settings).day, null);
  assert.deepEqual(guidance.suggest(machine, [visit(35, 8, 1, machine)], checkin(), now, settings).baseline, { weight: 35, reps: 9 });
});

test("bounded device weights use their minimum as origin and avoid a too-heavy test conversion", () => {
  const machine = exercise({ equipment: "Maschine", equipmentKey: "A" });
  const key = guidance.scopeKey(machine);
  assert.equal(guidance.weightRange(5, 96, 5), null);
  assert.deepEqual(guidance.weightRange(2.5, 15, 2.5), { min: 2.5, max: 15, step: 2.5 });
  const settings = { weightRanges: { [key]: guidance.weightRange(5, 95, 15) }, calibrations: [{ key, weight: 20, reps: 15, at: now - 1000 }] };
  assert.deepEqual(guidance.suggest(machine, [], checkin(), now, settings).day, { weight: 20, reps: 12 });
  const offset = { weightRanges: { [key]: guidance.weightRange(2.5, 12.5, 5) } };
  assert.equal(guidance.suggest(machine, [visit(11, 10, 1, machine)], checkin(), now, offset).day.weight, 7.5);
  const assisted = { ...machine, loadMode: "assisted" };
  const assistKey = guidance.scopeKey(assisted);
  const assistSettings = { weightRanges: { [assistKey]: guidance.weightRange(5, 25, 5) }, calibrations: [{ key: assistKey, weight: 25, reps: 15, at: now - 1000 }] };
  assert.equal(guidance.suggest(assisted, [], checkin({ brust: 5 }), now, assistSettings).day.weight, null);
});

test("missing history yields no invented weight and missing check-in yields no day prescription", () => {
  const result = suggest(); assert.equal(result.day.weight, null); assert.equal(result.trend.key, "insufficient");
  assert.equal(suggest(exercise(), [visit()], null).day, null);
  const partial = checkin(); delete partial.scores.brust;
  assert.equal(guidance.validateCheckin(partial), false);
  assert.equal(suggest(exercise(), [visit()], partial).recovery.level, "unknown");
});

test("50 kg × 9 converts down to the 5–8 range and up to 12–20, rounded to real weight steps", () => {
  const low = suggest(exercise({ repRange: "5-8", reps: 6 }), [visit()]);
  assert.deepEqual(low.baseline, { weight: 52.5, reps: 6 });
  const high = suggest(exercise({ repRange: "12-20", reps: 15 }), [visit()]);
  assert.deepEqual(high.baseline, { weight: 42.5, reps: 15 }); assert.equal(high.confidence, "low");
  assert.ok(low.reasons.some((reason) => reason.includes("Bereich") || reason.includes("bereich")));
});

test("a single low performance does not create a downward trend or a permanent load reduction", () => {
  const result = suggest(exercise(), [visit(50, 6)]);
  assert.equal(result.trend.key, "insufficient"); assert.equal(result.baseline.weight, 50);
});

test("three comparable sessions distinguish rising, stable and repeated lower performance", () => {
  assert.equal(suggest(exercise(), [visit(50, 12, 1), visit(50, 10, 2), visit(50, 8, 3)]).trend.key, "up");
  assert.equal(suggest(exercise(), [visit(50, 8, 1), visit(50, 10, 2), visit(50, 12, 3)]).trend.key, "down");
  assert.equal(suggest(exercise(), [visit(50, 10, 1), visit(50, 10, 2), visit(50, 10, 3)]).trend.key, "stable");
  assert.notEqual(suggest(exercise(), [visit(60, 3, 1), visit(55, 5, 2), visit(50, 12, 3)]).trend.key, "up");
});

test("changed repetition ranges are not mixed into one strength trend", () => {
  const result = suggest(exercise({ repRange: "5-8", reps: 6 }), [visit(52.5, 6, 1, { repRange: "5-8" }), visit(50, 9, 2), visit(50, 8, 3)]);
  assert.equal(result.trend.key, "insufficient"); assert.equal(result.trend.sessions, 1);
});

test("a changed number of work sets does not reuse progression from smaller sessions", () => {
  const entry = exercise({ done: [false, false, false], setTypes: ["work", "work", "work"] });
  const result = suggest(entry, [visit(50, 12, 1), visit(50, 12, 2), visit(50, 12, 3)]);
  assert.equal(result.trend.key, "insufficient"); assert.equal(result.baseline.weight, 50);
  assert.equal(result.confidence, "low");
});

test("large unexplained jumps do not generate a numeric loading recommendation", () => {
  const result = suggest(exercise(), [visit(500, 9, 1), visit(50, 9, 2), visit(50, 9, 3)]);
  assert.equal(result.baseline.weight, null); assert.equal(result.day.weight, null);
  assert.equal(result.trend.key, "insufficient");
});

test("double progression requires two complete upper/lower-limit sessions and sensible increments", () => {
  assert.deepEqual(suggest(exercise(), [visit(50, 12, 1), visit(50, 12, 2)]).baseline, { weight: 52.5, reps: 8 });
  assert.deepEqual(suggest(exercise(), [visit(50, 6, 1), visit(50, 6, 2)]).baseline, { weight: 47.5, reps: 8 });
  const coarse = suggest(exercise({ weightStep: 20 }), [visit(50, 12, 1), visit(50, 12, 2)]);
  assert.equal(coarse.baseline.weight, 50); assert.ok(coarse.reasons.some((reason) => reason.includes("groß")));
  const conversion = suggest(exercise({ weightStep: 20, repRange: "5-8", reps: 6 }), [visit()]);
  assert.equal(conversion.baseline.weight, 50); assert.ok(conversion.reasons.some((reason) => reason.includes("Gewichtsstufe")));
});

test("warmups, undone sets, invalid data, reduced sessions, stale and future visits are excluded", () => {
  const warmup = visit(100, 9, 1, {}, { kind: "warmup" });
  const reduced = visit(100, 9, 1, {}, { reduced: true });
  const undone = visit(); undone.exercises[0].done.fill(false);
  const invalid = visit(NaN, 9); const invalidReps = visit(50, 1000);
  const old = visit(); old.completedAt = now - 100 * 86400000;
  const future = visit(); future.completedAt = now + 86400000;
  assert.equal(suggest(exercise(), [warmup, reduced, undone, invalid, invalidReps, old, future]).last, null);
  const intentionallyLight = visit(20, 9, 1, { deload: true });
  assert.equal(suggest(exercise(), [intentionallyLight, visit(50, 9, 2)]).last.weight, 50);
});

test("exercise, equipment, load convention and machine identity cannot silently share weights", () => {
  assert.equal(suggest(exercise({ id: "different" }), [visit()]).last, null);
  assert.equal(suggest(exercise({ equipment: "Kurzhantel" }), [visit()]).last, null);
  const machine = exercise({ equipment: "Maschine", equipmentKey: "A" });
  const recorded = visit(50, 9, 1, machine);
  assert.equal(suggest(machine, [recorded]).last.weight, 50);
  assert.equal(suggest({ ...machine, equipmentKey: "B" }, [recorded]).last, null);
  assert.equal(suggest({ ...machine, equipmentKey: "" }, [recorded]).last, null);
});

test("bodyweight, added weight and assistance have distinct progression and conversion rules", () => {
  const body = exercise({ equipment: "Körpergewicht", loadMode: "bodyweight" });
  assert.deepEqual(suggest(body, [visit(0, 12, 1, body), visit(0, 12, 2, body)]).baseline, { weight: 0, reps: 12 });
  const added = { ...body, loadMode: "added" };
  assert.equal(suggest({ ...added, repRange: "5-8", reps: 6 }, [visit(10, 9, 1, added)]).baseline.weight, null);
  const assisted = exercise({ equipment: "Maschine", equipmentKey: "Assist A", loadMode: "assisted" });
  assert.equal(suggest(assisted, [visit(50, 12, 1, assisted), visit(50, 12, 2, assisted)]).baseline.weight, 47.5);
  assert.equal(suggest(assisted, [visit(50, 6, 1, assisted), visit(50, 6, 2, assisted)]).baseline.weight, 52.5);
  assert.equal(suggest({ ...assisted, repRange: "5-8", reps: 6 }, [visit(50, 9, 1, assisted)]).baseline.weight, null);
  assert.deepEqual(suggest(assisted, [visit(0, 12, 1, assisted), visit(0, 12, 2, assisted)]).baseline, { weight: 0, reps: 12 });
});

test("muscle soreness affects involved muscles, with primary muscles weighted more strongly", () => {
  const visits = [visit(50, 12, 1), visit(50, 12, 2)];
  const mild = suggest(exercise(), visits, checkin({ brust: 2 }));
  assert.equal(mild.recovery.level, "mild"); assert.equal(mild.day.weight, 50);
  const main = suggest(exercise(), visits, checkin({ brust: 5 }));
  const secondary = suggest(exercise(), visits, checkin({ trizeps: 5 }));
  assert.equal(main.recovery.level, "moderate"); assert.equal(secondary.recovery.level, "mild");
  assert.deepEqual(suggest(exercise(), visits, checkin({ waden: 10 })).day, suggest(exercise(), visits).day);
  assert.equal(suggest(exercise(), visits, checkin({ brust: 8 })).day, null);
  assert.equal(suggest(exercise(), visits, checkin({ trizeps: 8 })).day, null);
});

test("recovery is applied last, without inverse weight increases, extra reps or compounded penalties", () => {
  const entry = exercise({ repRange: "5-8", reps: 6 });
  const reduced = suggest(entry, [visit()], checkin({ brust: 5 }));
  assert.deepEqual(reduced.baseline, { weight: 52.5, reps: 6 });
  assert.deepEqual(reduced.day, { weight: 45, reps: 5 });
  const overlapping = suggest(entry, [visit()], checkin({ brust: 5, trizeps: 5, schultern: 5 }));
  assert.deepEqual(overlapping.day, reduced.day);
});

test("pain is separate from soreness and can apply to supporting muscles or an unclear whole area", () => {
  assert.equal(suggest(exercise(), [visit()], checkin({}, ["trizeps"])).recovery.level, "pain");
  assert.equal(suggest(exercise(), [visit()], checkin({}, ["all"])).day, null);
  assert.equal(suggest(exercise(), [visit()], checkin({}, ["waden"])).recovery.level, "none");
  assert.equal(guidance.validateCheckin({ ...checkin(), pain: true }), false);
});

test("all catalog exercises have primary muscle mappings, including assisted equipment", () => {
  assert.deepEqual(catalog.filter((entry) => !guidance.musclesFor(entry).primary.length).map(({ name }) => name), []);
  assert.equal(guidance.profile(catalog.find(({ id }) => id === "ma-klimmzuege-unterstuetzt")).mode, "assisted");
});

test("suggestions, check-ins and temporary recovery adjustments do not become permanent plan targets", () => {
  const entry = catalog.find(({ type }) => type === "Langhantel");
  const planEntry = { id: entry.id, sets: 2, reps: 10, repRange: "8-12", weightStep: 2.5 };
  const active = state.normalize({ id: "running", startedAt: now, date: "2026-11-01", name: "Upper", checkin: checkin({ brust: 5 }), sourcePlanId: "plan", sourceSession: JSON.stringify({ name: "Upper", exercises: [planEntry] }),
    exercises: [{ ...planEntry, name: entry.name, equipment: entry.type, muscles: ["Brust"], done: [false, false] }] });
  const map = new Map([[entry.id, entry]]), history = [visit(50, 9, 1, { id: entry.id })];
  const prepared = state.prepareGuidance(active, history, map, now);
  const accepted = state.acceptSuggestion(prepared, prepared.exercises[0].instanceId);
  assert.deepEqual(accepted.exercises[0].done, [false, false]);
  assert.deepEqual(state.planExercises(accepted), [planEntry]); assert.deepEqual(state.changes(accepted), []);
  assert.equal(accepted.exercises[0].weights[0], 45);
  accepted.exercises[0].weights[0] = 42; accepted.exercises[0].touchedWeights[0] = true;
  accepted.exercises[0].setReps[0] = 7; accepted.exercises[0].touchedReps[0] = true;
  const revised = state.prepareGuidance({ ...accepted, checkin: checkin({ brust: 9 }) }, history, map, now);
  assert.equal(revised.exercises[0].weights[0], 42); assert.equal(revised.exercises[0].setReps[0], 7);
  assert.equal(revised.exercises[0].weights[1], "");
  assert.equal(revised.checkin.checkedAt, now, "current check-in timestamp is independent of scheduled date");
  const warmup = structuredClone(accepted); warmup.exercises[0].setTypes[1] = "warmup";
  const checked = state.prepareGuidance({ ...warmup, checkin: checkin({ brust: 9 }) }, history, map, now);
  assert.equal(checked.exercises[0].weights[1], accepted.exercises[0].weights[1], "work-set recalculation must not overwrite warmup inputs");
  assert.equal(Object.hasOwn(accepted.exercises[0].acceptedSuggestions[1], "notes"), false, "per-set snapshots must not duplicate all UI explanation text");
});

test("range and equipment settings survive browser/server normalization and pending plan changes", () => {
  const id = catalog[0].id, entry = { id, sets: 2, reps: 6, repRange: "5-8", weightStep: 1.25, loadMode: "external", equipmentKey: "Hantel A" };
  const normalized = data.normalizePlan({ name: "Plan", sessions: [{ name: "Upper", exercises: [entry], weekday: 3 }] });
  assert.deepEqual(normalized.sessions[0].exercises[0], entry);
  assert.equal(data.normalizePlan({ name: "Plan", sessions: [{ name: "Upper", exercises: [{ ...entry, repRange: "wrong" }] }] }), null);
  assert.equal(data.normalizeExerciseSettings({ weightStep: 0 }), null);
  assert.equal(data.normalizePlan({ name: "Plan", sessions: [{ name: "Upper", exercises: [{ ...entry, reps: 20 }] }] }), null);
  const active = state.normalize({ id: "new", date: "2026-11-01", startedAt: now, name: "Upper", sourcePlanId: "plan", sourceSession: JSON.stringify({ name: "Upper", exercises: [{ id, sets: 2, reps: 10 }] }),
    exercises: [{ ...entry, name: "Test", muscles: ["Brust"], done: [true, false], weights: [50, ""], setReps: [5, 6] }] });
  const saved = state.complete({ active, workouts: [] }, active.id, now + 60000);
  assert.ok(saved.pendingPlanChanges[0].changes.includes("Wiederholungsbereich geändert"));
  assert.deepEqual(saved.pendingPlanChanges[0].exercises[0], entry);
});
