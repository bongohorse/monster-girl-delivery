import { describe, expect, it } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import { createDirectorResponsiveLayout } from '../../src/devtools/DirectorResponsiveLayout';

describe('Director responsive layout', () => {
  it('stacks diagnostics and tuning controls in portrait', () => {
    const viewport = new ViewportService(390, 844).getSnapshot();
    const layout = createDirectorResponsiveLayout(viewport);

    expect(layout.sideBySide).toBe(false);
    expect(layout.diagnostics).toEqual({ x: 12, y: 12, width: 360, height: 164 });
    expect(layout.flightControls).toEqual({ x: 12, y: 188, width: 360, height: 196 });
  });

  it('places panels side by side in representative landscape space', () => {
    const viewport = new ViewportService(844, 390, {
      top: 0,
      right: 44,
      bottom: 21,
      left: 44,
    }).getSnapshot();
    const layout = createDirectorResponsiveLayout(viewport);

    expect(layout.sideBySide).toBe(true);
    expect(layout.diagnostics).toEqual({ x: 56, y: 12, width: 360, height: 164 });
    expect(layout.flightControls).toEqual({ x: 428, y: 12, width: 360, height: 196 });
  });

  it('keeps narrow portrait panels inside the available width', () => {
    const viewport = new ViewportService(320, 568, {
      top: 20,
      right: 8,
      bottom: 16,
      left: 8,
    }).getSnapshot();
    const layout = createDirectorResponsiveLayout(viewport);

    expect(layout.sideBySide).toBe(false);
    expect(layout.diagnostics.x).toBe(20);
    expect(layout.diagnostics.width).toBe(280);
    expect(layout.flightControls.x).toBe(20);
    expect(layout.flightControls.width).toBe(280);
    expect(layout.flightControls.y).toBe(208);
  });
});
