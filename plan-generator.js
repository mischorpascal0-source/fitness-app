const generateTrainingPlan = (() => {
  const catalog = typeof module === "undefined" ? exerciseCatalog : require("./exercises.js");
  const { splits, sessionTime, normalizeOptions } = typeof module === "undefined" ? trainingPlanData : require("./plan-data.js");
  const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  // A slot describes the movement, independently of the catalog's display group.
  const movements = {
    press: ["Brustdrücken", true, [
      "kh-flachbankdruecken", "kh-schraegbankdruecken", "kh-floor-press", "ma-brustdruecken",
      "ma-schraegbrustdruecken", "mp-flachbankdruecken", "mp-schraegbankdruecken", "kz-brustdruecken-stehend",
      "lh-bankdruecken", "lh-schraegbankdruecken", "kg-liegestuetz", "kg-liegestuetz-erhoeht",
    ]],
    overhead: ["Schulterdrücken", true, [
      "kh-schulterdruecken", "kh-arnold-press", "ma-schulterdruecken", "mp-schulterdruecken-sitzend",
      "lh-schulterdruecken", "kg-pike-pushups",
    ]],
    row: ["Rudern", true, [
      "kh-rudern-einarmig", "kh-rudern-vorgebeugt", "kh-rudern-brustgestuetzt", "ma-rudern-sitzend",
      "ma-rudern-brustgestuetzt", "ma-low-row", "ma-t-bar-rudern", "kz-rudern-neutral",
      "kz-rudern-obergriff", "kz-rudern-einarmig", "mp-rudern-vorgebeugt", "lh-rudern", "kg-rudern",
    ]],
    pull: ["Vertikales Ziehen", true, [
      "ma-latzug-obergriff", "ma-latzug-neutral", "ma-latzug-untergriff", "ma-klimmzuege-unterstuetzt",
      "ma-high-row", "kz-latzug-einarmig", "kg-klimmzuege",
    ]],
    knee: ["Kniebeuge oder Beinpresse", true, [
      "kh-goblet-squats", "kh-kniebeugen-seitlich", "kh-bulgarian-split-squats", "kh-ausfallschritte-rueckwaerts",
      "ma-beinpresse-45", "ma-beinpresse-horizontal", "ma-hackenschmidt-kniebeugen", "ma-pendulum-squats",
      "ma-belt-squats", "mp-kniebeugen", "mp-split-squats", "lh-kniebeugen", "lh-frontkniebeugen",
      "kg-kniebeugen", "kg-ausfallschritte-rueckwaerts",
    ]],
    hinge: ["Hüftstreckung", true, [
      "kh-rumaenisches-kreuzheben", "kh-rumaenisches-kreuzheben-einbeinig", "kh-hip-thrusts",
      "kh-glute-bridges", "ma-hip-thrusts", "kz-pull-throughs", "mp-rumaenisches-kreuzheben",
      "mp-hip-thrusts", "lh-rumaenisches-kreuzheben", "lh-hip-thrusts", "kg-glute-bridge",
    ]],
    lateral: ["Seitliche Schulter", false, ["kh-seitheben", "ma-seitheben", "kz-seitheben-einarmig"]],
    rear: ["Hintere Schulter", false, ["kh-reverse-flys", "ma-reverse-butterfly", "kz-reverse-flys", "kz-face-pulls"]],
    curl: ["Bizeps", false, ["kh-bizepscurls-stehend", "kh-hammercurls", "ma-bizepscurls", "kz-bizepscurls-stange", "kz-hammercurls-seil", "lh-bizepscurls"]],
    triceps: ["Trizeps", false, [
      "kh-ueberkopfstrecken", "kh-trizepsstrecken-liegend", "ma-trizepsstrecken", "kz-trizepsdruecken-seil",
      "kz-trizepsdruecken-stange", "mp-bankdruecken-eng", "lh-bankdruecken-eng", "kg-liegestuetz-eng",
    ]],
    hamstring: ["Beinbeuger", false, ["ma-beinbeuger-sitzend", "ma-beinbeuger-liegend", "ma-beinbeuger-stehend-einbeinig"]],
    chest: ["Fliegende Bewegung", false, ["kh-fliegende-flachbank", "kh-fliegende-schraegbank", "ma-butterfly", "kz-fly-brusthoehe"]],
    quadriceps: ["Beinstrecken", false, ["ma-beinstrecken"]],
    abduction: ["Hüftabduktion", false, ["ma-hueftabduktion", "kz-hueftabduktion"]],
    calf: ["Waden", false, ["kh-wadenheben-stehend", "kh-wadenheben-einbeinig", "ma-wadenheben-stehend", "ma-wadenheben-sitzend", "mp-wadenheben-stehend", "kg-wadenheben"]],
    core: ["Rumpf", false, ["kh-crunches", "ma-bauchcrunches", "kz-crunches-kniend", "kg-crunches", "kg-dead-bug"]],
  };
  // A pipe-separated slot can be filled by any listed movement.
  const torso = ["press", "row|pull", "overhead|lateral|rear", "pull|row", "lateral|rear|overhead"];
  const limbs = ["knee", "hinge", "curl", "triceps", "calf"];
  const patterns = {
    Oberkörper: ["press", "row", "pull|row", "overhead|lateral", "triceps|curl"],
    Unterkörper: ["knee", "hinge", "hamstring|hinge", "calf", "core"],
    Push: ["press", "overhead|press", "lateral", "triceps"],
    Pull: ["row", "pull|row", "rear", "curl"],
    Beine: ["knee", "hinge", "hamstring|hinge", "calf", "core"],
    Ganzkörper: ["knee", "press", "row|pull", "hinge", "core|calf"],
    Torso: torso,
    Limbs: limbs,
    "Torso A": torso,
    "Limbs A": limbs,
    "Torso B": ["pull|row", "chest|press", "rear|lateral|overhead", "row|pull", "lateral|overhead|rear"],
    "Limbs B": ["hinge", "quadriceps|knee", "calf", "triceps", "curl"],
  };
  const additionalPatterns = {
    Oberkörper: ["rear|lateral", "curl|triceps|press"],
    Unterkörper: ["quadriceps|knee", "abduction|hinge"],
    Push: ["chest|press", "triceps|lateral"],
    Pull: ["pull|row", "curl|rear"],
    Beine: ["quadriceps|knee", "abduction|hinge"],
    Ganzkörper: ["overhead|lateral", "pull|hamstring|row"],
    Torso: ["core", "chest|press"],
    Limbs: ["hamstring|hinge", "abduction|quadriceps"],
    "Torso A": ["core", "chest|press"],
    "Limbs A": ["hamstring|hinge", "abduction|quadriceps"],
    "Torso B": ["core", "overhead|press"],
    "Limbs B": ["hamstring|hinge", "abduction|knee"],
  };
  const technical = new Set(["kg-klimmzuege", "kg-pike-pushups", "kh-rumaenisches-kreuzheben-einbeinig", "kh-bulgarian-split-squats"]);
  const compoundAccessories = new Set(["mp-bankdruecken-eng", "lh-bankdruecken-eng", "kg-liegestuetz-eng"]);
  const preferred = {
    strength: ["Langhantel", "Multipresse"],
    muscle: ["Maschine", "Kabelzug"],
    fitness: ["Kurzhantel", "Körpergewicht"],
  };

  function pick(candidates, weight, random) {
    const weights = candidates.map(weight);
    let threshold = random() * weights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < candidates.length; index++) {
      threshold -= weights[index];
      if (threshold < 0) return candidates[index];
    }
    return candidates.at(-1);
  }

  return function generate(options, previous, random = Math.random) {
    options = normalizeOptions(options);
    if (!options) return null;
    const split = splits[options.split];
    const sessionNames = split.variants?.[options.days] ?? split.sessions;
    const torsoLimbs = options.split === "torsoLimbs";
    const sameSettings = JSON.stringify(options) === JSON.stringify(normalizeOptions(previous?.options));
    const { setMinutes, restMinutes } = sessionTime;
    const setBudget = Math.floor((options.minutes + restMinutes) / (setMinutes + restMinutes));
    const maxExercises = Math.max(torsoLimbs ? 5 : 3, Math.floor(setBudget / 2));
    const additionalSlots = options.minutes >= 75 ? 2 : options.minutes >= 60 ? 1 : 0;
    const usage = new Map();
    const notices = [];
    const sessions = [];
    let varied = false;

    for (let index = 0; index < options.days; index++) {
      const name = sessionNames[index % sessionNames.length];
      const oldIds = new Set(sameSettings ? previous.sessions[index]?.exercises.map(({ id }) => id) : []);
      const selected = [];
      const missing = [];
      const base = patterns[name];
      const slots = base.concat(additionalPatterns[name].slice(0, additionalSlots));
      for (const [slotIndex, keys] of slots.entries()) {
        if (selected.length >= maxExercises) break;
        const slot = keys.split("|").map((key) => movements[key]);
        const choices = new Map();
        for (const [label, compound, ids] of slot) {
          for (const id of ids) {
            const exercise = byId.get(id);
            if (options.equipment.includes(exercise?.type) && !selected.some((entry) => entry.id === id)) {
              choices.set(id, { id, type: exercise.type, compound: compound || compoundAccessories.has(id) });
            }
          }
          if (choices.size) break;
        }
        if (!choices.size) {
          if (slotIndex < base.length) missing.push(slot.map(([label]) => label).join(" / "));
          continue;
        }
        let available = [...choices.values()];
        if (torsoLimbs && index >= 2) {
          const unused = available.filter(({ id }) => !usage.has(id));
          if (unused.length) available = unused;
        }
        const fresh = available.filter(({ id }) => !oldIds.has(id));
        const selectedExercise = pick(!varied && fresh.length ? fresh : available, ({ id, type, compound }) => {
          const skill = options.level === "beginner" && (type === "Langhantel" || technical.has(id)) ? .35 : 1;
          const goal = preferred[options.goal].includes(type) ? 2.5 : 1;
          return skill * goal * (oldIds.has(id) ? .65 : 1) / (1 + (usage.get(id) ?? 0));
        }, random);
        varied ||= !oldIds.has(selectedExercise.id);
        selected.push(selectedExercise);
        usage.set(selectedExercise.id, (usage.get(selectedExercise.id) ?? 0) + 1);
      }
      if (missing.length) notices.push(`Einheit ${index + 1} (${name}): ${missing.join(", ")}`);
      selected.sort((a, b) => Number(b.compound) - Number(a.compound));
      const exercises = selected
        .map(({ id, type, compound }, exerciseIndex) => ({
          id,
          sets: exerciseIndex < setBudget - selected.length ? 2 : 1,
          reps: options.goal === "strength" ? (compound && type !== "Körpergewicht" ? 5 : 8)
            : options.goal === "muscle" ? (compound ? 8 : 12) : (compound ? 10 : 15),
        }));
      let remainingSets = setBudget - exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
      // Spread extra sets across the selected exercises, starting with the compound movements.
      for (const targetSets of [3, 4]) {
        for (const [exerciseIndex, exercise] of exercises.entries()) {
          if (remainingSets === 0) break;
          const strengthMovement = options.goal === "strength" && selected[exerciseIndex].compound;
          const maxSets = options.level === "beginner" && options.minutes < 60 ? 2
            : options.level !== "beginner" && strengthMovement ? 4 : 3;
          if (targetSets <= maxSets) {
            exercise.sets = targetSets;
            remainingSets--;
          }
        }
      }
      sessions.push({ name, exercises });
    }

    return { plan: { name: split.label, options, sessions }, notices };
  };
})();

if (typeof module !== "undefined") module.exports = generateTrainingPlan;
