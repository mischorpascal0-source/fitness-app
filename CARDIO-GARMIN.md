# Garmin im Cardio-Bereich

Diese Erweiterung nutzt ausschließlich die offizielle Garmin Connect Personal API für eigene Laufdaten. Es ist keine Garmin Business App und kein Garmin-Passwort nötig.

1. In Garmin Connect unter https://connect.garmin.com/app/settings/personalApiToken einen Personal API Key erstellen.
2. In der Fitness-App anmelden, **Cardio → Garmin verbinden** öffnen und den Schlüssel eingeben.
3. **Schlüssel speichern & Läufe laden** lädt bis zu 100 letzte Laufaktivitäten einschließlich Lauf-Untertypen. **Jetzt synchronisieren** aktualisiert diese Auswahl. Es gibt keine automatische Hintergrundsynchronisierung.

Angezeigt werden Distanz, Dauer, Pace, durchschnittliche Herzfrequenz, Höhenmeter und Kalorien, soweit Garmin diese liefert. Zeitraumfilter: 30 Tage, 90 Tage oder alle geladenen Läufe. Die Gesamtpace wird aus Distanz und Dauer der Läufe mit beiden Messwerten berechnet. Garmin-Läufe stehen separat neben den manuellen Cardio-Einträgen und verändern deren Wochenstatistik nicht.

Der API-Schlüssel wird nach erfolgreicher Garmin-Anmeldung mit AES-256-GCM verschlüsselt in einem HttpOnly-Cookie gespeichert, gebunden an das App-Konto (AAD). HTTPS-Cookies sind Secure und SameSite=Strict; JavaScript erhält weder Schlüssel noch Garmin-Token zurück. Das Cookie bleibt bis zu einem Jahr bestehen, auch nach Abmelden und erneutem Anmelden desselben Kontos in diesem Browser. Garmin kann den Schlüssel vorher ablaufen lassen oder widerrufen. Andere Browser oder Geräte benötigen eine eigene Verbindung. Die geladenen Aktivitäten bleiben im Browser, getrennt nach Fitness-App-Konto. **Trennen & Laufdaten entfernen** entfernt Cookie und Laufdaten-Cache. Eine Abmeldung allein löscht den gespeicherten Garmin-Schlüssel nicht.

Der Endpunkt `/api/garmin` prüft die vorhandene Fitness-App-Sitzung und die Konto-ID. GET liefert ausschließlich den Verbindungsstatus, POST synchronisiert oder trennt die Verbindung. In Vercel wird `FITNESS_GARMIN_COOKIE_KEY` als serverseitiges Geheimnis mit 32 zufälligen Bytes in Hexkodierung benötigt. Ein Wechsel dieses Schlüssels macht alle gespeicherten Garmin-Cookies unlesbar. Lokal wird ein eigener Schlüssel in `.data/garmin-cookie.key` angelegt. Keine Datenbankmigration erforderlich.

Fehlerbehebung: Garmins Token-Endpunkt antwortet mit JWT-Text, nicht JSON. Daher verwendet die App dort `Accept: */*` und liest Text, wie Garmins offizieller Python-Client. Nur Laufdaten werden als JSON gelesen. Upstream-Fehler zeigen Phase und HTTP-Status; Logs enthalten keine Schlüssel, Tokens oder Antwortinhalte.

Die neuen Dateien `cardio-garmin.js`, `cardio-garmin.css` und `cardio-garmin.cjs` kapseln die Erweiterung. Gemeinsame Dateien enthalten nur Einbindung, Konto-Lifecycle, Routing und die Asset-Freigabe. Bei paralleler Arbeit nur diese kleinen Integrationsstellen übernehmen, keine kompletten gemeinsamen Dateien ersetzen.

Offizielle Referenzen:
- https://developer.garmin.com/gc-developer-program/personal/personal-faq
- https://developer.garmin.com/gc-developer-program/personal/swagger-docs/
- https://github.com/garmin/connect-personal-api-python/blob/main/src/garmin_personal_api/auth.py

Prüfung: `node --test cardio-garmin.test.cjs` und `node build-vercel.cjs`. Echte Garmin-Kontoabfragen benötigen einen persönlichen Schlüssel und werden ohne diesen nicht simuliert als erfolgreich ausgegeben.
