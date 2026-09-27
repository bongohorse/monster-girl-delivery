import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import {
  createParcelDeliveryRunState,
  type ParcelDeliveryRunState,
  stepParcelDelivery,
} from '../../src/systems/ParcelDelivery';
import {
  createPrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';
import { createVerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';

const route = Object.freeze({
  id: 'first-delivery',
  pickup: Object.freeze({ runDistance: 200, y: 195 }),
  recipient: Object.freeze({ runDistance: 500, y: 195 }),
});
const flightTuning = Object.freeze({
  ...PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 0,
  maxRiseVelocity: 0,
});
const bounds = Object.freeze({ ceilingY: 0, floorY: 390 });

const advance = (state: Readonly<ParcelDeliveryRunState>, from: number, seconds: number, y = 195) =>
  stepParcelDelivery(
    state,
    route,
    { distance: from },
    createVerticalFlightTrajectory(
      { positionY: y, velocityY: 0 },
      seconds,
      false,
      flightTuning,
      bounds,
    ),
    seconds,
    { baseScrollSpeed: 100 },
  );

describe('one optional parcel in the Endless run', () => {
  it('is driven by the authoritative run simulation when a safe route is supplied', () => {
    const result = stepPrototypeRun(createPrototypeRunState(bounds), 6, {
      deliveryRoute: route,
      flightBounds: bounds,
      flightTuning,
      hazards: [],
      runMotionTuning: { baseScrollSpeed: 100 },
      thrustHeld: false,
    });

    expect(result.state.delivery).toMatchObject({ phase: 'delivered', completedCount: 1 });
    expect(result.state.motion.distance).toBe(600);
  });

  it('qualifies pickup and generous automatic handoff even when one step crosses both', () => {
    const completed = advance(createParcelDeliveryRunState(), 0, 6);

    expect(completed).toMatchObject({ phase: 'delivered', completedCount: 1 });
    expect(advance(completed, 600, 1)).toBe(completed);
  });

  it('has the same outcome across coarse and small frame steps', () => {
    let small = createParcelDeliveryRunState();
    for (let index = 0; index < 120; index += 1) {
      small = advance(small, index * 5, 0.05);
    }

    expect(small).toEqual(advance(createParcelDeliveryRunState(), 0, 6));
  });

  it('misses the recipient without a penalty and never awards a parcel merely for carrying it', () => {
    const collected = advance(createParcelDeliveryRunState(), 0, 2);
    expect(collected).toMatchObject({ phase: 'carrying', completedCount: 0 });

    const missed = advance(collected, 200, 4, 80);
    expect(missed).toMatchObject({ phase: 'missed', completedCount: 0 });
    expect(advance(missed, 600, 1)).toBe(missed);
  });

  it('hands off automatically when the courier rises into the marked recipient region', () => {
    const carrying = advance(createParcelDeliveryRunState(), 0, 3.5);
    const rising = createVerticalFlightTrajectory(
      { positionY: 320, velocityY: -100 },
      1.5,
      false,
      { ...flightTuning, maxRiseVelocity: 100 },
      bounds,
    );

    expect(
      stepParcelDelivery(carrying, route, { distance: 350 }, rising, 1.5, {
        baseScrollSpeed: 100,
      }),
    ).toMatchObject({ phase: 'delivered', completedCount: 1 });
  });

  it('does not collect a parcel on the wrong flight height or a paused frame', () => {
    const initial = createParcelDeliveryRunState();
    expect(advance(initial, 200, 0)).toBe(initial);
    expect(advance(initial, 0, 3, 0)).toMatchObject({ phase: 'missed', completedCount: 0 });
  });
});
