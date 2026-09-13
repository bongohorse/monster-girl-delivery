import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import { PROTOTYPE_PLACEHOLDER_HAZARD } from '../../src/hazards/PrototypeHazard';
import {
  calculatePrototypeRunScore,
  createPrototypeRunResultSnapshot,
} from '../../src/systems/PrototypeRunResult';
import {
  createPrototypeRunState,
  type PrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';

const FLIGHT_BOUNDS = Object.freeze({ ceilingY: 28, floorY: 362 });
const BASE_CONTEXT = Object.freeze({
  flightBounds: FLIGHT_BOUNDS,
  flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
  hazards: [PROTOTYPE_PLACEHOLDER_HAZARD],
  runMotionTuning: PROTOTYPE_RUN_MOTION_DEFAULTS,
  thrustHeld: false,
});
const COLLISION_STATE: PrototypeRunState = {
  phase: 'running',
  motion: { distance: 1_180 },
  flight: { positionY: 195, velocityY: 0 },
};

describe('prototype run results', () => {
  it('captures one immutable snapshot at the authoritative run-end transition', () => {
    const result = stepPrototypeRun(COLLISION_STATE, 0.05, BASE_CONTEXT);

    expect(result.enteredDead).toBe(true);
    expect(result.state.phase).toBe('dead');
    expect(result.state.finalResult).toEqual({
      finalDistance: 1_197.5,
      score: 1_197,
      collectedCount: 0,
      collectedValue: 0,
      earnedReward: 0,
      grazeCount: 0,
    });
    expect(Object.isFrozen(result.state.finalResult)).toBe(true);

    const finalized = result.state.finalResult;
    const repeated = stepPrototypeRun(result.state, 10, {
      ...BASE_CONTEXT,
      resultTotals: {
        collectedCount: 99,
        collectedValue: 99,
        earnedReward: 99,
        grazeCount: 99,
      },
    });

    expect(repeated.enteredDead).toBe(false);
    expect(repeated.state).toBe(result.state);
    expect(repeated.state.finalResult).toBe(finalized);
  });

  it('keeps current score authority distance-only while retaining future skill totals for consumers', () => {
    const result = stepPrototypeRun(COLLISION_STATE, 0.05, {
      ...BASE_CONTEXT,
      resultTotals: {
        collectedCount: 3,
        collectedValue: 42,
        earnedReward: 7,
        grazeCount: 4,
      },
    });

    expect(result.state.finalResult).toEqual({
      finalDistance: 1_197.5,
      score: 1_197,
      collectedCount: 3,
      collectedValue: 42,
      earnedReward: 7,
      grazeCount: 4,
    });
    expect(calculatePrototypeRunScore(1_197.5)).toBe(1_197);
  });

  it('produces equivalent snapshots for equivalent deterministic logical runs', () => {
    const first = stepPrototypeRun(COLLISION_STATE, 0.05, BASE_CONTEXT);
    const repeated = stepPrototypeRun(COLLISION_STATE, 0.05, BASE_CONTEXT);

    expect(first.state.finalResult).toEqual(repeated.state.finalResult);
    expect(first.state.finalResult).not.toBe(repeated.state.finalResult);
  });

  it('does not create a result before run end and a restart has no previous-run result', () => {
    const fresh = createPrototypeRunState(FLIGHT_BOUNDS);
    const running = stepPrototypeRun(fresh, 0.05, { ...BASE_CONTEXT, hazards: [] });
    const dead = stepPrototypeRun(COLLISION_STATE, 0.05, BASE_CONTEXT);
    const restarted = createPrototypeRunState(FLIGHT_BOUNDS);

    expect(running.enteredDead).toBe(false);
    expect(running.state.finalResult).toBeUndefined();
    expect(dead.state.finalResult).toBeDefined();
    expect(restarted.motion.distance).toBe(0);
    expect(restarted.finalResult).toBeUndefined();
  });

  it('rejects invalid result inputs instead of silently normalizing non-authoritative values', () => {
    expect(() => createPrototypeRunResultSnapshot(-1)).toThrow(RangeError);
    expect(() =>
      createPrototypeRunResultSnapshot(100, {
        collectedCount: 1.5,
        collectedValue: 0,
        earnedReward: 0,
        grazeCount: 0,
      }),
    ).toThrow(RangeError);
    expect(() =>
      createPrototypeRunResultSnapshot(100, {
        collectedCount: 0,
        collectedValue: 0,
        earnedReward: Number.NaN,
        grazeCount: 0,
      }),
    ).toThrow(RangeError);
  });
});
