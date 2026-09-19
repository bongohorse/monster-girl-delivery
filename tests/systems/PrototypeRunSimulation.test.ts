import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import {
  PROTOTYPE_PLACEHOLDER_HAZARD,
  projectHazardHitboxToScreen,
} from '../../src/hazards/PrototypeHazard';
import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_LENGTHS,
} from '../../src/hazards/PrototypeZapperHazard';
import { createPrototypeZapperCollisionWorkCounters } from '../../src/systems/HazardCollision';
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

  it('collides against the moving hazard position resolved from the stepped run distance', () => {
    const movingHazard = {
      behavior: {
        amplitudeY: 48,
        archetype: 'geometric' as const,
        cycleDistance: 400,
        kind: 'vertical-patrol' as const,
        phaseOffset: 0,
      },
      hitbox: { left: 1_000, right: 1_048, top: 147, bottom: 195 },
      runDistance: 1_000,
    };
    const upperPlayerState: PrototypeRunState = {
      phase: 'running',
      motion: { distance: 982.5 },
      flight: { positionY: 123, velocityY: 0 },
    };
    const centerPlayerState: PrototypeRunState = {
      ...upperPlayerState,
      flight: { positionY: 195, velocityY: 0 },
    };
    const context = { ...STEP_CONTEXT, hazards: [movingHazard] };

    expect(stepPrototypeRun(upperPlayerState, 0.05, context).enteredDead).toBe(true);
    expect(stepPrototypeRun(centerPlayerState, 0.05, context).enteredDead).toBe(false);
  });

  it('detects the same vertical-patrol crossing with one coarse step and fine partitions', () => {
    const movingHazard = {
      behavior: {
        amplitudeY: 50,
        archetype: 'geometric' as const,
        cycleDistance: 140,
        kind: 'vertical-patrol' as const,
        phaseOffset: 0.25,
      },
      hitbox: { left: -100, right: 1_000, top: 49, bottom: 51 },
      runDistance: 0,
    };
    const initialState: PrototypeRunState = {
      phase: 'running',
      motion: { distance: 0 },
      flight: { positionY: 0, velocityY: 0 },
    };
    const context = {
      flightBounds: { ceilingY: -1_000, floorY: 1_000 },
      flightTuning: { gravity: 0, thrust: 0, maxFallVelocity: 1_000, maxRiseVelocity: 1_000 },
      hazards: [movingHazard],
      runMotionTuning: PROTOTYPE_RUN_MOTION_DEFAULTS,
      thrustHeld: false,
    };

    const finalEndpointState: PrototypeRunState = {
      ...initialState,
      motion: { distance: 140 },
    };
    expect(stepPrototypeRun(initialState, 0, context).enteredDead).toBe(false);
    expect(stepPrototypeRun(finalEndpointState, 0, context).enteredDead).toBe(false);

    const coarse = stepPrototypeRun(initialState, 0.4, context);
    let fine: Readonly<PrototypeRunState> = initialState;
    for (let stepIndex = 0; stepIndex < 40 && fine.phase === 'running'; stepIndex += 1) {
      fine = stepPrototypeRun(fine, 0.01, context).state;
    }

    expect(coarse.enteredDead).toBe(true);
    expect(fine.phase).toBe('dead');
  });

  it('threads one Zapper work collector through the authoritative run collision path', () => {
    const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.short);
    const hitbox = createPrototypeZapperHitbox(10, 0, behavior);
    const zapper = Object.freeze({
      behavior,
      entryId: 'run-work-counter',
      hitbox,
      patternEntryIndex: 0,
      patternId: 'run-work-counter-pattern',
      runDistance: hitbox.left,
      type: 'placeholder-barrier' as const,
    });
    const counters = createPrototypeZapperCollisionWorkCounters();
    const state: PrototypeRunState = {
      phase: 'running',
      motion: { distance: 0, simulationSeconds: 0 },
      flight: { positionY: 47, velocityY: 0 },
    };

    const result = stepPrototypeRun(state, 0.05, {
      flightBounds: { ceilingY: -1_000, floorY: 1_000 },
      flightTuning: { gravity: 0, thrust: 0, maxFallVelocity: 1_000, maxRiseVelocity: 1_000 },
      hazards: [zapper],
      runMotionTuning: { baseScrollSpeed: 0 },
      thrustHeld: false,
      zapperCollisionWorkCounters: counters,
    });

    expect(result.enteredDead).toBe(false);
    expect(counters.collisionCallCount).toBe(1);
    expect(counters.candidateSampleCount).toBeGreaterThan(2);
    expect(counters.evaluatedSampleCount).toBe(counters.candidateSampleCount);
    expect(counters.geometryResolutionCount).toBe(1);
    expect(counters.primaryNarrowphaseCheckCount).toBe(counters.evaluatedSampleCount);
    expect(counters.secondaryNarrowphaseCheckCount).toBe(counters.evaluatedSampleCount);
  });

  it('recreates the same clean state and derived hazard position on every restart', () => {
    const first = createPrototypeRunState(FLIGHT_BOUNDS);
    const repeated = createPrototypeRunState(FLIGHT_BOUNDS);

    expect(first).toEqual({
      phase: 'running',
      motion: { distance: 0, simulationSeconds: 0 },
      flight: { positionY: 195, velocityY: 0 },
    });
    expect(repeated).toEqual(first);
    expect(projectHazardHitboxToScreen(PROTOTYPE_PLACEHOLDER_HAZARD, first.motion, 200)).toEqual(
      projectHazardHitboxToScreen(PROTOTYPE_PLACEHOLDER_HAZARD, repeated.motion, 200),
    );
  });
});
