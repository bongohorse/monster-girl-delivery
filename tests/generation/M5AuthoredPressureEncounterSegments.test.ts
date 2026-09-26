import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  createLiveEncounterPolicyState,
  evaluateLiveEncounterReadability,
  scaleLiveEncounterRunMotion,
  selectLiveEncounterCandidates,
} from '../../src/generation/LiveEncounterPolicy';
import { PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG } from '../../src/generation/M5LiveEncounterCatalog';
import { M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS } from '../../src/generation/M5AuthoredPressureEncounterSegments';
import { M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS } from '../../src/generation/M5AuthoredSingleEncounterSegments';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { validatePattern } from '../../src/generation/PatternValidator';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';

const countCollectibles = (pattern: (typeof M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS)[number]) =>
  (pattern.collectiblePaths ?? []).reduce((total, path) => total + path.points.length, 0);

const evaluateAt = (
  pattern: (typeof M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS)[number],
  runDistance: number,
) => {
  const state = createLiveEncounterPolicyState(runDistance, PROTOTYPE_PATTERN_REACHABILITY_CONTEXT);
  const selection = selectLiveEncounterCandidates([pattern], runDistance, state);
  const scrollSpeed = scaleLiveEncounterRunMotion(
    { baseScrollSpeed: 350 },
    runDistance,
  ).baseScrollSpeed;
  const evaluations = evaluateLiveEncounterReadability(
    [...selection.primaryCatalog, ...selection.deferredCatalog],
    state,
    selection.pacing,
    0,
    runDistance,
    runDistance,
    scrollSpeed,
    PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
  );
  return { evaluations, selection };
};

describe('M5 authored pressure encounter segments', () => {
  it('adds five unique live pressure segments for twelve authored segments total', () => {
    expect(M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS).toHaveLength(5);
    expect(new Set(M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS.map((pattern) => pattern.id)).size).toBe(
      5,
    );
    expect(
      new Set(
        M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS.map((pattern) => pattern.profile.varietyFamilyId),
      ).size,
    ).toBe(5);
    expect(
      M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS.length + M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS.length,
    ).toBe(12);

    for (const pattern of M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS) {
      expect(pattern.entries).toHaveLength(2);
      expect(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG).toContain(pattern);
    }
  });

  it.each(M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS)(
    '$id passes existing geometry, reachability and collectible-route validation',
    (pattern) => {
      expect(validatePattern(pattern)).toEqual({ valid: true, issues: [] });
    },
  );

  it.each(M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS)(
    '$id schedules deterministically through the existing scheduler',
    (pattern) => {
      const schedule = () =>
        scheduleNextPattern({
          catalog: [pattern],
          patternStartDistance: 8_000,
          reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
          state: createRunGenerationState('m5-pressure-segment'),
        });
      const first = schedule();
      const replay = schedule();

      expect(replay).toEqual(first);
      expect(first).toMatchObject({ status: 'accepted', patternId: pattern.id });
      if (first.status !== 'accepted') {
        throw new Error(`Expected ${pattern.id} to schedule.`);
      }
      expect(first.spawns).toHaveLength(2);
    },
  );

  it.each(M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS)(
    '$id is withheld before tier two and admitted during tier-two High pressure',
    (pattern) => {
      const early = evaluateAt(pattern, 6_400);
      expect(early.selection).toMatchObject({
        difficulty: { tierIndex: 1 },
        pacing: { intensity: 'high' },
        primaryCatalog: [],
        deferredCatalog: [],
      });

      const high = evaluateAt(pattern, 7_200);
      expect(high.selection).toMatchObject({
        difficulty: { tierIndex: 2 },
        pacing: { intensity: 'high' },
        primaryCatalog: [pattern],
      });
      expect(high.evaluations[0]).toMatchObject({
        intrinsicallyEligible: true,
        decision: { status: 'reserved' },
      });
    },
  );

  it.each(M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS)(
    '$id remains eligible for the authored Peak beat',
    (pattern) => {
      const peak = evaluateAt(pattern, 11_500);
      expect(peak.selection).toMatchObject({
        difficulty: { tierIndex: 2 },
        pacing: { intensity: 'peak' },
        primaryCatalog: [pattern],
      });
      expect(peak.evaluations[0]).toMatchObject({
        intrinsicallyEligible: true,
        decision: { status: 'reserved' },
      });
    },
  );

  it('keeps every pressure route sparse and single-purpose', () => {
    for (const pattern of M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS) {
      const collectibleCount = countCollectibles(pattern);
      expect(pattern.collectiblePaths).toHaveLength(1);
      expect(collectibleCount).toBeGreaterThan(5);
      expect(collectibleCount).toBeLessThanOrEqual(20);
    }
  });
});
