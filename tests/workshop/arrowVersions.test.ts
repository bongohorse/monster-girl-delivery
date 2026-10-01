import { expect, it } from 'vitest';
import { sceneAt as first, pilotV1 } from '../../workshop/prototypes/delivery-arrow/v1/model';
import { pilotV2, sceneAt as second } from '../../workshop/prototypes/delivery-arrow/v2/model';

it('changes cue motion while preserving the same runner geometry and shared-time boundaries', () => {
  const values = { ...pilotV1.defaults };
  const a = first(5.25, values, 'tracking-arrow');
  const b = second(5.25, values, 'tracking-arrow');
  expect(b.recipientX).toBe(a.recipientX);
  expect(b.parcelX).toBe(a.parcelX);
  expect(b.phase).toBe(a.phase);
  expect(b.cueOpacity).not.toBe(a.cueOpacity);
  expect(second(5, { ...values, scrollSpeed: 300 }, 'tracking-arrow').cueRotation).toBe(0);
  expect(first(5, { ...values, scrollSpeed: 300 }, 'tracking-arrow').cueRotation).toBe(90);
  expect(second(7, values, 'tracking-arrow').cueRotation).toBe(90);
  expect(second(8, values, 'tracking-arrow').cueVisible).toBe(false);
  expect(second(3, values, 'height-arrow')).toEqual(second(3, values, 'height-arrow'));
  expect(pilotV1.defaults).toEqual({ size: 36, blinkHz: 1.5, warningSeconds: 3, scrollSpeed: 180 });
  expect(pilotV2.defaults).toEqual({ size: 40, blinkHz: 1, warningSeconds: 4, scrollSpeed: 180 });
});

import { catalog } from '../../workshop/src/catalog';
import { emptyLocalData, parseLocalData, serializeLocalData } from '../../workshop/src/localData';
import { shareConfiguration } from '../../workshop/src/versionViews';

it('roundtrips concrete v2 feedback and requires a source for a local decision', () => {
  const config = {
    ideaId: pilotV2.ideaId,
    versionId: pilotV2.versionId,
    variantId: 'tracking-arrow',
    values: { ...pilotV2.defaults },
  };
  const data = {
    ...emptyLocalData(),
    presets: [{ id: 'v2-preset', name: 'v2', ...config, date: '2026-10-01T12:00:00.000Z' }],
    feedback: [
      {
        id: 'v2-review',
        ...config,
        text: 'Review',
        date: '2026-10-01T12:00:00.000Z',
        review: {
          likes: 'Pulsieren',
          dislikes: '',
          desiredChange: 'größer',
          decision: 'selected' as const,
          decisionSource: 'Eigene lokale Bewertung',
        },
      },
    ],
  };
  expect(parseLocalData(serializeLocalData(data), catalog)).toEqual({ ok: true, data });
  data.feedback[0].review.decisionSource = '';
  expect(parseLocalData(serializeLocalData(data), catalog).ok).toBe(false);
  data.feedback[0].review.decisionSource = 'Quelle';
  data.presets[0].variantId = 'preview';
  expect(parseLocalData(serializeLocalData(data), catalog).ok).toBe(false);
});
it('shares all effective values with version and concept independent of local preset IDs', () => {
  const url = new URL(
    shareConfiguration(
      {
        ideaId: pilotV2.ideaId,
        versionId: pilotV2.versionId,
        variantId: 'edge-beacon',
        values: { ...pilotV2.defaults, size: 56 },
      },
      'https://example.org/monster-girl-delivery/workshop/#/version/delivery-arrow-v2?preset=local-only',
    ),
  );
  expect(url.pathname).toBe('/monster-girl-delivery/workshop/');
  expect(url.hash).toBe(
    '#/version/delivery-arrow-v2?variant=edge-beacon&size=56&blinkHz=1&warningSeconds=4&scrollSpeed=180',
  );
});

import { validateCatalog } from '../../workshop/src/catalogValidation';
import { resolveRoute } from '../../workshop/src/navigation';

it('routes comparisons and validates published review targets and decision evidence', () => {
  expect(resolveRoute('#/compare/delivery-arrow-study?time=6', catalog).kind).toBe('compare');
  expect(resolveRoute('#/compare/missing', catalog).kind).toBe('not-found');
  const data = structuredClone(catalog);
  data.reviews.push({
    id: 'review-fixture',
    ideaId: pilotV2.ideaId,
    versionId: pilotV2.versionId,
    variantId: 'height-arrow',
    values: { ...pilotV2.defaults },
    date: '2026-10-01',
    text: 'Validation fixture only',
    sourceUrl: 'https://example.org/review',
    review: {
      likes: 'Readable',
      dislikes: '',
      desiredChange: '',
      decision: 'selected',
      decisionSource: 'Fixture source',
    },
  });
  expect(validateCatalog(data)).toEqual([]);
  data.reviews[0].review.decisionSource = '';
  expect(validateCatalog(data)).not.toEqual([]);
  data.reviews[0].review.decisionSource = 'Fixture source';
  data.reviews[0].versionId = 'missing';
  expect(validateCatalog(data)).not.toEqual([]);
});
