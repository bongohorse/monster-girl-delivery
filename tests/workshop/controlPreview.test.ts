import { expect, it } from 'vitest';
import {
  arrowSample,
  controlPreview,
  validArrowValues,
} from '../../workshop/prototypes/delivery-arrow/controls-v0/model';
import { resolvePreviewValues } from '../../workshop/prototypes/delivery-arrow/controls-v0/view';
import { catalog } from '../../workshop/src/catalog';
import { emptyLocalData, serializeLocalData } from '../../workshop/src/localData';
import { WorkshopDraftStore } from '../../workshop/src/WorkshopDraftStore';

it('uses valid link values before matching local presets before defaults, rejecting a broken configuration together', () => {
  const store = new WorkshopDraftStore(catalog, () => ({ getItem: () => null, setItem: () => {} }));
  expect(resolvePreviewValues('#/idea/delivery-arrow-study', store).values).toEqual(
    controlPreview.defaults,
  );
  const data = {
    ...emptyLocalData(),
    presets: [
      {
        id: 'preset-one',
        name: 'Large',
        ideaId: controlPreview.ideaId,
        versionId: controlPreview.versionId,
        variantId: controlPreview.variantId,
        date: '2026-09-30T12:00:00.000Z',
        values: { size: 48, blinkHz: 2, warningSeconds: 4, scrollSpeed: 200 },
      },
    ],
  };
  expect(store.importJSON(serializeLocalData(data)).ok).toBe(true);
  expect(resolvePreviewValues('#/idea/delivery-arrow-study', store).values).toEqual(
    data.presets[0].values,
  );
  expect(resolvePreviewValues('#/idea/delivery-arrow-study?size=64', store).values.size).toBe(64);
  const invalid = resolvePreviewValues('#/idea/delivery-arrow-study?size=999&blinkHz=3', store);
  expect(invalid.error).toBeTruthy();
  expect(invalid.values).toEqual(data.presets[0].values);
  expect(resolvePreviewValues('#/idea/delivery-arrow-study?preset=unknown', store).values).toEqual(
    controlPreview.defaults,
  );
});

it('makes size, blink rate, warning time and speed affect observable schematic samples', () => {
  expect(arrowSample({ size: 48, blinkHz: 2, warningSeconds: 4, scrollSpeed: 200 }, 1.25)).toEqual({
    recipientX: 190,
    size: 48,
    visible: true,
    opacity: 0.3,
  });
  expect(arrowSample(controlPreview.defaults, 1.25)).toEqual({
    recipientX: 215,
    size: 32,
    visible: true,
    opacity: 1,
  });
  expect(arrowSample({ ...controlPreview.defaults, warningSeconds: 0.5 }, 1.25).visible).toBe(
    false,
  );
  expect(validArrowValues({ ...controlPreview.defaults, size: NaN })).toBe(false);
  expect(validArrowValues({ ...controlPreview.defaults, size: Infinity })).toBe(false);
});
