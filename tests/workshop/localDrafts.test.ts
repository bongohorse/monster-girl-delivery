import { describe, expect, it } from 'vitest';
import { catalog } from '../../workshop/src/catalog';
import {
  createDraft,
  emptyLocalData,
  parseLocalData,
  serializeLocalData,
} from '../../workshop/src/localData';

describe('Workshop local data boundary', () => {
  it('exports and imports an element-derived draft with its exact source revision', () => {
    const draft = createDraft(catalog, ['delivery-arrow'], 'draft-one', '2026-09-30T12:00:00.000Z');
    draft.question = 'Wird die Vorwarnung besser lesbar?';
    const data = { ...emptyLocalData(), drafts: [draft] };
    const result = parseLocalData(serializeLocalData(data), catalog);
    expect(result).toEqual({ ok: true, data });
    expect(draft.origins[0].revision).toBe('1fafb9e71a704ae2848bb5215c65328cb422441a');
    expect(
      draft.origins[0].sources.some((s) => s.path === 'src/entities/FirstDeliveryPresentation.ts'),
    ).toBe(true);
  });
});

import { controlPreview } from '../../workshop/prototypes/delivery-arrow/controls-v0/model';
import { storageKey, WorkshopDraftStore } from '../../workshop/src/WorkshopDraftStore';

it('keeps existing local data unchanged when any imported preset is invalid', () => {
  const saved = new Map<string, string>([['mgd:save', 'game-untouched']]);
  const storage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  };
  const store = new WorkshopDraftStore(catalog, () => storage);
  const good = {
    ...emptyLocalData(),
    presets: [
      {
        id: 'preset-one',
        name: 'Großer Pfeil',
        ideaId: controlPreview.ideaId,
        versionId: controlPreview.versionId,
        variantId: controlPreview.variantId,
        date: '2026-09-30T12:00:00.000Z',
        values: { size: 48, blinkHz: 2, warningSeconds: 4, scrollSpeed: 200 },
      },
    ],
  };
  expect(store.importJSON(serializeLocalData(good)).ok).toBe(true);
  const previous = store.exportJSON();
  const bad = structuredClone(good);
  bad.presets[0].values.size = 999;
  expect(store.importJSON(serializeLocalData(bad)).ok).toBe(false);
  expect(store.exportJSON()).toBe(previous);
  expect(saved.get(storageKey)).toBe(previous);
  expect(saved.get('mgd:save')).toBe('game-untouched');
  expect(new WorkshopDraftStore(catalog, () => storage).snapshot()).toEqual(good);
});

it('rejects unsupported schemas, versions, variants, unknown controls and nonfinite/out-of-range values', () => {
  const preset = {
    id: 'preset-one',
    name: 'Test',
    ideaId: controlPreview.ideaId,
    versionId: controlPreview.versionId,
    variantId: controlPreview.variantId,
    values: { ...controlPreview.defaults },
    date: '2026-09-30T12:00:00.000Z',
  };
  for (const wrong of [
    { ...preset, versionId: 'delivery-arrow-v2' },
    { ...preset, variantId: 'future' },
    { ...preset, values: { ...preset.values, size: 17 } },
    { ...preset, values: { ...preset.values, blinkHz: 0 } },
    { ...preset, values: { ...preset.values, scrollSpeed: null } },
    { ...preset, values: { ...preset.values, script: 'alert(1)' } },
  ])
    expect(
      parseLocalData(JSON.stringify({ ...emptyLocalData(), presets: [wrong] }), catalog).ok,
    ).toBe(false);
  expect(parseLocalData('{"schemaVersion":2}', catalog).ok).toBe(false);
  expect(parseLocalData('invalid-json', catalog).ok).toBe(false);
  expect(parseLocalData(' '.repeat(512 * 1024 + 1), catalog).ok).toBe(false);
});

it('rejects dangling note targets, duplicated IDs and unsafe sources, treating note content as plain text', () => {
  const draft = createDraft(
    catalog,
    ['delivery-arrow', 'parcel'],
    'draft-one',
    '2026-09-30T12:00:00.000Z',
  );
  const data = {
    ...emptyLocalData(),
    drafts: [draft],
    feedback: [
      {
        id: 'note-one',
        ideaId: draft.id,
        versionId: null,
        variantId: null,
        values: null,
        text: '<script>alert(1)</script>',
        date: draft.date,
      },
    ],
  };
  expect(parseLocalData(serializeLocalData(data), catalog)).toEqual({ ok: true, data });
  const dangling = structuredClone(data);
  dangling.feedback[0].ideaId = 'missing';
  expect(parseLocalData(serializeLocalData(dangling), catalog).ok).toBe(false);
  const duplicate = structuredClone(data);
  duplicate.feedback[0].id = draft.id;
  expect(parseLocalData(serializeLocalData(duplicate), catalog).ok).toBe(false);
  draft.origins[0].sources[0].path = '../outside';
  expect(parseLocalData(serializeLocalData(data), catalog).ok).toBe(false);
});

it('keeps work exportable when storage throws and preserves corrupt stored data until a valid explicit import', () => {
  const store = new WorkshopDraftStore(catalog, () => {
    throw new Error('blocked');
  });
  const data = {
    ...emptyLocalData(),
    drafts: [createDraft(catalog, [], 'free-idea', '2026-09-30T12:00:00.000Z')],
  };
  expect(store.update(data).ok).toBe(true);
  expect(parseLocalData(store.exportJSON(), catalog)).toEqual({ ok: true, data });
  expect(store.message).toContain('Nicht dauerhaft gespeichert');
  let persisted = 'broken';
  const corrupt = new WorkshopDraftStore(catalog, () => ({
    getItem: () => persisted,
    setItem: (_key, value) => {
      persisted = value;
    },
  }));
  expect(corrupt.update(data).ok).toBe(true);
  expect(persisted).toBe('broken');
  expect(corrupt.importJSON('bad').ok).toBe(false);
  expect(persisted).toBe('broken');
  expect(corrupt.importJSON(serializeLocalData(data)).ok).toBe(true);
  expect(persisted).toBe(serializeLocalData(data));
});

it('keeps v0 and v1 presets version/variant bound through the same JSON roundtrip', () => {
  const data = {
    ...emptyLocalData(),
    presets: [
      {
        id: 'pilot-one',
        name: 'v1 tracking',
        ideaId: 'delivery-arrow-study',
        versionId: 'delivery-arrow-v1',
        variantId: 'tracking-arrow',
        values: { size: 36, blinkHz: 1.5, warningSeconds: 3, scrollSpeed: 180 },
        date: '2026-10-01T12:00:00.000Z',
      },
    ],
  };
  expect(parseLocalData(serializeLocalData(data), catalog)).toEqual({ ok: true, data });
  data.presets[0].variantId = 'preview';
  expect(parseLocalData(serializeLocalData(data), catalog).ok).toBe(false);
  data.presets[0].versionId = 'delivery-arrow-controls-v0';
  expect(parseLocalData(serializeLocalData(data), catalog).ok).toBe(true);
});
