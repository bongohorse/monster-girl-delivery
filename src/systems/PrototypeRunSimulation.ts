import type { FlightTuningValues } from '../config/FlightTuningConfig';
import type { RunMotionValues } from '../config/RunMotionConfig';
import type { LogicalHazard } from './HazardCollision';
import { isPlayerCollidingWithHazard } from './HazardCollision';
import { type RunMotionState, stepRunMotion } from './RunMotionSimulation';
import {
  constrainVerticalFlightState,
  stepVerticalFlight,
  type VerticalFlightBounds,
  type VerticalFlightState,
} from './VerticalFlightSimulation';

export type PrototypeRunPhase = 'running' | 'dead';

export interface PrototypeRunState {
  flight: VerticalFlightState;
  motion: RunMotionState;
  phase: PrototypeRunPhase;
}

export interface PrototypeRunStepContext {
  flightBounds: Readonly<VerticalFlightBounds>;
  flightTuning: Readonly<FlightTuningValues>;
  hazards: ReadonlyArray<Readonly<LogicalHazard>>;
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
 * Advances one authoritative run step, then evaluates collision from the resulting logical state.
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
  const flight = stepVerticalFlight(
    state.flight,
    elapsedSeconds,
    context.thrustHeld,
    context.flightTuning,
    context.flightBounds,
  );
  const enteredDead = context.hazards.some((hazard) =>
    isPlayerCollidingWithHazard(motion, flight, hazard),
  );

  return {
    enteredDead,
    state: {
      phase: enteredDead ? 'dead' : 'running',
      motion,
      flight,
    },
  };
};
