const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "full" });
const date = document.querySelector("#today");
const appShell = document.querySelector("#main");
const heading = document.querySelector("#page-title");
const home = document.querySelector("#home-view");
const cardio = document.querySelector("#cardio-view");
const nutrition = document.querySelector("#nutrition-view");
const mobility = document.querySelector("#mobility-view");
const strength = document.querySelector("#strength-dashboard");
const library = document.querySelector("#exercise-library");
const planner = document.querySelector("#training-planner");
const statistics = document.querySelector("#statistics-view");
const exerciseDetail = document.querySelector("#exercise-detail");
const links = [...document.querySelectorAll(".bottom-nav a")];
const accountDialog = document.querySelector("#account-dialog");
accountDialog.append(document.querySelector("#plan-account"));
document.querySelector("#profile-open").addEventListener("click", () => accountDialog.showModal());
document.querySelector("#calories").addEventListener("click", () => { location.hash = "#ernaehrung"; });

function localDateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function renderHomeOverview() {
  const now = new Date();
  const weekday = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday);
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday + 6);
  const from = localDateKey(monday);
  const to = localDateKey(sunday);
  const trainingDates = strengthDashboard.getTrainingDates();
  const weightDates = dailyTracking.getWeightDates();
  const completed = trainingDates.filter((day) => day >= from && day <= to).length;
  const plan = trainingPlanner.getPlan();
  const plannedDays = new Set(plan?.sessions.filter((session) => session.weekday !== undefined).map(({ weekday }) => weekday));
  const goal = plannedDays.size || Math.min(7, plan?.sessions.length ?? 0);
  const shortDate = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" });
  document.querySelector("#home-week-start").textContent = shortDate.format(monday);
  document.querySelector("#home-week-end").textContent = shortDate.format(sunday);
  document.querySelector("#home-week-caption").textContent = goal ? `${completed} von ${goal} Trainings` : "Starte mit deinem Trainingsplan";
  const progress = document.querySelector("#home-week-progress");
  progress.max = Math.max(1, goal);
  progress.value = completed;
  document.querySelector("#home-training-goal").textContent = `${completed}/${goal || "–"}`;
  document.querySelector("#home-weighins").textContent = `${weightDates.filter((day) => day >= from && day <= to).length}/7`;
  for (const [selector, dates] of [["#home-training-heatmap", trainingDates], ["#home-weight-heatmap", weightDates]]) {
    const entries = new Set(dates);
    document.querySelector(selector).replaceChildren(...Array.from({ length: 30 }, (_, index) => {
      const day = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + index));
      const cell = document.createElement("span");
      cell.classList.toggle("is-recorded", entries.has(day));
      return cell;
    }));
  }
  const days = new Set(trainingDates);
  const cursor = new Date(now);
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  document.querySelector("#app-streak-count").textContent = streak;
  document.querySelector("#app-streak").title = `${streak} Trainingstage in Folge`;
}

const statsTabs = [...document.querySelectorAll("[data-stat]")];
function selectStatisticsTab(tab, focus = false) {
  for (const button of statsTabs) {
    const active = button === tab;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    document.getElementById(button.getAttribute("aria-controls")).hidden = !active;
  }
  if (focus) tab.focus();
}
for (const [index, tab] of statsTabs.entries()) {
  tab.addEventListener("click", () => selectStatisticsTab(tab));
  tab.addEventListener("keydown", (event) => {
    const offset = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (offset === undefined && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const target = event.key === "Home" ? 0 : event.key === "End" ? statsTabs.length - 1 : (index + offset + statsTabs.length) % statsTabs.length;
    selectStatisticsTab(statsTabs[target], true);
  });
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
  dailyTracking.render();
  renderHomeOverview();
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
  const showCardio = location.hash === "#cardio";
  const showMobility = location.hash === "#mobility";
  const navHash = isPlanner || showLibrary || showMobility ? "#krafttraining" : location.hash;
  const active = links.find((link) => link.hash === navHash) ?? links[0];
  const isHome = active === links[0];
  const isStrength = active.hash === "#krafttraining";
  const showStrength = isStrength && !isPlanner && !showLibrary && !showCardio && !showMobility;
  if (!showLibrary && exerciseDetail.open) exerciseDetail.close();
  if (!isPlanner) trainingPlanner.closeDialogs();
  if (!showStrength) strengthDashboard.close();
  home.hidden = !isHome;
  if (isHome) renderScheduledTraining();
  date.hidden = !isHome;
  library.hidden = !showLibrary;
  strength.hidden = !showStrength;
  statistics.hidden = active.hash !== "#statistiken";
  document.querySelector("#training-state").hidden = !showStrength;
  if (showStrength || !statistics.hidden) strengthDashboard.render();
  planner.hidden = !isPlanner;
  cardio.hidden = !showCardio;
  nutrition.hidden = active.hash !== "#ernaehrung";
  mobility.hidden = !showMobility;
  dailyTracking.render();
  heading.textContent = isPlanner ? "Trainingsplan" : showLibrary ? "Übungsbibliothek" : showCardio ? "Cardio" : showMobility ? "Mobility" : active.dataset.title;
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

renderToday();
renderRoute();
document.addEventListener("fitness:planchange", () => { if (!home.hidden) renderScheduledTraining(); });
for (const eventName of ["fitness:planchange", "fitness:workoutchange", "fitness:dailychange"]) {
  document.addEventListener(eventName, renderHomeOverview);
}
window.addEventListener("hashchange", () => renderRoute(true));
window.addEventListener("focus", renderToday);
window.setInterval(renderToday, 60_000);
