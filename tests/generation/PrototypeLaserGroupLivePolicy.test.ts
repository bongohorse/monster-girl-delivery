import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  createLiveEncounterPolicyState,
  evaluateLiveEncounterReadability,
  selectLiveEncounterCandidates,
} from '../../src/generation/LiveEncounterPolicy';
import { PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS } from '../../src/generation/PatternValidator';
import { PROTOTYPE_LASER_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { selectPrototypeLaserLaneCatalog } from '../../src/generation/PrototypeLaserLaneCatalog';

const REACHABILITY = Object.freeze({
  flightState: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
  flightTuning: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightTuning,
  playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
});

const evaluateSelectedGroup = (prngState: number) => {
  const catalog = selectPrototypeLaserLaneCatalog(
    Object.freeze([PROTOTYPE_LASER_PATTERN]),
    PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
    prngState,
  );
  const pattern = catalog[0];
  if (!pattern) {
    throw new Error('Expected selected Laser pattern.');
  }

  // 3200 is the beginning of the production medium pacing phase and is already difficulty tier 1,
  // so two-entry Laser groups are eligible without weakening any global policy limits.
  const runDistance = 3_200;
  const state = createLiveEncounterPolicyState(runDistance, REACHABILITY);
  const selection = selectLiveEncounterCandidates([pattern], runDistance, state);
  expect(selection.pacing.intensity).toBe('medium');
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
    throw new Error('Expected live readability evaluation for selected Laser group.');
  }
  return { evaluation, pattern };
};

describe('Prototype Laser groups under the production live policy', () => {
  it('admits the simultaneous center corridor without exceeding hard concurrency', () => {
    const { evaluation, pattern } = evaluateSelectedGroup(25);

    expect(pattern.entries).toHaveLength(2);
    expect(
      pattern.entries.map((entry) =>
        entry.behavior.kind === 'laser' ? entry.behavior.lifecycle.chargeSeconds : null,
      ),
    ).toEqual([0.8, 0.8]);
    expect(evaluation).toMatchObject({
      intrinsicallyEligible: true,
      decision: {
        status: 'reserved',
        usage: {
          concurrentWarnings: { actual: 2 },
          concurrentLethalWindows: { actual: 2 },
        },
      },
    });
  });

  it('admits the alternating pair and observes only one lethal beam at a time', () => {
    const { evaluation, pattern } = evaluateSelectedGroup(30);

    expect(pattern.entries).toHaveLength(2);
    expect(
      pattern.entries.map((entry) =>
        entry.behavior.kind === 'laser' ? entry.behavior.lifecycle.chargeSeconds : null,
      ),
    ).toEqual([0.55, 1.25]);
    expect(evaluation).toMatchObject({
      intrinsicallyEligible: true,
      decision: {
        status: 'reserved',
        usage: {
          concurrentWarnings: { actual: 2 },
          concurrentLethalWindows: { actual: 1 },
        },
      },
    });
  });
});
