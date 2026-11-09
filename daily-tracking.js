const dailyTracking = (() => {
  const format = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
  const weekFormat = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric" });
  const mealNames = ["Frühstück", "Mittagessen", "Abendessen", "Snacks"];
  const { dateKey: keyForDate, daysFor } = weekCalendar;
  let nutritionDate = new Date();
  let cardioDate = new Date();
  const nutritionCalendar = diaryCalendar("nutrition", (date) => { nutritionDate = date; renderNutrition(); }, "Mahlzeit erfasst");
  const cardioCalendar = diaryCalendar("cardio", (date) => { cardioDate = date; renderCardio(); }, "Aktivität erfasst");
  const dailyForm = document.querySelector("#daily-form");
  const stepField = dailyForm.elements.steps;
  const stepsSource = document.querySelector("#steps-source");
  const stepsSync = document.querySelector("#steps-garmin-sync");
  const stepsStatus = document.querySelector("#steps-garmin-status");
  const foodForm = document.querySelector("#food-form");
  const cardioForm = document.querySelector("#cardio-form");
  const weightForm = document.querySelector("#weight-form");
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

  function diaryCalendar(name, onSelect, completedLabel) {
    const panel = document.getElementById(name + "-calendar");
    panel.append(document.querySelector("#diary-calendar-template").content.cloneNode(true));
    panel.querySelector("input").id = name + "-date";
    return weekCalendar.create(panel, onSelect, completedLabel);
  }

  function emptyData() {
    return { goals: { steps: 8000, calories: 2200 }, steps: {}, foods: [], cardio: [], mobility: {}, weights: {} };
  }

  function read() {
    try {
      const saved = storageKey && JSON.parse(localStorage.getItem(storageKey));
      if (saved?.goals && saved.steps && Array.isArray(saved.foods) && Array.isArray(saved.cardio) && saved.mobility) {
        saved.weights ??= {};
        return saved;
      }
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

  function recentDates(count) {
    const now = new Date();
    return Array.from({ length: count }, (_, index) => keyForDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - count + 1 + index)));
  }

  function renderBars(selector, dates, values) {
    const max = Math.max(1, ...values);
    document.querySelector(selector).replaceChildren(...values.map((value, index) => {
      const bar = document.createElement("div");
      const count = document.createElement("small");
      count.textContent = value == null ? "–" : format.format(value);
      const column = document.createElement("span");
      column.style.setProperty("--bar-height", value / max * 100 + "%");
      if (value == null) column.style.visibility = "hidden";
      const label = document.createElement("small");
      label.textContent = trainingPlanData.weekdays[(new Date(dates[index] + "T12:00:00").getDay() + 6) % 7].slice(0, 2);
      bar.setAttribute("aria-label", dates[index] + ", " + (value == null ? "kein Wert erfasst" : format.format(value)));
      bar.append(count, column, label);
      return bar;
    }));
  }

  function renderMacros(selector, sum, divisor = 1) {
    document.querySelector(selector).replaceChildren(...[
      ["Protein", sum.protein], ["Kohlenhydrate", sum.carbs], ["Fett", sum.fat],
    ].map(([name, value]) => {
      const item = document.createElement("div");
      const label = document.createElement("small");
      label.textContent = name;
      const amount = document.createElement("strong");
      amount.textContent = format.format(value / divisor) + " g";
      item.append(label, amount);
      return item;
    }));
  }

  function renderStatistics() {
    const dates = recentDates(7);
    const foods = data.foods.filter(({ date }) => dates.includes(date));
    const calories = dates.map((date) => totals(foods.filter((entry) => entry.date === date)).calories);
    document.querySelector("#stats-calories-average").textContent = "Ø " + format.format(totals(foods).calories / 7) + " kcal";
    renderBars("#stats-calories-chart", dates, calories);
    renderMacros("#stats-macros", totals(foods), 7);
    const cardio = data.cardio.filter(({ date }) => dates.includes(date));
    document.querySelector("#stats-cardio-minutes").textContent = format.format(cardio.reduce((sum, entry) => sum + entry.minutes, 0));
    document.querySelector("#stats-cardio-distance").textContent = format.format(cardio.reduce((sum, entry) => sum + entry.distance, 0));

    const last30 = recentDates(30);
    const weights = Object.entries(data.weights).filter(([date]) => last30.includes(date)).sort(([a], [b]) => a.localeCompare(b));
    document.querySelector("#stats-weight-empty").hidden = weights.length > 0;
    document.querySelector("#stats-weight-latest").textContent = weights.length ? format.format(weights.at(-1)[1]) + " kg" : "–";
    const chart = document.querySelector("#stats-weight-chart");
    chart.replaceChildren();
    chart.hidden = !weights.length;
    if (!weights.length) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 300 100");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Gewichtsverlauf aus " + weights.length + " Einträgen in den letzten 30 Tagen");
    const values = weights.map(([, weight]) => weight);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(.1, max - min);
    const points = weights.map(([date, weight]) => [10 + last30.indexOf(date) / 29 * 280, max === min ? 50 : 85 - (weight - min) / range * 70]);
    const line = document.createElementNS(svg.namespaceURI, "polyline");
    line.setAttribute("points", points.map((point) => point.join(",")).join(" "));
    svg.append(line);
    points.forEach(([x, y], index) => {
      const circle = document.createElementNS(svg.namespaceURI, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", 3);
      const title = document.createElementNS(svg.namespaceURI, "title");
      title.textContent = weights[index][0] + " · " + format.format(weights[index][1]) + " kg";
      circle.append(title);
      svg.append(circle);
    });
    chart.append(svg);
  }

  function renderMetric(id, value, goal, unit) {
    const card = document.getElementById(id);
    card.querySelector(".value").textContent = value == null ? "–" : format.format(value) + unit;
    card.querySelector(".goal").textContent = "Ziel " + format.format(goal) + unit;
    card.querySelector("progress").max = goal;
    card.querySelector("progress").value = value ?? 0;
  }

  function renderSteps() {
    const garmin = cardioGarmin.getSnapshot();
    const imported = garmin.connected ? garmin.steps : undefined;
    const day = today();
    const current = imported?.[day];
    const hasGarmin = current !== undefined;
    renderMetric("steps", current ?? data.steps[day] ?? null, data.goals.steps, "");
    stepsSource.textContent = hasGarmin ? "Heute · Garmin" : "Heute";
    stepsSync.hidden = !garmin.connected;
    stepsSync.disabled = garmin.busy;
    stepsStatus.textContent = garmin.busy ? "Garmin wird geladen …"
      : hasGarmin ? "Der heutige Schrittwert stammt von Garmin."
      : garmin.connected ? "Für heute liegt noch kein Garmin-Wert vor. Du kannst Schritte manuell eintragen."
      : "Du kannst Schritte manuell eintragen oder Garmin unter Cardio verbinden.";
    if (hasGarmin) stepField.value = current;
    else if (stepField.disabled) stepField.value = data.steps[day] ?? 0;
    stepField.disabled = hasGarmin;

    const dates = recentDates(7);
    const values = dates.map((date) => imported?.[date] ?? data.steps[date] ?? null);
    const tracked = values.filter((value) => value != null);
    document.querySelector("#stats-steps-average").textContent = tracked.length
      ? "Ø " + format.format(tracked.reduce((sum, value) => sum + value, 0) / tracked.length) : "–";
    renderBars("#stats-steps-chart", dates, values);
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
    nutritionCalendar.render(nutritionDate, new Set(data.foods.map(({ date }) => date)));
    const selected = keyForDate(nutritionDate);
    const entries = data.foods.filter(({ date }) => date === selected);
    const sum = totals(entries);
    const remaining = data.goals.calories - sum.calories;
    document.querySelector("#nutrition-eaten").textContent = format.format(sum.calories) + " kcal";
    document.querySelector("#nutrition-goal").textContent = format.format(data.goals.calories) + " kcal";
    document.querySelector("#nutrition-remaining").textContent = format.format(Math.abs(remaining));
    const ring = document.querySelector("#nutrition-ring");
    ring.querySelector("small").textContent = remaining < 0 ? "kcal über Ziel" : "kcal übrig";
    ring.style.setProperty("--calorie-progress", Math.min(100, sum.calories / data.goals.calories * 100) + "%");
    renderMacros("#nutrition-macros", sum);
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
    cardioCalendar.render(cardioDate, new Set(data.cardio.map(({ date }) => date)));
    const days = daysFor(cardioDate);
    const week = days.map(keyForDate);
    const entries = data.cardio.filter(({ date }) => week.includes(date));
    document.querySelector("#cardio-week-date").textContent = weekFormat.formatRange(days[0], days.at(-1));
    document.querySelector("#cardio-minutes").textContent = format.format(entries.reduce((sum, entry) => sum + entry.minutes, 0));
    document.querySelector("#cardio-distance").textContent = format.format(entries.reduce((sum, entry) => sum + entry.distance, 0));
    const minutes = week.map((date) => entries.filter((entry) => entry.date === date).reduce((sum, entry) => sum + entry.minutes, 0));
    renderBars("#cardio-chart", week, minutes);
    const selected = keyForDate(cardioDate);
    const dayEntries = entries.filter(({ date }) => date === selected);
    const isFuture = selected > today();
    const empty = document.querySelector("#cardio-empty");
    empty.hidden = dayEntries.length > 0;
    empty.textContent = isFuture ? "Du kannst Aktivitäten für heute oder vergangene Tage eintragen." : "Für diesen Tag ist noch keine Aktivität eingetragen.";
    document.querySelector("#cardio-open").disabled = isFuture;
    document.querySelector("#cardio-history").replaceChildren(...dayEntries.reverse()
      .map((entry) => entryRow(entry.name, format.format(entry.minutes) + " Min. · " + format.format(entry.distance) + " km", () => {
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
    if (lastToday !== today()) {
      if (keyForDate(nutritionDate) === lastToday) nutritionDate = new Date();
      if (keyForDate(cardioDate) === lastToday) cardioDate = new Date();
    }
    lastToday = today();
    renderSteps();
    renderMetric("calories", totals(data.foods.filter(({ date }) => date === today())).calories, data.goals.calories, " kcal");
    const homeRing = document.querySelector("#home-calorie-ring");
    homeRing.style.setProperty("--calorie-progress", Math.min(100, totals(data.foods.filter(({ date }) => date === today())).calories / data.goals.calories * 100) + "%");
    renderNutrition();
    renderCardio();
    renderMobility();
    renderStatistics();
    document.dispatchEvent(new Event("fitness:dailychange"));
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
    stepField.value = data.steps[today()] ?? 0;
    dailyForm.elements.stepGoal.value = data.goals.steps;
    dailyForm.elements.calorieGoal.value = data.goals.calories;
    renderSteps();
  });
  document.addEventListener("fitness:garminchange", renderSteps);
  stepsSync.addEventListener("click", async () => {
    const status = dailyForm.querySelector(".form-status");
    status.textContent = "";
    await cardioGarmin.sync();
    if (cardioGarmin.getSnapshot().error) status.textContent = "Garmin konnte nicht synchronisiert werden. Versuche es erneut.";
  });
  document.querySelector("#steps").addEventListener("click", () => document.querySelector("#daily-open").click());
  openForm("#weight-open", "#weight-dialog", weightForm, () => {
    weightForm.elements.date.value = today();
    weightForm.elements.date.max = today();
    weightForm.elements.weight.value = data.weights[today()] ?? "";
  });
  document.querySelector("#home-weight-open").addEventListener("click", () => document.querySelector("#weight-open").click());
  weightForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!weightForm.reportValidity()) return;
    if (commit((next) => {
      next.weights[weightForm.elements.date.value] = weightForm.elements.weight.valueAsNumber;
    }, weightForm.querySelector(".form-status"))) document.querySelector("#weight-dialog").close();
  });
  dailyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!dailyForm.reportValidity()) return;
    if (commit((next) => {
      if (!stepField.disabled) next.steps[today()] = stepField.valueAsNumber;
      next.goals.steps = dailyForm.elements.stepGoal.valueAsNumber;
      next.goals.calories = dailyForm.elements.calorieGoal.valueAsNumber;
    }, dailyForm.querySelector(".form-status"))) document.querySelector("#daily-dialog").close();
  });

  openForm("#food-open", "#food-dialog", foodForm, () => {
    foodForm.elements.date.value = keyForDate(nutritionDate);
  });
  foodForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!foodForm.reportValidity()) return;
    const name = foodForm.elements.foodName.value.trim();
    if (!name) {
      foodForm.elements.foodName.value = "";
      foodForm.reportValidity();
      return;
    }
    const entry = { id: crypto.randomUUID(), date: foodForm.elements.date.value, name, meal: foodForm.elements.meal.value };
    for (const field of ["calories", "protein", "carbs", "fat"]) entry[field] = foodForm.elements[field].valueAsNumber;
    if (commit((next) => next.foods.push(entry), foodForm.querySelector(".form-status"))) {
      if (entry.date !== keyForDate(nutritionDate)) {
        nutritionDate = new Date(entry.date + "T12:00:00");
        renderNutrition();
      }
      document.querySelector("#food-dialog").close();
    }
  });

  openForm("#cardio-open", "#cardio-dialog", cardioForm, () => {
    cardioForm.elements.date.value = keyForDate(cardioDate);
    cardioForm.elements.date.max = today();
  });
  cardioForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!cardioForm.reportValidity()) return;
    const entry = {
      id: crypto.randomUUID(), name: cardioForm.elements.activity.value, date: cardioForm.elements.date.value,
      minutes: cardioForm.elements.minutes.valueAsNumber, distance: cardioForm.elements.distance.valueAsNumber,
    };
    if (saveCardio(entry, cardioForm.querySelector(".form-status"))) document.querySelector("#cardio-dialog").close();
  });

  function saveCardio(entry, status) {
    if (!storageKey) { status.textContent = "Zum Speichern bitte anmelden."; return false; }
    const saved = commit((next) => {
      if (!next.cardio.some(({ id }) => id === entry.id)) next.cardio.push(entry);
    }, status);
    if (saved && entry.date !== keyForDate(cardioDate)) {
      cardioDate = new Date(entry.date + "T12:00:00");
      renderCardio();
    }
    return saved;
  }
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
    recordCardio: saveCardio,
    getWeightDates: () => Object.keys(data.weights),
    getSocialEntries: () => ({
      nutrition: data.foods.map(({ date, meal }) => ({ id: `${date}:${mealNames.indexOf(meal)}`, date, value: 1 })),
      cardio: data.cardio.map(({ id, date, minutes }) => ({ id, date, value: minutes })),
    }),
    setAccount(id) {
      storageKey = id ? "fitness-app.daily.v1." + id : null;
      data = read();
      mobilityTimer = null;
      nutritionDate = new Date();
      cardioDate = new Date();
      nutritionStatus.textContent = "";
      cardioStatus.textContent = "";
      render();
    },
  };
})();
