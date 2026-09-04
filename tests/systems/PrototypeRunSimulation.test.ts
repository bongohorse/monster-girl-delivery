import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import {
  PROTOTYPE_PLACEHOLDER_HAZARD,
  projectHazardHitboxToScreen,
} from '../../src/hazards/PrototypeHazard';
import {
  createPrototypeRunState,
  type PrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';

const FLIGHT_BOUNDS = Object.freeze({ ceilingY: 28, floorY: 362 });
const STEP_CONTEXT = Object.freeze({
  flightBounds: FLIGHT_BOUNDS,
  flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
  hazards: [PROTOTYPE_PLACEHOLDER_HAZARD],
  runMotionTuning: PROTOTYPE_RUN_MOTION_DEFAULTS,
  thrustHeld: false,
});

describe('prototype run simulation', () => {
  it('transitions a running state to dead after an authoritative collision step', () => {
    const state: PrototypeRunState = {
      phase: 'running',
      motion: { distance: 1_180 },
      flight: { positionY: 195, velocityY: 0 },
    };

    const result = stepPrototypeRun(state, 0.05, STEP_CONTEXT);

    expect(result.enteredDead).toBe(true);
    expect(result.state.phase).toBe('dead');
    expect(result.state.motion.distance).toBe(1_197.5);
  });

  it('does not repeat the death transition or advance an already-dead run', () => {
    const deadState: PrototypeRunState = {
      phase: 'dead',
      motion: { distance: 1_200 },
      flight: { positionY: 195, velocityY: 40 },
    };

    const result = stepPrototypeRun(deadState, 10, STEP_CONTEXT);

    expect(result.enteredDead).toBe(false);
    expect(result.state).toBe(deadState);
    expect(result.state).toEqual({
      phase: 'dead',
      motion: { distance: 1_200 },
      flight: { positionY: 195, velocityY: 40 },
    });
  });

  it('checks the generated logical hazard collection without a second collision path', () => {
    const state: PrototypeRunState = {
      phase: 'running',
      motion: { distance: 1_180 },
      flight: { positionY: 195, velocityY: 0 },
    };

    const clearHazard = {
      hitbox: { left: 2_000, right: 2_048, top: 147, bottom: 243 },
    };
    const result = stepPrototypeRun(state, 0.05, {
      ...STEP_CONTEXT,
      hazards: [clearHazard, PROTOTYPE_PLACEHOLDER_HAZARD],
    });

    expect(result.enteredDead).toBe(true);
    expect(result.state.phase).toBe('dead');
  });

  it('recreates the same clean state and derived hazard position on every restart', () => {
    const first = createPrototypeRunState(FLIGHT_BOUNDS);
    const repeated = createPrototypeRunState(FLIGHT_BOUNDS);

    expect(first).toEqual({
      phase: 'running',
      motion: { distance: 0 },
      flight: { positionY: 195, velocityY: 0 },
    });
    expect(repeated).toEqual(first);
    expect(projectHazardHitboxToScreen(PROTOTYPE_PLACEHOLDER_HAZARD, first.motion, 200)).toEqual(
      projectHazardHitboxToScreen(PROTOTYPE_PLACEHOLDER_HAZARD, repeated.motion, 200),
    );
  });
});
