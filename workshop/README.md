# MGD Workshop — lokales Grundgerüst

Stand: Aufgabe 2 aus [#522](https://github.com/bongohorse/monster-girl-delivery/issues/522).
Vier Bereiche, zwölf Kategorien und drei echte Elementkarten sind navigierbar.
Leere Kategorien und noch nicht umgesetzte Bereiche sind sichtbar gekennzeichnet.
Die Quellen der Stichprobe sind an die im Katalog genannte Spielrevision gebunden.

```bash
bun run workshop:dev
# http://localhost:8081/workshop/#/documentation
bun run workshop:typecheck
bun run workshop:build
```

Direktlink: `/workshop/#/element/red-missile`. Reload und Browser-Zurück nutzen Hashnavigation.
Die Ausgabe liegt separat in `dist-workshop/`; `bun run build` baut weiterhin nur das Spiel.
Vite verwendet explizite Importe vorhandener Bilder und erzeugt deren Hosting-Dateien automatisch.
Es gibt keine manuell gepflegten Medienkopien und keinen Workshop-Android-Build.

`data/catalog.json` enthält die kleine echte Stichprobe. Kategorien, Karten und Breadcrumbs
werden daraus erzeugt. Das Datenformat wird erst mit den jeweiligen Verbrauchern erweitert;
externe Import-/Katalogvalidierung folgt in Aufgabe 5/6. Beispielvorschauen ersetzen keine
vollständige Assetgalerie oder belegte Assetreview-/Integrationsentscheidung.

Noch nicht umgesetzt: vollständige Elementdetails (3), Assetgalerien (4), Suche/Filter und
Katalogprüfung (5), lokale Ideen/Presets/Import (6), interaktiver Pilot (7), Versionen/Review (8),
Handoff (9) und Pages-Anbindung (10). Es liegt kein Live-Deployment vor.
Der [technische Plan](../docs/WORKSHOP_PLAN.md) beschreibt diese folgenden Schritte.
