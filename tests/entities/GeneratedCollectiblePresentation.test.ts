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
  const graphics = {
    clear: vi.fn(),
    destroy: vi.fn(),
    fillCircle: vi.fn(),
    fillStyle: vi.fn(),
    setDepth: vi.fn(),
    setPosition: vi.fn(),
    setScale: vi.fn(),
  };
  for (const method of [
    graphics.clear,
    graphics.fillCircle,
    graphics.fillStyle,
    graphics.setDepth,
    graphics.setPosition,
    graphics.setScale,
  ]) {
    method.mockReturnValue(graphics);
  }

  const addGraphics = vi.fn(() => graphics);
  const scene = { add: { graphics: addGraphics } } as unknown as Scene;
  return { addGraphics, graphics, scene };
};

describe('GeneratedCollectiblePresentation', () => {
  it('draws all safe/risk coins into one simplified batched graphics object', () => {
    const { addGraphics, graphics, scene } = createSceneFake();
    const presentation = new GeneratedCollectiblePresentation(scene);
    const safe = createSpawn('safe', 500);
    const risk = createSpawn('risk', 650, 'risk-reward');

    presentation.sync([safe, risk], [], { distance: 100 }, 200, { offsetY: 10, scaleY: 0.5 });

    expect(addGraphics).toHaveBeenCalledOnce();
    expect(graphics.clear).toHaveBeenCalledOnce();
    expect(graphics.fillStyle).toHaveBeenNthCalledWith(1, 0x6fffe9, 0.95);
    expect(graphics.fillStyle).toHaveBeenNthCalledWith(2, 0xffd166, 0.95);
    expect(graphics.fillCircle).toHaveBeenNthCalledWith(1, 600, 195, 7);
    expect(graphics.fillCircle).toHaveBeenNthCalledWith(2, 750, 195, 7);
    expect(graphics.setPosition).toHaveBeenCalledWith(0, 10);
    expect(graphics.setScale).toHaveBeenCalledWith(1, 0.5);
    expect(presentation.getPresentedCollectibleCount()).toBe(2);
  });

  it('scrolls unchanged collectible geometry with one transform instead of redrawing coins', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new GeneratedCollectiblePresentation(scene);
    const spawns = Object.freeze([createSpawn('safe', 500)]);
    const consumed = Object.freeze([]) as ReadonlyArray<string>;

    presentation.sync(spawns, consumed, { distance: 100 }, 200);
    graphics.clear.mockClear();
    graphics.fillCircle.mockClear();
    graphics.fillStyle.mockClear();
    graphics.setPosition.mockClear();

    presentation.sync(spawns, consumed, { distance: 120 }, 200);

    expect(graphics.clear).not.toHaveBeenCalled();
    expect(graphics.fillCircle).not.toHaveBeenCalled();
    expect(graphics.fillStyle).not.toHaveBeenCalled();
    expect(graphics.setPosition).toHaveBeenCalledOnce();
    expect(graphics.setPosition).toHaveBeenCalledWith(-20, 0);
  });

  it('redraws the shared batch when authoritative state consumes a coin', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new GeneratedCollectiblePresentation(scene);
    const spawn = createSpawn('safe', 500);
    const spawns = Object.freeze([spawn]);

    presentation.sync(spawns, [], { distance: 100 }, 200);
    graphics.clear.mockClear();
    graphics.fillCircle.mockClear();

    presentation.sync(spawns, [getLogicalCollectibleSpawnIdentity(spawn)], { distance: 120 }, 200);

    expect(graphics.clear).toHaveBeenCalledOnce();
    expect(graphics.fillCircle).not.toHaveBeenCalled();
    expect(presentation.getPresentedCollectibleCount()).toBe(0);
  });

  it('destroys the one bounded graphics object once and ignores later synchronization', () => {
    const { addGraphics, graphics, scene } = createSceneFake();
    const presentation = new GeneratedCollectiblePresentation(scene);
    const spawn = createSpawn('safe', 500);

    presentation.sync([spawn], [], { distance: 100 }, 200);
    presentation.destroy();
    presentation.destroy();
    presentation.sync([spawn], [], { distance: 120 }, 200);

    expect(graphics.destroy).toHaveBeenCalledOnce();
    expect(addGraphics).toHaveBeenCalledOnce();
    expect(presentation.getPresentedCollectibleCount()).toBe(0);
  });
});
