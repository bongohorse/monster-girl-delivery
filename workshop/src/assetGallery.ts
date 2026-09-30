import type { Asset, Catalog, Element, PublishedArtifact } from './catalog';
import { media, mediaImage } from './media';
import { link, node, repository, sourceLink } from './ui';

const reviewLabels: Record<string, string> = {
  open: 'Offen',
  selected: 'Ausgewählt',
  rejected: 'Abgelehnt',
};
const usageLabels: Record<string, string> = {
  present: 'Nur vorhanden',
  loadable: 'Referenziert / ladbar',
  'default-game': 'Standardspiel zugeordnet',
  conditional: 'Bedingt verwendet',
  'debug-workshop': 'Nur Debug / Workshop',
  disabled: 'Deaktiviert',
  unchecked: 'Ungeprüft',
};
const roleLabels: Record<string, string> = {
  original: 'Original',
  runtime: 'Runtime-Export',
  preview: 'Konzeptvorschau',
};

function states(asset: Asset): HTMLElement {
  const result = node('div', '', 'status-row');
  result.append(
    node('span', `Assetreview: ${reviewLabels[asset.review.state] ?? 'Ungeprüft'}`, 'tag'),
    node('span', `Verwendung: ${usageLabels[asset.usage.state] ?? 'Ungeprüft'}`, 'tag'),
    node('span', asset.archived ? 'Archiviert' : 'Nicht archiviert', 'tag'),
  );
  return result;
}

export function assetGallery(element: Element, data: Catalog): HTMLElement {
  const panel = node('div');
  panel.append(node('h2', 'Galerie / Medien'));
  if (!element.assetIds.length) {
    panel.append(
      node(
        'p',
        'Keine separaten Bildassets dokumentiert. Vorhandene Codegrafiken und Regeln sind in Informationen / Quellen beschrieben.',
      ),
    );
    return panel;
  }
  const grid = node('div', '', 'card-grid');
  for (const id of element.assetIds) {
    const asset = data.assets.find((item) => item.id === id);
    if (!asset) continue;
    const card = link('', `#/asset/${asset.id}`, 'card asset-card');
    card.append(mediaImage(asset.artifactIds[0], asset.name));
    const content = node('div', '', 'card-content');
    content.append(node('h3', asset.name), node('p', asset.variant), states(asset));
    card.append(content);
    grid.append(card);
  }
  panel.append(
    grid,
    node(
      'p',
      'Assetreview ist eine Auswahl für den beschriebenen Scope. Es belegt weder finale Produktionsart noch eine neue Spielintegration.',
      'scope-note',
    ),
  );
  return panel;
}

function artifactView(artifact: PublishedArtifact, asset: Asset, data: Catalog): HTMLElement {
  const section = node('section', '', 'artifact-panel');
  section.append(node('h2', roleLabels[artifact.role] ?? artifact.role));
  const fullscreen = link('', artifact.url, 'fullscreen-link');
  fullscreen.target = '_blank';
  fullscreen.rel = 'noopener';
  fullscreen.setAttribute(
    'aria-label',
    `${asset.name}: ${roleLabels[artifact.role] ?? artifact.role} in Vollansicht öffnen`,
  );
  fullscreen.append(
    mediaImage(
      artifact.id,
      `${asset.name} · ${roleLabels[artifact.role] ?? artifact.role}`,
      'media artifact-image',
    ),
  );
  section.append(
    fullscreen,
    node('p', 'Bild antippen: Vollansicht im eigenen Tab; dort mit Browser-Zoom vergrößern.'),
  );
  const metadata = node('dl', '', 'facts');
  const rows: [string, string][] = [
    ['Artefakt-ID', artifact.id],
    [
      'Format / Maße',
      `${artifact.metadata.format.toUpperCase()} · ${artifact.metadata.width} × ${artifact.metadata.height} Pixel`,
    ],
    ['Transparenz', artifact.metadata.hasAlpha ? 'Alphakanal vorhanden (PNG)' : 'Kein Alphakanal'],
    ['Kanonischer Repository-Pfad', artifact.path],
    ['SHA-256', artifact.sha256],
  ];
  if (artifact.generation) rows.push(['Runtime-Generation', artifact.generation]);
  for (const [label, value] of rows) metadata.append(node('dt', label), node('dd', value));
  section.append(metadata);
  if (artifact.sourcePath && artifact.revision) {
    section.append(
      link(
        'Aktuelle GitHub-Datei ↗',
        `${repository}/blob/main/${artifact.sourcePath.split('/').map(encodeURIComponent).join('/')}`,
      ),
      node('p', 'Revisionsgebundene Bildquelle:'),
      sourceLink({
        id: artifact.id,
        kind: 'media',
        path: artifact.sourcePath,
        revision: artifact.revision,
      }),
    );
  } else if (artifact.recipe) {
    section.append(
      node(
        'p',
        'Generierter Build-Export; nicht als Git-Datei eingecheckt. Quellenrevision über das Rezept:',
      ),
      sourceLink(artifact.recipe),
    );
  }
  if (artifact.derivedFromArtifactId) {
    const original = data.artifacts.find((item) => item.id === artifact.derivedFromArtifactId);
    section.append(node('p', `Abgeleitet aus: ${original?.id ?? 'ungeprüft'}`));
    if (original?.sourcePath && original.revision)
      section.append(
        sourceLink({
          id: original.id,
          kind: 'media',
          path: original.sourcePath,
          revision: original.revision,
        }),
      );
  } else
    section.append(
      node(
        'p',
        artifact.role === 'original'
          ? 'Originalquelle; keine vorgelagerte Ableitung registriert.'
          : 'Separate Original-/Ableitungsstufe nicht belegt.',
      ),
    );
  section.append(node('h3', 'Herkunft'), node('p', artifact.provenance.text));
  const prompt = node('details');
  prompt.append(
    node('summary', 'Prompt / Referenzen'),
    node(
      'p',
      artifact.provenance.prompt ?? 'Vollständiger Prompt unbekannt / nicht im Bestand belegt.',
    ),
  );
  const refs = node('ul');
  for (const url of artifact.provenance.referenceUrls) {
    const item = node('li');
    item.append(link('Herkunftsbeleg ↗', url));
    refs.append(item);
  }
  prompt.append(refs);
  section.append(prompt);
  return section;
}

export function assetDetail(asset: Asset, data: Catalog): HTMLElement {
  const panel = node('section', '', 'detail-panel');
  panel.append(
    node('p', asset.description, 'lead'),
    node('p', `Asset-ID: ${asset.id} · ${asset.variant}`),
    states(asset),
  );
  panel.append(
    node('h2', 'Assetreview'),
    node('p', `${asset.review.date} · ${asset.review.reason}`),
    link('Entscheidungs-/Reviewquelle ↗', asset.review.sourceUrl),
  );
  panel.append(
    node('h2', 'Belegte Spielverwendung'),
    node('p', asset.usage.reason),
    link(
      `Codeprüfrevision ${asset.usage.revision}`,
      `${repository}/commit/${asset.usage.revision}`,
    ),
    node(
      'p',
      `Deployte Spielrevision: ${data.deployedGameRevision ?? 'unbekannt'}. Keine aktuelle Live-Zuordnung behauptet.`,
    ),
  );
  const evidence = node('ul', '', 'source-list');
  for (const source of asset.usage.evidence) {
    const item = node('li');
    item.append(sourceLink(source));
    if (source.symbol) item.append(node('p', source.symbol, 'source-symbol'));
    evidence.append(item);
  }
  panel.append(evidence, node('h2', 'Zugehörige Elemente'));
  const owners = node('ul', '', 'relationship-list');
  for (const id of asset.elementIds) {
    const owner = data.elements.find((item) => item.id === id);
    if (owner) {
      const item = node('li');
      item.append(link(owner.name, `#/element/${id}`));
      owners.append(item);
    }
  }
  panel.append(owners);
  for (const id of asset.artifactIds) {
    const artifact = media[id];
    panel.append(
      artifact ? artifactView(artifact, asset, data) : node('p', `Artefakt nicht verfügbar: ${id}`),
    );
  }
  panel.append(node('h2', 'Verfügbare Historie'));
  const history = node('ul', '', 'source-list');
  for (const entry of asset.history) {
    const item = node('li');
    item.append(
      node('p', `${entry.date} · ${entry.note}`),
      sourceLink({ id: entry.id, kind: 'history', path: entry.path, revision: entry.revision }),
    );
    history.append(item);
  }
  panel.append(history, node('h2', 'Offene Angaben'));
  const questions = node('ul');
  for (const question of asset.openQuestions) questions.append(node('li', question));
  panel.append(questions);
  return panel;
}
