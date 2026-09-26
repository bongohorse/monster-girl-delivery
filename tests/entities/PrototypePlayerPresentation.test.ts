import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import {
  PROTOTYPE_PLAYER_PRESENTATION_SCALE,
  PrototypePlayerPresentation,
} from '../../src/entities/PrototypePlayerPresentation';

const createGraphicsMock = () => {
  const graphics = {
    destroy: vi.fn(),
    fillCircle: vi.fn(),
    fillRoundedRect: vi.fn(),
    fillStyle: vi.fn(),
    fillTriangle: vi.fn(),
    lineStyle: vi.fn(),
    setPosition: vi.fn(),
    setRotation: vi.fn(),
    setScale: vi.fn(),
    strokeCircle: vi.fn(),
    strokeRoundedRect: vi.fn(),
  };
  for (const method of [
    graphics.fillCircle,
    graphics.fillRoundedRect,
    graphics.fillStyle,
    graphics.fillTriangle,
    graphics.lineStyle,
    graphics.strokeCircle,
    graphics.strokeRoundedRect,
  ]) {
    method.mockReturnValue(graphics);
  }
  return graphics;
};

describe('PrototypePlayerPresentation', () => {
  it('uses a smaller visual placeholder without changing caller-owned gameplay projection', () => {
    const graphics = createGraphicsMock();
    const scene = { add: { graphics: vi.fn(() => graphics) } } as unknown as Scene;
    const presentation = new PrototypePlayerPresentation(scene);

    presentation.setScale(1, 0.5);

    expect(PROTOTYPE_PLAYER_PRESENTATION_SCALE).toBe(0.84);
    expect(graphics.setScale).toHaveBeenLastCalledWith(0.84, 0.42);
  });
});
