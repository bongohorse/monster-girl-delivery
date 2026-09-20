import type { PrototypeZapperCollisionWorkCounters } from '../systems/HazardCollision';
import type { PerformanceSnapshot } from './PerformanceSampler';

export interface PerformanceRuntimeMetrics {
  readonly activeCollectibleCount: number;
  readonly activeHazardCount: number;
  readonly laserPresentationCount: number;
  readonly presentedCollectibleCount: number;
  readonly presentedHazardCount: number;
  readonly primitiveHazardPresentationCount: number;
  readonly sceneGameObjectCount: number;
  readonly zapperPresentationCount: number;
}

export interface PerformanceEvidenceContext {
  readonly baseScrollSpeed: number;
  readonly buildCommit: string;
  readonly buildMode: 'development' | 'production';
  readonly canvasBackingHeight: number;
  readonly canvasBackingWidth: number;
  readonly capturedAtIso: string;
  readonly devicePixelRatio: number;
  readonly directorAutoHazardsEnabled: boolean;
  readonly directorGodModeEnabled: boolean;
  readonly directorSimulationFrozen: boolean;
  readonly effectiveScrollSpeed: number;
  readonly flightGravity: number;
  readonly flightMaxFallVelocity: number;
  readonly flightMaxRiseVelocity: number;
  readonly flightThrust: number;
  readonly performancePresetId: string | null;
  readonly renderScale: number;
  readonly runDistance: number;
  readonly runSeed: number | null;
  readonly userAgent: string;
  readonly viewportHeight: number;
  readonly viewportWidth: number;
  readonly wireframesEnabled: boolean;
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
    readonly runtime: Readonly<PerformanceRuntimeMetrics> | null;
    readonly zapperWork: Readonly<PrototypeZapperCollisionWorkCounters> | null;
  };
  readonly context: {
    readonly directorAutoHazardsEnabled: boolean;
    readonly directorGodModeEnabled: boolean;
    readonly directorSimulationFrozen: boolean;
    readonly performancePresetId: string | null;
    readonly runDistance: number;
    readonly runSeed: number | null;
    readonly tuning: {
      readonly baseScrollSpeed: number;
      readonly effectiveScrollSpeed: number;
      readonly flightGravity: number;
      readonly flightMaxFallVelocity: number;
      readonly flightMaxRiseVelocity: number;
      readonly flightThrust: number;
    };
    readonly wireframesEnabled: boolean;
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
  readonly schemaVersion: 3;
}

export const createPerformanceEvidenceReport = (
  context: Readonly<PerformanceEvidenceContext>,
  snapshot: Readonly<PerformanceSnapshot>,
  actualFps: number,
  fpsLimit: number,
  zapperWork?: Readonly<PrototypeZapperCollisionWorkCounters>,
  runtime?: Readonly<PerformanceRuntimeMetrics>,
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
      runtime: runtime ? Object.freeze({ ...runtime }) : null,
      zapperWork: zapperWork ? Object.freeze({ ...zapperWork }) : null,
    }),
    context: Object.freeze({
      directorAutoHazardsEnabled: context.directorAutoHazardsEnabled,
      directorGodModeEnabled: context.directorGodModeEnabled,
      directorSimulationFrozen: context.directorSimulationFrozen,
      performancePresetId: context.performancePresetId,
      runDistance: context.runDistance,
      runSeed: context.runSeed,
      tuning: Object.freeze({
        baseScrollSpeed: context.baseScrollSpeed,
        effectiveScrollSpeed: context.effectiveScrollSpeed,
        flightGravity: context.flightGravity,
        flightMaxFallVelocity: context.flightMaxFallVelocity,
        flightMaxRiseVelocity: context.flightMaxRiseVelocity,
        flightThrust: context.flightThrust,
      }),
      wireframesEnabled: context.wireframesEnabled,
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
    schemaVersion: 3,
  });

export const serializePerformanceEvidenceReport = (
  report: Readonly<PerformanceEvidenceReport>,
): string => JSON.stringify(report, null, 2);
