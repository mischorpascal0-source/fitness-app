const generateTrainingPlan = (() => {
  const catalog = typeof module === "undefined" ? exerciseCatalog : require("./exercises.js");
  const { splits, normalizeOptions } = typeof module === "undefined" ? trainingPlanData : require("./plan-data.js");
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
    calf: ["Waden", false, ["kh-wadenheben-stehend", "kh-wadenheben-einbeinig", "ma-wadenheben-stehend", "ma-wadenheben-sitzend", "mp-wadenheben-stehend", "kg-wadenheben"]],
    core: ["Rumpf", false, ["kh-crunches", "ma-bauchcrunches", "kz-crunches-kniend", "kg-crunches", "kg-dead-bug"]],
  };
  // A pipe-separated slot can be filled by any listed movement.
  const patterns = {
    Oberkörper: ["press", "row", "pull|row", "overhead|lateral", "triceps|curl"],
    Unterkörper: ["knee", "hinge", "hamstring|hinge", "calf", "core"],
    Push: ["press", "overhead|press", "lateral", "triceps"],
    Pull: ["row", "pull|row", "rear", "curl"],
    Beine: ["knee", "hinge", "hamstring|hinge", "calf", "core"],
    Ganzkörper: ["knee", "press", "row|pull", "hinge", "core|calf"],
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
    const sameSettings = JSON.stringify(options) === JSON.stringify(normalizeOptions(previous?.options));
    const usage = new Map();
    const notices = [];
    const sessions = [];
    let varied = false;

    for (let index = 0; index < options.days; index++) {
      const name = split.sessions[index % split.sessions.length];
      const oldIds = new Set(sameSettings ? previous.sessions[index]?.exercises.map(({ id }) => id) : []);
      const selected = [];
      const missing = [];
      const slots = patterns[name].map((slot) => slot.split("|").map((key) => movements[key]));
      for (const slot of slots) {
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
          missing.push(slot.map(([label]) => label).join(" / "));
          continue;
        }
        const available = [...choices.values()];
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
      const exercises = selected.sort((a, b) => Number(b.compound) - Number(a.compound))
        .map(({ id, type, compound }) => ({
          id,
          sets: options.level === "beginner" ? 2 : options.goal === "strength" && compound ? 4 : 3,
          reps: options.goal === "strength" ? (compound && type !== "Körpergewicht" ? 5 : 8)
            : options.goal === "muscle" ? (compound ? 8 : 12) : (compound ? 10 : 15),
        }));
      sessions.push({ name, exercises });
    }

    return { plan: { name: split.label, options, sessions }, notices };
  };
})();

if (typeof module !== "undefined") module.exports = generateTrainingPlan;
