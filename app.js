const sampleData = {
  steps: { value: 6420, goal: 8000 },
  calorieIntake: { value: 1480, goal: 2200 },
};

const number = new Intl.NumberFormat("de-DE");
const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "full" });
const date = document.querySelector("#today");
const appShell = document.querySelector("#main");
const heading = document.querySelector("#page-title");
const home = document.querySelector("#home-view");
const category = document.querySelector("#category");
const strength = document.querySelector("#strength-dashboard");
const library = document.querySelector("#exercise-library");
const planner = document.querySelector("#training-planner");
const exerciseDetail = document.querySelector("#exercise-detail");
const links = [...document.querySelectorAll(".bottom-nav a")];

function renderMetric(id, metric, unit, goalText) {
  const card = document.getElementById(id);
  card.querySelector(".value").textContent = number.format(metric.value) + unit;
  card.querySelector(".goal").textContent = goalText + number.format(metric.goal) + unit;
  const progress = card.querySelector("progress");
  progress.max = metric.goal;
  progress.value = metric.value;
}

function renderToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateKey = `${now.getFullYear()}-${month}-${day}`;
  if (date.dateTime === dateKey) return;

  date.dateTime = dateKey;
  date.textContent = dateFormat.format(now);
  strengthDashboard.render();
  renderScheduledTraining(now);
}

function renderScheduledTraining(now = new Date()) {
  const weekday = (now.getDay() + 6) % 7;
  const sessions = trainingPlanner.getPlan()?.sessions.filter((session) => session.weekday === weekday) ?? [];
  const container = document.querySelector("#training-card");
  if (!sessions.length) {
    container.replaceChildren(document.querySelector("#rest-template").content.cloneNode(true));
    return;
  }

  const card = document.querySelector("#training-template").content.firstElementChild.cloneNode(true);
  card.href = "#krafttraining";
  card.querySelector("h3").textContent = sessions.map(({ name }) => name).join(" · ");
  card.querySelector("p").textContent = "Zum Krafttraining";
  container.replaceChildren(card);
}

function renderRoute(focusHeading = false) {
  if (appShell.hidden) return;
  const isPlanner = location.hash === "#trainingsplan";
  const showLibrary = location.hash === "#uebungen";
  const navHash = isPlanner || showLibrary ? "#krafttraining" : location.hash;
  const active = links.find((link) => link.hash === navHash) ?? links[0];
  const isHome = active === links[0];
  const isStrength = active.hash === "#krafttraining";
  const showStrength = isStrength && !isPlanner && !showLibrary;
  if (!showLibrary && exerciseDetail.open) exerciseDetail.close();
  if (!isPlanner) trainingPlanner.closeDialogs();
  if (!showStrength) strengthDashboard.close();
  home.hidden = !isHome;
  if (isHome) renderScheduledTraining();
  date.hidden = !isHome;
  library.hidden = !showLibrary;
  strength.hidden = !showStrength;
  if (showStrength) strengthDashboard.render();
  planner.hidden = !isPlanner;
  category.hidden = isHome || isStrength;
  if (!category.hidden) {
    category.querySelector("use").setAttribute("href", active.querySelector("use").getAttribute("href"));
  }
  heading.textContent = isPlanner ? "Trainingsplan" : showLibrary ? "Übungsbibliothek" : active.dataset.title;
  document.title = `${heading.textContent} · Fitness-App`;
  for (const link of links) {
    if (link === active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  if (focusHeading) {
    heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

renderMetric("steps", sampleData.steps, "", "Ziel ");
renderMetric("calories", sampleData.calorieIntake, " kcal", "Ziel ");
renderToday();
renderRoute();
document.addEventListener("fitness:planchange", () => { if (!home.hidden) renderScheduledTraining(); });
window.addEventListener("hashchange", () => renderRoute(true));
window.addEventListener("focus", renderToday);
window.setInterval(renderToday, 60_000);
