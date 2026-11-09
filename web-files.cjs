const scripts = [
  "cardio-suggestions.js", "cardio-session.js", "cardio-recovery.js", "cardio-garmin.js",
  "app.js", "social.js", "food-code.js", "food-catalog.js", "exercises.js", "exercise-scenes.js", "exercise-illustrations.js", "catalog-search.js",
  "exercise-library.js", "plan-data.js", "plan-generator.js", "action-dialog.js", "training-planner.js", "training-guidance.js", "workout-state.js", "week-calendar.js", "strength-dashboard.js", "daily-tracking.js", "account-plans.js",
];

module.exports = [
  ["index.html", "text/html"],
  ["styles.css", "text/css"],
  ["cardio-garmin.css", "text/css"],
  ["zxing-browser-0.2.1.min.js", "text/javascript"],
  ...scripts.map((name) => [name, "text/javascript"]),
];
