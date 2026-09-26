import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  createLiveEncounterPolicyState,
  evaluateLiveEncounterReadability,
  scaleLiveEncounterRunMotion,
  selectLiveEncounterCandidates,
} from '../../src/generation/LiveEncounterPolicy';
import { M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS } from '../../src/generation/M5AuthoredPressureEncounterSegments';
import { M5_SEGMENT_MISSILE_BAIT_DODGE } from '../../src/generation/M5AuthoredSingleEncounterSegments';
import {
  M5_LIVE_SINGLE_ENCOUNTER_SEGMENTS,
  PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG,
} from '../../src/generation/M5LiveEncounterCatalog';
import { validatePattern } from '../../src/generation/PatternValidator';

const candidatesAt = (runDistance: number) => {
  const state = createLiveEncounterPolicyState(runDistance, PROTOTYPE_PATTERN_REACHABILITY_CONTEXT);
  const selection = selectLiveEncounterCandidates(
    PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG,
    runDistance,
    state,
  );
  return { selection, state };
};

describe('M5 authored live encounter catalog candidate', () => {
  it('contains exactly six single-decision and five pressure segments with unique identities', () => {
    expect(M5_LIVE_SINGLE_ENCOUNTER_SEGMENTS).toHaveLength(6);
    expect(M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS).toHaveLength(5);
    expect(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG).toHaveLength(11);
    expect(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG).not.toContain(M5_SEGMENT_MISSILE_BAIT_DODGE);
    expect(
      new Set(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG.map((pattern) => pattern.id)).size,
    ).toBe(11);
    expect(
      new Set(
        PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG.map((pattern) => pattern.profile.varietyFamilyId),
      ).size,
    ).toBe(11);
  });

  it.each(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG)(
    '$id passes the existing pattern validator before live wiring',
    (pattern) => {
      expect(validatePattern(pattern)).toEqual({ valid: true, issues: [] });
    },
  );

  it('exposes only opening singles in tier-zero Low and five singles in tier-one Medium', () => {
    const low = candidatesAt(1_700).selection;
    expect(low.pacing.intensity).toBe('low');
    expect([...low.primaryCatalog, ...low.deferredCatalog]).toHaveLength(3);
    expect(
      [...low.primaryCatalog, ...low.deferredCatalog].every(
        (pattern) => pattern.entries.length === 1,
      ),
    ).toBe(true);

    const medium = candidatesAt(4_000).selection;
    expect(medium.pacing.intensity).toBe('medium');
    expect([...medium.primaryCatalog, ...medium.deferredCatalog]).toHaveLength(5);
    expect(
      [...medium.primaryCatalog, ...medium.deferredCatalog].every(
        (pattern) => pattern.entries.length === 1,
      ),
    ).toBe(true);
  });

  it('adds the Laser in tier-one High and the five pressure segments at tier-two High', () => {
    const tierOneHigh = candidatesAt(6_400).selection;
    expect(tierOneHigh.pacing.intensity).toBe('high');
    expect(tierOneHigh.difficulty.tierIndex).toBe(1);
    expect([...tierOneHigh.primaryCatalog, ...tierOneHigh.deferredCatalog]).toHaveLength(6);

    const tierTwoHigh = candidatesAt(7_200).selection;
    expect(tierTwoHigh.pacing.intensity).toBe('high');
    expect(tierTwoHigh.difficulty.tierIndex).toBe(2);
    expect([...tierTwoHigh.primaryCatalog, ...tierTwoHigh.deferredCatalog]).toHaveLength(11);
    for (const pattern of M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS) {
      expect([...tierTwoHigh.primaryCatalog, ...tierTwoHigh.deferredCatalog]).toContain(pattern);
    }
  });

  it('has no candidates in breather and every early tier-two High candidate is readability-reservable', () => {
    const breather = candidatesAt(0).selection;
    expect(breather.pacing.intensity).toBe('breather');
    expect([...breather.primaryCatalog, ...breather.deferredCatalog]).toEqual([]);

    const runDistance = 7_200;
    const { selection, state } = candidatesAt(runDistance);
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

    expect(evaluations).toHaveLength(11);
    for (const evaluation of evaluations) {
      expect(evaluation).toMatchObject({
        intrinsicallyEligible: true,
        decision: { status: 'reserved' },
      });
    }
  });
});
