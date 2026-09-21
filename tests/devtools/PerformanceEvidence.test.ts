import { describe, expect, it } from 'vitest';
import {
  createPerformanceEvidenceReport,
  serializePerformanceEvidenceReport,
} from '../../src/devtools/PerformanceEvidence';

describe('PerformanceEvidence', () => {
  it('captures immutable build, device, tuning, benchmark, frame-time, and Zapper evidence', () => {
    const counters = {
      broadphaseRejectedCallCount: 2,
      candidateSampleCount: 50,
      collisionCallCount: 7,
      evaluatedSampleCount: 20,
      geometryResolutionCount: 20,
      primaryNarrowphaseCheckCount: 20,
      secondaryNarrowphaseCheckCount: 9,
    };

    const runtime = {
      activeCollectibleCount: 9,
      activeHazardCount: 14,
      broadphaseWork: {
        collectibleCandidateCount: 4,
        collectibleCollisionEvaluationCount: 3,
        collectibleContactResolutionCount: 2,
        collectibleRetainedCount: 40,
        hazardCandidateCount: 6,
        hazardCollisionEvaluationCount: 8,
        hazardRetainedCount: 70,
      },
      laserPresentationCount: 2,
      presentedCollectibleCount: 9,
      presentedHazardCount: 14,
      primitiveHazardPresentationCount: 3,
      sceneGameObjectCount: 17,
      zapperPresentationCount: 9,
    };

    const report = createPerformanceEvidenceReport(
      {
        baseScrollSpeed: 350,
        buildCommit: 'abc123def456',
        buildMode: 'development',
        canvasBackingHeight: 780,
        canvasBackingWidth: 1688,
        capturedAtIso: '2026-09-19T18:00:00.000Z',
        devicePixelRatio: 2,
        directorAutoHazardsEnabled: false,
        directorGodModeEnabled: true,
        directorSimulationFrozen: false,
        effectiveScrollSpeed: 350,
        flightGravity: 1_600,
        flightMaxFallVelocity: 700,
        flightMaxRiseVelocity: 550,
        flightThrust: 2_600,
        performancePresetId: 'zapper-heavy-v1',
        renderScale: 2,
        runDistance: 1234.5,
        runSeed: 12_345,
        userAgent: 'Test Browser/1.0',
        viewportHeight: 390,
        viewportWidth: 844,
        wireframesEnabled: false,
      },
      {
        averageFrameTimeMilliseconds: 16.4,
        currentFrameTimeMilliseconds: 16.2,
        p95FrameTimeMilliseconds: 17.2,
        p99FrameTimeMilliseconds: 21.5,
        sampleCount: 300,
        slowFrameCount: 4,
        windowCapacity: 300,
        worstFrameTimeMilliseconds: 41.2,
      },
      60.1,
      60,
      counters,
      runtime,
      { targetSampleCount: 300, trigger: 'auto-window-full' },
    );

    counters.evaluatedSampleCount = 999;
    runtime.activeHazardCount = 999;
    runtime.broadphaseWork.hazardCandidateCount = 999;

    expect(report).toEqual({
      build: { commit: 'abc123def456', mode: 'development' },
      capture: {
        measuredFps: 60.1,
        fpsLimit: 60,
        frameTime: {
          averageFrameTimeMilliseconds: 16.4,
          currentFrameTimeMilliseconds: 16.2,
          p95FrameTimeMilliseconds: 17.2,
          p99FrameTimeMilliseconds: 21.5,
          sampleCount: 300,
          slowFrameCount: 4,
          windowCapacity: 300,
          worstFrameTimeMilliseconds: 41.2,
        },
        targetSampleCount: 300,
        timingSource: 'game-step-wall-clock',
        trigger: 'auto-window-full',
        runtime: {
          activeCollectibleCount: 9,
          activeHazardCount: 14,
          broadphaseWork: {
            collectibleCandidateCount: 4,
            collectibleCollisionEvaluationCount: 3,
            collectibleContactResolutionCount: 2,
            collectibleRetainedCount: 40,
            hazardCandidateCount: 6,
            hazardCollisionEvaluationCount: 8,
            hazardRetainedCount: 70,
          },
          laserPresentationCount: 2,
          presentedCollectibleCount: 9,
          presentedHazardCount: 14,
          primitiveHazardPresentationCount: 3,
          sceneGameObjectCount: 17,
          zapperPresentationCount: 9,
        },
        zapperWork: {
          broadphaseRejectedCallCount: 2,
          candidateSampleCount: 50,
          collisionCallCount: 7,
          evaluatedSampleCount: 20,
          geometryResolutionCount: 20,
          primaryNarrowphaseCheckCount: 20,
          secondaryNarrowphaseCheckCount: 9,
        },
      },
      context: {
        directorAutoHazardsEnabled: false,
        directorGodModeEnabled: true,
        directorSimulationFrozen: false,
        performancePresetId: 'zapper-heavy-v1',
        runDistance: 1234.5,
        runSeed: 12_345,
        tuning: {
          baseScrollSpeed: 350,
          effectiveScrollSpeed: 350,
          flightGravity: 1_600,
          flightMaxFallVelocity: 700,
          flightMaxRiseVelocity: 550,
          flightThrust: 2_600,
        },
        wireframesEnabled: false,
      },
      display: {
        canvasBackingHeight: 780,
        canvasBackingWidth: 1688,
        devicePixelRatio: 2,
        renderScale: 2,
        userAgent: 'Test Browser/1.0',
        viewportHeight: 390,
        viewportWidth: 844,
      },
      capturedAtIso: '2026-09-19T18:00:00.000Z',
      schemaVersion: 6,
    });
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.capture.frameTime)).toBe(true);
    expect(Object.isFrozen(report.capture.runtime)).toBe(true);
    expect(Object.isFrozen(report.capture.runtime?.broadphaseWork)).toBe(true);
    expect(Object.isFrozen(report.capture.zapperWork)).toBe(true);
    expect(Object.isFrozen(report.context.tuning)).toBe(true);
  });

  it('normalizes invalid FPS and serializes stable readable JSON', () => {
    const report = createPerformanceEvidenceReport(
      {
        baseScrollSpeed: 350,
        buildCommit: 'unknown',
        buildMode: 'production',
        canvasBackingHeight: 390,
        canvasBackingWidth: 844,
        capturedAtIso: '2026-09-19T18:00:00.000Z',
        devicePixelRatio: 1,
        directorAutoHazardsEnabled: true,
        directorGodModeEnabled: false,
        directorSimulationFrozen: false,
        effectiveScrollSpeed: 350,
        flightGravity: 1_600,
        flightMaxFallVelocity: 700,
        flightMaxRiseVelocity: 550,
        flightThrust: 2_600,
        performancePresetId: null,
        renderScale: 1,
        runDistance: 0,
        runSeed: null,
        userAgent: 'Test Browser/2.0',
        viewportHeight: 390,
        viewportWidth: 844,
        wireframesEnabled: false,
      },
      {
        averageFrameTimeMilliseconds: null,
        currentFrameTimeMilliseconds: null,
        p95FrameTimeMilliseconds: null,
        p99FrameTimeMilliseconds: null,
        sampleCount: 0,
        slowFrameCount: 0,
        windowCapacity: 300,
        worstFrameTimeMilliseconds: null,
      },
      Number.NaN,
      0,
    );

    expect(report.capture.measuredFps).toBeNull();
    expect(report.capture.targetSampleCount).toBeNull();
    expect(report.capture.trigger).toBe('manual');
    expect(report.capture.runtime).toBeNull();
    expect(report.capture.zapperWork).toBeNull();
    const serialized = serializePerformanceEvidenceReport(report);
    expect(serialized).toContain('"schemaVersion": 6');
    expect(JSON.parse(serialized)).toEqual(report);
  });
});
