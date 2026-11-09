const weekCalendar = (() => {
  const monthFormat = new Intl.DateTimeFormat("de-DE", { month: "short", year: "numeric" });
  const dateFormat = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric" });
  const fullDate = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function dateKey(date) {
    const year = String(date.getFullYear()).padStart(4, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function shift(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function daysFor(date) {
    const weekday = (date.getDay() + 6) % 7;
    return trainingPlanData.weekdays.map((_, index) => shift(date, index - weekday));
  }

  function create(panel, onSelect, completedLabel = "Training abgeschlossen") {
    const grid = panel.querySelector(".week-calendar");
    const month = panel.querySelector(".calendar-month");
    const current = panel.querySelector("[data-calendar-selected]");
    const picker = panel.querySelector("input[type=date]");
    let selectedDate;

    for (const [action, offset] of [["prev", -7], ["next", 7]]) {
      panel.querySelector(`[data-calendar-${action}]`).addEventListener("click", () => onSelect(shift(selectedDate, offset)));
    }
    panel.querySelector("[data-calendar-today]").addEventListener("click", () => onSelect(new Date()));
    picker?.addEventListener("change", () => {
      if (picker.value && picker.validity.valid) onSelect(new Date(picker.value + "T12:00:00"));
      else picker.value = dateKey(selectedDate);
    });

    return {
      render(date, completed, planned) {
        selectedDate = date;
        const selectedKey = dateKey(date);
        const today = dateKey(new Date());
        const focusedDay = grid.contains(document.activeElement) ? document.activeElement.dataset.date : undefined;
        month.textContent = monthFormat.format(date);
        current.textContent = dateFormat.format(date);
        if (picker) picker.value = selectedKey;
        grid.replaceChildren(...daysFor(date).map((day, index) => {
          const key = dateKey(day);
          const isCompleted = completed.has(key);
          const isPlanned = planned?.has(index);
          const button = document.createElement("button");
          button.type = "button";
          button.className = "calendar-day";
          button.dataset.date = key;
          button.classList.toggle("is-today", key === today);
          button.classList.toggle("is-planned", Boolean(isPlanned));
          button.classList.toggle("is-completed", isCompleted);
          button.setAttribute("aria-pressed", String(key === selectedKey));
          if (key === today) button.setAttribute("aria-current", "date");
          button.setAttribute("aria-label", fullDate.format(day) + (isPlanned ? ", Training geplant" : "") + (isCompleted ? ", " + completedLabel : ""));
          const name = document.createElement("small");
          name.textContent = trainingPlanData.weekdays[index].slice(0, 2);
          const number = document.createElement("strong");
          number.textContent = isCompleted && key !== selectedKey ? "✓" : day.getDate();
          const dot = document.createElement("span");
          dot.className = "calendar-dot";
          button.append(name, number, dot);
          button.addEventListener("click", () => onSelect(day));
          return button;
        }));
        if (focusedDay) [...grid.children].find((button) => button.dataset.date === focusedDay)?.focus({ preventScroll: true });
      },
    };
  }

  return { create, dateKey, daysFor };
})();
