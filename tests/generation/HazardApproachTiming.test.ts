import { describe, expect, it } from 'vitest';
import {
  createHazardReactionWindow,
  evaluateHazardApproachTiming,
  PROTOTYPE_HAZARD_REACTION_TIME_CONSTRAINT,
} from '../../src/generation/HazardApproachTiming';

describe('hazard approach timing', () => {
  it('converts authoritative speed and reaction seconds into logical distance', () => {
    const window = createHazardReactionWindow(
      { baseScrollSpeed: 350 },
      { minimumReactionTimeSeconds: 2.25 },
    );

    expect(PROTOTYPE_HAZARD_REACTION_TIME_CONSTRAINT).toEqual({
      minimumReactionTimeSeconds: 2,
    });
    expect(window).toEqual({
      minimumReactionDistance: 787.5,
      minimumReactionTimeSeconds: 2.25,
      scrollSpeed: 350,
    });
  });

  it('evaluates structured time-to-impact without viewport input', () => {
    const window = createHazardReactionWindow(
      { baseScrollSpeed: 350 },
      { minimumReactionTimeSeconds: 2 },
    );
    const timing = evaluateHazardApproachTiming(900, 200, window);

    expect(timing).toEqual({
      distanceToImpact: 700,
      meetsMinimumReactionTime: true,
      minimumReactionDistance: 700,
      minimumReactionTimeSeconds: 2,
      observedAtRunDistance: 200,
      scrollSpeed: 350,
      targetRunDistance: 900,
      timeToImpactSeconds: 2,
    });
    expect(JSON.stringify(timing)).not.toMatch(/viewport|screen|width|phaser/i);
  });

  it('handles representative speed changes and a stationary world explicitly', () => {
    expect(createHazardReactionWindow({ baseScrollSpeed: 175 })).toMatchObject({
      minimumReactionDistance: 350,
      scrollSpeed: 175,
    });
    expect(createHazardReactionWindow({ baseScrollSpeed: 700 })).toMatchObject({
      minimumReactionDistance: 1_400,
      scrollSpeed: 700,
    });

    const stationaryWindow = createHazardReactionWindow({ baseScrollSpeed: 0 });
    expect(evaluateHazardApproachTiming(500, 100, stationaryWindow)).toMatchObject({
      distanceToImpact: 400,
      meetsMinimumReactionTime: true,
      timeToImpactSeconds: null,
    });
  });

  it('returns deeply immutable deterministic snapshots', () => {
    const window = createHazardReactionWindow({ baseScrollSpeed: 350 });
    const first = evaluateHazardApproachTiming(900, 200, window);
    const repeated = evaluateHazardApproachTiming(900, 200, window);

    expect(repeated).toEqual(first);
    expect(Object.isFrozen(PROTOTYPE_HAZARD_REACTION_TIME_CONSTRAINT)).toBe(true);
    expect(Object.isFrozen(window)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('rejects invalid speeds, reaction constraints, distances, and inconsistent windows', () => {
    for (const baseScrollSpeed of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => createHazardReactionWindow({ baseScrollSpeed })).toThrow(RangeError);
    }

    for (const minimumReactionTimeSeconds of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        createHazardReactionWindow({ baseScrollSpeed: 350 }, { minimumReactionTimeSeconds }),
      ).toThrow(RangeError);
    }

    const window = createHazardReactionWindow({ baseScrollSpeed: 350 });
    expect(() => evaluateHazardApproachTiming(-1, 0, window)).toThrow(RangeError);
    expect(() => evaluateHazardApproachTiming(100, Number.NaN, window)).toThrow(RangeError);
    expect(() =>
      evaluateHazardApproachTiming(100, 0, { ...window, minimumReactionDistance: 699 }),
    ).toThrow(RangeError);
  });
});
