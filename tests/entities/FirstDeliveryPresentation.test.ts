import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { FirstDeliveryPresentation } from '../../src/entities/FirstDeliveryPresentation';
import type { ParcelDeliveryRoute, ParcelDeliveryRunState } from '../../src/systems/ParcelDelivery';

const route: Readonly<ParcelDeliveryRoute> = {
  id: 'first-delivery',
  pickup: { runDistance: 1_600, y: 195 },
  recipient: { runDistance: 2_400, y: 115 },
};

const carrying: Readonly<ParcelDeliveryRunState> = {
  phase: 'carrying',
  completedCount: 0,
  routeId: route.id,
};

const createPresentation = () => {
  const graphics = {
    clear: vi.fn(),
    destroy: vi.fn(),
    fillCircle: vi.fn(),
    fillRect: vi.fn(),
    fillRoundedRect: vi.fn(),
    fillStyle: vi.fn(),
    fillTriangle: vi.fn(),
    lineBetween: vi.fn(),
    lineStyle: vi.fn(),
    setDepth: vi.fn().mockReturnThis(),
    strokeRect: vi.fn(),
    strokeRoundedRect: vi.fn(),
  };
  const scene = { add: { graphics: () => graphics } } as unknown as Scene;
  return { graphics, presentation: new FirstDeliveryPresentation(scene) };
};

describe('first delivery target cue', () => {
  it('points to the recipient height at the screen edge immediately after pickup', () => {
    const { graphics, presentation } = createPresentation();

    presentation.render(route, carrying, 1_600, 160, 640, { offsetY: 0, scaleY: 1 });

    expect(graphics.fillTriangle).toHaveBeenCalledOnce();
    const [leftX, topY, rightX, , tipX, tipY] = graphics.fillTriangle.mock.calls[0] ?? [];
    expect(leftX).toBeGreaterThan(500);
    expect(rightX).toBeLessThan(640);
    expect(tipX).toBeGreaterThan(leftX);
    expect(tipY).toBeLessThan(115);
    expect(topY).toBeLessThan(tipY);
  });

  it('removes the cue after a handoff', () => {
    const { graphics, presentation } = createPresentation();
    presentation.render(
      route,
      { ...carrying, phase: 'delivered', completedCount: 1 },
      2_400,
      160,
      640,
      {
        offsetY: 0,
        scaleY: 1,
      },
    );
    expect(graphics.fillTriangle).not.toHaveBeenCalled();
  });
});
