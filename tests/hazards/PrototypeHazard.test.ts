import { describe, expect, it } from 'vitest';
import {
  PROTOTYPE_PLACEHOLDER_HAZARD,
  projectHazardHitboxToScreen,
} from '../../src/hazards/PrototypeHazard';

describe('prototype placeholder hazard', () => {
  it('defines one immutable hazard with explicit run-space bounds', () => {
    expect(PROTOTYPE_PLACEHOLDER_HAZARD).toEqual({
      id: 'm2-placeholder-barrier',
      type: 'placeholder-barrier',
      hitbox: {
        left: 1_200,
        right: 1_248,
        top: 147,
        bottom: 243,
      },
    });
    expect(Object.isFrozen(PROTOTYPE_PLACEHOLDER_HAZARD)).toBe(true);
    expect(Object.isFrozen(PROTOTYPE_PLACEHOLDER_HAZARD.hitbox)).toBe(true);
  });

  it('derives deterministic screen movement from run distance', () => {
    const initial = projectHazardHitboxToScreen(
      PROTOTYPE_PLACEHOLDER_HAZARD,
      { distance: 400 },
      200,
    );
    const repeated = projectHazardHitboxToScreen(
      PROTOTYPE_PLACEHOLDER_HAZARD,
      { distance: 400 },
      200,
    );
    const advanced = projectHazardHitboxToScreen(
      PROTOTYPE_PLACEHOLDER_HAZARD,
      { distance: 500 },
      200,
    );

    expect(initial).toEqual({ left: 1_000, right: 1_048, top: 147, bottom: 243 });
    expect(repeated).toEqual(initial);
    expect(advanced.left).toBe(initial.left - 100);
    expect(advanced.right).toBe(initial.right - 100);
  });

  it('rejects non-finite presentation inputs', () => {
    expect(() =>
      projectHazardHitboxToScreen(PROTOTYPE_PLACEHOLDER_HAZARD, { distance: Number.NaN }, 200),
    ).toThrow(RangeError);
    expect(() =>
      projectHazardHitboxToScreen(
        PROTOTYPE_PLACEHOLDER_HAZARD,
        { distance: 400 },
        Number.POSITIVE_INFINITY,
      ),
    ).toThrow(RangeError);
  });
});
