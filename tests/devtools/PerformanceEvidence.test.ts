import { describe, expect, it } from 'vitest';
import {
  createPerformanceEvidenceReport,
  serializePerformanceEvidenceReport,
} from '../../src/devtools/PerformanceEvidence';

describe('PerformanceEvidence', () => {
  it('captures immutable build, display, run, frame-time, and Zapper evidence', () => {
    const counters = {
      broadphaseRejectedCallCount: 2,
      candidateSampleCount: 50,
      collisionCallCount: 7,
      evaluatedSampleCount: 20,
      geometryResolutionCount: 20,
      primaryNarrowphaseCheckCount: 20,
      secondaryNarrowphaseCheckCount: 9,
    };

    const report = createPerformanceEvidenceReport(
      {
        buildCommit: 'abc123def456',
        buildMode: 'development',
        canvasBackingHeight: 780,
        canvasBackingWidth: 1688,
        capturedAtIso: '2026-09-19T18:00:00.000Z',
        devicePixelRatio: 2,
        directorAutoHazardsEnabled: false,
        directorGodModeEnabled: true,
        renderScale: 2,
        runDistance: 1234.5,
        runSeed: 12_345,
        userAgent: 'Test Browser/1.0',
        viewportHeight: 390,
        viewportWidth: 844,
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
    );

    counters.evaluatedSampleCount = 999;

    expect(report).toEqual({
      build: { commit: 'abc123def456', mode: 'development' },
      capture: {
        actualFps: 60.1,
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
        runDistance: 1234.5,
        runSeed: 12_345,
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
      schemaVersion: 1,
    });
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.capture.frameTime)).toBe(true);
    expect(Object.isFrozen(report.capture.zapperWork)).toBe(true);
  });

  it('normalizes invalid FPS and serializes stable readable JSON', () => {
    const report = createPerformanceEvidenceReport(
      {
        buildCommit: 'unknown',
        buildMode: 'production',
        canvasBackingHeight: 390,
        canvasBackingWidth: 844,
        capturedAtIso: '2026-09-19T18:00:00.000Z',
        devicePixelRatio: 1,
        directorAutoHazardsEnabled: true,
        directorGodModeEnabled: false,
        renderScale: 1,
        runDistance: 0,
        runSeed: null,
        userAgent: 'Test Browser/2.0',
        viewportHeight: 390,
        viewportWidth: 844,
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

    expect(report.capture.actualFps).toBeNull();
    expect(report.capture.zapperWork).toBeNull();
    const serialized = serializePerformanceEvidenceReport(report);
    expect(serialized).toContain('"schemaVersion": 1');
    expect(JSON.parse(serialized)).toEqual(report);
  });
});
