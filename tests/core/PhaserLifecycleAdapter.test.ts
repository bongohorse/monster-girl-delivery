import type { Game } from 'phaser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../src/core/AppServices';
import { PhaserLifecycleAdapter } from '../../src/core/PhaserLifecycleAdapter';
import { FakeEventEmitter } from '../support/FakeEventEmitter';

vi.mock('phaser', () => ({
  Core: {
    Events: {
      BLUR: 'blur',
      DESTROY: 'destroy',
      FOCUS: 'focus',
      HIDDEN: 'hidden',
      VISIBLE: 'visible',
    },
  },
}));

class FakeWindow {
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type);
    listeners?.delete(listener);

    if (listeners?.size === 0) {
      this.listeners.delete(type);
    }
  }

  dispatch(type: string): void {
    const event = new Event(type);

    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      if (typeof listener === 'function') {
        listener(event);
      } else {
        listener.handleEvent(event);
      }
    }
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

const createGame = () => {
  const events = new FakeEventEmitter();
  const game = { events } as unknown as Game;

  return { events, game };
};

const installBrowserFakes = (hidden = false) => {
  const browserWindow = new FakeWindow();
  vi.stubGlobal('window', browserWindow);
  vi.stubGlobal('document', { hidden });
  return browserWindow;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PhaserLifecycleAdapter', () => {
  it('keeps simulation paused until overlapping Phaser lifecycle events clear', () => {
    installBrowserFakes();
    const { events, game } = createGame();
    const services = createAppServices();
    new PhaserLifecycleAdapter(game, services.lifecycle);

    events.emit('blur');
    events.emit('hidden');
    events.emit('focus');

    expect(services.lifecycle.getSnapshot()).toEqual({
      pauseReasons: ['hidden'],
      paused: true,
    });
    expect(services.time.isPaused()).toBe(true);

    events.emit('visible');
    expect(services.lifecycle.isPaused()).toBe(false);
    expect(services.time.isPaused()).toBe(false);
  });

  it('keeps browser suspension independent from Phaser focus state', () => {
    const browserWindow = installBrowserFakes();
    const { events, game } = createGame();
    const services = createAppServices();
    new PhaserLifecycleAdapter(game, services.lifecycle);

    events.emit('blur');
    browserWindow.dispatch('pagehide');
    events.emit('focus');

    expect(services.lifecycle.getSnapshot()).toEqual({
      pauseReasons: ['suspended'],
      paused: true,
    });

    browserWindow.dispatch('pageshow');
    expect(services.lifecycle.isPaused()).toBe(false);
  });

  it('removes every listener when the game destroys the adapter', () => {
    const browserWindow = installBrowserFakes();
    const { events, game } = createGame();
    const services = createAppServices();
    new PhaserLifecycleAdapter(game, services.lifecycle);

    events.emit('destroy');

    expect(events.listenerCount('blur')).toBe(0);
    expect(events.listenerCount('focus')).toBe(0);
    expect(events.listenerCount('hidden')).toBe(0);
    expect(events.listenerCount('visible')).toBe(0);
    expect(events.listenerCount('destroy')).toBe(0);
    expect(browserWindow.listenerCount('pagehide')).toBe(0);
    expect(browserWindow.listenerCount('pageshow')).toBe(0);

    events.emit('blur');
    browserWindow.dispatch('pagehide');
    expect(services.lifecycle.isPaused()).toBe(false);
  });

  it('can be destroyed repeatedly without retaining listeners', () => {
    const browserWindow = installBrowserFakes();
    const { events, game } = createGame();
    const services = createAppServices();
    const adapter = new PhaserLifecycleAdapter(game, services.lifecycle);
    const gameOff = vi.spyOn(events, 'off');
    const removeBrowserListener = vi.spyOn(browserWindow, 'removeEventListener');

    adapter.destroy();
    adapter.destroy();

    expect(gameOff).toHaveBeenCalledTimes(5);
    expect(removeBrowserListener).toHaveBeenCalledTimes(2);
    expect(events.listenerCount('destroy')).toBe(0);
    expect(browserWindow.listenerCount('pagehide')).toBe(0);
    expect(browserWindow.listenerCount('pageshow')).toBe(0);
  });
});
