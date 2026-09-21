import { describe, expect, it } from 'vitest';
import { PerformanceSampler } from '../../src/devtools/PerformanceSampler';

describe('PerformanceSampler', () => {
  it('exposes allocation-free bounded-window progress', () => {
    const sampler = new PerformanceSampler();

    expect(sampler.getSampleCount()).toBe(0);
    expect(sampler.getWindowCapacity()).toBe(300);
    sampler.sample(16, false);
    expect(sampler.getSampleCount()).toBe(1);
    expect(sampler.getWindowCapacity()).toBe(300);
  });

  it('evicts a wrapped rolling window while retaining session-wide worst and slow counts', () => {
    const sampler = new PerformanceSampler({
      sampleWindowSize: 3,
      slowFrameThresholdMilliseconds: 25,
    });

    for (const sample of [100, 1, 2, 3]) {
      expect(sampler.sample(sample, false)).toBe(true);
    }

    expect(sampler.createSnapshot()).toEqual({
      averageFrameTimeMilliseconds: 2,
      currentFrameTimeMilliseconds: 3,
      p95FrameTimeMilliseconds: 3,
      p99FrameTimeMilliseconds: 3,
      sampleCount: 3,
      slowFrameCount: 1,
      windowCapacity: 3,
      worstFrameTimeMilliseconds: 100,
    });
  });

  it('calculates nearest-rank P95 and P99 only when a snapshot is requested', () => {
    const sampler = new PerformanceSampler({ sampleWindowSize: 100 });

    for (let sample = 100; sample >= 1; sample -= 1) {
      sampler.sample(sample, false);
    }

    expect(sampler.createSnapshot()).toMatchObject({
      averageFrameTimeMilliseconds: 50.5,
      p95FrameTimeMilliseconds: 95,
      p99FrameTimeMilliseconds: 99,
      sampleCount: 100,
    });
  });

  it('reports immutable empty and partially populated snapshots', () => {
    const sampler = new PerformanceSampler({ sampleWindowSize: 5 });
    const empty = sampler.createSnapshot();

    expect(empty).toEqual({
      averageFrameTimeMilliseconds: null,
      currentFrameTimeMilliseconds: null,
      p95FrameTimeMilliseconds: null,
      p99FrameTimeMilliseconds: null,
      sampleCount: 0,
      slowFrameCount: 0,
      windowCapacity: 5,
      worstFrameTimeMilliseconds: null,
    });
    expect(Object.isFrozen(empty)).toBe(true);

    sampler.sample(10, false);
    sampler.sample(20, false);
    expect(sampler.createSnapshot()).toMatchObject({
      averageFrameTimeMilliseconds: 15,
      currentFrameTimeMilliseconds: 20,
      p95FrameTimeMilliseconds: 20,
      p99FrameTimeMilliseconds: 20,
      sampleCount: 2,
    });
  });

  it('rejects invalid samples without changing statistics', () => {
    const sampler = new PerformanceSampler();

    for (const sample of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(sampler.sample(sample, false)).toBe(false);
    }

    expect(sampler.createSnapshot().sampleCount).toBe(0);
  });

  it('counts only frames strictly above the configured slow-frame threshold', () => {
    const sampler = new PerformanceSampler({ slowFrameThresholdMilliseconds: 25 });

    sampler.sample(25, false);
    sampler.sample(25.01, false);

    expect(sampler.createSnapshot().slowFrameCount).toBe(1);
  });

  it('ignores paused frames and the first active sample after a lifecycle interruption', () => {
    const sampler = new PerformanceSampler();

    sampler.sample(16, false);
    expect(sampler.sample(5_000, true)).toBe(false);
    expect(sampler.sample(4_000, true)).toBe(false);
    expect(sampler.sample(3_000, false)).toBe(false);
    expect(sampler.sample(17, false)).toBe(true);

    expect(sampler.createSnapshot()).toMatchObject({
      averageFrameTimeMilliseconds: 16.5,
      currentFrameTimeMilliseconds: 17,
      sampleCount: 2,
      slowFrameCount: 0,
      worstFrameTimeMilliseconds: 17,
    });
  });

  it('can discard a resume sample already identified by the simulation lifecycle gate', () => {
    const sampler = new PerformanceSampler();

    sampler.sample(16, false);
    sampler.sample(2_000, true);
    expect(sampler.sample(2_500, false, true)).toBe(false);
    expect(sampler.sample(18, false)).toBe(true);

    expect(sampler.createSnapshot()).toMatchObject({
      sampleCount: 2,
      worstFrameTimeMilliseconds: 18,
    });
  });

  it('resets rolling and session-wide measurements without replacing its capacity', () => {
    const sampler = new PerformanceSampler({ sampleWindowSize: 3 });
    sampler.sample(30, false);
    sampler.sample(40, false);

    sampler.reset();

    expect(sampler.createSnapshot()).toEqual({
      averageFrameTimeMilliseconds: null,
      currentFrameTimeMilliseconds: null,
      p95FrameTimeMilliseconds: null,
      p99FrameTimeMilliseconds: null,
      sampleCount: 0,
      slowFrameCount: 0,
      windowCapacity: 3,
      worstFrameTimeMilliseconds: null,
    });
  });

  it('rejects invalid fixed-buffer configuration', () => {
    for (const sampleWindowSize of [0, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => new PerformanceSampler({ sampleWindowSize })).toThrow(RangeError);
    }
    for (const slowFrameThresholdMilliseconds of [0, -1, Number.NaN]) {
      expect(() => new PerformanceSampler({ slowFrameThresholdMilliseconds })).toThrow(RangeError);
    }
  });
});
