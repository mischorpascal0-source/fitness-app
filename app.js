const sampleData = {
  steps: { value: 6420, goal: 8000 },
  calorieIntake: { value: 1480, goal: 2200 },
  weeklyPlan: {
    1: { name: "Unterkörper", category: "krafttraining", minutes: 50 },
    2: { name: "Oberkörper", category: "krafttraining", minutes: 45 },
    4: { name: "Grundlagenausdauer", category: "cardio", minutes: 35 },
    6: { name: "Ganzkörper", category: "krafttraining", minutes: 45 },
  },
};

const number = new Intl.NumberFormat("de-DE");
const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "full" });
const date = document.querySelector("#today");
const appShell = document.querySelector("#main");
const heading = document.querySelector("#page-title");
const home = document.querySelector("#home-view");
const category = document.querySelector("#category");
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
  const training = sampleData.weeklyPlan[now.getDay()];
  const container = document.querySelector("#training-card");
  if (!training) {
    container.replaceChildren(document.querySelector("#rest-template").content.cloneNode(true));
    return;
  }

  const card = document.querySelector("#training-template").content.firstElementChild.cloneNode(true);
  const destination = links.find((link) => link.hash === "#" + training.category);
  card.href = destination.hash;
  card.querySelector("h3").textContent = training.name;
  card.querySelector("p").textContent = `${destination.dataset.title} · ${training.minutes} Min.`;
  card.querySelector(".icon-tile use").setAttribute("href", training.category === "cardio" ? "#icon-cardio" : "#icon-strength");
  container.replaceChildren(card);
}

function renderRoute(focusHeading = false) {
  if (appShell.hidden) return;
  const isPlanner = location.hash === "#trainingsplan";
  const navHash = isPlanner ? "#krafttraining" : location.hash;
  const active = links.find((link) => link.hash === navHash) ?? links[0];
  const isHome = active === links[0];
  const isStrength = active.hash === "#krafttraining";
  const showLibrary = isStrength && !isPlanner;
  if (!showLibrary && exerciseDetail.open) exerciseDetail.close();
  if (!isPlanner) trainingPlanner.closeDialogs();
  home.hidden = !isHome;
  date.hidden = !isHome;
  library.hidden = !showLibrary;
  planner.hidden = !isPlanner;
  category.hidden = isHome || isStrength;
  if (!category.hidden) {
    category.querySelector("use").setAttribute("href", active.querySelector("use").getAttribute("href"));
  }
  heading.textContent = isPlanner ? "Trainingsplan" : active.dataset.title;
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
window.addEventListener("hashchange", () => renderRoute(true));
window.addEventListener("focus", renderToday);
window.setInterval(renderToday, 60_000);
