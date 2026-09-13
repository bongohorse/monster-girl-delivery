import type { FlightTuningValues } from '../config/FlightTuningConfig';
import type { RunMotionValues } from '../config/RunMotionConfig';
import type { LogicalHazard } from './HazardCollision';
import { isPlayerCollidingWithHazardDuringStep } from './HazardCollision';
import {
  createPrototypeRunResultSnapshot,
  type PrototypeRunResultSnapshot,
  type PrototypeRunResultTotals,
} from './PrototypeRunResult';
import { type RunMotionState, stepRunMotion } from './RunMotionSimulation';
import {
  constrainVerticalFlightState,
  createVerticalFlightTrajectory,
  type VerticalFlightBounds,
  type VerticalFlightState,
} from './VerticalFlightSimulation';

export type PrototypeRunPhase = 'running' | 'dead';

export interface PrototypeRunState {
  flight: VerticalFlightState;
  motion: RunMotionState;
  phase: PrototypeRunPhase;
  /** Present only after the authoritative running -> dead transition has finalized this run. */
  finalResult?: Readonly<PrototypeRunResultSnapshot>;
}

export interface PrototypeRunStepContext {
  flightBounds: Readonly<VerticalFlightBounds>;
  flightTuning: Readonly<FlightTuningValues>;
  hazards: ReadonlyArray<Readonly<LogicalHazard>>;
  /**
   * Authoritative run-local totals supplied by their owning gameplay systems.
   * Until #84/#90 land, callers omit this and the snapshot records zero skill/reward totals.
   */
  resultTotals?: Readonly<PrototypeRunResultTotals>;
  runMotionTuning: Readonly<RunMotionValues>;
  thrustHeld: boolean;
}

export interface PrototypeRunStepResult {
  enteredDead: boolean;
  state: PrototypeRunState;
}

/** Creates the one deterministic starting state used by initial entry and every restart. */
export const createPrototypeRunState = (
  flightBounds: Readonly<VerticalFlightBounds>,
): PrototypeRunState => {
  const centeredFlight = constrainVerticalFlightState(
    {
      positionY: (flightBounds.ceilingY + flightBounds.floorY) / 2,
      velocityY: 0,
    },
    flightBounds,
  );

  return {
    phase: 'running',
    motion: { distance: 0 },
    flight: centeredFlight,
  };
};

/**
 * Advances one authoritative run step and evaluates continuous collision along the same trajectory.
 * A collision keeps the completed step state and exposes no time of impact, preserving the existing
 * run contract. The same one-shot transition captures the immutable M5 result snapshot from the
 * completed authoritative state; later dead-state/presentation work cannot recalculate or extend it.
 * A dead run is held exactly as-is until the caller explicitly replaces it with a fresh state.
 */
export const stepPrototypeRun = (
  state: Readonly<PrototypeRunState>,
  elapsedSeconds: number,
  context: Readonly<PrototypeRunStepContext>,
): PrototypeRunStepResult => {
  if (state.phase === 'dead') {
    return { state, enteredDead: false };
  }

  const motion = stepRunMotion(state.motion, elapsedSeconds, context.runMotionTuning);
  const flightTrajectory = createVerticalFlightTrajectory(
    state.flight,
    elapsedSeconds,
    context.thrustHeld,
    context.flightTuning,
    context.flightBounds,
  );
  const flight = { ...flightTrajectory.finalState };
  const enteredDead = context.hazards.some((hazard) =>
    isPlayerCollidingWithHazardDuringStep(
      state.motion,
      flightTrajectory,
      elapsedSeconds,
      context.runMotionTuning,
      hazard,
    ),
  );

  if (!enteredDead) {
    return {
      enteredDead: false,
      state: {
        phase: 'running',
        motion,
        flight,
      },
    };
  }

  return {
    enteredDead: true,
    state: {
      phase: 'dead',
      motion,
      flight,
      finalResult: createPrototypeRunResultSnapshot(motion.distance, context.resultTotals),
    },
  };
};
