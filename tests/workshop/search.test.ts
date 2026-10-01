import { describe, expect, it } from 'vitest';
import { catalog } from '../../workshop/src/catalog';
import { createCatalogIndex, searchCatalog } from '../../workshop/src/search';

const ids = (filters: Parameters<typeof searchCatalog>[1]) =>
  searchCatalog(catalog, filters).map((e) => e.id);
describe('Workshop catalog search', () => {
  it('finds tags and combines filters without conflating review and usage', () => {
    expect(ids({ query: '  GPS  ', categoryId: 'deliveries', kind: 'element' })).toEqual([
      'delivery-arrow',
    ]);
    expect(ids({ kind: 'asset', usage: 'conditional', review: 'selected' })).toEqual([
      'courier-pose-b',
      'courier-pose-c',
    ]);
    expect(ids({ kind: 'asset', usage: 'default-game', review: 'selected' })).toEqual([
      'courier-pose-a',
    ]);
    expect(ids({ kind: 'element', review: 'selected' })).toEqual([]);
  });
  it('searches descriptions with all words, exposes references and filters types and areas', () => {
    expect(ids({ query: 'Phaser-Primitiven GPS' })).toEqual(['delivery-arrow']);
    expect(ids({ kind: 'reference' })).toEqual(['art-gate-reference']);
    expect(ids({ type: 'Mechanik' })).toEqual(['parcel-delivery']);
    expect(ids({ section: 'ideas' })).toEqual(['delivery-arrow-study']);
    expect(ids({ query: 'nichtvorhanden' })).toEqual([]);
    expect(ids({ categoryId: 'audio' })).toEqual([]);
    expect(ids({ archive: 'archived' })).toEqual([]);
  });
  it('derives backlinks and effect results from canonical records', () => {
    const index = createCatalogIndex(catalog);
    expect(index.backlinks['courier-pose-a'].map((e) => e.id)).toEqual([
      'courier-art-gate',
      'art-gate-reference',
    ]);
    expect(index.backlinks.parcel.map((e) => e.id)).toContain('parcel-delivery');
    expect(ids({ query: 'Effekt', kind: 'element' })).toEqual(['delivery-arrow']);
    expect(searchCatalog(catalog, { kind: 'asset' }, index)).toEqual(
      searchCatalog(catalog, { kind: 'asset' }),
    );
  });
});

import { createDraft } from '../../workshop/src/localData';
import { withLocalDrafts } from '../../workshop/src/search';

it('adds local drafts to search and backlinks without altering the generated repository index', () => {
  const index = createCatalogIndex(catalog);
  const draft = createDraft(catalog, ['parcel'], 'local-one', '2026-09-30T12:00:00.000Z');
  draft.question = 'Grelles Paket?';
  const combined = withLocalDrafts(index, [draft]);
  expect(
    searchCatalog(
      catalog,
      { kind: 'draft', query: 'Grelles', section: 'ideas', ideaReview: 'draft' },
      combined,
    ).map((e) => e.id),
  ).toEqual(['local-one']);
  expect(searchCatalog(catalog, { kind: 'draft', ideaReview: 'selected' }, combined)).toEqual([]);
  expect(combined.backlinks.parcel.some((link) => link.id === draft.id)).toBe(true);
  expect(index.backlinks.parcel.some((link) => link.id === draft.id)).toBe(false);
});
