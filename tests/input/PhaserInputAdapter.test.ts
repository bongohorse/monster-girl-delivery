import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { InputService } from '../../src/input/InputService';
import { PhaserInputAdapter } from '../../src/input/PhaserInputAdapter';
import { FakeEventEmitter } from '../support/FakeEventEmitter';

vi.mock('phaser', () => ({
  Input: {
    Events: {
      POINTER_DOWN: 'pointerdown',
      POINTER_UP: 'pointerup',
      POINTER_UP_OUTSIDE: 'pointerupoutside',
    },
    Keyboard: { KeyCodes: { SPACE: 32 } },
  },
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
}));

class FakeKeyboard extends FakeEventEmitter {
  readonly addCapture = vi.fn<(keyCode: number) => void>();
  readonly removeCapture = vi.fn<(keyCode: number) => void>();
}

class FakeInputPlugin extends FakeEventEmitter {
  constructor(readonly keyboard: FakeKeyboard) {
    super();
  }
}

const createScene = () => {
  const keyboard = new FakeKeyboard();
  const input = new FakeInputPlugin(keyboard);
  const events = new FakeEventEmitter();
  const scene = { input, events } as unknown as Scene;

  return { events, input, keyboard, scene };
};

const pointer = (id: number, options: { wasCanceled?: boolean; wasTouch?: boolean } = {}) => ({
  button: 0,
  id,
  wasCanceled: options.wasCanceled ?? false,
  wasTouch: options.wasTouch ?? true,
});

describe('PhaserInputAdapter', () => {
  it('routes touch cancellation through the active pointer identity', () => {
    const { input, scene } = createScene();
    const inputService = new InputService();
    new PhaserInputAdapter(scene, inputService);

    input.emit('pointerdown', pointer(4));
    input.emit('pointerdown', pointer(8));
    input.emit('pointerup', pointer(8, { wasCanceled: true }));

    expect(inputService.getSnapshot()).toMatchObject({
      activePointerId: 4,
      pointerHeld: true,
      pointerSource: 'touch',
    });

    input.emit('pointerup', pointer(4, { wasCanceled: true }));
    expect(inputService.isThrustHeld()).toBe(false);
  });

  it('releases the active pointer when pointer-up occurs outside the game canvas', () => {
    const { input, scene } = createScene();
    const inputService = new InputService();
    new PhaserInputAdapter(scene, inputService);

    input.emit('pointerdown', pointer(2, { wasTouch: false }));
    input.emit('pointerupoutside', pointer(2, { wasTouch: false }));

    expect(inputService.getSnapshot()).toMatchObject({
      activePointerId: null,
      pointerHeld: false,
      pointerSource: null,
      thrustHeld: false,
    });
  });

  it('removes every listener and releases held input when the scene shuts down', () => {
    const { events, input, keyboard, scene } = createScene();
    const inputService = new InputService();
    new PhaserInputAdapter(scene, inputService);

    input.emit('pointerdown', pointer(3));
    keyboard.emit('keydown-SPACE');
    events.emit('shutdown');

    expect(inputService.isThrustHeld()).toBe(false);
    expect(input.listenerCount('pointerdown')).toBe(0);
    expect(input.listenerCount('pointerup')).toBe(0);
    expect(input.listenerCount('pointerupoutside')).toBe(0);
    expect(keyboard.listenerCount('keydown-SPACE')).toBe(0);
    expect(keyboard.listenerCount('keyup-SPACE')).toBe(0);
    expect(events.listenerCount('shutdown')).toBe(0);
    expect(keyboard.removeCapture).toHaveBeenCalledExactlyOnceWith(32);

    input.emit('pointerdown', pointer(9));
    keyboard.emit('keydown-SPACE');
    expect(inputService.isThrustHeld()).toBe(false);
  });

  it('can be destroyed repeatedly without repeating cleanup', () => {
    const { keyboard, scene } = createScene();
    const inputService = new InputService();
    const adapter = new PhaserInputAdapter(scene, inputService);

    adapter.destroy();
    adapter.destroy();

    expect(keyboard.removeCapture).toHaveBeenCalledExactlyOnceWith(32);
  });
});
