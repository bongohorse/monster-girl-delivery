import { describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../../src/core/AppServices';
import { Foundation } from '../../../src/game/scenes/Foundation';

vi.mock('phaser', () => ({
  Scale: { Events: { RESIZE: 'resize' } },
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
}));

describe('Foundation scene lifecycle', () => {
  it('keeps application time active during scene shutdown for a restart or transition', () => {
    const services = createAppServices();
    const foundation = new Foundation(services);
    Reflect.set(foundation, 'scale', { off: vi.fn() });
    services.input.pressPointer(1, 'touch');
    services.time.update(16);

    const handleShutdown: unknown = Reflect.get(foundation, 'handleShutdown');
    expect(handleShutdown).toBeTypeOf('function');

    if (typeof handleShutdown !== 'function') {
      throw new TypeError('Foundation shutdown handler is unavailable.');
    }

    handleShutdown();

    expect(services.input.isThrustHeld()).toBe(false);
    expect(services.lifecycle.isPaused()).toBe(false);
    expect(services.time.isPaused()).toBe(false);
    expect(services.time.update(16)).toBeCloseTo(0.016);
  });
});
