const catalogSearch = (() => {
  function normalize(value) {
    return value.toLowerCase()
      .replace(/ae|ä/g, "a")
      .replace(/oe|ö/g, "o")
      .replace(/ue|ü/g, "u")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  const collator = new Intl.Collator("de");
  const index = exerciseCatalog.map((exercise) => ({
    exercise,
    searchText: normalize([
      exercise.name, exercise.group, exercise.type, exercise.gear,
      exercise.primary, ...exercise.aliases,
    ].join(" ")),
  })).sort((a, b) => collator.compare(a.exercise.name, b.exercise.name));
  const groups = [...new Set(exerciseCatalog.map(({ group }) => group))];
  const types = [...new Set(exerciseCatalog.map(({ type }) => type))];

  function find(query, group, type) {
    const terms = normalize(query).split(" ").filter(Boolean);
    return index.filter(({ exercise, searchText }) =>
      (!group || exercise.group === group) && (!type || exercise.type === type) &&
      terms.every((term) => searchText.includes(term))
    ).map(({ exercise }) => exercise);
  }

  return { groups, types, find };
})();
