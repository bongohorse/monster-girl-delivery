import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { FlightTuningConfig } from '../../src/config/FlightTuningConfig';
import { RunMotionConfig } from '../../src/config/RunMotionConfig';
import { ViewportService } from '../../src/core/ViewportService';
import { DirectorTuningControls } from '../../src/devtools/DirectorTuningControls';
import { InputService } from '../../src/input/InputService';
import { stepRunMotion } from '../../src/systems/RunMotionSimulation';
import { stepVerticalFlight } from '../../src/systems/VerticalFlightSimulation';

type EventHandler = (...args: unknown[]) => void;

const createGameObjectFake = () => {
  const handlers = new Map<string, EventHandler>();
  const object = {
    destroy: vi.fn(),
    on: vi.fn((event: string, handler: EventHandler) => {
      handlers.set(event, handler);
      return object;
    }),
    setDepth: vi.fn(),
    setInteractive: vi.fn(),
    setOrigin: vi.fn(),
    setPosition: vi.fn(),
    setScrollFactor: vi.fn(),
    setSize: vi.fn(),
    setText: vi.fn(),
  };

  for (const method of [
    object.setDepth,
    object.setInteractive,
    object.setOrigin,
    object.setPosition,
    object.setScrollFactor,
    object.setSize,
    object.setText,
  ]) {
    method.mockReturnValue(object);
  }

  return { handlers, object };
};

const createSceneFake = () => {
  const objects: ReturnType<typeof createGameObjectFake>[] = [];
  const addObject = () => {
    const entry = createGameObjectFake();
    objects.push(entry);
    return entry.object;
  };
  const scene = {
    add: {
      rectangle: vi.fn(addObject),
      text: vi.fn(addObject),
    },
  } as unknown as Scene;

  return { objects, scene };
};

describe('DirectorTuningControls', () => {
  it('updates the shared runtime config used by the flight simulation', () => {
    const { scene } = createSceneFake();
    const tuning = new FlightTuningConfig();
    const input = new InputService();
    const controls = new DirectorTuningControls(scene, tuning, new RunMotionConfig(), input);

    expect(controls.setValue('gravity', 1_000)).toBe(true);
    expect(controls.setValue('thrust', 2_000)).toBe(true);
    expect(tuning.getSnapshot().gravity).toBe(1_000);
    expect(tuning.getSnapshot().thrust).toBe(2_000);

    const stepped = stepVerticalFlight(
      { positionY: 400, velocityY: 0 },
      0.05,
      true,
      tuning.getSnapshot(),
      { ceilingY: 0, floorY: 800 },
    );

    expect(stepped.velocityY).toBeLessThan(0);
  });

  it('updates run speed live without resetting accumulated distance', () => {
    const { objects, scene } = createSceneFake();
    const runMotion = new RunMotionConfig();
    const controls = new DirectorTuningControls(
      scene,
      new FlightTuningConfig(),
      runMotion,
      new InputService(),
    );
    const initialState = { distance: 200 };

    expect(controls.setValue('baseScrollSpeed', 500)).toBe(true);
    controls.layout(new ViewportService(390, 844).getSnapshot());
    controls.layout(new ViewportService(844, 390).getSnapshot());
    expect(runMotion.getSnapshot()).toEqual({ baseScrollSpeed: 500 });
    expect(stepRunMotion(initialState, 0.1, runMotion.getSnapshot())).toEqual({ distance: 250 });
    expect(
      objects.some((entry) =>
        entry.object.setText.mock.calls.some(([text]) => text === 'Scroll: 500 px/s'),
      ),
    ).toBe(true);
  });

  it('rejects invalid values without changing effective tuning', () => {
    const { scene } = createSceneFake();
    const tuning = new FlightTuningConfig();
    const runMotion = new RunMotionConfig();
    const controls = new DirectorTuningControls(scene, tuning, runMotion, new InputService());
    const flightBefore = tuning.getSnapshot();
    const runBefore = runMotion.getSnapshot();

    expect(controls.setValue('gravity', Number.NaN)).toBe(false);
    expect(controls.setValue('thrust', Number.POSITIVE_INFINITY)).toBe(false);
    expect(controls.setValue('maxFallVelocity', -1)).toBe(false);
    expect(controls.setValue('baseScrollSpeed', Number.NEGATIVE_INFINITY)).toBe(false);
    expect(tuning.getSnapshot()).toEqual(flightBefore);
    expect(runMotion.getSnapshot()).toEqual(runBefore);
  });

  it('blocks gameplay during UI interaction and stops the UI pointer event', () => {
    const { objects, scene } = createSceneFake();
    const tuning = new FlightTuningConfig();
    const runMotion = new RunMotionConfig();
    const input = new InputService();
    new DirectorTuningControls(scene, tuning, runMotion, input);
    const interactiveObjects = objects.filter(
      (entry) => entry.object.setInteractive.mock.calls.length > 0,
    );
    const interactive = interactiveObjects[interactiveObjects.length - 1];

    expect(interactive).toBeDefined();
    if (!interactive) {
      throw new Error('Expected an interactive Director control.');
    }

    input.pressPointer(7, 'touch');
    interactive.handlers.get('pointerover')?.();
    expect(input.getSnapshot().gameplayBlocked).toBe(true);
    expect(input.isThrustHeld()).toBe(false);

    const stopPropagation = vi.fn();
    interactive.handlers.get('pointerdown')?.(undefined, undefined, undefined, { stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(input.getSnapshot().gameplayBlocked).toBe(true);
    expect(runMotion.getSnapshot().baseScrollSpeed).toBe(375);

    interactive.handlers.get('pointerup')?.(undefined, undefined, undefined, { stopPropagation });
    expect(input.getSnapshot().gameplayBlocked).toBe(false);
  });

  it('cleans up idempotently and always releases gameplay blocking', () => {
    const { objects, scene } = createSceneFake();
    const input = new InputService();
    const controls = new DirectorTuningControls(
      scene,
      new FlightTuningConfig(),
      new RunMotionConfig(),
      input,
    );
    const interactive = objects.find((entry) => entry.object.setInteractive.mock.calls.length > 0);

    interactive?.handlers.get('pointerover')?.();
    expect(input.getSnapshot().gameplayBlocked).toBe(true);

    controls.destroy();
    controls.destroy();

    expect(input.getSnapshot().gameplayBlocked).toBe(false);
    for (const entry of objects) {
      expect(entry.object.destroy).toHaveBeenCalledOnce();
    }
  });
});
