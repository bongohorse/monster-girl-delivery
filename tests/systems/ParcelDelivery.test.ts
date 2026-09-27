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
  it('allows a later route after a delivery and accumulates both rewards', () => {
    const secondRoute = {
      id: 'second-delivery',
      pickup: { runDistance: 800, y: 195 },
      recipient: { runDistance: 1_100, y: 195 },
    };
    const first = stepPrototypeRun(createPrototypeRunState(bounds), 6, {
      deliveryRoute: route,
      flightBounds: bounds,
      flightTuning,
      hazards: [],
      runMotionTuning: { baseScrollSpeed: 100 },
      thrustHeld: false,
    }).state;
    const second = stepPrototypeRun(first, 6, {
      deliveryRoute: secondRoute,
      flightBounds: bounds,
      flightTuning,
      hazards: [],
      runMotionTuning: { baseScrollSpeed: 100 },
      thrustHeld: false,
    }).state;

    expect(second.delivery).toMatchObject({ phase: 'delivered', completedCount: 2 });
    const dead = stepPrototypeRun(second, 0, {
      flightBounds: bounds,
      flightTuning,
      hazards: [{ hitbox: { left: 1_200, right: 1_220, top: 175, bottom: 215 } }],
      runMotionTuning: { baseScrollSpeed: 100 },
      thrustHeld: false,
    }).state;
    expect(dead.finalResult).toMatchObject({ deliveryCount: 2, deliveryReward: 250 });
  });

  it('offers a later delivery after a missed pickup without counting the miss', () => {
    const missed = advance(createParcelDeliveryRunState(), 0, 6, 340);
    expect(missed).toMatchObject({ phase: 'missed', completedCount: 0 });

    const laterRoute = {
      id: 'second-delivery',
      pickup: { runDistance: 800, y: 195 },
      recipient: { runDistance: 1_100, y: 195 },
    };
    const delivered = stepParcelDelivery(
      missed,
      laterRoute,
      { distance: 600 },
      createVerticalFlightTrajectory(
        { positionY: 195, velocityY: 0 },
        6,
        false,
        flightTuning,
        bounds,
      ),
      6,
      { baseScrollSpeed: 100 },
    );
    expect(delivered).toMatchObject({ phase: 'delivered', completedCount: 1 });
  });

  it('adds 100 bonus coins at death after a completed handoff, without changing meters', () => {
    const delivered = stepPrototypeRun(createPrototypeRunState(bounds), 6, {
      deliveryRoute: route,
      flightBounds: bounds,
      flightTuning,
      hazards: [],
      runMotionTuning: { baseScrollSpeed: 100 },
      thrustHeld: false,
    }).state;
    const dead = stepPrototypeRun(delivered, 0, {
      flightBounds: bounds,
      flightTuning,
      hazards: [{ hitbox: { left: 600, right: 620, top: 175, bottom: 215 } }],
      runMotionTuning: { baseScrollSpeed: 100 },
      thrustHeld: false,
    }).state;

    expect(dead.finalResult).toMatchObject({
      deliveryCount: 1,
      deliveryReward: 100,
      earnedReward: 100,
      finalDistance: 600,
      score: 600,
    });
  });

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

  it('awards nothing for a package still being carried when the run ends', () => {
    const pickedUp = stepPrototypeRun(createPrototypeRunState(bounds), 3, {
      deliveryRoute: route,
      flightBounds: bounds,
      flightTuning,
      hazards: [],
      runMotionTuning: { baseScrollSpeed: 100 },
      thrustHeld: false,
    }).state;
    expect(pickedUp.delivery?.phase).toBe('carrying');
    const death = stepPrototypeRun(pickedUp, 0, {
      flightBounds: bounds,
      flightTuning,
      hazards: [{ hitbox: { left: 300, right: 320, top: 175, bottom: 215 } }],
      runMotionTuning: { baseScrollSpeed: 100 },
      thrustHeld: false,
    });
    expect(death.state.finalResult).toMatchObject({
      deliveryCount: 0,
      deliveryReward: 0,
      earnedReward: 0,
    });
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
