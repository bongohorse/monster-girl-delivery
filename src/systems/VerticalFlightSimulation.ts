import type { FlightTuningValues } from '../config/FlightTuningConfig';

/** Positive Y and positive velocity point downward; negative velocity points upward. */
export interface VerticalFlightState {
  positionY: number;
  velocityY: number;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const calculateDisplacement = (
  initialVelocity: number,
  acceleration: number,
  finalVelocity: number,
  elapsedSeconds: number,
): number => {
  const acceleratedVelocity = initialVelocity + acceleration * elapsedSeconds;

  if (acceleration === 0 || acceleratedVelocity === finalVelocity) {
    return initialVelocity * elapsedSeconds + 0.5 * acceleration * elapsedSeconds * elapsedSeconds;
  }

  const secondsUntilLimit = clamp(
    (finalVelocity - initialVelocity) / acceleration,
    0,
    elapsedSeconds,
  );
  const acceleratingDisplacement =
    initialVelocity * secondsUntilLimit +
    0.5 * acceleration * secondsUntilLimit * secondsUntilLimit;

  return acceleratingDisplacement + finalVelocity * (elapsedSeconds - secondsUntilLimit);
};

/**
 * Advances vertical flight using an elapsed-seconds value already normalized by TimeService.
 * Constant acceleration and velocity-limit crossings are integrated analytically, limiting
 * timestep-subdivision differences to floating-point rounding rather than Euler drift.
 */
export const stepVerticalFlight = (
  state: Readonly<VerticalFlightState>,
  elapsedSeconds: number,
  thrustHeld: boolean,
  tuning: Readonly<FlightTuningValues>,
): VerticalFlightState => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('elapsedSeconds must be a non-negative finite number.');
  }

  if (elapsedSeconds === 0) {
    return { ...state };
  }

  const minimumVelocity = -tuning.maxRiseVelocity;
  const maximumVelocity = tuning.maxFallVelocity;
  const initialVelocity = clamp(state.velocityY, minimumVelocity, maximumVelocity);
  const acceleration = tuning.gravity - (thrustHeld ? tuning.thrust : 0);
  const finalVelocity = clamp(
    initialVelocity + acceleration * elapsedSeconds,
    minimumVelocity,
    maximumVelocity,
  );
  const displacement = calculateDisplacement(
    initialVelocity,
    acceleration,
    finalVelocity,
    elapsedSeconds,
  );

  return {
    positionY: state.positionY + displacement,
    velocityY: finalVelocity,
  };
};
