import { Game } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
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
      RESIZE: 'RESIZE',
    },
    Scene: FakeScene,
  };
});

describe('StartGame browser input configuration', () => {
  it('configures Phaser input defaults to suppress wheel scrolling and touch gestures while preserving keyboard and window events', () => {
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
});
