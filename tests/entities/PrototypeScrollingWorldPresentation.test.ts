import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import { PrototypeScrollingWorldPresentation } from '../../src/entities/PrototypeScrollingWorldPresentation';

const createSceneFake = () => {
  const graphics = {
    clear: vi.fn(),
    destroy: vi.fn(),
    fillRect: vi.fn(),
    fillRoundedRect: vi.fn(),
    fillStyle: vi.fn(),
    setDepth: vi.fn(),
  };

  for (const method of [
    graphics.clear,
    graphics.fillRect,
    graphics.fillRoundedRect,
    graphics.fillStyle,
    graphics.setDepth,
  ]) {
    method.mockReturnValue(graphics);
  }

  const addGraphics = vi.fn(() => graphics);
  const scene = { add: { graphics: addGraphics } } as unknown as Scene;

  return { addGraphics, graphics, scene };
};

describe('PrototypeScrollingWorldPresentation', () => {
  it('draws primitive world geometry from the supplied distance and viewport', () => {
    const { addGraphics, graphics, scene } = createSceneFake();
    const presentation = new PrototypeScrollingWorldPresentation(scene);
    const viewport = new ViewportService(844, 390).getSnapshot();

    presentation.render(32, viewport);

    expect(addGraphics).toHaveBeenCalledOnce();
    expect(graphics.setDepth).toHaveBeenCalledWith(-100);
    expect(graphics.clear).toHaveBeenCalledOnce();
    expect(graphics.fillRoundedRect).toHaveBeenCalledWith(-32, 282, 104, 96, 4);
    expect(graphics.fillRect).toHaveBeenCalled();
  });

  it('redraws from authoritative distance instead of retaining presentation progress', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypeScrollingWorldPresentation(scene);
    const viewport = new ViewportService(844, 390).getSnapshot();

    presentation.render(64, viewport);
    graphics.fillRoundedRect.mockClear();
    presentation.render(16, viewport);

    expect(graphics.fillRoundedRect).toHaveBeenCalledWith(-16, 282, 104, 96, 4);
  });

  it('destroys its Phaser object once and ignores later renders', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypeScrollingWorldPresentation(scene);
    const viewport = new ViewportService(844, 390).getSnapshot();

    presentation.destroy();
    presentation.destroy();
    presentation.render(32, viewport);

    expect(graphics.destroy).toHaveBeenCalledOnce();
    expect(graphics.clear).not.toHaveBeenCalled();
  });
});
