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
  gravity: 1_600,
  thrust: 2_600,
  maxFallVelocity: 700,
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
  private snapshot: Readonly<FlightTuningValues> = PROTOTYPE_FLIGHT_TUNING_DEFAULTS;

  update(update: FlightTuningUpdate): void {
    let changed = false;

    for (const key of FLIGHT_TUNING_KEYS) {
      if (!(key in update)) {
        continue;
      }

      const value = update[key];
      assertValidMagnitude(key, value);
      if (value !== this.snapshot[key]) {
        changed = true;
      }
    }

    if (!changed) {
      return;
    }

    const nextValues: FlightTuningValues = { ...this.snapshot };
    for (const key of FLIGHT_TUNING_KEYS) {
      if (key in update) {
        nextValues[key] = update[key] as number;
      }
    }
    this.snapshot = Object.freeze(nextValues);
  }

  getSnapshot(): Readonly<FlightTuningValues> {
    return this.snapshot;
  }
}
