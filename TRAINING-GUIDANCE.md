# Persönliche Trainingsvorschläge

Die Berechnung liegt vollständig in `training-guidance.js`. Sie ist deterministisch und arbeitet ohne externe KI. `config`, `ranges` und `muscleGroups` enthalten die Produktregeln. Die Regeln sind keine individuelle Trainingsdiagnostik, medizinisch validierte Muskelkater-Grenzen oder Belastungsfreigabe.

## Datenbasis und Gewichtsangabe

- Nur tatsächlich abgehakte Arbeitssätze derselben Übungs-ID, Gewichtsart, Gewichts-Konvention und Gerätekennung werden verwendet. Der Aufwärmsatz-Schalter schließt einen Satz von Vorschlägen und Trends aus. Im allgemeinen Trainingsprotokoll bleibt er als tatsächlich absolvierter Satz erhalten.
- Kurzhantel: kg pro Hantel; Langhantel: Gesamtgewicht inklusive Stange; Maschine/Kabelzug/Multipresse: kg laut Anzeige. Für die letzten drei ist eine eigene Gerätekennung nötig. Die App kann nicht erkennen, ob zwei physische Geräte tatsächlich identisch sind; deshalb muss der Nutzer die Kennung passend vergeben.
- Unterstützung ist Gegenlast: mehr Unterstützung ist leichter. Körpergewicht und Zusatzlast werden getrennt behandelt. Ohne Körpergewicht wird eine neue externe Last für einen anderen Wiederholungsbereich nicht aus Zusatzlast oder Unterstützung hochgerechnet.
- Bei eigenen Übungen ohne Katalog-ID verwendet die App den exakten normalisierten Namen zusammen mit Equipment, Gewichtsart und Gerätekennung. Ältere Einträge ohne Einheitenkennung erhalten einen Unsicherheitshinweis.
- Unvollständige/ungültige Werte, zukünftige Einträge und Einträge älter als 90 Tage sind ausgeschlossen. Zahlen müssen endlich sein; Gewicht 0–2000 kg, Wiederholungen 1–30. Bei externem Gewicht ist 0 kg kein Last-Referenzsatz. Für Umrechnungen oberhalb von 20 Referenz-Wiederholungen wird keine Last abgeleitet.
- Bewusst reduzierte Übungen und Sätze mit dokumentierter Tagesanpassung dienen nicht als Leistungsreferenz. Beim Abhaken wird der damalige Kontext je Satz eingefroren. Spätere Bereichs- oder Geräteänderungen benennen bereits erledigte Sätze nicht rückwirkend um.

## Basisvorschlag

Unter **Gewichtsangabe und Gerät einstellen** lassen sich Minimum, Maximum und Schrittweite der verfügbaren Stufen speichern. Das Maximum muss zum Raster ab dem Minimum passen. Die Stufen und Krafttests liegen im Trainingsspeicher des Kontos in diesem Browser. Die Gerätekennung ordnet sie beim nächsten Training wieder zu.

Wenn vergleichbare Arbeitssätze fehlen, dient ein Krafttest mit 10–20 Wiederholungen als Startwert. Bei 25 kg × 15 ergibt die Schätzung für 8–12 Wiederholungen und 5-kg-Stufen einen Vorschlag von 30 kg × etwa 8. Für diese Erstkalibrierung gilt die normale Steigerungsgrenze von 10 % erst bei späterer Progression. Unter **Gespeicherte Trainings** stehen Krafttests in einem eigenen Abschnitt. Sobald vergleichbare Arbeitssätze vorliegen, liefern sie die Basis für weitere Vorschläge.

**Übung zurücksetzen** entfernt nach Bestätigung die Satzdaten und Krafttests der ausgewählten Variante. Die App berechnet die betroffenen Trainingssummen neu und behält den Plan, die Gerätestufen und die Daten anderer Übungen.

Bei Bereichswechsel wird der Epley-ähnliche Index `Gewicht × (1 + Wiederholungen / 30)` als einfache Näherung verwendet. Der Index wird auf die gewählte Zielwiederholungszahl zurückgerechnet. Er ist ausdrücklich keine Messung des 1RM und setzt ohne Anstrengungsangabe keine gesicherte Ausbelastung voraus.

Die Auswahl bietet 5–8, 8–12 und 12–20 Wiederholungen. Beim Wechsel werden zunächst 6, 10 beziehungsweise 15 Zielwiederholungen vorgeschlagen; diese kann der Nutzer innerhalb des Bereichs ändern. Bestehende Pläne ohne Bereich werden aus ihrer Zielvorgabe zugeordnet. Hohe Wiederholungszahlen erhalten einen zusätzlichen Unsicherheitshinweis.

Beispiel bei einer Referenz von 50 kg × 9 und Gewichtsschritten von 2,5 kg:

- Ziel 6 im Bereich 5–8: ungefähr 54,17 kg vor Rundung, Vorschlag 52,5 kg × 6.
- Ziel 15 im Bereich 12–20: ungefähr 43,33 kg vor Rundung, Vorschlag 42,5 kg × 15.

Steigerungen werden auf höchstens 10 % gegenüber der Referenz begrenzt. Externe Last wird auf verfügbare Gewichtsschritte abgerundet; Unterstützung wird entsprechend nach oben gerundet. Wenn eine höhere Stufe nicht sinnvoll erreichbar ist, bleibt die bekannte bisherige Last bestehen. Ein unerklärter Sprung des Leistungsindex über Faktor 1,5 beziehungsweise unter dessen Kehrwert führt zu einem Hinweis und keinem numerischen Lastvorschlag.

## Doppelte Progression und Trend

Innerhalb desselben Bereichs wird zunächst eine weitere Wiederholung bis zur Obergrenze vorgeschlagen. Erst nach zwei vollständigen vergleichbaren Einheiten, in denen alle Arbeitssätze bei derselben Last die Obergrenze erreichen, folgt ein kleiner Gewichtsschritt; danach beginnt der Vorschlag an der unteren Bereichsgrenze. Ein Schritt über 10 % wird nicht vorgeschlagen. Wird die Untergrenze zweimal verfehlt, folgt ein leichterer Lastvorschlag. Eine einzelne schwächere Einheit führt nicht automatisch zu einer Lastsenkung.

Für den Trend sind mindestens drei vollständige Einheiten desselben Wiederholungsbereichs und derselben Anzahl Arbeitssätze aus den letzten 42 Tagen nötig. Pro Einheit wird der Median der Satz-Indizes verwendet. Zwei aufeinanderfolgende Veränderungen über 3 % ergeben „Leistung steigt“ beziehungsweise „Zuletzt niedrigere Leistung“, sonst „Weitgehend stabil“. Bereichswechsel und unterschiedliche Satzmengen werden nicht miteinander vermischt. Bei Körpergewicht, Zusatzlast und Unterstützung wird ein Wiederholungstrend nur bei gleichbleibender Last verglichen. Die App behauptet damit keine gesicherte Veränderung der tatsächlichen Maximalkraft.

## Muskelkater und Beschwerden

Ein neuer Trainingsstart verlangt den Check-in. Alle Muskelgruppen einer neuen Bewertung sind mit 0 vorbelegt. Bei „Ja“ lassen sich betroffene Gruppen per Slider auf 0–10 einstellen; Zahlenwert und Skalenenden bleiben sichtbar. Die Oberfläche gliedert die Gruppen anatomisch in Oberkörper, Körpermitte sowie Beine und Hüfte. „Nein“ verwendet für alle Gruppen 0, die Rücksetz-Aktion setzt alle Regler auf 0. Beim Bearbeiten einer bestehenden Bewertung werden ihre gespeicherten Werte angezeigt. Schmerzen/Gelenkbeschwerden/Schwellung werden separat abgefragt, einschließlich betroffener Bereiche. Zeitstempel und Angaben beschreiben den tatsächlichen Zustand beim Check-in, auch bei nachgeholten Einheiten.

Übungen werden auf gemeinsame Muskelgruppen abgebildet. Primärmuskeln zählen vollständig, unterstützende Muskeln mit Faktor 0,65. Überlappungen werden dedupliziert; es gilt das Maximum statt einer Multiplikation der Abschläge. Die folgenden Schwellen sind veränderbare Produktheuristiken:

- Geringe Beteiligung unter effektivem Score 4: keine automatische Steigerung gegenüber der letzten Referenz.
- Effektiver Score 4 bis unter 7: 10 % weniger externe Tageslast gegenüber dem kleineren Wert aus Basisvorschlag und Referenz, zusätzlich ein niedrigeres Wiederholungsziel. Bei Unterstützung wird eine Stufe mehr Gegenlast vorgeschlagen. Bewusst leichtes Training verwendet ebenfalls diese Tageslogik.
- Primärscore ab 7 oder sekundärer Rohwert ab 8: Pause, Auslassen oder eine nicht betroffene Alternative; kein numerischer Tagesvorschlag.
- Ungewöhnliche Beschwerden in beteiligten Bereichen: Pause und gegebenenfalls fachliche Abklärung; keine Umdeutung zu gewöhnlichem Muskelkater.

Die Tagesanpassung wird **nach** der normalen Berechnung angewendet. Danach gibt es keine inverse Lastumrechnung, zusätzlichen Sätze oder Wiederholungserhöhung als Ausgleich. Das Tagesziel kann deshalb unter dem langfristig gewählten Wiederholungsbereich liegen. Nicht beteiligte Muskelgruppen verändern den Vorschlag nicht. Beim Austausch wird die Zuordnung neu berechnet.

## Speicherung und Übernahme

Vorschläge stehen in `exercise.guidance`; akzeptierte Vorschläge und der damalige Satzkontext werden getrennt von Zielvorgaben gespeichert. Ein Vorschlag ist kein absolvierter Satz. Übernehmen füllt nur unbearbeitete Arbeitssätze. Manuell eingegebene oder abgehakte Werte werden bei Neuberechnung nicht überschrieben. Bereits akzeptierte, aber weiterhin unbearbeitete Felder werden bei verändertem Tageszustand aktualisiert oder bei fehlendem Tagesvorschlag geleert.

`repRange`, `weightStep`, `loadMode` und `equipmentKey` können über die bestehende ausdrückliche Abschlussentscheidung in den ursprünglichen Kontoplan übernommen werden. Check-in, Tagesabschläge, bewusste Reduktion, Vorschläge, Satzmarkierungen und tatsächlich absolvierte Werte werden nicht zu neuen Planvorgaben. Die Plan-Normalisierung im Browser und Server erhält die optionalen Felder; alte Pläne bleiben lesbar.

Laufende Einheiten und Trainingshistorie bleiben kontogetrennt im jeweiligen Browser. Kontopläne liegen weiterhin in der bestehenden serverseitigen Speicherung. Ohne Trainingshistorie im aktuellen Browser werden keine Daten anderer Konten oder Geräte vorgetäuscht.

## Prüfung und Hintergrund

`node --test` prüft Regeln, Zustand und bestehende Funktionen. Die Browserprüfung verwendet den echten lokalen App-Server mit simulierten Supabase-Konten und prüft unter anderem Check-in-Validierung, Bereichswechsel, Erhalt manueller Eingaben, Aufwärmsätze, Schmerzen, Austausch, Fortsetzen, Kontowechsel und Planübernahme bei 320/390/1440 px.

Hintergrundliteratur zu allgemeinen Prinzipien, nicht als Validierung unserer Produkt-Schwellen:

- [ACSM: Progression models in resistance training for healthy adults](https://pubmed.ncbi.nlm.nih.gov/19204579/)
- [Maximal Number of Repetitions at Percentages of the One Repetition Maximum](https://pmc.ncbi.nlm.nih.gov/articles/PMC10933212/)
- [Military Health System: No Pain, No Gain workout myths](https://www.health.mil/MHSHome/News/Dvids-Articles/2024/09/19/news480476)
