import type { Game } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { installPhaserInputTeardownGuard } from '../../src/input/PhaserInputTeardownGuard';
import { FakeEventEmitter } from '../support/FakeEventEmitter';

vi.mock('phaser', () => ({
  Core: {
    Events: {
      BOOT: 'boot',
      DESTROY: 'destroy',
    },
  },
}));

const createGame = (isBooted: boolean) => {
  const events = new FakeEventEmitter();
  const removeEventListener = vi.fn();
  const canvas = { removeEventListener } as unknown as HTMLCanvasElement;
  const mouse = { onMouseWheel: vi.fn() as unknown as EventListener };
  const game = {
    canvas,
    events,
    input: { mouse },
    isBooted,
  } as unknown as Game;

  return { events, game, mouse, removeEventListener };
};

describe('PhaserInputTeardownGuard', () => {
  it('captures the live Phaser wheel handler after boot and removes it on game destroy', () => {
    const { events, game, mouse, removeEventListener } = createGame(false);
    const constructorHandler = mouse.onMouseWheel;
    const liveHandler = vi.fn() as unknown as EventListener;

    installPhaserInputTeardownGuard(game);
    mouse.onMouseWheel = liveHandler;
    events.emit('boot');
    events.emit('destroy');

    expect(removeEventListener).toHaveBeenCalledExactlyOnceWith('wheel', liveHandler);
    expect(removeEventListener).not.toHaveBeenCalledWith('wheel', constructorHandler);
    expect(events.listenerCount('boot')).toBe(0);
    expect(events.listenerCount('destroy')).toBe(0);
  });

  it('cleans an already-booted game exactly once when disposed before Phaser teardown', () => {
    const { events, game, mouse, removeEventListener } = createGame(true);
    const liveHandler = mouse.onMouseWheel;
    const dispose = installPhaserInputTeardownGuard(game);

    dispose();
    dispose();
    events.emit('destroy');

    expect(removeEventListener).toHaveBeenCalledExactlyOnceWith('wheel', liveHandler);
    expect(events.listenerCount('destroy')).toBe(0);
  });
});
