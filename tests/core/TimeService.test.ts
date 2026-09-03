import { describe, expect, it } from 'vitest';
import { TimeService } from '../../src/core/TimeService';

describe('TimeService', () => {
  it('normalizes milliseconds to seconds and clamps large deltas', () => {
    const time = new TimeService({ maxDeltaSeconds: 0.04 });

    expect(time.update(16)).toBeCloseTo(0.016);
    expect(time.update(250)).toBe(0.04);
  });

  it('rejects invalid frame deltas', () => {
    const time = new TimeService();

    expect(time.update(-10)).toBe(0);
    expect(time.update(Number.NaN)).toBe(0);
  });

  it('returns zero while paused and discards the first delta after resume', () => {
    const time = new TimeService();

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

  it('requires a positive finite clamp', () => {
    expect(() => new TimeService({ maxDeltaSeconds: 0 })).toThrow(RangeError);
    expect(() => new TimeService({ maxDeltaSeconds: Number.POSITIVE_INFINITY })).toThrow(
      RangeError,
    );
  });
});
