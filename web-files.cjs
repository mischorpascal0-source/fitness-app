const scripts = [
  "app.js", "exercises.js", "exercise-scenes.js", "exercise-illustrations.js", "catalog-search.js",
  "exercise-library.js", "plan-data.js", "plan-generator.js", "training-planner.js", "strength-dashboard.js", "daily-tracking.js", "account-plans.js",
];

module.exports = [
  ["index.html", "text/html"],
  ["styles.css", "text/css"],
  ...scripts.map((name) => [name, "text/javascript"]),
];
