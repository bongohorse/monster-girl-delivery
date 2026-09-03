import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { PrototypePlayerPresentation } from '../../src/entities/PrototypePlayerPresentation';

const createSceneFake = () => {
  const graphics = {
    destroy: vi.fn(),
    fillCircle: vi.fn(),
    fillRoundedRect: vi.fn(),
    fillStyle: vi.fn(),
    fillTriangle: vi.fn(),
    lineStyle: vi.fn(),
    setPosition: vi.fn(),
    strokeCircle: vi.fn(),
    strokeRoundedRect: vi.fn(),
  };

  for (const method of [
    graphics.fillCircle,
    graphics.fillRoundedRect,
    graphics.fillStyle,
    graphics.fillTriangle,
    graphics.lineStyle,
    graphics.setPosition,
    graphics.strokeCircle,
    graphics.strokeRoundedRect,
  ]) {
    method.mockReturnValue(graphics);
  }

  const addGraphics = vi.fn(() => graphics);
  const scene = { add: { graphics: addGraphics } } as unknown as Scene;

  return { addGraphics, graphics, scene };
};

describe('PrototypePlayerPresentation', () => {
  it('creates a visible primitive placeholder at the supplied position', () => {
    const { addGraphics, graphics, scene } = createSceneFake();

    new PrototypePlayerPresentation(scene, 120, 240);

    expect(addGraphics).toHaveBeenCalledOnce();
    expect(addGraphics).toHaveBeenCalledWith({ x: 120, y: 240 });
    expect(graphics.fillRoundedRect).toHaveBeenCalled();
    expect(graphics.fillCircle).toHaveBeenCalled();
    expect(graphics.fillTriangle).toHaveBeenCalled();
  });

  it('accepts position updates from scene orchestration', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypePlayerPresentation(scene);

    presentation.setPosition(320, 180);
    presentation.setPosition(330, 170);

    expect(graphics.setPosition).toHaveBeenNthCalledWith(1, 320, 180);
    expect(graphics.setPosition).toHaveBeenNthCalledWith(2, 330, 170);
  });

  it('destroys its Phaser object once and ignores later position updates', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypePlayerPresentation(scene);

    presentation.destroy();
    presentation.destroy();
    presentation.setPosition(320, 180);

    expect(graphics.destroy).toHaveBeenCalledOnce();
    expect(graphics.setPosition).not.toHaveBeenCalled();
  });
});
