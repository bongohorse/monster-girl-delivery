import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { PrototypeLaserPresentation } from '../../src/entities/PrototypeLaserPresentation';
import type { LogicalHazardSpawnInstance } from '../../src/generation/PatternSpawnScheduler';
import type { LaserOrientation, LaserSpan } from '../../src/hazards/HazardArchetype';
import { createPrototypeLaserBehavior } from '../../src/hazards/PrototypeLaserHazard';

const createGraphicsMock = () => {
  const graphics = {
    clear: vi.fn(),
    destroy: vi.fn(),
    fillCircle: vi.fn(),
    fillStyle: vi.fn(),
    lineBetween: vi.fn(),
    lineStyle: vi.fn(),
    setDepth: vi.fn(),
    setPosition: vi.fn(),
    setScale: vi.fn(),
    setVisible: vi.fn(),
    strokeCircle: vi.fn(),
  };
  for (const method of [
    graphics.clear,
    graphics.fillCircle,
    graphics.fillStyle,
    graphics.lineBetween,
    graphics.lineStyle,
    graphics.setDepth,
    graphics.setPosition,
    graphics.setScale,
    graphics.setVisible,
    graphics.strokeCircle,
  ]) {
    method.mockReturnValue(graphics);
  }
  return graphics;
};

const createSceneFake = () => {
  const graphics = createGraphicsMock();
  const scene = {
    add: { graphics: vi.fn(() => graphics) },
    cameras: { main: { height: 450, width: 800, zoom: 1 } },
  } as unknown as Scene;
  return { graphics, scene };
};

const createSpawn = (
  orientation: LaserOrientation,
  span: LaserSpan = 'screen',
): Readonly<LogicalHazardSpawnInstance> => {
  const behavior = createPrototypeLaserBehavior(
    orientation,
    span,
    span === 'finite' ? { finiteLength: 200 } : {},
  );
  return Object.freeze({
    behavior,
    entryId: `laser-${orientation}-${span}`,
    hitbox: Object.freeze({ left: 300, right: 324, top: 183, bottom: 207 }),
    patternEntryIndex: 0,
    patternId: 'laser-presentation-test',
    runDistance: 300,
    type: 'placeholder-barrier',
  });
};

const ON_STATE = Object.freeze({
  complete: false,
  elapsedPhaseSeconds: 0.2,
  phase: 'on' as const,
});

describe('PrototypeLaserPresentation', () => {
  it('scales horizontal beam thickness with the vertical gameplay projection', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypeLaserPresentation(scene, createSpawn('horizontal'));

    presentation.render({ distance: 0 }, 100, ON_STATE, { offsetY: 0, scaleY: 0.5 });

    expect(graphics.lineBetween).toHaveBeenNthCalledWith(1, 0, 97.5, 800, 97.5);
    expect(graphics.lineStyle.mock.calls[0]?.[0]).toBe(26);
    expect(graphics.lineStyle.mock.calls[1]?.[0]).toBe(12);
  });

  it('keeps vertical beam width horizontal while projecting its screen-span position', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypeLaserPresentation(scene, createSpawn('vertical'));

    presentation.render({ distance: 0 }, 100, ON_STATE, { offsetY: 20, scaleY: 0.5 });

    expect(graphics.lineBetween).toHaveBeenNthCalledWith(1, 544, 0, 544, 450);
    expect(graphics.lineStyle.mock.calls[0]?.[0]).toBe(52);
    expect(graphics.lineStyle.mock.calls[1]?.[0]).toBe(24);
  });

  it('renders finite beams from authored world geometry instead of stretching them across the screen', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypeLaserPresentation(scene, createSpawn('horizontal', 'finite'));

    presentation.render({ distance: 100 }, 100, ON_STATE);

    expect(graphics.lineBetween).toHaveBeenNthCalledWith(1, 212, 195, 412, 195);
    expect(graphics.strokeCircle).toHaveBeenCalledWith(212, 195, 20);
    expect(graphics.strokeCircle).toHaveBeenCalledWith(412, 195, 20);
  });

  it('hides completed one-shot Lasers and destroys its graphics exactly once', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypeLaserPresentation(scene, createSpawn('horizontal'));

    presentation.render({ distance: 0 }, 100, {
      complete: true,
      elapsedPhaseSeconds: 0,
      phase: 'off',
    });
    expect(graphics.setVisible).toHaveBeenLastCalledWith(false);

    presentation.destroy();
    presentation.destroy();
    expect(graphics.destroy).toHaveBeenCalledOnce();
  });
});
