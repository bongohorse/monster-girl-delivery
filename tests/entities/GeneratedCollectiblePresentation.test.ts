import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { GeneratedCollectiblePresentation } from '../../src/entities/GeneratedCollectiblePresentation';
import {
  getLogicalCollectibleSpawnIdentity,
  type LogicalCollectibleSpawnInstance,
} from '../../src/generation/GeneratedCollectibles';

const createSpawn = (
  pathId: string,
  runDistance: number,
  intent: 'safe-guide' | 'risk-reward' = 'safe-guide',
): Readonly<LogicalCollectibleSpawnInstance> =>
  Object.freeze({
    intent,
    pathId,
    pathPointIndex: 0,
    patternId: `pattern-${pathId}`,
    patternStartDistance: runDistance - 40,
    runDistance,
    value: 1,
    y: 195,
  });

const createSceneFake = () => {
  const graphicsObjects: Array<{
    destroy: ReturnType<typeof vi.fn>;
    fillCircle: ReturnType<typeof vi.fn>;
    fillStyle: ReturnType<typeof vi.fn>;
    lineStyle: ReturnType<typeof vi.fn>;
    setPosition: ReturnType<typeof vi.fn>;
    strokeCircle: ReturnType<typeof vi.fn>;
  }> = [];
  const addGraphics = vi.fn(() => {
    const graphics = {
      destroy: vi.fn(),
      fillCircle: vi.fn(),
      fillStyle: vi.fn(),
      lineStyle: vi.fn(),
      setDepth: vi.fn(),
      setPosition: vi.fn(),
      setScale: vi.fn(),
      strokeCircle: vi.fn(),
    };

    for (const method of [
      graphics.fillCircle,
      graphics.fillStyle,
      graphics.lineStyle,
      graphics.setDepth,
      graphics.setPosition,
      graphics.setScale,
      graphics.strokeCircle,
    ]) {
      method.mockReturnValue(graphics);
    }

    graphicsObjects.push(graphics);
    return graphics;
  });
  const scene = { add: { graphics: addGraphics } } as unknown as Scene;
  return { addGraphics, graphicsObjects, scene };
};

describe('GeneratedCollectiblePresentation', () => {
  it('creates readable safe and risk primitives at projected logical positions', () => {
    const { addGraphics, graphicsObjects, scene } = createSceneFake();
    const presentation = new GeneratedCollectiblePresentation(scene);
    const safe = createSpawn('safe', 500);
    const risk = createSpawn('risk', 650, 'risk-reward');

    presentation.sync([safe, risk], [], { distance: 100 }, 200, { offsetY: 10, scaleY: 0.5 });

    expect(addGraphics).toHaveBeenCalledTimes(2);
    expect(graphicsObjects[0]?.fillStyle).toHaveBeenCalledWith(0x6fffe9, 0.95);
    expect(graphicsObjects[1]?.fillStyle).toHaveBeenCalledWith(0xffd166, 0.95);
    expect(graphicsObjects[0]?.setPosition).toHaveBeenCalledWith(600, 107.5);
    expect(graphicsObjects[1]?.setPosition).toHaveBeenCalledWith(750, 107.5);
  });

  it('removes a collectible presentation as soon as authoritative state consumes it', () => {
    const { addGraphics, graphicsObjects, scene } = createSceneFake();
    const presentation = new GeneratedCollectiblePresentation(scene);
    const spawn = createSpawn('safe', 500);

    presentation.sync([spawn], [], { distance: 100 }, 200);
    presentation.sync(
      [spawn],
      [getLogicalCollectibleSpawnIdentity(spawn)],
      { distance: 120 },
      200,
    );

    expect(addGraphics).toHaveBeenCalledOnce();
    expect(graphicsObjects[0]?.destroy).toHaveBeenCalledOnce();
  });

  it('destroys bounded graphics once and ignores later synchronization', () => {
    const { addGraphics, graphicsObjects, scene } = createSceneFake();
    const presentation = new GeneratedCollectiblePresentation(scene);
    const spawn = createSpawn('safe', 500);

    presentation.sync([spawn], [], { distance: 100 }, 200);
    presentation.destroy();
    presentation.destroy();
    presentation.sync([spawn], [], { distance: 120 }, 200);

    expect(graphicsObjects[0]?.destroy).toHaveBeenCalledOnce();
    expect(addGraphics).toHaveBeenCalledOnce();
  });
});
