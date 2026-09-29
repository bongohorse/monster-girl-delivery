import { PROTOTYPE_DELIVERY_TUNING } from '../config/DeliveryTuning';
import type { ParcelDeliveryRoute } from '../systems/ParcelDelivery';
import type { VerticalFlightBounds } from '../systems/VerticalFlightSimulation';

const {
  firstPickupDistance,
  pickupToDropDistance,
  routeRepeatDistance,
  pickupSafeBefore,
  pickupSafeAfter,
  dropSafeBefore,
  dropSafeAfter,
} = PROTOTYPE_DELIVERY_TUNING;
const firstDropDistance = firstPickupDistance + pickupToDropDistance;

/** Pickup and handoff are protected separately so the long carry still has encounters. */
export const FIRST_DELIVERY_PROTECTED_INTERVAL = Object.freeze({
  start: firstPickupDistance - pickupSafeBefore,
  end: firstPickupDistance + pickupSafeAfter,
  repeatDistance: routeRepeatDistance,
});
export const FIRST_DELIVERY_PROTECTED_INTERVALS = Object.freeze([
  FIRST_DELIVERY_PROTECTED_INTERVAL,
  Object.freeze({
    start: firstDropDistance - dropSafeBefore,
    end: firstDropDistance + dropSafeAfter,
    repeatDistance: routeRepeatDistance,
  }),
]);

export const createFirstDeliveryRoute = (
  bounds: Readonly<VerticalFlightBounds>,
  routeIndex = 0,
): Readonly<ParcelDeliveryRoute> => {
  if (!Number.isSafeInteger(routeIndex) || routeIndex < 0) {
    throw new RangeError('Delivery route index must be a non-negative safe integer.');
  }
  const centerY = (bounds.ceilingY + bounds.floorY) / 2;
  const offset = routeIndex * routeRepeatDistance;
  return Object.freeze({
    id: routeIndex === 0 ? 'first-delivery' : `delivery-${routeIndex + 1}`,
    pickup: Object.freeze({ runDistance: firstPickupDistance + offset, y: centerY }),
    recipient: Object.freeze({
      runDistance: firstDropDistance + offset,
      y: Math.max(bounds.ceilingY + 72, centerY - 80),
    }),
  });
};
