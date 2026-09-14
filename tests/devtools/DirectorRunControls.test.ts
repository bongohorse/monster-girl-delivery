import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import { DIRECTOR_PANEL_VISIBILITY_EVENT } from '../../src/devtools/DirectorPanel';
import { DirectorRunControls } from '../../src/devtools/DirectorRunControls';
import { InputService } from '../../src/input/InputService';

type EventHandler = (...args: unknown[]) => void;

const createSceneFake = () => {
  const canvasListeners = new Map<string, EventListener>();
  const addEventListener = vi.fn((event: string, handler: EventListener) => {
    canvasListeners.set(event, handler);
  });
  const removeEventListener = vi.fn((event: string, handler: EventListener) => {
    if (canvasListeners.get(event) === handler) canvasListeners.delete(event);
  });
  const sceneListeners = new Map<string, EventHandler>();
  const sceneEvents = {
    emit: vi.fn((event: string, ...args: unknown[]) => {
      sceneListeners.get(event)?.(...args);
    }),
    off: vi.fn((event: string, handler: EventHandler) => {
      if (sceneListeners.get(event) === handler) sceneListeners.delete(event);
    }),
    on: vi.fn((event: string, handler: EventHandler) => {
      sceneListeners.set(event, handler);
    }),
  };
  const controls: Array<{
    button: {
      destroy: ReturnType<typeof vi.fn>;
      disableInteractive: ReturnType<typeof vi.fn>;
      on: ReturnType<typeof vi.fn>;
      setDepth: ReturnType<typeof vi.fn>;
      setFixedSize: ReturnType<typeof vi.fn>;
      setInteractive: ReturnType<typeof vi.fn>;
      setPosition: ReturnType<typeof vi.fn>;
      setResolution: ReturnType<typeof vi.fn>;
      setScrollFactor: ReturnType<typeof vi.fn>;
      setVisible: ReturnType<typeof vi.fn>;
    };
    handlers: Map<string, EventHandler>;
  }> = [];
  const text = vi.fn(() => {
    const handlers = new Map<string, EventHandler>();
    const button = {
      destroy: vi.fn(),
      disableInteractive: vi.fn(),
      on: vi.fn((event: string, handler: EventHandler) => {
        handlers.set(event, handler);
        return button;
      }),
      setDepth: vi.fn(),
      setFixedSize: vi.fn(),
      setInteractive: vi.fn(),
      setPosition: vi.fn(),
      setResolution: vi.fn(),
      setScrollFactor: vi.fn(),
      setVisible: vi.fn(),
    };

    for (const method of [
      button.disableInteractive,
      button.setDepth,
      button.setFixedSize,
      button.setInteractive,
      button.setPosition,
      button.setResolution,
      button.setScrollFactor,
      button.setVisible,
    ]) {
      method.mockReturnValue(button);
    }

    controls.push({ button, handlers });
    return button;
  });
  const scene = {
    add: { text },
    cameras: { main: { zoom: 2 } },
    events: sceneEvents,
    game: { canvas: { addEventListener, removeEventListener } },
  } as unknown as Scene;

  return {
    addEventListener,
    canvasListeners,
    controls,
    removeEventListener,
    scene,
    sceneEvents,
    text,
  };
};

const getControl = (controls: ReturnType<typeof createSceneFake>['controls'], index: number) => {
  const control = controls[index];
  if (!control) throw new Error(`Expected Director run control ${index}.`);
  return control;
};

describe('DirectorRunControls', () => {
  it('creates compact same-seed and new-seed actions and lays them out responsively', () => {
    const { controls: createdControls, scene, text } = createSceneFake();
    const controls = new DirectorRunControls(scene, new InputService(), vi.fn(), vi.fn());

    controls.layout(new ViewportService(844, 390).getSnapshot());

    expect(text).toHaveBeenNthCalledWith(
      1,
      0,
      0,
      'Restart same seed',
      expect.objectContaining({ fixedWidth: 164, fontSize: '12px' }),
    );
    expect(text).toHaveBeenNthCalledWith(
      2,
      0,
      0,
      'New random seed',
      expect.objectContaining({ fixedWidth: 164, fontSize: '12px' }),
    );
    const restartControl = getControl(createdControls, 0).button;
    const newSeedControl = getControl(createdControls, 1).button;
    expect(restartControl.setInteractive).toHaveBeenCalledOnce();
    expect(newSeedControl.setInteractive).toHaveBeenCalledOnce();
    expect(restartControl.setResolution).toHaveBeenLastCalledWith(2);
    expect(newSeedControl.setResolution).toHaveBeenLastCalledWith(2);
    expect(restartControl.setPosition).toHaveBeenLastCalledWith(24, 208);
    expect(restartControl.setFixedSize).toHaveBeenLastCalledWith(164, 32);
    expect(newSeedControl.setPosition).toHaveBeenLastCalledWith(196, 208);
    expect(newSeedControl.setFixedSize).toHaveBeenLastCalledWith(164, 32);
  });

  it('hides both run buttons with the diagnostics panel and restores interactivity', () => {
    const { controls: createdControls, scene, sceneEvents } = createSceneFake();
    new DirectorRunControls(scene, new InputService(), vi.fn(), vi.fn());
    const restartControl = getControl(createdControls, 0).button;
    const newSeedControl = getControl(createdControls, 1).button;

    sceneEvents.emit(DIRECTOR_PANEL_VISIBILITY_EVENT, false);
    expect(restartControl.setVisible).toHaveBeenLastCalledWith(false);
    expect(newSeedControl.setVisible).toHaveBeenLastCalledWith(false);
    expect(restartControl.disableInteractive).toHaveBeenCalledOnce();
    expect(newSeedControl.disableInteractive).toHaveBeenCalledOnce();

    sceneEvents.emit(DIRECTOR_PANEL_VISIBILITY_EVENT, true);
    expect(restartControl.setVisible).toHaveBeenLastCalledWith(true);
    expect(newSeedControl.setVisible).toHaveBeenLastCalledWith(true);
    expect(restartControl.setInteractive).toHaveBeenCalledTimes(2);
    expect(newSeedControl.setInteractive).toHaveBeenCalledTimes(2);
  });

  it('runs each action exactly once on a completed pointer interaction without gameplay leakage', () => {
    const { controls, scene } = createSceneFake();
    const input = new InputService();
    const restartSameSeed = vi.fn();
    const startNewSeed = vi.fn();
    new DirectorRunControls(scene, input, restartSameSeed, startNewSeed);
    const stopPropagation = vi.fn();

    for (const [index, pointerId] of [
      [0, 7],
      [1, 8],
    ] as const) {
      const { handlers } = getControl(controls, index);
      input.pressPointer(pointerId, 'touch');
      handlers.get('pointerover')?.();
      handlers.get('pointerdown')?.({ id: pointerId }, 0, 0, { stopPropagation });

      expect(input.getSnapshot()).toMatchObject({
        activePointerId: null,
        gameplayBlocked: true,
        pointerHeld: false,
        thrustHeld: false,
      });

      handlers.get('pointerup')?.({ id: pointerId }, 0, 0, { stopPropagation });
      handlers.get('pointerup')?.({ id: pointerId }, 0, 0, { stopPropagation });
      expect(input.getSnapshot().gameplayBlocked).toBe(false);
      expect(input.isThrustHeld()).toBe(false);
      expect(input.consumePrimaryActionPress()).toBe(false);
    }

    expect(stopPropagation).toHaveBeenCalledTimes(6);
    expect(restartSameSeed).toHaveBeenCalledOnce();
    expect(startNewSeed).toHaveBeenCalledOnce();
  });

  it('cancels incomplete interactions and always releases blocking on cleanup', () => {
    const {
      canvasListeners,
      controls: createdControls,
      removeEventListener,
      scene,
      sceneEvents,
    } = createSceneFake();
    const input = new InputService();
    const restartSameSeed = vi.fn();
    const startNewSeed = vi.fn();
    const controls = new DirectorRunControls(scene, input, restartSameSeed, startNewSeed);
    const restartControl = getControl(createdControls, 0);
    const newSeedControl = getControl(createdControls, 1);

    restartControl.handlers.get('pointerover')?.();
    restartControl.handlers.get('pointerdown')?.({ id: 4 }, 0, 0);
    canvasListeners.get('pointercancel')?.(new Event('pointercancel'));
    restartControl.handlers.get('pointerup')?.({ id: 4 }, 0, 0);

    expect(restartSameSeed).not.toHaveBeenCalled();
    expect(startNewSeed).not.toHaveBeenCalled();
    expect(input.getSnapshot().gameplayBlocked).toBe(false);

    newSeedControl.handlers.get('pointerover')?.();
    newSeedControl.handlers.get('pointerdown')?.({ id: 9 }, 0, 0);
    newSeedControl.handlers.get('pointerupoutside')?.();
    newSeedControl.handlers.get('pointerup')?.({ id: 9 }, 0, 0);
    expect(startNewSeed).not.toHaveBeenCalled();
    expect(input.getSnapshot().gameplayBlocked).toBe(false);

    newSeedControl.handlers.get('pointerover')?.();
    controls.destroy();
    controls.destroy();

    expect(input.getSnapshot().gameplayBlocked).toBe(false);
    expect(restartControl.button.destroy).toHaveBeenCalledOnce();
    expect(newSeedControl.button.destroy).toHaveBeenCalledOnce();
    expect(removeEventListener).toHaveBeenCalledOnce();
    expect(sceneEvents.off).toHaveBeenCalledWith(
      DIRECTOR_PANEL_VISIBILITY_EVENT,
      expect.any(Function),
    );
    expect(canvasListeners.has('pointercancel')).toBe(false);
  });
});
