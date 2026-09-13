import type { Game } from 'phaser';

export const DEFAULT_RENDER_SCALE_CAP = 2;
const MIN_RENDER_SCALE = 1;

export interface RenderResolutionSnapshot {
  readonly logicalWidth: number;
  readonly logicalHeight: number;
  readonly backingWidth: number;
  readonly backingHeight: number;
  readonly devicePixelRatio: number;
  readonly renderScale: number;
}

export interface RenderResolutionEnvironment {
  readonly document?: Document;
  readonly window?: Window;
  readonly resizeObserver?: typeof ResizeObserver;
}

export interface RenderResolutionController {
  readonly getSnapshot: () => Readonly<RenderResolutionSnapshot>;
  readonly sync: () => void;
  readonly destroy: () => void;
}

const finitePositive = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;

const firstPositive = (...values: Array<number | undefined>): number => {
  for (const value of values) {
    if (value !== undefined && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 1;
};

const resolveEnvironment = (
  environment?: RenderResolutionEnvironment,
): {
  document: Document | undefined;
  window: Window | undefined;
  resizeObserver: typeof ResizeObserver | undefined;
} => {
  const ownerDocument =
    environment?.document ?? (typeof document === 'undefined' ? undefined : document);
  const view =
    environment?.window ??
    ownerDocument?.defaultView ??
    (typeof window === 'undefined' ? undefined : window);
  const resizeObserver =
    environment?.resizeObserver ??
    (typeof ResizeObserver === 'undefined' ? undefined : ResizeObserver);

  return { document: ownerDocument, resizeObserver, window: view };
};

export const resolveRenderScale = (
  devicePixelRatio: number,
  renderScaleCap = DEFAULT_RENDER_SCALE_CAP,
): number => {
  const safeDevicePixelRatio = finitePositive(devicePixelRatio, MIN_RENDER_SCALE);
  const safeCap = Math.max(MIN_RENDER_SCALE, finitePositive(renderScaleCap, DEFAULT_RENDER_SCALE_CAP));
  return Math.min(Math.max(MIN_RENDER_SCALE, safeDevicePixelRatio), safeCap);
};

export const createRenderResolutionSnapshot = (
  logicalWidth: number,
  logicalHeight: number,
  devicePixelRatio: number,
  renderScaleCap = DEFAULT_RENDER_SCALE_CAP,
): Readonly<RenderResolutionSnapshot> => {
  const width = Math.max(1, Math.round(finitePositive(logicalWidth, 1)));
  const height = Math.max(1, Math.round(finitePositive(logicalHeight, 1)));
  const safeDevicePixelRatio = finitePositive(devicePixelRatio, MIN_RENDER_SCALE);
  const renderScale = resolveRenderScale(safeDevicePixelRatio, renderScaleCap);

  return Object.freeze({
    logicalWidth: width,
    logicalHeight: height,
    backingWidth: Math.max(1, Math.round(width * renderScale)),
    backingHeight: Math.max(1, Math.round(height * renderScale)),
    devicePixelRatio: safeDevicePixelRatio,
    renderScale,
  });
};

export const getLogicalViewportFromBacking = (
  backingWidth: number,
  backingHeight: number,
  scaleZoom: number,
): Readonly<{ width: number; height: number; renderScale: number }> => {
  const zoom = finitePositive(scaleZoom, 1);
  return Object.freeze({
    width: finitePositive(backingWidth, 1) * zoom,
    height: finitePositive(backingHeight, 1) * zoom,
    renderScale: 1 / zoom,
  });
};

export const measureRenderResolution = (
  parent: string | HTMLElement,
  renderScaleCap = DEFAULT_RENDER_SCALE_CAP,
  environment?: RenderResolutionEnvironment,
): Readonly<RenderResolutionSnapshot> => {
  const resolved = resolveEnvironment(environment);
  const parentElement =
    typeof parent === 'string' ? resolved.document?.getElementById(parent) : parent;
  const bounds = parentElement?.getBoundingClientRect();

  return createRenderResolutionSnapshot(
    firstPositive(
      bounds?.width,
      parentElement?.clientWidth,
      resolved.window?.innerWidth,
      resolved.document?.documentElement.clientWidth,
    ),
    firstPositive(
      bounds?.height,
      parentElement?.clientHeight,
      resolved.window?.innerHeight,
      resolved.document?.documentElement.clientHeight,
    ),
    resolved.window?.devicePixelRatio ?? 1,
    renderScaleCap,
  );
};

const writeRenderResolutionMetadata = (
  canvas: HTMLCanvasElement,
  snapshot: Readonly<RenderResolutionSnapshot>,
): void => {
  canvas.dataset.mgdLogicalSize = `${snapshot.logicalWidth}x${snapshot.logicalHeight}`;
  canvas.dataset.mgdBackingSize = `${snapshot.backingWidth}x${snapshot.backingHeight}`;
  canvas.dataset.mgdDevicePixelRatio = snapshot.devicePixelRatio.toFixed(2);
  canvas.dataset.mgdRenderScale = snapshot.renderScale.toFixed(2);
};

const materiallyChanged = (
  previous: Readonly<RenderResolutionSnapshot>,
  next: Readonly<RenderResolutionSnapshot>,
): boolean =>
  previous.backingWidth !== next.backingWidth ||
  previous.backingHeight !== next.backingHeight ||
  previous.renderScale !== next.renderScale;

/**
 * Keeps Phaser's backing buffer in physical-ish pixels while the CSS/gameplay viewport stays in CSS pixels.
 * The backing scale is presentation-only and must never feed simulation or generation state.
 */
export const installRenderResolutionController = (
  game: Game,
  parent: string | HTMLElement,
  renderScaleCap = DEFAULT_RENDER_SCALE_CAP,
  environment?: RenderResolutionEnvironment,
): RenderResolutionController => {
  const resolved = resolveEnvironment(environment);
  const parentElement =
    typeof parent === 'string' ? resolved.document?.getElementById(parent) : parent;
  let snapshot = measureRenderResolution(parent, renderScaleCap, environment);
  let destroyed = false;
  let dprMediaQuery: MediaQueryList | undefined;

  const sync = (): void => {
    if (destroyed) return;
    const next = measureRenderResolution(parent, renderScaleCap, environment);

    if (materiallyChanged(snapshot, next)) {
      game.scale.zoom = 1 / next.renderScale;
      snapshot = next;
      game.scale.resize(next.backingWidth, next.backingHeight);
    } else {
      snapshot = next;
    }

    writeRenderResolutionMetadata(game.canvas, snapshot);
  };

  const handleDprChange = (): void => {
    sync();
    armDprWatcher();
  };

  const armDprWatcher = (): void => {
    dprMediaQuery?.removeEventListener('change', handleDprChange);
    dprMediaQuery = undefined;
    if (!resolved.window || typeof resolved.window.matchMedia !== 'function') return;

    const dpr = finitePositive(resolved.window.devicePixelRatio, 1);
    dprMediaQuery = resolved.window.matchMedia(`(resolution: ${dpr}dppx)`);
    dprMediaQuery.addEventListener('change', handleDprChange);
  };

  let resizeObserver: ResizeObserver | undefined;
  if (parentElement && resolved.resizeObserver) {
    resizeObserver = new resolved.resizeObserver(() => {
      sync();
    });
    resizeObserver.observe(parentElement);
  }
  resolved.window?.addEventListener('resize', sync);
  resolved.window?.visualViewport?.addEventListener('resize', sync);
  armDprWatcher();
  writeRenderResolutionMetadata(game.canvas, snapshot);

  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    resizeObserver?.disconnect();
    resolved.window?.removeEventListener('resize', sync);
    resolved.window?.visualViewport?.removeEventListener('resize', sync);
    dprMediaQuery?.removeEventListener('change', handleDprChange);
    dprMediaQuery = undefined;
    game.events.off('destroy', destroy);
  };

  game.events.once('destroy', destroy);

  return {
    getSnapshot: () => snapshot,
    sync,
    destroy,
  };
};
