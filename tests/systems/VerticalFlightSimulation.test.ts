import { describe, expect, it } from 'vitest';
import {
  FlightTuningConfig,
  PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
} from '../../src/config/FlightTuningConfig';
import {
  stepVerticalFlight,
  type VerticalFlightState,
} from '../../src/systems/VerticalFlightSimulation';

const AT_REST: Readonly<VerticalFlightState> = Object.freeze({ positionY: 0, velocityY: 0 });
const SUBDIVISION_TOLERANCE = 1e-9;

describe('stepVerticalFlight', () => {
  it('applies upward thrust and continuous downward gravity while held', () => {
    const result = stepVerticalFlight(AT_REST, 0.1, true, PROTOTYPE_FLIGHT_TUNING_DEFAULTS);

    expect(result).toEqual({ positionY: -4, velocityY: -80 });
  });

  it('removes thrust acceleration while released but keeps downward gravity', () => {
    const result = stepVerticalFlight(AT_REST, 0.1, false, PROTOTYPE_FLIGHT_TUNING_DEFAULTS);

    expect(result).toEqual({ positionY: 7, velocityY: 140 });
  });

  it('caps upward velocity and integrates the time spent at the rise limit', () => {
    const result = stepVerticalFlight(AT_REST, 1, true, PROTOTYPE_FLIGHT_TUNING_DEFAULTS);

    expect(result.velocityY).toBe(-550);
    expect(result.positionY).toBeCloseTo(-360.9375, 10);
  });

  it('caps downward velocity and integrates the time spent at the fall limit', () => {
    const result = stepVerticalFlight(AT_REST, 1, false, PROTOTYPE_FLIGHT_TUNING_DEFAULTS);

    expect(result.velocityY).toBe(650);
    expect(result.positionY).toBeCloseTo(499.107_142_857_1, 10);
  });

  it('does not change position or velocity when elapsed time is zero', () => {
    const initial = { positionY: 120, velocityY: -900 };

    expect(stepVerticalFlight(initial, 0, true, PROTOTYPE_FLIGHT_TUNING_DEFAULTS)).toEqual(initial);
  });

  it('uses runtime tuning changes on subsequent steps', () => {
    const tuning = new FlightTuningConfig();
    const first = stepVerticalFlight(AT_REST, 0.1, true, tuning.getSnapshot());

    tuning.update({ gravity: 1_000, thrust: 1_000 });
    const second = stepVerticalFlight(first, 0.1, true, tuning.getSnapshot());

    expect(first).toEqual({ positionY: -4, velocityY: -80 });
    expect(second).toEqual({ positionY: -12, velocityY: -80 });
  });

  it('stays consistent across practical timestep subdivisions', () => {
    const initial = { positionY: 250, velocityY: 100 };
    const singleStep = stepVerticalFlight(initial, 1.25, true, PROTOTYPE_FLIGHT_TUNING_DEFAULTS);
    let subdivided = initial;

    for (let frame = 0; frame < 75; frame += 1) {
      subdivided = stepVerticalFlight(subdivided, 1 / 60, true, PROTOTYPE_FLIGHT_TUNING_DEFAULTS);
    }

    expect(Math.abs(subdivided.positionY - singleStep.positionY)).toBeLessThanOrEqual(
      SUBDIVISION_TOLERANCE,
    );
    expect(Math.abs(subdivided.velocityY - singleStep.velocityY)).toBeLessThanOrEqual(
      SUBDIVISION_TOLERANCE,
    );
  });

  it('uses the full supplied elapsed time without applying another delta clamp', () => {
    const result = stepVerticalFlight(AT_REST, 0.2, false, PROTOTYPE_FLIGHT_TUNING_DEFAULTS);

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
        stepVerticalFlight(AT_REST, elapsedSeconds, false, PROTOTYPE_FLIGHT_TUNING_DEFAULTS),
      ).toThrow(RangeError);
    }
  });
});
