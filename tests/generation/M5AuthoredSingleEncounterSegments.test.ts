import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  createLiveEncounterPolicyState,
  selectLiveEncounterCandidates,
} from '../../src/generation/LiveEncounterPolicy';
import { PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG } from '../../src/generation/M5AuthoredMultiHazardPatterns';
import {
  M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS,
  M5_LATER_SINGLE_ENCOUNTER_SEGMENTS,
  M5_OPENING_SINGLE_ENCOUNTER_SEGMENTS,
} from '../../src/generation/M5AuthoredSingleEncounterSegments';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { validatePattern } from '../../src/generation/PatternValidator';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';

const countCollectibles = (pattern: (typeof M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS)[number]) =>
  (pattern.collectiblePaths ?? []).reduce((total, path) => total + path.points.length, 0);

describe('M5 authored single-decision encounter segments', () => {
  it('defines seven unique one-entry segments without changing the current live catalog', () => {
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
      expect(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG).not.toContain(pattern);
    }
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

  it('withholds later vocabulary at tier zero and admits it at tier one Medium pacing', () => {
    for (const pattern of M5_LATER_SINGLE_ENCOUNTER_SEGMENTS) {
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
