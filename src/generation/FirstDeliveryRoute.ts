import type { ParcelDeliveryRoute } from '../systems/ParcelDelivery';
import type { VerticalFlightBounds } from '../systems/VerticalFlightSimulation';

/** Provisional repeatable route spacing: the pickup arrives well after the previous handoff. */
export const FIRST_DELIVERY_PROTECTED_INTERVAL = Object.freeze({
  start: 1_050,
  end: 2_650,
  repeatDistance: 4_400,
});

export const createFirstDeliveryRoute = (
  bounds: Readonly<VerticalFlightBounds>,
  routeIndex = 0,
): Readonly<ParcelDeliveryRoute> => {
  if (!Number.isSafeInteger(routeIndex) || routeIndex < 0) {
    throw new RangeError('Delivery route index must be a non-negative safe integer.');
  }
  const centerY = (bounds.ceilingY + bounds.floorY) / 2;
  const offset = routeIndex * FIRST_DELIVERY_PROTECTED_INTERVAL.repeatDistance;
  return Object.freeze({
    id: routeIndex === 0 ? 'first-delivery' : `delivery-${routeIndex + 1}`,
    pickup: Object.freeze({ runDistance: 1_600 + offset, y: centerY }),
    recipient: Object.freeze({
      runDistance: 2_400 + offset,
      y: Math.max(bounds.ceilingY + 72, centerY - 80),
    }),
  });
};
