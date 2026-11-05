const dailyTracking = (() => {
  const format = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
  const mealNames = ["Frühstück", "Mittagessen", "Abendessen", "Snacks"];
  const nutritionDate = document.querySelector("#nutrition-date");
  const dailyForm = document.querySelector("#daily-form");
  const foodForm = document.querySelector("#food-form");
  const cardioForm = document.querySelector("#cardio-form");
  const nutritionStatus = document.querySelector("#nutrition-status");
  const cardioStatus = document.querySelector("#cardio-status");
  const mobilityStatus = document.querySelector("#mobility-status");
  const routines = [
    { name: "Schulterkreisen", area: "Schultern", seconds: 45, text: "Stehe aufrecht und kreise die Schultern langsam nach hinten. Halte die Arme locker." },
    { name: "Brustwirbelsäule drehen", area: "Oberer Rücken", seconds: 60, text: "Drehe den Oberkörper im aufrechten Stand langsam zur Seite. Halte die Hüfte nach vorn und wechsle die Seite." },
    { name: "Hüftbeuger dehnen", area: "Hüfte", seconds: 60, text: "Gehe in einen stabilen halben Kniestand. Richte den Oberkörper auf und verlagere die Hüfte sanft nach vorn. Wechsle nach der Hälfte die Seite." },
    { name: "Waden dehnen", area: "Unterschenkel", seconds: 60, text: "Stütze dich an einer Wand ab. Stelle ein Bein nach hinten und halte die Ferse am Boden. Wechsle nach der Hälfte die Seite." },
  ];
  let storageKey;
  let data = emptyData();
  let mobilityTimer;
  let lastToday = today();

  function today() {
    return keyForDate(new Date());
  }

  function keyForDate(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function emptyData() {
    return { goals: { steps: 8000, calories: 2200 }, steps: {}, foods: [], cardio: [], mobility: {} };
  }

  function read() {
    try {
      const saved = storageKey && JSON.parse(localStorage.getItem(storageKey));
      if (saved?.goals && saved.steps && Array.isArray(saved.foods) && Array.isArray(saved.cardio) && saved.mobility) return saved;
    } catch {
      // Start with empty values when this browser has no readable diary.
    }
    return emptyData();
  }

  function commit(update, status) {
    if (!storageKey) return false;
    const next = read();
    update(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      data = next;
      render();
      return true;
    } catch {
      status.textContent = "Der Eintrag konnte in diesem Browser nicht gespeichert werden.";
      return false;
    }
  }

  function totals(foods) {
    return foods.reduce((sum, entry) => {
      for (const field of ["calories", "protein", "carbs", "fat"]) sum[field] += entry[field];
      return sum;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  function renderMetric(id, value, goal, unit) {
    const card = document.getElementById(id);
    card.querySelector(".value").textContent = format.format(value) + unit;
    card.querySelector(".goal").textContent = "Ziel " + format.format(goal) + unit;
    card.querySelector("progress").max = goal;
    card.querySelector("progress").value = value;
  }

  function entryRow(name, detail, onRemove) {
    const row = document.createElement("li");
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = name;
    const subtitle = document.createElement("small");
    subtitle.textContent = detail;
    copy.append(title, subtitle);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button";
    remove.setAttribute("aria-label", name + " entfernen");
    remove.innerHTML = '<svg aria-hidden="true"><use href="#icon-trash"/></svg>';
    remove.addEventListener("click", onRemove);
    row.append(copy, remove);
    return row;
  }

  function renderNutrition() {
    const entries = data.foods.filter((entry) => entry.date === nutritionDate.value);
    const sum = totals(entries);
    const remaining = data.goals.calories - sum.calories;
    document.querySelector("#nutrition-eaten").textContent = format.format(sum.calories) + " kcal";
    document.querySelector("#nutrition-goal").textContent = format.format(data.goals.calories) + " kcal";
    document.querySelector("#nutrition-remaining").textContent = format.format(Math.abs(remaining));
    const ring = document.querySelector("#nutrition-ring");
    ring.querySelector("small").textContent = remaining < 0 ? "kcal über Ziel" : "kcal übrig";
    ring.style.setProperty("--calorie-progress", Math.min(100, sum.calories / data.goals.calories * 100) + "%");
    document.querySelector("#nutrition-macros").replaceChildren(...[
      ["Protein", sum.protein], ["Kohlenhydrate", sum.carbs], ["Fett", sum.fat],
    ].map(([name, value]) => {
      const item = document.createElement("div");
      const label = document.createElement("small");
      label.textContent = name;
      const amount = document.createElement("strong");
      amount.textContent = format.format(value) + " g";
      item.append(label, amount);
      return item;
    }));
    document.querySelector("#nutrition-meals").replaceChildren(...mealNames.map((meal) => {
      const items = entries.filter((entry) => entry.meal === meal);
      const card = document.createElement("section");
      card.className = "card library-panel";
      const header = document.createElement("div");
      header.className = "meal-heading";
      const title = document.createElement("h3");
      title.textContent = meal;
      const calories = document.createElement("span");
      calories.textContent = format.format(totals(items).calories) + " kcal";
      header.append(title, calories);
      card.append(header);
      if (items.length) {
        const list = document.createElement("ul");
        list.className = "entry-list";
        list.append(...items.map((entry) => entryRow(entry.name, format.format(entry.calories) + " kcal", () => {
          commit((next) => { next.foods = next.foods.filter(({ id }) => id !== entry.id); }, nutritionStatus);
        })));
        card.append(list);
      } else {
        const empty = document.createElement("p");
        empty.className = "meal-empty";
        empty.textContent = "Hier ist noch Platz für deine Mahlzeit.";
        card.append(empty);
      }
      return card;
    }));
  }

  function renderCardio() {
    const now = new Date();
    const weekday = (now.getDay() + 6) % 7;
    const week = Array.from({ length: 7 }, (_, index) => keyForDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday + index)));
    const entries = data.cardio.filter(({ date }) => week.includes(date));
    document.querySelector("#cardio-minutes").textContent = format.format(entries.reduce((sum, entry) => sum + entry.minutes, 0));
    document.querySelector("#cardio-distance").textContent = format.format(entries.reduce((sum, entry) => sum + entry.distance, 0));
    const minutes = week.map((date) => entries.filter((entry) => entry.date === date).reduce((sum, entry) => sum + entry.minutes, 0));
    const max = Math.max(1, ...minutes);
    document.querySelector("#cardio-chart").replaceChildren(...minutes.map((value, index) => {
      const bar = document.createElement("div");
      const count = document.createElement("small");
      count.textContent = value;
      const column = document.createElement("span");
      column.style.setProperty("--bar-height", value / max * 100 + "%");
      const day = document.createElement("small");
      day.textContent = trainingPlanData.weekdays[index].slice(0, 2);
      bar.setAttribute("aria-label", day.textContent + ", " + value + " Minuten");
      bar.append(count, column, day);
      return bar;
    }));
    document.querySelector("#cardio-empty").hidden = data.cardio.length > 0;
    document.querySelector("#cardio-history").replaceChildren(...[...data.cardio].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
      .map((entry) => entryRow(entry.name, entry.date.split("-").reverse().join(".") + " · " + entry.minutes + " Min. · " + format.format(entry.distance) + " km", () => {
        commit((next) => { next.cardio = next.cardio.filter(({ id }) => id !== entry.id); }, cardioStatus);
      })));
  }

  function renderMobility() {
    const done = data.mobility[today()] ?? [];
    document.querySelector("#mobility-start").textContent = done.length === routines.length ? "Routine erneut starten" : "Routine starten";
    document.querySelector("#mobility-exercises").replaceChildren(...routines.map((exercise, index) => {
      const card = document.createElement("section");
      card.className = "card library-panel mobility-card";
      const heading = document.createElement("div");
      heading.className = "section-heading";
      const name = document.createElement("h3");
      name.textContent = exercise.name;
      const duration = document.createElement("output");
      duration.dataset.mobilityTimer = index;
      duration.textContent = done.includes(index) ? "Erledigt ✓" : exercise.seconds + " Sek.";
      heading.append(name, duration);
      const text = document.createElement("p");
      text.textContent = exercise.text;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "plan-button";
      const running = mobilityTimer?.index === index;
      button.textContent = running ? "Übung abschließen" : done.includes(index) ? "Noch einmal" : "Starten";
      button.addEventListener("click", () => {
        if (mobilityTimer?.index === index) {
          if (commit((next) => { next.mobility[today()] = [...new Set([...(next.mobility[today()] ?? []), index])]; }, mobilityStatus)) {
            mobilityTimer = null;
            renderMobility();
          }
        } else {
          mobilityTimer = { index, endsAt: Date.now() + exercise.seconds * 1000 };
          renderMobility();
        }
      });
      card.append(heading, text, button);
      return card;
    }));
    mobilityStatus.textContent = done.length + " von " + routines.length + " Übungen heute abgeschlossen.";
  }

  function render() {
    if (nutritionDate.value === lastToday && lastToday !== today()) nutritionDate.value = today();
    lastToday = today();
    if (!nutritionDate.value) nutritionDate.value = today();
    renderMetric("steps", data.steps[today()] ?? 0, data.goals.steps, "");
    renderMetric("calories", totals(data.foods.filter(({ date }) => date === today())).calories, data.goals.calories, " kcal");
    renderNutrition();
    renderCardio();
    renderMobility();
  }

  function openForm(buttonId, dialogId, form, prepare) {
    document.querySelector(buttonId).addEventListener("click", () => {
      form.reset();
      form.querySelector(".form-status").textContent = "";
      prepare?.();
      document.querySelector(dialogId).showModal();
    });
  }

  openForm("#daily-open", "#daily-dialog", dailyForm, () => {
    dailyForm.elements.steps.value = data.steps[today()] ?? 0;
    dailyForm.elements.stepGoal.value = data.goals.steps;
    dailyForm.elements.calorieGoal.value = data.goals.calories;
  });
  dailyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!dailyForm.reportValidity()) return;
    if (commit((next) => {
      next.steps[today()] = dailyForm.elements.steps.valueAsNumber;
      next.goals.steps = dailyForm.elements.stepGoal.valueAsNumber;
      next.goals.calories = dailyForm.elements.calorieGoal.valueAsNumber;
    }, dailyForm.querySelector(".form-status"))) document.querySelector("#daily-dialog").close();
  });

  openForm("#food-open", "#food-dialog", foodForm);
  nutritionDate.addEventListener("change", () => { if (nutritionDate.value) renderNutrition(); });
  foodForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!foodForm.reportValidity()) return;
    const name = foodForm.elements.foodName.value.trim();
    if (!name) {
      foodForm.elements.foodName.value = "";
      foodForm.reportValidity();
      return;
    }
    const entry = { id: crypto.randomUUID(), date: nutritionDate.value, name, meal: foodForm.elements.meal.value };
    for (const field of ["calories", "protein", "carbs", "fat"]) entry[field] = foodForm.elements[field].valueAsNumber;
    if (commit((next) => next.foods.push(entry), foodForm.querySelector(".form-status"))) document.querySelector("#food-dialog").close();
  });

  openForm("#cardio-open", "#cardio-dialog", cardioForm, () => {
    cardioForm.elements.date.value = today();
    cardioForm.elements.date.max = today();
  });
  cardioForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!cardioForm.reportValidity()) return;
    const entry = {
      id: crypto.randomUUID(), name: cardioForm.elements.activity.value, date: cardioForm.elements.date.value,
      minutes: cardioForm.elements.minutes.valueAsNumber, distance: cardioForm.elements.distance.valueAsNumber,
    };
    if (commit((next) => next.cardio.push(entry), cardioForm.querySelector(".form-status"))) document.querySelector("#cardio-dialog").close();
  });
  document.querySelector("#mobility-start").addEventListener("click", () => {
    const done = data.mobility[today()] ?? [];
    const index = routines.findIndex((_, index) => !done.includes(index));
    mobilityTimer = { index: Math.max(0, index), endsAt: Date.now() + routines[Math.max(0, index)].seconds * 1000 };
    renderMobility();
    document.querySelector("#mobility-exercises").scrollIntoView({ block: "start", behavior: "smooth" });
  });
  window.setInterval(() => {
    if (!mobilityTimer) return;
    const output = document.querySelector('[data-mobility-timer="' + mobilityTimer.index + '"]');
    if (output) output.textContent = Math.max(0, Math.ceil((mobilityTimer.endsAt - Date.now()) / 1000)) + " Sek.";
  }, 500);
  window.addEventListener("storage", (event) => {
    if (storageKey && (event.key === storageKey || event.key === null)) { data = read(); render(); }
  });

  return {
    render,
    setAccount(id) {
      storageKey = id ? "fitness-app.daily.v1." + id : null;
      data = read();
      mobilityTimer = null;
      nutritionDate.value = today();
      nutritionStatus.textContent = "";
      cardioStatus.textContent = "";
      render();
    },
  };
})();
