# MGD Workshop — Idee ausprobieren und Spielaufgabe übergeben

Stand: Aufgabe 10 aus [#522](https://github.com/bongohorse/monster-girl-delivery/issues/522).
Die Werkstatt ist eine Browserstudie; Spielintegration und Veröffentlichung bleiben separate Aufträge.

**Umfang:** Die zehn Aufgaben liefern die technische Workshop-Grundlage mit einem kleinen
Beispielkatalog: sechs Elemente, vier Assets, die Lieferpfeilversionen v1/v2 und eine
unabhängige Pickup-Studie. Die vollständige Erfassung aller vorhandenen Spielelemente
ist noch offen und wird anschließend separat erweitert. Leere Kategorien sind keine
Bestätigung, dass das Spiel dort keine Inhalte besitzt.

## Konkreten Stand übergeben

1. Eine Idee und ihre ausführbare Version öffnen, Konzept wählen und Regler einstellen.
2. Ablauf abspielen oder scrubben; bei Lieferpfeilen A/B mit gemeinsamer Zeit vergleichen.
3. „Share-Link erzeugen“ enthält Version, Konzept und die vollständigen aktuellen Werte, ohne lokale Preset-ID.
4. Unter „Integration vorbereiten“ gewünschtes Verhalten/Aussehen eintragen und Markdown sowie JSON herunterladen. Beide enthalten tatsächliche Werte/Einheiten, Quellen-/Supportrevision, Ausgangselemente, Assets, vorgeschlagene Timeline/Trigger, Lifecycle, Abnahmekriterien, Annahmen und offene Punkte.
5. Beide Dateien als konkrete **separat beauftragte Spielaufgabe** übergeben. Der Export verändert das Spiel nicht.

Lokales Feedback/„Ausgewählt“ bleibt ein Entwurfs-Handoff. Nur eine passende publizierte Reviewentscheidung mit belegter Quelle, gleicher Version, gleichem Konzept und genau denselben Werten erzeugt einen ausgewählten Handoff. Maßgeblich ist die neueste publizierte Auswahl/Ablehnung nach Reviewdatum für genau diese Konfiguration. Eine spätere Ablehnung hebt die frühere Freigabe auf; reine Feedbackeinträge verändern sie nicht. Bei gleichem Zeitpunkt gilt die zuletzt im Katalog aufgeführte Entscheidung. Historische Reviews bleiben erhalten. Andere Reglerwerte brauchen eine eigene Auswahl. Unbekannte deployte Spielrevisionen bleiben ausdrücklich unbekannt.

## Element oder unabhängige Idee hinzufügen

Ein Element wird in `workshop/data/catalog.json` registriert: eindeutige ID, vorhandene Kategorie, belegte Quellen mit vollem Git-SHA, Dokumentations-/Implementierungsstand und gültige Beziehungen. Optionale Medien über vorhandene Asset-/Artefaktdatensätze registrieren. Die Dokumentationskarten, Suche und Rückverweise entstehen daraus; kein Navigations- oder Spielcode muss geändert werden.

Für eine eigene ausführbare Studie:

1. Eigenen Ordner `workshop/prototypes/<idee>/<version>/` anlegen. `model.ts` besitzt Defaults, Varianten, bekannte numerische Controls mit Einheit/Grenzen/Schritten und strikte Werteprüfung. `view.ts` exportiert `mountPilot(catalog, refresh)` mit `{ element, dispose }`. Die Ansicht besitzt einen Select `name="variant"` und numerische Controls, deren Namen ihren IDs entsprechen. Die generische Konfiguration liest diese tatsächlichen Controls. Kein Import aus Spiel-`src/`.
2. `styles.css`, Standalone-`index.html` und `entry.ts` hinzufügen. Ein neuer Standalone-Einstieg kann `mountPrototype(versionId, catalog, refresh)` aus `prototypeLoader.ts` verwenden. Renderer müssen Zeit/Listener beim Verlassen bereinigen. Die Renderfläche wird automatisch isoliert.
3. In **einer expliziten Zuordnung**, `workshop/src/prototypes.ts`, die Versions-ID mit Idee, HTML-Einstieg, Defaults, Controls, Variantenprüfung, Werteprüfung und passenden Handoff-Informationen registrieren. Kein Plugin-Framework. Der Loader findet `view.ts` neben dem registrierten HTML-Einstieg über Vites Build-Importliste.
4. Idee und Version in `catalog.json` registrieren. `sourcePaths` benennt alle eigenen ausführbaren Quellen/Styles/Einstiege. `sourceRevision` und `renderSupportRevision` dürfen während der Arbeit `null` sein; vor Abschluss konkrete Code-Commits binden. Änderungen an Verhalten/Defaults erhalten eine neue Versions-ID.
5. `bun run workshop:typecheck`, `workshop:check`, `workshop:build` und die Repository-Pflichtchecks ausführen. Direktlink/Reload, echte Reglerwirkung, Share-Link in frischem Browser und Handoff-Download prüfen. Navigation und Spielcode bleiben unverändert.

**Ausgeführter Nachweis:** `pickup-ring-study` / `pickup-ring-v1` besitzt eine unabhängige Ring-/Scheibenstudie mit Endradius und Effektdauer. Sie importiert keine Lieferpfeilmodelle. Der normale Versionspfad, Share-Link, Review und Handoff exportieren `radius`/`duration` statt Lieferpfeilparametern. JSON mit Pickup-Ring und Lieferpfeilen bleibt gemeinsam importierbar; das Speichern eines alten Lieferpfeil-Presets erhält die neuen Datensätze.

## Was historisch stabil bleibt

Geschützt sind **Szenendarstellung, Ablauf/Parameterauflösung und Defaults** einschließlich verwendeter Renderhelfer und Styles. Die äußere Werkstattnavigation, Katalogtexte, Handoff-Formulare und der globale Datenbestand dürfen weiterentwickelt werden.

- Eigene Model/View/Styles/Einstiege werden gegen `sourceRevision` geprüft. Bekannte Versionen werden nicht gegen eine andere Version oder einen gemeinsamen veränderlichen Verhaltenskern ausgetauscht.
- `renderSupportRevision` bindet zusätzlich die verwendeten DOM-/Downloadhelfer, die Darstellung von Notizen/Datentransfer, den Kompatibilitätsadapter und die Basisstyles. Der Build liest diese Fassungen **aus Git**, erzeugt automatisch ignorierte Supportdateien und verlinkt historische Imports darauf. Änderungen heutiger gemeinsamer Helfer beeinflussen diese Fassungen nicht.
- Root-Version und Standalone-Version liegen in einer Shadow-DOM-Renderfläche mit gebundenen Basis-/Versionsstyles. Die Studie verwendet eine feste 16-Pixel-Schriftbasis; gebundene `rem`-Abstände werden beim Build in Pixel umgerechnet. Heutige äußere Styles und eine geänderte Seiten-Schriftgröße können die historische SVG-/Control-Darstellung dadurch nicht überschreiben. Der Viewer bestimmt weiterhin die verfügbare responsive Breite.
- Runtime-Imports und Re-Exports der eigenen Szene dürfen nur auf deklarierte eigene Quellen oder die drei gebundenen Supportfassaden zeigen. Ungebundene gemeinsame Helfer und dynamische Imports in der Szene brechen den Build ab. Einträge dürfen die aktuelle Werkstatthülle laden. Für weitere Renderabhängigkeiten die Bindung bewusst erweitern, bevor eine Version veröffentlicht wird; keine stillschweigende Live-Abhängigkeit.
- **Live bleibt die ausdrücklich begrenzte Datengrenze:** ein zentraler Workshop-Store, validierter Import/Export und aktuelle Katalogmetadaten. Dadurch kann auch eine alte Ansicht heutige gemischte Bundles sichern. Alte Werte werden weiterhin durch ihre unveränderten versionsspezifischen Validatoren geprüft; der gebundene Legacy-Adapter erhält Reihenfolge und passende Presets sowie fremde neue Datensätze beim Schreiben. Änderungen dieser Datenschnittstelle müssen ihre Kompatibilität erhalten.

Die neue Supportbindung sichert den überprüften Darstellungsstand der bestehenden v1/v2 nachträglich ab; sie behauptet nicht, dass ihre früheren PRs schon vollständige gemeinsame Abhängigkeiten archiviert hatten. Git-Tests ändern aktuelle Helfer/Styles und prüfen unveränderte historische Ausgabe. Browserprüfungen vergleichen v1/v2 und versuchen äußere CSS-Überschreibungen; diese verändern die isolierte Szene nicht.

Die Importgrenze stellt nach einem gültigen JSON-Import das Konzept des letzten passenden
importierten Presets vor dem erneuten Öffnen der Studie wieder her. Explizite Konzept- und
Reglerwerte im Link behalten Vorrang; Presets anderer Versionen werden nicht übernommen.
Diese Korrektur betrifft den gemeinsamen Datentransport, nicht die gebundenen Szenenquellen.

## PR-Kette später zusammenführen

Empfohlene Reihenfolge: **#527 → #528 → #529 → #530 → #531 → #532 → #533 → #534 → #535 → #536**.
Nach jedem vorausgehenden Merge den nächsten PR auf `main` umstellen und Diff sowie
Prüfungen auf dem dann tatsächlich zu mergenden Stand kontrollieren. Die Drafts bleiben
bis zur ausdrücklichen Merge-/Veröffentlichungsbeauftragung offen.

Für diese Kette **Merge-Commits verwenden**, keine Squash-/Rebase-Merges und keine
Umschreibung der Quellcommits. `sourceRevision` und `renderSupportRevision` verweisen
auf ursprüngliche Commits; `fetch-depth: 0` allein holt keine nicht mehr aus `main`
erreichbaren Branchcommits. Merge-Commits erhalten diese Abstammung auch nach späterem
Löschen der Arbeitsbranches. PR-interne GitHub-Refs sind kein dauerhafter Buildvertrag.

Abschlussprüfung am 01.10.2026: Eine ausschließlich lokale Git-Objektsimulation der zehn
Merge-Commits und ein frischer Single-Branch-Checkout enthielten alle acht referenzierten
Revisionen als Vorfahren; die tatsächliche Katalog-Dateiprüfung bestand. Beim entsprechenden
Squash-Checkout fehlten vier Revisionen: Lieferpfeil-v1/v2, Pickup-v1 und Render-Support.
Dabei wurde kein Repository-PR gemergt und nichts veröffentlicht.

Der abschließende Merge nach `main` löst den bestehenden Pages-Deployworkflow automatisch
aus. Die spätere Beauftragung muss diese Veröffentlichung abdecken. Die aktuelle
Abschlussprüfung erlaubt weder Merge noch Deployment und schließt #522 nicht.

## Pages bauen und aktualisieren (Aufgabe 10)

```bash
bun run build
bun run workshop:typecheck
bun run workshop:check
bun run workshop:build
bun run pages:assemble
MGD_CHROME_PATH=/pfad/zu/chrome bun run pages:smoke
```

Die Builds nacheinander ausführen: beide verwenden die vorhandene geschützte Asset-Pipeline. `dist` bleibt das Spiel-/Capacitor-Paket, `dist-workshop` die separate Browserwerkstatt. `pages:assemble` erstellt eine frische Ausgabe `dist-pages`: Spiel am Root, Workshop ausschließlich unter `workshop/`. Fehlende Eingaben oder ein belegter `dist/workshop`-Pfad brechen vor Ersetzen der Ausgabe ab. Beide Eingaben bleiben unverändert.

Der vorhandene `.github/workflows/pages-deploy.yml` holt die vollständige Git-Historie (`fetch-depth: 0`), prüft die referenzierten historischen Quellen, baut beide Pakete, verifiziert Spiel-PWA/Assets und prüft die zusammengesetzte Ausgabe in Chromium unter `/monster-girl-delivery/`. Workshop-, Script-, Test- und Dokumentationspfade lösen den Workflow aus. PRs liefern ein `pages-preview-<sha>`-Artefakt und Browsernachweise für 14 Tage; sie veröffentlichen nicht. Berechtigte main-Läufe laden `dist-pages` als ein Pages-Artefakt hoch. Merge/Veröffentlichung folgt weiterhin dem ausdrücklich beauftragten Scope.

Der automatisierte Pages-Smoke öffnet das echte Spiel und den Workshop auf derselben Origin, prüft Galerie/Medien, unabhängige Controls, Share-Link, Vergleich, JSON-Roundtrip, fehlerhaften Import, getrennte lokale Daten und jeden registrierten Standalone-Einstieg. Worker-Controller, Registrierungen und CacheStorage werden vor/nach dem Workshop geprüft. Der vorhandene Spiel-Paket-Smoke verwendet denselben Chromium-Runner; die Beobachter sind ausschließlich im Testserver injiziert und werden nicht ausgeliefert.

**Cachegrenze und Live-Nachweis:** MGD registriert gemäß [PWA_ANDROID.md](PWA_ANDROID.md#deliberate-no-service-worker-policy) bewusst keinen Service Worker; ein Manifest-Scope ist keine Worker- oder Cachefunktion. Am 01.10.2026 um 14:41:58 UTC zeigte die tatsächliche Pages-Origin im frischen Chromium-Kontext nach Spielstart und Reload: kein Controller, keine Registrierungen, CacheStorage leer; alle 33 beobachteten Antworten kamen ohne Service Worker. `/workshop/` lieferte dort noch HTTP 404. Deployment-Metadaten ordneten das Live-Spiel `1fafb9e71a704ae2848bb5215c65328cb422441a` zu ([Workflow](https://github.com/bongohorse/monster-girl-delivery/actions/runs/36781553761)); das geladene Bundle hatte SHA256 `c4667a85895092da6d9fd6ed8366d100a7f1ce9019d41656500f656e9d82d4ac`.

Das ist ein Nachweis für diese frische Sitzung, keine Prüfung fremder bestehender Benutzerprofile oder HTTP-/CDN-Caches. Die neue gemeinsame Ausgabe wird lokal und im PR geprüft; sie ist bis zur beauftragten Veröffentlichung kein Live-Workshop-Nachweis. Nach Veröffentlichung unter der echten Pages-URL Direktlink/Reload, Medien, Standalones und Worker-/CacheStoragezustand erneut prüfen. Echte Geräte-/Installationsprüfung bleibt gesonderte Evidenz; Touch-/Landscape-Emulation beweist keinen Gerätetest.
