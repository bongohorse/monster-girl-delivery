import type { Catalog } from './catalog';
import { downloadText } from './download';
import type { LocalConfiguration } from './localData';
import { validConfiguration } from './prototypeConfiguration';
import { definitionFor } from './prototypes';
import { node, repository } from './ui';

export function buildHandoff(
  config: LocalConfiguration,
  data: Catalog,
  request: string,
  date: string,
) {
  if (!validConfiguration({ ...config })) throw new Error('Ungültige Handoff-Konfiguration');
  const idea = data.ideas.find((i) => i.id === config.ideaId),
    version = data.versions.find((v) => v.id === config.versionId),
    definition = definitionFor(config.versionId);
  if (!idea || !version || !definition)
    throw new Error('Handoff benötigt registrierte Idee und ausführbare Version');
  const same = (r: LocalConfiguration) =>
    r.ideaId === config.ideaId &&
    r.versionId === config.versionId &&
    r.variantId === config.variantId &&
    Object.keys(r.values).length === Object.keys(config.values).length &&
    Object.entries(config.values).every(([k, v]) => r.values[k] === v);
  const selected = data.reviews.find((r) => same(r) && r.review.decision === 'selected');
  const elements = data.elements.filter((e) => idea.elementIds.includes(e.id));
  const assetIds = new Set(elements.flatMap((e) => e.assetIds));
  return {
    schemaVersion: 1,
    kind: 'mgd-workshop-handoff',
    date,
    state: selected ? 'selected' : 'draft',
    configuration: structuredClone(config),
    selection: selected
      ? {
          reviewId: selected.id,
          date: selected.date,
          sourceUrl: selected.sourceUrl,
          decisionSource: selected.review.decisionSource,
        }
      : null,
    idea: { id: idea.id, name: idea.name, question: idea.question },
    version: {
      id: version.id,
      entry: version.entry,
      sourceRevision: version.sourceRevision,
      renderSupportRevision: version.renderSupportRevision,
      changeNote: version.changeNote,
    },
    desiredChange: request.trim() || definition.handoff.appearance,
    appearance: definition.handoff.appearance,
    controls: definition.controls.map((c) => ({
      id: c.id,
      value: config.values[c.id],
      unit: c.unit,
      min: c.min,
      max: c.max,
      step: c.step,
    })),
    timeline: definition.handoff.timeline,
    events: definition.events(config.values),
    lifecycle: definition.handoff.lifecycle,
    acceptanceCriteria: definition.handoff.criteria,
    assumptions: definition.handoff.assumptions,
    openQuestions: [
      'Reale Spieltrigger/Skalierung und Platform-Lifecycle separat bestätigen.',
      'Keine Spielintegration durch diesen Export beauftragt.',
    ],
    game: {
      codeReviewRevision: data.codeReviewRevision,
      deployedGameRevision: data.deployedGameRevision,
    },
    sources: elements.map((e) => ({
      elementId: e.id,
      documentationRevision: e.documentation.revision,
      sources: structuredClone(e.sources),
    })),
    assets: data.assets
      .filter((a) => assetIds.has(a.id))
      .map((a) => ({
        id: a.id,
        review: a.review,
        usage: a.usage,
        artifacts: data.artifacts
          .filter((t) => t.assetId === a.id)
          .map((t) => ({
            id: t.id,
            revision: t.revision,
            sha256: t.sha256,
            sourcePath: t.sourcePath,
            recipe: t.recipe,
            role: t.role,
          })),
      })),
    references: data.references
      .filter((r) => idea.referenceIds.includes(r.id))
      .map((r) => ({ id: r.id, name: r.name, sources: r.sources })),
    limitations: version.limitations,
  };
}
export function handoffMarkdown(handoff: ReturnType<typeof buildHandoff>): string {
  const h = handoff;
  return [
    `# ${h.state === 'selected' ? 'Ausgewählter' : 'Entwurfs-'}Handoff: ${h.idea.name}`,
    '',
    `Datum: ${h.date}`,
    `Version/Konzept: ${h.configuration.versionId} / ${h.configuration.variantId}`,
    `Quellrevision: ${h.version.sourceRevision ?? 'Arbeitsstand'}`,
    `Render-/Supportrevision: ${h.version.renderSupportRevision ?? 'Arbeitsstand'}`,
    h.selection
      ? `Auswahlbeleg: ${h.selection.sourceUrl} (${h.selection.date}; ${h.selection.decisionSource})`
      : 'Keine belegte veröffentlichte Nutzerentscheidung. Lokale Auswahl bleibt ein Entwurf.',
    '',
    '## Gewünschte Änderung',
    h.desiredChange,
    '',
    '## Darstellung',
    h.appearance,
    '',
    '## Effektive Werte und Maße',
    ...h.controls.map(
      (c) => `- ${c.id}: ${c.value} ${c.unit} (Grenzen ${c.min}–${c.max}, Schritt ${c.step})`,
    ),
    '',
    '## Timeline / vorgeschlagene Trigger',
    ...h.timeline.map((t) => `- ${t}`),
    ...h.events.map((e) => `- ${e.name}: ${e.seconds} s (vorgeschlagen)`),
    '',
    '## Lifecycle',
    ...h.lifecycle.map((t) => `- ${t}`),
    '',
    '## Abnahmekriterien',
    ...h.acceptanceCriteria.map((t) => `- ${t}`),
    '',
    '## Abweichungen, Annahmen und offene Punkte',
    ...h.assumptions.map((t) => `- ${t}`),
    ...h.openQuestions.map((t) => `- ${t}`),
    ...h.limitations.map((t) => `- ${t}`),
    '',
    `Codeprüfrevision Spiel: ${h.game.codeReviewRevision}`,
    `Deployte Spielrevision: ${h.game.deployedGameRevision ?? 'unbekannt'}`,
    '',
    '## Ausgangselemente / revisionsgebundene Quellen',
    ...h.sources.flatMap((e) => [
      `- ${e.elementId} · Dokumentation ${e.documentationRevision}`,
      ...e.sources.map(
        (s) =>
          `  - ${s.path}${s.symbol ? ` (${s.symbol})` : ''}: ${repository}/blob/${s.revision}/${s.path.split('/').map(encodeURIComponent).join('/')}`,
      ),
    ]),
    '',
    '## Assets / Medien',
    ...h.assets.flatMap((a) => [
      `- ${a.id} · Review ${a.review.state}; Verwendung ${a.usage.state}`,
      ...a.artifacts.map(
        (t) =>
          `  - ${t.id} · ${t.role} · SHA256 ${t.sha256 ?? 'unbekannt'}${t.sourcePath && t.revision ? ` · ${repository}/blob/${t.revision}/${t.sourcePath}` : t.recipe ? ` · Rezept ${repository}/blob/${t.recipe.revision}/${t.recipe.path}` : ' · keine historische Git-Datei belegt'}`,
      ),
    ]),
    '',
    '## Referenzen',
    ...h.references.flatMap((r) => [
      `- ${r.name}`,
      ...r.sources.map((s) => `  - ${repository}/blob/${s.revision}/${s.path}`),
    ]),
    '',
    'Reale Kollisionen, Rewards, Lifecycle und mobile Performance erst in einer separat beauftragten Spielintegration prüfen.',
    '',
  ].join('\n');
}
export function handoffView(current: () => LocalConfiguration, data: Catalog): HTMLElement {
  const panel = node('section', '', 'handoff');
  panel.append(
    node('h2', 'Integration vorbereiten'),
    node(
      'p',
      'Exportiert den tatsächlichen aktuellen Stand als Markdown und versioniertes JSON. Eine lokale Auswahl wird als Entwurf bezeichnet; nur eine passende publizierte Nutzerentscheidung belegt eine Auswahl.',
    ),
  );
  const label = node('label', 'Gewünschtes Verhalten / Aussehen für die Spielaufgabe'),
    text = node('textarea');
  text.name = 'handoff-request';
  text.rows = 3;
  text.maxLength = 4000;
  label.append(text);
  panel.append(label);
  const status = node('p');
  status.setAttribute('role', 'status');
  for (const format of ['Markdown', 'JSON'] as const) {
    const button = node('button', `Download Handoff · ${format}`);
    button.type = 'button';
    button.addEventListener('click', () => {
      const handoff = buildHandoff(current(), data, text.value, new Date().toISOString());
      downloadText(
        `${handoff.configuration.versionId}-handoff.${format === 'JSON' ? 'json' : 'md'}`,
        format === 'JSON' ? JSON.stringify(handoff, null, 2) : handoffMarkdown(handoff),
        format === 'JSON' ? 'application/json' : 'text/markdown',
      );
      status.textContent = `${handoff.state === 'selected' ? 'Ausgewählter' : 'Entwurfs-'}Handoff exportiert; keine Spielintegration oder Veröffentlichung.`;
    });
    panel.append(button);
  }
  panel.append(status);
  return panel;
}
