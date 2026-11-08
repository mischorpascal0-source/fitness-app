const scripts = [
  "cardio-garmin.js",
  "app.js", "exercises.js", "exercise-scenes.js", "exercise-illustrations.js", "catalog-search.js",
  "exercise-library.js", "plan-data.js", "plan-generator.js", "training-planner.js", "workout-state.js", "strength-dashboard.js", "daily-tracking.js", "account-plans.js",
];

module.exports = [
  ["index.html", "text/html"],
  ["styles.css", "text/css"],
  ["cardio-garmin.css", "text/css"],
  ...scripts.map((name) => [name, "text/javascript"]),
];
