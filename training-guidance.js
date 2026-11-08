// Product heuristics, not a measurement of strength or a medical clearance.
const trainingGuidance = (() => {
  const ranges = { "5-8": { min: 5, max: 8, target: 6 }, "8-12": { min: 8, max: 12, target: 10 }, "12-20": { min: 12, max: 20, target: 15 } };
  const config = Object.freeze({ maxHistoryDays: 90, trendDays: 42, minTrendSessions: 3, trendTolerance: .03,
    maxIncrease: .10, outlierRatio: 1.5, moderateLoadFactor: .90, secondaryFactor: .65, moderateScore: 4, strongScore: 7, strongSecondaryScore: 8 });
  const muscleGroups = [
    ["brust", "Brust", /brust/i], ["ruecken", "Rücken", /breiter rücken|oberer rücken|mittlerer trapez|rauten/i],
    ["nacken", "Nacken", /oberer trapez|schulterblattheber/i], ["schultern", "Schultern", /schulter(?!blatt)|außenrotator/i],
    ["bizeps", "Bizeps", /bizeps|oberarmmuskel/i], ["trizeps", "Trizeps", /trizeps/i],
    ["unterarme", "Unterarme und Griff", /unterarm|finger|handgelenk|griff|oberarmspeichen/i],
    ["quadrizeps", "Vordere Oberschenkel", /vordere oberschenkel|beine/i], ["hamstrings", "Hintere Oberschenkel", /hintere oberschenkel|beine/i],
    ["gesaess", "Gesäß", /gesäß|beine/i], ["adduktoren", "Adduktoren", /adduktor/i],
    ["huefte", "Seitliche Hüfte", /seitliche hüfte|seitliche gesäß|hüftmus/i], ["waden", "Waden", /waden|schollen/i],
    ["rumpf", "Bauch und Rumpf", /bauch|rumpf/i], ["unterer-ruecken", "Unterer Rücken", /rückenstrecker|quadratischer lenden/i],
  ].map(([id, label, pattern]) => ({ id, label, pattern }));
  const modes = { external: "Bewegtes Gewicht", bodyweight: "Körpergewicht", added: "Zusatzgewicht", assisted: "Unterstützung / Gegenlast" };
  const inferRange = (reps) => reps < 8 ? "5-8" : reps <= 12 ? "8-12" : "12-20";
  const rangeFor = (exercise) => Object.hasOwn(ranges, exercise.repRange) ? exercise.repRange : inferRange(exercise.reps);
  const defaultMode = (exercise) => /unterstützt|unterstuetzt|gegenstütze/i.test(`${exercise.name} ${exercise.id} ${exercise.gear}`) ? "assisted" :
    (exercise.equipment || exercise.type) === "Körpergewicht" ? "bodyweight" : "external";
  function profile(exercise) {
    const equipment = exercise.equipment || exercise.type || "";
    const mode = Object.hasOwn(modes, exercise.loadMode) ? exercise.loadMode : defaultMode(exercise);
    const machine = ["Maschine", "Kabelzug", "Multipresse"].includes(equipment);
    const convention = mode === "assisted" ? "support" : mode === "added" ? "added" : mode === "bodyweight" ? "bodyweight" : equipment === "Kurzhantel" ? "per-dumbbell" : machine ? "machine-display" : "total";
    const step = Number.isFinite(exercise.weightStep) && exercise.weightStep > 0 ? exercise.weightStep : equipment === "Kurzhantel" ? 1 : machine ? 5 : 2.5;
    return { equipment, mode, machine, convention, step, equipmentKey: (exercise.equipmentKey || "").trim().toLowerCase() };
  }
  function weightLabel(exercise) {
    const { convention } = profile(exercise);
    return { support: "Unterstützung in kg (mehr = leichter)", added: "Zusatzgewicht in kg", bodyweight: "Zusatzlast: 0 kg", "per-dumbbell": "kg pro Hantel", "machine-display": "kg laut Geräteanzeige", total: "Gesamtgewicht in kg, inkl. Stange" }[convention];
  }
  function musclesFor(exercise) {
    const match = (text) => muscleGroups.filter(({ pattern }) => pattern.test(text || "")).map(({ id }) => id);
    const primary = match(exercise.primary || exercise.muscles?.join(", "));
    return { primary, secondary: match(exercise.secondary).filter((id) => !primary.includes(id)) };
  }
  function validateCheckin(checkin) {
    return Boolean(checkin && Number.isFinite(checkin.checkedAt) && muscleGroups.every(({ id }) => Number.isInteger(checkin.scores?.[id]) && checkin.scores[id] >= 0 && checkin.scores[id] <= 10) &&
      Array.isArray(checkin.painGroups) && checkin.painGroups.every((id) => id === "all" || muscleGroups.some((group) => group.id === id)) && typeof checkin.pain === "boolean" && (!checkin.pain || checkin.painGroups.length > 0));
  }
  function recovery(exercise, checkin) {
    const groups = musclesFor(exercise);
    if (!validateCheckin(checkin)) return { level: "unknown", affected: [], adjusted: false };
    const involved = [...groups.primary, ...groups.secondary];
    if (checkin.pain && (checkin.painGroups.includes("all") || involved.some((id) => checkin.painGroups.includes(id)))) return { level: "pain", affected: involved, adjusted: true };
    const affected = involved.filter((id) => checkin.scores[id] > 0);
    const main = Math.max(0, ...groups.primary.map((id) => checkin.scores[id]));
    const supporting = Math.max(0, ...groups.secondary.map((id) => checkin.scores[id]));
    const score = Math.max(main, supporting * config.secondaryFactor);
    const level = main >= config.strongScore || supporting >= config.strongSecondaryScore ? "strong" : score >= config.moderateScore ? "moderate" : score > 0 ? "mild" : "none";
    return { level, affected, adjusted: level !== "none" };
  }
  const median = (values) => { const sorted = [...values].sort((a, b) => a - b); const i = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2; };
  const floorStep = (value, step) => Math.max(0, Number((Math.floor((value + 1e-8) / step) * step).toFixed(4)));
  const ceilStep = (value, step) => Math.max(0, Number((Math.ceil((value - 1e-8) / step) * step).toFixed(4)));
  const indexScore = (weight, reps) => weight * (1 + reps / 30);

  function history(exercise, workouts, now) {
    const current = profile(exercise), visits = [];
    if (!exercise.id || (current.machine && !current.equipmentKey)) return visits;
    for (const workout of workouts) {
      const at = workout.completedAt ?? workout.startedAt ?? new Date(workout.date + "T12:00:00").getTime();
      if (!Number.isFinite(at) || at > now + 300000 || now - at > config.maxHistoryDays * 86400000) continue;
      const sets = [];
      const entries = [...(workout.exercises || []), ...(workout.replacedExercises || [])];
      for (const entry of entries) {
        if (entry.id !== exercise.id) continue;
        const old = profile(entry);
        if (old.equipment && old.equipment !== current.equipment) continue;
        for (let i = 0; i < (entry.done?.length ?? 0); i++) {
          const context = entry.setContexts?.[i] || {};
          const saved = { ...old, ...context };
          const weight = entry.weights?.[i], reps = entry.setReps?.[i];
          if (!entry.done[i] || context.kind === "warmup" || entry.setTypes?.[i] === "warmup" || context.reduced || entry.deload || entry.dayAdjustment?.adjusted ||
              saved.mode !== current.mode || saved.convention !== current.convention || saved.equipmentKey !== current.equipmentKey ||
              typeof weight !== "number" || !Number.isFinite(weight) || weight < 0 || weight > 2000 || !Number.isInteger(reps) || reps < 1 || reps > 30 ||
              (current.mode === "external" && weight === 0)) continue;
          const recordedRange = context.repRange || entry.repRange || inferRange(entry.reps ?? reps);
          sets.push({ weight, reps, range: recordedRange, score: current.mode === "external" ? indexScore(weight, reps) : null, legacy: !entry.setContexts?.[i] });
        }
      }
      if (sets.length) {
        const reference = [...sets].sort((a, b) => a.weight - b.weight || a.reps - b.reps)[Math.floor((sets.length - 1) / 2)];
        const comparable = sets.every((set) => set.range === rangeFor(exercise));
        const complete = entries.filter((entry) => entry.id === exercise.id).every((entry) => !entry.archived && !entry.skipped && entry.done.every((done, i) => done || entry.setTypes?.[i] === "warmup"));
        visits.push({ at, date: workout.date, sets, reference, comparable, complete,
          score: current.mode === "external" ? median(sets.map((set) => set.score)) : null });
      }
    }
    return visits.sort((a, b) => b.at - a.at);
  }

  function suggest(exercise, workouts, checkin, now = Date.now()) {
    const p = profile(exercise), rangeKey = rangeFor(exercise), range = ranges[rangeKey];
    const visits = history(exercise, workouts, now), latest = visits[0], last = latest?.reference;
    const workSetCount = exercise.done?.filter((_, index) => exercise.setTypes?.[index] !== "warmup").length
      ?? visits.find((visit) => visit.comparable && visit.complete)?.sets.length;
    const validTrend = visits.filter((visit) => visit.comparable && visit.complete && visit.sets.length === workSetCount && now - visit.at <= config.trendDays * 86400000);
    const reasons = [], notes = ["Schätzung ohne Angabe der Anstrengung; vor dem Satz selbst prüfen."];
    const trend = { key: "insufficient", label: "Noch nicht genug vergleichbare Daten", sessions: validTrend.length };
    if (validTrend.length >= config.minTrendSessions) {
      const recent = validTrend.slice(0, 3);
      if (p.mode === "external" && recent.every((visit) => visit.reference.reps <= 20)) {
        const ratio1 = recent[0].score / recent[1].score, ratio2 = recent[1].score / recent[2].score;
        if ([ratio1, ratio2].some((ratio) => ratio > 1.5 || ratio < .5)) notes.push("Große Abweichung: Daten und Gewichtsangaben prüfen.");
        else if (ratio1 > 1 + config.trendTolerance && ratio2 > 1 + config.trendTolerance) Object.assign(trend, { key: "up", label: "Leistung steigt" });
        else if (ratio1 < 1 - config.trendTolerance && ratio2 < 1 - config.trendTolerance) Object.assign(trend, { key: "down", label: "Zuletzt niedrigere Leistung" });
        else Object.assign(trend, { key: "stable", label: "Weitgehend stabil" });
      } else if (recent.every((visit) => visit.sets.every((set) => set.weight === last.weight))) {
        const reps = recent.map((visit) => median(visit.sets.map((set) => set.reps)));
        const key = reps[0] > reps[1] && reps[1] > reps[2] ? "up" : reps[0] < reps[1] && reps[1] < reps[2] ? "down" : "stable";
        Object.assign(trend, { key, label: { up: "Leistung steigt", down: "Zuletzt niedrigere Leistung", stable: "Weitgehend stabil" }[key] });
      }
    }
    let weight = null, reps = Math.max(range.min, Math.min(range.max, exercise.reps || range.target));
    if (last) {
      weight = last.weight;
      const changedRange = last.range !== rangeKey;
      if (changedRange) {
        reps = exercise.reps >= range.min && exercise.reps <= range.max ? exercise.reps : range.target;
        if (p.mode === "external" && last.reps <= 20) {
          weight = Math.min(indexScore(last.weight, last.reps) / (1 + reps / 30), last.weight * (1 + config.maxIncrease));
          reasons.push("Wiederholungsbereich geändert: Last und Wiederholungen gemeinsam geschätzt.");
        } else { weight = p.mode === "bodyweight" ? 0 : null; reasons.push("Bereich geändert: Gewicht bei Körpergewicht, Zusatzlast oder Unterstützung bitte selbst wählen."); }
      } else {
        reps = Math.min(range.max, Math.max(range.min, last.reps + 1));
        reasons.push("Zuerst Wiederholungen innerhalb des gewählten Bereichs steigern.");
        const two = validTrend.slice(0, 2);
        const upper = two.length === 2 && two.every((visit) => visit.sets.every((set) => set.reps >= range.max && set.weight === last.weight));
        const lower = two.length === 2 && two.every((visit) => visit.sets.every((set) => set.reps < range.min && set.weight === last.weight));
        if (upper && (p.mode === "bodyweight" || (p.mode === "assisted" && last.weight === 0))) {
          reps = range.max; reasons.push("Obergrenze erreicht. Eine andere Variante oder Zusatzlast selbst wählen; keine weitere automatische Gewichtsänderung möglich.");
        } else if (upper) {
          const increment = p.mode === "assisted" ? -p.step : p.mode === "bodyweight" ? 0 : p.step;
          if (p.mode === "assisted" || increment <= last.weight * config.maxIncrease) { weight = Math.max(0, last.weight + increment); reps = range.min; reasons.push(p.mode === "assisted" ? "Obergrenze zweimal erreicht: etwas weniger Unterstützung vorschlagen." : "Obergrenze zweimal erreicht: kleine Laststeigerung vorschlagen."); }
          else reasons.push("Der nächste Gewichtsschritt wäre zu groß. Bisherige Last beibehalten.");
        } else if (lower) {
          weight = p.mode === "assisted" ? last.weight + p.step : p.mode === "bodyweight" ? 0 : Math.max(0, last.weight - p.step);
          reps = range.min; reasons.push("Untergrenze wiederholt verfehlt: leichtere Last vorschlagen.");
        }
      }
      if (weight != null && weight !== last.weight && p.mode !== "bodyweight") {
        const raw = weight; weight = p.mode === "assisted" ? ceilStep(weight, p.step) : floorStep(weight, p.step);
        if (raw > last.weight && p.mode !== "assisted" && weight <= last.weight) { weight = last.weight; reasons.push("Keine passende höhere Gewichtsstufe verfügbar; bisherige Last bleibt bestehen."); }
        if (weight === 0 && p.mode === "external") weight = null;
      }
      if (last.reps > 12 || reps > 12) notes.push("Bei hohen Wiederholungszahlen ist die Lastschätzung besonders unsicher.");
      if (last.legacy) notes.push("Ältere Einträge ohne Einheitenkennung: Gewichtsangabe vor Übernahme prüfen.");
    } else {
      reasons.push(p.machine && !p.equipmentKey ? "Gerätekennung eintragen; Gewichte verschiedener Maschinen werden nicht vermischt." : !exercise.id ? "Eigene Übung ohne eindeutige Katalog-ID: Gewicht selbst wählen." : "Keine aktuellen vergleichbaren Arbeitssätze vorhanden. Gewicht selbst wählen.");
      if (p.mode === "bodyweight") weight = 0;
    }
    if (p.mode === "external" && visits.length >= 2) {
      const ratio = visits[0].score / visits[1].score;
      if (ratio > config.outlierRatio || ratio < 1 / config.outlierRatio) {
        weight = null;
        Object.assign(trend, { key: "insufficient", label: "Auffällige Abweichung – Daten prüfen" });
        reasons.push("Die letzten Einheiten weichen stark voneinander ab. Keine automatische Last ableiten; Gewichtsangabe und Ausführung prüfen.");
      }
    }
    const baseline = { weight, reps };
    const rest = recovery(exercise, checkin);
    let day = { ...baseline };
    if (["unknown", "pain", "strong"].includes(rest.level)) day = null;
    else if (rest.level === "mild" || rest.level === "moderate" || exercise.deload) {
      const moderate = rest.level === "moderate" || exercise.deload;
      if (day.weight != null && last) {
        if (p.mode === "assisted") day.weight = ceilStep(Math.max(day.weight, last.weight) + (moderate ? p.step : 0), p.step);
        else if (p.mode !== "bodyweight") day.weight = floorStep(Math.min(day.weight, last.weight) * (moderate ? config.moderateLoadFactor : 1), p.step);
      }
      day.reps = Math.min(day.reps, last?.reps ?? day.reps, moderate ? range.min : day.reps);
      // Recovery is applied last. No inverse recalculation or extra sets compensate it.
      if (day.weight === 0 && p.mode === "external") day.weight = null;
      reasons.push(moderate ? "Heute leichter: Last und/oder Wiederholungen reduziert; keine zusätzlichen Sätze." : "Muskelkater: heute keine automatische Steigerung.");
    }
    if (rest.level === "unknown") reasons.push("Check-in ergänzen, bevor ein Tagesvorschlag übernommen wird.");
    if (rest.level === "strong") reasons.push("Starker Muskelkater in beteiligten Muskeln: Pause, Auslassen oder eine unbelastete Alternative empfohlen.");
    if (rest.level === "pain") reasons.push("Ungewöhnliche Schmerzen oder Schwellung: betroffene Übung pausieren und gegebenenfalls fachlich abklären lassen.");
    return { schema: 1, at: now, range: rangeKey, profile: p, last: last ? { weight: last.weight, reps: last.reps, date: latest.date } : null,
      trend, baseline, day, recovery: rest, confidence: weight == null || validTrend.length < 3 || last?.legacy || (last?.reps ?? 0) > 12 || reps > 12 ? "low" : "medium", reasons, notes };
  }
  return { ranges, modes, config, muscleGroups, inferRange, rangeFor, profile, weightLabel, musclesFor, validateCheckin, recovery, suggest };
})();
if (typeof module !== "undefined") module.exports = trainingGuidance;
