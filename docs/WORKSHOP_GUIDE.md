# MGD Workshop — Idee ausprobieren und Spielaufgabe übergeben

Stand: Aufgabe 9 aus [#522](https://github.com/bongohorse/monster-girl-delivery/issues/522).
Die Werkstatt ist eine Browserstudie; Spielintegration und Veröffentlichung bleiben separate Aufträge.

## Konkreten Stand übergeben

1. Eine Idee und ihre ausführbare Version öffnen, Konzept wählen und Regler einstellen.
2. Ablauf abspielen oder scrubben; bei Lieferpfeilen A/B mit gemeinsamer Zeit vergleichen.
3. „Share-Link erzeugen“ enthält Version, Konzept und die vollständigen aktuellen Werte, ohne lokale Preset-ID.
4. Unter „Integration vorbereiten“ gewünschtes Verhalten/Aussehen eintragen und Markdown sowie JSON herunterladen. Beide enthalten tatsächliche Werte/Einheiten, Quellen-/Supportrevision, Ausgangselemente, Assets, vorgeschlagene Timeline/Trigger, Lifecycle, Abnahmekriterien, Annahmen und offene Punkte.
5. Beide Dateien als konkrete **separat beauftragte Spielaufgabe** übergeben. Der Export verändert das Spiel nicht.

Lokales Feedback/„Ausgewählt“ bleibt ein Entwurfs-Handoff. Nur eine passende publizierte Reviewentscheidung mit belegter Quelle, gleicher Version, gleichem Konzept und genau denselben Werten erzeugt einen ausgewählten Handoff. Andere Reglerwerte brauchen eine eigene Auswahl. Unbekannte deployte Spielrevisionen bleiben ausdrücklich unbekannt.

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
- Root-Version und Standalone-Version liegen in einer Shadow-DOM-Renderfläche mit gebundenen Basis-/Versionsstyles. Heutige äußere Styles können die historische SVG-/Control-Darstellung nicht überschreiben. Der Viewer bestimmt weiterhin die verfügbare responsive Breite.
- Runtime-Imports und Re-Exports der eigenen Szene dürfen nur auf deklarierte eigene Quellen oder die drei gebundenen Supportfassaden zeigen. Ungebundene gemeinsame Helfer und dynamische Imports in der Szene brechen den Build ab. Einträge dürfen die aktuelle Werkstatthülle laden. Für weitere Renderabhängigkeiten die Bindung bewusst erweitern, bevor eine Version veröffentlicht wird; keine stillschweigende Live-Abhängigkeit.
- **Live bleibt die ausdrücklich begrenzte Datengrenze:** ein zentraler Workshop-Store, validierter Import/Export und aktuelle Katalogmetadaten. Dadurch kann auch eine alte Ansicht heutige gemischte Bundles sichern. Alte Werte werden weiterhin durch ihre unveränderten versionsspezifischen Validatoren geprüft; der gebundene Legacy-Adapter erhält Reihenfolge und passende Presets sowie fremde neue Datensätze beim Schreiben. Änderungen dieser Datenschnittstelle müssen ihre Kompatibilität erhalten.

Die neue Supportbindung sichert den überprüften Darstellungsstand der bestehenden v1/v2 nachträglich ab; sie behauptet nicht, dass ihre früheren PRs schon vollständige gemeinsame Abhängigkeiten archiviert hatten. Git-Tests ändern aktuelle Helfer/Styles und prüfen unveränderte historische Ausgabe. Browserprüfungen vergleichen v1/v2 und versuchen äußere CSS-Überschreibungen; diese verändern die isolierte Szene nicht.

## Noch offen: Aufgabe 10

Pages muss Spiel und Workshop in einem gemeinsamen Artefakt veröffentlichen, ohne Workshop-Code ins Spiel-/APK-Paket zu übernehmen. Der Checkout muss alle registrierten historischen Commits enthalten; fehlende SHA/Pfade brechen den Workshop-Build ab. Workflowtrigger, PR-Builds, echter Pages-Unterpfad sowie tatsächlicher PWA-/Service-Worker-Cache und Spielstandsisolation sind in Aufgabe 10 zu prüfen. Der lokale Produktions-Smoke-Test ist kein Live-Publikationsnachweis.
