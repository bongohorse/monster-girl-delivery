# MGD Workshop — lokales Grundgerüst

Stand: Aufgabe 8 aus [#522](https://github.com/bongohorse/monster-girl-delivery/issues/522).
Vier Bereiche, zwölf Kategorien und sechs echte Elementkarten sind navigierbar.
Leere Kategorien und noch nicht umgesetzte Bereiche sind sichtbar gekennzeichnet.
Elementseiten zeigen typabhängige Fakten mit Einheiten und Belegen, eigene Prüfrevisionen,
Quellenkonflikte, Dokumentationsabdeckung, offene Angaben und verknüpfte Elemente.
Die Liefergruppe umfasst Paket, Empfänger, Lieferpfeil und Liefermechanik.
Informationen, Galerie, Quellen und Beziehungen lassen sich per Maus/Touch oder Tastatur-Tabs öffnen.
PROTOTYPE-Tuning bleibt als solches markiert; finale Art/Economy sind nicht behauptet.

```bash
bun run workshop:dev
# http://localhost:8081/workshop/#/documentation
bun run workshop:check
bun run workshop:typecheck
bun run workshop:build
```

Direktlink: `/workshop/#/element/red-missile`. Reload und Browser-Zurück nutzen Hashnavigation.
Die Ausgabe liegt separat in `dist-workshop/`; `bun run build` baut weiterhin nur das Spiel.
Der Workshop-Build prüft vorhandene Bildquellen gegen Git-Revision, SHA-256 und Metadaten.
Den aktuellen Missile-Export liest er über die bestehende geschützte Asset-Pipeline.
Automatische Snapshots liegen ignoriert unter `workshop/.generated/media/<sha256>.png`;
Vite importiert gleiche Bytes einmal und erzeugt deployment-relative Hosting-URLs.
Die Devansicht nutzt einen verifizierten Snapshot: nach Änderung von Medien/Katalog den
Workshop-Server neu starten. Git-Revisionen aus dem Katalog müssen lokal verfügbar sein;
bei einem flachen Checkout gegebenenfalls die betreffende Historie holen.
Es gibt keine manuell gepflegten Medienkopien und keinen Workshop-Android-Build.

`data/catalog.json` enthält die kleine echte Stichprobe. Kategorien, Karten und Breadcrumbs
werden daraus erzeugt. Das Datenformat wird erst mit den jeweiligen Verbrauchern erweitert;
Der v1-Katalog wird vor Verwendung auf Struktur, IDs, sichere Pfade, Zustände und Beziehungen geprüft. Die drei Hero-Posen und Red Missile
besitzen Galerien, Asset-Direktlinks (z. B. `#/asset/red-monster-missile`), native Vollansicht,
Metadaten, getrennte Review-/Verwendungszustände und vorhandene revisionsgebundene Historie.
Generierte Runtime-Dateien erhalten keinen vorgetäuschten GitHub-Dateilink; ihr Rezept,
Original und Generation/Outputhash sind sichtbar. Eine Trial-Auswahl ist keine finale Artabnahme.

Noch nicht umgesetzt: Handoff (9) und Pages-Anbindung (10). Es liegt kein Live-Deployment vor.
Der [technische Plan](../docs/WORKSHOP_PLAN.md) beschreibt diese folgenden Schritte.

Suche (`#/search`) erfasst Namen, Beschreibungen und Tags von Elementen, Assets und
Referenzen, Repository-Ideen, ausführbare Versionen und lokale Entwürfe. Filter sind kombinierbar; Review/Verwendung und Dokumentationsstand/Umsetzung
bleiben eigene Achsen. Filter und Suchbegriffe stehen im Direktlink und bleiben bei Reload
erhalten. `#/references` und `#/effects` sind Ansichten derselben Katalogdatensätze;
Rückverweise werden aus den kanonischen Beziehungen abgeleitet. Der Suchindex wird beim
Vite-Start/Build daraus generiert, ohne externe Suchdienste oder zweite gepflegte Liste.

`workshop:check` und Workshop-Build prüfen alle referenzierten Dateien an den angegebenen
Git-Revisionen (auch inzwischen entfernte Historie), Faktenquellen, Asset-Zuordnungen und
Ableitungszyklen. Fehlende Quellen oder ungültige Einträge brechen mit Dateipfad/ID ab.
Die Prüfung bestätigt die Existenz der Belege, nicht automatisch die Richtigkeit ihrer Aussagen.


`#/ideas` zeigt eine Repository-Idee und lokale, unveröffentlichte Entwürfe.
„Freie Idee anlegen“ arbeitet ohne Ausgangselement; „Idee aus diesem Element“ hält
Element-ID, Dokumentationsrevision und Quellen fest. Im Entwurf lassen sich weitere
Ausgangselemente, Frage, gewünschte Änderung, zu bewahrende Eigenschaften, Kategorie,
Tags und Referenzen speichern. Bereits festgehaltene Quellen bleiben erhalten.
„Codex-Auftrag als Markdown exportieren“ exportiert den **gespeicherten** Entwurf.

`#/idea/delivery-arrow-study` enthält die kleine Controls-/Preset-Vorschau
`delivery-arrow-controls-v0`, Variante `preview`: Größe, Blinkrate, Vorwarnzeit und
Scrollgeschwindigkeit wirken auf feste SVG-Zeitproben. Dies ist keine laufende Motion-Studie,
kein veröffentlichtes historisches v1 und kein Spieltuning. Reset stellt Vorschau-Defaults
wieder her. Benannte Presets sind an diese eigene Controls-Version gebunden; Aufgabe 7
bekommt eine neue Identität. Gültige Linkwerte haben Vorrang vor passendem lokalem Preset
und Defaults. Speichern/Anwenden eines Presets hält seine ID im Link fest. Ohne Linkwerte
oder Preset-ID gilt das zuletzt gespeicherte passende Preset. Ungespeicherte Regleränderungen
gehen beim Verlassen/Reload verloren; der JSON-Export aus dieser Vorschau sichert den
aktuellen Stand zusätzlich als Preset „Exportierte Vorschau“.

Entwürfe, Presets und Notizen liegen unter **nur** `mgd:workshop:v1:local`; Spiel- und
Director-Daten bleiben unberührt. Lokale Notizen enthalten beim Controls-Beispiel die
aktuelle Konfiguration. Sie sind kein veröffentlichtes Review und keine Nutzerfreigabe.
JSON-Export sichert das gesamte lokale Bundle; ein gültiger Import ersetzt es vollständig.
Daher wichtige Daten vorher exportieren. Import per Text oder JSON-Datei: höchstens 512 KiB,
Schema 1, bekannte Ziele/Version/Variante/Controls, endliche Werte innerhalb Grenzen und
Schritten. Fehler ändern keine vorhandenen Daten. Unbekannte Felder/Versionen werden
abgelehnt; keine automatische Migration oder Script-/HTML-Ausführung.
Speicherfehler lassen Arbeit und Export im Arbeitsspeicher zu. Beschädigte vorhandene
Speicherdaten werden nicht automatisch überschrieben; erst ein gültiger ausdrücklicher
Import darf sie ersetzen. Ohne Backend gibt es keine Synchronisierung zwischen Geräten.


`#/version/delivery-arrow-v1` öffnet die erste Motion-Studie. Eigenständiger Einstieg:
`prototypes/delivery-arrow/v1/index.html`. Vite baut Root und alle registrierten HTML-Versionsseiten; der verschachtelte
Einstieg nutzt denselben v1-Code. Drei Konzepte: Höhenpfeil, folgender Pfeil und Randmarker.
Alle nutzen dieselbe Szene/Zeit: Anflug → Aufnahme bei 2 s → parametrierte Vorwarnung →
inszenierte Übergabe bei 8 s → Ende bei 10 s. Diese Werte sind Studiendesign, keine Spielwerte.
Play/Pause, 0,5×/1×/2×, Loop, Zeit-Scrubber und Timeline-Marker steuern denselben Playhead.
Scrubbing pausiert; ein Konzeptwechsel behält die aktuelle Zeit und Reglerwerte.
Restart setzt nur die Zeit zurück und behält Wiedergabezustand/Parameter; Reset pausiert und setzt
Zeit, Geschwindigkeit, Loop und v1-Reglerdefaults zurück, behält aber das gewählte Konzept.
Hintergrund/Pagehide pausiert ohne nachgeholte Zeit. Navigation/Import beendet den alten RAF
und Lifecycle-Listener. SVG-Objekte werden einmal erstellt und beim Rendern aktualisiert.
Es gibt kein Audio oder simulierte Gameplay-Kollision.

v1-Presets/Notizen/JSON sind an `delivery-arrow-v1` und das konkrete Konzept gebunden.
Die Controls-Vorschau v0 und ihre Daten bleiben separat erreichbar. Der v1-Ordner besitzt
Modell, Defaults, Controls, Renderer, Einstieg und Styling. Die Katalog-Prüfrevision bindet
diese Quellen; der Workshop-Build lehnt Änderungen ihrer Bytes an derselben Versions-ID ab.
Verhaltensänderungen erhalten eine neue Version. Die zweite Version und A/B sind seit Aufgabe 8 verfügbar. Spielintegration und Pages-Deployment bleiben separat beauftragt.

## Versionen, Vergleich und Review (Aufgabe 8)

`#/version/delivery-arrow-v2` und `prototypes/delivery-arrow/v2/index.html` führen
zur eigenständigen v2. Ihre Pfeile pulsieren weich zwischen 0,3 und 1 statt hart
zu blinken. Der folgende Pfeil zeigt bei einem Ziel außerhalb der Szene nach rechts
und erst über dem sichtbaren Empfänger nach unten. Eigene Defaults: 40 px, 1 Hz,
4 s Vorwarnung, 180 px/s. Kurier-/Paket-/Empfängerablauf und Dauer bleiben vergleichbar.
Die unveränderten v1-Dateien und Defaults werden weiterhin gegen ihre gebundene
Quellrevision geprüft; v2 erhält eine eigene Bindung. Kein gemeinsam veränderliches
Verhaltensmodell und keine Spielintegration.

Versionsdropdowns und Dev Log verlinken beide ausführbaren Versionen, ihre Daten,
Änderungsnotizen und Quellen. `#/compare/delivery-arrow-study` verwendet einen
Playhead und Renderer mit den unabhängigen Zustandsfunktionen von v1 und v2.
A/B wechselt bei gleicher Zeit, Skala, Ausgangslage und identischen Reglerwerten.
Die gemeinsame Basis sind ausdrücklich die v1-Defaults; Versionspresets werden
im Vergleich nicht automatisch gemischt. Play/Pause, Scrubber, Restart, Reset,
0,5×/1×/2× und Loop funktionieren auch dort; Reset setzt Zeit/Regler/Geschwindigkeit/Loop
zurück. Verlassen/Import/Lifecycle beendet den jeweiligen Renderloop.

„Share-Link erzeugen“ auf einer Version schreibt Version, Konzept und alle aktuellen
Werte in einen kopierbaren Link ohne lokale Preset-ID. Vergleichslinks enthalten
zusätzlich Zeit und A/B-Seite. Ungültige Linkwerte werden nicht übernommen.

Strukturiertes Feedback erfasst Gefallen, Störung, gewünschte Änderung und eine
optionale lokale Entscheidung mit Entscheidungsquelle, Datum und effektiver
Konfiguration. Auswahl/Verwerfung ohne Quelle wird abgelehnt. Review & Entscheidungen
zeigt publizierte Repository-Reviews getrennt von lokalen Browserreviews. Es gibt
noch keine belegte publizierte Nutzerentscheidung; die leere Liste bleibt ehrlich.
Lokale Reviews werden im bestehenden JSON-Roundtrip gesichert; alte Notizen und
v0/v1-Presets bleiben gültig. Veröffentlichung erfolgt durch Repositorypflege,
nicht durch einen Browserbutton. Integrations-Handoff folgt erst in Aufgabe 9.
