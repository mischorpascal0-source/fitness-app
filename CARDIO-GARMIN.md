# Garmin im Cardio-Bereich

Diese Erweiterung nutzt ausschließlich die offizielle Garmin Connect Personal API für eigene Laufdaten. Es ist keine Garmin Business App und kein Garmin-Passwort nötig.

1. In Garmin Connect unter https://connect.garmin.com/app/settings/personalApiToken einen Personal API Key erstellen.
2. In der Fitness-App anmelden, **Cardio → Garmin verbinden** öffnen und den Schlüssel eingeben.
3. **Schlüssel speichern & Läufe laden** lädt bis zu 100 letzte Laufaktivitäten einschließlich Lauf-Untertypen und die täglichen Schrittwerte der letzten sieben Tage. Aktualisiere die Daten über **Jetzt synchronisieren** oder über **Garmin synchronisieren** in der Schritte-Kachel auf Home.

Home zeigt den heutigen Garmin-Wert mit Quellenhinweis. Die Schritte-Statistik verwendet je Tag den Garmin-Wert, sofern verfügbar, sonst den manuellen Eintrag. Das persönliche Schrittziel bleibt separat einstellbar. Garmin-Schritte werden wie die Läufe pro Konto im Browser zwischengespeichert. [Garmin Personal API](https://developer.garmin.com/gc-developer-program/personal/swagger-docs/)

Angezeigt werden Distanz, Dauer, Pace, durchschnittliche Herzfrequenz, Höhenmeter und Kalorien, soweit Garmin diese liefert. Zeitraumfilter: 30 Tage, 90 Tage oder alle geladenen Läufe. Die Gesamtpace wird aus Distanz und Dauer der Läufe mit beiden Messwerten berechnet. Garmin-Läufe stehen separat neben den manuellen Cardio-Einträgen und verändern deren Wochenstatistik nicht.

Der API-Schlüssel wird nach erfolgreicher Garmin-Anmeldung mit AES-256-GCM verschlüsselt im App-Konto gespeichert und über die Konto-ID als AAD gebunden. Im Supabase-Modus liegt nur der verschlüsselte Wert in `fitness_garmin_connections`; Row Level Security erlaubt jedem Nutzer ausschließlich den eigenen Datensatz. Der Server verwendet dafür das bestehende Nutzertoken, keinen Service-Role-Schlüssel. JavaScript erhält weder den Schlüssel noch das verschlüsselte Feld oder Garmin-Token zurück.

Nach der Anmeldung ist die Verbindung auf Handy und PC verfügbar. Die App synchronisiert die Garmin-Daten beim Öffnen und wenn sie wieder in den Vordergrund kommt. Die geladenen Aktivitäten bleiben im jeweiligen Browser, getrennt nach Fitness-App-Konto. **Garmin vom Konto trennen** entfernt den Schlüssel für das gesamte Konto und den Laufdaten-Cache des aktuellen Geräts. Eine Abmeldung entfernt die Verbindung nicht. Garmin kann einen Schlüssel weiterhin ablaufen lassen oder widerrufen.

Vorhandene verschlüsselte Browser-Cookies werden beim nächsten Prüfen der Verbindung einmalig in die Kontospeicherung übernommen und anschließend entfernt. Ein leerer Datensatz nach dem Trennen verhindert, dass ein anderes Gerät mit einem alten Cookie die Verbindung wiederherstellt. Versionsprüfungen verhindern, dass gleichzeitig laufende Anfragen eine neuere Änderung überschreiben. Ein abgelehnter Ersatzschlüssel entfernt keinen zuvor gespeicherten, anderen Schlüssel.

Der Endpunkt `/api/garmin` prüft die vorhandene Fitness-App-Sitzung und die Konto-ID. GET liefert ausschließlich den Verbindungsstatus, POST synchronisiert oder trennt die Verbindung. In Vercel wird weiterhin `FITNESS_GARMIN_COOKIE_KEY` als serverseitiges Geheimnis mit 32 zufälligen Bytes in Hexkodierung verwendet. Der vorhandene Wert muss für die Übernahme alter Cookies erhalten bleiben. Ein Wechsel macht vorhandene verschlüsselte Verbindungen unlesbar.

Vor dem Deployment die Migration `supabase/migrations/20261108000100_fitness_garmin_connections.sql` im Supabase-Projekt anwenden. Sie legt ausschließlich die neue Kontotabelle, den Revisionstrigger und die Eigentümerrichtlinien an. Bei manueller Einrichtung im SQL-Editor die Migration beim späteren Wechsel zur Supabase CLI mit `supabase migration repair --status applied 20261108000100 --remote` markieren.

Im lokalen SQLite-Modus wird die Verbindung verschlüsselt in derselben Kontodatenbank gespeichert. Ohne konfigurierten Verschlüsselungsschlüssel wird lokal `.data/garmin-cookie.key` verwendet. Wenn lokale Entwicklung und Vercel dasselbe Supabase-Projekt verwenden, müssen sie denselben `FITNESS_GARMIN_COOKIE_KEY` verwenden, damit beide dieselben Kontoverbindungen entschlüsseln können. Für unabhängige Entwicklungsumgebungen ein eigenes Supabase-Projekt verwenden.

Fehlerbehebung: Garmins Token-Endpunkt antwortet mit JWT-Text, nicht JSON. Daher verwendet die App dort `Accept: */*` und liest Text, wie Garmins offizieller Python-Client. Lauf-, Erholungs- und Schrittwerte werden als JSON gelesen. Upstream-Fehler zeigen Phase und HTTP-Status. Logs enthalten keine Schlüssel, Tokens oder Antwortinhalte.

Die neuen Dateien `cardio-garmin.js`, `cardio-garmin.css` und `cardio-garmin.cjs` kapseln die Erweiterung. Gemeinsame Dateien enthalten nur Einbindung, Konto-Lifecycle, Routing und die Asset-Freigabe. Bei paralleler Arbeit nur diese kleinen Integrationsstellen übernehmen, keine kompletten gemeinsamen Dateien ersetzen.

Offizielle Referenzen:
- https://developer.garmin.com/gc-developer-program/personal/personal-faq
- https://developer.garmin.com/gc-developer-program/personal/swagger-docs/
- https://github.com/garmin/connect-personal-api-python/blob/main/src/garmin_personal_api/auth.py

Prüfung: `node --test cardio-garmin.test.cjs cardio-garmin-store.test.cjs` und `node build-vercel.cjs`. Die Tests prüfen Kontotrennung, Wiederherstellung auf einem zweiten Gerät, Übernahme alter Cookies, gleichzeitiges Trennen/Synchronisieren und Sitzungserneuerung. Echte Garmin-Kontoabfragen benötigen einen persönlichen Schlüssel und werden ohne diesen nicht als erfolgreich ausgegeben.

## Erholung und automatische Cardio-Empfehlung

Die Personal-API-Spezifikation bietet keinen direkten Garmin Trainingszustand oder Training Readiness. Die App zeigt deshalb eine ausdrücklich als App-Einschätzung gekennzeichnete Empfehlung aus `/usersummary-service/usersummary/daily`: aktuelle Body Battery und durchschnittlicher Tagesstress. Es werden nur vorhandene Werte von 0–100 übernommen. Optionale Wellness-Fehler verhindern den Laufimport nicht.

Im Cardio-Reiter kann die geplante lockere Dauer (20/30/45/60 Minuten, Standard 30) gewählt werden. Body Battery ≤25 oder Tagesstress ≥75 halbiert die Dauer und empfiehlt sehr lockeres Gehen oder Pause; Body Battery ≤50 oder Stress ≥50 reduziert auf ungefähr 75 %, ohne Intervalle. Sonst bleibt die lockere Einheit unverändert. Diese einfachen App-Regeln sind keine Garmin-Empfehlung. Es existiert noch kein strukturierter Cardio-Wochenplan; die Anpassung betrifft die sichtbare Tagesempfehlung und überschreibt keine Trainingshistorie.

Die Messzeit stammt aus Garmins `wellnessEndTimeGmt`, nicht aus dem Zeitpunkt des Abrufs. Ohne Messzeit oder verwertbare Werte sowie bei über sechs Stunden alten Uhrdaten wird nicht automatisch angepasst. Angezeigt bleiben die Messwerte samt Zeit. Die Daten werden mit den Läufen kontogetrennt auf diesem Gerät gespeichert und beim Trennen gelöscht. Die App aktualisiert die Werte beim Öffnen und bei **Jetzt synchronisieren**.

## Cardio starten

Die neue Karte oben im Cardio-Reiter führt über Laufen, Radfahren, HIIT oder Sonstiges zu zwei eigenen Tagesvorschlägen. Jede Einheit enthält Dauer, Intensität und Ablauf. Garmin-Werte und Begründung stehen einmal zentral oberhalb der Vorschläge. Es werden keine Garmin-Workouts abgerufen oder an eine Uhr gesendet.

Genutzt werden ausschließlich die schon importierten Werte: aktuelle Body Battery, durchschnittlicher Tagesstress (Messzeit maximal sechs Stunden alt) und valide Läufe aus den letzten 28 Tagen. Ab drei Läufen orientiert sich die lockere Laufdauer vorsichtig am Median der Laufzeiten (80 %, begrenzt auf 15–45 Minuten). Ein Lauf von mindestens 60 Minuten in den letzten 24 Stunden reduziert auch die Belastung anderer Sportarten. Laufhistorie begründet keine Radfahr- oder HIIT-Erfahrung. Dort sowie bei fehlender Historie beginnen die Vorschläge automatisch mit leichter Intensität; eine Erfahrungsauswahl ist nicht erforderlich. Hohe/mäßige Ermüdung reduziert die Dauer, entfernt fordernde Intervalle und bietet leichte Bewegung oder Ruhe an. Ohne aktuelle verwertbare Daten bleiben allgemeine Vorschläge möglich. Quelle ist „Basierend auf deinen Garmin-Daten“, sobald tatsächlich passende Mess- oder Aktivitätsdaten verwendet wurden, sonst „Allgemeiner Vorschlag“.

Schlaf, direkte Trainingsbereitschaft, Erholungszeit und echte Garmin-Trainingsvorschläge sind nicht Teil des vorhandenen Imports und werden nicht behauptet. Die neue Funktion fügt keine Garmin-Endpunkte hinzu. Änderungen der Datengrundlage zwischen Auswahl und Start erfordern eine erneute Auswahl. Ein bereits laufendes Training wird nicht plötzlich geändert.

Der App-Timer unterstützt Start, Pause/Fortsetzen und Beenden. Aktive Zeit wird anhand von Zeitstempeln erfasst; Pausenzeiten zählen nicht. Begonnene Einheiten werden pro Konto lokal wiederhergestellt. Beim Beenden speichert die vorhandene Tagebuchfunktion die tatsächlichen Minuten (auf eine Dezimalstelle gerundet) mit stabiler Einheiten-ID gegen Doppeleinträge. Unter sechs Sekunden entsteht kein Eintrag, Ruhetage erzeugen ebenfalls keine absolvierte Aktivität. Es gibt keine GPS-Distanzmessung; der Eintrag speichert 0 km und nennt die fehlende Distanzmessung ausdrücklich. Speicherfehler lassen das Training pausiert und erlauben einen erneuten Speicherversuch.

Prüfung: `node --test *.test.cjs`, `node build-vercel.cjs`. Zusätzlich mit Playwright/Chromium auf Mobilgröße geprüft: alle Sportarten, allgemeine und datenbasierte Empfehlungen, Ruhetag, Start/Pause/Fortsetzen/Neuladen/Beenden, korrekte aktive Minuten im realen Browser-Tagebuch, Kontotrennung, Ladezustand, Garmin-Fehler und abgelaufene Daten vor Trainingsstart. Garmin-Antworten waren dabei Testdaten; eine persönliche Garmin-Kontositzung wurde nicht verwendet.

Bei Body Battery ≤25 oder Tagesstress ≥75 (nur aktuelle gültige Werte) erscheint direkt nach „Cardio starten“ ein hervorgehobener Ruhetag-Hinweis, noch vor der Sportauswahl. Die separate Karte „Heute regenerieren“ entfällt. Bei mäßiger Ermüdung werden die Einheiten weiterhin reduziert. Fehlende oder alte Daten lösen keinen Ruhetag-Hinweis aus. Schlaf wird weiterhin nicht importiert.
