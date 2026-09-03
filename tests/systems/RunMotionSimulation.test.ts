import { describe, expect, it } from 'vitest';
import { PROTOTYPE_RUN_MOTION_DEFAULTS, RunMotionConfig } from '../../src/config/RunMotionConfig';
import { TimeService } from '../../src/core/TimeService';
import { type RunMotionState, stepRunMotion } from '../../src/systems/RunMotionSimulation';

const RUN_START: Readonly<RunMotionState> = Object.freeze({ distance: 0 });
const SUBDIVISION_TOLERANCE = 1e-9;

describe('stepRunMotion', () => {
  it('advances distance deterministically at the configured pixels-per-second rate', () => {
    const initial = { distance: 125 };
    const first = stepRunMotion(initial, 0.5, PROTOTYPE_RUN_MOTION_DEFAULTS);
    const repeated = stepRunMotion(initial, 0.5, PROTOTYPE_RUN_MOTION_DEFAULTS);

    expect(first).toEqual({ distance: 300 });
    expect(repeated).toEqual(first);
    expect(initial).toEqual({ distance: 125 });
  });

  it('does not advance on a zero-delta frame', () => {
    expect(stepRunMotion(RUN_START, 0, PROTOTYPE_RUN_MOTION_DEFAULTS)).toEqual(RUN_START);
  });

  it('does not advance when TimeService supplies a paused delta', () => {
    const time = new TimeService();
    time.pause();

    const pausedDeltaSeconds = time.update(16);

    expect(pausedDeltaSeconds).toBe(0);
    expect(stepRunMotion(RUN_START, pausedDeltaSeconds, PROTOTYPE_RUN_MOTION_DEFAULTS)).toEqual(
      RUN_START,
    );
  });

  it('stays consistent across practical timestep subdivisions', () => {
    const initial = { distance: 80 };
    const singleStep = stepRunMotion(initial, 1.25, PROTOTYPE_RUN_MOTION_DEFAULTS);
    let subdivided = initial;

    for (let frame = 0; frame < 75; frame += 1) {
      subdivided = stepRunMotion(subdivided, 1 / 60, PROTOTYPE_RUN_MOTION_DEFAULTS);
    }

    expect(Math.abs(subdivided.distance - singleStep.distance)).toBeLessThanOrEqual(
      SUBDIVISION_TOLERANCE,
    );
  });

  it('uses live configuration changes on subsequent steps without resetting distance', () => {
    const tuning = new RunMotionConfig();
    const first = stepRunMotion(RUN_START, 0.1, tuning.getSnapshot());

    tuning.update({ baseScrollSpeed: 500 });
    const second = stepRunMotion(first, 0.1, tuning.getSnapshot());

    expect(first).toEqual({ distance: 35 });
    expect(second).toEqual({ distance: 85 });
  });

  it('rejects elapsed values outside the TimeService boundary contract', () => {
    const invalidElapsedValues = [
      -0.1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];

    for (const elapsedSeconds of invalidElapsedValues) {
      expect(() => stepRunMotion(RUN_START, elapsedSeconds, PROTOTYPE_RUN_MOTION_DEFAULTS)).toThrow(
        RangeError,
      );
    }
  });
});
