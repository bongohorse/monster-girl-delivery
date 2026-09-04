import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { GeneratedHazardPresentation } from '../../src/entities/GeneratedHazardPresentation';
import type { LogicalHazardSpawnInstance } from '../../src/generation/PatternSpawnScheduler';

const createSpawn = (entryId: string, left: number): Readonly<LogicalHazardSpawnInstance> => ({
  entryId,
  hitbox: { left, right: left + 48, top: 120, bottom: 216 },
  patternEntryIndex: 0,
  patternId: `pattern-${entryId}`,
  runDistance: left,
  type: 'placeholder-barrier',
});

const createSceneFake = () => {
  const graphicsObjects: Array<{
    destroy: ReturnType<typeof vi.fn>;
    setPosition: ReturnType<typeof vi.fn>;
  }> = [];
  const addGraphics = vi.fn(() => {
    const graphics = {
      destroy: vi.fn(),
      fillRoundedRect: vi.fn(),
      fillStyle: vi.fn(),
      fillTriangle: vi.fn(),
      lineStyle: vi.fn(),
      setDepth: vi.fn(),
      setPosition: vi.fn(),
      strokeRoundedRect: vi.fn(),
    };

    for (const method of [
      graphics.fillRoundedRect,
      graphics.fillStyle,
      graphics.fillTriangle,
      graphics.lineStyle,
      graphics.setDepth,
      graphics.setPosition,
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

    presentation.sync([first, second], { distance: 100 }, 200);
    presentation.sync([second], { distance: 200 }, 200);

    expect(addGraphics).toHaveBeenCalledTimes(2);
    expect(graphicsObjects[0]?.destroy).toHaveBeenCalledOnce();
    expect(graphicsObjects[1]?.destroy).not.toHaveBeenCalled();
    expect(graphicsObjects[1]?.setPosition).toHaveBeenLastCalledWith(1_000, 120);
  });

  it('destroys all active graphics once and ignores later synchronization', () => {
    const { addGraphics, graphicsObjects, scene } = createSceneFake();
    const presentation = new GeneratedHazardPresentation(scene);

    presentation.sync([createSpawn('first', 800)], { distance: 100 }, 200);
    presentation.destroy();
    presentation.destroy();
    presentation.sync([createSpawn('second', 1_000)], { distance: 200 }, 200);

    expect(graphicsObjects[0]?.destroy).toHaveBeenCalledOnce();
    expect(addGraphics).toHaveBeenCalledOnce();
  });
});
