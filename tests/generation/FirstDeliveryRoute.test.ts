import { describe, expect, it } from 'vitest';
import {
  createFirstDeliveryRoute,
  FIRST_DELIVERY_PROTECTED_INTERVAL,
} from '../../src/generation/FirstDeliveryRoute';

describe('spaced parcel routes', () => {
  it('keeps the first handoff and spaces later pickups by a full route interval', () => {
    const bounds = { ceilingY: 28, floorY: 362 };
    const first = createFirstDeliveryRoute(bounds);
    const second = createFirstDeliveryRoute(bounds, 1);
    expect(first).toMatchObject({
      id: 'first-delivery',
      pickup: { runDistance: 1_600 },
      recipient: { runDistance: 2_400 },
    });
    expect(second.id).not.toBe(first.id);
    expect(second.pickup.runDistance - first.pickup.runDistance).toBeGreaterThan(3_000);
    expect(second.recipient.runDistance - second.pickup.runDistance).toBe(800);
    expect(FIRST_DELIVERY_PROTECTED_INTERVAL.repeatDistance).toBe(
      second.pickup.runDistance - first.pickup.runDistance,
    );
  });
});
