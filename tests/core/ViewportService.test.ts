import { describe, expect, it } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';

describe('ViewportService', () => {
  it('reports orientation from current dimensions without locking it', () => {
    const viewport = new ViewportService(390, 844);
    expect(viewport.getSnapshot().orientation).toBe('portrait');

    viewport.resize(844, 390);
    expect(viewport.getSnapshot().orientation).toBe('landscape');
  });

  it('tracks safe-area insets and sanitizes invalid values', () => {
    const viewport = new ViewportService(390, 844, {
      top: 47,
      right: Number.NaN,
      bottom: 34,
      left: -4,
    });

    expect(viewport.getSnapshot().safeArea).toEqual({
      top: 47,
      right: 0,
      bottom: 34,
      left: 0,
    });
  });

  it('reuses deeply immutable snapshots until resize', () => {
    const viewport = new ViewportService(320, 640);
    const snapshot = viewport.getSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.safeArea)).toBe(true);
    expect(Reflect.set(snapshot.safeArea, 'top', 99)).toBe(false);
    expect(viewport.getSnapshot()).toBe(snapshot);
    expect(viewport.getSnapshot().safeArea.top).toBe(0);

    viewport.resize(640, 320);
    const resized = viewport.getSnapshot();

    expect(resized).not.toBe(snapshot);
    expect(resized.orientation).toBe('landscape');
    expect(viewport.getSnapshot()).toBe(resized);
  });
});
