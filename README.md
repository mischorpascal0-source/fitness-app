# fitness-app
Fitness-App für Cardio, Krafttraining und Ernährungstracking

## Lokal starten

Starte den lokalen Server mit Node.js 24 oder neuer. Eine Paketinstallation ist nicht erforderlich.

```powershell
node --env-file-if-exists=.env server.cjs
```

Falls `node` in deiner PowerShell fehlt, kannst du aus dem Repository-Ordner die mit Codex gelieferte Version starten.

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --env-file-if-exists=.env server.cjs
```

Öffne danach die [lokale App](http://127.0.0.1:3000). Beim ersten Aufruf erscheint die Anmeldung. Eine gültige Sitzung öffnet die App direkt.

Das Dashboard zeigt deine erfassten Tageswerte und die heute geplante Einheit aus deinem aktuellen Trainingsplan. Tageswerte und absolvierte Trainings werden in diesem Browser getrennt nach Konto gespeichert. Die persönlichen Trainingspläne werden über den Server gespeichert.

Unter **Training** findest du den Wochenkalender und die zum gewählten Tag passende Krafttrainingseinheit. **Cardio** hat einen eigenen Navigationspunkt. Die Übungsbibliothek ist über den Trainingsplan erreichbar und bietet Suche und Filter für Muskelgruppe und Gerätetyp. Jede Übungsdetailansicht zeigt eine schematische Beispielposition mit Gerät oder Zubehör. Die Übungsdaten liegen in `exercises.js`, die Bildzuordnungen in `exercise-scenes.js`.

## Trainingsplan

Öffne **Training → Wöchentliche Trainingstage ändern**. Wähle Split, Einheiten pro Woche, feste Wochentage, verfügbare Zeit, Ziel, Erfahrung und Equipment. Der Generator wählt Übungen lokal aus der Bibliothek und variiert die Auswahl bei erneuter Erstellung. Mit **Eigenen Plan erstellen** startest du mit einem leeren Plan und legst deine Einheiten selbst an.

Jede Einheit wiederholt sich an ihrem eingestellten Wochentag, beispielsweise Oberkörper am Donnerstag und Unterkörper am Sonntag. Im Editor lässt sich der Trainingstag pro Einheit nachträglich ändern. Einheiten ohne festen Tag bleiben im Plan erhalten und lassen sich dort einem Wochentag zuordnen. Freie Kalendertage zeigen einen Ruhetag.

Wähle im Kalender einen früheren Tag, um die dafür geplante Einheit nachzuholen. Das abgeschlossene Training wird diesem Kalendertag zugeordnet, einschließlich Wochenstatistik und Kalender-Markierung. Der tatsächliche Startzeitpunkt wird separat gespeichert und bestimmt den Trainingstimer. Über **Heute** gelangst du zum aktuellen Tag zurück. Eine begonnene Einheit bleibt über **Training läuft** erreichbar, auch wenn du den Kalendertag oder Bereich wechselst.

**Training starten** öffnet eine bildschirmfüllende Trainingsübersicht mit allen Übungen, Bildern, Vorgaben und Fortschritt. Die normale App-Navigation ist währenddessen verdeckt und inaktiv. Tippe eine Übung an und wähle in der Übungsmaske **Übung starten**. Begonnene Übungen öffnen direkt ihre gespeicherten Satzeingaben. Trage für jeden erledigten Satz das tatsächliche Gewicht (ohne Zusatzlast: 0 kg) und die Wiederholungen ein. Nach dem Abhaken startet eine beendbare Erholungspause von drei Minuten. **Zur Liste** behält deine Eingaben; **Übung überspringen** lässt offene Sätze unerledigt.

In der Übungsmaske kannst du Satzanzahl, Zielwiederholungen und den Bereich **5–8**, **8–12** oder **12–20** anpassen. Bereits erledigte Sätze und tatsächlich eingegebene Werte bleiben erhalten. **Übung austauschen** öffnet im selben Popup die Bibliothek mit vorgewählter Muskelgruppe, Suche und Equipment-Filter. Bestätige den Austausch erst nach dem Hinweis zu offenen Sätzen. Bereits absolvierte Sätze bleiben unter der ursprünglichen Übung im Protokoll; die Ersatzübung erhält leere Sätze. Ziehe Übungen in der Übersicht am Griff oder verwende dort die Pfeiltasten. Eine Positionsauswahl im Übungs-Popup gibt es nicht mehr. Reihenfolge und Werte gehören zu stabilen Übungsinstanzen.

Vor einer neuen Einheit beantwortest du den Check-in zu Muskelkater und getrennt dazu zu ungewöhnlichen Schmerzen oder Schwellung. Die Muskelgruppen sind nach Oberkörper, Körpermitte sowie Beinen und Hüfte geordnet. Alle Slider einer neuen Bewertung starten bei **0**; passe betroffene Gruppen von 0 bis 10 an. Der aktuelle Zahlenwert ist direkt am jeweiligen Regler sichtbar. **Alle auf 0 zurücksetzen** setzt die Bewertung zurück. Über **Muskelkater & Beschwerden** änderst du gespeicherte Angaben später; dabei wird die Einheit pausiert. Beim Fortsetzen bleibt der Check-in erhalten.

Die Übungsmaske zeigt einen Basisvorschlag aus vergleichbaren Arbeitssätzen und den Tagesvorschlag nach dem Check-in. **Vorschlag für offene Sätze übernehmen** füllt nur unbearbeitete Felder; erst das Abhaken zählt als absolvierter Satz. Aufwärmsätze lassen sich kennzeichnen und werden für die Vorschläge nicht verwendet. Unter **Gewichtsangabe und Gerät einstellen** legst du Gewichtsschritt, Gewichtsart und Gerätekennung fest. Maschinengewichte werden erst mit passender Gerätekennung verglichen. Die Näherungen, Progressionsregeln, Muskelgruppen-Zuordnung und Grenzen stehen in [TRAINING-GUIDANCE.md](TRAINING-GUIDANCE.md).

**Pausieren** stoppt Trainingsdauer und Erholungstimer. **Verlassen** pausiert die Einheit und speichert sie für dein Konto in diesem Browser. Über die Tageskachel oder **Training pausiert** setzt du sie auch nach Neuladen fort. Die Zusammenfassung zeigt tatsächliche Sätze und vollständig erledigte Übungen. Für einen unvollständigen Abschluss ist eine Bestätigung nötig; übersprungene Sätze zählen nicht in den Statistiken.

Die Einheit ist zunächst eine eigene Kopie. Nach dem Abschluss entscheidest du bei Planänderungen zwischen **Nur für dieses Training** und **Für zukünftige Trainings übernehmen**. Nur Übungsauswahl, Reihenfolge und Zielvorgaben werden nach Bestätigung in die ursprüngliche Planeinheit übernommen. Tatsächliche Gewichte, tatsächliche Wiederholungen und Erledigt-Markierungen bleiben im Trainingsprotokoll. Geänderte oder gelöschte Ausgangspläne werden erkannt; andere Trainingstage werden nicht überschrieben. Ein fehlgeschlagenes Speichern des Plans lässt Training und Entscheidung für einen erneuten Versuch erhalten. Offene Entscheidungen erreichst du über **Planänderungen prüfen**. Trainingseinträge und laufende Einheiten werden weiterhin nicht zwischen Geräten synchronisiert.

Die Regeln für Vorschläge, Fortschritt, Pausenzeit und einmaligen Abschluss werden mit `node --test` geprüft. Den Build prüfst du mit `node build-vercel.cjs`.

Im Editor kannst du Einheiten und Übungen hinzufügen, verschieben und entfernen. Zum Hinzufügen stehen Namenssuche und Filter für Muskelgruppe und Equipment bereit. Eigene Übungen lassen sich ebenfalls eintragen.

### Persönliche Pläne mit Supabase

Supabase Auth übernimmt die Anmeldung mit E-Mail und Passwort. Trainingspläne liegen in Postgres und gehören über die Auth-Nutzer-ID genau einem Konto. Dieselbe Instanz der App kann auf mehreren Geräten verwendet werden.

1. Erstelle oder öffne dein Supabase-Projekt. Kopiere aus **Connect** die Projekt-URL und den **Publishable key**. Trage beide Werte in die lokale `.env` ein.

   ```dotenv
   SUPABASE_URL=https://dein-projekt.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_dein_key
   ```

2. Wende die Migration in `supabase/migrations/20261104000100_fitness_training_plans.sql` im Projekt an. Mit der Supabase CLI initialisierst du bei Bedarf die Konfiguration mit `supabase init` und nutzt dann `supabase link --project-ref <project-ref>` und `supabase db push --remote`. Für die Einrichtung über das Dashboard kannst du das Skript einmalig im **SQL Editor** ausführen. Falls du danach auf die CLI wechselst, markiere die bereits ausgeführte Migration mit `supabase migration repair --status applied 20261104000100 --remote`. [Supabase-Migrationsworkflow](https://supabase.com/docs/guides/deployment/database-migrations)
3. Aktiviere im Projekt die E-Mail-Anmeldung mit E-Mail-Bestätigung. Erlaube unter **Authentication → URL Configuration → Redirect URLs** die Adresse `http://127.0.0.1:3000/auth/confirm`. Starte danach den App-Server neu und lege unter **Mein Konto** ein Konto an. Nach dem Bestätigungslink meldest du dich mit E-Mail und Passwort an.

Der Server schickt Datenbankanfragen mit dem jeweiligen Nutzertoken. Row Level Security prüft bei jeder Abfrage, ob der Plan zu diesem Konto gehört. Der App-Server verwaltet die Supabase-Sitzungstokens in HttpOnly-Cookies. Für die App-Konfiguration genügt der [Publishable key](https://supabase.com/docs/guides/getting-started/api-keys).

Wenn Node.js unter Windows die Zertifikatskette der Supabase-Verbindung nicht verifizieren kann, ergänze beim Start `--use-system-ca`.

### Vorhandene lokale Konten und Entwürfe

Ohne die beiden Supabase-Einstellungen verwendet der lokale Server weiterhin Nutzername und Passwort und speichert Konten und Pläne in `.data/fitness.sqlite`. Für den Wechsel exportierst du deine SQLite-Pläne vorab über **Plan exportieren**. Registriere dich anschließend mit deiner E-Mail-Adresse im Supabase-Modus und importiere die Dateien über **Exportierten Plan übernehmen**. Die lokalen Konten und ihre Passwort-Hashes verbleiben in SQLite.

Mit **Lokalen Entwurf übernehmen** kopierst du nach der Anmeldung einen vorhandenen Entwurf in dein Konto. Wenn du einen Entwurf in einer direkt geöffneten `index.html` gespeichert hast, öffne sie erneut und wähle **Lokalen Entwurf exportieren**. Importiere die Datei anschließend im Konto über **Exportierten Plan übernehmen**.

### Social

Wende für Social einmalig `supabase/migrations/20261109000100_fitness_social.sql` in Supabase an. Die App verwendet dieselbe Anmeldung und dieselben Supabase-Einstellungen wie für Trainingspläne. Der SQL Editor im Dashboard kann die Migration direkt ausführen. Bei einem späteren Wechsel zur CLI markiere eine bereits im SQL Editor ausgeführte Migration als angewendet. [Supabase-Migrationsworkflow](https://supabase.com/docs/guides/deployment/database-migrations)

Social startet ausgeschaltet. Nach dem Anlegen des Nutzernamens bleiben Krafttraining, Cardio und Ernährung zunächst privat. Die Wochenübersicht verwendet die aktuelle Kalenderwoche von Montag bis Sonntag und kombiniert Zusammenfassungen der angemeldeten Browser. Einzelne Trainings werden nach Auswahl der Empfänger separat freigegeben. Das Abschalten einer Kategorie entfernt ihre veröffentlichten Zusammenfassungen. Wird Krafttraining privat, werden auch die daraus geteilten Trainings zurückgezogen.

### Gemeinsamer Zugriff von Handy und PC

Das Repository ist für Vercel eingerichtet. Dort liefert Vercel die Browserdateien aus und leitet die Konto- und Plananfragen an eine Node.js-Funktion weiter. Supabase speichert die Konten und Pläne.

1. Verbinde das GitHub-Repository unter **Settings → Git** mit dem Vercel-Projekt. Pushes auf den Produktionsbranch `main` lösen ein Deployment aus. [Vercel-Git-Integration](https://vercel.com/docs/git)
2. Setze in Vercel für die Produktionsumgebung `SUPABASE_URL` und `SUPABASE_PUBLISHABLE_KEY` aus dem Supabase-Projekt. Lass die Vercel-Systemvariablen verfügbar. Bei einer eigenen Domain kannst du zusätzlich `FITNESS_PUBLIC_ORIGIN` auf deren HTTPS-Adresse setzen. [Vercel-Umgebungsvariablen](https://vercel.com/docs/environment-variables)
3. Hinterlege nach dem Deployment die öffentliche HTTPS-Adresse als **Site URL** in Supabase und erlaube unter **Redirect URLs** zusätzlich diese Adresse mit dem Pfad `/auth/confirm`. [Supabase-Weiterleitungen](https://supabase.com/docs/guides/auth/redirect-urls)
4. Richte für die Selbstregistrierung externer Nutzer einen eigenen SMTP-Versand ein. Der Standardversand ist auf E-Mail-Adressen des Supabase-Teams beschränkt. [Supabase-Mailversand](https://supabase.com/docs/guides/auth/auth-smtp)

Der lokale Vercel-Build lässt sich mit `node build-vercel.cjs` prüfen. Für einen eigenen HTTPS-Reverse-Proxy kannst du weiterhin `server.cjs` verwenden und `FITNESS_PUBLIC_ORIGIN` auf die öffentliche HTTPS-Adresse setzen.

### Änderungen gemeinsam veröffentlichen

Commits auf `main` werden automatisch von Vercel gebaut und nach erfolgreichem Build unter [der App-Adresse](https://fitness-app-two-ruddy.vercel.app) veröffentlicht. `vercel.json` aktiviert Git-Deployments ausdrücklich. Für die tägliche Arbeit genügen Commit und Push nach GitHub; ein zusätzlicher Upload zu Vercel entfällt.

Für parallele Arbeit könnt ihr eigene Branches verwenden und fertige Änderungen per Pull Request nach `main` übernehmen. Vercel veröffentlicht dann den zusammengeführten Stand. Den Build-Status findet ihr beim jeweiligen Commit auf GitHub und im Vercel-Projekt unter **Deployments**.
