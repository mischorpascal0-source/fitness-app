const { test } = require('node:test');
const assert = require('node:assert/strict');
const recommend = require('./cardio-recovery.js');
const now = Date.now();
const health = (bodyBattery, stress, age = 0) => ({ bodyBattery, stress, measuredAt: new Date(now - age).toISOString() });
test('low battery and high stress independently reduce duration and remove intensity', () => {
  for (const data of [health(25, 10), health(80, 75), health(0, null)]) {
    const result = recommend(data, 60, now);
    assert.equal(result.minutes, 30);
    assert.equal(result.level, 'high');
    assert.match(result.intensity, /pausieren/);
  }
});
test('moderate fatigue reduces duration; good values never increase planned load', () => {
  assert.equal(recommend(health(50, 10), 60, now).minutes, 45);
  assert.equal(recommend(health(90, 50), 60, now).minutes, 45);
  assert.equal(recommend(health(90, 10), 60, now).minutes, 60);
});
test('missing, stale, future and invalid values do not automatically adjust training', () => {
  for (const data of [null, health(null, null), health(-1, 101), health(10, 90, 7 * 3600000), health(10, 90, -3600000), {bodyBattery: 10}]) {
    const result = recommend(data, 45, now);
    assert.equal(result.adjusted, false);
    assert.equal(result.level, 'unknown');
    assert.equal(result.minutes, 45);
  }
});
