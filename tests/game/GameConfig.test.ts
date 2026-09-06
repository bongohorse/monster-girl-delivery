import { Game, Scale } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import StartGame, { createGameConfig } from '../../src/game/main';
import { Boot } from '../../src/game/scenes/Boot';
import { Foundation } from '../../src/game/scenes/Foundation';
import { Preloader } from '../../src/game/scenes/Preloader';

vi.mock('phaser', () => {
  class FakeScene {
    constructor(readonly key: string) {}
  }

  return {
    AUTO: 'AUTO',
    Game: vi.fn(function (this: { config: unknown }, config: unknown) {
      this.config = config;
    }),
    Loader: { Events: { PROGRESS: 'progress' } },
    Scale: {
      Events: { RESIZE: 'resize' },
      RESIZE: 'RESIZE',
    },
    Scene: FakeScene,
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
  };
});

describe('GameConfig and StartGame', () => {
  it('creates Phaser game configuration with hardened browser/WebView input defaults', () => {
    const config = createGameConfig('game-container', { directorMode: false });

    expect(config.disableContextMenu).toBe(true);
    expect(config.input).toEqual({
      activePointers: 2,
      keyboard: true,
      mouse: {
        preventDefaultWheel: true,
      },
      touch: {
        capture: true,
      },
      windowEvents: true,
    });
    expect(config.scale).toEqual({
      parent: 'game-container',
      mode: Scale.RESIZE,
      width: '100%',
      height: '100%',
    });
    expect(config.backgroundColor).toBe('#121426');
  });

  it('wires Boot, Preloader, and Foundation scenes with given director mode option', () => {
    const config = createGameConfig('test-parent', { directorMode: true });
    const scenes = config.scene as Array<unknown>;

    expect(scenes).toHaveLength(3);
    expect(scenes[0]).toBe(Boot);
    expect(scenes[1]).toBe(Preloader);
    expect(scenes[2]).toBeInstanceOf(Foundation);
    expect(Reflect.get(scenes[2] as object, 'directorMode')).toBe(true);
  });

  it('instantiates Game with the generated game configuration', () => {
    const game = StartGame('game-container', { directorMode: false });

    expect(Game).toHaveBeenCalledTimes(1);
    expect(Game).toHaveBeenCalledWith(
      expect.objectContaining({
        disableContextMenu: true,
        input: expect.objectContaining({
          activePointers: 2,
          keyboard: true,
          mouse: { preventDefaultWheel: true },
          touch: { capture: true },
          windowEvents: true,
        }),
      }),
    );
    expect(game).toBeDefined();
  });
});
