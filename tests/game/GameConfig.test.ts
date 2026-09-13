import { Game } from 'phaser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StartGame from '../../src/game/main';

vi.mock('phaser', () => {
  class FakeScene {
    constructor(readonly key: string) {}
  }

  return {
    AUTO: 'AUTO',
    Game: vi.fn(function (this: { config: unknown }, config: unknown) {
      this.config = config;
    }),
    Scale: {
      NONE: 'NONE',
    },
    Scene: FakeScene,
  };
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('StartGame browser configuration', () => {
  it('suppresses browser gestures while preserving keyboard and window events', () => {
    StartGame('game-container', { directorMode: false });

    expect(Game).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        disableContextMenu: true,
        input: {
          activePointers: 2,
          keyboard: true,
          mouse: {
            preventDefaultWheel: true,
          },
          touch: {
            capture: true,
          },
          windowEvents: true,
        },
      }),
    );
  });

  it('creates a capped high-DPI backing buffer without enabling pixel-art filtering', () => {
    const parent = {
      clientWidth: 390,
      clientHeight: 844,
      getBoundingClientRect: () => ({ width: 390, height: 844 }),
    };
    vi.stubGlobal('document', {
      documentElement: { clientWidth: 390, clientHeight: 844 },
      getElementById: (id: string) => (id === 'game-container' ? parent : null),
    });
    vi.stubGlobal('window', {
      devicePixelRatio: 3,
      innerWidth: 390,
      innerHeight: 844,
    });

    StartGame('game-container', { directorMode: false });

    expect(Game).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        antialias: true,
        pixelArt: false,
        scale: {
          parent: 'game-container',
          mode: 'NONE',
          width: 780,
          height: 1688,
          zoom: 0.5,
        },
      }),
    );
  });
});
