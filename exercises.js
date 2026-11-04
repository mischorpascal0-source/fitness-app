const exerciseCatalog = (() => {
  const catalog = [];

  // ID, Name, Suchbegriffe, Zubehör, Zielmuskeln, weitere Muskeln, Ausführung
  function add(group, type, prefix, entries) {
    for (const [slug, name, aliases, gear, primary, secondary, ...steps] of entries) {
      catalog.push({ id: prefix + "-" + slug, name, aliases, group, type, gear, primary, secondary, steps });
    }
  }

  add("Brust", "Kurzhantel", "kh", [
    ["flachbankdruecken", "Flachbankdrücken", ["Dumbbell Bench Press"], "Zwei Kurzhanteln und Flachbank", "Brustmuskulatur", "Trizeps, vordere Schulter",
      "Lege dich auf die Bank und stelle beide Füße fest auf.", "Senke die Hanteln seitlich zur Brust, mit den Handgelenken über den Ellbogen.", "Drücke die Hanteln über der Brust nach oben."],
    ["schraegbankdruecken", "Schrägbankdrücken", ["Incline Dumbbell Press"], "Zwei Kurzhanteln und Schrägbank", "Brustmuskulatur", "Vordere Schulter, Trizeps",
      "Stelle die Lehne leicht schräg und stütze Rücken und Füße ab.", "Senke die Hanteln seitlich zur oberen Brust.", "Drücke beide Hanteln nach oben und führe sie leicht zusammen."],
    ["negativbankdruecken", "Negativbankdrücken", ["Decline Dumbbell Press"], "Zwei Kurzhanteln und Negativbank mit Beinstütze", "Brustmuskulatur", "Trizeps, vordere Schulter",
      "Sichere die Beine an der Negativbank und halte die Hanteln über der Brust.", "Senke die Hanteln kontrolliert seitlich zur unteren Brust.", "Drücke die Hanteln über der Brust wieder nach oben."],
    ["floor-press", "Floor Press", ["Bodendrücken", "Dumbbell Floor Press"], "Zwei Kurzhanteln und freie Bodenfläche", "Brustmuskulatur, Trizeps", "Vordere Schulter",
      "Lege dich mit aufgestellten Füßen auf den Rücken und halte die Hanteln über der Brust.", "Senke die Oberarme, bis sie den Boden sanft berühren.", "Drücke aus der kurzen Pause nach oben."],
    ["fliegende-flachbank", "Fliegende auf der Flachbank", ["Dumbbell Fly", "Flat Fly"], "Zwei Kurzhanteln und Flachbank", "Brustmuskulatur", "Vordere Schulter",
      "Halte die Hanteln über der Brust und beuge die Ellbogen leicht.", "Öffne die Arme im Bogen bis zu einer angenehmen Dehnung.", "Führe die Hanteln im selben Bogen wieder zusammen."],
    ["fliegende-schraegbank", "Fliegende auf der Schrägbank", ["Incline Dumbbell Fly"], "Zwei Kurzhanteln und Schrägbank", "Brustmuskulatur", "Vordere Schulter",
      "Lege dich an die geneigte Lehne und halte die Hanteln über der oberen Brust.", "Öffne die Arme seitlich bei gleichbleibend leicht gebeugten Ellbogen.", "Führe die Hanteln auf derselben Bahn wieder nach oben."],
  ]);
  add("Brust", "Maschine", "ma", [
    ["brustdruecken", "Brustdrücken", ["Chest Press"], "Brustpresse", "Brustmuskulatur", "Trizeps, vordere Schulter",
      "Stelle den Sitz so ein, dass die Griffe ungefähr auf Brusthöhe liegen.", "Drücke die Griffe vorwärts und halte den Rücken an der Lehne.", "Lass die Griffe kontrolliert zur Brust zurückkehren."],
    ["schraegbrustdruecken", "Schrägbrustdrücken", ["Incline Chest Press"], "Schrägbrustpresse", "Brustmuskulatur", "Vordere Schulter, Trizeps",
      "Setze dich mit abgestütztem Rücken hin und greife auf Höhe der oberen Brust.", "Drücke die Griffe entlang der Gerätebahn schräg nach oben.", "Führe die Griffe zurück, während die Schultern an der Lehne bleiben."],
    ["negativ-brustdruecken", "Negativ-Brustdrücken", ["Decline Chest Press"], "Negativ-Brustpresse", "Brustmuskulatur", "Trizeps, vordere Schulter",
      "Positioniere den Sitz so, dass die Griffe vor der unteren Brust starten.", "Drücke die Griffe auf der geführten Bahn vorwärts und abwärts.", "Kehre langsam zur Startposition zurück."],
    ["butterfly", "Butterfly", ["Pec Deck", "Machine Fly"], "Butterfly-Maschine", "Brustmuskulatur", "Vordere Schulter",
      "Stelle die Sitzhöhe so ein, dass Hände oder Ellbogen etwa auf Schulterhöhe liegen.", "Führe die Griffe oder Polster im Bogen vor der Brust zusammen.", "Öffne die Arme kontrolliert bis zur bequemen Startposition."],
  ]);
  add("Brust", "Kabelzug", "kz", [
    ["brustdruecken-stehend", "Stehendes Brustdrücken", ["Standing Cable Chest Press"], "Doppelter Kabelzug und zwei Einzelgriffe", "Brustmuskulatur", "Trizeps, vordere Schulter, Rumpf",
      "Stelle die Rollen etwa auf Brusthöhe und tritt mit den Griffen in einen Schrittstand.", "Drücke beide Griffe vor die Brust und halte den Rumpf ruhig.", "Führe die Ellbogen kontrolliert zurück."],
    ["fly-brusthoehe", "Cable Fly auf Brusthöhe", ["Cable Crossover", "Kabel-Fliegende"], "Doppelter Kabelzug und zwei Einzelgriffe", "Brustmuskulatur", "Vordere Schulter",
      "Stelle die Rollen etwa auf Brusthöhe und nimm einen stabilen Schrittstand ein.", "Führe die leicht gebeugten Arme im Bogen vor der Brust zusammen.", "Öffne die Arme langsam bis zur angenehmen Dehnung."],
    ["fly-oben-unten", "Cable Fly von oben nach unten", ["High to Low Cable Fly"], "Doppelter Kabelzug und zwei Einzelgriffe", "Brustmuskulatur", "Vordere Schulter",
      "Stelle beide Rollen oberhalb der Schultern ein und tritt einen Schritt vor.", "Führe die Griffe im Bogen schräg vor die Hüfte.", "Lass die Arme auf derselben Bahn langsam wieder öffnen."],
    ["fly-unten-oben", "Cable Fly von unten nach oben", ["Low to High Cable Fly"], "Doppelter Kabelzug und zwei Einzelgriffe", "Brustmuskulatur", "Vordere Schulter",
      "Stelle beide Rollen tief ein und greife mit leicht gebeugten Armen.", "Führe die Griffe im Bogen schräg vor die obere Brust.", "Senke die Arme auf derselben Bahn ohne Schwung ab."],
  ]);
  add("Brust", "Multipresse", "mp", [
    ["flachbankdruecken", "Flachbankdrücken", ["Smith Machine Bench Press"], "Multipresse und Flachbank", "Brustmuskulatur", "Trizeps, vordere Schulter",
      "Richte die Bank so aus, dass die Stange zur mittleren Brust läuft, und setze die Sicherheitsstopps.", "Hake die Stange aus und senke sie kontrolliert zur Brust.", "Drücke nach oben und hake die Stange nach dem Satz ein."],
    ["schraegbankdruecken", "Schrägbankdrücken", ["Smith Machine Incline Press"], "Multipresse und Schrägbank", "Brustmuskulatur", "Vordere Schulter, Trizeps",
      "Richte die Schrägbank unter der Stange aus und setze die Sicherheitsstopps.", "Senke die ausgehakte Stange zur oberen Brust, während der Rücken abgestützt bleibt.", "Drücke die Stange entlang der Führung nach oben."],
    ["negativbankdruecken", "Negativbankdrücken", ["Smith Machine Decline Press"], "Multipresse und Negativbank mit Beinstütze", "Brustmuskulatur", "Trizeps, vordere Schulter",
      "Richte die Negativbank für die Bahn zur unteren Brust aus und setze die Sicherheitsstopps.", "Sichere die Beine und senke die ausgehakte Stange zur unteren Brust.", "Drücke entlang der Führung nach oben und raste die Stange nach dem Satz ein."],
  ]);

  add("Rücken und Nacken", "Kurzhantel", "kh", [
    ["rudern-einarmig", "Einarmiges Rudern mit Bankstütze", ["One Arm Dumbbell Row"], "Eine Kurzhantel und Flachbank", "Breiter Rückenmuskel, oberer Rücken", "Bizeps, hintere Schulter",
      "Stütze eine Hand und das gleichseitige Knie auf der Bank ab.", "Ziehe die Hantel mit dem Ellbogen Richtung Hüfte und halte den Rumpf ruhig.", "Senke die Hantel langsam ab und wechsle anschließend die Seite."],
    ["rudern-vorgebeugt", "Vorgebeugtes Rudern", ["Bent Over Dumbbell Row"], "Zwei Kurzhanteln", "Breiter Rückenmuskel, oberer Rücken", "Bizeps, hintere Schulter, Rückenstrecker",
      "Schiebe die Hüfte zurück und neige den geraden Oberkörper nach vorn.", "Ziehe beide Hanteln Richtung untere Rippen.", "Strecke die Arme wieder, während der Oberkörper ruhig bleibt."],
    ["rudern-brustgestuetzt", "Brustgestütztes Rudern", ["Chest Supported Dumbbell Row"], "Zwei Kurzhanteln und Schrägbank", "Oberer Rücken, breiter Rückenmuskel", "Bizeps, hintere Schulter",
      "Lege die Brust an die Schrägbank und lass die Hanteln nach unten hängen.", "Ziehe die Ellbogen nach hinten, während die Brust aufliegt.", "Senke die Hanteln bis zu langen Armen."],
    ["ueberzuege", "Überzüge", ["Dumbbell Pullover"], "Eine Kurzhantel und Flachbank", "Breiter Rückenmuskel, Brustmuskulatur", "Langer Trizepskopf",
      "Lege dich längs auf die Bank und halte eine Hantel mit beiden Händen über der Brust.", "Führe die Hantel bei leicht gebeugten Ellbogen kontrolliert hinter den Kopf.", "Hole die Hantel im Bogen zurück und halte die Rippen ruhig."],
    ["schulterheben", "Schulterheben", ["Dumbbell Shrugs", "Nackenheben"], "Zwei Kurzhanteln", "Oberer Trapezmuskel", "Schulterblattheber, Unterarme",
      "Halte die Hanteln seitlich bei aufrechtem Stand.", "Ziehe beide Schultern gerade nach oben.", "Senke die Schultern langsam bei langen Armen ab."],
  ]);
  add("Rücken und Nacken", "Maschine", "ma", [
    ["latzug-obergriff", "Latzug im breiten Obergriff", ["Lat Pulldown", "Wide Grip Pulldown"], "Latzugstation mit Sitz und langer Stange", "Breiter Rückenmuskel", "Bizeps, oberer Rücken",
      "Fixiere die Oberschenkel und greife die Stange etwas breiter als schulterbreit im Obergriff.", "Ziehe die Stange vor dem Körper zur oberen Brust.", "Lass die Arme langsam wieder nach oben strecken."],
    ["latzug-neutral", "Latzug im engen Neutralgriff", ["Lat Pulldown", "Close Grip Pulldown"], "Latzugstation mit engem Parallelgriff", "Breiter Rückenmuskel", "Bizeps, oberer Rücken",
      "Fixiere die Oberschenkel und fasse den Griff mit zueinander gerichteten Handflächen.", "Ziehe den Griff zur Brust und führe die Ellbogen nah am Körper nach unten.", "Gib den Griff kontrolliert nach oben frei."],
    ["latzug-untergriff", "Latzug im Untergriff", ["Lat Pulldown", "Reverse Grip Pulldown"], "Latzugstation mit gerader Stange", "Breiter Rückenmuskel", "Bizeps, oberer Rücken",
      "Setze dich unter das Oberschenkelpolster und greife etwa schulterbreit im Untergriff.", "Ziehe die Stange vor dem Körper zur oberen Brust.", "Lass die Arme langsam wieder nach oben strecken."],
    ["rudern-sitzend", "Sitzendes Rudern", ["Seated Machine Row"], "Rudermaschine", "Oberer Rücken, breiter Rückenmuskel", "Bizeps, hintere Schulter",
      "Stelle den Sitz so ein, dass du die Griffe bei aufrechtem Oberkörper erreichst.", "Ziehe die Griffe Richtung Rippen und halte den Oberkörper stabil.", "Führe die Griffe langsam zurück."],
    ["rudern-brustgestuetzt", "Brustgestütztes Rudern", ["Chest Supported Machine Row"], "Rudermaschine mit Brustpolster", "Oberer Rücken, breiter Rückenmuskel", "Bizeps, hintere Schulter",
      "Stelle Sitz und Polster so ein, dass die Brust anliegt und du die Griffe erreichst.", "Ziehe die Ellbogen hinter den Oberkörper.", "Strecke die Arme langsam, während die Brust auf dem Polster bleibt."],
    ["high-row", "High Row", ["Hohes Maschinenrudern"], "High-Row-Maschine", "Breiter Rückenmuskel, oberer Rücken", "Bizeps, hintere Schulter",
      "Setze dich stabil hin und greife die hoch liegenden Griffe.", "Ziehe die Ellbogen schräg nach hinten und unten.", "Lass die Griffe kontrolliert nach oben zurücklaufen."],
    ["low-row", "Low Row", ["Tiefes Maschinenrudern"], "Low-Row-Maschine", "Breiter Rückenmuskel, oberer Rücken", "Bizeps, hintere Schulter",
      "Stelle die Sitzhöhe so ein, dass du die tiefen Griffe ohne Rundrücken erreichst.", "Ziehe die Griffe zur Taille und führe die Ellbogen dicht am Körper.", "Lass die Griffe langsam nach vorn zurück."],
    ["t-bar-rudern", "T-Bar-Rudern mit Brustauflage", ["Chest Supported T-Bar Row"], "T-Bar-Rudermaschine mit Brustpolster", "Oberer Rücken, breiter Rückenmuskel", "Bizeps, hintere Schulter",
      "Stelle die Füße auf die Plattform und lege die Brust auf dem Polster ab.", "Ziehe die Griffe zu den Rippen und halte die Brust abgestützt.", "Senke den Hebel kontrolliert bis zu langen Armen."],
    ["klimmzuege-unterstuetzt", "Unterstützte Klimmzüge", ["Assisted Pull-up", "Klimmzugmaschine"], "Klimmzugmaschine mit Gegenstütze", "Breiter Rückenmuskel", "Bizeps, oberer Rücken",
      "Wähle die Unterstützung und steige nach Geräteanleitung auf die Plattform oder das Polster.", "Ziehe dich an den oberen Griffen hoch, bis das Kinn ungefähr Griffhöhe erreicht.", "Senke dich kontrolliert zu langen Armen ab."],
    ["pullover", "Überzüge an der Pullover-Maschine", ["Machine Pullover"], "Pullover-Maschine", "Breiter Rückenmuskel", "Brustmuskulatur, langer Trizepskopf",
      "Stelle den Sitz ein und platziere Hände oder Ellbogen gemäß Gerätebauart.", "Führe den Hebel aus der Überkopfposition im Bogen Richtung Rumpf.", "Lass den Hebel kontrolliert in die Ausgangsstellung zurück."],
    ["rueckenstrecken", "Rückenstrecken", ["Back Extension", "Lendenstrecker"], "Rückenstreckmaschine mit Rückenpolster", "Rückenstrecker", "Gesäßmuskulatur",
      "Stelle Sitz und Rückenpolster ein und stabilisiere die Füße.", "Richte den Oberkörper gegen das Polster kontrolliert auf.", "Kehre langsam in die leicht gebeugte Ausgangslage zurück."],
  ]);
  add("Rücken und Nacken", "Kabelzug", "kz", [
    ["rudern-neutral", "Sitzendes Rudern im engen Neutralgriff", ["Close Grip Cable Row"], "Tiefer Kabelzug, Fußstütze und enger Parallelgriff", "Breiter Rückenmuskel, oberer Rücken", "Bizeps, hintere Schulter",
      "Setze dich mit leicht gebeugten Knien hin und greife mit parallelen Händen.", "Ziehe den Griff zum Bauch und halte die Ellbogen nah am Körper.", "Strecke die Arme langsam, während der Rumpf stabil bleibt."],
    ["rudern-obergriff", "Sitzendes Rudern im breiten Obergriff", ["Wide Grip Cable Row"], "Tiefer Kabelzug, Fußstütze und lange Stange", "Oberer Rücken", "Breiter Rückenmuskel, hintere Schulter, Bizeps",
      "Setze dich aufrecht hin und greife die Stange etwas breiter als schulterbreit.", "Ziehe die Stange zu den unteren Rippen und führe die Ellbogen seitlich zurück.", "Lass die Stange kontrolliert nach vorn laufen."],
    ["rudern-einarmig", "Einarmiges Rudern", ["Single Arm Cable Row"], "Kabelzug und Einzelgriff", "Breiter Rückenmuskel, oberer Rücken", "Bizeps, hintere Schulter, Rumpf",
      "Stelle die Rolle ungefähr auf Bauchhöhe und richte dich zum Kabel aus.", "Ziehe den Griff mit einer Hand Richtung Taille, während der Brustkorb nach vorn zeigt.", "Strecke den Arm langsam und wechsle dann die Seite."],
    ["latzug-einarmig", "Einarmiger Latzug", ["Single Arm Lat Pulldown"], "Hoher Kabelzug und Einzelgriff", "Breiter Rückenmuskel", "Bizeps, oberer Rücken",
      "Knie oder sitze mit langem Arm unter dem hohen Kabel.", "Ziehe den Ellbogen seitlich Richtung Hüfte und halte den Rumpf stabil.", "Strecke den Arm kontrolliert nach oben und wechsle die Seite."],
    ["latziehen-gestreckt", "Gestrecktes Latziehen", ["Straight Arm Pulldown", "Cable Pullover"], "Hoher Kabelzug und Stange oder Seil", "Breiter Rückenmuskel", "Langer Trizepskopf",
      "Tritt vor den hohen Kabelzug und neige den Oberkörper leicht nach vorn.", "Ziehe den Griff mit leicht gebeugten Ellbogen bis zu den Oberschenkeln.", "Lass den Griff im Bogen kontrolliert wieder nach oben steigen."],
  ]);
  add("Rücken und Nacken", "Multipresse", "mp", [
    ["rudern-vorgebeugt", "Vorgebeugtes Rudern", ["Smith Machine Row"], "Multipresse", "Breiter Rückenmuskel, oberer Rücken", "Bizeps, hintere Schulter, Rückenstrecker",
      "Positioniere die Stange vor den Beinen und neige dich aus der Hüfte nach vorn.", "Ziehe die ausgehakte Stange entlang der Führung Richtung Bauch.", "Senke sie bei stabilem Rumpf ab und hake sie nach dem Satz ein."],
    ["schulterheben", "Schulterheben", ["Smith Machine Shrug"], "Multipresse", "Oberer Trapezmuskel", "Schulterblattheber, Unterarme",
      "Stelle dich dicht an die Stange und halte sie vor den Oberschenkeln.", "Hebe die Schultern mit langen Armen gerade nach oben.", "Senke die Schultern langsam ab und hake die Stange nach dem Satz ein."],
  ]);

  add("Schultern", "Kurzhantel", "kh", [
    ["schulterdruecken", "Schulterdrücken", ["Dumbbell Shoulder Press", "Overhead Press"], "Zwei Kurzhanteln und Bank mit Lehne", "Vordere und seitliche Schulter", "Trizeps",
      "Setze dich aufrecht hin und halte die Hanteln seitlich auf Schulterhöhe.", "Drücke sie nach oben, während Rücken und Füße abgestützt bleiben.", "Senke die Hanteln kontrolliert auf Schulterhöhe."],
    ["arnold-press", "Arnold Press", ["Arnold-Drücken"], "Zwei Kurzhanteln und Bank mit Lehne", "Vordere und seitliche Schulter", "Trizeps",
      "Halte die Hanteln vor den Schultern mit den Handflächen zu dir.", "Öffne beim Hochdrücken die Ellbogen seitlich und drehe die Handflächen nach vorn.", "Kehre mit umgekehrter Drehung zur Startposition zurück."],
    ["seitheben", "Stehendes Seitheben", ["Dumbbell Lateral Raise", "Standing Lateral Raise", "Kurzhantel-Seitheben"], "Zwei Kurzhanteln", "Seitliche Schulter", "Oberer Trapezmuskel",
      "Stehe stabil mit den Hanteln seitlich und leicht gebeugten Ellbogen.", "Hebe die Arme seitlich bis etwa Schulterhöhe.", "Senke die Hanteln langsam ohne Schwung."],
    ["frontheben", "Frontheben", ["Dumbbell Front Raise"], "Zwei Kurzhanteln", "Vordere Schulter", "Seitliche Schulter",
      "Halte die Hanteln vor den Oberschenkeln und stabilisiere den Rumpf.", "Hebe die Arme nach vorn bis ungefähr Schulterhöhe.", "Senke die Hanteln kontrolliert, ohne dich zurückzulehnen."],
    ["reverse-flys", "Vorgebeugte Reverse Flys", ["Bent Over Reverse Fly", "Reverse Fliegende"], "Zwei Kurzhanteln", "Hintere Schulter", "Mittlerer Trapezmuskel, Rautenmuskeln",
      "Schiebe die Hüfte nach hinten und lass die Arme unter den Schultern hängen.", "Hebe die leicht gebeugten Arme seitlich in einem Bogen.", "Senke sie kontrolliert und halte die Rumpfposition."],
  ]);
  add("Schultern", "Maschine", "ma", [
    ["schulterdruecken", "Schulterdrücken", ["Machine Shoulder Press"], "Schulterpresse", "Vordere und seitliche Schulter", "Trizeps",
      "Stelle den Sitz ein, damit die Griffe etwa auf Schulterhöhe starten.", "Drücke die Griffe bei anliegendem Rücken entlang der Führung nach oben.", "Lass die Griffe kontrolliert zurücklaufen."],
    ["seitheben", "Seitheben an der Maschine", ["Lateral Raise Machine"], "Seithebemaschine", "Seitliche Schulter", "Oberer Trapezmuskel",
      "Stelle den Sitz ein und lege die Oberarme an die Polster.", "Hebe die Ellbogen seitlich bis ungefähr Schulterhöhe.", "Senke die Polster langsam, während der Oberkörper aufrecht bleibt."],
    ["reverse-butterfly", "Reverse Butterfly", ["Reverse Pec Deck", "Rear Delt Fly"], "Reverse-Butterfly-Maschine", "Hintere Schulter", "Mittlerer Trapezmuskel, Rautenmuskeln",
      "Setze dich mit der Brust zum Polster und greife etwa auf Schulterhöhe.", "Führe die Arme mit leicht gebeugten Ellbogen seitlich nach hinten.", "Führe die Griffe kontrolliert nach vorn zurück."],
  ]);
  add("Schultern", "Kabelzug", "kz", [
    ["seitheben-einarmig", "Einarmiges Seitheben", ["Single Arm Cable Lateral Raise"], "Tiefer Kabelzug und Einzelgriff", "Seitliche Schulter", "Oberer Trapezmuskel",
      "Stehe seitlich zur Rolle und greife mit der kabelabgewandten Hand.", "Hebe den leicht gebeugten Arm seitlich bis ungefähr Schulterhöhe.", "Senke den Griff langsam ab und wechsle die Seite."],
    ["frontheben", "Frontheben", ["Cable Front Raise"], "Tiefer Kabelzug und Einzelgriff", "Vordere Schulter", "Seitliche Schulter",
      "Stelle dich mit dem Rücken zum tiefen Kabel und halte den Griff neben dem Oberschenkel.", "Hebe den leicht gebeugten Arm vor dem Körper bis auf Schulterhöhe.", "Senke den Arm ohne Schwung und wechsle die Seite."],
    ["reverse-flys", "Reverse Flys", ["Cable Reverse Fly", "Rear Delt Crossover"], "Doppelter Kabelzug und zwei Einzelgriffe", "Hintere Schulter", "Mittlerer Trapezmuskel, Rautenmuskeln",
      "Stelle die Rollen etwa auf Schulterhöhe und greife über Kreuz.", "Öffne die leicht gebeugten Arme seitlich, bis sie etwa auf einer Linie mit dem Oberkörper sind.", "Führe die Hände langsam zurück vor die Brust."],
    ["face-pulls", "Face Pulls", ["Seilzug zum Gesicht"], "Kabelzug und Seilgriff", "Hintere Schulter, oberer Rücken", "Außenrotatoren der Schulter",
      "Stelle das Seil ungefähr auf Gesichtshöhe und tritt mit langen Armen zurück.", "Ziehe die Seilenden seitlich zum Gesicht und führe die Ellbogen nach außen.", "Strecke die Arme kontrolliert zurück, ohne den Rumpf zu bewegen."],
  ]);
  add("Schultern", "Multipresse", "mp", [
    ["schulterdruecken-sitzend", "Sitzendes Schulterdrücken", ["Smith Machine Shoulder Press"], "Multipresse und Bank mit aufrechter Lehne", "Vordere und seitliche Schulter", "Trizeps",
      "Positioniere die Lehne so, dass die Stange vor dem Gesicht läuft, und setze die Sicherheitsstopps.", "Senke die ausgehakte Stange bis ungefähr auf Höhe der oberen Brust.", "Drücke sie nach oben und hake sie nach dem Satz wieder ein."],
  ]);

  add("Bizeps und Unterarme", "Kurzhantel", "kh", [
    ["bizepscurls-stehend", "Stehende Bizepscurls", ["Dumbbell Biceps Curl"], "Zwei Kurzhanteln", "Bizeps", "Oberarmmuskel, Unterarme",
      "Halte die Hanteln seitlich und drehe die Handflächen nach vorn.", "Beuge die Ellbogen bei ruhigen Oberarmen.", "Strecke die Arme langsam wieder."],
    ["schraegbankcurls", "Schrägbankcurls", ["Incline Dumbbell Curl"], "Zwei Kurzhanteln und Schrägbank", "Bizeps", "Oberarmmuskel",
      "Lehne dich zurück und lass die Arme seitlich mit den Handflächen nach vorn hängen.", "Beuge die Ellbogen, während die Oberarme unter den Schultern bleiben.", "Senke die Hanteln kontrolliert bis zu langen Armen."],
    ["konzentrationscurls", "Konzentrationscurls", ["Concentration Curl"], "Eine Kurzhantel und Bank", "Bizeps", "Oberarmmuskel",
      "Setze dich breitbeinig hin und stütze die Rückseite des Oberarms am inneren Oberschenkel ab.", "Beuge den Ellbogen und ziehe die Hantel zur Schulter.", "Senke sie langsam und wechsle die Seite."],
    ["scott-curls", "Scott-Curls", ["Preacher Curl", "Dumbbell Scott Curl"], "Eine Kurzhantel und Scott-Bank", "Bizeps", "Oberarmmuskel",
      "Lege den Oberarm auf das schräge Polster und greife die Hantel im Untergriff.", "Beuge den Ellbogen, während der Oberarm aufliegt.", "Senke das Gewicht kontrolliert ohne ruckartiges Durchstrecken."],
    ["hammercurls", "Hammercurls", ["Dumbbell Hammer Curl"], "Zwei Kurzhanteln", "Oberarmmuskel, Oberarmspeichenmuskel", "Bizeps",
      "Halte die Hanteln seitlich mit den Handflächen zum Körper.", "Beuge die Ellbogen, während die Daumen nach oben zeigen.", "Senke die Hanteln mit gleichbleibendem Griff."],
    ["hammercurls-quer", "Hammercurls quer vor dem Körper", ["Cross Body Hammer Curl"], "Zwei Kurzhanteln", "Oberarmmuskel, Oberarmspeichenmuskel", "Bizeps",
      "Stehe aufrecht und halte beide Hanteln im Neutralgriff.", "Beuge einen Arm und führe die Hantel diagonal vor die gegenüberliegende Brustseite.", "Senke sie langsam ab und wiederhole die Bewegung auf der anderen Seite."],
    ["reverse-curls", "Reverse Curls", ["Dumbbell Reverse Curl", "Curls im Obergriff"], "Zwei Kurzhanteln", "Oberarmspeichenmuskel, Oberarmmuskel", "Bizeps, Handgelenkstrecker",
      "Halte die Hanteln mit den Handflächen nach unten vor dem Körper.", "Beuge die Ellbogen und halte die Handgelenke gerade.", "Strecke die Arme langsam, ohne den Griff zu drehen."],
    ["zottman-curls", "Zottman Curls", ["Zottman Curl"], "Zwei Kurzhanteln", "Bizeps, Oberarmspeichenmuskel", "Oberarmmuskel, Unterarme",
      "Beuge die Ellbogen mit den Handflächen nach oben.", "Drehe die Handflächen oben nach unten und senke die Hanteln im Obergriff.", "Drehe unten zurück in den Untergriff."],
    ["handgelenkcurls", "Handgelenkcurls", ["Dumbbell Wrist Curl"], "Kurzhanteln und Bank", "Handgelenkbeuger", "Fingerbeuger",
      "Stütze die Unterarme mit den Handflächen nach oben ab und lass die Hände über die Kante ragen.", "Beuge die Handgelenke und hebe die Hanteln an.", "Senke die Hanteln langsam, während die Unterarme aufliegen."],
    ["handgelenkcurls-umgekehrt", "Umgekehrte Handgelenkcurls", ["Reverse Wrist Curl", "Wrist Extension"], "Kurzhanteln und Bank", "Handgelenkstrecker", "",
      "Lege die Unterarme mit den Handflächen nach unten auf und lass die Hände über die Kante ragen.", "Hebe die Handrücken durch Strecken der Handgelenke.", "Senke die Hanteln langsam bei aufliegenden Unterarmen."],
  ]);
  add("Bizeps und Unterarme", "Maschine", "ma", [
    ["bizepscurls", "Bizepscurls an der Curl-Maschine", ["Machine Biceps Curl", "Machine Preacher Curl"], "Curl-Maschine mit Oberarmpolster", "Bizeps", "Oberarmmuskel",
      "Stelle die Sitzhöhe so ein, dass die Ellbogen nahe der Drehachse liegen.", "Ziehe die Griffe durch Beugen der Ellbogen heran.", "Führe die Griffe kontrolliert zurück und lass die Oberarme aufliegen."],
  ]);
  add("Bizeps und Unterarme", "Kabelzug", "kz", [
    ["bizepscurls-stange", "Bizepscurls mit Stange", ["Cable Biceps Curl"], "Tiefer Kabelzug und kurze Stange", "Bizeps", "Oberarmmuskel, Unterarme",
      "Greife die Stange im Untergriff und stelle dich aufrecht vor die tiefe Rolle.", "Beuge die Ellbogen bei ruhigen Oberarmen.", "Senke die Stange langsam bis zu langen Armen."],
    ["hammercurls-seil", "Hammercurls mit Seil", ["Rope Hammer Curl"], "Tiefer Kabelzug und Seilgriff", "Oberarmmuskel, Oberarmspeichenmuskel", "Bizeps",
      "Fasse beide Seilenden mit zueinander gerichteten Handflächen.", "Ziehe die Seilenden durch Beugen der Ellbogen nach oben.", "Lass das Seil kontrolliert zurücklaufen."],
    ["bayesian-curls", "Bayesian Curls mit Kabel hinter dem Körper", ["Behind the Body Cable Curl", "Bayesian Cable Curl"], "Tiefer Kabelzug und Einzelgriff", "Bizeps", "Oberarmmuskel",
      "Wende dich von der tiefen Rolle ab und gehe mit dem Griff einen kleinen Schritt vor.", "Beuge den Ellbogen bei ruhig gehaltenem Oberarm leicht hinter dem Rumpf.", "Strecke den Arm langsam wieder und wechsle die Seite."],
    ["reverse-curls-stange", "Reverse Curls mit Stange", ["Reverse Cable Curl"], "Tiefer Kabelzug und kurze Stange", "Oberarmspeichenmuskel, Oberarmmuskel", "Bizeps, Handgelenkstrecker",
      "Greife die Stange im Obergriff und halte die Handgelenke gerade.", "Beuge die Ellbogen bei ruhig gehaltenen Oberarmen.", "Senke die Stange langsam zurück."],
  ]);

  add("Trizeps", "Kurzhantel", "kh", [
    ["ueberkopfstrecken", "Überkopfstrecken", ["Overhead Dumbbell Triceps Extension", "French Press"], "Eine Kurzhantel und Sitzbank", "Trizeps", "",
      "Setze dich stabil hin und halte eine Kurzhantel mit beiden Händen über dem Kopf.", "Beuge die Ellbogen und senke die Hantel hinter den Kopf.", "Strecke die Ellbogen, während die Oberarme weitgehend ruhig bleiben."],
    ["trizepsstrecken-liegend", "Liegendes Trizepsstrecken", ["Dumbbell Skull Crusher", "Lying Triceps Extension"], "Zwei Kurzhanteln und Flachbank", "Trizeps", "",
      "Lege dich hin und halte die Hanteln mit langen Armen über den Schultern.", "Beuge die Ellbogen und senke die Hanteln seitlich Richtung Kopf.", "Strecke die Ellbogen wieder, während die Oberarme stabil bleiben."],
    ["kickbacks", "Kickbacks", ["Dumbbell Triceps Kickback"], "Eine Kurzhantel und Flachbank", "Trizeps", "",
      "Stütze die freie Hand auf der Bank ab und bringe den arbeitenden Oberarm neben den Rumpf.", "Strecke den Ellbogen, bis der Unterarm nach hinten zeigt.", "Beuge den Ellbogen wieder und wechsle die Seite."],
    ["bankdruecken-eng", "Enges Kurzhantel-Bankdrücken", ["Close Grip Dumbbell Press"], "Zwei Kurzhanteln und Flachbank", "Trizeps, Brustmuskulatur", "Vordere Schulter",
      "Lege dich hin und halte die Hanteln dicht nebeneinander mit parallelen Handflächen.", "Senke sie zur Brust und führe die Ellbogen nah am Rumpf.", "Drücke die Hanteln kontrolliert nach oben."],
  ]);
  add("Trizeps", "Maschine", "ma", [
    ["trizepsstrecken", "Trizepsstrecken an der Maschine", ["Machine Triceps Extension"], "Trizepsstreckmaschine mit Oberarmpolster", "Trizeps", "",
      "Stelle den Sitz ein und richte die Ellbogen an der Drehachse der Maschine aus.", "Strecke die Ellbogen und halte die Oberarme am Polster.", "Lass die Griffe kontrolliert zur Ausgangsposition zurückkehren."],
    ["dips-sitzend", "Sitzende Trizeps-Dips", ["Seated Dip Machine"], "Sitzende Dip-Maschine", "Trizeps", "Brustmuskulatur, vordere Schulter",
      "Setze dich aufrecht hin und greife die Griffe neben dem Körper.", "Drücke die Griffe nach unten und halte die Ellbogen nah am Rumpf.", "Führe die Griffe langsam nach oben zurück."],
    ["dips-unterstuetzt", "Unterstützte Dips mit Trizepsfokus", ["Assisted Dips"], "Dip-Maschine mit Gegenstütze", "Trizeps", "Brustmuskulatur, vordere Schulter",
      "Wähle die Unterstützung und steige nach Geräteanleitung auf die Gegenstütze.", "Senke dich bei aufrechtem Oberkörper durch Beugen der Ellbogen in einen angenehmen Bereich ab.", "Drücke dich kontrolliert wieder hoch."],
  ]);
  add("Trizeps", "Kabelzug", "kz", [
    ["trizepsdruecken-seil", "Trizepsdrücken mit Seil", ["Rope Pushdown"], "Hoher Kabelzug und Seilgriff", "Trizeps", "",
      "Greife beide Seilenden und halte die Ellbogen dicht am Rumpf.", "Strecke die Ellbogen und führe die Seilenden unten leicht auseinander.", "Lass die Unterarme langsam wieder ansteigen."],
    ["trizepsdruecken-stange", "Trizepsdrücken mit Stange", ["Cable Pushdown", "Straight Bar Pushdown"], "Hoher Kabelzug und kurze Stange", "Trizeps", "",
      "Greife die Stange im Obergriff und beuge die Ellbogen nah am Rumpf.", "Drücke die Stange durch Strecken der Ellbogen nach unten.", "Lass die Stange kontrolliert zurücklaufen."],
    ["trizepsdruecken-einarmig", "Einarmiges Trizepsdrücken", ["Single Arm Pushdown"], "Hoher Kabelzug und Einzelgriff", "Trizeps", "",
      "Greife einhändig und halte den Ellbogen seitlich am Oberkörper.", "Drücke den Griff nach unten, bis der Arm lang ist.", "Beuge den Ellbogen kontrolliert und wechsle die Seite."],
    ["trizepsstrecken-ueberkopf", "Überkopf-Trizepsstrecken", ["Cable Overhead Triceps Extension"], "Kabelzug und Seilgriff", "Trizeps", "",
      "Drehe dich mit dem Seil vom Kabelzug weg und nimm einen Schrittstand ein.", "Halte die Oberarme nahe am Kopf und strecke die Ellbogen nach vorn oben.", "Beuge die Ellbogen langsam und führe das Seil hinter den Kopf zurück."],
    ["kickbacks-einarmig", "Einarmige Kickbacks", ["Cable Triceps Kickback"], "Tiefer Kabelzug und Einzelgriff", "Trizeps", "",
      "Neige den Oberkörper nach vorn und halte den arbeitenden Oberarm neben dem Rumpf.", "Strecke den Ellbogen gegen den Kabelzug nach hinten.", "Führe den Unterarm kontrolliert zurück und wechsle die Seite."],
  ]);
  add("Trizeps", "Multipresse", "mp", [
    ["bankdruecken-eng", "Enges Bankdrücken", ["Smith Machine Close Grip Bench Press"], "Multipresse und Flachbank", "Trizeps, Brustmuskulatur", "Vordere Schulter",
      "Richte die Bank aus, setze die Sicherheitsstopps und greife etwa schulterbreit.", "Senke die ausgehakte Stange zur unteren Brust und halte die Ellbogen nah am Rumpf.", "Drücke die Stange hoch und hake sie nach dem Satz ein."],
  ]);

  add("Beine und Gesäß", "Kurzhantel", "kh", [
    ["goblet-squats", "Goblet Squats", ["Kelchkniebeugen", "Goblet Squat"], "Eine Kurzhantel", "Vordere Oberschenkel, Gesäß", "Adduktoren, Rumpf",
      "Halte eine Hantel mit beiden Händen dicht vor der Brust.", "Beuge Knie und Hüfte und halte die Füße ganz auf dem Boden.", "Drücke dich über beide Füße zurück in den Stand."],
    ["kniebeugen-seitlich", "Kniebeugen mit zwei Kurzhanteln an den Seiten", ["Dumbbell Squat", "Suitcase Squat"], "Zwei Kurzhanteln", "Vordere Oberschenkel, Gesäß", "Adduktoren, Rumpf",
      "Halte beide Hanteln seitlich und stelle die Füße stabil auf.", "Beuge Hüfte und Knie und lass die Hanteln neben den Beinen sinken.", "Strecke Knie und Hüfte und richte dich wieder auf."],
    ["sumo-kniebeugen", "Sumo-Kniebeugen", ["Dumbbell Sumo Squat"], "Eine Kurzhantel", "Vordere Oberschenkel, Gesäß, Adduktoren", "Rumpf",
      "Stelle die Füße breit mit leicht nach außen gerichteten Zehen auf und halte die Hantel zwischen den Beinen.", "Senke die Hüfte und lass die Knie in Richtung der Zehen folgen.", "Drücke dich über beide Füße zurück nach oben."],
    ["ausfallschritte-vorwaerts", "Ausfallschritte vorwärts", ["Forward Dumbbell Lunge"], "Zwei Kurzhanteln und freie Bodenfläche", "Vordere Oberschenkel, Gesäß", "Adduktoren, Rumpf",
      "Halte die Hanteln seitlich und setze einen Fuß nach vorn.", "Beuge beide Knie und senke das hintere Knie Richtung Boden.", "Drücke dich über den vorderen Fuß in die Ausgangsstellung zurück."],
    ["ausfallschritte-rueckwaerts", "Ausfallschritte rückwärts", ["Reverse Dumbbell Lunge"], "Zwei Kurzhanteln und freie Bodenfläche", "Vordere Oberschenkel, Gesäß", "Adduktoren, Rumpf",
      "Halte die Hanteln seitlich und setze einen Fuß nach hinten.", "Senke das hintere Knie, während der vordere Fuß voll aufliegt.", "Drücke dich über den vorderen Fuß hoch und hole das hintere Bein zurück."],
    ["ausfallschritte-gehend", "Gehende Ausfallschritte", ["Walking Lunges"], "Zwei Kurzhanteln und freie Laufstrecke", "Vordere Oberschenkel, Gesäß", "Adduktoren, Rumpf",
      "Halte die Hanteln seitlich und mache einen Schritt nach vorn.", "Senke das hintere Knie durch Beugen beider Beine.", "Drücke dich hoch und führe das hintere Bein direkt in den nächsten Schritt."],
    ["ausfallschritte-seitlich", "Seitliche Ausfallschritte", ["Lateral Lunge", "Side Lunge"], "Kurzhantel und freie Bodenfläche", "Gesäß, vordere Oberschenkel, Adduktoren", "Rumpf",
      "Halte die Hantel vor der Brust und mache einen breiten Schritt zur Seite.", "Beuge das Standbein und schiebe die Hüfte zurück, während das andere Bein lang bleibt.", "Drücke dich über das gebeugte Bein zurück zur Mitte."],
    ["bulgarian-split-squats", "Bulgarian Split Squats", ["Bulgarische Kniebeugen", "Rear Foot Elevated Split Squat"], "Zwei Kurzhanteln und stabile Bank", "Vordere Oberschenkel, Gesäß", "Adduktoren, Rumpf",
      "Stelle dich vor die Bank und lege den hinteren Fuß auf die Bank.", "Beuge das vordere Bein und senke das hintere Knie Richtung Boden.", "Drücke dich über den vorderen Fuß hoch und wechsle nach dem Satz die Seite."],
    ["step-ups", "Step-ups", ["Aufsteigen", "Dumbbell Step Up"], "Zwei Kurzhanteln und stabile Trainingsbox", "Vordere Oberschenkel, Gesäß", "Hintere Oberschenkel, Rumpf",
      "Stelle einen Fuß vollständig auf die Box und halte die Hanteln seitlich.", "Drücke dich mit dem oberen Bein in den Stand auf der Box.", "Steige kontrolliert zurück und wechsle bei Bedarf die Seite."],
    ["rumaenisches-kreuzheben", "Rumänisches Kreuzheben", ["RDL", "Dumbbell Romanian Deadlift"], "Zwei Kurzhanteln", "Hintere Oberschenkel, Gesäß", "Rückenstrecker, Unterarme",
      "Halte die Hanteln vor den Oberschenkeln und beuge die Knie leicht.", "Schiebe die Hüfte zurück und führe die Hanteln dicht an den Beinen nach unten.", "Strecke die Hüfte wieder, sobald du deutliche Spannung in den hinteren Oberschenkeln spürst."],
    ["rumaenisches-kreuzheben-einbeinig", "Einbeiniges rumänisches Kreuzheben", ["Single Leg RDL", "Einbeiniger Romanian Deadlift"], "Eine oder zwei Kurzhanteln", "Hintere Oberschenkel, Gesäß", "Rückenstrecker, seitliche Hüfte",
      "Verlagere das Gewicht auf ein leicht gebeugtes Standbein.", "Schiebe die Hüfte zurück und strecke das freie Bein nach hinten, während das Becken zum Boden zeigt.", "Richte dich über die Hüfte wieder auf und wechsle die Seite."],
    ["hip-thrusts", "Hip Thrusts", ["Dumbbell Hip Thrust", "Hüftstoßen"], "Eine Kurzhantel, Polster und stabile Bank", "Gesäßmuskulatur", "Hintere Oberschenkel",
      "Stütze den oberen Rücken an der Bank ab und sichere die gepolsterte Hantel in der Hüftbeuge.", "Drücke die Hüfte nach oben, bis Rumpf und Oberschenkel ungefähr eine Linie bilden.", "Senke die Hüfte langsam wieder ab."],
    ["glute-bridges", "Glute Bridges", ["Dumbbell Glute Bridge", "Gesäßbrücke"], "Eine Kurzhantel, Polster und Matte", "Gesäßmuskulatur", "Hintere Oberschenkel",
      "Lege dich auf den Rücken, stelle die Füße auf und halte die Hantel gepolstert auf der Hüfte fest.", "Drücke die Hüfte nach oben, bis Schultern, Hüfte und Knie eine Linie bilden.", "Senke das Becken kontrolliert zur Matte zurück."],
  ]);
  add("Beine und Gesäß", "Maschine", "ma", [
    ["beinpresse-45", "45-Grad-Beinpresse", ["45 Degree Leg Press", "Schräge Beinpresse"], "45-Grad-Beinpresse mit Schlitten", "Vordere Oberschenkel, Gesäß", "Adduktoren",
      "Lehne dich an, stelle die Füße voll auf die Plattform und löse die Sicherung nach Geräteanleitung.", "Beuge die Knie so weit, wie das Becken am Polster bleibt.", "Drücke den Schlitten kontrolliert hoch und sichere ihn nach dem Satz."],
    ["beinpresse-horizontal", "Horizontale Beinpresse", ["Horizontal Leg Press"], "Horizontale Beinpresse", "Vordere Oberschenkel, Gesäß", "Adduktoren",
      "Stelle Sitz oder Lehne ein und setze beide Füße auf die Plattform.", "Drücke dich von der Plattform weg, während Rücken und Becken abgestützt bleiben.", "Beuge die Knie kontrolliert zurück bis zur eingestellten Ausgangslage."],
    ["beinpresse-einbeinig", "Einbeinige Beinpresse", ["Single Leg Press"], "Für einbeinige Nutzung geeignete Beinpresse", "Vordere Oberschenkel, Gesäß", "Adduktoren",
      "Setze einen Fuß voll auf die Plattform und positioniere das freie Bein außerhalb der Bewegungsbahn.", "Drücke die Plattform mit dem Arbeitsbein weg und halte das Becken gerade.", "Beuge das Knie kontrolliert und wechsle nach dem Satz die Seite."],
    ["hackenschmidt-kniebeugen", "Hackenschmidt-Kniebeugen", ["Hack Squats", "Hackenschmidt"], "Hack-Squat-Maschine", "Vordere Oberschenkel, Gesäß", "Adduktoren",
      "Stelle dich auf die Plattform und lege Rücken und Schultern an die Polster.", "Löse die Sicherung nach Geräteanleitung und beuge Knie und Hüfte.", "Drücke dich über die ganze Fußsohle hoch und sichere den Schlitten nach dem Satz."],
    ["pendulum-squats", "Pendulum Squats", ["Pendelkniebeugen"], "Pendulum-Squat-Maschine", "Vordere Oberschenkel, Gesäß", "Adduktoren",
      "Stelle die Füße auf die Plattform und positioniere dich unter den Schulterpolstern.", "Löse die Gerätesicherung und senke dich kontrolliert entlang der Pendelbahn.", "Drücke dich über die Füße hoch und raste die Sicherung nach dem Satz ein."],
    ["belt-squats", "Belt Squats", ["Gürtelkniebeugen"], "Belt-Squat-Maschine und passender Hüftgurt", "Vordere Oberschenkel, Gesäß", "Adduktoren",
      "Lege den Gurt um die Hüfte und verbinde ihn nach Geräteanleitung mit der Last.", "Stelle dich stabil auf und beuge Hüfte und Knie.", "Drücke dich wieder hoch und sichere die Last vor dem Aushängen."],
    ["beinstrecken", "Beinstrecken", ["Leg Extension", "Beinstrecker"], "Beinstrecker-Maschine", "Vordere Oberschenkel", "",
      "Richte die Knie an der Drehachse aus und positioniere das Polster über den Fußgelenken.", "Strecke die Knie kontrolliert, während Rücken und Oberschenkel abgestützt bleiben.", "Lass das Polster langsam zurücklaufen."],
    ["beinbeuger-sitzend", "Sitzende Beinbeuger", ["Seated Leg Curl"], "Sitzende Beinbeugermaschine", "Hintere Oberschenkel", "Wadenmuskulatur",
      "Richte die Knie an der Drehachse aus, fixiere die Oberschenkel und platziere die Unterschenkel am Rollenpolster.", "Beuge die Knie und ziehe die Rolle nach unten und hinten.", "Strecke die Knie kontrolliert wieder."],
    ["beinbeuger-liegend", "Liegende Beinbeuger", ["Lying Leg Curl", "Prone Leg Curl"], "Liegende Beinbeugermaschine", "Hintere Oberschenkel", "Wadenmuskulatur",
      "Lege dich bäuchlings auf das Polster und positioniere die Rolle hinten knapp oberhalb der Fersen.", "Beuge die Knie, während das Becken auf dem Polster bleibt.", "Senke die Rolle langsam wieder ab."],
    ["beinbeuger-stehend-einbeinig", "Stehende einbeinige Beinbeuger", ["Standing Single Leg Curl"], "Stehende Beinbeugermaschine", "Hintere Oberschenkel", "Wadenmuskulatur",
      "Stütze dich an der Maschine ab und positioniere das Rollenpolster am hinteren Unterschenkel.", "Beuge das arbeitende Knie und ziehe die Ferse Richtung Gesäß.", "Senke das Bein kontrolliert und wechsle die Seite."],
    ["hueftabduktion", "Hüftabduktion", ["Abduktorenmaschine", "Hip Abduction"], "Hüftabduktionsmaschine", "Seitliche Gesäßmuskulatur", "Hüftmuskulatur",
      "Setze dich hin und positioniere die Polster außen an den Oberschenkeln.", "Drücke die Oberschenkel auseinander, während der Oberkörper ruhig bleibt.", "Führe die Beine langsam wieder zusammen."],
    ["hueftadduktion", "Hüftadduktion", ["Adduktorenmaschine", "Hip Adduction"], "Hüftadduktionsmaschine", "Adduktoren", "",
      "Positioniere die Polster an den Innenseiten der Oberschenkel und wähle eine angenehme Startweite.", "Führe die Beine gegen den Widerstand zusammen.", "Lass sie langsam wieder öffnen."],
    ["glute-kickbacks", "Glute Kickbacks", ["Machine Glute Kickback", "Gesäßstrecken"], "Glute-Kickback-Maschine", "Gesäßmuskulatur", "Hintere Oberschenkel",
      "Stütze den Oberkörper nach Bauart ab und platziere den Arbeitsfuß am Hebel oder Polster.", "Drücke das Bein aus der Hüfte nach hinten, während das Becken ruhig bleibt.", "Kehre kontrolliert zurück und wechsle die Seite."],
    ["hip-thrusts", "Hip Thrusts an der Glute-Drive-Maschine", ["Machine Hip Thrust", "Glute Drive", "Hüftstoßen"], "Hip-Thrust-Maschine mit Hüftpolster oder Gurt", "Gesäßmuskulatur", "Hintere Oberschenkel",
      "Stelle die Füße auf die Plattform und fixiere das Hüftpolster oder den Gurt nach Geräteanleitung.", "Drücke die Hüfte nach oben, bis Rumpf und Oberschenkel ungefähr eine Linie bilden.", "Senke die Hüfte kontrolliert und sichere das Gerät nach dem Satz."],
  ]);
  add("Beine und Gesäß", "Kabelzug", "kz", [
    ["pull-throughs", "Pull-throughs", ["Cable Pull Through", "Hüftstrecken am Kabel"], "Tiefer Kabelzug und Seilgriff", "Gesäß, hintere Oberschenkel", "Rückenstrecker, Rumpf",
      "Stelle dich vom Kabel weg und führe das Seil zwischen den Beinen nach vorn.", "Schiebe die Hüfte mit leicht gebeugten Knien nach hinten und lass das Seil zurücklaufen.", "Strecke die Hüfte, bis du aufrecht stehst."],
    ["glute-kickbacks", "Glute Kickbacks", ["Cable Glute Kickback", "Hüftstrecken"], "Tiefer Kabelzug und Fußmanschette", "Gesäßmuskulatur", "Hintere Oberschenkel",
      "Befestige die Manschette am Knöchel und halte dich mit Blick zur Rolle fest.", "Führe das Arbeitsbein aus der Hüfte nach hinten und halte das Becken gerade.", "Führe das Bein langsam zurück und wechsle die Seite."],
    ["hueftabduktion", "Hüftabduktion", ["Cable Hip Abduction", "Abduktoren"], "Tiefer Kabelzug und Fußmanschette", "Seitliche Gesäßmuskulatur", "Hüftmuskulatur",
      "Stelle dich seitlich zur Rolle und befestige die Manschette am kabelabgewandten Bein.", "Führe das Bein seitlich von der Rolle weg, ohne den Rumpf zu neigen.", "Kehre kontrolliert zur Mitte zurück und wechsle die Seite."],
    ["hueftadduktion", "Hüftadduktion", ["Cable Hip Adduction", "Adduktoren"], "Tiefer Kabelzug und Fußmanschette", "Adduktoren", "",
      "Stelle dich seitlich zur Rolle und befestige die Manschette am kabelnahen Bein.", "Führe das Bein vor dem Standbein zur Körpermitte und halte das Becken gerade.", "Lass das Bein langsam zurück und wechsle die Seite."],
  ]);
  add("Beine und Gesäß", "Multipresse", "mp", [
    ["kniebeugen", "Kniebeugen", ["Smith Machine Squat"], "Multipresse", "Vordere Oberschenkel, Gesäß", "Adduktoren, Rumpf",
      "Positioniere die Stange am oberen Rücken, richte die Füße aus und setze die Sicherheitsstopps.", "Hake die Stange aus und beuge Knie und Hüfte mit festem Fußkontakt.", "Drücke dich in den Stand und hake die Stange nach dem Satz ein."],
    ["frontkniebeugen", "Frontkniebeugen", ["Smith Machine Front Squat"], "Multipresse", "Vordere Oberschenkel, Gesäß", "Oberer Rücken, Rumpf",
      "Positioniere die Stange vorne auf den Schultern und stelle die Sicherheitsstopps ein.", "Hake die Stange aus und senke dich mit hoch gehaltenen Ellbogen ab.", "Drücke dich über die Füße hoch und hake die Stange nach dem Satz ein."],
    ["split-squats", "Split Squats", ["Smith Machine Split Squat", "Stationärer Ausfallschritt"], "Multipresse", "Vordere Oberschenkel, Gesäß", "Adduktoren, Rumpf",
      "Lege die Stange am oberen Rücken ab, setze die Sicherheitsstopps und nimm einen Schrittstand ein.", "Beuge beide Knie, bis das hintere Knie Richtung Boden zeigt.", "Drücke dich über den vorderen Fuß hoch und sichere die Stange vor dem Seitenwechsel."],
    ["ausfallschritte-rueckwaerts", "Rückwärtige Ausfallschritte", ["Smith Machine Reverse Lunge"], "Multipresse", "Vordere Oberschenkel, Gesäß", "Adduktoren, Rumpf",
      "Stelle die Sicherheitsstopps ein und platziere die Stange am oberen Rücken.", "Setze einen Fuß nach hinten und senke das hintere Knie Richtung Boden.", "Drücke dich über den vorderen Fuß hoch und hole den hinteren Fuß zurück."],
    ["rumaenisches-kreuzheben", "Rumänisches Kreuzheben", ["RDL", "Smith Machine Romanian Deadlift"], "Multipresse", "Hintere Oberschenkel, Gesäß", "Rückenstrecker, Unterarme",
      "Richte dich dicht an der Stange aus und halte die Knie leicht gebeugt.", "Schiebe die Hüfte zurück und senke die ausgehakte Stange dicht an den Beinen ab.", "Strecke die Hüfte kontrolliert und hake die Stange nach dem Satz ein."],
    ["hip-thrusts", "Hip Thrusts", ["Smith Machine Hip Thrust", "Hüftstoßen"], "Multipresse, gesicherte Bank und Stangenpolster", "Gesäßmuskulatur", "Hintere Oberschenkel",
      "Sichere die Bank, positioniere den oberen Rücken daran und polstere die Stange über der Hüftbeuge.", "Setze die Sicherheitsstopps und drücke nach dem Aushaken die Hüfte nach oben.", "Senke die Hüfte kontrolliert und hake die Stange nach dem Satz ein."],
  ]);

  add("Waden", "Kurzhantel", "kh", [
    ["wadenheben-stehend", "Stehendes Wadenheben", ["Standing Dumbbell Calf Raise"], "Zwei Kurzhanteln und ebener Boden", "Wadenmuskulatur", "",
      "Stehe aufrecht mit den Hanteln seitlich und dem Gewicht gleichmäßig auf beiden Füßen.", "Hebe beide Fersen und drücke dich über die Fußballen nach oben.", "Senke die Fersen langsam bis zum Boden."],
    ["wadenheben-einbeinig", "Einbeiniges Wadenheben", ["Single Leg Dumbbell Calf Raise"], "Eine Kurzhantel und feste Stütze", "Wadenmuskulatur", "",
      "Halte eine Hantel und stütze dich mit der freien Hand ab.", "Verlagere das Gewicht auf ein Bein und hebe dessen Ferse an.", "Senke die Ferse kontrolliert und wechsle die Seite."],
    ["wadenheben-sitzend", "Sitzendes Wadenheben mit Hanteln auf den Oberschenkeln", ["Seated Dumbbell Calf Raise"], "Kurzhanteln und Sitzbank", "Schollenmuskel", "Zwillingswadenmuskel",
      "Setze dich hin und halte die Hanteln knapp oberhalb der Knie auf den Oberschenkeln fest.", "Hebe die Fersen an, während die Fußballen am Boden bleiben.", "Senke die Fersen langsam wieder ab."],
  ]);
  add("Waden", "Maschine", "ma", [
    ["wadenheben-stehend", "Stehendes Wadenheben", ["Standing Machine Calf Raise"], "Stehende Wadenhebemaschine", "Wadenmuskulatur", "",
      "Stelle die Fußballen auf die Plattform und positioniere die Schultern unter den Polstern.", "Hebe die Fersen bei weitgehend gestreckten Knien.", "Senke die Fersen langsam bis zur angenehmen Dehnung."],
    ["wadenheben-sitzend", "Sitzendes Wadenheben", ["Seated Machine Calf Raise"], "Sitzende Wadenhebemaschine", "Schollenmuskel", "Zwillingswadenmuskel",
      "Stelle die Fußballen auf die Plattform und positioniere die Polster auf den Oberschenkeln.", "Löse die Gerätesicherung und drücke die Fersen nach oben.", "Senke die Fersen kontrolliert und sichere den Hebel nach dem Satz."],
    ["wadenpressen", "Wadenpressen an der Beinpresse", ["Leg Press Calf Raise", "Calf Press"], "Für Wadenpressen geeignete Beinpresse", "Wadenmuskulatur", "",
      "Stelle die Fußballen gemäß Geräteanleitung rutschfest auf den unteren Plattformbereich.", "Drücke über die Fußballen und halte die Knie leicht gebeugt und ruhig.", "Lass die Fersen langsam zurückgehen, während die Fußballen Kontakt behalten."],
  ]);
  add("Waden", "Multipresse", "mp", [
    ["wadenheben-stehend", "Stehendes Wadenheben", ["Smith Machine Calf Raise"], "Multipresse und feste rutschfeste Erhöhung", "Wadenmuskulatur", "",
      "Stelle die Fußballen auf die Erhöhung, positioniere die Stange am oberen Rücken und setze die Sicherheitsstopps.", "Hake die Stange aus und hebe die Fersen bei ruhigen Knien an.", "Senke die Fersen kontrolliert und hake die Stange nach dem Satz ein."],
  ]);

  add("Bauch und Rumpf", "Kurzhantel", "kh", [
    ["crunches", "Crunches mit Gewicht", ["Weighted Dumbbell Crunch"], "Eine Kurzhantel und Matte", "Gerader Bauchmuskel", "Schräge Bauchmuskeln",
      "Lege dich mit aufgestellten Füßen hin und halte die Hantel dicht an die Brust.", "Rolle die Schulterblätter vom Boden ab und führe die Rippen zum Becken.", "Senke den Oberkörper langsam zurück auf die Matte."],
    ["rumpfbeugen-seitlich", "Seitliches Rumpfbeugen", ["Dumbbell Side Bend"], "Eine Kurzhantel", "Schräge Bauchmuskeln, quadratischer Lendenmuskel", "",
      "Halte die Hantel seitlich in einer Hand und stelle beide Füße stabil auf.", "Neige den Rumpf seitlich zur Hantelseite und halte Becken und Schultern nach vorn gerichtet.", "Richte dich kontrolliert zur Mitte auf und wechsle die Seite."],
    ["farmers-walk", "Farmer’s Walk mit zwei Hanteln", ["Farmers Walk", "Farmer Carry", "Farmers Carry"], "Zwei Kurzhanteln und freie Laufstrecke", "Rumpf, Griffmuskulatur", "Oberer Trapezmuskel, Beine",
      "Nimm je eine Hantel auf und richte dich mit langen Armen auf.", "Gehe mit gleichmäßigen Schritten und halte den Oberkörper ruhig.", "Halte an und setze beide Hanteln kontrolliert ab."],
    ["suitcase-carry", "Suitcase Carry mit einer Hantel", ["Einseitiges Tragen", "Koffertragen"], "Eine Kurzhantel und freie Laufstrecke", "Schräge Bauchmuskeln, Griffmuskulatur", "Oberer Trapezmuskel, Beine",
      "Nimm die Hantel in eine Hand und stelle den Oberkörper aufrecht ein.", "Gehe mit gleichmäßigen Schritten und halte beide Schultern auf gleicher Höhe.", "Setze die Hantel ab und wiederhole den Weg mit der anderen Hand."],
  ]);
  add("Bauch und Rumpf", "Maschine", "ma", [
    ["bauchcrunches", "Bauchcrunches", ["Ab Crunch Machine"], "Bauchcrunch-Maschine", "Gerader Bauchmuskel", "Schräge Bauchmuskeln",
      "Stelle Sitz und Polster ein und setze dich stabil ins Gerät.", "Rolle den Oberkörper ein, indem du die Rippen zum Becken führst.", "Richte dich kontrolliert in die Ausgangsstellung zurück."],
    ["rumpfrotation", "Rumpfrotation", ["Torso Rotation Machine", "Rotary Torso"], "Rumpfrotationsmaschine", "Schräge Bauchmuskeln", "Tiefere Rumpfmuskulatur",
      "Stelle Polster und Startwinkel so ein, dass du bequem im Gerät sitzt.", "Drehe den beweglichen Geräteteil kontrolliert über den Rumpf.", "Kehre langsam zurück und stelle das Gerät für die Gegenseite um."],
  ]);
  add("Bauch und Rumpf", "Kabelzug", "kz", [
    ["crunches-kniend", "Kniende Cable Crunches", ["Kabelcrunches", "Kneeling Cable Crunch"], "Hoher Kabelzug, Seilgriff und Matte", "Gerader Bauchmuskel", "Schräge Bauchmuskeln",
      "Knie vor der Rolle und halte die Seilenden seitlich am Kopf.", "Rolle den Oberkörper ein, indem du die Rippen zum Becken ziehst.", "Richte den Rumpf langsam wieder auf und halte die Hüfte weitgehend ruhig."],
    ["pallof-press", "Pallof Press", ["Anti-Rotation Press"], "Kabelzug und Einzelgriff", "Schräge Bauchmuskeln, tiefe Rumpfmuskulatur", "Schultergürtel",
      "Stelle dich seitlich zur Rolle und halte den Griff mit beiden Händen vor der Brust.", "Strecke die Arme nach vorn und widerstehe der Drehung zur Rolle.", "Ziehe den Griff zur Brust zurück und wechsle die Seite."],
    ["woodchops-oben-unten", "Woodchops von oben nach unten", ["High to Low Cable Chop", "Kabel-Holzhacker"], "Hoher Kabelzug und Einzelgriff", "Schräge Bauchmuskeln", "Schultergürtel, Gesäß",
      "Stelle dich seitlich zur hohen Rolle und greife mit beiden Händen.", "Führe den Griff diagonal zur gegenüberliegenden Hüfte und lass Hüfte und Füße mitdrehen.", "Kehre kontrolliert zurück und wechsle die Seite."],
    ["woodchops-unten-oben", "Woodchops von unten nach oben", ["Low to High Cable Chop", "Cable Lift"], "Tiefer Kabelzug und Einzelgriff", "Schräge Bauchmuskeln", "Schultergürtel, Gesäß",
      "Stelle dich seitlich zur tiefen Rolle und greife mit beiden Händen nahe der Hüfte.", "Führe den Griff diagonal zur gegenüberliegenden Schulter und drehe dich kontrolliert mit.", "Senke den Griff auf derselben Bahn und wechsle die Seite."],
  ]);

  add("Brust", "Langhantel", "lh", [
    ["bankdruecken", "Langhantel-Bankdrücken", ["Barbell Bench Press"], "Langhantel, Flachbank und Rack mit Sicherheitsablagen", "Brustmuskulatur", "Trizeps, vordere Schulter",
      "Richte Bank und Sicherheitsablagen ein und stelle beide Füße fest auf.", "Senke die Stange kontrolliert zur Brust.", "Drücke sie nach oben und lege sie nach dem Satz ab."],
    ["schraegbankdruecken", "Langhantel-Schrägbankdrücken", ["Incline Barbell Bench Press"], "Langhantel, Schrägbank und Rack mit Sicherheitsablagen", "Brustmuskulatur", "Vordere Schulter, Trizeps",
      "Stelle die Lehne schräg und richte die Sicherheitsablagen ein.", "Senke die Stange kontrolliert Richtung obere Brust.", "Drücke sie wieder nach oben und lege sie nach dem Satz ab."],
  ]);
  add("Rücken und Nacken", "Langhantel", "lh", [
    ["rudern", "Vorgebeugtes Langhantelrudern", ["Barbell Row"], "Langhantel", "Oberer Rücken, breiter Rückenmuskel", "Bizeps, Rückenstrecker",
      "Schiebe die Hüfte zurück und halte den Rumpf stabil.", "Ziehe die Stange zu den unteren Rippen.", "Strecke die Arme kontrolliert und halte die Rumpfposition."],
  ]);
  add("Schultern", "Langhantel", "lh", [
    ["schulterdruecken", "Stehendes Langhantel-Schulterdrücken", ["Overhead Press", "Military Press"], "Langhantel und Rack", "Vordere und seitliche Schulter", "Trizeps, Rumpf",
      "Halte die Stange vor den Schultern und stabilisiere den Rumpf.", "Drücke die Stange dicht am Kopf vorbei nach oben.", "Führe die Stange kontrolliert zu den Schultern zurück."],
  ]);
  add("Bizeps und Unterarme", "Langhantel", "lh", [
    ["bizepscurls", "Langhantel-Curls", ["Barbell Curl"], "Langhantel", "Bizeps", "Oberarmmuskel, Unterarme",
      "Greife die Stange im Untergriff und halte die Ellbogen seitlich.", "Beuge die Ellbogen bei stabilem Oberkörper.", "Senke die Stange langsam in die Ausgangslage."],
  ]);
  add("Trizeps", "Langhantel", "lh", [
    ["bankdruecken-eng", "Enges Langhantel-Bankdrücken", ["Close Grip Barbell Bench Press"], "Langhantel, Flachbank und Rack mit Sicherheitsablagen", "Trizeps, Brustmuskulatur", "Vordere Schulter",
      "Richte die Sicherheitsablagen ein und greife etwa schulterbreit.", "Senke die Stange zur Brust und führe die Ellbogen nah am Körper.", "Drücke die Stange hoch und lege sie nach dem Satz ab."],
  ]);
  add("Beine und Gesäß", "Langhantel", "lh", [
    ["kniebeugen", "Langhantel-Kniebeugen", ["Back Squat"], "Langhantel und Rack mit Sicherheitsablagen", "Vordere Oberschenkel, Gesäß", "Rumpf, Adduktoren",
      "Stelle die Sicherheitsablagen ein und platziere die Stange auf dem oberen Rücken.", "Beuge Hüfte und Knie bei festem Bodenkontakt.", "Richte dich kontrolliert auf und lege die Stange nach dem Satz ab."],
    ["frontkniebeugen", "Langhantel-Frontkniebeugen", ["Front Squat"], "Langhantel und Rack mit Sicherheitsablagen", "Vordere Oberschenkel, Gesäß", "Oberer Rücken, Rumpf",
      "Stelle die Sicherheitsablagen ein und trage die Stange vorn auf den Schultern.", "Beuge Knie und Hüfte mit angehobenen Ellbogen.", "Drücke dich über beide Füße nach oben."],
    ["rumaenisches-kreuzheben", "Rumänisches Langhantel-Kreuzheben", ["Barbell RDL", "Romanian Deadlift"], "Langhantel", "Hintere Oberschenkel, Gesäß", "Rückenstrecker, Unterarme",
      "Halte die Stange vor den Oberschenkeln bei leicht gebeugten Knien.", "Schiebe die Hüfte zurück und führe die Stange dicht an den Beinen nach unten.", "Strecke die Hüfte kontrolliert bis in den Stand."],
    ["hip-thrusts", "Langhantel-Hip-Thrusts", ["Barbell Hip Thrust"], "Langhantel, Stangenpolster und stabile Bank", "Gesäßmuskulatur", "Hintere Oberschenkel",
      "Stütze den oberen Rücken an der Bank ab und polstere die Stange in der Hüftbeuge.", "Drücke die Hüfte nach oben, bis Rumpf und Oberschenkel etwa eine Linie bilden.", "Senke die Hüfte kontrolliert wieder ab."],
  ]);
  add("Brust", "Körpergewicht", "kg", [
    ["liegestuetz", "Liegestütze", ["Push-up", "Pushups"], "Ebener Boden", "Brustmuskulatur", "Trizeps, vordere Schulter",
      "Setze die Hände etwas breiter als schulterbreit auf und halte den Körper gerade.", "Senke die Brust kontrolliert Richtung Boden.", "Drücke dich mit stabilem Rumpf hoch."],
    ["liegestuetz-erhoeht", "Liegestütze mit erhöhten Händen", ["Incline Push-up"], "Stabile Bank oder erhöhte feste Ablage", "Brustmuskulatur", "Trizeps, vordere Schulter",
      "Stütze beide Hände auf der festen erhöhten Fläche ab.", "Beuge die Ellbogen und senke die Brust zur Ablage.", "Drücke dich nach oben und halte Rumpf und Hüfte stabil."],
  ]);
  add("Rücken und Nacken", "Körpergewicht", "kg", [
    ["klimmzuege", "Klimmzüge", ["Pull-up", "Pullups"], "Klimmzugstange", "Breiter Rückenmuskel", "Bizeps, oberer Rücken",
      "Greife die Stange im Obergriff und starte mit langen Armen.", "Ziehe die Ellbogen nach unten, bis das Kinn etwa auf Höhe der Stange ist.", "Senke dich kontrolliert ab."],
    ["rudern", "Umgekehrtes Rudern", ["Inverted Row", "Australian Pull-up"], "Sicher fixierte Stange auf niedriger Höhe", "Oberer Rücken, breiter Rückenmuskel", "Bizeps, hintere Schulter",
      "Greife die Stange von unten und stelle die Füße stabil auf.", "Ziehe die Brust zur Stange und halte den Rumpf gerade.", "Strecke die Arme kontrolliert."],
  ]);
  add("Schultern", "Körpergewicht", "kg", [
    ["pike-pushups", "Pike-Liegestütze", ["Pike Push-up"], "Ebener Boden", "Vordere Schulter", "Trizeps, oberer Brustmuskel",
      "Stütze Hände und Füße auf und schiebe die Hüfte nach oben.", "Beuge die Ellbogen und senke den Kopf kontrolliert Richtung Boden.", "Drücke dich wieder hoch."],
  ]);
  add("Trizeps", "Körpergewicht", "kg", [
    ["liegestuetz-eng", "Enge Liegestütze", ["Close Grip Push-up"], "Ebener Boden", "Trizeps, Brustmuskulatur", "Vordere Schulter",
      "Setze die Hände ungefähr schulterbreit auf und stabilisiere den Rumpf.", "Senke die Brust und führe die Ellbogen nah am Körper.", "Drücke dich kontrolliert zurück in den Stütz."],
  ]);
  add("Beine und Gesäß", "Körpergewicht", "kg", [
    ["kniebeugen", "Kniebeugen mit Körpergewicht", ["Bodyweight Squat", "Air Squat"], "Ebener Boden", "Vordere Oberschenkel, Gesäß", "Adduktoren, Rumpf",
      "Stelle die Füße stabil auf.", "Beuge Hüfte und Knie und halte die Fußsohlen am Boden.", "Strecke Hüfte und Knie bis zum Stand."],
    ["ausfallschritte-rueckwaerts", "Rückwärtige Ausfallschritte mit Körpergewicht", ["Bodyweight Reverse Lunge"], "Ebener Boden", "Vordere Oberschenkel, Gesäß", "Adduktoren, Rumpf",
      "Setze einen Fuß nach hinten und halte den vorderen Fuß vollständig am Boden.", "Beuge beide Knie und senke das hintere Knie kontrolliert.", "Drücke dich über den vorderen Fuß zurück in den Stand."],
    ["glute-bridge", "Gesäßbrücke mit Körpergewicht", ["Bodyweight Glute Bridge"], "Matte", "Gesäßmuskulatur", "Hintere Oberschenkel",
      "Lege dich mit aufgestellten Füßen auf den Rücken.", "Hebe die Hüfte an, bis Rumpf und Oberschenkel etwa eine Linie bilden.", "Senke die Hüfte kontrolliert zur Matte ab."],
  ]);
  add("Waden", "Körpergewicht", "kg", [
    ["wadenheben", "Wadenheben mit Körpergewicht", ["Bodyweight Calf Raise"], "Ebener Boden und bei Bedarf feste Stütze", "Wadenmuskulatur", "",
      "Stelle beide Füße fest auf und halte dich bei Bedarf leicht fest.", "Drücke dich über die Fußballen hoch.", "Senke die Fersen kontrolliert ab."],
  ]);
  add("Bauch und Rumpf", "Körpergewicht", "kg", [
    ["crunches", "Crunches", ["Bodyweight Crunch"], "Matte", "Gerader Bauchmuskel", "Schräge Bauchmuskeln",
      "Lege dich mit aufgestellten Füßen auf den Rücken.", "Hebe die Schulterblätter und führe die Rippen Richtung Becken.", "Senke den Oberkörper langsam ab."],
    ["dead-bug", "Dead Bug", ["Käferübung"], "Matte", "Tiefe Rumpfmuskulatur", "Schräge Bauchmuskeln",
      "Lege dich auf den Rücken und halte Arme und gebeugte Beine oben.", "Strecke einen Arm und das gegenüberliegende Bein, während der Rumpf stabil bleibt.", "Kehre zur Mitte zurück und wechsle die Seite."],
  ]);

  return catalog;
})();

if (typeof module !== "undefined") module.exports = exerciseCatalog;
