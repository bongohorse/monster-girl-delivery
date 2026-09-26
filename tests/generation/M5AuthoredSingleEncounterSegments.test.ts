import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  createLiveEncounterPolicyState,
  evaluateLiveEncounterReadability,
  scaleLiveEncounterRunMotion,
  selectLiveEncounterCandidates,
} from '../../src/generation/LiveEncounterPolicy';
import {
  M5_LIVE_SINGLE_ENCOUNTER_SEGMENTS,
  PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG,
} from '../../src/generation/M5LiveEncounterCatalog';
import {
  M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS,
  M5_OPENING_SINGLE_ENCOUNTER_SEGMENTS,
  M5_SEGMENT_LASER_HIGH,
  M5_SEGMENT_MISSILE_BAIT_DODGE,
  M5_SEGMENT_ZAPPER_TIMED_CENTER,
  M5_SEGMENT_ZAPPER_VERTICAL_UPPER,
} from '../../src/generation/M5AuthoredSingleEncounterSegments';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { validatePattern } from '../../src/generation/PatternValidator';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';

const countCollectibles = (pattern: (typeof M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS)[number]) =>
  (pattern.collectiblePaths ?? []).reduce((total, path) => total + path.points.length, 0);

describe('M5 authored single-decision encounter segments', () => {
  it('defines seven unique singles while keeping only six pacing-compatible segments live', () => {
    expect(M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS).toHaveLength(7);
    expect(new Set(M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS.map((pattern) => pattern.id)).size).toBe(
      7,
    );
    expect(
      new Set(
        M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS.map((pattern) => pattern.profile.varietyFamilyId),
      ).size,
    ).toBe(7);

    for (const pattern of M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS) {
      expect(pattern.entries).toHaveLength(1);
    }
    expect(M5_LIVE_SINGLE_ENCOUNTER_SEGMENTS).toHaveLength(6);
    for (const pattern of M5_LIVE_SINGLE_ENCOUNTER_SEGMENTS) {
      expect(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG).toContain(pattern);
    }
    expect(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG).not.toContain(
      M5_SEGMENT_MISSILE_BAIT_DODGE,
    );
  });

  it.each(M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS)(
    '$id passes existing geometry, reachability and collectible-route validation',
    (pattern) => {
      expect(validatePattern(pattern)).toEqual({ valid: true, issues: [] });
    },
  );

  it.each(M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS)(
    '$id schedules deterministically through the existing scheduler',
    (pattern) => {
      const schedule = () =>
        scheduleNextPattern({
          catalog: [pattern],
          patternStartDistance: 4_000,
          reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
          state: createRunGenerationState('m5-single-segment'),
        });
      const first = schedule();
      const replay = schedule();

      expect(replay).toEqual(first);
      expect(first).toMatchObject({ status: 'accepted', patternId: pattern.id });
      if (first.status !== 'accepted') {
        throw new Error(`Expected ${pattern.id} to schedule.`);
      }
      expect(first.spawns).toHaveLength(1);
    },
  );

  it('admits the three opening segments at tier zero Low pacing', () => {
    const runDistance = 1_600;
    for (const pattern of M5_OPENING_SINGLE_ENCOUNTER_SEGMENTS) {
      const state = createLiveEncounterPolicyState(
        runDistance,
        PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
      );
      const selection = selectLiveEncounterCandidates([pattern], runDistance, state);

      expect(selection).toMatchObject({
        difficulty: { tierIndex: 0 },
        pacing: { intensity: 'low' },
        primaryCatalog: [pattern],
      });
    }
  });

  it('admits non-telegraphed later vocabulary at tier-one Medium pacing', () => {
    for (const pattern of [M5_SEGMENT_ZAPPER_VERTICAL_UPPER, M5_SEGMENT_ZAPPER_TIMED_CENTER]) {
      const openingState = createLiveEncounterPolicyState(
        1_600,
        PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
      );
      const opening = selectLiveEncounterCandidates([pattern], 1_600, openingState);
      expect(opening.primaryCatalog).toEqual([]);
      expect(opening.deferredCatalog).toEqual([]);

      const laterState = createLiveEncounterPolicyState(
        3_900,
        PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
      );
      const later = selectLiveEncounterCandidates([pattern], 3_900, laterState);
      expect(later).toMatchObject({
        difficulty: { tierIndex: 1 },
        pacing: { intensity: 'medium' },
        primaryCatalog: [pattern],
      });
    }
  });

  it('keeps Laser and Missile out of short phases and exposes their real High readability result', () => {
    for (const pattern of [M5_SEGMENT_LASER_HIGH, M5_SEGMENT_MISSILE_BAIT_DODGE]) {
      expect(pattern.profile.pacingIntensities).toEqual(['high', 'peak']);
      const mediumState = createLiveEncounterPolicyState(
        3_900,
        PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
      );
      const medium = selectLiveEncounterCandidates([pattern], 3_900, mediumState);
      expect(medium.primaryCatalog).toEqual([]);
      expect(medium.deferredCatalog).toEqual([]);
    }

    const highDistance = 6_400;
    const highState = createLiveEncounterPolicyState(
      highDistance,
      PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
    );
    const scrollSpeed = scaleLiveEncounterRunMotion(
      { baseScrollSpeed: 350 },
      highDistance,
    ).baseScrollSpeed;

    const laserSelection = selectLiveEncounterCandidates(
      [M5_SEGMENT_LASER_HIGH],
      highDistance,
      highState,
    );
    expect(laserSelection.primaryCatalog).toEqual([M5_SEGMENT_LASER_HIGH]);
    const laserEvaluation = evaluateLiveEncounterReadability(
      laserSelection.primaryCatalog,
      highState,
      laserSelection.pacing,
      0,
      highDistance,
      highDistance,
      scrollSpeed,
      PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
    )[0];
    expect(laserEvaluation).toMatchObject({
      intrinsicallyEligible: true,
      decision: { status: 'reserved' },
    });

    const missileSelection = selectLiveEncounterCandidates(
      [M5_SEGMENT_MISSILE_BAIT_DODGE],
      highDistance,
      highState,
    );
    expect(missileSelection.primaryCatalog).toEqual([M5_SEGMENT_MISSILE_BAIT_DODGE]);
    const missileEvaluation = evaluateLiveEncounterReadability(
      missileSelection.primaryCatalog,
      highState,
      missileSelection.pacing,
      0,
      highDistance,
      highDistance,
      scrollSpeed,
      PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
    )[0];
    expect(missileEvaluation).toMatchObject({
      intrinsicallyEligible: true,
      decision: { status: 'deferred' },
    });
  });

  it('keeps collectible-bearing segments sparse and leaves the Missile uncluttered', () => {
    for (const pattern of M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS) {
      const collectibleCount = countCollectibles(pattern);
      if (pattern.profile.varietyFamilyId === 'm5-missile') {
        expect(pattern.collectiblePaths).toBeUndefined();
        expect(collectibleCount).toBe(0);
        continue;
      }

      expect(pattern.collectiblePaths).toHaveLength(1);
      expect(collectibleCount).toBeGreaterThan(5);
      expect(collectibleCount).toBeLessThanOrEqual(16);
    }
  });
});
