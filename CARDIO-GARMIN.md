# Garmin im Cardio-Bereich

Diese Erweiterung nutzt ausschließlich die offizielle Garmin Connect Personal API für eigene Laufdaten. Es ist keine Garmin Business App und kein Garmin-Passwort nötig.

1. In Garmin Connect unter https://connect.garmin.com/app/settings/personalApiToken einen Personal API Key erstellen.
2. In der Fitness-App anmelden, **Cardio → Garmin verbinden** öffnen und den Schlüssel eingeben.
3. **Schlüssel speichern & Läufe laden** lädt bis zu 100 letzte Laufaktivitäten einschließlich Lauf-Untertypen. **Jetzt synchronisieren** aktualisiert diese Auswahl. Es gibt keine automatische Hintergrundsynchronisierung.

Angezeigt werden Distanz, Dauer, Pace, durchschnittliche Herzfrequenz, Höhenmeter und Kalorien, soweit Garmin diese liefert. Zeitraumfilter: 30 Tage, 90 Tage oder alle geladenen Läufe. Die Gesamtpace wird aus Distanz und Dauer der Läufe mit beiden Messwerten berechnet. Garmin-Läufe stehen separat neben den manuellen Cardio-Einträgen und verändern deren Wochenstatistik nicht.

Der API-Schlüssel wird nach erfolgreicher Garmin-Anmeldung mit AES-256-GCM verschlüsselt im App-Konto gespeichert und über die Konto-ID als AAD gebunden. Im Supabase-Modus liegt nur der verschlüsselte Wert in `fitness_garmin_connections`; Row Level Security erlaubt jedem Nutzer ausschließlich den eigenen Datensatz. Der Server verwendet dafür das bestehende Nutzertoken, keinen Service-Role-Schlüssel. JavaScript erhält weder den Schlüssel noch das verschlüsselte Feld oder Garmin-Token zurück.

Nach der Anmeldung ist die Verbindung auf Handy und PC verfügbar. Ein neues Gerät bietet direkt **Jetzt synchronisieren** an, ohne erneute Schlüsseleingabe. Die geladenen Aktivitäten bleiben im jeweiligen Browser, getrennt nach Fitness-App-Konto. **Garmin vom Konto trennen** entfernt den Schlüssel für das gesamte Konto und den Laufdaten-Cache des aktuellen Geräts. Eine Abmeldung entfernt die Verbindung nicht. Garmin kann einen Schlüssel weiterhin ablaufen lassen oder widerrufen.

Vorhandene verschlüsselte Browser-Cookies werden beim nächsten Prüfen der Verbindung einmalig in die Kontospeicherung übernommen und anschließend entfernt. Ein leerer Datensatz nach dem Trennen verhindert, dass ein anderes Gerät mit einem alten Cookie die Verbindung wiederherstellt. Versionsprüfungen verhindern, dass gleichzeitig laufende Anfragen eine neuere Änderung überschreiben. Ein abgelehnter Ersatzschlüssel entfernt keinen zuvor gespeicherten, anderen Schlüssel.

Der Endpunkt `/api/garmin` prüft die vorhandene Fitness-App-Sitzung und die Konto-ID. GET liefert ausschließlich den Verbindungsstatus, POST synchronisiert oder trennt die Verbindung. In Vercel wird weiterhin `FITNESS_GARMIN_COOKIE_KEY` als serverseitiges Geheimnis mit 32 zufälligen Bytes in Hexkodierung verwendet. Der vorhandene Wert muss für die Übernahme alter Cookies erhalten bleiben. Ein Wechsel macht vorhandene verschlüsselte Verbindungen unlesbar.

Vor dem Deployment die Migration `supabase/migrations/20261108000100_fitness_garmin_connections.sql` im Supabase-Projekt anwenden. Sie legt ausschließlich die neue Kontotabelle, den Revisionstrigger und die Eigentümerrichtlinien an. Bei manueller Einrichtung im SQL-Editor die Migration beim späteren Wechsel zur Supabase CLI mit `supabase migration repair --status applied 20261108000100 --remote` markieren.

Im lokalen SQLite-Modus wird die Verbindung verschlüsselt in derselben Kontodatenbank gespeichert. Ohne konfigurierten Verschlüsselungsschlüssel wird lokal `.data/garmin-cookie.key` verwendet. Wenn lokale Entwicklung und Vercel dasselbe Supabase-Projekt verwenden, müssen sie denselben `FITNESS_GARMIN_COOKIE_KEY` verwenden, damit beide dieselben Kontoverbindungen entschlüsseln können. Für unabhängige Entwicklungsumgebungen ein eigenes Supabase-Projekt verwenden.

Fehlerbehebung: Garmins Token-Endpunkt antwortet mit JWT-Text, nicht JSON. Daher verwendet die App dort `Accept: */*` und liest Text, wie Garmins offizieller Python-Client. Nur Laufdaten werden als JSON gelesen. Upstream-Fehler zeigen Phase und HTTP-Status; Logs enthalten keine Schlüssel, Tokens oder Antwortinhalte.

Die neuen Dateien `cardio-garmin.js`, `cardio-garmin.css` und `cardio-garmin.cjs` kapseln die Erweiterung. Gemeinsame Dateien enthalten nur Einbindung, Konto-Lifecycle, Routing und die Asset-Freigabe. Bei paralleler Arbeit nur diese kleinen Integrationsstellen übernehmen, keine kompletten gemeinsamen Dateien ersetzen.

Offizielle Referenzen:
- https://developer.garmin.com/gc-developer-program/personal/personal-faq
- https://developer.garmin.com/gc-developer-program/personal/swagger-docs/
- https://github.com/garmin/connect-personal-api-python/blob/main/src/garmin_personal_api/auth.py

Prüfung: `node --test cardio-garmin.test.cjs cardio-garmin-store.test.cjs` und `node build-vercel.cjs`. Die Tests prüfen Kontotrennung, Wiederherstellung auf einem zweiten Gerät, Übernahme alter Cookies, gleichzeitiges Trennen/Synchronisieren und Sitzungserneuerung. Echte Garmin-Kontoabfragen benötigen einen persönlichen Schlüssel und werden ohne diesen nicht als erfolgreich ausgegeben.
