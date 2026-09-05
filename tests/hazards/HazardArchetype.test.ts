import { describe, expect, it } from 'vitest';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import { TimeService } from '../../src/core/TimeService';
import { PROTOTYPE_LIVE_RUN_SEED } from '../../src/generation/GeneratedHazardStream';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_VERTICAL_PATROL_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import {
  createHazardBehavior,
  getHazardSweptHitbox,
  type HazardBehavior,
  resolveHazardHitboxAtRunDistance,
  resolveTargetLockStrikeHitbox,
} from '../../src/hazards/HazardArchetype';
import { isPlayerCollidingWithHazard } from '../../src/systems/HazardCollision';
import { stepRunMotion } from '../../src/systems/RunMotionSimulation';

const MOVING_HAZARD = Object.freeze({
  behavior: createHazardBehavior({
    amplitudeY: 48,
    archetype: 'geometric',
    cycleDistance: 400,
    kind: 'vertical-patrol',
    phaseOffset: 0,
  }),
  hitbox: Object.freeze({ left: 1_000, right: 1_048, top: 147, bottom: 195 }),
  runDistance: 1_000,
});

const createReactiveBehavior = () => {
  const behavior = createHazardBehavior({
    archetype: 'reactive',
    kind: 'target-lock-strike',
    lifecycle: {
      durations: { warningSeconds: 1.4, lockSeconds: 0.4, activeSeconds: 1 },
      warningGeometry: { leftOffset: -44, rightOffset: 44, topOffset: -34, bottomOffset: 34 },
    },
    maximumTargetY: 222,
    minimumTargetY: 72,
    strikeHeight: 48,
  });
  if (behavior.kind !== 'target-lock-strike') {
    throw new Error('Expected target-lock strike behavior.');
  }
  return behavior;
};

const REACTIVE_HAZARD = Object.freeze({
  behavior: createReactiveBehavior(),
  hitbox: Object.freeze({ left: 1_000, right: 1_064, top: 171, bottom: 219 }),
  runDistance: 1_000,
});

describe('geometric hazard archetype', () => {
  it('snapshots a serializable discriminated behavior identity', () => {
    const source = {
      amplitudeY: 48,
      archetype: 'geometric' as const,
      cycleDistance: 400,
      kind: 'vertical-patrol' as const,
      phaseOffset: 0.25,
    };
    const behavior = createHazardBehavior(source);

    source.amplitudeY = 96;

    expect(behavior).toEqual({
      amplitudeY: 48,
      archetype: 'geometric',
      cycleDistance: 400,
      kind: 'vertical-patrol',
      phaseOffset: 0.25,
    });
    expect(JSON.parse(JSON.stringify(behavior))).toEqual(behavior);
    expect(Object.isFrozen(behavior)).toBe(true);
  });

  it('deeply snapshots a serializable timed pulse behavior identity', () => {
    const source = {
      archetype: 'timed' as const,
      kind: 'pulse' as const,
      lifecycle: {
        durations: { warningSeconds: 1, lockSeconds: 0.25, activeSeconds: 0.75 },
        warningGeometry: { leftOffset: -32, rightOffset: 32, topOffset: -32, bottomOffset: 32 },
      },
    };
    const behavior = createHazardBehavior(source);
    source.lifecycle.durations.warningSeconds = 10;

    expect(behavior).toEqual({
      archetype: 'timed',
      kind: 'pulse',
      lifecycle: {
        durations: { warningSeconds: 1, lockSeconds: 0.25, activeSeconds: 0.75 },
        warningGeometry: { leftOffset: -32, rightOffset: 32, topOffset: -32, bottomOffset: 32 },
      },
    });
    expect(JSON.parse(JSON.stringify(behavior))).toEqual(behavior);
    expect(Object.isFrozen(behavior)).toBe(true);
    if (behavior.kind === 'pulse') {
      expect(Object.isFrozen(behavior.lifecycle)).toBe(true);
      expect(Object.isFrozen(behavior.lifecycle.durations)).toBe(true);
    }
  });

  it('deeply snapshots and deterministically resolves target-lock strike behavior', () => {
    const source = {
      archetype: 'reactive' as const,
      kind: 'target-lock-strike' as const,
      lifecycle: {
        durations: { warningSeconds: 1.4, lockSeconds: 0.4, activeSeconds: 1 },
        warningGeometry: { leftOffset: -44, rightOffset: 44, topOffset: -34, bottomOffset: 34 },
      },
      maximumTargetY: 222,
      minimumTargetY: 72,
      strikeHeight: 48,
    };
    const behavior = createHazardBehavior(source);
    source.lifecycle.durations.warningSeconds = 10;
    source.maximumTargetY = 300;

    expect(behavior).toEqual(REACTIVE_HAZARD.behavior);
    expect(JSON.parse(JSON.stringify(behavior))).toEqual(behavior);
    expect(Object.isFrozen(behavior)).toBe(true);
    if (behavior.kind === 'target-lock-strike') {
      expect(Object.isFrozen(behavior.lifecycle)).toBe(true);
      expect(Object.isFrozen(behavior.lifecycle.durations)).toBe(true);
    }

    expect(resolveTargetLockStrikeHitbox(REACTIVE_HAZARD, 200)).toEqual({
      left: 1_000,
      right: 1_064,
      top: 176,
      bottom: 224,
    });
    expect(resolveTargetLockStrikeHitbox(REACTIVE_HAZARD, 500)).toEqual({
      left: 1_000,
      right: 1_064,
      top: 198,
      bottom: 246,
    });
  });

  it('resolves a deterministic triangle-wave patrol from absolute run progress', () => {
    expect(resolveHazardHitboxAtRunDistance(MOVING_HAZARD, 1_000)).toEqual({
      left: 1_000,
      right: 1_048,
      top: 99,
      bottom: 147,
    });
    expect(resolveHazardHitboxAtRunDistance(MOVING_HAZARD, 1_100)).toEqual({
      left: 1_000,
      right: 1_048,
      top: 147,
      bottom: 195,
    });
    expect(resolveHazardHitboxAtRunDistance(MOVING_HAZARD, 1_200)).toEqual({
      left: 1_000,
      right: 1_048,
      top: 195,
      bottom: 243,
    });
    expect(resolveHazardHitboxAtRunDistance(MOVING_HAZARD, 1_400)).toEqual(
      resolveHazardHitboxAtRunDistance(MOVING_HAZARD, 1_000),
    );
  });

  it('freezes during paused or zero-delta simulation because run distance is its only clock', () => {
    const time = new TimeService();
    const initialMotion = { distance: 1_075 };
    const beforePause = resolveHazardHitboxAtRunDistance(MOVING_HAZARD, initialMotion.distance);

    time.pause();
    const pausedMotion = stepRunMotion(
      initialMotion,
      time.update(5_000),
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    expect(pausedMotion).toEqual(initialMotion);
    expect(resolveHazardHitboxAtRunDistance(MOVING_HAZARD, pausedMotion.distance)).toEqual(
      beforePause,
    );
  });

  it('feeds resolved geometry through the shared logical collision authority', () => {
    const upperPosition = resolveHazardHitboxAtRunDistance(MOVING_HAZARD, 1_000);
    const lowerPosition = resolveHazardHitboxAtRunDistance(MOVING_HAZARD, 1_200);
    const playerMotion = { distance: 1_024 };
    const playerFlight = { positionY: 123, velocityY: 0 };

    expect(isPlayerCollidingWithHazard(playerMotion, playerFlight, { hitbox: upperPosition })).toBe(
      true,
    );
    expect(isPlayerCollidingWithHazard(playerMotion, playerFlight, { hitbox: lowerPosition })).toBe(
      false,
    );
  });

  it('provides conservative swept geometry to existing fairness validation', () => {
    expect(getHazardSweptHitbox(MOVING_HAZARD)).toEqual({
      left: 1_000,
      right: 1_048,
      top: 99,
      bottom: 243,
    });
  });

  it('replays the same moving spawn and positions from the same seed and progression', () => {
    const createReplay = () => {
      const schedule = scheduleNextPattern({
        catalog: [PROTOTYPE_VERTICAL_PATROL_PATTERN],
        patternStartDistance: 2_000,
        state: createRunGenerationState(PROTOTYPE_LIVE_RUN_SEED),
      });

      if (schedule.status !== 'accepted' || schedule.patternId !== 'prototype-vertical-patrol') {
        throw new Error('Expected the live seed to select the prototype moving pattern.');
      }

      const spawn = schedule.spawns[0];
      if (!spawn) {
        throw new Error('Expected the prototype moving spawn.');
      }

      return {
        behavior: spawn.behavior,
        hitboxes: [2_280, 2_455, 2_630].map((distance) =>
          resolveHazardHitboxAtRunDistance(spawn, distance),
        ),
        state: schedule.state,
      };
    };

    expect(createReplay()).toEqual(createReplay());
  });

  it('rejects malformed behavior and run-distance inputs', () => {
    const invalidBehaviors = [
      { ...MOVING_HAZARD.behavior, amplitudeY: 0 },
      { ...MOVING_HAZARD.behavior, cycleDistance: Number.POSITIVE_INFINITY },
      { ...MOVING_HAZARD.behavior, phaseOffset: -0.1 },
      { ...MOVING_HAZARD.behavior, phaseOffset: 1 },
      { ...REACTIVE_HAZARD.behavior, strikeHeight: 0 },
      { ...REACTIVE_HAZARD.behavior, maximumTargetY: 72 },
      {
        ...REACTIVE_HAZARD.behavior,
        lifecycle: {
          ...REACTIVE_HAZARD.behavior.lifecycle,
          durations: { ...REACTIVE_HAZARD.behavior.lifecycle.durations, lockSeconds: 0 },
        },
      },
      { archetype: 'unknown', kind: 'static' },
      { archetype: 'geometric', kind: 'unknown' },
    ];

    for (const behavior of invalidBehaviors) {
      expect(() => createHazardBehavior(behavior as unknown as HazardBehavior)).toThrow();
    }
    expect(() => resolveHazardHitboxAtRunDistance(MOVING_HAZARD, Number.NaN)).toThrow(RangeError);
    const invalidAnchor = { ...MOVING_HAZARD, runDistance: -1 };
    expect(() => resolveHazardHitboxAtRunDistance(invalidAnchor, 1_000)).toThrow(RangeError);
    expect(() => resolveTargetLockStrikeHitbox(REACTIVE_HAZARD, Number.NaN)).toThrow(RangeError);
  });
});
