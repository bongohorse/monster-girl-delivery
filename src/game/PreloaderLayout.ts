const HORIZONTAL_BAR_MARGIN = 32;
const MAX_BAR_WIDTH = 460;
const BAR_FRAME_PADDING = 4;
const BAR_FRAME_HEIGHT = 32;
const MIN_VISIBLE_PROGRESS_WIDTH = 4;

export interface PreloaderElementLayout {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface PreloaderLayout {
  background: PreloaderElementLayout;
  fill: PreloaderElementLayout;
  frame: PreloaderElementLayout;
  progress: number;
}

const normalizeDimension = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

const normalizeProgress = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

/** Keeps the loading presentation centered and bounded without preferring an orientation. */
export const createPreloaderLayout = (
  viewportWidth: number,
  viewportHeight: number,
  loadProgress: number,
): PreloaderLayout => {
  const width = normalizeDimension(viewportWidth);
  const height = normalizeDimension(viewportHeight);
  const progress = normalizeProgress(loadProgress);
  const centerX = width / 2;
  const centerY = height / 2;
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(0, width - HORIZONTAL_BAR_MARGIN * 2));
  const frameWidth = Math.min(width, barWidth + BAR_FRAME_PADDING * 2);
  const frameHeight = Math.min(height, BAR_FRAME_HEIGHT);
  const fillHeight = Math.max(0, frameHeight - BAR_FRAME_PADDING);
  const fillWidth = Math.min(barWidth, Math.max(MIN_VISIBLE_PROGRESS_WIDTH, barWidth * progress));

  return {
    background: { x: centerX, y: centerY, width, height },
    frame: { x: centerX, y: centerY, width: frameWidth, height: frameHeight },
    fill: {
      x: centerX - barWidth / 2,
      y: centerY,
      width: fillWidth,
      height: fillHeight,
    },
    progress,
  };
};
