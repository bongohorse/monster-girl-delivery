import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { DiagnosticsAccess } from '../../src/devtools/DiagnosticsAccess';
import { DiagnosticsGestureOverlay } from '../../src/devtools/DiagnosticsGestureOverlay';

describe('DiagnosticsGestureOverlay', () => {
  it('renders live touch outlines and status colors, then destroys every display object', () => {
    const lines = Array.from({ length: 3 }, () => ({
      setDepth: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setText: vi.fn().mockReturnThis(),
      setColor: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    }));
    const circles = {
      setDepth: vi.fn().mockReturnThis(),
      clear: vi.fn(),
      lineStyle: vi.fn(),
      strokeCircle: vi.fn(),
      destroy: vi.fn(),
    };
    let nextLine = 0;
    const scene = {
      add: { text: () => lines[nextLine++], graphics: () => circles },
    } as unknown as Scene;
    const overlay = new DiagnosticsGestureOverlay(scene);
    const access = new DiagnosticsAccess(null);
    access.setEligible(true);
    overlay.layout(20, 30);
    expect(lines[0]?.setPosition).toHaveBeenCalledWith(30, 38);

    for (let id = 1; id <= 3; id += 1) access.pointerDown(id, id * 10, 100, id * 10);
    overlay.render(access.getGestureSnapshot(35));
    expect(circles.strokeCircle).toHaveBeenCalledTimes(3);
    expect(circles.strokeCircle).toHaveBeenCalledWith(30, 100, 45);
    expect(lines[0]?.setColor).toHaveBeenLastCalledWith('#ff5c64');
    access.pointerMove(3, 80, 120);
    access.pointerDown(4, 40, 100, 40);
    overlay.render(access.getGestureSnapshot(40));
    expect(circles.strokeCircle).toHaveBeenCalledWith(80, 120, 45);
    expect(lines[0]?.setColor).toHaveBeenLastCalledWith('#61e6a1');
    expect(lines[1]?.setColor).toHaveBeenLastCalledWith('#61e6a1');
    expect(lines[2]?.setColor).toHaveBeenLastCalledWith('#ff5c64');

    access.pointerDown(5, 50, 100, 50);
    circles.strokeCircle.mockClear();
    overlay.render(access.getGestureSnapshot(50));
    expect(circles.clear).toHaveBeenCalled();
    expect(circles.strokeCircle).not.toHaveBeenCalled();
    overlay.destroy();
    expect(lines.every((line) => line.destroy.mock.calls.length === 1)).toBe(true);
    expect(circles.destroy).toHaveBeenCalledOnce();
  });
});
