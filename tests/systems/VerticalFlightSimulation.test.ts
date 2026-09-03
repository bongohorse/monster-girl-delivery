import { describe, expect, it } from 'vitest';
import {
  FlightTuningConfig,
  PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
} from '../../src/config/FlightTuningConfig';
import {
  stepVerticalFlight,
  type VerticalFlightBounds,
  type VerticalFlightState,
} from '../../src/systems/VerticalFlightSimulation';

const AT_REST: Readonly<VerticalFlightState> = Object.freeze({ positionY: 0, velocityY: 0 });
const UNRESTRICTIVE_BOUNDS: Readonly<VerticalFlightBounds> = Object.freeze({
  ceilingY: -10_000,
  floorY: 10_000,
});
const SUBDIVISION_TOLERANCE = 1e-9;

describe('stepVerticalFlight', () => {
  it('applies upward thrust and continuous downward gravity while held', () => {
    const result = stepVerticalFlight(
      AT_REST,
      0.1,
      true,
      PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
      UNRESTRICTIVE_BOUNDS,
    );

    expect(result).toEqual({ positionY: -4, velocityY: -80 });
  });

  it('removes thrust acceleration while released but keeps downward gravity', () => {
    const result = stepVerticalFlight(
      AT_REST,
      0.1,
      false,
      PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
      UNRESTRICTIVE_BOUNDS,
    );

    expect(result).toEqual({ positionY: 7, velocityY: 140 });
  });

  it('caps upward velocity and integrates the time spent at the rise limit', () => {
    const result = stepVerticalFlight(
      AT_REST,
      1,
      true,
      PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
      UNRESTRICTIVE_BOUNDS,
    );

    expect(result.velocityY).toBe(-550);
    expect(result.positionY).toBeCloseTo(-360.9375, 10);
  });

  it('caps downward velocity and integrates the time spent at the fall limit', () => {
    const result = stepVerticalFlight(
      AT_REST,
      1,
      false,
      PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
      UNRESTRICTIVE_BOUNDS,
    );

    expect(result.velocityY).toBe(650);
    expect(result.positionY).toBeCloseTo(499.107_142_857_1, 10);
  });

  it('does not change position or velocity when elapsed time is zero', () => {
    const initial = { positionY: 120, velocityY: -900 };

    expect(
      stepVerticalFlight(initial, 0, true, PROTOTYPE_FLIGHT_TUNING_DEFAULTS, UNRESTRICTIVE_BOUNDS),
    ).toEqual(initial);
  });

  it('uses runtime tuning changes on subsequent steps', () => {
    const tuning = new FlightTuningConfig();
    const first = stepVerticalFlight(
      AT_REST,
      0.1,
      true,
      tuning.getSnapshot(),
      UNRESTRICTIVE_BOUNDS,
    );

    tuning.update({ gravity: 1_000, thrust: 1_000 });
    const second = stepVerticalFlight(first, 0.1, true, tuning.getSnapshot(), UNRESTRICTIVE_BOUNDS);

    expect(first).toEqual({ positionY: -4, velocityY: -80 });
    expect(second).toEqual({ positionY: -12, velocityY: -80 });
  });

  it('stays consistent across practical timestep subdivisions', () => {
    const initial = { positionY: 250, velocityY: 100 };
    const singleStep = stepVerticalFlight(
      initial,
      1.25,
      true,
      PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
      UNRESTRICTIVE_BOUNDS,
    );
    let subdivided = initial;

    for (let frame = 0; frame < 75; frame += 1) {
      subdivided = stepVerticalFlight(
        subdivided,
        1 / 60,
        true,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        UNRESTRICTIVE_BOUNDS,
      );
    }

    expect(Math.abs(subdivided.positionY - singleStep.positionY)).toBeLessThanOrEqual(
      SUBDIVISION_TOLERANCE,
    );
    expect(Math.abs(subdivided.velocityY - singleStep.velocityY)).toBeLessThanOrEqual(
      SUBDIVISION_TOLERANCE,
    );
  });

  it('uses the full supplied elapsed time without applying another delta clamp', () => {
    const result = stepVerticalFlight(
      AT_REST,
      0.2,
      false,
      PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
      UNRESTRICTIVE_BOUNDS,
    );

    expect(result).toEqual({ positionY: 28, velocityY: 280 });
  });

  it('rejects elapsed values outside the TimeService boundary contract', () => {
    const invalidElapsedValues = [
      -0.1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];

    for (const elapsedSeconds of invalidElapsedValues) {
      expect(() =>
        stepVerticalFlight(
          AT_REST,
          elapsedSeconds,
          false,
          PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
          UNRESTRICTIVE_BOUNDS,
        ),
      ).toThrow(RangeError);
    }
  });

  describe('safe bounds', () => {
    const bounds: Readonly<VerticalFlightBounds> = Object.freeze({
      ceilingY: 100,
      floorY: 500,
    });

    it('holds at the ceiling without accumulating upward velocity', () => {
      const result = stepVerticalFlight(
        { positionY: bounds.ceilingY, velocityY: 0 },
        0.1,
        true,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );

      expect(result).toEqual({ positionY: bounds.ceilingY, velocityY: 0 });
    });

    it('holds at the floor without accumulating downward velocity', () => {
      const result = stepVerticalFlight(
        { positionY: bounds.floorY, velocityY: 0 },
        0.1,
        false,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );

      expect(result).toEqual({ positionY: bounds.floorY, velocityY: 0 });
    });

    it.each([
      {
        name: 'ceiling',
        initial: { positionY: 120, velocityY: -400 },
        thrustHeld: true,
        expectedPositionY: bounds.ceilingY,
      },
      {
        name: 'floor',
        initial: { positionY: 480, velocityY: 400 },
        thrustHeld: false,
        expectedPositionY: bounds.floorY,
      },
    ])(
      'resolves $name overshoot deterministically',
      ({ initial, thrustHeld, expectedPositionY }) => {
        const result = stepVerticalFlight(
          initial,
          0.1,
          thrustHeld,
          PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
          bounds,
        );

        expect(result).toEqual({ positionY: expectedPositionY, velocityY: 0 });
      },
    );

    it.each([
      { positionY: bounds.ceilingY, velocityY: -300, thrustHeld: true },
      { positionY: bounds.floorY, velocityY: 300, thrustHeld: false },
    ])('clears velocity that points out of bounds', (initial) => {
      const result = stepVerticalFlight(
        initial,
        0.1,
        initial.thrustHeld,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );

      expect(result).toEqual({ positionY: initial.positionY, velocityY: 0 });
    });

    it.each([
      {
        name: 'ceiling',
        initial: { positionY: bounds.ceilingY, velocityY: -300 },
        thrustHeld: false,
        expected: { positionY: 107, velocityY: 140 },
      },
      {
        name: 'floor',
        initial: { positionY: bounds.floorY, velocityY: 300 },
        thrustHeld: true,
        expected: { positionY: 496, velocityY: -80 },
      },
    ])('allows immediate movement away from the $name', ({ initial, thrustHeld, expected }) => {
      const result = stepVerticalFlight(
        initial,
        0.1,
        thrustHeld,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );

      expect(result).toEqual(expected);
    });

    it('applies changed bounds to the next step without retaining hidden boundary state', () => {
      const first = stepVerticalFlight(
        { positionY: 250, velocityY: 0 },
        0.1,
        false,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );
      const changedBounds = { ceilingY: 300, floorY: 450 };
      const second = stepVerticalFlight(
        first,
        0.1,
        false,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        changedBounds,
      );

      expect(first).toEqual({ positionY: 257, velocityY: 140 });
      expect(second).toEqual({ positionY: 321, velocityY: 280 });
    });

    it('rejects non-finite or inverted bounds and accepts a zero-height safe range', () => {
      const invalidBounds = [
        { ceilingY: Number.NaN, floorY: 500 },
        { ceilingY: 100, floorY: Number.POSITIVE_INFINITY },
        { ceilingY: Number.NEGATIVE_INFINITY, floorY: 500 },
        { ceilingY: 501, floorY: 500 },
      ];

      for (const invalid of invalidBounds) {
        expect(() =>
          stepVerticalFlight(AT_REST, 0.1, false, PROTOTYPE_FLIGHT_TUNING_DEFAULTS, invalid),
        ).toThrow(RangeError);
      }

      expect(
        stepVerticalFlight(
          { positionY: 250, velocityY: 100 },
          0.1,
          false,
          PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
          { ceilingY: 200, floorY: 200 },
        ),
      ).toEqual({ positionY: 200, velocityY: 0 });
    });
  });
});
