import type { Game } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import {
  createRenderResolutionSnapshot,
  getLogicalViewportFromBacking,
  installRenderResolutionController,
  measureRenderResolution,
  resolveRenderScale,
} from '../../src/game/RenderResolution';

describe('render resolution policy', () => {
  it('uses native DPR up to the conservative 2x cap', () => {
    expect(resolveRenderScale(1)).toBe(1);
    expect(resolveRenderScale(1.25)).toBe(1.25);
    expect(resolveRenderScale(1.5)).toBe(1.5);
    expect(resolveRenderScale(2)).toBe(2);
    expect(resolveRenderScale(3)).toBe(2);
    expect(resolveRenderScale(4)).toBe(2);
  });

  it('keeps CSS-pixel layout separate from the backing buffer', () => {
    expect(createRenderResolutionSnapshot(390, 844, 3)).toEqual({
      logicalWidth: 390,
      logicalHeight: 844,
      backingWidth: 780,
      backingHeight: 1688,
      devicePixelRatio: 3,
      renderScale: 2,
    });
    expect(getLogicalViewportFromBacking(780, 1688, 0.5)).toEqual({
      width: 390,
      height: 844,
      renderScale: 2,
    });
  });

  it('supports a lower presentation cap without changing logical dimensions', () => {
    expect(createRenderResolutionSnapshot(844, 390, 3, 1.5)).toEqual({
      logicalWidth: 844,
      logicalHeight: 390,
      backingWidth: 1266,
      backingHeight: 585,
      devicePixelRatio: 3,
      renderScale: 1.5,
    });
  });

  it('resizes only the backing buffer when the CSS viewport or DPR changes', () => {
    let width = 390;
    let height = 844;
    let devicePixelRatio = 1;
    const parent = {
      clientWidth: width,
      clientHeight: height,
      getBoundingClientRect: () => ({ width, height }),
    } as unknown as HTMLElement;
    const documentElement = { clientWidth: width, clientHeight: height };
    const ownerDocument = {
      documentElement,
      getElementById: (id: string) => (id === 'game-container' ? parent : null),
    } as unknown as Document;
    const windowListeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const view = {
      get devicePixelRatio() {
        return devicePixelRatio;
      },
      innerWidth: width,
      innerHeight: height,
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        const listeners =
          windowListeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
        listeners.add(listener);
        windowListeners.set(type, listeners);
      },
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        windowListeners.get(type)?.delete(listener);
      },
    } as unknown as Window;
    const resize = vi.fn();
    const once = vi.fn();
    const off = vi.fn();
    const canvas = { dataset: {} as DOMStringMap } as HTMLCanvasElement;
    const game = {
      canvas,
      events: { once, off },
      scale: { resize, zoom: 1 },
    } as unknown as Game;

    const environment = { document: ownerDocument, window: view };
    expect(measureRenderResolution('game-container', 2, environment)).toMatchObject({
      logicalWidth: 390,
      logicalHeight: 844,
      backingWidth: 390,
      backingHeight: 844,
      renderScale: 1,
    });

    const controller = installRenderResolutionController(game, 'game-container', 2, environment);
    expect(canvas.dataset.mgdRenderScale).toBe('1.00');
    expect(resize).not.toHaveBeenCalled();

    width = 844;
    height = 390;
    devicePixelRatio = 3;
    controller.sync();

    expect(game.scale.zoom).toBe(0.5);
    expect(resize).toHaveBeenCalledExactlyOnceWith(1688, 780);
    expect(controller.getSnapshot()).toMatchObject({
      logicalWidth: 844,
      logicalHeight: 390,
      backingWidth: 1688,
      backingHeight: 780,
      renderScale: 2,
    });
    expect(canvas.dataset).toMatchObject({
      mgdLogicalSize: '844x390',
      mgdBackingSize: '1688x780',
      mgdDevicePixelRatio: '3.00',
      mgdRenderScale: '2.00',
    });

    controller.destroy();
    expect([...windowListeners.values()].every((listeners) => listeners.size === 0)).toBe(true);
    expect(off).toHaveBeenCalledWith('destroy', expect.any(Function));
  });
});
