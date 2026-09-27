import type { RunMotionValues } from '../config/RunMotionConfig';
import { type LogicalHitbox, PROTOTYPE_PLAYER_COLLISION_EXTENTS } from './HazardCollision';
import { getFirstPlayerContactSeconds } from './PrototypeCollectibles';
import type { RunMotionState } from './RunMotionSimulation';
import type { VerticalFlightTrajectory } from './VerticalFlightSimulation';

/** First-route prototype footprints; the handoff is intentionally generous. */
export const PARCEL_PICKUP_HALF_SIZE = 14;
export const PARCEL_HANDOFF_HALF_WIDTH = 52;
export const PARCEL_HANDOFF_HALF_HEIGHT = 72;

export interface ParcelDeliveryRoute {
  readonly id: string;
  readonly pickup: Readonly<{ runDistance: number; y: number }>;
  readonly recipient: Readonly<{ runDistance: number; y: number }>;
}

export interface ParcelDeliveryRunState {
  readonly phase: 'available' | 'carrying' | 'delivered' | 'missed';
  readonly completedCount: number;
  readonly routeId: string | null;
}

const INITIAL_DELIVERY_STATE: Readonly<ParcelDeliveryRunState> = Object.freeze({
  phase: 'available',
  completedCount: 0,
  routeId: null,
});

export const createParcelDeliveryRunState = (): Readonly<ParcelDeliveryRunState> =>
  INITIAL_DELIVERY_STATE;

const makeHitbox = (
  center: Readonly<{ runDistance: number; y: number }>,
  halfWidth: number,
  halfHeight: number,
): Readonly<LogicalHitbox> => ({
  left: center.runDistance - halfWidth,
  right: center.runDistance + halfWidth,
  top: center.y - halfHeight,
  bottom: center.y + halfHeight,
});

/**
 * Pure authority for one planned parcel route. The route must be supplied by a separate planner
 * which has reserved a reachable, hazard-free handoff approach. This module does not place
 * recipients in live runs and does not award coins; it only records completed deliveries.
 */
export const stepParcelDelivery = (
  state: Readonly<ParcelDeliveryRunState>,
  route: Readonly<ParcelDeliveryRoute>,
  motion: Readonly<RunMotionState>,
  flight: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
  tuning: Readonly<RunMotionValues>,
): Readonly<ParcelDeliveryRunState> => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Parcel step time must be non-negative and finite.');
  }
  if (state.phase === 'delivered' || state.phase === 'missed' || elapsedSeconds === 0) {
    return state;
  }
  if (state.phase === 'carrying' && state.routeId !== route.id) {
    throw new RangeError('An active parcel cannot switch recipient routes.');
  }
  if (
    route.id.length === 0 ||
    !Number.isFinite(route.pickup.runDistance) ||
    !Number.isFinite(route.pickup.y) ||
    !Number.isFinite(route.recipient.runDistance) ||
    !Number.isFinite(route.recipient.y) ||
    route.recipient.runDistance <= route.pickup.runDistance ||
    !Number.isFinite(tuning.baseScrollSpeed) ||
    tuning.baseScrollSpeed < 0
  ) {
    throw new RangeError('Parcel route and scroll speed must be valid.');
  }

  const distance = motion.distance + tuning.baseScrollSpeed * elapsedSeconds;
  let pickedAt = 0;
  if (state.phase !== 'carrying') {
    if (
      distance + PROTOTYPE_PLAYER_COLLISION_EXTENTS.right <
      route.pickup.runDistance - PARCEL_PICKUP_HALF_SIZE
    ) {
      return state;
    }
    const pickup = getFirstPlayerContactSeconds(
      motion.distance,
      tuning.baseScrollSpeed,
      flight,
      makeHitbox(route.pickup, PARCEL_PICKUP_HALF_SIZE, PARCEL_PICKUP_HALF_SIZE),
      elapsedSeconds,
    );
    if (pickup === null) {
      const pickupPassed =
        distance >
        route.pickup.runDistance +
          PARCEL_PICKUP_HALF_SIZE +
          PROTOTYPE_PLAYER_COLLISION_EXTENTS.left;
      return pickupPassed
        ? Object.freeze({
            phase: 'missed',
            completedCount: state.completedCount,
            routeId: route.id,
          })
        : state;
    }
    pickedAt = pickup;
  }

  if (
    distance + PROTOTYPE_PLAYER_COLLISION_EXTENTS.right <
    route.recipient.runDistance - PARCEL_HANDOFF_HALF_WIDTH
  ) {
    return state.phase === 'carrying'
      ? state
      : Object.freeze({
          phase: 'carrying',
          completedCount: state.completedCount,
          routeId: route.id,
        });
  }

  const handoff = getFirstPlayerContactSeconds(
    motion.distance,
    tuning.baseScrollSpeed,
    flight,
    makeHitbox(route.recipient, PARCEL_HANDOFF_HALF_WIDTH, PARCEL_HANDOFF_HALF_HEIGHT),
    elapsedSeconds,
    pickedAt,
  );
  if (handoff !== null) {
    return Object.freeze({
      phase: 'delivered',
      completedCount: state.completedCount + 1,
      routeId: route.id,
    });
  }

  const recipientPassed =
    distance >
    route.recipient.runDistance +
      PARCEL_HANDOFF_HALF_WIDTH +
      PROTOTYPE_PLAYER_COLLISION_EXTENTS.left;
  if (!recipientPassed && state.phase === 'carrying') {
    return state;
  }
  return Object.freeze({
    phase: recipientPassed ? 'missed' : 'carrying',
    completedCount: state.completedCount,
    routeId: route.id,
  });
};
