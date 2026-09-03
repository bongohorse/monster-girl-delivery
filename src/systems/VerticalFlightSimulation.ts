import type { FlightTuningValues } from '../config/FlightTuningConfig';

/** Positive Y and positive velocity point downward; negative velocity points upward. */
export interface VerticalFlightState {
  positionY: number;
  velocityY: number;
}

/**
 * Inclusive limits for positionY. Callers derive these values from the safe world area and the
 * player's extents, so this simulation does not depend on a sprite size, resolution, or orientation.
 * Values must be finite and ceilingY must not exceed floorY; an equal pair is a valid pinned range.
 */
export interface VerticalFlightBounds {
  ceilingY: number;
  floorY: number;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const assertValidBounds = (bounds: Readonly<VerticalFlightBounds>): void => {
  if (
    !Number.isFinite(bounds.ceilingY) ||
    !Number.isFinite(bounds.floorY) ||
    bounds.ceilingY > bounds.floorY
  ) {
    throw new RangeError(
      'Flight bounds must be finite with ceilingY less than or equal to floorY.',
    );
  }
};

const constrainToBounds = (
  state: Readonly<VerticalFlightState>,
  bounds: Readonly<VerticalFlightBounds>,
): VerticalFlightState => {
  const positionY = clamp(state.positionY, bounds.ceilingY, bounds.floorY);
  const velocityPointsAboveCeiling = positionY === bounds.ceilingY && state.velocityY < 0;
  const velocityPointsBelowFloor = positionY === bounds.floorY && state.velocityY > 0;

  return {
    positionY,
    velocityY: velocityPointsAboveCeiling || velocityPointsBelowFloor ? 0 : state.velocityY,
  };
};

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
 * A positive-time step normalizes state against current bounds before advancing, so changed bounds
 * take effect without retaining outward velocity. Zero elapsed time validates bounds but preserves
 * the existing no-movement contract.
 */
export const stepVerticalFlight = (
  state: Readonly<VerticalFlightState>,
  elapsedSeconds: number,
  thrustHeld: boolean,
  tuning: Readonly<FlightTuningValues>,
  bounds: Readonly<VerticalFlightBounds>,
): VerticalFlightState => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('elapsedSeconds must be a non-negative finite number.');
  }

  assertValidBounds(bounds);

  if (elapsedSeconds === 0) {
    return { ...state };
  }

  const constrainedState = constrainToBounds(state, bounds);
  const minimumVelocity = -tuning.maxRiseVelocity;
  const maximumVelocity = tuning.maxFallVelocity;
  const initialVelocity = clamp(constrainedState.velocityY, minimumVelocity, maximumVelocity);
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

  return constrainToBounds(
    {
      positionY: constrainedState.positionY + displacement,
      velocityY: finalVelocity,
    },
    bounds,
  );
};
