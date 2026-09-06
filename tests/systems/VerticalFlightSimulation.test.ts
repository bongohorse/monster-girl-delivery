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

const stepInEqualPartitions = (
  initial: Readonly<VerticalFlightState>,
  elapsedSeconds: number,
  partitionCount: number,
  thrustHeld: boolean,
  bounds: Readonly<VerticalFlightBounds>,
): VerticalFlightState => {
  let state = initial;
  const partitionSeconds = elapsedSeconds / partitionCount;

  for (let partition = 0; partition < partitionCount; partition += 1) {
    state = stepVerticalFlight(
      state,
      partitionSeconds,
      thrustHeld,
      PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
      bounds,
    );
  }

  return state;
};

const expectFlightStateClose = (
  actual: Readonly<VerticalFlightState>,
  expected: Readonly<VerticalFlightState>,
): void => {
  expect(Math.abs(actual.positionY - expected.positionY)).toBeLessThanOrEqual(
    SUBDIVISION_TOLERANCE,
  );
  expect(Math.abs(actual.velocityY - expected.velocityY)).toBeLessThanOrEqual(
    SUBDIVISION_TOLERANCE,
  );
};

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

  it('preserves the no-boundary analytical trajectory across practical subdivisions', () => {
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

    it('resolves ceiling contact inside a coarse step even when free flight returns in bounds', () => {
      const initial = { positionY: 100.01, velocityY: -20 };
      const coarse = stepVerticalFlight(
        initial,
        0.05,
        false,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );
      const fine = stepInEqualPartitions(initial, 0.05, 1_000, false, bounds);

      expect(coarse.positionY).toBeCloseTo(101.714_546_482_928, 10);
      expect(coarse.velocityY).toBeCloseTo(69.287_301_521_986, 10);
      expectFlightStateClose(coarse, fine);
    });

    it('resolves floor contact inside a coarse step and processes the remaining time', () => {
      const initial = { positionY: 480, velocityY: 400 };
      const coarse = stepVerticalFlight(
        initial,
        0.1,
        true,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );
      const fine = stepInEqualPartitions(initial, 0.1, 100, true, bounds);

      expect(coarse.positionY).toBeCloseTo(499.108_350_559_987, 10);
      expect(coarse.velocityY).toBeCloseTo(-37.770_876_399_966, 10);
      expectFlightStateClose(coarse, fine);
    });

    it('keeps release after constrained ceiling contact partition-independent', () => {
      const initial = { positionY: 195, velocityY: 0 };
      const coarseAtCeiling = stepVerticalFlight(
        initial,
        0.8,
        true,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );
      const fineAtCeiling = stepInEqualPartitions(initial, 0.8, 160, true, bounds);
      const coarseReleased = stepVerticalFlight(
        coarseAtCeiling,
        0.2,
        false,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );
      const fineReleased = stepInEqualPartitions(fineAtCeiling, 0.2, 40, false, bounds);

      expect(coarseAtCeiling).toEqual({ positionY: bounds.ceilingY, velocityY: 0 });
      expectFlightStateClose(coarseAtCeiling, fineAtCeiling);
      expect(coarseReleased).toEqual({ positionY: 128, velocityY: 280 });
      expectFlightStateClose(coarseReleased, fineReleased);
    });

    it('keeps thrust after constrained floor contact partition-independent', () => {
      const initial = { positionY: 195, velocityY: 0 };
      const coarseAtFloor = stepVerticalFlight(
        initial,
        0.8,
        false,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );
      const fineAtFloor = stepInEqualPartitions(initial, 0.8, 160, false, bounds);
      const coarseThrust = stepVerticalFlight(
        coarseAtFloor,
        0.2,
        true,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );
      const fineThrust = stepInEqualPartitions(fineAtFloor, 0.2, 40, true, bounds);

      expect(coarseAtFloor).toEqual({ positionY: bounds.floorY, velocityY: 0 });
      expectFlightStateClose(coarseAtFloor, fineAtFloor);
      expect(coarseThrust).toEqual({ positionY: 484, velocityY: -160 });
      expectFlightStateClose(coarseThrust, fineThrust);
    });

    it('composes a fall-velocity-cap crossing with later floor contact', () => {
      const initial = { positionY: 450, velocityY: 640 };
      const coarse = stepVerticalFlight(
        initial,
        0.1,
        false,
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        bounds,
      );
      const fine = stepInEqualPartitions(initial, 0.1, 100, false, bounds);

      expect(coarse).toEqual({ positionY: bounds.floorY, velocityY: 0 });
      expectFlightStateClose(coarse, fine);
    });

    it.each([
      {
        caseBounds: bounds,
        elapsedSeconds: 0.011_869_159_199_991_264,
        initial: {
          positionY: 496.633_342_506_022_7,
          velocityY: 275.339_102_023_281_16,
        },
        partitionCount: 2,
      },
      {
        caseBounds: { ceilingY: 100, floorY: 362 },
        elapsedSeconds: 0.019_444_294_320_838_527,
        initial: {
          positionY: 361.419_226_643_826_85,
          velocityY: 16.257_568_611_763_418,
        },
        partitionCount: 2,
      },
      {
        caseBounds: { ceilingY: 28, floorY: 362 },
        elapsedSeconds: 0.029_276_177_095_249_295,
        initial: {
          positionY: 346.852_142_604_286_9,
          velocityY: 496.919_087_716_378_3,
        },
        partitionCount: 8,
      },
    ])(
      'canonicalizes exact end-of-step boundary contact across partitions',
      ({ caseBounds, initial, elapsedSeconds, partitionCount }) => {
        const singleStep = stepVerticalFlight(
          initial,
          elapsedSeconds,
          false,
          PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
          caseBounds,
        );
        const partitioned = stepInEqualPartitions(
          initial,
          elapsedSeconds,
          partitionCount,
          false,
          caseBounds,
        );

        expect(singleStep).toEqual({ positionY: caseBounds.floorY, velocityY: 0 });
        expect(partitioned).toEqual(singleStep);
      },
    );

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
