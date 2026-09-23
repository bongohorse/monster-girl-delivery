import { describe, expect, it } from 'vitest';
import { TimeService } from '../../src/core/TimeService';

describe('TimeService', () => {
  it('normalizes milliseconds to seconds and clamps large deltas', () => {
    const time = new TimeService({ maxDeltaSeconds: 0.04, frameClockMilliseconds: null });

    expect(time.update(16)).toBeCloseTo(0.016);
    expect(time.update(250)).toBe(0.04);
  });

  it('rejects invalid frame deltas', () => {
    const time = new TimeService({ frameClockMilliseconds: null });

    expect(time.update(-10)).toBe(0);
    expect(time.update(Number.NaN)).toBe(0);
  });

  it('uses elapsed wall-clock time after the first browser frame instead of a distorted engine delta', () => {
    let nowMilliseconds = 1_000;
    const time = new TimeService({ frameClockMilliseconds: () => nowMilliseconds });

    expect(time.update(16)).toBeCloseTo(0.016);

    nowMilliseconds += 1000 / 60;
    expect(time.update(33.5)).toBeCloseTo(1 / 60, 9);

    nowMilliseconds += 1000 / 30;
    expect(time.update(49.9)).toBeCloseTo(1 / 30, 9);
  });

  it('does not count a frame-clock remainder twice when engine limiter deltas overlap', () => {
    let nowMilliseconds = 0;
    const time = new TimeService({ frameClockMilliseconds: () => nowMilliseconds });
    let simulatedSeconds = time.update(0);

    for (const engineDeltaMilliseconds of [30.8, 28.3, 25.0, 21.7, 18.3, 31.7]) {
      nowMilliseconds += 1000 / 60;
      simulatedSeconds += time.update(engineDeltaMilliseconds);
    }

    expect(simulatedSeconds).toBeCloseTo(0.1, 9);
  });

  it('returns zero while paused and discards the first delta after resume', () => {
    const time = new TimeService({ frameClockMilliseconds: null });

    time.update(16);
    time.pause();
    expect(time.isPaused()).toBe(true);
    expect(time.getDeltaSeconds()).toBe(0);
    expect(time.update(5_000)).toBe(0);

    time.resume();
    expect(time.isPaused()).toBe(false);
    expect(time.update(5_000)).toBe(0);
    expect(time.update(16)).toBeCloseTo(0.016);
  });

  it('resets the wall-clock baseline across pause/resume so background time cannot leak in', () => {
    let nowMilliseconds = 100;
    const time = new TimeService({ frameClockMilliseconds: () => nowMilliseconds });

    time.update(16);
    nowMilliseconds = 116;
    expect(time.update(16)).toBeCloseTo(0.016);

    time.pause();
    nowMilliseconds = 10_000;
    expect(time.update(9_884)).toBe(0);

    time.resume();
    nowMilliseconds = 10_016;
    expect(time.update(16)).toBe(0);

    nowMilliseconds = 10_032;
    expect(time.update(500)).toBeCloseTo(0.016);
  });

  it('requires a positive finite clamp', () => {
    expect(() => new TimeService({ maxDeltaSeconds: 0 })).toThrow(RangeError);
    expect(() => new TimeService({ maxDeltaSeconds: Number.POSITIVE_INFINITY })).toThrow(
      RangeError,
    );
  });
});
