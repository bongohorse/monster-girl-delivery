import { expect, it } from 'vitest';
import { effectAt, pickupRing } from '../../workshop/prototypes/pickup-ring/v1/model';
import { importedVariantHash, validConfiguration } from '../../workshop/src/prototypeConfiguration';

it('validates an independent idea with its own controls without delivery defaults', () => {
  expect(
    validConfiguration({
      ideaId: pickupRing.ideaId,
      versionId: pickupRing.versionId,
      variantId: 'ring',
      values: { radius: 32, duration: 0.6 },
    }),
  ).toBe(true);
  expect(
    validConfiguration({
      ideaId: pickupRing.ideaId,
      versionId: pickupRing.versionId,
      variantId: 'tracking-arrow',
      values: { ...pickupRing.defaults },
    }),
  ).toBe(false);
  expect(
    validConfiguration({
      ideaId: 'delivery-arrow-study',
      versionId: pickupRing.versionId,
      variantId: 'ring',
      values: { ...pickupRing.defaults },
    }),
  ).toBe(false);
  expect(effectAt(0.3, { radius: 32, duration: 0.6 })).toEqual({ radius: 16, opacity: 0.5 });
});

import { catalog } from '../../workshop/src/catalog';
import { buildHandoff, handoffMarkdown } from '../../workshop/src/handoff';
import { emptyLocalData, parseLocalData, serializeLocalData } from '../../workshop/src/localData';

it('restores an imported concept on a bare version link without overriding explicit link values', () => {
  const data = emptyLocalData();
  data.presets.push({
    id: 'exported-preview',
    name: 'Exportierte Vorschau',
    ideaId: pickupRing.ideaId,
    versionId: pickupRing.versionId,
    variantId: 'disc',
    values: { radius: 32, duration: 0.6 },
    date: '2026-10-01T12:00:00.000Z',
  });
  expect(importedVariantHash(data, pickupRing.versionId, '#/version/pickup-ring-v1')).toBe(
    '#/version/pickup-ring-v1?variant=disc',
  );
  expect(importedVariantHash(data, pickupRing.versionId, '')).toBe('#?variant=disc');
  const explicit = '#/version/pickup-ring-v1?variant=ring&radius=48&duration=1';
  expect(importedVariantHash(data, pickupRing.versionId, explicit)).toBe(explicit);
  expect(
    importedVariantHash(data, pickupRing.versionId, '#/version/pickup-ring-v1?radius=48'),
  ).toBe('#/version/pickup-ring-v1?radius=48&variant=disc');
  expect(importedVariantHash(data, 'delivery-arrow-v1', '#/version/delivery-arrow-v1')).toBe(
    '#/version/delivery-arrow-v1',
  );
});

it('exports the independent idea from its effective values, sources and own units', () => {
  const config = {
    ideaId: pickupRing.ideaId,
    versionId: pickupRing.versionId,
    variantId: 'disc',
    values: { radius: 32, duration: 0.6 },
  };
  const h = buildHandoff(
    config,
    catalog,
    'Ring beim echten Pickup zeigen',
    '2026-10-01T12:00:00.000Z',
  );
  expect(h.configuration).toEqual(config);
  expect(h.state).toBe('draft');
  expect(h.controls.map((c) => c.id)).toEqual(['radius', 'duration']);
  expect(handoffMarkdown(h)).toContain('duration: 0.6 s');
  expect(h.sources[0].elementId).toBe('parcel');
  expect(handoffMarkdown(h)).toContain('/blob/1fafb9e71a704ae2848bb5215c65328cb422441a/');
  const bundle = {
    ...emptyLocalData(),
    presets: [{ id: 'ring-preset', name: 'Ring', ...config, date: h.date }],
  };
  expect(parseLocalData(serializeLocalData(bundle), catalog)).toEqual({ ok: true, data: bundle });
  const changed = structuredClone(catalog);
  changed.reviews.push({
    id: 'selected-ring',
    ...config,
    date: h.date,
    text: 'Fixture selection',
    sourceUrl: 'https://example.org/decision',
    review: {
      likes: 'Ring',
      dislikes: '',
      desiredChange: '',
      decision: 'selected',
      decisionSource: 'Fixture only',
    },
  });
  expect(buildHandoff(config, changed, '', h.date).state).toBe('selected');
  expect(
    buildHandoff({ ...config, values: { radius: 34, duration: 0.6 } }, changed, '', h.date).state,
  ).toBe('draft');
});

import { validateCatalog } from '../../workshop/src/catalogValidation';

it('rejects a registration that omits its executable view from the source binding', () => {
  const data = structuredClone(catalog);
  const version = data.versions.find((v) => v.id === pickupRing.versionId);
  if (!version) throw new Error('Missing example registration');
  version.sourcePaths = version.sourcePaths.filter((path) => !path.endsWith('/view.ts'));
  expect(validateCatalog(data).join('\n')).toContain('Versionsquelle nicht gebunden');
});

it('revokes a selected handoff when the latest published decision rejects the same configuration', () => {
  const config = {
    ideaId: pickupRing.ideaId,
    versionId: pickupRing.versionId,
    variantId: 'ring',
    values: { ...pickupRing.defaults },
  };
  const data = structuredClone(catalog);
  const selected = {
    id: 'selected-ring',
    ...config,
    date: '2026-10-01T10:00:00.000Z',
    text: 'Initial published selection',
    sourceUrl: 'https://example.org/selected',
    review: {
      likes: 'Ring',
      dislikes: '',
      desiredChange: '',
      decision: 'selected' as const,
      decisionSource: 'Published selection fixture',
    },
  };
  const rejected = {
    ...selected,
    id: 'rejected-ring',
    date: '2026-10-01T11:00:00.000Z',
    sourceUrl: 'https://example.org/rejected',
    review: { ...selected.review, decision: 'rejected' as const },
  };
  data.reviews.push(selected, rejected);
  expect(validateCatalog(data)).toEqual([]);
  const history = structuredClone(data.reviews);
  for (const reviews of [history, [...history].reverse()]) {
    data.reviews = reviews;
    const before = structuredClone(reviews);
    const handoff = buildHandoff(config, data, '', '2026-10-01T12:00:00.000Z');
    expect(handoff.state).toBe('draft');
    expect(handoff.selection).toBeNull();
    const markdown = handoffMarkdown(handoff);
    expect(markdown).toContain('# Entwurfs-Handoff:');
    expect(markdown).not.toContain('Auswahlbeleg:');
    expect(markdown).not.toContain(selected.sourceUrl);
    expect(data.reviews).toEqual(before);
  }
  expect(history).toEqual([selected, rejected]);
  const reselected = {
    ...selected,
    id: 'reselected-ring',
    date: '2026-10-01T12:00:00.000Z',
    sourceUrl: 'https://example.org/reselected',
  };
  data.reviews = [
    reselected,
    rejected,
    selected,
    {
      ...selected,
      id: 'new-feedback',
      date: '2026-10-01T13:00:00.000Z',
      review: { ...selected.review, decision: 'open' },
    },
    {
      ...rejected,
      id: 'other-configuration',
      date: '2026-10-01T14:00:00.000Z',
      values: { ...config.values, radius: 32 },
    },
  ];
  expect(validateCatalog(data)).toEqual([]);
  const handoff = buildHandoff(config, data, '', '2026-10-01T15:00:00.000Z');
  expect(handoff.state).toBe('selected');
  expect(handoff.selection?.reviewId).toBe(reselected.id);
  expect(handoff.selection?.sourceUrl).toBe(reselected.sourceUrl);
  data.reviews = [selected, { ...rejected, date: selected.date }];
  expect(buildHandoff(config, data, '', handoff.date).state).toBe('draft');
  for (const decision of [selected, rejected]) {
    data.reviews = [{ ...decision, date: 'not-a-date' }];
    expect(validateCatalog(data).join('\n')).toContain('Ungültiges Reviewdatum');
  }
});
