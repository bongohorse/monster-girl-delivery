import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import { DirectorPanel } from '../../src/devtools/DirectorPanel';

const createGameObjectFake = () => {
  const object = {
    setDepth: vi.fn(),
    setOrigin: vi.fn(),
    setPosition: vi.fn(),
    setScrollFactor: vi.fn(),
    setSize: vi.fn(),
    setText: vi.fn(),
    setWordWrapWidth: vi.fn(),
  };

  for (const method of [
    object.setDepth,
    object.setOrigin,
    object.setPosition,
    object.setScrollFactor,
    object.setSize,
    object.setText,
    object.setWordWrapWidth,
  ]) {
    method.mockReturnValue(object);
  }

  return object;
};

describe('DirectorPanel', () => {
  it('presents the authoritative normalized run seed in M3 diagnostics', () => {
    const background = createGameObjectFake();
    const textObject = createGameObjectFake();
    const scene = {
      add: {
        rectangle: vi.fn(() => background),
        text: vi.fn(() => textObject),
      },
    } as unknown as Scene;
    const panel = new DirectorPanel(scene);
    const viewport = new ViewportService(844, 390).getSnapshot();

    panel.layout(viewport);
    panel.update(
      16,
      viewport,
      {
        activePointerId: null,
        gameplayBlocked: false,
        pointerHeld: false,
        pointerSource: null,
        spaceHeld: false,
        thrustHeld: false,
      },
      { paused: false, pauseReasons: [] },
      3_433_278_918,
    );

    expect(textObject.setText).toHaveBeenCalledWith(
      expect.arrayContaining(['DIRECTOR DIAGNOSTICS — M3', 'Seed: 3433278918']),
    );
  });
});
