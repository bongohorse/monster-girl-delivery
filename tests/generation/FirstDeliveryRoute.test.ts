import { describe, expect, it } from 'vitest';
import {
  createFirstDeliveryRoute,
  FIRST_DELIVERY_PROTECTED_INTERVAL,
  FIRST_DELIVERY_PROTECTED_INTERVALS,
} from '../../src/generation/FirstDeliveryRoute';

describe('spaced parcel routes', () => {
  it('keeps the first handoff and spaces later pickups by a full route interval', () => {
    const bounds = { ceilingY: 28, floorY: 362 };
    const first = createFirstDeliveryRoute(bounds);
    const second = createFirstDeliveryRoute(bounds, 1);
    expect(first).toMatchObject({
      id: 'first-delivery',
      pickup: { runDistance: 1_600 },
      recipient: { runDistance: 3_200 },
    });
    expect(second.id).not.toBe(first.id);
    expect(second.pickup.runDistance - first.pickup.runDistance).toBeGreaterThan(3_000);
    expect(second.recipient.runDistance - second.pickup.runDistance).toBe(1_600);
    expect(FIRST_DELIVERY_PROTECTED_INTERVAL.repeatDistance).toBe(
      second.pickup.runDistance - first.pickup.runDistance,
    );
    expect(FIRST_DELIVERY_PROTECTED_INTERVALS).toMatchObject([
      { start: 1_250, end: 1_750 },
      { start: 2_600, end: 3_450 },
    ]);
  });
});
