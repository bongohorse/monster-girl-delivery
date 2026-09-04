/**
 * Vertical flight values use Phaser's screen-space convention where positive Y is downward.
 * Acceleration and velocity fields are non-negative directional magnitudes.
 */
export interface FlightTuningValues {
  /** Downward acceleration magnitude in pixels per second squared. */
  gravity: number;
  /** Upward acceleration magnitude in pixels per second squared. */
  thrust: number;
  /** Maximum downward speed magnitude in pixels per second. */
  maxFallVelocity: number;
  /** Maximum upward speed magnitude in pixels per second. */
  maxRiseVelocity: number;
}

export type FlightTuningUpdate = Partial<FlightTuningValues>;

/** Prototype starting values only; they must remain adjustable through playtesting. */
export const PROTOTYPE_FLIGHT_TUNING_DEFAULTS: Readonly<FlightTuningValues> = Object.freeze({
  gravity: 1_400,
  thrust: 2_200,
  maxFallVelocity: 650,
  maxRiseVelocity: 550,
});

const FLIGHT_TUNING_KEYS = [
  'gravity',
  'thrust',
  'maxFallVelocity',
  'maxRiseVelocity',
] as const satisfies readonly (keyof FlightTuningValues)[];

const assertValidMagnitude: (
  key: keyof FlightTuningValues,
  value: unknown,
) => asserts value is number = (key, value) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${key} must be a non-negative finite number.`);
  }
};

export const assertValidFlightTuningValues = (values: Readonly<FlightTuningValues>): void => {
  for (const key of FLIGHT_TUNING_KEYS) {
    assertValidMagnitude(key, values[key]);
  }
};

/** Owns the live M1 flight tuning state shared by gameplay and Director tools. */
export class FlightTuningConfig {
  private values: FlightTuningValues = { ...PROTOTYPE_FLIGHT_TUNING_DEFAULTS };

  update(update: FlightTuningUpdate): void {
    const nextValues = { ...this.values };

    for (const key of FLIGHT_TUNING_KEYS) {
      if (!(key in update)) {
        continue;
      }

      const value = update[key];
      assertValidMagnitude(key, value);
      nextValues[key] = value;
    }

    this.values = nextValues;
  }

  getSnapshot(): Readonly<FlightTuningValues> {
    return Object.freeze({ ...this.values });
  }
}
