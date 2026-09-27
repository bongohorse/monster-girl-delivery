import type { ParcelDeliveryRoute } from '../systems/ParcelDelivery';
import type { VerticalFlightBounds } from '../systems/VerticalFlightSimulation';

/** One reproducible route for the first playable delivery slice. */
export const FIRST_DELIVERY_PROTECTED_INTERVAL = Object.freeze({ start: 1_050, end: 2_650 });

export const createFirstDeliveryRoute = (
  bounds: Readonly<VerticalFlightBounds>,
): Readonly<ParcelDeliveryRoute> => {
  const centerY = (bounds.ceilingY + bounds.floorY) / 2;
  return Object.freeze({
    id: 'first-delivery',
    pickup: Object.freeze({ runDistance: 1_600, y: centerY }),
    recipient: Object.freeze({
      runDistance: 2_400,
      y: Math.max(bounds.ceilingY + 72, centerY - 80),
    }),
  });
};
