import { describe, expect, it } from 'vitest';
import { LifecycleService } from '../../src/core/LifecycleService';
import { TimeService } from '../../src/core/TimeService';
import { InputService } from '../../src/input/InputService';

describe('LifecycleService', () => {
  it('releases input and pauses simulation', () => {
    const time = new TimeService();
    const input = new InputService();
    const lifecycle = new LifecycleService(time, input);
    input.pressPointer(1, 'touch');

    lifecycle.pause('hidden');

    expect(time.isPaused()).toBe(true);
    expect(input.isThrustHeld()).toBe(false);
    expect(lifecycle.getSnapshot()).toEqual({ pauseReasons: ['hidden'], paused: true });
  });

  it('waits for every pause reason to clear before resuming', () => {
    const time = new TimeService();
    const lifecycle = new LifecycleService(time, new InputService());

    lifecycle.pause('blur');
    lifecycle.pause('hidden');
    lifecycle.resume('blur');

    expect(lifecycle.isPaused()).toBe(true);
    expect(time.isPaused()).toBe(true);

    lifecycle.resume('hidden');
    expect(lifecycle.isPaused()).toBe(false);
    expect(time.isPaused()).toBe(false);
    expect(time.update(1_000)).toBe(0);
  });
});
