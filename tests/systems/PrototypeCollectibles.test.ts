import { describe, expect, it } from 'vitest';
import type { LogicalCollectibleSpawnInstance } from '../../src/generation/GeneratedCollectibles';
import type { LogicalHazard } from '../../src/systems/HazardCollision';
import {
  createPrototypeRunState,
  stepPrototypeRun,
  type PrototypeRunState,
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
    const state = runForSeconds(STANDARD_FRAME_SCHEDULES.hz60, 5);

    expect(state.collectibles).toMatchObject({
      collectedCount: 1,
      collectedValue: 1,
      earnedReward: 1,
    });
  });

  it('keeps only pickups resolved before a lethal collision in a coarse terminal step', () => {
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
      runDistance: 145,
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
});
