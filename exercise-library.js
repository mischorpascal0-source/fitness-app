(() => {
  const search = document.querySelector("#exercise-search");
  const muscle = document.querySelector("#exercise-muscle");
  const equipment = document.querySelector("#exercise-equipment");
  const count = document.querySelector("#exercise-count");
  const results = document.querySelector("#exercise-results");
  const empty = document.querySelector("#exercise-empty");
  const template = document.querySelector("#exercise-template");
  const detail = document.querySelector("#exercise-detail");
  const detailTitle = document.querySelector("#exercise-detail-title");
  const detailIllustration = document.querySelector("#detail-illustration");
  const detailEquipment = document.querySelector("#detail-equipment");
  const detailMuscle = document.querySelector("#detail-muscle");
  const detailSecondary = document.querySelector("#detail-secondary");
  const detailSecondaryRow = document.querySelector("#detail-secondary-row");
  const detailSteps = document.querySelector("#detail-steps");

  const { groups, types, find } = catalogSearch;
  groups.forEach((group) => muscle.add(new Option(group, group)));
  types.forEach((type) => equipment.add(new Option(type, type)));

  function showDetail(exercise) {
    detailTitle.textContent = exercise.name;
    const illustration = exerciseIllustrations.create(exercise);
    detailIllustration.replaceChildren(...(illustration ? [illustration] : []));
    detailIllustration.parentElement.hidden = !illustration;
    detailEquipment.textContent = `${exercise.type} · ${exercise.gear}`;
    detailMuscle.textContent = exercise.primary;
    detailSecondaryRow.hidden = !exercise.secondary;
    detailSecondary.textContent = exercise.secondary;
    detailSteps.replaceChildren(...exercise.steps.map((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      return item;
    }));
    detail.showModal();
    detail.scrollTop = 0;
  }

  function render() {
    const matches = find(search.value, muscle.value, equipment.value);
    const sections = document.createDocumentFragment();

    for (const group of groups) {
      const exercises = matches.filter((exercise) => exercise.group === group);
      if (!exercises.length) continue;

      const section = document.createElement("section");
      const heading = document.createElement("h3");
      const list = document.createElement("ul");
      heading.textContent = group;
      list.className = "exercise-grid";
      for (const exercise of exercises) {
        const item = template.content.cloneNode(true);
        const button = item.querySelector("button");
        button.dataset.exerciseId = exercise.id;
        item.querySelector("strong").textContent = exercise.name;
        item.querySelector(".exercise-meta").textContent = `${exercise.group} · ${exercise.type}`;
        button.addEventListener("click", () => showDetail(exercise));
        list.append(item);
      }
      section.append(heading, list);
      sections.append(section);
    }
    results.replaceChildren(sections);
    count.textContent = matches.length === 1 ? "1 Übung" : `${matches.length} Übungen`;
    empty.hidden = matches.length > 0;
  }

  search.addEventListener("input", render);
  muscle.addEventListener("change", render);
  equipment.addEventListener("change", render);
  render();
})();
