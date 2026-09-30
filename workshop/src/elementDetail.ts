import { assetGallery } from './assetGallery';
import type { Catalog, Element, Fact } from './catalog';
import {
  documentationLabels,
  implementationLabels,
  link,
  node,
  repository,
  sourceHref,
  sourceLink,
} from './ui';

function factItem(fact: Fact, element: Element): [HTMLElement, HTMLElement] {
  const label = node('dt', fact.label);
  const value = node('dd');
  value.append(node('p', `${fact.value ?? 'Unbekannt'}${fact.unit ? ` ${fact.unit}` : ''}`));
  const certainty: Record<string, string> = {
    confirmed: 'Bestätigt',
    proposal: 'Vorschlag',
    unknown: 'Unbekannt',
  };
  value.append(
    node(
      'span',
      `${certainty[fact.certainty] ?? 'Ungeprüft'}${fact.maturity === 'prototype' ? ' · PROTOTYPE-Tuning' : ''}`,
      'tag',
    ),
  );
  for (const [index, id] of fact.sourceIds.entries()) {
    const source = element.sources.find((item) => item.id === id);
    if (source) {
      const reference = link(`Beleg ${index + 1}`, sourceHref(source), 'fact-source');
      reference.title = `${source.path} · ${source.symbol ?? ''} · ${source.revision}`;
      value.append(reference);
    }
  }
  return [label, value];
}

function information(element: Element): HTMLElement {
  const panel = node('div');
  for (const section of element.detailSections) {
    panel.append(node('h2', section.title));
    const facts = node('dl', '', 'facts');
    for (const fact of section.facts) facts.append(...factItem(fact, element));
    panel.append(facts);
  }
  if (element.sourceConflicts.length) {
    const conflicts = node('section', '', 'source-conflicts');
    conflicts.append(node('h2', 'Spezifikation / Quellenabweichungen'));
    for (const conflict of element.sourceConflicts) conflicts.append(node('p', conflict));
    panel.append(conflicts);
  }
  panel.append(node('h2', 'Dokumentationsabdeckung'), node('p', element.documentation.coverage));
  return panel;
}

function sources(element: Element): HTMLElement {
  const panel = node('div');
  panel.append(
    node('h2', 'Verwendung & Quellen'),
    node(
      'p',
      'Produktregeln besitzt MASTER_SPEC. Code und Tests belegen den Stand der genannten Revision; sie ersetzen keine Art-/Geräteabnahme.',
    ),
  );
  const list = node('ul', '', 'source-list');
  const labels: Record<string, string> = {
    code: 'Code',
    spec: 'Spezifikation',
    doc: 'Dokumentation',
    manifest: 'Manifest / Rezept',
    test: 'Regressionstest',
  };
  for (const source of element.sources) {
    const item = node('li');
    item.append(node('span', labels[source.kind] ?? source.kind, 'eyebrow'), sourceLink(source));
    if (source.symbol) item.append(node('p', source.symbol, 'source-symbol'));
    item.append(
      link(
        `Prüfrevision ${source.revision.slice(0, 12)}`,
        `${repository}/commit/${source.revision}`,
        'source-revision',
      ),
    );
    list.append(item);
  }
  panel.append(list);
  return panel;
}

function relationships(element: Element, data: Catalog): HTMLElement {
  const panel = node('div');
  panel.append(node('h2', 'Verknüpfte Elemente'));
  const list = node('ul', '', 'relationship-list');
  for (const id of element.relatedElementIds) {
    const related = data.elements.find((item) => item.id === id);
    const item = node('li');
    item.append(
      related
        ? link(related.name, `#/element/${related.id}`)
        : node('span', `Verknüpfung ungeprüft: ${id}`),
    );
    list.append(item);
  }
  panel.append(
    element.relatedElementIds.length
      ? list
      : node('p', 'Noch keine Elementbeziehungen dokumentiert.'),
  );
  panel.append(node('h2', 'Offene Angaben'));
  const questions = node('ul');
  for (const question of element.openQuestions) questions.append(node('li', question));
  panel.append(
    element.openQuestions.length
      ? questions
      : node('p', 'In dieser Stichprobe keine zusätzlichen offenen Angaben erfasst.'),
  );
  panel.append(
    node('h2', 'Ideen & Integration'),
    node(
      'p',
      'Verknüpfte Repository-Ideen und lokale Entwürfe stehen unter „Verknüpfte Ideen“ unterhalb der Dokumentation. Prototypauswahl und Spielintegration sind noch nicht umgesetzt.',
    ),
  );
  return panel;
}

/** Owns the element documentation view, with type-specific sections supplied by the catalog. */
export function elementDetail(element: Element, data: Catalog, preview: HTMLElement): HTMLElement {
  const result = node('section', '', 'detail-panel');
  result.append(preview, node('p', element.description, 'lead'));
  const meta = node('p', '', 'element-meta');
  const category = data.categories.find((item) => item.id === element.categoryId);
  meta.append(node('span', `ID: ${element.id}`), node('span', `Typ: ${element.type}`));
  if (category) meta.append(link(category.name, `#/documentation/${category.id}`));
  for (const tag of element.tags) meta.append(node('span', tag, 'tag'));
  result.append(meta);
  const status = node('p', '', 'status-row');
  status.append(
    node(
      'span',
      documentationLabels[element.documentation.state] ?? 'Dokumentation ungeprüft',
      'tag',
    ),
    node(
      'span',
      `Implementierung: ${implementationLabels[element.implementation] ?? 'ungeprüft'}`,
      'tag',
    ),
    node('span', element.archived ? 'Archiviert' : 'Nicht archiviert', 'tag'),
  );
  result.append(
    status,
    node('p', `${element.documentation.date} · ${element.documentation.notes}`),
  );
  const revision = node('p', 'Dokumentations-Prüfrevision: ');
  revision.append(
    link(element.documentation.revision, `${repository}/commit/${element.documentation.revision}`),
  );
  result.append(revision);

  const tabs = node('div', '', 'detail-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Elementdetails');
  const entries = [
    { id: 'information', name: 'Informationen', panel: information(element) },
    { id: 'gallery', name: 'Galerie / Medien', panel: assetGallery(element, data) },
    { id: 'sources', name: 'Verwendung / Quellen', panel: sources(element) },
    {
      id: 'relationships',
      name: 'Beziehungen / offene Angaben',
      panel: relationships(element, data),
    },
  ];
  const buttons = entries.map((entry) => {
    const button = node('button', entry.name);
    button.type = 'button';
    button.id = `tab-${entry.id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `panel-${entry.id}`);
    entry.panel.id = `panel-${entry.id}`;
    entry.panel.setAttribute('role', 'tabpanel');
    entry.panel.setAttribute('aria-labelledby', button.id);
    entry.panel.tabIndex = 0;
    return button;
  });
  function select(index: number): void {
    entries.forEach((entry, current) => {
      entry.panel.hidden = current !== index;
      buttons[current].setAttribute('aria-selected', String(current === index));
      buttons[current].tabIndex = current === index ? 0 : -1;
    });
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', (event) => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      else if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault();
      select(next);
      buttons[next].focus();
    });
    tabs.append(button);
  });
  select(0);
  result.append(tabs, ...entries.map((entry) => entry.panel));
  return result;
}
