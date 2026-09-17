import { describe, expect, it } from 'vitest';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import { createEncounterExitStateEnvelope } from '../../src/generation/EncounterTransitionValidator';
import { createEncounterVarietyHistoryState } from '../../src/generation/EncounterVarietyPolicy';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
} from '../../src/generation/GeneratedHazardStream';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import {
  constrainLiveEncounterPolicy,
  createLiveEncounterPolicyState,
  createLiveEncounterTransitionContext,
  evaluateLiveEncounterReadability,
  type LiveEncounterPolicyState,
  PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
  selectLiveEncounterCandidates,
} from '../../src/generation/LiveEncounterPolicy';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import {
  PROTOTYPE_LINE_PATTERN,
  PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
  PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN,
  PROTOTYPE_TIMED_PULSE_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import { calculatePacing } from '../../src/pacing/PacingSystem';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

const REACHABILITY = Object.freeze({
  flightState: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
  flightTuning: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightTuning,
  playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
});

const POLICY_CONTEXT = Object.freeze({
  catalog: PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
  policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
  reachability: REACHABILITY,
});

describe('retained encounter history on resize', () => {
  it('constrains correlated samples without resampling or changing other policy state', () => {
    const original = Object.freeze({
      ...createLiveEncounterPolicyState(0, REACHABILITY),
      exitEnvelope: createEncounterExitStateEnvelope({
        runDistance: 1_000,
        states: [
          { positionY: -100, velocityY: -100 },
          { positionY: -100, velocityY: 100 },
          { positionY: 400, velocityY: 100 },
          { positionY: 400, velocityY: -100 },
          { positionY: 200, velocityY: -50 },
          { positionY: 200, velocityY: 50 },
        ],
      }),
    });
    const snapshot = JSON.stringify(original);
    const result = constrainLiveEncounterPolicy(original, { ceilingY: 72, floorY: 318 });

    expect(result).toEqual({
      ...original,
      exitEnvelope: {
        runDistance: 1_000,
        states: [
          { positionY: 72, velocityY: 0 },
          { positionY: 72, velocityY: 100 },
          { positionY: 318, velocityY: 0 },
          { positionY: 318, velocityY: -100 },
          { positionY: 200, velocityY: -50 },
          { positionY: 200, velocityY: 50 },
        ],
      },
    });
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.exitEnvelope)).toBe(true);
    expect(Object.isFrozen(result.exitEnvelope.states)).toBe(true);
    expect(result.exitEnvelope.states.every(Object.isFrozen)).toBe(true);
    expect(constrainLiveEncounterPolicy(result, { ceilingY: 72, floorY: 318 })).toBe(result);
    expect(constrainLiveEncounterPolicy(result, { ceilingY: -258, floorY: 500 })).toBe(result);
  });
});

const createVarietyPattern = (id: string, varietyFamilyId: string) =>
  createHazardPattern({
    id,
    runLength: 600,
    profile: {
      ...TEST_ENCOUNTER_PROFILE,
      varietyFamilyId,
    },
    entries: [
      {
        id: `${id}-entry`,
        type: 'placeholder-barrier',
        hitbox: { left: 200, right: 248, top: 160, bottom: 208 },
      },
    ],
  });

const HIGH_ENTRY_PATTERN = createHazardPattern({
  id: 'live-policy-high-entry',
  runLength: 300,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'lower-wall',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 180, bottom: 342 },
    },
  ],
});

const progressPolicyStream = (seed: string) => {
  const initial = createGeneratedHazardStream(seed, POLICY_CONTEXT, PROTOTYPE_RUN_MOTION_DEFAULTS);
  const lowPhase = advanceGeneratedHazardStream(
    initial,
    1_800,
    POLICY_CONTEXT,
    PROTOTYPE_RUN_MOTION_DEFAULTS,
    5,
  );

  return advanceGeneratedHazardStream(
    lowPhase,
    4_200,
    POLICY_CONTEXT,
    PROTOTYPE_RUN_MOTION_DEFAULTS,
    5,
  );
};

describe('live encounter policy integration', () => {
  it('allows an exact reservation handoff but rejects pressure extending into a breather', () => {
    const config = {
      ...PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
      pacing: {
        phases: [
          {
            intensity: 'low' as const,
            distanceLength: 1000,
            maximumPatternEntries: 3,
            maximumHazardsPer1000Distance: 5,
          },
          {
            intensity: 'breather' as const,
            distanceLength: 1000,
            maximumPatternEntries: 1,
            maximumHazardsPer1000Distance: 1,
          },
        ],
      },
    };
    const evaluateAt = (distance: number) =>
      evaluateLiveEncounterReadability(
        [PROTOTYPE_TIMED_PULSE_PATTERN],
        createLiveEncounterPolicyState(distance, REACHABILITY, config),
        calculatePacing(800, config.pacing),
        0,
        800,
        distance,
        100,
        REACHABILITY.playerExtents,
        config,
      )[0];
    expect(evaluateAt(725)?.decision.status).toBe('reserved');
    expect(evaluateAt(725.01)).toMatchObject({
      intrinsicallyEligible: true,
      decision: { status: 'deferred' },
    });
  });

  it('holds higher next-phase telegraph pressure to the lower phase occupied by its lead-in', () => {
    const config = {
      ...PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
      pacing: {
        phases: [
          {
            intensity: 'low' as const,
            distanceLength: 1000,
            maximumPatternEntries: 3,
            maximumHazardsPer1000Distance: 5,
          },
          {
            intensity: 'high' as const,
            distanceLength: 2000,
            maximumPatternEntries: 3,
            maximumHazardsPer1000Distance: 5,
          },
          {
            intensity: 'breather' as const,
            distanceLength: 1000,
            maximumPatternEntries: 1,
            maximumHazardsPer1000Distance: 1,
          },
        ],
      },
    };
    const pulse = createHazardPattern({
      ...PROTOTYPE_TIMED_PULSE_PATTERN,
      profile: { ...PROTOTYPE_TIMED_PULSE_PATTERN.profile, pressureCost: 3 },
    });
    const evaluateAt = (distance: number) =>
      evaluateLiveEncounterReadability(
        [pulse],
        createLiveEncounterPolicyState(distance, REACHABILITY, config),
        calculatePacing(1100, config.pacing),
        0,
        1100,
        distance,
        100,
        REACHABILITY.playerExtents,
        config,
      )[0];
    expect(evaluateAt(900)).toMatchObject({
      intrinsicallyEligible: true,
      decision: { status: 'deferred' },
    });
    expect(evaluateAt(1000)?.decision.status).toBe('reserved');
  });

  it('changes authored encounter eligibility at the exact difficulty tier boundary', () => {
    const config = {
      ...PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
      pacing: {
        phases: [
          {
            intensity: 'low' as const,
            distanceLength: 3_000,
            maximumPatternEntries: 3,
            maximumHazardsPer1000Distance: 5,
          },
          {
            intensity: 'breather' as const,
            distanceLength: 1_000,
            maximumPatternEntries: 1,
            maximumHazardsPer1000Distance: 1,
          },
        ],
      },
    };
    const state = createLiveEncounterPolicyState(2_499, REACHABILITY, config);
    const beforeBoundary = selectLiveEncounterCandidates(
      [PROTOTYPE_OFFSET_PAIR_PATTERN],
      2_499,
      state,
      config,
    );
    const atBoundary = selectLiveEncounterCandidates(
      [PROTOTYPE_OFFSET_PAIR_PATTERN],
      2_500,
      state,
      config,
    );

    expect(beforeBoundary).toMatchObject({
      difficulty: { tierIndex: 0 },
      pacing: { intensity: 'low' },
      primaryCatalog: [],
    });
    expect(beforeBoundary.constraints.minimumReactionSpacing).toBe(96);
    expect(atBoundary).toMatchObject({
      difficulty: { tierIndex: 1 },
      pacing: { intensity: 'low' },
      primaryCatalog: [PROTOTYPE_OFFSET_PAIR_PATTERN],
    });
    expect(atBoundary.constraints.minimumReactionSpacing).toBe(88);
  });

  it('keeps capped difficulty compatible with a deterministic zero-pressure breather', () => {
    const state = createLiveEncounterPolicyState(14_200, REACHABILITY);
    const first = selectLiveEncounterCandidates(
      PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
      14_200,
      state,
    );
    const replay = selectLiveEncounterCandidates(
      PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
      14_200,
      state,
    );
    const highPressure = selectLiveEncounterCandidates([PROTOTYPE_LINE_PATTERN], 20_200, state);

    expect(first).toEqual(replay);
    expect(first).toMatchObject({
      difficulty: { capped: true, tierIndex: 3 },
      pacing: { intensity: 'breather' },
      primaryCatalog: [],
      deferredCatalog: [],
      nextPolicyBoundaryDistance: 15_400,
    });
    expect(highPressure).toMatchObject({
      difficulty: { capped: true, tierIndex: 3 },
      pacing: { intensity: 'high' },
      primaryCatalog: [PROTOTYPE_LINE_PATTERN],
    });
  });

  it('replays the complete seeded policy stream including bounded recent-family history', () => {
    const first = progressPolicyStream('live-policy-replay');
    const replay = progressPolicyStream('live-policy-replay');

    expect(replay).toEqual(first);
    expect(first.policy).not.toBeNull();
    expect(first.policy?.variety.recentFamilyIds.length).toBeGreaterThan(0);
    expect(first.policy?.variety.recentFamilyIds.length).toBeLessThanOrEqual(
      PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG.variety.recentFamilyWindowSize,
    );
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it('lets recent-family variety prefer a fresh family while retaining deterministic small-catalog fallback', () => {
    const recent = createVarietyPattern('recent-family-pattern', 'family-a');
    const fresh = createVarietyPattern('fresh-family-pattern', 'family-b');
    const baseState = createLiveEncounterPolicyState(3_900, REACHABILITY);
    const state: Readonly<LiveEncounterPolicyState> = Object.freeze({
      ...baseState,
      variety: createEncounterVarietyHistoryState(['family-a']),
    });
    const varied = selectLiveEncounterCandidates([recent, fresh], 3_900, state);
    const fallback = selectLiveEncounterCandidates([recent], 3_900, state);

    expect(varied.primaryCatalog).toEqual([fresh]);
    expect(varied.deferredCatalog).toEqual([recent]);
    expect(fallback.primaryCatalog).toEqual([recent]);
    expect(fallback.deferredCatalog).toEqual([]);
  });

  it('defers overlapping readable candidates without making an individually safe candidate ineligible', () => {
    const state = createLiveEncounterPolicyState(3_900, REACHABILITY);
    const pacing = calculatePacing(3_900);
    const first = evaluateLiveEncounterReadability(
      [PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN],
      state,
      pacing,
      0,
      3_900,
      3_900,
      350,
      REACHABILITY.playerExtents,
    )[0];

    expect(first).toBeDefined();
    if (!first) {
      throw new Error('Expected the target-lock candidate to receive a readability decision.');
    }
    expect(first).toMatchObject({ intrinsicallyEligible: true, decision: { status: 'reserved' } });

    const occupiedState: Readonly<LiveEncounterPolicyState> = Object.freeze({
      ...state,
      readability: first.decision.state,
    });
    const overlapping = evaluateLiveEncounterReadability(
      [PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN],
      occupiedState,
      pacing,
      1,
      3_900,
      3_900,
      350,
      REACHABILITY.playerExtents,
    )[0];

    expect(overlapping).toBeDefined();
    expect(overlapping).toMatchObject({
      intrinsicallyEligible: true,
      decision: { status: 'deferred' },
    });
    expect(overlapping?.decision.issues.map((issue) => issue.code)).toEqual([
      'active-pressure-budget-exceeded',
      'active-readability-budget-exceeded',
      'warning-concurrency-exceeded',
      'lethal-concurrency-exceeded',
    ]);
  });

  it('keeps transition-fairness rejection deterministic after policy eligibility filtering', () => {
    const baseState = createLiveEncounterPolicyState(3_900, REACHABILITY);
    const state: Readonly<LiveEncounterPolicyState> = Object.freeze({
      ...baseState,
      exitEnvelope: createEncounterExitStateEnvelope({
        runDistance: 3_900,
        states: [{ positionY: 300, velocityY: 650 }],
      }),
    });
    const selection = selectLiveEncounterCandidates([HIGH_ENTRY_PATTERN], 3_900, state);
    const request = {
      catalog: selection.primaryCatalog,
      constraints: selection.constraints,
      patternStartDistance: 3_900,
      reachability: {
        ...REACHABILITY,
        availableReactionTimeSeconds: selection.difficulty.minimumReactionTimeSeconds,
      },
      state: createRunGenerationState('live-policy-transition'),
      transition: createLiveEncounterTransitionContext(state, REACHABILITY, 350),
    };
    const first = scheduleNextPattern(request);
    const replay = scheduleNextPattern(request);

    expect(replay).toEqual(first);
    expect(first.status).toBe('exhausted');
    expect(first.rejections.length).toBeGreaterThan(0);
    expect(first.rejections.every((rejection) => rejection.reason === 'transition')).toBe(true);
    expect(
      first.rejections.every(
        (rejection) =>
          rejection.transitionValidation?.failureReason ===
          'next-entry-unreachable-from-exit-envelope',
      ),
    ).toBe(true);
  });

  it('does not advance policy, readability, history, or generation on zero simulation delta', () => {
    const initial = createGeneratedHazardStream(
      'live-policy-zero-delta',
      POLICY_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const paused = advanceGeneratedHazardStream(
      initial,
      0,
      POLICY_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
      0,
    );

    expect(paused).toBe(initial);
    expect(paused.policy).toBe(initial.policy);
    expect(paused.generationState).toBe(initial.generationState);
  });

  it('keeps the full policy stream independent of physical viewport dimensions', () => {
    const evaluateForViewport = (_width: number, _height: number) =>
      progressPolicyStream('live-policy-viewport-independent');
    const narrow = evaluateForViewport(640, 360);
    const wide = evaluateForViewport(2_560, 1_080);

    expect(wide).toEqual(narrow);
    expect(JSON.stringify(narrow)).not.toMatch(/viewport|screen|phaser/i);
  });
});
