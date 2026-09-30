# MGD Workshop — lokales Grundgerüst

Stand: Aufgabe 5 aus [#522](https://github.com/bongohorse/monster-girl-delivery/issues/522).
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
Der v1-Katalog wird vor Verwendung auf Struktur, IDs, sichere Pfade, Zustände und Beziehungen geprüft; externe JSON-Importe folgen in Aufgabe 6. Die drei Hero-Posen und Red Missile
besitzen Galerien, Asset-Direktlinks (z. B. `#/asset/red-monster-missile`), native Vollansicht,
Metadaten, getrennte Review-/Verwendungszustände und vorhandene revisionsgebundene Historie.
Generierte Runtime-Dateien erhalten keinen vorgetäuschten GitHub-Dateilink; ihr Rezept,
Original und Generation/Outputhash sind sichtbar. Eine Trial-Auswahl ist keine finale Artabnahme.

Noch nicht umgesetzt: lokale Ideen/Presets/Import (6), interaktiver Pilot (7), Versionen/Review (8),
Handoff (9) und Pages-Anbindung (10). Es liegt kein Live-Deployment vor.
Der [technische Plan](../docs/WORKSHOP_PLAN.md) beschreibt diese folgenden Schritte.

Suche (`#/search`) erfasst Namen, Beschreibungen und Tags von Elementen, Assets und
Referenzen. Filter sind kombinierbar; Review/Verwendung und Dokumentationsstand/Umsetzung
bleiben eigene Achsen. Filter und Suchbegriffe stehen im Direktlink und bleiben bei Reload
erhalten. `#/references` und `#/effects` sind Ansichten derselben Katalogdatensätze;
Rückverweise werden aus den kanonischen Beziehungen abgeleitet. Der Suchindex wird beim
Vite-Start/Build daraus generiert, ohne externe Suchdienste oder zweite gepflegte Liste.

`workshop:check` und Workshop-Build prüfen alle referenzierten Dateien an den angegebenen
Git-Revisionen (auch inzwischen entfernte Historie), Faktenquellen, Asset-Zuordnungen und
Ableitungszyklen. Fehlende Quellen oder ungültige Einträge brechen mit Dateipfad/ID ab.
Die Prüfung bestätigt die Existenz der Belege, nicht automatisch die Richtigkeit ihrer Aussagen.
