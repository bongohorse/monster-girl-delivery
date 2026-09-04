# GAME DESIGN DOKUMENT: ENDLESS RUNNER BLUEPRINT

**Referenz-Fallstudie:** *Jetpack Joyride* (Entwicklungsgeschichte & Design-Entscheidungen)

Dieses Dokument dient als **Design-Referenz für die Entwicklung eines modernen Mobile-Endless-Runners** und basiert auf den Erfahrungen, Fehlern und Durchbrüchen von Luke Muscat (*Fruit Ninja*, *Jetpack Joyride*).

> **MGD-Hinweis:** Dieses Dokument ist Referenzmaterial und keine automatisch verbindliche aktuelle Scope-Vorgabe. Ideen daraus werden erst verbindlich, wenn sie in `MASTER_SPEC.md`, `ROADMAP.md` oder ein genehmigtes GitHub Issue übernommen werden.

---

## 1. Vision, Prämisse & High Concept

- **Kern-Vision:** Ein maximal zugänglicher Runner, der durch eine 1-Touch-Steuerung sofort verständlich ist, aber durch unvorhersehbare Rhythmuswechsel, Humor und ein vielschichtiges Belohnungssystem eine enorme Langzeitmotivation aufbaut.
- **Das Ausgangsproblem (Scope & Ursprung):**
  - *Vergangenheit:* Nach dem Erfolg von *Fruit Ninja* und dem soliden Erfolg von *Monster Dash* sollte ein kleines 4-Wochen-Projekt für die Community entstehen (Spin-off der Jetpack-Waffe).
  - *Die Realität:* Aus 4 Wochen wurden **10 Monate Vollzeitentwicklung** plus 3 Jahre Live-Ops.
  - *Lesson Learned:* Ein Runner wirkt auf dem Papier simpel; die Feinjustierung von Pacing, Meta-Game und Flow frisst jedoch exponentiell viel Zeit.

---

## 2. Steuerung & Core-Physik (Game Feel)

### Die 1-Button-Philosophie

- **Konzept:** Keine separaten Buttons für Springen, Schießen oder Neigen. Eine einzige Eingabe (Touch/Hold) übernimmt alles: Schub nach oben und gleichzeitig Angriff/Schuss nach unten.
- **Die Physik-Balance (Helicopter-Flash-Prinzip):**
  - **Zu floaty (träge/schwebend):** Der Spieler reagiert zu spät auf Hindernisse. Frust entsteht, weil sich die Spielfigur unpräzise anfühlt.
  - **Zu snappy / zu schwer (hohe Schwerkraft, starker Schub):** Der Spieler muss permanent im Millisekunden-Takt auf den Bildschirm tippen („Tapping-Marathon“). Führt extrem schnell zu physischer und mentaler Ermüdung.
  - **Lösung:** Der Sweet-Spot liegt in einer präzisen Balance: Reaktionsschneller initialer Schub, kombiniert mit sanftem Gleiten im oberen Bereich, um Höhenstufen gezielt halten zu können.

---

## 3. Das Pacing- & Intensitäts-Problem (Der Wendepunkt)

Das größte Problem der frühen Prototypen: **Das Spiel war schlichtweg langweilig und monoton.**

```text
URSPRÜNGLICHE INTENSITÄTS-KURVE (FEHLGESCHLAGEN):
Intensität
▲
│        ┌──────────────────────────── (Permanent am Limit / 1-Hit-Kill-Angst)
│       /
│      /
│     /
└────┴───────────────────────────────► Zeit
  Start
```

### Was NICHT funktionierte

1. **Statische Power-Ups:** Klassische Power-Ups wie Bullet-Time, Schilde oder Magneten veränderten das Gameplay nicht grundlegend. Das Spiel blieb ein eindimensionaler Ein-Noten-Track.
2. **Klassisches 3-Herzen-System:** Verlangsamte das Spiel und nahm dem Runner die Dringlichkeit.
3. **Regenerierende Gesundheit (Call of Duty Red Screen):** Passte nicht zur Arcade-DNA eines 2D-Runners.
4. **Lineare Hindernis-Steigerung:** Die permanente Gefahr eines 1-Hit-Kills trieb den Puls hoch und hielt ihn dort fest, bis der Spieler starb. Das erzeugte Ermüdung statt Spielspaß.

---

## 4. Die Lösung: Vehikel-System & Rhythmuswechsel

Die Integration von Vehikeln (*Bad As Hog, Lil' Stomper, Profit Bird, Crazy Freaking Teleporter, Gravity Suit*) war die wichtigste Design-Entscheidung des gesamten Spiels.

```text
OPTIMALE INTENSITÄTS-KURVE (DURCH VEHIKEL):
Intensität
▲
│    ┌───┐ (Vehikel!)       ┌───┐ (Vehikel!)
│   /     \                /     \
│  /       \ (Zerstörung) /       \
│ /         └────────────/         └───
└──────────────────────────────────────► Zeit
```

### Warum Vehikel funktionierten

- **Dynamischer Pacing-Reset:** Das Einsammeln eines Vehikels nimmt sofort den Druck heraus (z. B. Wheelie-Animation in Zeitlupe). Der Spieler kann kurz durchatmen.
- **Eingebautes Extraleben (Shield Mechanic):** Wird das Vehikel getroffen, stirbt der Spieler nicht sofort, sondern verliert nur das Fahrzeug und kehrt mit dem Jetpack zurück.
- **Gameplay- und Physik-Mutation:** Jedes Vehikel interpretiert die 1-Touch-Steuerung komplett anders (Teleportieren, Schwerkraftumkehr, Stampfen/Schweben, Flappy-Bird-Mechanik).
- **Fließende Übergänge (Safety-Screen-Clear):**
  - *Problem:* Spieler starben oft direkt nach dem Verlust eines Vehikels an nachfolgenden Hindernissen.
  - *Lösung:* Bei Zerstörung des Vehikels löst eine Schockwelle/Explosion aus, die den Bildschirm von Hindernissen säubert und 1–2 Sekunden Orientierungszeit verschafft.
- **Organisches Level-Tutorial:** Münzmuster fungieren als optische Leitsysteme (z. B. Pfeile nach oben/unten beim Gravitationsanzug), um dem Spieler instinktiv die Steuerung des neuen Vehikels beizubringen.
- **Quantitäts-Balance:** Zu wenige Vehikel = repetitive Runs; zu viele Vehikel = Spieler bekommen ihre Favoriten statistisch zu selten.

---

## 5. Fail State: „Den Tod unterhaltsam machen“

In einem Endless-Runner stirbt der Spieler in 100 % aller Durchläufe. Daher muss der Fail-State belohnend statt demotivierend wirken.

| Feature | Fehlversuch / Was NICHT funktionierte | Erfolgreiche Lösung / Was funktionierte |
| :--- | :--- | :--- |
| **Todesanimation** | Figur löst sich sofort in Staub/Pixel auf (abrupter Stop). | **Ragdoll-Physik:** Figur rutscht und schlittert noch Dutzende Meter weiter, sammelt evtl. letzte Münzen ein und bricht Rekorde knapp nach dem Tod. |
| **Post-Run-Interaktion** | Sofortiger Game-Over-Screen. | **Final Spin (Slot Machine):** Gesammelte Spin-Tokens können nach dem Tod eingesetzt werden. Chance auf Atombomben (Extra-Distanz), Wiederbelebungen oder Geld. |
| **Ergebnis-Präsentation** | Abstrakte Punktzahlen (z. B. *„31.564 Punkte“*). | **Greifbare Distanz:** *„Du flogst 3.456 Meter“* + Social Hooks (*„Nur noch 120m, um deinen Freund zu schlagen!“*). |

---

## 6. Progression, Meta-Game & In-Game-Economy

### Das Missions-System (Inspiration: *Tiny Wings*)

- **Problem 1 (Daily Quests / 3 feste Missionen):** Wer ein paar Tage verpasste, fiel uneinholbar hinter Freunde zurück.
- **Problem 2 (A/B-Auswahl: Skill vs. Grind):** Fühlte sich nach monotoner Arbeit an.
- **Problem 3 (Flaschenhals-Missionen):** Hängt der Spieler an *einer* extrem schweren Mission fest, stoppt die gesamte Progression.
- **Die finale Lösung:**
  - **3 parallel aktive Missionen:** Sobald eine erfüllt wird, rückt *sofort* die nächste nach – sogar mitten im laufenden Run.
  - Dadurch sind **Multi-Missions-Abschlüsse** in einem einzigen Versuch möglich (extrem hohes Dopamin-Gefühl).
  - **Crunchy Feedback:** 1- bis 3-Sterne-Rating mit wuchtigem visuellen und akustischem Impact beim Einrasten.
  - **Prestige-System (Inspiration: *CoD Modern Warfare*):** Bei Maximallevel setzt der Spieler seinen Rang zurück und schaltet eines von 125 prozedural kombinierten Abzeichen (Farbe, Form, Symbol) frei.

### Der Shop & Ökonomie („The Stash“)

- **Belohnungssystem „Geld oder Kiste“ (Verworfen):** Spieler wählten immer die Mystery-Box; nutzlose Gag-Sammelkarten boten keinen echten Gameplay-Wert.
- **Modulare Architektur von Tag 1:** Der Shop muss von Grund auf so programmiert sein, dass neue Skins, Jetpacks und Gadgets per Live-Ops ohne Re-Engineering eingefügt werden können.
- **Humor & Persönlichkeit:** Witzige Beschreibungen (Flavor Text) und Parodien auf Popkultur/App-Store-Trends schaffen emotionalen Bindungswert für kosmetische Upgrades.

---

## 7. Audiovisuelles Design & Technische Hürden

### Die Soundtrack-Evolution (Komposition: Cedar Jones)

Der Soundtrack definiert den Puls des Spiels. Fünf Iterationen zeigten, worauf es ankommt:

1. *Heavy / Action (Monster Dash Style):* Zu ernst, zu martialisch.
2. *Metal / Badass:* Zu aggressiv; passt nicht zum bunten Münzsammeln.
3. *Straight Jazz:* Funktionierte überraschend gut mit dem Humor, fehlte aber der treibende Rhythmus für einen Runner.
4. *Dunkler Synth-Pop:* Gute Geschwindigkeit, drückte aber die Stimmung.
5. **Der Durchbruch:** Eine Fusion aus **funkiger Bassline, treibendem Upbeat und jazzigen Bläsern/Melodieläufen**. Das Ergebnis war zeitlos, extrem energetisch und motivierend.

### Technische Hürden: Asset-Skalierung & App-Größe

- **Das Dilemma:** Einführung von Retina-Displays und iPads führte dazu, dass pixelgenaue GBA-Grafik grobkörnig und matschig wirkte. Größere Texturen sprengten jedoch das damalige **20-MB-Mobilfunk-Download-Limit** des App Stores.
- **Die technische Lösung:**
  - Das Spiel wurde mit kompakten Basis-Pixel-Assets ausgeliefert.
  - Beim ersten App-Start auf High-Res-Geräten berechnete ein nativer **HQX-Upscaling-Filter** die Sprites lokal auf dem Endgerät und speicherte sie ab.
- **Performance-Ziel:** Bedingungslose **60 FPS** selbst auf schwacher Althardware (z. B. iPod Touch 2 / iPhone 3GS). Ruckler bei schnellen Runnern zerstören sofort das Reaktionsgefühl.

---

## 8. Name & Branding

- **Arbeitstitel:** *Machine Gun Jetpack*
  - *Problem:* Klingt nach einem aggressiven Shooter; der App-Icon-Name musste zu „MGJP“ abgekürzt werden (unleserlich).
  - *Gefährliche Idee während des Brainstormings:* *Machine Fun Jetpack* (sofort verworfen).
- **Finaler Titel:** *Jetpack Joyride*
  - Transportiert Leichtigkeit, Spielspaß und Momentum. Passt perfekt zur Tonalität des Spiels.

---

## 9. Checkliste: Do's & Don'ts für ein neues Mobile Runner Game

### DO

- [ ] **Varianz durch Gameplay-Mutatoren:** Baue Vehikel oder Power-Ups ein, die Steuerung und Physik für 15–30 Sekunden komplett auf den Kopf stellen.
- [ ] **Intensität modulieren:** Plane feste Entspannungsphasen nach harten Sequenzen ein (Pacing-Wellen statt statischer Steigung).
- [ ] **Parallele Meta-Ziele:** Mindestens 3 gleichzeitige Missionen, die sich nahtlos im Run erneuern.
- [ ] **Fail-State zelebrieren:** Nutze Ragdoll, Nah-Dran-Statistiken (*„Nur noch 50m bis Rang 1“*) und End-of-Run-Gamble-Mechaniken.
- [ ] **Subtiles Level-Design:** Münzen und Collectibles als Flugbahn-Führungslinien für Gefahrenzonen nutzen.

### DON'T

- [ ] **Keine linearen 1-Hit-Kill-Wände:** Permanente Todesangst ermüdet das Gehirn nach wenigen Minuten.
- [ ] **Keine Bottleneck-Quests:** Zwinge den Spieler niemals in eine einzelne unschaffbare Aufgabe, die den gesamten Fortschritt blockiert.
- [ ] **Keine rein kosmetischen Power-Ups:** Schilde oder Geschwindigkeits-Boosts müssen das physische Spielgefühl spürbar verändern, nicht nur Zahlenwerte.
- [ ] **Kein abrupter Tod:** Vermeide es, dass der Spieler nach dem Treffer sofort in ein Standbild-Menü geworfen wird.
- [ ] **Keinen zu engen Scope planen:** Ein Runner skaliert über sein Meta-Game, seine Physik-Präzision und Live-Ops-Fähigkeit – plane von Tag 1 an ein modulares System für neue Inhalte ein.

---

## MGD-Kurzableitung

Für *Monster Girl Delivery* sind daraus besonders relevant:

- Core Control bewusst simpel halten und zuerst das **Game Feel** perfektionieren.
- Schwierigkeit als **Wellen** statt als dauerhaft steigende Belastung gestalten.
- Spätere Mutatoren/Vehikel/Cargo-Effekte können Runs variieren, ohne die Basissteuerung aufzublähen.
- Nach Zustandswechseln oder starken Treffern kurze **Safety-/Orientierungsfenster** vorsehen.
- Coins/Collectibles nicht nur belohnen lassen, sondern als **visuelle Flugbahn- und Tutorial-Sprache** nutzen.
- Fail-State, Run-Ende und Near-Miss-Auswertung als Teil des Spiels behandeln, nicht nur als Menü.
- Missionen/Progression später parallel und ohne einzelne Progressions-Blocker aufbauen.
- Shop, Cosmetics, Gadgets und Content möglichst datengetrieben/modular halten, damit spätere Erweiterungen kein Re-Engineering erzwingen.
- Mobile Performance und stabile **60 FPS** bleiben wichtiger als unnötig teure visuelle Effekte.
