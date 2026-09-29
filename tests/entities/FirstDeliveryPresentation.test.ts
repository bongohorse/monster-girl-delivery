import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { FirstDeliveryPresentation } from '../../src/entities/FirstDeliveryPresentation';
import { createFirstDeliveryRoute } from '../../src/generation/FirstDeliveryRoute';
import type { ParcelDeliveryRoute, ParcelDeliveryRunState } from '../../src/systems/ParcelDelivery';

const route: Readonly<ParcelDeliveryRoute> = createFirstDeliveryRoute({
  ceilingY: 28,
  floorY: 362,
});

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
  it('marks the visible parcel with a smaller downward cue before pickup', () => {
    const { graphics, presentation } = createPresentation();
    presentation.render(route, undefined, 1_400, 160, 640, { offsetY: 0, scaleY: 1 });
    expect(graphics.fillTriangle).toHaveBeenCalledOnce();
    const [leftX, topY, rightX, , tipX, tipY] = graphics.fillTriangle.mock.calls[0] ?? [];
    expect(tipX).toBeCloseTo(360);
    expect(rightX - leftX).toBeLessThan(34);
    expect(topY).toBeLessThan(tipY);
    expect(tipY).toBeLessThan(195 - 11);
  });

  it('waits until 800 m before the handoff, then flashes a right-pointing offscreen cue', () => {
    const { graphics, presentation } = createPresentation();
    presentation.render(route, carrying, 5_599, 160, 640, { offsetY: 0, scaleY: 1 });
    expect(graphics.fillTriangle).not.toHaveBeenCalled();

    presentation.render(route, carrying, 5_600, 160, 640, { offsetY: 0, scaleY: 1 });
    const [upperX, upperY, , , tipX] = graphics.fillTriangle.mock.calls[0] ?? [];
    expect(tipX).toBeGreaterThan(upperX);
    expect(upperY).toBeLessThan(115);
    const firstAlpha = graphics.fillStyle.mock.calls[graphics.fillStyle.mock.calls.length - 1]?.[1];
    graphics.fillStyle.mockClear();
    presentation.render(route, carrying, 5_710, 160, 640, { offsetY: 0, scaleY: 1 });
    expect(graphics.fillStyle.mock.calls[graphics.fillStyle.mock.calls.length - 1]?.[1]).not.toBe(
      firstAlpha,
    );
  });

  it('places the downward cue above the recipient once the drop is on screen', () => {
    const { graphics, presentation } = createPresentation();
    presentation.render(route, carrying, 6_050, 160, 640, { offsetY: 0, scaleY: 1 });
    const [leftX, topY, rightX, , tipX, tipY] = graphics.fillTriangle.mock.calls[0] ?? [];
    expect(tipX).toBeCloseTo(510);
    expect(leftX).toBeLessThan(tipX);
    expect(rightX).toBeGreaterThan(tipX);
    expect(topY).toBeLessThan(tipY);
    expect(tipY).toBeLessThan(115);
  });

  it('removes the cue after a handoff', () => {
    const { graphics, presentation } = createPresentation();
    presentation.render(
      route,
      { ...carrying, phase: 'delivered', completedCount: 1 },
      6_400,
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
