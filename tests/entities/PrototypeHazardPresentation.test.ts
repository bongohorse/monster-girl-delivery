import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { PrototypeHazardPresentation } from '../../src/entities/PrototypeHazardPresentation';

const createSceneFake = () => {
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

  const addGraphics = vi.fn(() => graphics);
  const scene = { add: { graphics: addGraphics } } as unknown as Scene;

  return { addGraphics, graphics, scene };
};

describe('PrototypeHazardPresentation', () => {
  it('draws a visible primitive barrier using the logical hazard dimensions', () => {
    const { addGraphics, graphics, scene } = createSceneFake();

    new PrototypeHazardPresentation(scene);

    expect(addGraphics).toHaveBeenCalledOnce();
    expect(graphics.setDepth).toHaveBeenCalledWith(-50);
    expect(graphics.fillRoundedRect).toHaveBeenCalledWith(0, 0, 48, 96, 6);
    expect(graphics.strokeRoundedRect).toHaveBeenCalledWith(0, 0, 48, 96, 6);
    expect(graphics.fillTriangle).toHaveBeenCalled();
  });

  it('renders solely from authoritative run distance and the screen anchor', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypeHazardPresentation(scene);

    presentation.render({ distance: 400 }, 200);
    presentation.render({ distance: 500 }, 200);

    expect(graphics.setPosition).toHaveBeenNthCalledWith(1, 1_000, 147);
    expect(graphics.setPosition).toHaveBeenNthCalledWith(2, 900, 147);
  });

  it('destroys its Phaser object once and ignores later renders', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypeHazardPresentation(scene);

    presentation.destroy();
    presentation.destroy();
    presentation.render({ distance: 400 }, 200);

    expect(graphics.destroy).toHaveBeenCalledOnce();
    expect(graphics.setPosition).not.toHaveBeenCalled();
  });
});
