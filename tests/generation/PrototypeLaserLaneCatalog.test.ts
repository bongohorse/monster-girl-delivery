import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import type { HazardPattern } from '../../src/generation/HazardPattern';
import { PROTOTYPE_LASER_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import {
  getPrototypeLaserLaneCenterY,
  PROTOTYPE_LASER_LANES,
  PROTOTYPE_LASER_LANE_PATTERNS,
  selectPrototypeLaserLaneCatalog,
} from '../../src/generation/PrototypeLaserLaneCatalog';
import {
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
  validatePattern,
} from '../../src/generation/PatternValidator';

const centerY = (pattern: Readonly<HazardPattern>): number => {
  const hitbox = pattern.entries[0]?.hitbox;
  if (!hitbox) {
    throw new Error('Expected Laser lane pattern entry.');
  }
  return (hitbox.top + hitbox.bottom) / 2;
};

describe('PrototypeLaserLaneCatalog', () => {
  it('defines five distinct authored horizontal lanes that remain baseline-valid', () => {
    expect(PROTOTYPE_LASER_LANES.map((lane) => lane.id)).toEqual([
      'low',
      'mid-low',
      'middle',
      'mid-high',
      'high',
    ]);
    expect(PROTOTYPE_LASER_LANE_PATTERNS.map(centerY)).toEqual([96, 146, 195, 244, 294]);

    for (const pattern of PROTOTYPE_LASER_LANE_PATTERNS) {
      expect(validatePattern(pattern, PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS)).toMatchObject({
        valid: true,
      });
      expect(
        validatePattern(
          pattern,
          PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
          PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
        ),
      ).toMatchObject({ valid: true });
    }
  });

  it('selects lanes deterministically without changing the live catalog slot count or order', () => {
    const catalog = Object.freeze([
      PROTOTYPE_LASER_PATTERN,
      PROTOTYPE_LASER_LANE_PATTERNS[0]!,
    ]);

    const first = selectPrototypeLaserLaneCatalog(
      catalog,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      7,
    );
    const replay = selectPrototypeLaserLaneCatalog(
      catalog,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      7,
    );
    const other = selectPrototypeLaserLaneCatalog(
      catalog,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      8,
    );

    expect(first).toHaveLength(catalog.length);
    expect(first.map((pattern) => pattern.id)).toEqual(catalog.map((pattern) => pattern.id));
    expect(centerY(first[0]!)).toBe(centerY(replay[0]!));
    expect(centerY(first[0]!)).not.toBe(centerY(other[0]!));
    expect(first[1]).toBe(catalog[1]);
  });

  it('maps authored lane ratios through expanded vertical constraints', () => {
    const expanded = Object.freeze({
      ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      playableTop: -52,
      playableBottom: 342,
    });

    const centers = PROTOTYPE_LASER_LANES.map((lane) =>
      getPrototypeLaserLaneCenterY(lane, expanded),
    );
    expect(centers[0]).toBeLessThan(96);
    expect(centers[2]).toBeCloseTo(145, 10);
    expect(centers[4]).toBeLessThan(294);
    expect(centers).toEqual([...centers].sort((a, b) => a - b));
  });
});
