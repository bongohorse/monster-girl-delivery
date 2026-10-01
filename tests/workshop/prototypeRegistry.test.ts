import { expect, it } from 'vitest';
import { effectAt, pickupRing } from '../../workshop/prototypes/pickup-ring/v1/model';
import { validConfiguration } from '../../workshop/src/prototypeConfiguration';

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
