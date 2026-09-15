import { describe, expect, it } from 'vitest';
import type { LogicalCollectibleSpawnInstance } from '../../src/generation/GeneratedCollectibles';
import type { LogicalHazard } from '../../src/systems/HazardCollision';
import {
  createPrototypeRunState,
  type PrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';
import { type FrameSchedule, STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const FLIGHT_TUNING = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 0,
  maxRiseVelocity: 0,
});
const FLIGHT_BOUNDS = Object.freeze({ ceilingY: 0, floorY: 390 });
const RUN_MOTION = Object.freeze({ baseScrollSpeed: 100 });
const COLLECTIBLE: Readonly<LogicalCollectibleSpawnInstance> = Object.freeze({
  intent: 'safe-guide',
  pathId: 'test-guide',
  pathPointIndex: 0,
  patternId: 'test-pattern',
  patternStartDistance: 0,
  runDistance: 200,
  value: 1,
  y: 195,
});

const runForSeconds = (
  schedule: FrameSchedule,
  durationSeconds: number,
): Readonly<PrototypeRunState> => {
  let state: Readonly<PrototypeRunState> = createPrototypeRunState(FLIGHT_BOUNDS);
  let elapsed = 0;
  let steps = 0;

  while (elapsed < durationSeconds) {
    const requested = schedule.getNextDelta(elapsed, steps);
    const delta = Math.min(requested, durationSeconds - elapsed);
    state = stepPrototypeRun(state, delta, {
      collectibles: [COLLECTIBLE],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    }).state;
    elapsed += delta;
    steps += 1;
  }

  return state;
};

describe('PrototypeCollectibles', () => {
  it('preserves pickup state on a zero-delta pause boundary', () => {
    const initial = createPrototypeRunState(FLIGHT_BOUNDS);
    const zeroDelta = stepPrototypeRun(initial, 0, {
      collectibles: [
        Object.freeze({
          ...COLLECTIBLE,
          runDistance: 0,
        }),
      ],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    });

    expect(zeroDelta.enteredDead).toBe(false);
    expect(zeroDelta.state.motion.distance).toBe(0);
    expect(zeroDelta.state.collectibles).toBeUndefined();
  });

  it('awards on the first contact frame instead of waiting for the coin to pass the player', () => {
    const result = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 1.7, {
      collectibles: [COLLECTIBLE],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    });

    expect(result.enteredDead).toBe(false);
    expect(result.state.motion.distance).toBeCloseTo(170);
    expect(result.state.collectibles).toMatchObject({
      collectedCount: 1,
      collectedValue: 1,
      earnedReward: 1,
      pendingCollectibleIds: [],
    });
    expect(result.state.collectibles?.consumedCollectibleIds).toHaveLength(1);
  });

  it('uses a forgiving pickup footprint while preserving a real miss outside its edge', () => {
    const nearEdge = Object.freeze({ ...COLLECTIBLE, pathId: 'near-edge', y: 232 });
    const visibleMiss = Object.freeze({ ...COLLECTIBLE, pathId: 'visible-miss', y: 234 });

    const collected = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 1.7, {
      collectibles: [nearEdge],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    }).state;
    const missed = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 1.7, {
      collectibles: [visibleMiss],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    }).state;

    expect(collected.collectibles?.collectedCount).toBe(1);
    expect(missed.collectibles).toBeUndefined();
  });

  it('collects exactly once across the standard frame schedules', () => {
    for (const schedule of Object.values(STANDARD_FRAME_SCHEDULES)) {
      const state = runForSeconds(schedule, 3);

      expect(state.phase, schedule.name).toBe('running');
      expect(state.collectibles, schedule.name).toMatchObject({
        collectedCount: 1,
        collectedValue: 1,
        earnedReward: 1,
        pendingCollectibleIds: [],
      });
      expect(state.collectibles?.consumedCollectibleIds).toHaveLength(1);
    }
  });

  it('does not duplicate a collected pickup while it remains in the generated window', () => {
    const state = runForSeconds(STANDARD_FRAME_SCHEDULES['60hz'], 5);

    expect(state.collectibles).toMatchObject({
      collectedCount: 1,
      collectedValue: 1,
      earnedReward: 1,
    });
  });

  it('keeps only pickups contacted before a lethal collision in a coarse terminal step', () => {
    const lethalHazard: Readonly<LogicalHazard> = Object.freeze({
      hitbox: Object.freeze({ left: 150, right: 170, top: 180, bottom: 210 }),
    });
    const beforeDeath: Readonly<LogicalCollectibleSpawnInstance> = Object.freeze({
      ...COLLECTIBLE,
      pathId: 'before-death',
      runDistance: 50,
    });
    const afterDeath: Readonly<LogicalCollectibleSpawnInstance> = Object.freeze({
      ...COLLECTIBLE,
      pathId: 'after-death',
      runDistance: 180,
    });

    const result = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 2, {
      collectibles: [beforeDeath, afterDeath],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [lethalHazard],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    });

    expect(result.enteredDead).toBe(true);
    expect(result.state.collectibles).toMatchObject({
      collectedCount: 1,
      collectedValue: 1,
      earnedReward: 1,
      pendingCollectibleIds: [],
    });
    expect(result.state.finalResult).toMatchObject({
      collectedCount: 1,
      collectedValue: 1,
      earnedReward: 1,
    });

    const frozenState = stepPrototypeRun(result.state, 1, {
      collectibles: [beforeDeath, afterDeath],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    }).state;
    expect(frozenState).toBe(result.state);
  });

  it('preserves coin-before-death ordering across supported frame partitions', () => {
    const lethalHazard: Readonly<LogicalHazard> = Object.freeze({
      hitbox: Object.freeze({ left: 150, right: 170, top: 180, bottom: 210 }),
    });
    const beforeDeath = Object.freeze({ ...COLLECTIBLE, pathId: 'before-death', runDistance: 50 });
    const afterDeath = Object.freeze({ ...COLLECTIBLE, pathId: 'after-death', runDistance: 180 });

    for (const schedule of Object.values(STANDARD_FRAME_SCHEDULES)) {
      let state: Readonly<PrototypeRunState> = createPrototypeRunState(FLIGHT_BOUNDS);
      let elapsed = 0;
      let steps = 0;

      while (state.phase === 'running' && elapsed < 2.5) {
        const delta = schedule.getNextDelta(elapsed, steps);
        state = stepPrototypeRun(state, delta, {
          collectibles: [beforeDeath, afterDeath],
          flightBounds: FLIGHT_BOUNDS,
          flightTuning: FLIGHT_TUNING,
          hazards: [lethalHazard],
          runMotionTuning: RUN_MOTION,
          thrustHeld: false,
        }).state;
        elapsed += delta;
        steps += 1;
      }

      expect(state.phase, schedule.name).toBe('dead');
      expect(state.finalResult, schedule.name).toMatchObject({
        collectedCount: 1,
        collectedValue: 1,
        earnedReward: 1,
      });
    }
  });
});
