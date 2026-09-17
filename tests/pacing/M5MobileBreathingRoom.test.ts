import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  createLiveEncounterPolicyState,
  selectLiveEncounterCandidates,
} from '../../src/generation/LiveEncounterPolicy';
import {
  M5_AUTHORED_MULTI_HAZARD_PATTERNS,
  PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG,
} from '../../src/generation/M5AuthoredMultiHazardPatterns';
import { calculatePacing, PROTOTYPE_PACING_CONFIG } from '../../src/pacing/PacingSystem';

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
    for (const runDistance of [0, 2_600, 5_000, 9_000, 13_900]) {
      expect(calculatePacing(runDistance).intensity).toBe('breather');
      expect(candidatesAt(runDistance)).toEqual([]);
    }
  });

  it('spends more than half of every cycle in deliberate recovery', () => {
    const phases = PROTOTYPE_PACING_CONFIG.phases;
    const total = phases.reduce((sum, phase) => sum + phase.distanceLength, 0);
    const recovery = phases
      .filter((phase) => phase.intensity === 'breather')
      .reduce((sum, phase) => sum + phase.distanceLength, 0);
    expect(recovery / total).toBeGreaterThan(0.5);
    for (const [index, phase] of phases.entries()) {
      if (phase.intensity !== 'breather') {
        expect(phases[(index + 1) % phases.length]?.intensity).toBe('breather');
      }
    }
  });

  it('restricts low and medium normal play to single-hazard encounters', () => {
    const low = candidatesAt(1_700);
    const medium = candidatesAt(4_000);
    expect(calculatePacing(1_700).intensity).toBe('low');
    expect(calculatePacing(4_000).intensity).toBe('medium');
    expect(low.length).toBeGreaterThan(0);
    expect(medium.length).toBeGreaterThan(0);
    expect(low.every((pattern) => pattern.entries.length === 1)).toBe(true);
    expect(medium.every((pattern) => pattern.entries.length === 1)).toBe(true);
    expect(low.some((pattern) => pattern.profile.varietyFamilyId === 'm5-multi-hazard')).toBe(
      false,
    );
    expect(medium.some((pattern) => pattern.profile.varietyFamilyId === 'm5-multi-hazard')).toBe(
      false,
    );
  });

  it('admits authored two-family challenge vocabulary only in high and peak beats', () => {
    const high = candidatesAt(6_400);
    const peak = candidatesAt(11_500);
    expect(calculatePacing(6_400).intensity).toBe('high');
    expect(calculatePacing(11_500).intensity).toBe('peak');
    for (const pattern of M5_AUTHORED_MULTI_HAZARD_PATTERNS) {
      expect(high).toContain(pattern);
      expect(peak).toContain(pattern);
    }
    expect(high.every((pattern) => pattern.entries.length <= 2)).toBe(true);
    expect(peak.every((pattern) => pattern.entries.length <= 2)).toBe(true);
  });
});
