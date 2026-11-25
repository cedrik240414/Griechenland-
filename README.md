# Hellas – Pfad der Helden

Ein Open-World-Spiel im antiken Griechenland, komplett im Browser (Three.js, alles prozedural erzeugt).

## Spielen

`index.html` im Browser öffnen (Doppelklick genügt – Three.js liegt lokal in `lib/`).
Alternativ über einen lokalen Server: `python3 -m http.server` und dann `http://localhost:8000`.

## Die Welt

- **Athen** mit Akropolis, Parthenon und Agora
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

## Tavernen, Händler & Nebenmissionen

- **10 Tavernen** (🍺 auf der Karte): Essen & Bett zum Heilen, **Söldner anheuern** (Speerträger, Hoplit, Spartanischer Veteran – bis zu 4 folgen dir und kämpfen mit), **Kopfgeldbrett** mit Gesetzlosen zum Jagen, Gerüchte und das eigene Kopfgeld begleichen
- **Fahndung**: Wer Stadtsoldaten erschlägt oder Städte erobert, wird gesucht (★–★★★★★) und von Stadtwachen gejagt. Abhauen, warten oder in der Taverne bezahlen.
- **Pferdeställe**: Thessalischer Rappe, Arabischer Schimmel und der **Streitwagen**
- **Schmiede**: Waffen (bis Xiphos des Champions) und Rüstungen (bis Hoplitenrüstung)
- **Schiffsbauer** in Piräus, Kreta und Ithaka: Fischerboot, Handelsschiff, Trireme
- **3 Mythenwälder**: Hain der Dryaden, Wald von Nemea (Nemeischer Löwe), Kalydonischer Wald (Kalydonischer Eber) – mit Satyrn, Dryaden und einem Schatz
- **30 Gelehrte** (❓ auf der Karte) überall in Hellas stellen je **5 leichte Fragen über Griechenland**
- **Eigene Stadt**: Bürger zu Soldaten ausbilden (Gefolge) und die Stadtwache trainieren (mehr Verteidiger gegen Eroberer)

## Mehrspieler & Städte

- **Lobbys mit bis zu 30 Helden**: Im Menü eine Lobby wählen (automatisch, bestehende oder neue). Andere Spieler, ihre Reittiere und Schiffe sind in der Welt sichtbar, mit **Enter** wird gechattet.
- **7 Stadtplätze**: 4 freie Bauplätze (Heimat, Eleusis, Lebadeia, Chalkis) und 3 feindliche Poleis (Megara, Argos, Korinth).
- **Städten beitreten**: Für 50 Drachmen Tribut wirst du Bürger einer fremden Stadt (auch Megara, Argos, Korinth). Ihre Soldaten werden deine Verbündeten, du kannst beim Ausbau helfen und die Stadtwache mitfinanzieren. Herrscher können Bürger verbannen.
- **Städte erobern**: Besiege die Garnison einer fremden Stadt und erobere sie am Grenzstein. Du erhältst ihre Schatzkammer, ihre Steuern und kannst sie weiter ausbauen. Im Mehrspieler können andere Helden auch deine Städte erobern!
- **Konto mit Name und Passwort**: Spielstand liegt in der Cloud – auf jedem Gerät weiterspielen. Rangliste auf der Weltkarte (**M**).
- **Admins** haben ein Admin-Menü (**P**): Spieler bannen/entbannen und frei herumfliegen.

Der Server läuft unter https://hellas-server.cedrikve.workers.dev, der Code liegt im Ordner [`server/`](server/README.md) (Cloudflare Worker). Ist er nicht erreichbar, läuft das Spiel als Einzelspieler.

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
| Esc | Gespräch schließen |
| P | Admin-Menü (nur Admins) |
| 1–9 | Antwort wählen |
