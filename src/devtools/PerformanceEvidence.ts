import type { PrototypeZapperCollisionWorkCounters } from '../systems/HazardCollision';
import type { PerformanceSnapshot } from './PerformanceSampler';

export interface PerformanceEvidenceContext {
  readonly buildCommit: string;
  readonly buildMode: 'development' | 'production';
  readonly canvasBackingHeight: number;
  readonly canvasBackingWidth: number;
  readonly capturedAtIso: string;
  readonly devicePixelRatio: number;
  readonly directorAutoHazardsEnabled: boolean;
  readonly directorGodModeEnabled: boolean;
  readonly renderScale: number;
  readonly runDistance: number;
  readonly runSeed: number | null;
  readonly userAgent: string;
  readonly viewportHeight: number;
  readonly viewportWidth: number;
}

export interface PerformanceEvidenceReport {
  readonly build: {
    readonly commit: string;
    readonly mode: 'development' | 'production';
  };
  readonly capture: {
    readonly actualFps: number | null;
    readonly fpsLimit: number;
    readonly frameTime: Readonly<PerformanceSnapshot>;
    readonly zapperWork: Readonly<PrototypeZapperCollisionWorkCounters> | null;
  };
  readonly context: {
    readonly directorAutoHazardsEnabled: boolean;
    readonly directorGodModeEnabled: boolean;
    readonly runDistance: number;
    readonly runSeed: number | null;
  };
  readonly display: {
    readonly canvasBackingHeight: number;
    readonly canvasBackingWidth: number;
    readonly devicePixelRatio: number;
    readonly renderScale: number;
    readonly userAgent: string;
    readonly viewportHeight: number;
    readonly viewportWidth: number;
  };
  readonly capturedAtIso: string;
  readonly schemaVersion: 1;
}

export const createPerformanceEvidenceReport = (
  context: Readonly<PerformanceEvidenceContext>,
  snapshot: Readonly<PerformanceSnapshot>,
  actualFps: number,
  fpsLimit: number,
  zapperWork?: Readonly<PrototypeZapperCollisionWorkCounters>,
): Readonly<PerformanceEvidenceReport> =>
  Object.freeze({
    build: Object.freeze({
      commit: context.buildCommit,
      mode: context.buildMode,
    }),
    capture: Object.freeze({
      actualFps: Number.isFinite(actualFps) && actualFps > 0 ? actualFps : null,
      fpsLimit,
      frameTime: Object.freeze({ ...snapshot }),
      zapperWork: zapperWork ? Object.freeze({ ...zapperWork }) : null,
    }),
    context: Object.freeze({
      directorAutoHazardsEnabled: context.directorAutoHazardsEnabled,
      directorGodModeEnabled: context.directorGodModeEnabled,
      runDistance: context.runDistance,
      runSeed: context.runSeed,
    }),
    display: Object.freeze({
      canvasBackingHeight: context.canvasBackingHeight,
      canvasBackingWidth: context.canvasBackingWidth,
      devicePixelRatio: context.devicePixelRatio,
      renderScale: context.renderScale,
      userAgent: context.userAgent,
      viewportHeight: context.viewportHeight,
      viewportWidth: context.viewportWidth,
    }),
    capturedAtIso: context.capturedAtIso,
    schemaVersion: 1,
  });

export const serializePerformanceEvidenceReport = (
  report: Readonly<PerformanceEvidenceReport>,
): string => JSON.stringify(report, null, 2);
