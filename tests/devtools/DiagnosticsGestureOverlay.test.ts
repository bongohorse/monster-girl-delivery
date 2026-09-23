import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { DiagnosticsAccess } from '../../src/devtools/DiagnosticsAccess';
import { DiagnosticsGestureOverlay } from '../../src/devtools/DiagnosticsGestureOverlay';

describe('DiagnosticsGestureOverlay', () => {
  it('renders finger count and timer status, then destroys all three text objects', () => {
    const lines = Array.from({ length: 3 }, () => ({
      setDepth: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setText: vi.fn().mockReturnThis(),
      setColor: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    }));
    let nextLine = 0;
    const scene = {
      add: { text: () => lines[nextLine++] },
    } as unknown as Scene;
    const overlay = new DiagnosticsGestureOverlay(scene);
    const access = new DiagnosticsAccess(null);
    access.setEligible(true);
    overlay.layout(20, 30);
    expect(lines[0]?.setPosition).toHaveBeenCalledWith(30, 38);

    for (let id = 1; id <= 3; id += 1) access.pointerDown(id, id * 10);
    overlay.render(access.getGestureSnapshot(35));
    expect(lines[0]?.setText).toHaveBeenLastCalledWith('FINGERS  3/4');
    expect(lines[0]?.setColor).toHaveBeenLastCalledWith('#ff5c64');
    access.pointerDown(4, 40);
    overlay.render(access.getGestureSnapshot(40));
    expect(lines[0]?.setText).toHaveBeenLastCalledWith('FINGERS  4/4');
    expect(lines[0]?.setColor).toHaveBeenLastCalledWith('#61e6a1');
    expect(lines[1]?.setColor).toHaveBeenLastCalledWith('#61e6a1');
    expect(lines[2]?.setColor).toHaveBeenLastCalledWith('#ff5c64');

    access.pointerDown(5, 50);
    overlay.render(access.getGestureSnapshot(50));
    expect(lines[0]?.setText).toHaveBeenLastCalledWith('FINGERS  5/4');
    expect(lines[0]?.setColor).toHaveBeenLastCalledWith('#ff5c64');
    overlay.destroy();
    expect(lines.every((line) => line.destroy.mock.calls.length === 1)).toBe(true);
  });
});
