const cardioSession = (() => {
  const find = id => document.getElementById('cardio-' + id);
  const status = find('session-status');
  let accountId = null, sport = null, selected = null, session = null, done = false, completedElapsed = 0, suggestionSignature = null;
  const storageKey = () => 'fitness-app.cardio.session.v1.' + accountId;
  const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  const elapsed = () => session ? session.elapsed + (session.running ? Math.max(0, Date.now() - session.startedAt) : 0) : completedElapsed;
  function persist() {
    if (!accountId) return;
    try { if (session) localStorage.setItem(storageKey(), JSON.stringify(session)); else localStorage.removeItem(storageKey()); }
    catch { status.textContent = 'Der Timer läuft, konnte aber nicht für ein Neuladen gespeichert werden.'; }
  }
  function proposals() { return cardioSuggestions.suggest(sport, cardioGarmin.getSnapshot()); }
  function renderSuggestions() {
    if (!sport || selected) return;
    const result = proposals();
    const signature = JSON.stringify(result);
    if (signature === suggestionSignature) return;
    suggestionSignature = signature;
    find('data-note').textContent = result.note;
    find('suggestions').replaceChildren(...result.suggestions.map(unit => {
      const card = node('article', undefined, 'cardio-suggestion');
      const button = node('button', 'Einheit auswählen', 'plan-button'); button.type = 'button';
      button.addEventListener('click', () => { selected = unit; done = false; status.textContent = ''; render(); find('selected').focus(); });
      const list = node('ol'); unit.steps.forEach(step => list.append(node('li', step)));
      card.append(node('small', unit.source, 'eyebrow'), node('h3', unit.title), node('p', `${unit.rest ? 'Ruhetag' : unit.minutes + ' Min.'} · ${unit.intensity}`), list, node('p', unit.reason, 'planner-note'), button);
      return card;
    }));
  }
  function tick() {
    if (!selected) return;
    const seconds = Math.floor(elapsed() / 1000);
    find('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
    find('phase').textContent = session ? (session.running ? 'Training läuft' : 'Pausiert') + (seconds >= selected.minutes * 60 ? ' · Geplante Dauer erreicht. Du kannst die Einheit beenden.' : '') : done ? 'Abgeschlossen' : 'Bereit, wenn du es bist.';
  }
  function render() {
    const active = Boolean(session);
    find('chooser').hidden = Boolean(selected) || find('start').getAttribute('aria-expanded') !== 'true';
    find('selected').hidden = !selected;
    find('start').hidden = Boolean(selected);
    find('training-start').hidden = !selected || active || done || selected.rest;
    find('training-pause').hidden = !active;
    find('training-end').hidden = !active;
    find('training-back').hidden = active;
    find('training-pause').textContent = session?.running ? 'Pause' : 'Fortsetzen';
    if (selected) {
      find('selected-title').textContent = selected.title;
      find('selected-meta').textContent = `${selected.source} · ${selected.rest ? 'Ruhetag' : selected.minutes + ' Min.'} · ${selected.intensity}`;
      find('selected-steps').replaceChildren(...selected.steps.map(step => node('li', step)));
      find('selected-reason').textContent = selected.reason;
      find('timer').hidden = selected.rest;
      find('training-back').textContent = done ? 'Neue Einheit' : 'Andere Einheit';
      if (selected.rest) find('phase').textContent = 'Heute ist kein Training nötig. Ein Ruhetag wird nicht als absolvierte Aktivität gespeichert.';
      else tick();
    } else renderSuggestions();
  }
  for (const [key, name] of Object.entries(cardioSuggestions.sports)) {
    const button = node('button', name, 'plan-button'); button.type = 'button'; button.dataset.sport = key; button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      sport = key;
      for (const other of find('sports').children) other.setAttribute('aria-pressed', String(other === button));
      renderSuggestions();
    }); find('sports').append(button);
  }
  find('start').addEventListener('click', () => { find('start').setAttribute('aria-expanded', 'true'); render(); find('sports').querySelector('button').focus(); });
  find('training-back').addEventListener('click', () => { selected = null; done = false; completedElapsed = 0; status.textContent = ''; render(); find('sports').querySelector('button').focus(); });
  find('training-start').addEventListener('click', () => {
    if (!selected || session || done || !accountId) return;
    // Re-check freshness and newly synchronized data before starting a selected unit.
    const updated = proposals().suggestions.find(unit => unit.id === selected.id);
    if (!updated || JSON.stringify(updated) !== JSON.stringify(selected)) {
      selected = null; render(); status.textContent = 'Die Datengrundlage hat sich geändert. Bitte wähle eine aktuelle Einheit.'; return;
    }
    session = { id: crypto.randomUUID(), unit: selected, sport, date: new Date().toLocaleDateString('sv-SE'), elapsed: 0, startedAt: Date.now(), running: true };
    persist(); render();
  });
  find('training-pause').addEventListener('click', () => {
    if (!session) return;
    session.elapsed = elapsed(); session.startedAt = Date.now(); session.running = !session.running;
    persist(); render();
  });
  find('training-end').addEventListener('click', () => {
    if (!session) return;
    session.elapsed = elapsed(); session.running = false; persist();
    const minutes = Math.round(session.elapsed / 60000 * 10) / 10;
    if (minutes < .1) { status.textContent = 'Einheit beendet. Unter 6 Sekunden aktive Zeit: kein Tagebucheintrag.'; }
    else if (!dailyTracking.recordCardio({ id: session.id, name: cardioSuggestions.sports[session.sport] + ' · ' + selected.title, date: session.date, minutes, distance: 0, source: 'app-timer' }, status)) { render(); return; }
    else status.textContent = `${minutes.toLocaleString('de-DE')} aktive Minuten im Tagebuch gespeichert. Keine Distanz gemessen.`;
    completedElapsed = session.elapsed; session = null; done = true; persist(); render();
  });
  document.addEventListener('fitness:garminchange', () => { if (!selected) renderSuggestions(); });
  window.addEventListener('focus', () => { renderSuggestions(); tick(); });
  window.setInterval(() => { tick(); if (!selected) renderSuggestions(); }, 1000);
  return {
    setAccount(id) {
      accountId = id ?? null; completedElapsed = 0; suggestionSignature = null; session = null; selected = null; sport = null; done = false; status.textContent = '';
      find('start').setAttribute('aria-expanded','false');
      for (const button of find('sports').children) button.setAttribute('aria-pressed','false');
      if (accountId) {
        try {
          const cached = JSON.parse(localStorage.getItem(storageKey()));
          if (cached && typeof cached.id === 'string' && cardioSuggestions.sports[cached.sport] && cached.unit?.sport === cached.sport && !cached.unit.rest && typeof cached.unit.title === 'string' && Array.isArray(cached.unit.steps) && cached.unit.steps.every(s => typeof s === 'string') && Number.isFinite(cached.unit.minutes) && cached.unit.minutes > 0 && Number.isFinite(cached.elapsed) && cached.elapsed >= 0 && typeof cached.running === 'boolean' && Number.isFinite(cached.startedAt) && cached.startedAt <= Date.now() && /^\d{4}-\d{2}-\d{2}$/.test(cached.date)) {
            session = cached; selected = cached.unit; sport = cached.sport;
            find('start').setAttribute('aria-expanded','true'); status.textContent = 'Deine begonnene Einheit wurde wiederhergestellt.';
          }
        } catch { status.textContent = 'Die letzte Einheit konnte nicht wiederhergestellt werden.'; }
      }
      render();
    },
  };
})();
