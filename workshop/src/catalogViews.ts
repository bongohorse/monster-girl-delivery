import type { Catalog, Reference } from './catalog';
import { sections } from './navigation';
import { type CatalogIndex, type SearchFilters, searchCatalog } from './search';
import { link, node, sourceLink } from './ui';

export const catalogIndex: CatalogIndex = __WORKSHOP_CATALOG_INDEX__;
const filterKeys = [
  'query',
  'categoryId',
  'kind',
  'type',
  'section',
  'documentation',
  'implementation',
  'review',
  'usage',
  'archive',
] as const;
export function filtersFromHash(hash: string): SearchFilters {
  const params = new URLSearchParams(hash.split('?')[1] ?? '');
  return Object.fromEntries(filterKeys.map((key) => [key, params.get(key) ?? '']));
}
export function searchForm(data?: Catalog, filters: SearchFilters = {}): HTMLFormElement {
  const form = node('form', '', 'search-form');
  form.setAttribute('role', 'search');
  const label = node('label', 'Suche');
  const query = node('input');
  query.type = 'search';
  query.name = 'query';
  query.value = filters.query ?? '';
  label.append(query);
  form.append(label);
  const select = (name: keyof SearchFilters, title: string, values: [string, string][]) => {
    const label = node('label', title);
    const input = node('select');
    input.name = name;
    for (const [value, text] of [['', 'Alle'], ...values]) {
      const option = node('option', text);
      option.value = value;
      input.append(option);
    }
    input.value = filters[name] ?? '';
    label.append(input);
    form.append(label);
  };
  if (data) {
    select(
      'categoryId',
      'Kategorie',
      data.categories.map((c) => [c.id, c.name]),
    );
    select('kind', 'Eintragsart', [
      ['element', 'Element'],
      ['asset', 'Asset'],
      ['reference', 'Referenz'],
    ]);
    select(
      'type',
      'Typ',
      [...new Set(catalogIndex.entries.map((e) => e.type))].map((type) => [type, type]),
    );
    select(
      'section',
      'Bereich',
      sections.map((s) => [s.id, s.name]),
    );
    select('documentation', 'Dokumentationsstand (Elemente)', [
      ['checked', 'geprüft'],
      ['unchecked', 'ungeprüft'],
      ['source-conflict', 'Quellenkonflikt'],
    ]);
    select('implementation', 'Umsetzung (Elemente)', [
      ['implemented', 'umgesetzt'],
      ['partial', 'teilweise umgesetzt'],
      ['planned', 'geplant'],
    ]);
    select('review', 'Review (Assets)', [
      ['open', 'offen'],
      ['selected', 'ausgewählt'],
      ['rejected', 'verworfen'],
    ]);
    select('usage', 'Verwendung (Assets)', [
      ['default-game', 'reguläres Spiel'],
      ['conditional', 'bedingt'],
      ['debug-workshop', 'Director/Workshop'],
      ['present', 'vorhanden'],
      ['loadable', 'ladbar'],
      ['disabled', 'deaktiviert'],
      ['unchecked', 'ungeprüft'],
    ]);
    select('archive', 'Archiv', [
      ['all', 'einschließlich Archiv'],
      ['archived', 'nur Archiv'],
    ]);
    form.append(
      node(
        'p',
        'Filter werden kombiniert. Review und Verwendung gelten für Assets; Dokumentationsstand und Umsetzung für Elemente. Andere Bereiche enthalten noch keine durchsuchbaren Einträge.',
        'search-help',
      ),
    );
  }
  const button = node('button', 'Suchen');
  button.type = 'submit';
  form.append(button);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form))
      if (typeof value === 'string' && value.trim()) params.set(key, value.trim());
    window.location.hash = `/search?${params.toString()}`;
  });
  return form;
}
export function searchView(data: Catalog, hash: string): HTMLElement[] {
  const filters = filtersFromHash(hash);
  const results = searchCatalog(data, filters, catalogIndex);
  const count = node('p', `${results.length} Treffer`);
  count.setAttribute('role', 'status');
  const list = node('ul', '', 'search-results');
  for (const entry of results) {
    const item = node('li');
    item.append(
      link(entry.name, entry.href),
      node('span', ` · ${entry.type}`),
      node('p', entry.description),
    );
    list.append(item);
  }
  if (!results.length)
    list.append(node('li', 'Keine passenden Einträge. Ändere die Suchbegriffe oder Filter.'));
  return [searchForm(data, filters), link('Filter zurücksetzen', '#/search'), count, list];
}
export function backlinkView(id: string): HTMLElement {
  const panel = node('section');
  panel.append(node('h2', 'Referenziert von'));
  const links = catalogIndex.backlinks[id] ?? [];
  if (!links.length) panel.append(node('p', 'Keine Rückverweise im aktuellen Katalog.'));
  else {
    const list = node('ul');
    for (const item of links) {
      const row = node('li');
      row.append(link(item.name, item.href));
      list.append(row);
    }
    panel.append(list);
  }
  return panel;
}
export function referenceDetail(reference: Reference): HTMLElement[] {
  const sources = node('ul');
  for (const source of reference.sources) {
    const item = node('li');
    item.append(sourceLink(source));
    sources.append(item);
  }
  const relations = node('ul');
  for (const id of [...reference.elementIds, ...reference.assetIds]) {
    const entry = catalogIndex.entries.find((e) => e.id === id);
    if (!entry) continue;
    const item = node('li');
    item.append(link(entry.name, entry.href));
    relations.append(item);
  }
  return [
    node('p', reference.purpose, 'lead'),
    node('h2', 'Quellen'),
    sources,
    node('h2', 'Bezüge'),
    relations,
    backlinkView(reference.id),
  ];
}
export function specialView(data: Catalog, kind: 'references' | 'effects'): HTMLElement[] {
  const list = node('ul');
  const entries =
    kind === 'references'
      ? catalogIndex.entries.filter((e) => e.kind === 'reference')
      : searchCatalog(data, { query: 'Effekt', kind: 'element' }, catalogIndex);
  for (const entry of entries) {
    const item = node('li');
    item.append(link(entry.name, entry.href), node('p', entry.description));
    list.append(item);
  }
  return [
    node(
      'p',
      kind === 'effects'
        ? 'Effektansicht auf vorhandene Elementdatensätze. Der Lieferpfeil ist eine Codegrafik ohne eigene Bilddatei.'
        : 'Referenzen mit expliziten Bezügen zu Elementen und Assets.',
    ),
    list,
  ];
}
