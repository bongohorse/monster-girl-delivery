import type { Catalog } from './catalog.ts';

export interface SearchEntry {
  id: string;
  name: string;
  description: string;
  kind: 'element' | 'asset' | 'reference';
  categoryIds: string[];
  type: string;
  tags: string[];
  href: string;
  documentation?: string;
  implementation?: string;
  review?: string;
  usage?: string;
  archived: boolean;
}
export interface SearchFilters {
  query?: string;
  categoryId?: string;
  kind?: string;
  type?: string;
  section?: string;
  documentation?: string;
  implementation?: string;
  review?: string;
  usage?: string;
  archive?: string;
}
export interface CatalogIndex {
  entries: SearchEntry[];
  backlinks: Record<string, { id: string; name: string; href: string }[]>;
}

/** Views and backlinks are derived from the same authored records, never copied lists. */
export function createCatalogIndex(data: Catalog): CatalogIndex {
  const entries: SearchEntry[] = [
    ...data.elements.map(
      (e): SearchEntry => ({
        id: e.id,
        name: e.name,
        description: e.description,
        kind: 'element',
        categoryIds: [e.categoryId],
        type: e.type,
        tags: e.tags,
        href: `#/element/${e.id}`,
        documentation: e.documentation.state,
        implementation: e.implementation,
        archived: e.archived,
      }),
    ),
    ...data.assets.map((a): SearchEntry => {
      const owners = data.elements.filter((e) => a.elementIds.includes(e.id));
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        kind: 'asset',
        categoryIds: [...new Set(owners.map((e) => e.categoryId))],
        type: 'Asset',
        tags: [a.variant, ...owners.flatMap((e) => e.tags)],
        href: `#/asset/${a.id}`,
        review: a.review.state,
        usage: a.usage.state,
        archived: a.archived,
      };
    }),
    ...data.references.map(
      (r): SearchEntry => ({
        id: r.id,
        name: r.name,
        description: r.purpose,
        kind: 'reference',
        categoryIds: [r.categoryId],
        type: 'Referenz',
        tags: r.tags,
        href: `#/reference/${r.id}`,
        archived: false,
      }),
    ),
  ];
  const backlinks: CatalogIndex['backlinks'] = {};
  const add = (sourceId: string, targets: string[]) => {
    const source = entries.find((e) => e.id === sourceId);
    if (!source) return;
    for (const target of new Set(targets)) {
      backlinks[target] ??= [];
      const links = backlinks[target];
      if (!links.some((item) => item.id === source.id))
        links.push({ id: source.id, name: source.name, href: source.href });
    }
  };
  for (const e of data.elements) add(e.id, [...e.relatedElementIds, ...e.assetIds]);
  for (const a of data.assets) add(a.id, a.elementIds);
  for (const r of data.references) add(r.id, [...r.elementIds, ...r.assetIds]);
  return { entries, backlinks };
}

export function searchCatalog(
  data: Catalog,
  filters: SearchFilters,
  index = createCatalogIndex(data),
): SearchEntry[] {
  const terms = filters.query?.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean) ?? [];
  return index.entries.filter((entry) => {
    if (filters.section && filters.section !== 'documentation') return false;
    if (filters.categoryId && !entry.categoryIds.includes(filters.categoryId)) return false;
    for (const key of [
      'kind',
      'type',
      'documentation',
      'implementation',
      'review',
      'usage',
    ] as const) {
      if (filters[key] && entry[key] !== filters[key]) return false;
    }
    if (filters.archive === 'archived' && !entry.archived) return false;
    if (filters.archive !== 'archived' && filters.archive !== 'all' && entry.archived) return false;
    const text = [entry.name, entry.description, ...entry.tags].join(' ').toLocaleLowerCase('de');
    return terms.every((term) => text.includes(term));
  });
}
