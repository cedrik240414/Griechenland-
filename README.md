# LEGACY OF OLYMPUS

Ein Open-World-Spiel im antiken Griechenland, komplett im Browser (Three.js, alles prozedural erzeugt).

## Spielen

`index.html` im Browser öffnen (Doppelklick genügt – Three.js liegt lokal in `lib/`).
Alternativ über einen lokalen Server: `python3 -m http.server` und dann `http://localhost:8000`.

## Die Welt

Die Karte ist dem **echten Griechenland** nachgebildet (Küstenlinien nach Längen- und Breitengraden): Festland mit Attika, Böotien, Thessalien und Makedonien, die Peloponnes, Euböa, Kreta, die Kykladen, die Inseln der Ostägäis und die Küste Kleinasiens mit Troja.


- **Athen** mit Akropolis, Parthenon, Agora, der Werkstatt des Erfinders Heron (er baut ein „Auto“!) und Herrn Mara
- **Troja** mit Mauern und dem **Trojanischen Pferd**, **Rhodos** mit dem **Koloss**, **Ephesos** (Artemistempel), **Halikarnassos** (Mausoleum), **Milet, Samos, Kos, Chios, Delos, Korkyra, Stagira**
- **Marathon**, die **Thermopylen**, das Orakel von **Dodona**
- Odysseus mit gestrandetem Schiff an der Westküste – und irgendwo am Strand von Kreta liegt ein **UFO** …
- **Sirenenfelsen** im Ionischen Meer: Wer zu nah heransegelt, muss im Minispiel widerstehen
- **Piräus** – Hafen mit Fähre nach Kreta
- **Theben**, **Delphi** (Orakel), **Olympia** (Stadion), **Sparta**
- **Olymp** – der schneebedeckte Gipfel mit dem Schrein des Zeus
- **Kreta** – das Labyrinth des Minotauros
- **8 vergessene Tempel** in der Wildnis, bewacht von Tempelwächtern – darin liegen Relikte der Helden
- **Deine eigene Stadt** am Siedlungsplatz südwestlich von Athen
- **Inseln der Ägäis**: Thera (Vulkaninsel), Seriphos (Insel der Medusa), die Sireneninsel und Ithaka – erreichbar per Fähre ab Piräus oder mit deinem **eigenen Schiff**
- **Götter-Dungeons** mit Bossen: Unterwelt des Hades (Kerberos), Schmiede des Hephaistos (Talos), Grotte des Poseidon (Skylla), Hort der Medusa (Medusa) und die Höhle des Polyphem
- **7 Höhlen** und **9 alte Ruinen** voller Beute, bewacht von Wölfen, Skeletten und Schatten
- **Mythische Kreaturen**: Zentauren, Zyklopen, Harpyien, Tritonen, Schlangenkrieger, Feuergeister – und Chiron, der weise Kentaur

## Features

- Hauptquest in 12 Etappen, Kampf mit Schild-Block, Pferd, Schwimmen, Tag-/Nachtzyklus
- **Schatztruhen** in allen Tempeln: Drachmen, Ambrosia und 6 einzigartige Relikte
  (Schwert des Perseus, Helm des Achilles, Sandalen des Hermes, Amulett des Apollon, Schild der Athene, Gürtel des Herakles)
- **Göttliche Belohnungen**: Klinge des Hephaistos, Helm des Hades, Dreizack des Poseidon + Hippokamp (Seepferd zum Reiten übers Meer), Pegasus (fliegen!) + Haupt der Medusa (Feinde versteinern)
- **Tempelwachen** vor den Stadttempeln, feindliche **Tempelwächter** in den Ruinen
- **Stadt gründen und ausbauen**: Siedlung → Dorf → Kleinstadt → Polis. Jede Stufe baut neue Gebäude,
  bringt neue Bewohner und mehr Steuereinnahmen, die du am Grenzstein einsammelst
- Händler, Wettlauf in Olympia, 40 Amphoren zum Sammeln, Minikarte & Weltkarte, automatisches Speichern

## Heldenmenü, Waffen & Olympia

- **Heldenmenü** (**I** / 🎒): Upgrades (Lebenskraft, Stärke, Ausdauer, Schnelligkeit, Bogenschießen, Schildkunde – je 5 Stufen), **Rüstungs-Skins** (Athener Blau, Spartaner, Meereswächter, Schattenkrieger, Goldener Held, Olympiasieger, Herr der Unterwelt) und eine Ausrüstungsübersicht
- **Bogen** (**X** wechselt Schwert → Bogen → Keraunos): Pfeile fliegen dorthin, wo die Kamera zielt
- **Schild**: blockt nach vorne, im richtigen Moment geblockt = **Parade** (kein Schaden, Gegner betäubt), Angriff beim Blocken = **Schildstoß**
- **Olympische Spiele** beim Kampfrichter in Olympia: Stadionlauf, Wagenrennen, Speerwurf (Kraftanzeige), Bogenschießen auf Scheiben und Pankration gegen den Champion – mit Gold-, Silber- und Bronzemedaillen

## Die Prüfungen des Zeus (Nebenquest-Reihe)

Hermes in Olympia startet die Reihe: Alle 5 Olympia-Goldmedaillen → 3 Giganten am Olymp besiegen → die Altäre von Dodona, Lykaion und Ida entzünden → Zeus übergibt den **Keraunos** (Blitzschlag mit Kettenblitz, **V** = Blitz werfen) → letzte, sehr schwere Prüfung: **Typhon** im Gipfel der Stürme (rote Ringe = gleich schlägt der Blitz ein!) → Belohnung: die **Gestalt des Blitzadlers** (**U**), mit der man blitzschnell fliegt und Blitze schleudert.

## Die Prüfung der Kentauren

Besiege die 7 legendären Ungeheuer – Kerberos, Talos, Skylla, Medusa, Polyphem, den Nemeischen Löwen und den Kalydonischen Eber – und kehre zu **Chiron** am Pelion zurück. Er schenkt dir die **Gestalt des Kentauren** (**K**): rasend schnell an Land und mit kräftigen Speerstößen.

Admins haben Keraunos und Blitzadler von Anfang an.

## Tavernen, Händler & Nebenmissionen

- **14 begehbare Tavernen** (🍺 auf der Karte): antikes griechisches Essen (Gerstenbrot, Linsensuppe, Ziegenkäse mit Honig, Thunfisch, Kykeon, Krasis, in Sparta die Schwarze Suppe), Bett zum Heilen, **Söldner anheuern** (Speerträger, Hoplit, Spartanischer Veteran – bis zu 4 folgen dir und kämpfen mit), **Kopfgeldbrett** mit Gesetzlosen zum Jagen, Gerüchte und das eigene Kopfgeld begleichen
- **Fahndung**: Wer Stadtsoldaten erschlägt oder Städte erobert, wird gesucht (★–★★★★★) und von Stadtwachen gejagt. Abhauen, warten oder in der Taverne bezahlen.
- **Pferdeställe**: Thessalischer Rappe und Arabischer Schimmel
- **Wagenbauer Pelops** (Athen, Theben, Sparta, Ephesos, Troja): Bauernkarren, Reisewagen mit Dach, Streitwagen und der Goldene Prunkwagen
- **Schmiede**: Waffen (vom Bronzeschwert bis zum Xiphos des Champions), Holz- und Bronzeschild, Rüstungen (bis Hoplitenrüstung)
- **Start**: Man beginnt ohne Rüstung und ohne Schild, nur mit einem kleinen Dolch
- **Schiffsbauer** in Piräus, Kreta und Ithaka: Fischerboot, Handelsschiff, Trireme
- **3 Mythenwälder**: Hain der Dryaden, Wald von Nemea (Nemeischer Löwe), Kalydonischer Wald (Kalydonischer Eber) – mit Satyrn, Dryaden und einem Schatz
- **64 Gelehrte** (❓ auf der Karte) – darunter Sokrates, Platon, Pythagoras, Thales, Hippokrates, Homer, Sappho und Alexander an ihren echten Orten – stellen je **5 leichte Fragen über Griechenland** – wer mindestens 3 richtig hat, bekommt ein Geschenk (Schwert, Schild, Rüstung, Skins, Amulette, Schriftrollen, Ambrosia). Wer alle überzeugt, bekommt von **Athene die Aigis** und die **Gestalt der Sirene** (**J**: rasend schnell schwimmen, Angriff = betörender Gesang).
- **Eigene Stadt**: Bürger zu Soldaten ausbilden (Gefolge) und die Stadtwache trainieren (mehr Verteidiger gegen Eroberer)

## Mehrspieler & Städte

- **Lobbys mit bis zu 30 Helden**: Im Menü eine Lobby wählen (automatisch, bestehende oder neue). Andere Spieler, ihre Reittiere und Schiffe sind in der Welt sichtbar, mit **Enter** wird gechattet.
- **7 Stadtplätze**: 4 freie Bauplätze (Heimat, Eleusis, Lebadeia, Chalkis – weit über die Karte verteilt) und 3 feindliche Poleis (Megara, Argos, Korinth).
- **Städten beitreten**: Für 50 Drachmen Tribut wirst du Bürger einer fremden Stadt (auch Megara, Argos, Korinth). Ihre Soldaten werden deine Verbündeten, du kannst beim Ausbau helfen und die Stadtwache mitfinanzieren. Herrscher können Bürger verbannen.
- **Städte erobern**: Besiege die Garnison einer fremden Stadt und erobere sie am Grenzstein. Du erhältst ihre Schatzkammer, ihre Steuern und kannst sie weiter ausbauen. Im Mehrspieler können andere Helden auch deine Städte erobern!
- **Konto mit Name und Passwort**: Spielstand liegt in der Cloud – auf jedem Gerät weiterspielen. Rangliste auf der Weltkarte (**M**).
- **Admins** haben ein Admin-Menü (**P**): sich Drachmen geben, Spieler bannen/entbannen, andere zum Admin machen und frei herumfliegen.

Der Server läuft unter https://hellas-server.cedrikve.workers.dev, der Code liegt im Ordner [`server/`](server/README.md) (Cloudflare Worker). Ist er nicht erreichbar, läuft das Spiel als Einzelspieler.

## Grafik & Physik

- **Figuren:** runde Körper mit Hals, Händen, Füßen und Gesicht (Augen, Brauen, Nase, Mund), Ellbogen- und Kniegelenke, weichere Lauf- und Kampfanimationen. Pferde und Wölfe haben runde Körper und geknickte Beine.
- **Welt:** feine Bodenstruktur ohne Kachelmuster, Gesteinsschichten an steilen Hängen, wehendes Gras rund um den Spieler, Bäume aus mehreren Laubballen, die sich im Wind bewegen, Wasser mit Wellen, Glanz und Spiegelung am Horizont, leichter Dunst in der Ferne.
- **Physik:** Trägheit beim Loslaufen und Anhalten (zu Pferd stärker), bergauf langsamer und bergab schneller, kaum Steuerung in der Luft, realistischere Schwerkraft und Sprunghöhe, harte Landungen bremsen und verletzen ab etwa 11 m Fallhöhe, Treffer stoßen Spieler und Gegner zurück, weich nachgeführte Kamera.
- **Grafikstufe** im Startmenü: *Hoch* oder *Mittel (schneller)*. Auf Tablets ist *Mittel* voreingestellt. Die Stufe wird gespeichert und wirkt vollständig nach dem nächsten Laden.

## Kriegsgeräte, Straßen & Leben in der Welt

- **Kriegsmeister Demetrios** (Athen, Sparta, Korinth, Rhodos, Troja) verkauft echte Kriegsgeräte: **Skorpion** (Pfeilgeschütz, weite und genaue Bolzen), **Katapult** (Felsbrocken im Bogen, trifft ganze Gruppen) und **Rammbock** (überdachter Widder mit Bronzekopf). Mit R rufen, mit der Kamera zielen, mit Angriff feuern.
- **Gepflasterte Straßen** mit Steinplatten und Meilensteinen verbinden die Städte.
- **Fuhrwerke** fahren über die Straßen, halten vor dir an und schimpfen, wenn du im Weg stehst.
- **Streitende Leute** in den Städten: Du kannst den Streit schlichten (Belohnung) oder anfeuern.
- Der Held trägt immer einen Helm, hat einen neuen Look und hält die Waffe in der rechten und den Schild in der linken Hand. Im Inventar stehen die Waffen rechts.
- Auf dem Touchscreen liegen Bogen und Blitz rechts bei Pferd, Karte und Adler.

## Neu: Mitfahren, Stadtverkauf, Söldner, Intro

- **Trireme für 10:** Segelt ein anderer Held mit seiner Trireme vorbei, kannst du mit E an Bord gehen (bis zu 9 Mitfahrer plus Kapitän). Mit E steigst du wieder aus; legt der Kapitän an, gehen alle an Land.
- **Stadt verkaufen:** In deiner eigenen Stadt gibt es „Stadt verkaufen“: die Hälfte aller Ausbaukosten plus 25 Drachmen pro Wachstufe, dazu die Schatzkammer. Die Gebäude verschwinden und der Platz wird wieder frei (eroberte Städte gehen an ihre alten Herren zurück).
- **Siedlungsplätze auf der Karte:** 🚩 freie Plätze (grün) und 🏛 Städte (gold = deine, blau = Bürger, rot = fremd) auf Minikarte und großer Karte.
- **Söldner in beliebiger Zahl:** In der Taverne gibst du ein, wie viele du willst – bis zu 30 Kämpfer, solange das Geld reicht.
- **Inselstadt auf Lesbos:** Eine gewölbte Steinbrücke mit Pfeilern und Laternen verbindet die Insel mit dem Festland; im Westen liegt ein Holzsteg mit Fischerboot.
- **Zur eigenen Stadt reisen:** Taste H, der Knopf „🏛 Zu meiner Stadt“ auf der großen Karte oder im Heldenmenü. Dein Gefolge reist mit. Nicht im Kampf, in der Unterwelt oder während eines Wettkampfs.
- **Anlegen per Touch:** Beim Segeln erscheint unten der ⚓-Knopf (oder E); Land wird im Umkreis von 45 m gesucht.
- **SVE-Studios-Intro** mit Logo-Animation beim Start (antippen zum Überspringen).

## Steuerung

| Taste | Aktion |
|---|---|
| W A S D | Laufen |
| Maus | Kamera (Mausrad: Zoom) |
| Shift | Sprinten |
| Leertaste | Springen / Schwimmen |
| Linke Maustaste | Angreifen |
| Rechte Maustaste | Blocken |
| E | Sprechen / Interagieren / Truhe öffnen |
| R | Pferd rufen / absteigen |
| F | Ambrosia trinken |
| Q | Blitz des Zeus (nach dem Segen) |
| B | Eigenes Schiff rufen / anlegen |
| T | Pegasus (Leertaste: steigen, C: sinken) |
| G | Haupt der Medusa |
| M | Weltkarte & Rangliste |
| Enter | Chat (online) |
| X | Waffe wechseln (Schwert, Bogen, Keraunos) |
| V | Blitz werfen (Keraunos) |
| U | Blitzadler |
| J | Sirene |
| K | Kentaur |
| I | Heldenmenü |
| Esc | Gespräch schließen |
| P | Admin-Menü (nur Admins) |
| 1–9 | Antwort wählen |
