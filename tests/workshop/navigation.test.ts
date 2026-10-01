import { describe, expect, it } from 'vitest';
import { catalog } from '../../workshop/src/catalog';
import { resolveRoute } from '../../workshop/src/navigation';

describe('Workshop shared links', () => {
  it('opens a real element and reconstructs its category breadcrumb from a direct link', () => {
    const route = resolveRoute('#/element/red-missile', catalog);
    expect(route.kind).toBe('element');
    expect(route.section).toBe('documentation');
    expect(route.title).toBe('Red Missile');
    expect(route.breadcrumbs).toEqual([
      { label: 'Dokumentation', href: '#/documentation' },
      { label: 'Hazards', href: '#/documentation/hazards' },
      { label: 'Red Missile' },
    ]);
  });

  it('opens an asset directly with its element and category breadcrumbs', () => {
    const route = resolveRoute('#/asset/red-monster-missile', catalog);
    expect(route.kind).toBe('asset');
    expect(route.breadcrumbs).toEqual([
      { label: 'Dokumentation', href: '#/documentation' },
      { label: 'Hazards', href: '#/documentation/hazards' },
      { label: 'Red Missile', href: '#/element/red-missile' },
      { label: 'Red Monster Missile' },
    ]);
  });

  it('keeps empty categories navigable and discovers new categories from data', () => {
    const data = {
      ...catalog,
      categories: [...catalog.categories, { id: 'weather', name: 'Wetter' }],
    };
    expect(resolveRoute('#/documentation/audio', data)).toMatchObject({
      kind: 'category',
      title: 'Audio',
    });
    expect(resolveRoute('#/documentation/weather', data)).toMatchObject({
      kind: 'category',
      title: 'Wetter',
    });
  });

  it('handles missing or unsupported direct links without opening an unrelated page', () => {
    for (const hash of [
      '#/element/missing',
      '#/documentation/missing',
      '#/asset/missing',
      '#/%E0%A4%A',
    ]) {
      expect(resolveRoute(hash, catalog)).toMatchObject({ kind: 'not-found', section: null });
    }
    expect(resolveRoute('', catalog)).toMatchObject({ kind: 'section', section: 'documentation' });
  });

  it('opens each of the four main sections independently', () => {
    for (const section of ['documentation', 'ideas', 'reviews', 'integration']) {
      expect(resolveRoute(`#/${section}`, catalog)).toMatchObject({ kind: 'section', section });
    }
  });
});
