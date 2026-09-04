import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import { DirectorRunControls } from '../../src/devtools/DirectorRunControls';
import { InputService } from '../../src/input/InputService';

type EventHandler = (...args: unknown[]) => void;

const createSceneFake = () => {
  const handlers = new Map<string, EventHandler>();
  const button = {
    destroy: vi.fn(),
    on: vi.fn((event: string, handler: EventHandler) => {
      handlers.set(event, handler);
      return button;
    }),
    setDepth: vi.fn(),
    setFixedSize: vi.fn(),
    setInteractive: vi.fn(),
    setPosition: vi.fn(),
    setScrollFactor: vi.fn(),
  };

  for (const method of [
    button.setDepth,
    button.setFixedSize,
    button.setInteractive,
    button.setPosition,
    button.setScrollFactor,
  ]) {
    method.mockReturnValue(button);
  }

  const text = vi.fn(() => button);
  const scene = { add: { text } } as unknown as Scene;

  return { button, handlers, scene, text };
};

describe('DirectorRunControls', () => {
  it('creates one explicit restart-same-seed action and lays it out responsively', () => {
    const { button, scene, text } = createSceneFake();
    const controls = new DirectorRunControls(scene, new InputService(), vi.fn());

    controls.layout(new ViewportService(844, 390).getSnapshot());

    expect(text).toHaveBeenCalledWith(
      0,
      0,
      'Restart same seed',
      expect.objectContaining({ fixedWidth: 336 }),
    );
    expect(button.setInteractive).toHaveBeenCalledOnce();
    expect(button.setPosition).toHaveBeenLastCalledWith(24, 176);
    expect(button.setFixedSize).toHaveBeenLastCalledWith(336, 32);
  });

  it('restarts exactly once on a completed pointer interaction without gameplay leakage', () => {
    const { handlers, scene } = createSceneFake();
    const input = new InputService();
    const restartSameSeed = vi.fn();
    new DirectorRunControls(scene, input, restartSameSeed);
    const stopPropagation = vi.fn();

    input.pressPointer(7, 'touch');
    handlers.get('pointerover')?.();
    handlers.get('pointerdown')?.(undefined, undefined, undefined, { stopPropagation });

    expect(input.getSnapshot()).toMatchObject({
      activePointerId: null,
      gameplayBlocked: true,
      pointerHeld: false,
      thrustHeld: false,
    });
    expect(restartSameSeed).not.toHaveBeenCalled();

    handlers.get('pointerup')?.(undefined, undefined, undefined, { stopPropagation });
    handlers.get('pointerup')?.(undefined, undefined, undefined, { stopPropagation });

    expect(stopPropagation).toHaveBeenCalledTimes(3);
    expect(restartSameSeed).toHaveBeenCalledOnce();
    expect(input.getSnapshot().gameplayBlocked).toBe(false);
    expect(input.isThrustHeld()).toBe(false);
    expect(input.consumePrimaryActionPress()).toBe(false);
  });

  it('cancels incomplete interactions and always releases blocking on cleanup', () => {
    const { button, handlers, scene } = createSceneFake();
    const input = new InputService();
    const restartSameSeed = vi.fn();
    const controls = new DirectorRunControls(scene, input, restartSameSeed);

    handlers.get('pointerover')?.();
    handlers.get('pointerdown')?.();
    handlers.get('pointerout')?.();
    handlers.get('pointerup')?.();

    expect(restartSameSeed).not.toHaveBeenCalled();
    expect(input.getSnapshot().gameplayBlocked).toBe(false);

    handlers.get('pointerover')?.();
    controls.destroy();
    controls.destroy();

    expect(input.getSnapshot().gameplayBlocked).toBe(false);
    expect(button.destroy).toHaveBeenCalledOnce();
  });
});
