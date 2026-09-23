import { describe, expect, it, vi } from 'vitest';
import {
  MEMORY_EVIDENCE_DURATION_MILLISECONDS,
  MEMORY_EVIDENCE_HEAP_DROP_THRESHOLD_BYTES,
  MemoryEvidenceSampler,
} from '../../src/devtools/MemoryEvidenceSampler';

const createMemoryReader = (values: number[]) => {
  let index = 0;
  return () => {
    const usedJSHeapSize = values[Math.min(index, values.length - 1)] ?? 1_000_000;
    index += 1;
    return {
      jsHeapSizeLimit: 256_000_000,
      totalJSHeapSize: 32_000_000,
      usedJSHeapSize,
    };
  };
};

describe('MemoryEvidenceSampler', () => {
  it('captures a bounded active-time frame window and periodic Chromium heap samples', () => {
    const sampler = new MemoryEvidenceSampler(
      createMemoryReader([10_000_000, 10_500_000, 9_500_000, 10_250_000]),
    );
    sampler.start(0);

    for (let elapsed = 1_000; elapsed <= MEMORY_EVIDENCE_DURATION_MILLISECONDS; elapsed += 1_000) {
      sampler.sample(elapsed, false);
    }

    expect(sampler.isRunning()).toBe(false);
    expect(sampler.getProgress()).toBe(1);

    const result = sampler.createResult();
    expect(result.activeDurationMilliseconds).toBe(MEMORY_EVIDENCE_DURATION_MILLISECONDS);
    expect(result.config).toMatchObject({
      heapDropThresholdBytes: MEMORY_EVIDENCE_HEAP_DROP_THRESHOLD_BYTES,
      targetDurationMilliseconds: MEMORY_EVIDENCE_DURATION_MILLISECONDS,
    });
    expect(result.frame.frameSampleCount).toBe(60);
    expect(result.frame.averageFrameTimeMilliseconds).toBe(1_000);
    expect(result.frame.slowFrameCount).toBe(60);
    expect(result.frame.samplesTruncated).toBe(false);
    expect(result.heap.available).toBe(true);
    expect(result.heap.sampleCount).toBeGreaterThanOrEqual(4);
    expect(result.heap.source).toBe('chromium-performance-memory');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.heap.samples)).toBe(true);
  });

  it('treats heap decreases as allocation-pressure evidence without calling them GC events', () => {
    const drop = MEMORY_EVIDENCE_HEAP_DROP_THRESHOLD_BYTES + 10_000;
    const sampler = new MemoryEvidenceSampler(
      createMemoryReader([1_000_000, 1_500_000, 1_500_000 - drop]),
    );
    sampler.start(0);
    sampler.sample(1_000, false);
    sampler.sample(2_000, false);

    const heap = sampler.createResult().heap;
    expect(heap.positiveHeapDeltaBytes).toBe(500_000);
    expect(heap.negativeHeapDeltaBytes).toBe(drop);
    expect(heap.heapDropCount).toBe(1);
    expect(heap.largestHeapDropBytes).toBe(drop);
  });

  it('excludes lifecycle pause/resume transitions from active duration and frame samples', () => {
    const sampler = new MemoryEvidenceSampler(createMemoryReader([1_000_000]));
    sampler.start(0);

    sampler.sample(16, false);
    sampler.sample(1_016, true);
    sampler.sample(2_016, false);
    sampler.sample(2_032, false);

    const result = sampler.createResult();
    expect(result.activeDurationMilliseconds).toBe(32);
    expect(result.frame.frameSampleCount).toBe(2);
    expect(result.frame.averageFrameTimeMilliseconds).toBe(16);
  });

  it('does not burst heap reads to catch up after a long frame stall', () => {
    const reader = vi.fn(() => ({
      jsHeapSizeLimit: 256_000_000,
      totalJSHeapSize: 32_000_000,
      usedJSHeapSize: 10_000_000,
    }));
    const sampler = new MemoryEvidenceSampler(reader);
    sampler.start(0);
    expect(reader).toHaveBeenCalledTimes(1);

    sampler.sample(5_000, false);
    expect(reader).toHaveBeenCalledTimes(2);

    sampler.sample(5_016, false);
    sampler.sample(5_032, false);
    expect(reader).toHaveBeenCalledTimes(2);

    sampler.sample(6_000, false);
    expect(reader).toHaveBeenCalledTimes(3);
  });

  it('reports unavailable heap evidence explicitly when Chromium memory is absent', () => {
    const sampler = new MemoryEvidenceSampler(() => null);
    sampler.start(0);
    sampler.sample(16, false);

    const heap = sampler.createResult().heap;
    expect(heap).toMatchObject({
      available: false,
      firstUsedJSHeapSizeBytes: null,
      lastUsedJSHeapSizeBytes: null,
      sampleCount: 0,
      source: 'unavailable',
    });
  });

  it('rejects invalid benchmark start timestamps', () => {
    const sampler = new MemoryEvidenceSampler();
    expect(() => sampler.start(Number.NaN)).toThrow(RangeError);
    expect(() => sampler.start(-1)).toThrow(RangeError);
  });
});
