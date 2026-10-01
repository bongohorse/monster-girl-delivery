import type { Asset, Catalog, Category, Element, Reference } from './catalog';

export const sections = [
  { id: 'documentation', name: 'Dokumentation' },
  { id: 'ideas', name: 'Ideen & Prototypen', subtitle: 'Prototype Lab' },
  { id: 'reviews', name: 'Review & Entscheidungen' },
  { id: 'integration', name: 'Spielintegration' },
] as const;

export type SectionId = (typeof sections)[number]['id'];
export interface Breadcrumb {
  label: string;
  href?: string;
}

type RouteContent =
  | { kind: 'section' }
  | { kind: 'search' | 'references' | 'effects' }
  | { kind: 'reference'; reference: Reference }
  | { kind: 'category'; category: Category }
  | { kind: 'element'; element: Element; category: Category }
  | { kind: 'asset'; asset: Asset }
  | { kind: 'not-found' };
export type Route = RouteContent & {
  section: SectionId | null;
  title: string;
  breadcrumbs: Breadcrumb[];
};

export function resolveRoute(hash: string, data: Catalog): Route {
  const path =
    hash === '' || hash === '#' ? '/documentation' : hash.replace(/^#/, '').split('?')[0];
  const special = (
    {
      '/search': ['search', 'Suche'],
      '/references': ['references', 'Referenzen'],
      '/effects': ['effects', 'Effekte'],
    } as const
  )[path as '/search' | '/references' | '/effects'];
  if (special)
    return {
      kind: special[0],
      title: special[1],
      section: 'documentation',
      breadcrumbs: [{ label: 'Dokumentation', href: '#/documentation' }, { label: special[1] }],
    };
  const reference = data.references.find((item) => path === `/reference/${item.id}`);
  if (reference)
    return {
      kind: 'reference',
      reference,
      title: reference.name,
      section: 'documentation',
      breadcrumbs: [{ label: 'Referenzen', href: '#/references' }, { label: reference.name }],
    };
  const section = sections.find((item) => path === `/${item.id}`);
  if (section) {
    return {
      kind: 'section',
      section: section.id,
      title: section.name,
      breadcrumbs: [{ label: section.name }],
    };
  }
  const category = data.categories.find((item) => path === `/documentation/${item.id}`);
  const root = { label: 'Dokumentation', href: '#/documentation' };
  if (category) {
    return {
      kind: 'category',
      section: 'documentation',
      category,
      title: category.name,
      breadcrumbs: [root, { label: category.name }],
    };
  }
  const element = data.elements.find((item) => path === `/element/${item.id}`);
  const owner = element && data.categories.find((item) => item.id === element.categoryId);
  if (element && owner) {
    return {
      kind: 'element',
      section: 'documentation',
      element,
      category: owner,
      title: element.name,
      breadcrumbs: [
        root,
        { label: owner.name, href: `#/documentation/${owner.id}` },
        { label: element.name },
      ],
    };
  }
  const asset = data.assets.find((item) => path === `/asset/${item.id}`);
  const assetOwner = asset && data.elements.find((item) => item.assetIds.includes(asset.id));
  const assetCategory =
    assetOwner && data.categories.find((item) => item.id === assetOwner.categoryId);
  if (asset && assetOwner && assetCategory) {
    return {
      kind: 'asset',
      asset,
      section: 'documentation',
      title: asset.name,
      breadcrumbs: [
        root,
        { label: assetCategory.name, href: `#/documentation/${assetCategory.id}` },
        { label: assetOwner.name, href: `#/element/${assetOwner.id}` },
        { label: asset.name },
      ],
    };
  }
  return {
    kind: 'not-found',
    section: null,
    title: 'Seite nicht gefunden',
    breadcrumbs: [{ label: 'Seite nicht gefunden' }],
  };
}
