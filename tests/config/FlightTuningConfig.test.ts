import { describe, expect, it } from 'vitest';
import {
  FlightTuningConfig,
  type FlightTuningUpdate,
  type FlightTuningValues,
  PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
} from '../../src/config/FlightTuningConfig';
import { createAppServices } from '../../src/core/AppServices';

describe('FlightTuningConfig', () => {
  it('starts with the documented prototype values', () => {
    const config = new FlightTuningConfig();

    expect(PROTOTYPE_FLIGHT_TUNING_DEFAULTS).toEqual({
      gravity: 1_400,
      thrust: 2_200,
      maxFallVelocity: 650,
      maxRiseVelocity: 550,
    });
    expect(config.getSnapshot()).toEqual(PROTOTYPE_FLIGHT_TUNING_DEFAULTS);
  });

  it('applies valid partial updates to the shared application configuration', () => {
    const services = createAppServices();
    const sharedConfig = services.flightTuning;

    sharedConfig.update({ gravity: 1_600, maxRiseVelocity: 600 });
    sharedConfig.update({ thrust: 0, maxFallVelocity: 0 });

    expect(services.flightTuning).toBe(sharedConfig);
    expect(services.flightTuning.getSnapshot()).toEqual({
      gravity: 1_600,
      thrust: 0,
      maxFallVelocity: 0,
      maxRiseVelocity: 600,
    });
  });

  it('rejects invalid and non-finite magnitudes without changing state', () => {
    const keys: readonly (keyof FlightTuningValues)[] = [
      'gravity',
      'thrust',
      'maxFallVelocity',
      'maxRiseVelocity',
    ];
    const invalidValues = [
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      undefined,
    ];

    for (const key of keys) {
      for (const value of invalidValues) {
        const config = new FlightTuningConfig();
        const update: FlightTuningUpdate = {};
        update[key] = value;

        expect(() => config.update(update)).toThrow(RangeError);
        expect(config.getSnapshot()).toEqual(PROTOTYPE_FLIGHT_TUNING_DEFAULTS);
      }
    }
  });

  it('applies updates atomically when one field is invalid', () => {
    const config = new FlightTuningConfig();

    expect(() => config.update({ gravity: 1_800, thrust: Number.NaN })).toThrow(RangeError);
    expect(config.getSnapshot()).toEqual(PROTOTYPE_FLIGHT_TUNING_DEFAULTS);
  });

  it('returns immutable snapshots that do not share mutable state', () => {
    const config = new FlightTuningConfig();
    const original = config.getSnapshot();

    expect(Object.isFrozen(original)).toBe(true);
    expect(Reflect.set(original, 'gravity', 999)).toBe(false);

    config.update({ gravity: 1_500 });
    const updated = config.getSnapshot();

    expect(original.gravity).toBe(1_400);
    expect(updated.gravity).toBe(1_500);
    expect(updated).not.toBe(original);
  });
});
