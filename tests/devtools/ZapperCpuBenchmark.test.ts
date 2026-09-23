import { describe, expect, it } from 'vitest';
import {
  runZapperCollisionCpuBenchmark,
  summarizeZapperCpuBenchmark,
  ZAPPER_CPU_BENCHMARK_ITERATIONS_PER_BATCH,
  ZAPPER_CPU_BENCHMARK_MEASURED_BATCH_COUNT,
  ZAPPER_CPU_BENCHMARK_OPERATIONS_PER_ITERATION,
  ZAPPER_CPU_BENCHMARK_WARMUP_BATCH_COUNT,
} from '../../src/devtools/ZapperCpuBenchmark';

describe('ZapperCpuBenchmark', () => {
  it('summarizes batch timing with median, nearest-rank P95 and throughput', () => {
    const summary = summarizeZapperCpuBenchmark([10, 20, 30, 40, 50], 100);

    expect(summary).toEqual({
      maximumBatchMilliseconds: 50,
      medianBatchMilliseconds: 30,
      medianOperationsPerSecond: 100_000 / 30,
      minimumBatchMilliseconds: 10,
      p95BatchMilliseconds: 50,
      totalMeasuredMilliseconds: 150,
    });
  });

  it('runs a fixed warmup/measured workload without depending on frame pacing', () => {
    let timestamp = 0;
    const result = runZapperCollisionCpuBenchmark(() => {
      timestamp += 5;
      return timestamp;
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.timingSource).toBe('performance.now-main-thread-elapsed');
    expect(result.config).toEqual({
      measuredBatchCount: ZAPPER_CPU_BENCHMARK_MEASURED_BATCH_COUNT,
      operationsPerBatch:
        ZAPPER_CPU_BENCHMARK_ITERATIONS_PER_BATCH * ZAPPER_CPU_BENCHMARK_OPERATIONS_PER_ITERATION,
      operationsPerIteration: ZAPPER_CPU_BENCHMARK_OPERATIONS_PER_ITERATION,
      iterationsPerBatch: ZAPPER_CPU_BENCHMARK_ITERATIONS_PER_BATCH,
      warmupBatchCount: ZAPPER_CPU_BENCHMARK_WARMUP_BATCH_COUNT,
    });
    expect(result.batchDurationsMilliseconds).toHaveLength(
      ZAPPER_CPU_BENCHMARK_MEASURED_BATCH_COUNT,
    );
    expect(result.batchDurationsMilliseconds.every((duration) => duration === 5)).toBe(true);
    expect(result.summary.medianBatchMilliseconds).toBe(5);
    expect(result.workSignature.collisionCallCount).toBe(3);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.batchDurationsMilliseconds)).toBe(true);
    expect(Object.isFrozen(result.workSignature)).toBe(true);
  });
});
