/* Local recommendations. Only the existing Garmin import is used. */
(function (root) {
  const sports = { running: 'Laufen', cycling: 'Radfahren', hiit: 'HIIT', other: 'Sonstiges' };
  function suggest(sport, snapshot = {}, now = Date.now()) {
    if (!sports[sport]) throw new Error('Unbekannte Sportart');
    const valid = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
    const health = snapshot.health;
    const age = now - Date.parse(health?.measuredAt);
    const fresh = Number.isFinite(age) && age >= -300000 && age <= 21600000;
    const battery = fresh && valid(health?.bodyBattery) ? health.bodyBattery : null;
    const stress = fresh && valid(health?.stress) ? health.stress : null;
    const runs = (snapshot.runs ?? []).filter(r => {
      const age = now - Date.parse(r.start);
      return age >= 0 && age < 28 * 86400000 && typeof r.duration === 'number' && Number.isFinite(r.duration) && r.duration > 0;
    });
    const sameSport = sport === 'running' ? runs : [];
    const durations = sameSport.map(r => r.duration / 60).sort((a,b) => a-b);
    const recentLoad = runs.some(r => now - Date.parse(r.start) < 86400000 && r.duration >= 3600);
    const high = (battery !== null && battery <= 25) || (stress !== null && stress >= 75);
    const reduced = high || recentLoad || (battery !== null && battery <= 50) || (stress !== null && stress >= 50);
    const personalized = battery !== null || stress !== null || sameSport.length > 0 || recentLoad;
    let base = 20;
    if (sport === 'running' && durations.length >= 3) base = Math.min(45, Math.max(15, Math.round(durations[Math.floor(durations.length / 2)] * .8 / 5) * 5));
    if (sport === 'cycling') base += 5;
    if (sport === 'hiit') base = 15;
    if (reduced) base = Math.max(10, Math.round(base * (high ? .5 : .75) / 5) * 5);
    const evidence = [];
    if (battery !== null) evidence.push(`Body Battery ${battery}/100`);
    if (stress !== null) evidence.push(`Tagesstress ${stress}/100`);
    if (sameSport.length) evidence.push(`${sameSport.length} Läufe in den letzten 28 Tagen`);
    if (recentLoad) evidence.push('mindestens ein längerer Lauf in den letzten 24 Stunden');
    const reason = evidence.length ? evidence.join(' · ') + (reduced ? '. Heute ist weniger Belastung sinnvoll.' : '. Eine kontrollierte Einheit passt; gute Werte sind keine Freigabe für maximale Intensität.') : 'Ohne verwertbare Garmin-Daten ist dies ein vorsichtiger Einstieg mit leichter Intensität.';
    const source = personalized ? 'Basierend auf deinen Garmin-Daten' : 'Allgemeiner Vorschlag';
    const make = (id, title, minutes, intensity, steps) => ({ id, sport, title, minutes, intensity, steps, reason, source, rest: false });
    const warm = Math.min(5, Math.floor(base / 3));
    const main = base - 2 * warm;
    const easy = sport === 'running' ? ['Lockerer Dauerlauf', 'Gehen, dann locker anlaufen', 'Locker laufen; bei Bedarf Gehpausen', 'Langsam gehen']
      : sport === 'cycling' ? ['Entspannte Radrunde', 'Sehr leicht einrollen', 'Mit leichtem Widerstand und ruhigem Atem fahren', 'Locker ausrollen']
      : sport === 'hiit' ? ['Schonender Bewegungszirkel', 'Locker auf der Stelle gehen und mobilisieren', 'Im Wechsel 30 Sek. leichte Kniebeugen oder Wandliegestütze und 60 Sek. gehen; ohne Sprünge', 'Locker gehen und ausschütteln']
      : ['Leichte Ausdauereinheit', 'Langsam in deine gewählte Bewegung starten', 'Gehen, Crosstrainer oder eine andere gleichmäßige Bewegung', 'Bewegung ruhig ausklingen lassen'];
    const first = make('easy', easy[0], base, high ? 'Sehr leicht · ganze Sätze sprechen können' : 'Leicht · entspannt sprechen können', [`${warm} Min. ${easy[1]}`, `${main} Min. ${easy[2]}`, `${warm} Min. ${easy[3]}`]);
    let second;
    if (high || reduced) second = make('gentle', sport === 'cycling' ? 'Kurzes Ausrollen' : 'Aktive Erholung', 10, 'Sehr leicht', [sport === 'cycling' ? '10 Min. ohne Leistungsdruck auf flacher Strecke rollen; bei Unwohlsein pausieren.' : '10 Min. entspannt gehen, ohne Belastungsspitzen.']);
    else second = make('short', sport === 'running' ? 'Lauf-Geh-Wechsel' : sport === 'cycling' ? 'Kurze lockere Runde' : 'Kompakter Bewegungsblock', 15, 'Leicht · jederzeit reduzieren', [sport === 'running' ? '3 Min. gehen · 3 × (2 Min. locker joggen + 1 Min. gehen) · 3 Min. gehen' : '3 Min. langsam beginnen · 9 Min. gleichmäßig bewegen · 3 Min. ausklingen lassen']);
    return { suggestions: [first, second], restRecommended: high, summary: reason, note: snapshot.busy ? 'Garmin wird geladen. Vorschläge werden danach aktualisiert.' : snapshot.error ? 'Garmin konnte nicht aktualisiert werden. ' + (fresh ? 'Zuletzt geladene Werte werden verwendet.' : 'Keine aktuellen Erholungswerte verfügbar.') : !snapshot.connected ? 'Ohne Garmin-Verbindung. Vorhandene, zeitlich passende Importdaten werden gegebenenfalls berücksichtigt.' : !fresh || (battery === null && stress === null) ? 'Keine aktuellen Erholungswerte: Uhrdaten fehlen oder sind älter als 6 Stunden.' : 'Aktuelle Garmin-Erholungswerte werden berücksichtigt.', evidence };
  }
  if (typeof module === 'object' && module.exports) module.exports = { suggest, sports };
  else root.cardioSuggestions = { suggest, sports };
})(globalThis);
