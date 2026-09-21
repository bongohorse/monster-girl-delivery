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

  it('returns snapshots that cannot mutate service state', () => {
    const viewport = new ViewportService(320, 640);
    const snapshot = viewport.getSnapshot();
    snapshot.safeArea.top = 99;

    expect(viewport.getSnapshot().safeArea.top).toBe(0);
  });
});
