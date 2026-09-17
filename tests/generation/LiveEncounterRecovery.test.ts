import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT as REACHABILITY } from '../../src/generation/FlightReachability';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  type GeneratedHazardStreamContext,
} from '../../src/generation/GeneratedHazardStream';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import {
  type LiveEncounterPolicyConfig,
  PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
} from '../../src/generation/LiveEncounterPolicy';
import {
  PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN,
  PROTOTYPE_TIMED_PULSE_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

const MOTION = { baseScrollSpeed: 350 };
const POLICY: LiveEncounterPolicyConfig = {
  ...PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
  difficulty: {
    tiers: [
      {
        id: 'test',
        startDistance: 0,
        scrollSpeedMultiplier: 1,
        minimumReactionTimeSeconds: 2,
        minimumReactionSpacing: 96,
        minimumVerticalCorridor: 96,
        maximumPatternEntries: 6,
        maximumHazardsPer1000Distance: 10,
      },
    ],
  },
  pacing: {
    phases: [
      {
        intensity: 'low',
        distanceLength: 100_000,
        maximumPatternEntries: 6,
        maximumHazardsPer1000Distance: 10,
      },
      {
        intensity: 'breather',
        distanceLength: 1_000,
        maximumPatternEntries: 1,
        maximumHazardsPer1000Distance: 1,
      },
    ],
  },
};
const LOW_EXIT = createHazardPattern({
  id: 'forced-low-exit',
  runLength: 300,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'upper-wall',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 300, top: 48, bottom: 240 },
    },
  ],
});
const HIGH_ENTRY = createHazardPattern({
  id: 'forced-high-entry',
  runLength: 300,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'lower-wall',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 300, top: 150, bottom: 342 },
    },
  ],
});
const contextFor = (
  catalog: GeneratedHazardStreamContext['catalog'],
): GeneratedHazardStreamContext => ({ catalog, policy: POLICY, reachability: REACHABILITY });

describe('live stream recovery regressions', () => {
  it('keeps the entire default second breather free of next-phase warning and pressure', () => {
    const context = {
      catalog: [PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN],
      policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
      reachability: REACHABILITY,
    };
    let state = createGeneratedHazardStream('breather-lead-in', context, MOTION);
    let breatherFrames = 0;
    let sawExactBoundary = false;
    while (state.runDistance < 4_800) {
      const speed = state.schedulingWindow.scrollSpeed;
      const boundary =
        state.runDistance < 2_500 ? 2_500 : state.runDistance < 3_900 ? 3_900 : 4_800;
      const distance = Math.min(state.runDistance + speed * 0.05, boundary);
      state = advanceGeneratedHazardStream(
        state,
        distance,
        context,
        MOTION,
        (distance - state.runDistance) / speed,
      );
      if (distance >= 2_500 && distance < 3_900) {
        breatherFrames += 1;
        expect(state.policy?.pacing.intensity).toBe('breather');
        expect(state.policy?.readability.reservations).toEqual([]);
      }
      if (distance === 3_900) {
        sawExactBoundary = true;
        expect(state.policy?.pacing.intensity).toBe('medium');
      }
    }
    expect(breatherFrames).toBeGreaterThan(50);
    expect(sawExactBoundary).toBe(true);
    expect(state.policy?.pacing.intensity).toBe('breather');
  });

  it('resumes after readability expiry with a fresh minimum reaction horizon', () => {
    const pulse = createHazardPattern({
      ...PROTOTYPE_TIMED_PULSE_PATTERN,
      profile: {
        ...PROTOTYPE_TIMED_PULSE_PATTERN.profile,
        difficultyTierRange: { minimumTierIndex: 0, maximumTierIndex: null },
      },
    });
    const context = contextFor([pulse]);
    let state = createGeneratedHazardStream('readability-recovery', context, MOTION);
    expect(state.scheduledPatternCount).toBe(1);
    let blocked = false;
    let resumed = false;
    for (let frame = 0; frame < 240; frame += 1) {
      const previous = state;
      state = advanceGeneratedHazardStream(
        state,
        state.runDistance + 350 / 60,
        context,
        MOTION,
        1 / 60,
      );
      if (state.scheduledPatternCount === 1 && state.runDistance > 620) blocked = true;
      if (state.scheduledPatternCount > previous.scheduledPatternCount) {
        resumed = true;
        for (const spawn of state.spawns.filter((spawn) => !previous.spawns.includes(spawn))) {
          expect(spawn.approachTiming.meetsMinimumReactionTime).toBe(true);
          expect(spawn.approachTiming.timeToImpactSeconds).toBeGreaterThanOrEqual(2);
        }
      }
    }
    expect(blocked).toBe(true);
    expect(resumed).toBe(true);
    expect(state.status).toBe('active');
  });

  it('conditions accepted exits on geometry and recovers from an incompatible next entry', () => {
    const run = () => {
      const initial = createGeneratedHazardStream(
        'transition-recovery',
        contextFor([LOW_EXIT]),
        MOTION,
      );
      expect(initial.scheduledPatternCount).toBe(1);
      expect(initial.policy?.exitEnvelope.states.every((state) => state.positionY >= 264)).toBe(
        true,
      );
      const nextContext = contextFor([HIGH_ENTRY]);
      const rejected = advanceGeneratedHazardStream(initial, 300, nextContext, MOTION, 300 / 350);
      expect(rejected.scheduledPatternCount).toBe(1);
      expect(rejected.generationState).not.toEqual(initial.generationState);
      expect(rejected.status).toBe('active');
      expect(rejected.nextPatternStartDistance).toBeGreaterThan(initial.nextPatternStartDistance);
      let recovered = rejected;
      for (let frame = 0; frame < 180; frame += 1) {
        recovered = advanceGeneratedHazardStream(
          recovered,
          recovered.runDistance + 350 / 60,
          nextContext,
          MOTION,
          1 / 60,
        );
      }
      expect(recovered.scheduledPatternCount).toBeGreaterThan(1);
      expect(recovered.spawns.some((spawn) => spawn.patternId === HIGH_ENTRY.id)).toBe(true);
      return recovered;
    };
    expect(run()).toEqual(run());
  });

  it.each([175, 500])(
    'drains pending content before applying speed %s and flight tuning',
    (requestedSpeed) => {
      const context = contextFor([LOW_EXIT]);
      const initial = createGeneratedHazardStream('parameter-recovery', context, MOTION);
      const requestedTuning = { ...PROTOTYPE_FLIGHT_TUNING_DEFAULTS, gravity: 1200 };
      const changedContext = {
        ...context,
        reachability: { ...REACHABILITY, flightTuning: requestedTuning },
      };
      const requestedMotion = { baseScrollSpeed: requestedSpeed };
      let state = advanceGeneratedHazardStream(initial, 0, changedContext, requestedMotion);
      expect(state.schedulingWindow.scrollSpeed).toBe(350);
      expect(state.policy?.flightTuning).toEqual(PROTOTYPE_FLIGHT_TUNING_DEFAULTS);
      expect(state.policy?.exitEnvelope).toEqual(initial.policy?.exitEnvelope);
      expect(state.policy?.readability).toEqual(initial.policy?.readability);
      for (let frame = 0; frame < 240 && state.schedulingWindow.scrollSpeed === 350; frame += 1) {
        state = advanceGeneratedHazardStream(
          state,
          state.runDistance + 350 / 60,
          changedContext,
          requestedMotion,
          1 / 60,
        );
        if (state.schedulingWindow.scrollSpeed === 350) expect(state.scheduledPatternCount).toBe(1);
      }
      expect(state.schedulingWindow.scrollSpeed).toBe(requestedSpeed);
      expect(state.policy?.flightTuning).toEqual(requestedTuning);
      expect(state.runDistance).toBeGreaterThanOrEqual(
        initial.policy?.exitEnvelope.runDistance ?? 0,
      );
      expect(state.spawns.every((spawn) => spawn.approachTiming.meetsMinimumReactionTime)).toBe(
        true,
      );
    },
  );
});
