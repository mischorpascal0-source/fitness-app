const trainingPlanData = (() => {
  const catalog = typeof module === "undefined" ? exerciseCatalog : require("./exercises.js");
  const exerciseIds = new Set(catalog.map(({ id }) => id));
  const equipment = [...new Set(catalog.map(({ type }) => type))];
  const splits = {
    upperLower: { label: "Oberkörper / Unterkörper", days: [2, 4], sessions: ["Oberkörper", "Unterkörper"] },
    pushPullLegs: { label: "Push / Pull / Legs", days: [3, 6], sessions: ["Push", "Pull", "Beine"] },
    fullBody: { label: "Ganzkörper", days: [2, 3], sessions: ["Ganzkörper"] },
  };
  const goals = { muscle: "Muskelaufbau", strength: "Kraft", fitness: "Allgemeine Fitness" };
  const levels = { beginner: "Einsteiger", intermediate: "Fortgeschritten" };
  const weekdays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const limits = { name: 100, sessions: 20, exercises: 40, sets: 10, reps: 100 };
  const sessionTime = { min: 20, max: 120, step: 5, defaultMinutes: 45, setMinutes: 1, restMinutes: 3 };

  function estimateMinutes(sets) {
    return sets * sessionTime.setMinutes + Math.max(0, sets - 1) * sessionTime.restMinutes;
  }

  function normalizeOptions(options) {
    if (!options || !Object.hasOwn(splits, options.split) ||
        !splits[options.split].days.includes(options.days) ||
        !Object.hasOwn(goals, options.goal) || !Object.hasOwn(levels, options.level)) return null;
    const available = options.equipment ?? equipment;
    if (!Array.isArray(available) || !available.length || available.some((type) => !equipment.includes(type))) return null;
    const { split, days, goal, level } = options;
    const minutes = options.minutes ?? sessionTime.defaultMinutes;
    if (!Number.isInteger(minutes) || minutes < sessionTime.min || minutes > sessionTime.max ||
        (minutes - sessionTime.min) % sessionTime.step !== 0) return null;
    return { split, days, goal, level, minutes, equipment: equipment.filter((type) => available.includes(type)) };
  }

  function normalizePlan(plan) {
    if (!plan || !Array.isArray(plan.sessions) || plan.sessions.length > limits.sessions) return null;
    const options = normalizeOptions(plan.options);
    const name = plan.name ?? (options && splits[options.split].label);
    const validName = (value) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= limits.name;
    if (!validName(name)) return null;

    const sessions = [];
    for (const session of plan.sessions) {
      if (!session || !validName(session.name) || !Array.isArray(session.exercises)) return null;
      const exercises = [];
      for (const entry of session.exercises) {
        if (!entry || !Number.isInteger(entry.sets) || entry.sets < 1 || entry.sets > limits.sets ||
            !Number.isInteger(entry.reps) || entry.reps < 1 || entry.reps > limits.reps) return null;
        const { id, sets, reps } = entry;
        if (exerciseIds.has(id)) {
          exercises.push({ id, sets, reps });
        } else if (validName(entry.name) && (!entry.equipment || equipment.includes(entry.equipment))) {
          exercises.push({ name: entry.name.trim(), equipment: entry.equipment || "", sets, reps });
        } else {
          return null;
        }
      }
      const normalized = { name: session.name.trim(), exercises };
      if (Number.isInteger(session.weekday) && session.weekday >= 0 && session.weekday < weekdays.length) {
        normalized.weekday = session.weekday;
      }
      sessions.push(normalized);
    }
    return { name: name.trim(), options, sessions };
  }

  return { splits, goals, levels, equipment, weekdays, limits, sessionTime, estimateMinutes, normalizeOptions, normalizePlan };
})();

if (typeof module !== "undefined") module.exports = trainingPlanData;
