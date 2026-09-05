import type { ViewportSnapshot } from '../core/ViewportService';

const PANEL_MARGIN = 12;
const PANEL_GAP = 12;
const PANEL_MAX_WIDTH = 360;
const MIN_SIDE_BY_SIDE_PANEL_WIDTH = 250;
const PERFORMANCE_HUD_TOP_MARGIN = 8;
const PERFORMANCE_HUD_SIDE_MARGIN = 8;
const PERFORMANCE_HUD_GAP = 8;

export const DIRECTOR_DIAGNOSTICS_PANEL_HEIGHT = 204;
export const DIRECTOR_PERFORMANCE_HUD_HEIGHT = 28;
export const DIRECTOR_TUNING_CONTROLS_PANEL_HEIGHT = 230;

export interface DirectorPanelPlacement {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface DirectorResponsiveLayout {
  diagnostics: DirectorPanelPlacement;
  performanceHud: DirectorPanelPlacement;
  tuningControls: DirectorPanelPlacement;
  sideBySide: boolean;
}

/** Keeps temporary Director tooling inside the safe viewport without preferring an orientation. */
export const createDirectorResponsiveLayout = (
  viewport: ViewportSnapshot,
): DirectorResponsiveLayout => {
  const safeLeft = Math.min(viewport.width, viewport.safeArea.left);
  const safeRight = Math.min(viewport.width - safeLeft, viewport.safeArea.right);
  const safeWidth = Math.max(0, viewport.width - safeLeft - safeRight);
  const availableWidth = Math.max(0, safeWidth - PANEL_MARGIN * 2);
  const sideBySideWidth = (availableWidth - PANEL_GAP) / 2;
  const sideBySide =
    viewport.orientation === 'landscape' && sideBySideWidth >= MIN_SIDE_BY_SIDE_PANEL_WIDTH;
  const panelWidth = Math.min(
    PANEL_MAX_WIDTH,
    sideBySide ? sideBySideWidth : Math.max(160, availableWidth),
  );
  const x = safeLeft + PANEL_MARGIN;
  const safeTop = Math.min(viewport.height, viewport.safeArea.top);
  const performanceHud = {
    x: safeLeft + PERFORMANCE_HUD_SIDE_MARGIN,
    y: safeTop + PERFORMANCE_HUD_TOP_MARGIN,
    width: Math.max(0, safeWidth - PERFORMANCE_HUD_SIDE_MARGIN * 2),
    height: DIRECTOR_PERFORMANCE_HUD_HEIGHT,
  };
  const y = performanceHud.y + performanceHud.height + PERFORMANCE_HUD_GAP;

  return {
    diagnostics: {
      x,
      y,
      width: panelWidth,
      height: DIRECTOR_DIAGNOSTICS_PANEL_HEIGHT,
    },
    performanceHud,
    tuningControls: {
      x: sideBySide ? x + panelWidth + PANEL_GAP : x,
      y: sideBySide ? y : y + DIRECTOR_DIAGNOSTICS_PANEL_HEIGHT + PANEL_GAP,
      width: panelWidth,
      height: DIRECTOR_TUNING_CONTROLS_PANEL_HEIGHT,
    },
    sideBySide,
  };
};
