import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  createLiveEncounterPolicyState,
  evaluateLiveEncounterReadability,
  selectLiveEncounterCandidates,
} from '../../src/generation/LiveEncounterPolicy';
import {
  M5_AUTHORED_MULTI_HAZARD_PATTERNS,
  M5_LASER_ZAPPER_PATTERN,
  M5_MISSILE_LASER_PATTERN,
  M5_MISSILE_ZAPPER_PATTERN,
  PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG,
} from '../../src/generation/M5AuthoredMultiHazardPatterns';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import {
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
  validatePattern,
} from '../../src/generation/PatternValidator';
import { PROTOTYPE_M5_HAZARD_PATTERN_FIXTURES } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';

const REACHABILITY = Object.freeze({
  flightState: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
  flightTuning: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightTuning,
  playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
});

const getKinds = (pattern: (typeof M5_AUTHORED_MULTI_HAZARD_PATTERNS)[number]) =>
  pattern.entries.map((entry) => entry.behavior.kind);

const evaluateUnderLivePolicy = (pattern: (typeof M5_AUTHORED_MULTI_HAZARD_PATTERNS)[number]) => {
  // First production high-pressure window: tier 1 and high pacing, so these combinations cannot
  // pollute the opening/low/medium run but are evaluated by the real live policy once eligible.
  const runDistance = 5_200;
  const state = createLiveEncounterPolicyState(runDistance, REACHABILITY);
  const selection = selectLiveEncounterCandidates([pattern], runDistance, state);
  expect(selection.pacing.intensity).toBe('high');
  expect(selection.primaryCatalog).toEqual([pattern]);

  const evaluation = evaluateLiveEncounterReadability(
    selection.primaryCatalog,
    state,
    selection.pacing,
    0,
    runDistance,
    runDistance,
    350,
    REACHABILITY.playerExtents,
  )[0];
  if (!evaluation) {
    throw new Error(`Missing live-policy evaluation for ${pattern.id}.`);
  }
  return evaluation;
};

describe('M5 authored multi-hazard patterns', () => {
  it('adds exactly the three approved two-family combinations to the live M5 catalog', () => {
    expect(M5_AUTHORED_MULTI_HAZARD_PATTERNS).toHaveLength(3);
    expect(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG).toEqual([
      ...PROTOTYPE_M5_HAZARD_PATTERN_FIXTURES,
      ...M5_AUTHORED_MULTI_HAZARD_PATTERNS,
    ]);

    expect(getKinds(M5_MISSILE_ZAPPER_PATTERN)).toEqual(['zapper', 'target-lock-strike']);
    expect(getKinds(M5_MISSILE_LASER_PATTERN)).toEqual(['laser', 'target-lock-strike']);
    expect(getKinds(M5_LASER_ZAPPER_PATTERN)).toEqual(['laser', 'zapper']);
  });

  it.each(M5_AUTHORED_MULTI_HAZARD_PATTERNS)(
    '$id passes the existing geometry/reachability validator without exceptions',
    (pattern) => {
      expect(validatePattern(pattern)).toEqual({ valid: true, issues: [] });
      expect(pattern.profile).toMatchObject({
        difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: null },
        pacingIntensities: ['high', 'peak'],
        varietyFamilyId: 'm5-multi-hazard',
      });
      expect(pattern.entries).toHaveLength(2);
    },
  );

  it.each(M5_AUTHORED_MULTI_HAZARD_PATTERNS)(
    '$id is admitted through the real high-pressure live readability policy',
    (pattern) => {
      const evaluation = evaluateUnderLivePolicy(pattern);
      expect(evaluation).toMatchObject({
        intrinsicallyEligible: true,
        decision: { status: 'reserved' },
      });
    },
  );

  it.each(M5_AUTHORED_MULTI_HAZARD_PATTERNS)(
    '$id schedules deterministically through the existing pattern scheduler',
    (pattern) => {
      const schedule = () =>
        scheduleNextPattern({
          catalog: [pattern],
          constraints: PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
          patternStartDistance: 7_000,
          reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
          state: createRunGenerationState('m5-authored-combo'),
        });

      const first = schedule();
      const second = schedule();
      expect(first).toEqual(second);
      expect(first.status).toBe('accepted');
      if (first.status !== 'accepted') {
        throw new Error(`Expected ${pattern.id} to schedule.`);
      }
      expect(first.patternId).toBe(pattern.id);
      expect(first.spawns).toHaveLength(2);
    },
  );
});
