import { expect, it } from 'vitest';
import {
  advancePlayhead,
  pilotV1,
  sceneAt,
} from '../../workshop/prototypes/delivery-arrow/v1/model';

it('derives pickup, warning and handoff from time, allowing reverse scrubbing without accumulated objects', () => {
  expect(sceneAt(1, pilotV1.defaults, 'height-arrow')).toMatchObject({
    phase: 'approach',
    carrying: false,
    cueVisible: false,
  });
  expect(sceneAt(2, pilotV1.defaults, 'height-arrow')).toMatchObject({
    phase: 'carrying',
    carrying: true,
  });
  expect(sceneAt(5, pilotV1.defaults, 'height-arrow')).toMatchObject({
    phase: 'warning',
    cueVisible: true,
  });
  expect(sceneAt(8, pilotV1.defaults, 'height-arrow')).toMatchObject({
    phase: 'delivered',
    carrying: false,
    cueVisible: false,
  });
  const warning = sceneAt(6, pilotV1.defaults, 'height-arrow');
  sceneAt(9, pilotV1.defaults, 'height-arrow');
  expect(sceneAt(6, pilotV1.defaults, 'height-arrow')).toEqual(warning);
});
it('advances on elapsed time, stops or loops at the end, and preserves speed across frame partitions', () => {
  expect(advancePlayhead(9.5, 1, 1, false)).toEqual({ seconds: 10, ended: true });
  expect(advancePlayhead(9.5, 1, 1, true)).toEqual({ seconds: 0.5, ended: false });
  expect(advancePlayhead(1, 1, 0.5, false).seconds).toBe(1.5);
  expect(advancePlayhead(1, 1, 2, false).seconds).toBe(3);
  let seconds = 0;
  for (let i = 0; i < 60; i++) seconds = advancePlayhead(seconds, 1 / 60, 1, false).seconds;
  expect(seconds).toBeCloseTo(advancePlayhead(0, 1, 1, false).seconds, 10);
});

import {
  isVariant,
  timeline,
  validPilotValues,
} from '../../workshop/prototypes/delivery-arrow/v1/model';

it('keeps concepts distinguishable on a common time and responds to all proposed parameters', () => {
  const fixed = sceneAt(6, pilotV1.defaults, 'height-arrow');
  const tracking = sceneAt(6, pilotV1.defaults, 'tracking-arrow');
  const edge = sceneAt(6, pilotV1.defaults, 'edge-beacon');
  expect(tracking.cueX).toBe(520);
  expect(tracking.cueRotation).toBe(90);
  expect(fixed.cueX).toBe(744);
  expect(edge.seconds).toBe(fixed.seconds);
  expect(sceneAt(6, { ...pilotV1.defaults, scrollSpeed: 300 }, 'tracking-arrow').recipientX).toBe(
    760,
  );
  expect(sceneAt(6, { ...pilotV1.defaults, warningSeconds: 0.5 }, 'height-arrow').cueVisible).toBe(
    false,
  );
  expect(sceneAt(6.25, { ...pilotV1.defaults, blinkHz: 2 }, 'height-arrow').cueOpacity).toBe(0.3);
  expect(timeline({ ...pilotV1.defaults, warningSeconds: 6 })).toContainEqual({
    seconds: 2,
    name: 'Vorwarnung',
  });
  expect(isVariant('preview')).toBe(false);
  expect(validPilotValues({ ...pilotV1.defaults, size: 17 })).toBe(false);
});
