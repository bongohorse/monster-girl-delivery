import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  M5_AUTHORED_MULTI_HAZARD_PATTERNS,
  PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG,
} from '../../src/generation/M5AuthoredMultiHazardPatterns';
import {
  createLiveEncounterPolicyState,
  selectLiveEncounterCandidates,
} from '../../src/generation/LiveEncounterPolicy';
import {
  createPacingPatternRequest,
  evaluatePatternPacingEligibility,
} from '../../src/pacing/PacingPatternSelection';
import { calculatePacing } from '../../src/pacing/PacingSystem';

const REACHABILITY = Object.freeze({
  flightState: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
  flightTuning: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightTuning,
  playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
});

const candidatesAt = (runDistance: number) => {
  const state = createLiveEncounterPolicyState(runDistance, REACHABILITY);
  const selection = selectLiveEncounterCandidates(
    PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG,
    runDistance,
    state,
  );
  return [...selection.primaryCatalog, ...selection.deferredCatalog];
};

describe('M5 mobile breathing-room pacing', () => {
  it('keeps explicit breather windows free from schedulable hazard content', () => {
    for (const runDistance of [0, 2_300, 4_100, 6_000, 7_900, 10_200, 12_000]) {
      expect(calculatePacing(runDistance).intensity).toBe('breather');
      expect(candidatesAt(runDistance)).toEqual([]);
    }
  });

  it('restricts low and medium normal play to single-hazard encounters', () => {
    const low = candidatesAt(9_300);
    const medium = candidatesAt(11_100);

    expect(calculatePacing(9_300).intensity).toBe('low');
    expect(calculatePacing(11_100).intensity).toBe('medium');
    expect(low.length).toBeGreaterThan(0);
    expect(medium.length).toBeGreaterThan(0);
    expect(low.every((pattern) => pattern.entries.length === 1)).toBe(true);
    expect(medium.every((pattern) => pattern.entries.length === 1)).toBe(true);
    expect(low.some((pattern) => pattern.profile.varietyFamilyId === 'm5-multi-hazard')).toBe(false);
    expect(medium.some((pattern) => pattern.profile.varietyFamilyId === 'm5-multi-hazard')).toBe(false);
  });

  it('admits authored two-family challenges only in short high/peak windows', () => {
    const highDistance = 12_900;
    const peakDistance = 14_900;
    const high = candidatesAt(highDistance);
    const peak = candidatesAt(peakDistance);

    expect(calculatePacing(highDistance).intensity).toBe('high');
    expect(calculatePacing(peakDistance).intensity).toBe('peak');
    for (const pattern of M5_AUTHORED_MULTI_HAZARD_PATTERNS) {
      expect(high).toContain(pattern);
      expect(peak).toContain(pattern);
    }
    expect(high.every((pattern) => pattern.entries.length <= 2)).toBe(true);
    expect(peak.every((pattern) => pattern.entries.length <= 2)).toBe(true);
  });

  it('cannot fit two full challenge combos into one high or peak pressure window', () => {
    for (const phaseStart of [5_000, 7_000]) {
      const openingRequest = createPacingPatternRequest(calculatePacing(phaseStart));
      for (const pattern of M5_AUTHORED_MULTI_HAZARD_PATTERNS) {
        expect(evaluatePatternPacingEligibility(pattern, openingRequest).eligible).toBe(true);

        const nextStart = phaseStart + pattern.runLength;
        const followUp = evaluatePatternPacingEligibility(
          pattern,
          createPacingPatternRequest(calculatePacing(nextStart)),
        );
        expect(followUp).toMatchObject({
          eligible: false,
          reasons: expect.arrayContaining(['pacing-window-limit']),
        });
      }
    }
  });
});
