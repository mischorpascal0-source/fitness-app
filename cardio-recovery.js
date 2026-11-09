/* App estimate based on Garmin wellness data; not Garmin Training Status. */
(function (root) {
  function recommendation(health, minutes = 30, now = Date.now()) {
    const timestamp = Date.parse(health?.measuredAt);
    const value = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
    const fresh = Number.isFinite(timestamp) && now - timestamp >= -300000 && now - timestamp <= 6 * 3600000;
    const base = { minutes, level: 'unknown', title: 'Keine aktuelle Erholungseinschätzung', reason: 'Garmin synchronisieren und aktuelle Uhrdaten laden. Ohne aktuelle Werte wird die Einheit nicht automatisch angepasst.', intensity: 'Locker, im Gesprächstempo', adjusted: false };
    if (!fresh || (!value(health?.bodyBattery) && !value(health?.stress))) return base;
    const battery = value(health.bodyBattery) ? health.bodyBattery : null;
    const stress = value(health.stress) ? health.stress : null;
    const high = (battery !== null && battery <= 25) || (stress !== null && stress >= 75);
    const moderate = (battery !== null && battery <= 50) || (stress !== null && stress >= 50);
    if (high) return { ...base, level: 'high', title: 'Erholung priorisieren', minutes: Math.max(5, Math.round(minutes * .5)), intensity: 'Sehr locker gehen oder pausieren · keine Intervalle', reason: 'Niedrige Body Battery oder hoher Tagesstress: Dauer halbiert und Intensität reduziert.', adjusted: true };
    if (moderate) return { ...base, level: 'moderate', title: 'Heute etwas lockerer', minutes: Math.max(5, Math.round(minutes * .75)), intensity: 'Locker gehen oder joggen · keine Intervalle', reason: 'Reduzierte Energiereserve oder erhöhter Tagesstress: Dauer um etwa 25 % reduziert.', adjusted: true };
    return { ...base, level: 'normal', title: 'Keine Reduktion erforderlich', reason: 'Die verfügbaren Garmin-Werte lösen keine Reduktion aus. Die geplante lockere Einheit bleibt bestehen.' };
  }
  if (typeof module === 'object' && module.exports) module.exports = recommendation;
  else root.cardioRecommendation = recommendation;
})(globalThis);
