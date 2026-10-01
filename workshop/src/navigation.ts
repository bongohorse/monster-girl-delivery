import type { Catalog, Category, Element } from './catalog';

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
  | { kind: 'category'; category: Category }
  | { kind: 'element'; element: Element; category: Category }
  | { kind: 'not-found' };
export type Route = RouteContent & {
  section: SectionId | null;
  title: string;
  breadcrumbs: Breadcrumb[];
};

export function resolveRoute(hash: string, data: Catalog): Route {
  const path = hash === '' || hash === '#' ? '/documentation' : hash.replace(/^#/, '');
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
  return {
    kind: 'not-found',
    section: null,
    title: 'Seite nicht gefunden',
    breadcrumbs: [{ label: 'Seite nicht gefunden' }],
  };
}
