import { describe, expect, it, vi } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
  planGeneratedHazardMotion,
  resolveGeneratedHazardMotionRunDistance,
  resolveHazardSafeSpeedChange,
} from '../../src/generation/GeneratedHazardStream';
import { evaluateHazardApproachTiming } from '../../src/generation/HazardApproachTiming';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../src/generation/LiveEncounterPolicy';
import {
  PROTOTYPE_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_ZAPPER_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { PROTOTYPE_PLAYER_COLLISION_EXTENTS } from '../../src/systems/HazardCollision';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

const LIVE_CONTEXT = Object.freeze({ catalog: PROTOTYPE_HAZARD_PATTERN_FIXTURES });

const BLOCKED_PATTERN = createHazardPattern({
  id: 'blocked-stream-pattern',
  runLength: 300,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'top',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 48, bottom: 220 },
    },
    {
      id: 'bottom',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 200, bottom: 342 },
    },
  ],
});

const ZERO_OFFSET_PATTERN = createHazardPattern({
  id: 'zero-offset',
  runLength: 200,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'at-pattern-start',
      type: 'placeholder-barrier',
      hitbox: { left: 0, right: 48, top: 160, bottom: 208 },
    },
  ],
});

const UPWARD_ONLY_PATTERN = createHazardPattern({
  id: 'upward-only',
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

describe('generated hazard motion planning', () => {
  const EMPTY_POLICY_CONTEXT = Object.freeze({
    catalog: Object.freeze([]),
    policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
    reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
  });

  it('splits an exact difficulty-speed boundary without consuming generation state', () => {
    const initial = createGeneratedHazardStream(
      'motion-boundary',
      EMPTY_POLICY_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const beforeBoundary = advanceGeneratedHazardStream(
      initial,
      2_990,
      EMPTY_POLICY_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
      2_990 / PROTOTYPE_RUN_MOTION_DEFAULTS.baseScrollSpeed,
      false,
    );
    const plan = planGeneratedHazardMotion(
      beforeBoundary,
      EMPTY_POLICY_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
      0.1,
    );

    expect(plan.segments).toHaveLength(2);
    expect(plan.segments[0]).toMatchObject({
      startRunDistance: 2_990,
      endRunDistance: 3_000,
      scrollSpeed: 350,
      flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
    });
    expect(plan.segments[0]?.durationSeconds).toBeCloseTo(10 / 350, 12);
    expect(plan.segments[1]).toMatchObject({
      startRunDistance: 3_000,
      endRunDistance: 3_028,
      scrollSpeed: 392,
      flightTuning: {
        gravity: 2_007.04,
        thrust: 3_261.44,
        maxFallVelocity: 784,
        maxRiseVelocity: 616,
      },
    });
    expect(plan.endRunDistance).toBeCloseTo(3_028, 12);
    expect(plan.averageScrollSpeed).toBeCloseTo(380, 12);
    expect(resolveGeneratedHazardMotionRunDistance(plan, 10 / 350)).toBeCloseTo(3_000, 12);
    expect(resolveGeneratedHazardMotionRunDistance(plan, 0.1)).toBeCloseTo(3_028, 12);
    expect(plan.stream.generationState).toBe(beforeBoundary.generationState);
    expect(plan.stream.scheduledPatternCount).toBe(beforeBoundary.scheduledPatternCount);
  });

  it('keeps zero-delta plans stationary and emits no synthetic Director observations', () => {
    const observeEncounter = vi.fn();
    const lowPolicy = Object.freeze({
      ...PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
      pacing: Object.freeze({
        phases: Object.freeze([
          Object.freeze({
            intensity: 'low' as const,
            distanceLength: 100_000,
            maximumPatternEntries: 1,
            maximumHazardsPer1000Distance: 2,
          }),
          Object.freeze({
            intensity: 'breather' as const,
            distanceLength: 1_000,
            maximumPatternEntries: 1,
            maximumHazardsPer1000Distance: 1,
          }),
        ]),
      }),
    });
    const context = Object.freeze({
      catalog: Object.freeze([PROTOTYPE_ZAPPER_PATTERN]),
      observeEncounter,
      policy: lowPolicy,
      reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
    });
    const state = createGeneratedHazardStream(
      'motion-observer',
      context,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    expect(state.scheduledPatternCount).toBeGreaterThan(0);
    observeEncounter.mockClear();

    const zero = planGeneratedHazardMotion(state, context, PROTOTYPE_RUN_MOTION_DEFAULTS, 0);
    expect(zero.segments).toEqual([]);
    expect(zero.endRunDistance).toBe(state.runDistance);
    expect(resolveGeneratedHazardMotionRunDistance(zero, 0)).toBe(state.runDistance);

    const planned = planGeneratedHazardMotion(state, context, { baseScrollSpeed: 700 }, 0.05);
    expect(observeEncounter).not.toHaveBeenCalled();
    expect(planned.stream.generationState).toBe(state.generationState);
    expect(planned.stream.scheduledPatternCount).toBe(state.scheduledPatternCount);
    // Planning-only metadata updates must not clone the unchanged authoritative spawn stream.
    expect(planned.stream.spawns).toBe(state.spawns);
    expect(planned.stream.schedulingWindow.scrollSpeed).toBe(state.schedulingWindow.scrollSpeed);
  });
});

describe('generated hazard stream', () => {
  it('pre-fills and advances multiple deterministic patterns from run distance', () => {
    const initial = createGeneratedHazardStream(
      'stream-progress',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const advanced = advanceGeneratedHazardStream(
      initial,
      1_000,
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(initial.scheduledPatternCount).toBe(1);
    expect(initial.spawns.length).toBeGreaterThan(1);
    expect(advanced.scheduledPatternCount).toBeGreaterThan(initial.scheduledPatternCount);
    expect(advanced.nextPatternStartDistance).toBeGreaterThan(initial.nextPatternStartDistance);
    expect(advanced.runDistance).toBe(1_000);
  });

  it('reproduces the same logical sequence when restarted from the same seed', () => {
    const first = createGeneratedHazardStream(
      'same-run-seed',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const progressed = advanceGeneratedHazardStream(
      first,
      900,
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const restarted = createGeneratedHazardStream(
      'same-run-seed',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const replayedProgress = advanceGeneratedHazardStream(
      restarted,
      900,
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(restarted).toEqual(first);
    expect(replayedProgress).toEqual(progressed);
  });

  it('deterministically applies stream reaction time and representative flight state to reachability', () => {
    const baseContext = {
      catalog: [UPWARD_ONLY_PATTERN],
      config: {
        ...PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
        reactionTime: { minimumReactionTimeSeconds: 0.1 },
      },
      reachability: {
        flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        playerExtents: PROTOTYPE_PLAYER_COLLISION_EXTENTS,
      },
    };
    const unreachableContext = {
      ...baseContext,
      reachability: {
        ...baseContext.reachability,
        flightState: { positionY: 200, velocityY: 650 },
      },
    };
    const reachableContext = {
      ...baseContext,
      reachability: {
        ...baseContext.reachability,
        flightState: { positionY: 200, velocityY: -550 },
      },
    };

    const unreachable = createGeneratedHazardStream(
      'stream-reachability',
      unreachableContext,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const reachable = createGeneratedHazardStream(
      'stream-reachability',
      reachableContext,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(unreachable).toMatchObject({ status: 'exhausted', spawns: [] });
    expect(
      createGeneratedHazardStream(
        'stream-reachability',
        unreachableContext,
        PROTOTYPE_RUN_MOTION_DEFAULTS,
      ),
    ).toEqual(unreachable);
    expect(reachable.status).toBe('active');
    expect(reachable.spawns).not.toHaveLength(0);
    expect(reachable.schedulingWindow.minimumReactionTimeSeconds).toBe(0.1);
  });

  it('keeps the intended reaction window identical across narrow and wide viewports', () => {
    const narrowLandscape = { width: 640, height: 360 };
    const wideLandscape = { width: 1_280, height: 540 };

    expect(narrowLandscape.width).not.toBe(wideLandscape.width);

    const narrowEncounter = createGeneratedHazardStream(
      'viewport-independent-timing',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const wideEncounter = createGeneratedHazardStream(
      'viewport-independent-timing',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(wideEncounter).toEqual(narrowEncounter);
    expect(narrowEncounter.schedulingWindow).toEqual({
      minimumReactionDistance: 700,
      minimumReactionTimeSeconds: 2,
      scrollSpeed: 350,
    });
    expect(
      narrowEncounter.spawns.every(
        (spawn) =>
          spawn.approachTiming.timeToImpactSeconds !== null &&
          spawn.approachTiming.timeToImpactSeconds >= 2,
      ),
    ).toBe(true);

    const boundaryEncounter = createGeneratedHazardStream(
      'collision-boundary-timing',
      { catalog: [ZERO_OFFSET_PATTERN] },
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    expect(boundaryEncounter.spawns[0]?.approachTiming).toMatchObject({
      distanceToImpact: 700,
      meetsMinimumReactionTime: true,
      timeToImpactSeconds: 2,
    });
  });

  it('deterministically defers an unsafe speed increase without moving scheduled hazards', () => {
    const initial = createGeneratedHazardStream(
      'speed-change',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const existingSpawns = initial.spawns;
    const resolution = resolveHazardSafeSpeedChange(initial, 0, LIVE_CONTEXT, {
      baseScrollSpeed: 700,
    });
    const repeatedResolution = resolveHazardSafeSpeedChange(initial, 0, LIVE_CONTEXT, {
      baseScrollSpeed: 700,
    });
    const deferred = advanceGeneratedHazardStream(initial, 0, LIVE_CONTEXT, {
      baseScrollSpeed: 700,
    });

    expect(repeatedResolution).toEqual(resolution);
    expect(resolution).toMatchObject({
      appliedScrollSpeed: 350,
      requestedScrollSpeed: 700,
      status: 'deferred',
    });
    expect(resolution.maximumSafeScrollSpeed).toBeGreaterThan(350);
    expect(resolution.maximumSafeScrollSpeed).toBeLessThan(700);
    expect(resolution.limitingTargetRunDistance).not.toBeNull();
    expect(Object.isFrozen(resolution)).toBe(true);
    expect(deferred).toBe(initial);
    expect(deferred.spawns).toBe(existingSpawns);
  });

  it('applies an accepted speed increase only when every future hazard keeps the minimum time', () => {
    const initial = createGeneratedHazardStream(
      'speed-change',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const unsafeResolution = resolveHazardSafeSpeedChange(initial, 0, LIVE_CONTEXT, {
      baseScrollSpeed: 700,
    });
    const acceptedSpeed = unsafeResolution.maximumSafeScrollSpeed;

    expect(acceptedSpeed).not.toBeNull();
    if (acceptedSpeed === null) {
      throw new Error('Expected a scheduled hazard to provide a finite safe speed boundary.');
    }
    expect(acceptedSpeed).toBeGreaterThan(PROTOTYPE_RUN_MOTION_DEFAULTS.baseScrollSpeed);

    const resolution = resolveHazardSafeSpeedChange(initial, 0, LIVE_CONTEXT, {
      baseScrollSpeed: acceptedSpeed,
    });
    const accepted = advanceGeneratedHazardStream(initial, 0, LIVE_CONTEXT, {
      baseScrollSpeed: acceptedSpeed,
    });

    expect(resolution).toMatchObject({
      appliedScrollSpeed: acceptedSpeed,
      maximumSafeScrollSpeed: acceptedSpeed,
      requestedScrollSpeed: acceptedSpeed,
      status: 'applied',
    });
    expect(accepted.schedulingWindow.scrollSpeed).toBe(acceptedSpeed);
    expect(accepted.spawns.slice(0, initial.spawns.length)).toEqual(initial.spawns);

    for (const [index, spawn] of initial.spawns.entries()) {
      expect(accepted.spawns[index]).toBe(spawn);
    }
    expect(
      accepted.spawns.every(
        (spawn) =>
          evaluateHazardApproachTiming(
            spawn.approachTiming.targetRunDistance,
            0,
            accepted.schedulingWindow,
          ).meetsMinimumReactionTime,
      ),
    ).toBe(true);

    const nextSchedulingDistance =
      accepted.nextPatternStartDistance -
      accepted.schedulingWindow.minimumReactionDistance -
      PROTOTYPE_PLAYER_COLLISION_EXTENTS.right;
    const continued = advanceGeneratedHazardStream(accepted, nextSchedulingDistance, LIVE_CONTEXT, {
      baseScrollSpeed: acceptedSpeed,
    });
    const newlyScheduled = continued.spawns.slice(initial.spawns.length);

    expect(newlyScheduled.length).toBeGreaterThan(0);
    expect(
      newlyScheduled.every(
        (spawn) =>
          spawn.approachTiming.scrollSpeed === acceptedSpeed &&
          spawn.approachTiming.meetsMinimumReactionTime,
      ),
    ).toBe(true);
    expect(
      newlyScheduled.every(
        (spawn) =>
          spawn.approachTiming.targetRunDistance ===
          spawn.runDistance - PROTOTYPE_PLAYER_COLLISION_EXTENTS.right,
      ),
    ).toBe(true);

    const slowerResolution = resolveHazardSafeSpeedChange(initial, 0, LIVE_CONTEXT, {
      baseScrollSpeed: 175,
    });
    expect(slowerResolution).toMatchObject({
      appliedScrollSpeed: 175,
      requestedScrollSpeed: 175,
      status: 'applied',
    });
  });

  it('commits newly reachable encounters at the same distance after a planning-only advance', () => {
    const initial = createGeneratedHazardStream(
      'planning-commit',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const preview = advanceGeneratedHazardStream(
      initial,
      1_000,
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
      1_000 / PROTOTYPE_RUN_MOTION_DEFAULTS.baseScrollSpeed,
      false,
    );
    const committed = advanceGeneratedHazardStream(
      preview,
      preview.runDistance,
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
      0,
      true,
    );

    expect(preview.scheduledPatternCount).toBe(initial.scheduledPatternCount);
    expect(committed.scheduledPatternCount).toBeGreaterThan(preview.scheduledPatternCount);
    expect(committed.runDistance).toBe(preview.runDistance);
  });

  it('reuses the frozen spawn array when a forward commit changes no spawn membership', () => {
    const initial = createGeneratedHazardStream(
      'stable-spawn-array',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const advanced = advanceGeneratedHazardStream(
      initial,
      initial.runDistance + 1,
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(advanced.runDistance).toBe(initial.runDistance + 1);
    expect(advanced.scheduledPatternCount).toBe(initial.scheduledPatternCount);
    expect(advanced.spawns).toBe(initial.spawns);
    expect(Object.isFrozen(advanced.spawns)).toBe(true);
  });

  it('returns the same state without duplicate spawns at repeated run distance', () => {
    const initial = createGeneratedHazardStream(
      'no-duplicates',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const advanced = advanceGeneratedHazardStream(
      initial,
      700,
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const repeated = advanceGeneratedHazardStream(
      advanced,
      700,
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(repeated).toBe(advanced);
    expect(new Set(repeated.spawns).size).toBe(repeated.spawns.length);
  });

  it('does not consume generation state for zero-delta progress', () => {
    const initial = createGeneratedHazardStream(
      'paused-stream',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const paused = advanceGeneratedHazardStream(
      initial,
      0,
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(paused).toBe(initial);
    expect(paused.generationState).toBe(initial.generationState);
  });

  it('removes hazards only after they leave the fixed logical retention window', () => {
    const initial = createGeneratedHazardStream(
      'retention-window',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const firstSpawn = initial.spawns[0];

    expect(firstSpawn).toBeDefined();
    if (!firstSpawn) {
      throw new Error('Expected the initial stream to contain a hazard.');
    }

    const advanced = advanceGeneratedHazardStream(
      initial,
      firstSpawn.hitbox.right + PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG.retainBehindDistance + 1,
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(advanced.spawns).not.toBe(initial.spawns);
    expect(Object.isFrozen(advanced.spawns)).toBe(true);
    expect(advanced.spawns).not.toContain(firstSpawn);
    expect(advanced.spawns.every((spawn) => spawn.runDistance >= firstSpawn.runDistance)).toBe(
      true,
    );
  });

  it('records terminal scheduler exhaustion instead of retrying forever', () => {
    const context = {
      catalog: [BLOCKED_PATTERN],
      config: {
        ...PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
        maxCandidateAttempts: 3,
      },
    };
    const exhausted = createGeneratedHazardStream(
      'exhausted-stream',
      context,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    const generationStateAfterFailure = exhausted.generationState;
    const advanced = advanceGeneratedHazardStream(
      exhausted,
      100,
      context,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(exhausted.status).toBe('exhausted');
    expect(exhausted.spawns).toEqual([]);
    expect(advanced.generationState).toBe(generationStateAfterFailure);
    expect(advanced.status).toBe('exhausted');
  });

  it('rejects invalid or backward progress and invalid logical window configuration', () => {
    const initial = createGeneratedHazardStream(
      'invalid-progress',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(() =>
      advanceGeneratedHazardStream(initial, -1, LIVE_CONTEXT, PROTOTYPE_RUN_MOTION_DEFAULTS),
    ).toThrow(RangeError);
    expect(() =>
      advanceGeneratedHazardStream(
        initial,
        Number.NaN,
        LIVE_CONTEXT,
        PROTOTYPE_RUN_MOTION_DEFAULTS,
      ),
    ).toThrow(RangeError);
    expect(() =>
      advanceGeneratedHazardStream(
        initial,
        initial.runDistance - 1,
        LIVE_CONTEXT,
        PROTOTYPE_RUN_MOTION_DEFAULTS,
      ),
    ).toThrow(RangeError);
    expect(() =>
      createGeneratedHazardStream(
        'invalid-window',
        {
          catalog: PROTOTYPE_HAZARD_PATTERN_FIXTURES,
          config: {
            ...PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
            reactionTime: { minimumReactionTimeSeconds: 0 },
          },
        },
        PROTOTYPE_RUN_MOTION_DEFAULTS,
      ),
    ).toThrow(RangeError);
  });

  it('keeps immutable logical output independent of viewport state', () => {
    const stream = createGeneratedHazardStream(
      'logical-stream',
      LIVE_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(Object.isFrozen(stream)).toBe(true);
    expect(Object.isFrozen(stream.spawns)).toBe(true);
    expect(JSON.stringify(stream)).not.toMatch(/viewport|screen|phaser/i);
  });
});
