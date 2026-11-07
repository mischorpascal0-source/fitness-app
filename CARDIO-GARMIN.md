# Garmin im Cardio-Bereich

Diese Erweiterung nutzt ausschließlich die offizielle Garmin Connect Personal API für eigene Laufdaten. Es ist keine Garmin Business App und kein Garmin-Passwort nötig.

1. In Garmin Connect unter https://connect.garmin.com/app/settings/personalApiToken einen Personal API Key erstellen.
2. In der Fitness-App anmelden, **Cardio → Garmin verbinden** öffnen und den Schlüssel eingeben.
3. **Verbinden & Läufe laden** lädt bis zu 100 letzte Laufaktivitäten einschließlich Lauf-Untertypen. **Jetzt synchronisieren** aktualisiert diese Auswahl. Es gibt keine automatische Hintergrundsynchronisierung.

Angezeigt werden Distanz, Dauer, Pace, durchschnittliche Herzfrequenz, Höhenmeter und Kalorien, soweit Garmin diese liefert. Zeitraumfilter: 30 Tage, 90 Tage oder alle geladenen Läufe. Die Gesamtpace wird aus Distanz und Dauer der Läufe mit beiden Messwerten berechnet. Garmin-Läufe stehen separat neben den manuellen Cardio-Einträgen und verändern deren Wochenstatistik nicht.

Der API-Schlüssel bleibt ausschließlich im JavaScript-Arbeitsspeicher der geöffneten Seite. Jeder Abruf sendet ihn über denselben App-Server an Garmins festen HTTPS-Endpunkt; weder Schlüssel noch Garmin-Zugriffstokens werden gespeichert oder protokolliert. Neuladen, Abmelden oder Kontowechsel erfordern erneutes Verbinden. Die geladenen Aktivitäten bleiben im Browser, getrennt nach Fitness-App-Konto; sie werden nicht über Supabase zwischen Geräten synchronisiert. **Trennen & Laufdaten entfernen** löscht diesen Cache und den Schlüssel aus der geöffneten Seite. Den Schlüssel selbst kannst du in Garmin Connect widerrufen.

Der Endpunkt `/api/garmin` prüft die vorhandene Fitness-App-Sitzung und die Konto-ID. Funktioniert lokal mit `node server.cjs` sowie mit der bestehenden Vercel-Gateway-Konfiguration. Es sind keine zusätzlichen Umgebungsvariablen oder Datenbankmigrationen erforderlich.

Die neuen Dateien `cardio-garmin.js`, `cardio-garmin.css` und `cardio-garmin.cjs` kapseln die Erweiterung. Gemeinsame Dateien enthalten nur Einbindung, Konto-Lifecycle, Routing und die Asset-Freigabe. Bei paralleler Arbeit nur diese kleinen Integrationsstellen übernehmen, keine kompletten gemeinsamen Dateien ersetzen.

Offizielle Referenzen:
- https://developer.garmin.com/gc-developer-program/personal/personal-faq
- https://developer.garmin.com/gc-developer-program/personal/swagger-docs/

Prüfung: `node --test cardio-garmin.test.cjs` und `node build-vercel.cjs`. Echte Garmin-Kontoabfragen benötigen einen persönlichen Schlüssel und werden ohne diesen nicht simuliert als erfolgreich ausgegeben.
