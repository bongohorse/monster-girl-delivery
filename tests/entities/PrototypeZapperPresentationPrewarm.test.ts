import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { PrototypeZapperPresentation } from '../../src/entities/PrototypeZapperPresentation';

const createShaderMock = () => {
  const shader = {
    destroy: vi.fn(),
    setDepth: vi.fn(),
    setOrigin: vi.fn(),
    setVisible: vi.fn(),
  };

  for (const method of [shader.setDepth, shader.setOrigin, shader.setVisible]) {
    method.mockReturnValue(shader);
  }

  return shader;
};

describe('PrototypeZapperPresentation shader prewarm', () => {
  it('creates the shared shader during presentation construction instead of the first Zapper render', () => {
    const shader = createShaderMock();
    const addShader = vi.fn(() => shader);
    const addGraphics = vi.fn();
    const scene = {
      add: {
        graphics: addGraphics,
        shader: addShader,
      },
    } as unknown as Scene;

    const presentation = new PrototypeZapperPresentation(scene);

    expect(addShader).toHaveBeenCalledOnce();
    expect(addGraphics).not.toHaveBeenCalled();
    expect(shader.setVisible).toHaveBeenLastCalledWith(false);

    presentation.render([], { distance: 0, simulationSeconds: 0 }, 100);

    expect(addShader).toHaveBeenCalledOnce();
    expect(addGraphics).not.toHaveBeenCalled();

    presentation.destroy();
    expect(shader.destroy).toHaveBeenCalledOnce();
  });
});
