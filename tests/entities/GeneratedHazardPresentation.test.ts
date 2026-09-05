import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { GeneratedHazardPresentation } from '../../src/entities/GeneratedHazardPresentation';
import type { LogicalHazardSpawnInstance } from '../../src/generation/PatternSpawnScheduler';
import {
  createTimedHazardSimulationState,
  stepTimedHazardSimulation,
} from '../../src/hazards/TimedHazardSimulation';

const EMPTY_TIMED_HAZARDS = createTimedHazardSimulationState();

const createSpawn = (entryId: string, left: number): Readonly<LogicalHazardSpawnInstance> => ({
  behavior: { archetype: 'geometric', kind: 'static' },
  entryId,
  hitbox: { left, right: left + 48, top: 120, bottom: 216 },
  patternEntryIndex: 0,
  patternId: `pattern-${entryId}`,
  runDistance: left,
  type: 'placeholder-barrier',
});

const createMovingSpawn = (): Readonly<LogicalHazardSpawnInstance> => ({
  behavior: {
    amplitudeY: 48,
    archetype: 'geometric',
    cycleDistance: 400,
    kind: 'vertical-patrol',
    phaseOffset: 0,
  },
  entryId: 'moving',
  hitbox: { left: 1_000, right: 1_048, top: 147, bottom: 195 },
  patternEntryIndex: 0,
  patternId: 'moving-pattern',
  runDistance: 1_000,
  type: 'placeholder-barrier',
});

const createTimedSpawn = (): Readonly<LogicalHazardSpawnInstance> => ({
  behavior: {
    archetype: 'timed',
    kind: 'pulse',
    lifecycle: {
      durations: { warningSeconds: 1, lockSeconds: 0.25, activeSeconds: 0.75 },
      warningGeometry: { leftOffset: -42, rightOffset: 42, topOffset: -42, bottomOffset: 42 },
    },
  },
  entryId: 'timed',
  hitbox: { left: 1_000, right: 1_064, top: 155, bottom: 219 },
  patternEntryIndex: 0,
  patternId: 'timed-pattern',
  runDistance: 1_000,
  type: 'placeholder-barrier',
});

const createSceneFake = () => {
  const graphicsObjects: Array<{
    clear: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    fillStyle: ReturnType<typeof vi.fn>;
    lineStyle: ReturnType<typeof vi.fn>;
    setPosition: ReturnType<typeof vi.fn>;
    setVisible: ReturnType<typeof vi.fn>;
  }> = [];
  const addGraphics = vi.fn(() => {
    const graphics = {
      clear: vi.fn(),
      destroy: vi.fn(),
      fillRoundedRect: vi.fn(),
      fillStyle: vi.fn(),
      fillTriangle: vi.fn(),
      lineStyle: vi.fn(),
      setDepth: vi.fn(),
      setPosition: vi.fn(),
      setVisible: vi.fn(),
      strokeRoundedRect: vi.fn(),
    };

    for (const method of [
      graphics.clear,
      graphics.fillRoundedRect,
      graphics.fillStyle,
      graphics.fillTriangle,
      graphics.lineStyle,
      graphics.setDepth,
      graphics.setPosition,
      graphics.setVisible,
      graphics.strokeRoundedRect,
    ]) {
      method.mockReturnValue(graphics);
    }

    graphicsObjects.push(graphics);
    return graphics;
  });
  const scene = { add: { graphics: addGraphics } } as unknown as Scene;

  return { addGraphics, graphicsObjects, scene };
};

describe('GeneratedHazardPresentation', () => {
  it('creates and positions one primitive presentation per logical spawn', () => {
    const { addGraphics, graphicsObjects, scene } = createSceneFake();
    const presentation = new GeneratedHazardPresentation(scene);

    presentation.sync(
      [createSpawn('first', 800), createSpawn('second', 1_000)],
      { distance: 100 },
      200,
      EMPTY_TIMED_HAZARDS,
    );

    expect(addGraphics).toHaveBeenCalledTimes(2);
    expect(graphicsObjects[0]?.setPosition).toHaveBeenCalledWith(900, 120);
    expect(graphicsObjects[1]?.setPosition).toHaveBeenCalledWith(1_100, 120);
  });

  it('reuses emitted instances and removes presentations that leave the logical window', () => {
    const { addGraphics, graphicsObjects, scene } = createSceneFake();
    const presentation = new GeneratedHazardPresentation(scene);
    const first = createSpawn('first', 800);
    const second = createSpawn('second', 1_000);

    presentation.sync([first, second], { distance: 100 }, 200, EMPTY_TIMED_HAZARDS);
    presentation.sync([second], { distance: 200 }, 200, EMPTY_TIMED_HAZARDS);

    expect(addGraphics).toHaveBeenCalledTimes(2);
    expect(graphicsObjects[0]?.destroy).toHaveBeenCalledOnce();
    expect(graphicsObjects[1]?.destroy).not.toHaveBeenCalled();
    expect(graphicsObjects[1]?.setPosition).toHaveBeenLastCalledWith(1_000, 120);
  });

  it('reuses one distinct primitive while projecting its logical patrol position', () => {
    const { addGraphics, graphicsObjects, scene } = createSceneFake();
    const presentation = new GeneratedHazardPresentation(scene);
    const spawn = createMovingSpawn();

    presentation.sync([spawn], { distance: 1_000 }, 200, EMPTY_TIMED_HAZARDS);
    presentation.sync([spawn], { distance: 1_200 }, 200, EMPTY_TIMED_HAZARDS);

    expect(addGraphics).toHaveBeenCalledOnce();
    expect(graphicsObjects[0]?.fillStyle).toHaveBeenNthCalledWith(1, 0x8a4fff, 1);
    expect(graphicsObjects[0]?.lineStyle).toHaveBeenCalledWith(4, 0x6fffe9, 1);
    expect(graphicsObjects[0]?.setPosition).toHaveBeenNthCalledWith(1, 200, 99);
    expect(graphicsObjects[0]?.setPosition).toHaveBeenNthCalledWith(2, 0, 195);
  });

  it('updates one timed primitive across readable safe, lethal, and expired phases', () => {
    const { addGraphics, graphicsObjects, scene } = createSceneFake();
    const presentation = new GeneratedHazardPresentation(scene);
    const spawn = createTimedSpawn();
    let timedState = stepTimedHazardSimulation(EMPTY_TIMED_HAZARDS, [spawn], 0);

    presentation.sync([spawn], { distance: 100 }, 200, timedState);
    expect(addGraphics).toHaveBeenCalledOnce();
    expect(graphicsObjects[0]?.fillStyle).toHaveBeenCalledWith(0xffd166, 0.16);
    expect(graphicsObjects[0]?.setPosition).toHaveBeenLastCalledWith(1_090, 145);

    timedState = stepTimedHazardSimulation(timedState, [spawn], 1);
    presentation.sync([spawn], { distance: 100 }, 200, timedState);
    expect(graphicsObjects[0]?.fillStyle).toHaveBeenCalledWith(0xff9f1c, 0.36);

    timedState = stepTimedHazardSimulation(timedState, [spawn], 0.25);
    presentation.sync([spawn], { distance: 100 }, 200, timedState);
    expect(graphicsObjects[0]?.fillStyle).toHaveBeenCalledWith(0xf72545, 0.95);
    expect(graphicsObjects[0]?.setPosition).toHaveBeenLastCalledWith(1_100, 155);

    timedState = stepTimedHazardSimulation(timedState, [spawn], 0.75);
    presentation.sync([spawn], { distance: 100 }, 200, timedState);
    expect(graphicsObjects[0]?.setVisible).toHaveBeenLastCalledWith(false);

    presentation.sync([], { distance: 100 }, 200, EMPTY_TIMED_HAZARDS);
    expect(graphicsObjects[0]?.destroy).toHaveBeenCalledOnce();
  });

  it('destroys all active graphics once and ignores later synchronization', () => {
    const { addGraphics, graphicsObjects, scene } = createSceneFake();
    const presentation = new GeneratedHazardPresentation(scene);

    presentation.sync([createSpawn('first', 800)], { distance: 100 }, 200, EMPTY_TIMED_HAZARDS);
    presentation.destroy();
    presentation.destroy();
    presentation.sync([createSpawn('second', 1_000)], { distance: 200 }, 200, EMPTY_TIMED_HAZARDS);

    expect(graphicsObjects[0]?.destroy).toHaveBeenCalledOnce();
    expect(addGraphics).toHaveBeenCalledOnce();
  });
});
