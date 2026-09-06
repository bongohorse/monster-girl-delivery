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
    Keyboard: {
      KeyCodes: {
        DOWN: 40,
        LEFT: 37,
        RIGHT: 39,
        SPACE: 32,
        UP: 38,
      },
    },
  },
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
}));

class FakeKeyboard extends FakeEventEmitter {
  readonly addCapture = vi.fn<(keyCode: number) => void>();
  readonly removeCapture = vi.fn<(keyCode: number) => void>();
}

class FakeInputPlugin extends FakeEventEmitter {
  constructor(readonly keyboard: FakeKeyboard | null) {
    super();
  }
}

function createScene(keyboard?: FakeKeyboard): {
  events: FakeEventEmitter;
  input: FakeInputPlugin;
  keyboard: FakeKeyboard;
  scene: Scene;
};
function createScene(keyboard: null): {
  events: FakeEventEmitter;
  input: FakeInputPlugin;
  keyboard: null;
  scene: Scene;
};
function createScene(keyboard: FakeKeyboard | null = new FakeKeyboard()) {
  const input = new FakeInputPlugin(keyboard);
  const events = new FakeEventEmitter();
  const scene = { events, input } as unknown as Scene;

  return { events, input, keyboard, scene };
}

const pointer = (id: number, options: { wasCanceled?: boolean; wasTouch?: boolean } = {}) => ({
  button: 0,
  id,
  wasCanceled: options.wasCanceled ?? false,
  wasTouch: options.wasTouch ?? true,
});

describe('PhaserInputAdapter', () => {
  it('captures only SPACE on construction and does not capture arrow keys or broad keyboard inputs', () => {
    const { keyboard, scene } = createScene();
    const inputService = new InputService();
    new PhaserInputAdapter(scene, inputService);

    expect(keyboard?.addCapture).toHaveBeenCalledTimes(1);
    expect(keyboard?.addCapture).toHaveBeenCalledWith(32);
    expect(keyboard?.addCapture).not.toHaveBeenCalledWith(38); // UP
    expect(keyboard?.addCapture).not.toHaveBeenCalledWith(40); // DOWN
  });

  it('routes touch cancellation through the active pointer identity', () => {
    const { input, scene } = createScene();
    const inputService = new InputService();
    const cancelPointer = vi
      .spyOn(inputService, 'cancelPointer')
      .mockImplementation((pointerId) => {
        InputService.prototype.releasePointer.call(inputService, pointerId);
      });
    const releasePointer = vi.spyOn(inputService, 'releasePointer');
    new PhaserInputAdapter(scene, inputService);

    input.emit('pointerdown', pointer(4));
    input.emit('pointerdown', pointer(8));
    input.emit('pointerup', pointer(8, { wasCanceled: true }));

    expect(cancelPointer).toHaveBeenCalledExactlyOnceWith(8);
    expect(releasePointer).not.toHaveBeenCalled();
    expect(inputService.getSnapshot()).toMatchObject({
      activePointerId: 4,
      pointerHeld: true,
      pointerSource: 'touch',
    });

    input.emit('pointerup', pointer(4, { wasCanceled: true }));
    expect(cancelPointer).toHaveBeenNthCalledWith(2, 4);
    expect(releasePointer).not.toHaveBeenCalled();
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

  it('removes every listener, uncaptures SPACE, and releases held input when the scene shuts down', () => {
    const { events, input, keyboard, scene } = createScene();
    const inputService = new InputService();
    new PhaserInputAdapter(scene, inputService);

    input.emit('pointerdown', pointer(3));
    keyboard?.emit('keydown-SPACE');
    expect(inputService.isThrustHeld()).toBe(true);

    events.emit('shutdown');

    expect(inputService.isThrustHeld()).toBe(false);
    expect(inputService.getSnapshot()).toMatchObject({
      activePointerId: null,
      pointerHeld: false,
      pointerSource: null,
      spaceHeld: false,
      thrustHeld: false,
    });
    expect(input.listenerCount('pointerdown')).toBe(0);
    expect(input.listenerCount('pointerup')).toBe(0);
    expect(input.listenerCount('pointerupoutside')).toBe(0);
    expect(keyboard?.listenerCount('keydown-SPACE')).toBe(0);
    expect(keyboard?.listenerCount('keyup-SPACE')).toBe(0);
    expect(events.listenerCount('shutdown')).toBe(0);
    expect(keyboard?.removeCapture).toHaveBeenCalledExactlyOnceWith(32);

    input.emit('pointerdown', pointer(9));
    keyboard?.emit('keydown-SPACE');
    expect(inputService.isThrustHeld()).toBe(false);
  });

  it('releases all input and unregisters listeners when destroy is invoked directly', () => {
    const { events, input, keyboard, scene } = createScene();
    const inputService = new InputService();
    const adapter = new PhaserInputAdapter(scene, inputService);

    input.emit('pointerdown', pointer(5));
    keyboard?.emit('keydown-SPACE');
    expect(inputService.isThrustHeld()).toBe(true);

    adapter.destroy();

    expect(inputService.getSnapshot()).toMatchObject({
      activePointerId: null,
      pointerHeld: false,
      pointerSource: null,
      spaceHeld: false,
      thrustHeld: false,
    });
    expect(keyboard?.removeCapture).toHaveBeenCalledExactlyOnceWith(32);
    expect(input.listenerCount('pointerdown')).toBe(0);
    expect(keyboard?.listenerCount('keydown-SPACE')).toBe(0);
    expect(events.listenerCount('shutdown')).toBe(0);
  });

  it('can be destroyed repeatedly without repeating cleanup', () => {
    const { input, keyboard, scene } = createScene();
    const inputService = new InputService();
    const adapter = new PhaserInputAdapter(scene, inputService);

    const inputOffSpy = vi.spyOn(input, 'off');
    const keyboardOffSpy = vi.spyOn(keyboard, 'off');
    const releaseAllSpy = vi.spyOn(inputService, 'releaseAll');

    adapter.destroy();
    adapter.destroy();

    expect(keyboard.removeCapture).toHaveBeenCalledTimes(1);
    expect(keyboard.removeCapture).toHaveBeenCalledWith(32);

    expect(inputOffSpy).toHaveBeenCalledTimes(3);
    expect(keyboardOffSpy).toHaveBeenCalledTimes(2);
    expect(releaseAllSpy).toHaveBeenCalledTimes(1);
  });

  it('operates safely when keyboard plugin is absent (null)', () => {
    const { events, input, scene } = createScene(null);
    const inputService = new InputService();
    const adapter = new PhaserInputAdapter(scene, inputService);

    input.emit('pointerdown', pointer(1));
    expect(inputService.isThrustHeld()).toBe(true);

    adapter.destroy();
    expect(inputService.isThrustHeld()).toBe(false);
    expect(events.listenerCount('shutdown')).toBe(0);
  });

  it('does not turn a held Space key repeat into a fresh action press', () => {
    const { keyboard, scene } = createScene();
    const inputService = new InputService();
    new PhaserInputAdapter(scene, inputService);

    keyboard?.emit('keydown-SPACE', { repeat: false });
    expect(inputService.consumePrimaryActionPress()).toBe(true);
    inputService.releaseAll();

    keyboard?.emit('keydown-SPACE', { repeat: true });
    expect(inputService.consumePrimaryActionPress()).toBe(false);
    expect(inputService.isThrustHeld()).toBe(false);
  });
});
