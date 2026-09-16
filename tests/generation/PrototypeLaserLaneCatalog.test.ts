import { describe, expect, it } from 'vitest';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import { createGeneratedHazardStream } from '../../src/generation/GeneratedHazardStream';
import type { HazardPattern } from '../../src/generation/HazardPattern';
import {
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
  validatePattern,
} from '../../src/generation/PatternValidator';
import { PROTOTYPE_LASER_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import {
  getPrototypeLaserLaneCenterY,
  PROTOTYPE_LASER_GROUP_PATTERNS,
  PROTOTYPE_LASER_GROUPS,
  PROTOTYPE_LASER_LANE_PATTERNS,
  PROTOTYPE_LASER_LANES,
  selectPrototypeLaserLaneCatalog,
} from '../../src/generation/PrototypeLaserLaneCatalog';

const centerY = (pattern: Readonly<HazardPattern>): number => {
  const hitbox = pattern.entries[0]?.hitbox;
  if (!hitbox) {
    throw new Error('Expected Laser lane pattern entry.');
  }
  return (hitbox.top + hitbox.bottom) / 2;
};

const centers = (pattern: Readonly<HazardPattern>): ReadonlyArray<number> =>
  pattern.entries.map((entry) => (entry.hitbox.top + entry.hitbox.bottom) / 2);

const charges = (pattern: Readonly<HazardPattern>): ReadonlyArray<number | null> =>
  pattern.entries.map((entry) =>
    entry.behavior.kind === 'laser' ? entry.behavior.lifecycle.chargeSeconds : null,
  );

const generatedCenterY = (seed: number): number => {
  const stream = createGeneratedHazardStream(
    seed,
    { catalog: [PROTOTYPE_LASER_PATTERN] },
    PROTOTYPE_RUN_MOTION_DEFAULTS,
  );
  const spawn = stream.spawns[0];
  if (!spawn) {
    throw new Error('Expected generated Laser spawn.');
  }
  return (spawn.hitbox.top + spawn.hitbox.bottom) / 2;
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
    expect(PROTOTYPE_LASER_LANE_PATTERNS.map(centerY)).toEqual([294, 244, 195, 146, 96]);

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

  it('authors simultaneous corridors, directional sweeps, and an alternating pair', () => {
    expect(PROTOTYPE_LASER_GROUPS.map((group) => group.id)).toEqual([
      'bottom-stack',
      'top-stack',
      'center-corridor',
      'sweep-down',
      'sweep-up',
      'alternating-pair',
    ]);
    expect(PROTOTYPE_LASER_GROUP_PATTERNS.map(centers)).toEqual([
      [294, 244, 195],
      [195, 146, 96],
      [294, 96],
      [96, 195, 294],
      [294, 195, 96],
      [294, 96],
    ]);
    expect(charges(PROTOTYPE_LASER_GROUP_PATTERNS[5] as Readonly<HazardPattern>)).toEqual([
      0.55,
      1.25,
    ]);

    for (const index of [0, 1, 2, 5]) {
      const pattern = PROTOTYPE_LASER_GROUP_PATTERNS[index];
      if (!pattern) {
        throw new Error('Expected geometry-safe Laser group pattern.');
      }
      expect(validatePattern(pattern, PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS)).toMatchObject({
        valid: true,
      });
    }

    expect(
      PROTOTYPE_LASER_GROUPS.filter((group) => group.generatorEligible).map((group) => group.id),
    ).toEqual(['center-corridor', 'alternating-pair']);
  });

  it('selects lanes deterministically without changing the live catalog slot count or order', () => {
    const comparisonPattern = PROTOTYPE_LASER_LANE_PATTERNS[0];
    if (!comparisonPattern) {
      throw new Error('Expected at least one Laser lane pattern.');
    }
    const catalog = Object.freeze([PROTOTYPE_LASER_PATTERN, comparisonPattern]);

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
    const firstLaser = first[0];
    const replayLaser = replay[0];
    const otherLaser = other[0];
    if (!firstLaser || !replayLaser || !otherLaser) {
      throw new Error('Expected deterministic Laser slot in every selected catalog.');
    }

    expect(first).toHaveLength(catalog.length);
    expect(first.map((pattern) => pattern.id)).toEqual(catalog.map((pattern) => pattern.id));
    expect(centerY(firstLaser)).toBe(centerY(replayLaser));
    expect(centerY(firstLaser)).not.toBe(centerY(otherLaser));
    expect(first[1]).toBe(catalog[1]);
  });

  it('replaces the same live Laser slot only with groups allowed by current live policy', () => {
    const catalog = Object.freeze([PROTOTYPE_LASER_PATTERN]);
    const selected = [25, 30].map((prngState) =>
      selectPrototypeLaserLaneCatalog(catalog, PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS, prngState),
    );
    const selectedPatterns = selected.map((candidate) => candidate[0] as Readonly<HazardPattern>);

    expect(selected.map((candidate) => candidate.length)).toEqual([1, 1]);
    expect(selectedPatterns.map(centers)).toEqual([
      [294, 96],
      [294, 96],
    ]);
    expect(selectedPatterns.map(charges)).toEqual([
      [0.8, 0.8],
      [0.55, 1.25],
    ]);
    expect(selected.every((candidate) => candidate[0]?.id === PROTOTYPE_LASER_PATTERN.id)).toBe(
      true,
    );
  });

  it('varies the real generated Laser lane by seed while replaying the same seed exactly', () => {
    expect(generatedCenterY(0)).toBe(294);
    expect(generatedCenterY(1)).toBe(244);
    expect(generatedCenterY(0)).toBe(generatedCenterY(0));
  });

  it('maps authored lane ratios through expanded vertical constraints', () => {
    const expanded = Object.freeze({
      ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      playableTop: -52,
      playableBottom: 342,
    });

    const mappedCenters = PROTOTYPE_LASER_LANES.map((lane) =>
      getPrototypeLaserLaneCenterY(lane, expanded),
    );
    expect(mappedCenters[0]).toBeLessThan(294);
    expect(mappedCenters[2]).toBeCloseTo(145, 10);
    expect(mappedCenters[4]).toBeLessThan(96);
    expect(mappedCenters).toEqual([...mappedCenters].sort((a, b) => b - a));
  });
});