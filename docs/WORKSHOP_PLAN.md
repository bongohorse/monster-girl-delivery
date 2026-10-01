# MGD Workshop — Bestandsaufnahme und Umsetzungsplan

Stand: 30.09.2026. **Aufgabe 1** aus [Issue #522](https://github.com/bongohorse/monster-girl-delivery/issues/522).
Geprüfter Spielstand: `1fafb9e71a704ae2848bb5215c65328cb422441a`.

Dies ist der technische Plan für die folgenden einzeln beauftragten Schritte, keine implementierte Werkstatt. Das Issue besitzt den Workshop-Umfang; Spielregeln bleiben in `MASTER_SPEC.md`, Assetverarbeitung in `docs/ASSET_WORKFLOW.md`. #522 hat derzeit keinen GitHub-Meilenstein. Die Werkstatt ist eine separate Tooling-Aufgabe und verändert weder die M0–M10-Sequenz noch die Spielversion.

## 1. Geprüfter Bestand

Alle folgenden Pfade beziehen sich auf die Prüfrevision oben. Die aktuelle Pages-Spielrevision wurde nicht ermittelt; sie darf später nicht aus der Codeprüfrevision abgeleitet werden.

| Gegenstand | Vorhandene Quellen und tatsächlicher Anschluss | Katalogfolgerung |
| --- | --- | --- |
| Hero / provisorische Kurierin | `public/assets/art-gate/pose-{a,b,c}-concept-preview.png`; `src/game/scenes/Preloader.ts` lädt alle drei Texturen. `src/entities/PrototypePlayerPresentation.ts` verwendet A initial, B/C abhängig vom Flugzustand und primitive Ersatzgrafik bei fehlender A-Textur. Foundation erstellt/aktualisiert diese Darstellung. | Ein Hero-Element mit drei Pose-Assets. Alle PNGs: 1254 × 1254, Alphakanal laut Sharp-Metadaten. Keine endgültige Produktionsfigur behaupten; `docs/M6_ASSET_SCENE_BRIEF.md` und PRs #489/#520 belegen den Trial. Separate Originale/Prompts sind in der aktuellen Dateistruktur nicht belegt. |
| Red Missile | Quelle `assets/source/district-01/hazards/red-monster-missile-gpt-image.png`: PNG, 1526 × 1031, Alphakanal. Rezept `assets/metadata/red-monster-missile.json`, bestehende ID `red-monster-missile`, aktives Static-PNG-Profil, 512 × 330 Exportcanvas. | Bestehende Asset-ID übernehmen. Quelle und generierter Runtime-Export sind zwei Artefakte desselben Assets; kein neues Workshop-Rezept. Provenienz/Quellhash aus dem Rezept beziehen. |
| Missile-Verwendung | `scripts/assets/AssetRuntime.ts` erzeugt `src/generated/assets.ts` mit `ASSET_RED_MONSTER_MISSILE`; Preloader lädt dessen URL. `src/entities/GeneratedHazardPresentation.ts` führt über `src/entities/PrototypeHazardPresentation.ts` zur Textur bei aktiven Missiles. `src/generation/M5AuthoredSingleEncounterSegments.ts` enthält den Bait/Dodge-Segmententwurf; Foundation bietet `spawnDirectorMissile`. | Ladbar und bedingt als Director-Hazard verwendet; nicht als gewöhnlicher AUTO-Standardhazard ausgeben. `MASTER_SPEC.md` beschreibt die Breather-Grenze des nicht in AUTO aufgenommenen Segments. Warnung/Hitbox sind weitere Codebeziehungen, keine neuen Bilddateien. |
| Paket | `src/entities/FirstDeliveryPresentation.ts` zeichnet die Pickup-Grafik aus Primitiven; `src/systems/ParcelDelivery.ts` besitzt Kontakt und Tragezustand. | Eigenes Element; derzeit keine separate Paket-Bilddatei belegt. Das dekorative Paket der primitiven Hero-Ersatzgrafik ist nicht die Pickup-Logik. |
| Empfänger / Übergabebereich | Dieselbe Präsentation zeichnet Figurmarkierung und Bereich; `src/generation/FirstDeliveryRoute.ts` definiert Route/Positionen; ParcelDelivery prüft die Übergabe. | Eigenes Element mit Codequellen und Interaktionsgeometrie. Keine erfundene Empfängerillustration. |
| Lieferpfeil / GPS | `drawCue` in FirstDeliveryPresentation zeichnet Pfeile. Vorwarnung und Blinkdarstellung folgen Routendistanz sowie `src/config/DeliveryTuning.ts`. | Eigenes UI-Element mit Codeartefakt; kein GPS-Bitmap und kein unabhängiger GPS-Dienst vorhanden. Pilotzeiten sind spätere Designvorschläge, keine übernommenen Spielwerte. |
| Liefermechanik | Foundation erstellt die Route, übergibt sie an `src/systems/PrototypeRunSimulation.ts`, rendert sie und plant nach Abschluss die nächste Route. ParcelDelivery, FirstDeliveryRoute, DeliveryTuning und `src/systems/PrototypeRunResult.ts` besitzen Regeln/Rewards. | Mechanik-Element mit Beziehungen zu Paket, Empfänger und Pfeil. Produktregeln: `MASTER_SPEC.md` → „DECIDED release core — Product Gate A“. Bestätigte Implementierung und PROTOTYPE-Tuning getrennt darstellen. |
| Referenzen / Effekte | `docs/ART_DIRECTION.md`, `docs/M6_ASSET_SCENE_BRIEF.md`, `assets/source/district-01/hazards/README.md`; Delivery-Cue ist bereits Codegrafik. | Eine vorhandene Referenz und den Cue als Effekt-/Konzeptansicht verknüpfen. Keine neue Grafik, Sounddatei oder vermeintliche Effektfreigabe erfinden. |

Relevante vorhandene Regressionen: `tests/systems/ParcelDelivery.test.ts`, `tests/generation/FirstDeliveryRoute.test.ts`, `tests/entities/FirstDeliveryPresentation.test.ts`, `tests/entities/PrototypeMissilePresentation.test.ts`, `tests/hazards/PrototypeMissileHazard.test.ts`, `tests/assets/AssetRuntime.test.ts` und `tests/assets/AssetPackage.test.ts`. Ihre Existenz ist kein neu ausgeführter Runtime-/Gerätenachweis.

Zwei Dokumentationsabweichungen bleiben sichtbar: `docs/ART_DIRECTION.md` und der M6-Brief beschreiben A als stabile Baseline und B/C als Experimente, während der aktuelle Runtime-Code automatisch zwischen den drei Posen wechselt. Die Aussage in ART_DIRECTION, dass der gemeinsame #494-Workflow noch fehlt, ist gegenüber den vorhandenen Rezepten/Buildskripten veraltet. Der Katalog benennt beide Quellenstände; Aufgabe 1 ändert weder Spielverhalten noch Artentscheidungen.

Die Asset-Pipeline besitzt Quellen, Rezepte und ignorierte Generationen unter `assets/processed/mgd`; der generierte Registry-Pfad ist kein dauerhaftes Original. Legacy-Dateien in `public/assets` bleiben bestehen. Eventuelle Dubletten werden dokumentiert, nicht gelöscht.

## 2. Kleine technische Struktur

Zwei Ansätze wurden verglichen: ein zweiter Einstieg im Spiel-Vite-Root oder ein eigener Vite-Root. Der gemeinsame Root würde das gesamte Spiel-`public` übernehmen und Packaging/Imports leichter vermischen. **Eigener Root `workshop/` mit Vanilla TypeScript, HTML und CSS** bietet die benötigte Isolation mit denselben Werkzeugen. Kein neues Framework, keine Plugin-Engine; Prototypen importieren keine Spielsysteme.

Geplante Dateien, erst im jeweiligen Folgeschritt anzulegen:

```text
workshop/
  index.html                        eigenständiger Browser-Einstieg
  src/main.ts                       vier Bereiche, Hashnavigation, Ansichten
  src/styles.css                    responsive Oberfläche/Fokuszustände
  src/catalog.ts                    kleine typisierte Datenprüfung und Zugriff
  src/localDrafts.ts                 lokale Daten, Presets, JSON-Roundtrip (Schritt 6)
  data/catalog.json                 gemeinsame Datensätze, schemaVersion: 1
  prototypes/delivery-arrow/v1/      eigener Einstieg, Logik und unveränderte Defaults
  prototypes/delivery-arrow/v2/      echte Folgeversion (Schritt 8)
vite/config.workshop.mjs             root workshop, base ./, publicDir false
scripts/workshop/build.ts            Prüfung, Index/Medienausgabe, Vite-Build
scripts/workshop/assemble-pages.ts   dist + dist-workshop → dist-pages (Schritt 10)
tsconfig.workshop.json              strict, Workshop und Buildskripte getrennt prüfen
tests/workshop/                     Daten-, Import-, Motion-/Buildgrenztests nach Bedarf
docs/WORKSHOP_PLAN.md                dieser technische Plan
```

`dist-workshop/` und `dist-pages/` sowie temporäre Medien-/Indexausgaben werden ignoriert. Keine Quelldatei unter Spiel-`public/`, kein Import aus Spiel-`src/` in Workshop und umgekehrt. Der Build liest nur explizit registrierte Repoquellen. `workshop/src/catalog.ts` startet mit den Daten/Ansichten aus Schritt 2 und wächst erst mit echten Verbrauchern; keine leeren Hilfsmodule vorab.

Geplante Befehle: `workshop:dev` (Vite, Port 8081), `workshop:build`, `workshop:typecheck`, `workshop:check` (Katalogprüfung), `pages:assemble`. Bestehende Spielbefehle bleiben unverändert. Vitest nimmt die neuen sinnvollen Tests auf; Biome bleibt das vorhandene Werkzeug.

Routen unter `/workshop/`: `#/documentation`, `#/documentation/hazards`, `#/element/red-missile`, `#/asset/red-monster-missile`, `#/ideas`, `#/idea/delivery-arrow`, `#/version/delivery-arrow-v1?variant=…`, `#/reviews`, `#/integration`. Hashnavigation benötigt keine Pages-Rewrites; Kategorien werden aus Daten gelesen. Die zwölf Kategorien aus #522 erhalten stabile Slugs; leere Kategorien heißen „noch nicht dokumentiert“. Breadcrumbs/Zurück/Reload folgen denselben IDs.

## 3. Minimales Datenformat v1

Eine publizierte JSON-Datei genügt zunächst. Wachsende Dateien dürfen später nach Datensatzart geteilt werden, ohne IDs/Routen zu ändern. Ein handgeschriebener TypeScript-Validator genügt; kein allgemeiner Schema-/Formulargenerator. Metadaten-JSON enthält Text/Daten, keinen ausführbaren Code oder HTML. Markdown-Quellen werden verlinkt, nicht als unbereinigtes HTML eingebettet.

Top-Level: `schemaVersion: 1`, `codeReviewRevision` (voller Git-SHA), `deployedGameRevision` (SHA oder `null` mit Hinweis), `categories`, `elements`, `assets`, `artifacts`, `ideas`, `versions`, `reviews`, `references`, `integrations`. Alle Sammlungen sind Arrays mit stabilen eindeutigen `id`s. `null` bezeichnet unbekannte Werte; leere Listen behaupten keine vollständige Erfassung. Folgende Felder sind der konkrete Startvertrag; typabhängige Angaben bleiben optional.

| Datensatz | Felder |
| --- | --- |
| Kategorie | `id`, `name`; fachliche Kategorie unabhängig vom Hauptbereich |
| Quelle (eingebettet) | `path`, `revision`, optional `symbol`/`section`, `kind` (`code`, `manifest`, `spec`, `doc`); externe Quellen über Referenz-ID |
| Element | `id`, `name`, `type`, `categoryId`, `tags`, `description`, `documentation` (`state`, `revision`, `date`, `notes`), `implementation`, `archived`, `facts`, `assetIds`, `relatedElementIds`, `sources`, `openQuestions` |
| Fakt (eingebettet) | `label`, `value` (Text/Zahl/Bool), optional `unit`, `certainty` (`confirmed`, `proposal`, `unknown`), `sources`; Hitbox/Trigger und Posemerkmale als passende belegte Fakten |
| Asset | `id`, `name`, `description`, `elementIds`, `artifactIds`, `variant` (Text oder null), `review` (`state`, `reason`, `date`, `source`), `usage` (`state`, `revision`, `evidence` als Quellenliste), `archived` |
| Artefakt | `id`, `assetId`, `path`, `revision`, `sha256`, `role` (`original`, `runtime`, `preview`, `code`), `derivedFromArtifactId` (oder null), `metadata` (`format`, `width`, `height`, `hasAlpha`, `durationSeconds`, unbekannte Werte null), `provenance` (`text`, `prompt`, `referenceIds`, unbekannte Werte null) |
| Idee | `id`, `name`, `question`, `categoryId`, `tags`, `elementIds`, `referenceIds`, `reviewState`, `archived`; verknüpfte Versionen über deren `ideaId` |
| Prototypversion | `id`, `ideaId`, `date`, `changeNote`, `entry`, `sourceRevision`, `defaults`, `variants`, `controls`, `artifactIds`, `capabilities`, `limitations` |
| Variante / Control (eingebettet) | Variante: `id`, `name`, `values`; Control: `id`, `label`, `kind`, `unit`, `min`/`max`/`step` oder `options`. Defaults/Werte dürfen nur bekannte Controls enthalten. |
| Review | `id`, `targetId`, `versionId` (oder null), `variantId` (oder null), `values`, `date`, `feedback`, `decision`, `decisionSource`; ohne belegte Nutzerquelle keine Auswahlentscheidung |
| Referenz | `id`, `name`, `purpose`, `url` oder Repoquelle, `artifactIds`; Effekte sind vorhandene Elemente mit VFX-Tag/Beziehungen, keine zweite Assetliste |
| Integration | `id`, `ideaId`, `versionId`, `variantId`, `values`, `state`, `issueUrl`, `prUrl`, `sources`, `openQuestions` |

IDs sind verständliche feste Slugs. Element `red-missile` referenziert Asset `red-monster-missile`; Hero `courier-art-gate` referenziert Assets `courier-pose-a`, `courier-pose-b`, `courier-pose-c`. Weitere Start-Elemente: `parcel`, `delivery-recipient`, `delivery-arrow`, `parcel-delivery`. Primitive Präsentationen können ein `code`-Artefakt referenzieren oder ausschließlich Quellen haben; fehlende Medien sind ausdrücklich sichtbar. Ein geteiltes Artefakt wird einmal registriert.

Zustände bleiben getrennt: Dokumentation `unchecked|checked|source-conflict`; Implementierung `planned|partial|implemented`; Assetreview `open|selected|rejected`; Verwendung `present|loadable|default-game|conditional|debug-workshop|disabled|unchecked`; Ideenreview `draft|in-review|selected|rejected`; Integration `not-started|in-progress|integrated|verified`; Archivierung als Boolean. Die UI zeigt deutsche Labels. Verwendungsnachweise erläutern die reale Admission-/Loader-/Präsentationskette, nicht nur Texttreffer. Rezept-`active` und Art-Gate-Trial sind keine pauschale Produktionsfreigabe.

### Prüfung und lokale Daten

Buildprüfung: unterstützte Schemaversion, eindeutige IDs, gültige Kategorien/Zielreferenzen, azyklische Ableitungen, vorhandene Dateipfade, SHA/Hash-Konsistenz, passende Medienmetadaten. Versions-Einstiege müssen vorhanden und innerhalb von `workshop/prototypes/` liegen. Unbekannte Angaben brauchen einen sichtbaren Hinweis statt eines erfundenen Werts. Bei belegten Revisionen muss die Quelle dort existieren; generierte Exporte werden über Rezept/Generation und Hash gebunden, nicht als Git-Datei vorgetäuscht.

Pfadzugriffe bleiben innerhalb des Repositories und einer expliziten Medien-/Codequellenliste. Links entstehen aus geprüftem Pfad + vollem SHA als GitHub-Dateilink und revisionsgebundener Quelle; Sonderzeichen werden URL-kodiert. Aktueller Branchlink und historischer SHA-Link werden getrennt beschriftet. Index: aus den geprüften Datensätzen erzeugte Namen/Beschreibungen/Tags und Rückverweise; kein Codecrawler.

Lokaler Export ab Schritt 6: `{schemaVersion: 1, kind: "mgd-workshop-local", drafts: [], presets: [], feedback: []}`. Presets/Feedback enthalten `ideaId`, `versionId`, `variantId`, effektive `values`, Name/Text und Datum. Imports prüfen Größe, Struktur, Versionen/Varianten, bekannte Controls, endliche Zahlen und Grenzen; Fehler werden verständlich gemeldet und ersetzen keine bestehenden lokalen Daten. Keine Script-/HTML-Ausführung. Speicherpräfix `mgd:workshop:v1:`; Spiel-/Director-Schlüssel bleiben unberührt. Speicherfehler lassen Export und Arbeit im Speicher weiter zu.

Wirksame Parameter: gültige Linkkonfiguration → passendes lokales Preset → Versionsdefaults. Nicht passende Versionsdaten werden abgelehnt. Reset setzt Defaults; Restart setzt nur Zeit/Ablauf zurück. Publizierte Reviews und lokale noch unveröffentlichte Notizen erscheinen getrennt.

## 4. Medien und ausführbare Historie

Aktuelle Galerie und historische Prototypen benötigen unterschiedliche Bindungen: die Galerie zeigt den registrierten aktuellen Repo-Pfad plus Prüfrevision; jede veröffentlichte Version bindet konkrete Artefaktrevisionen/Hashes.

Der Workshop-Build löst explizite Artefakte aus dem aktuellen Checkout oder einer angeforderten Git-Revision auf und prüft den Hash. Historische Quelldateien müssen im CI-Checkout verfügbar sein (gezielte Fetches oder vollständige Historie); fehlende Revisionen stoppen den Build mit Dateiname/SHA. Für den Pilot werden ausschließlich eingecheckte Original-/Legacy-Medien als historische Medien gewählt; dadurch genügt `git show <sha>:<path>` ohne neue Assetarchiv-Infrastruktur. Die aktuellen Managed-Runtime-Exporte erscheinen in der Galerie mit Rezept/Generation/Outputhash; sie werden nicht als historische Git-Dateien angeboten. Falls eine spätere Version ausdrücklich einen historischen Runtime-Export benötigt, muss dessen automatisch erzeugte Hash-Ausgabe dauerhaft archiviert werden, bevor diese Version veröffentlicht wird. Der erste Pilot benötigt diese zusätzliche Funktion nicht.

Automatische Ausgabe: `dist-workshop/media/<sha256>.<ext>`. Identische Bytes werden einmal bereitgestellt; verschiedene echte Fassungen erhalten eigene Hashes. Der Build erzeugt eine ID→URL-Zuordnung, keine manuellen Galeriekopien. Bestehende Quelldateien werden weder verschoben noch dupliziert. Thumbnails erst bei realem Bedarf erzeugen, auf Original-ID zurückverweisen und Bilder verzögert laden.

Versionspfade `prototypes/delivery-arrow/v1/` und `/v2/` enthalten jeweils `index.html`, eigenen Verhaltenscode und Defaults. Der Workshop-Build leitet aus den validierten `versions[].entry` explizite Vite-Multipage-HTML-Eingaben zusätzlich zum Root-Einstieg ab; ein Root-Build allein würde diese Seiten nicht ausgeben. Kein Import veränderlicher gemeinsamer Simulationslogik. Die Oberfläche darf gemeinsam bleiben; alte Versions-Einstiege bleiben zusätzlich direkt ausführbar. Releaseidentität, Quellrevision und Assethashes werden sichtbar ausgegeben. Änderungen an Verhalten/Defaults erhalten eine neue Version, Metadatenkorrekturen nicht. Schritt 8 vergleicht einen festgehaltenen v1-Zustand nach Hinzufügen von v2; v2 zeigt eine beschriebene echte Änderung.

## 5. Build-, Hosting- und Lifecycle-Grenzen

Geprüft: `bun run build` nutzt `scripts/assets/run.ts` und `vite/config.prod.mjs`, relative Base `./`, Ausgabe `dist`. Vite übernimmt Spiel-`public`; Managed-Assets werden statisch importiert. `capacitor.config.ts` besitzt `webDir: 'dist'`. `.github/workflows/pages-deploy.yml` baut das Spiel, prüft `scripts/verify-web-package.mjs` und `scripts/assets/check-package.ts`, lädt nur bei main/kein PR `dist` hoch und deployt einmal. `.github/workflows/ci.yml` validiert alle PRs. Pages-Pfadfilter enthalten derzeit keine Dokumentations-/Workshop-Pfade.

Geplanter Ablauf ab Schritt 10:

```text
Spielbuild → dist → vorhandene PWA-/Asset-Paketprüfung
Workshopbuild → dist-workshop → Katalog-/Versions-/Medienprüfung
beide geprüft → dist-pages (Spielroot + workshop/) → ein Pages-Upload/Deployment
```

Spiel-/APK-Befehle verwenden weiterhin ausschließlich `dist`. Assembly erstellt eine frische Ausgabe, verhindert Pfadüberschneidungen und kopiert `dist-workshop` nur nach `dist-pages/workshop`. Kein Workshop-APK, keine Änderung an Android-Projekt oder Spielmanifest. Pages-Workflow lädt künftig `dist-pages` hoch; PRs bauen beide Ausgaben ohne Veröffentlichung. Filter auf push/pull_request ergänzen: `workshop/**`, `scripts/workshop/**`, `docs/**`, maßgebliche Rootdokumente, Workshop-tsconfig sowie vorhandene Vite-/Paketpfade. Reine Dokumentationsänderungen aktualisieren damit später den Katalog.

`public/manifest.webmanifest` beschreibt die installierbare Spiel-PWA mit `scope: './'`. In Spiel-`src`, `public`, Vite-Konfiguration und Root-Einstieg gibt es an der Prüfrevision keine Service-Worker-Registrierung/-Implementierung. Der Manifest-Scope ist kein Cache-/Worker-Nachweis. Schritt 10 prüft die tatsächlich veröffentlichte Origin auf frühere Worker, Navigation-Fallback und Kontrolle von `/workshop/`; falls inzwischen ein Spielworker existiert, Workshop dort gezielt ausschließen. Workshop registriert keinen eigenen Worker/Spielmanifest.

Repository-Unterpfad durch relative Base und Hashrouten berücksichtigen, einschließlich Medien, Versionsseiten und Sharelinks. Lokal und aus zusammengesetztem Produktionsartefakt prüfen; lokaler Devserver allein beweist kein Pages-Hosting.

Prototypmodule besitzen explizit Start/Dispose für die tatsächlich benötigten Renderloops, Listener, Timer und Audio. Beim Versions-/Seitenwechsel wird Dispose aufgerufen; Hintergrund/Pause darf keine riesigen Zeitsprünge erzeugen. Motion-Pilot leitet Zustand aus Zeit/Parametern ab, A/B nutzt dieselbe Zeit. Scrubbing ist stumm; Audio nur nach Nutzerinteraktion. Keine gemeinsame Autorität mit `TimeService` oder Spielständen.

## 6. Nächste Umsetzung und Evidenz

| Aufgabe | Erweiterung dieses Plans | Passende Prüfung |
| --- | --- | --- |
| 2 | Eigenständiger Einstieg, vier Bereiche/Kategorien, echte kleine Elementdaten, Karten/Breadcrumbs | Lokaler Workshop-Build, Direktlink/Reload/Zurück und kleine Landscape-Ansicht; erforderliche Codechecks |
| 3 | Liefergruppe mit typabhängigen Details/Quellen/Fakten | Quellen an neuer Prüfrevision nachvollziehen; keine erfundenen Werte |
| 4 | Hero-/Missile-Galerie, Artefakte/Verwendung, Vollansicht | Medienauflösung/Metadaten, Admission-Nachweis, keine manuell kopierten Medien |
| 5 | Suche/Filter, Rückverweise, Katalogvalidierung | Reale defekte IDs/Pfade/Beziehungen werden verständlich abgelehnt |
| 6 | Lokale Ideen/Notizen/Presets, validierter Import/Export, kleiner Control-Pilot | JSON-Roundtrip, Versionsgrenzen, Speicherfehler, wirksame Controls |
| 7 | Lieferpfeil v1 mit drei Konzepten, Motion-Controls/Timeline | Zustand bei Vorwärts-/Rückwärtsscrub, Reset/Restart, Pause/Loop, normale Geschwindigkeit |
| 8 | Tatsächlich andere v2, stabile Historie, A/B/Sharelinks/Review | v1 unverändert ausführbar, gemeinsame Zeit, Parameterpriorität, Ressourcenbereinigung |
| 9 | Markdown-/JSON-Handoff und kurze Anleitung | Effektive Werte/Quellen exportieren; weiteres Element und Version ohne Navigation-/Spielcodeänderung nachweisen |
| 10 | Gemeinsames Pages-Artefakt, Workflow/Pfadtrigger, Abschlussprüfung | PWA-Spielpaket isoliert, echte Unterpfad-/Versions-/Medienlinks, Worker/Storage, Tastatur/Touch/Landscape; fehlende Geräteprüfung benennen |

Aufgabe 1 endet mit diesem Dokument und Draft-PR. Validierung: Quellen/Dateipfade, Bildmetadaten, Linkziele und Diff prüfen; keine neue Runtime, daher keine Spieltests/Builds als lokale Pflicht. Es wurden keine Browser-/Geräte-/Live-Pages-Tests durchgeführt. Die revisionsgebundene Medienausgabe und Prüfung der deployten Revision sind ausdrücklich noch Umsetzungsschritte, keine vorhandenen Funktionen. **Nächster Auftrag: Aufgabe 2.**
