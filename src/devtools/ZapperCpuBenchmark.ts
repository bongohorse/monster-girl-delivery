import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_GRAZE_PADDING,
  PROTOTYPE_ZAPPER_LENGTHS,
  PROTOTYPE_ZAPPER_ROTATION_SPEEDS,
} from '../hazards/PrototypeZapperHazard';
import {
  createPrototypeZapperCollisionWorkCounters,
  evaluatePlayerPrototypeZapperCoreAndGrazeDuringStep,
  type PrototypeZapperCollisionWorkCounters,
} from '../systems/HazardCollision';
import { createVerticalFlightTrajectory } from '../systems/VerticalFlightSimulation';

export const ZAPPER_CPU_BENCHMARK_WARMUP_BATCH_COUNT = 5;
export const ZAPPER_CPU_BENCHMARK_MEASURED_BATCH_COUNT = 20;
export const ZAPPER_CPU_BENCHMARK_ITERATIONS_PER_BATCH = 200;
export const ZAPPER_CPU_BENCHMARK_OPERATIONS_PER_ITERATION = 3;

const FLIGHT_TUNING = Object.freeze({
  gravity: 0,
  maxFallVelocity: 1_000,
  maxRiseVelocity: 1_000,
  thrust: 0,
});
const FLIGHT_BOUNDS = Object.freeze({ ceilingY: -2_000, floorY: 2_000 });
const NO_SCROLL = Object.freeze({ baseScrollSpeed: 0 });
const NORMAL_SCROLL = Object.freeze({ baseScrollSpeed: 350 });

export interface ZapperCpuBenchmarkSummary {
  readonly maximumBatchMilliseconds: number;
  readonly medianBatchMilliseconds: number;
  readonly medianOperationsPerSecond: number;
  readonly minimumBatchMilliseconds: number;
  readonly p95BatchMilliseconds: number;
  readonly totalMeasuredMilliseconds: number;
}

export interface ZapperCpuBenchmarkResult {
  readonly batchDurationsMilliseconds: ReadonlyArray<number>;
  readonly checksum: number;
  readonly config: {
    readonly measuredBatchCount: number;
    readonly operationsPerBatch: number;
    readonly operationsPerIteration: number;
    readonly iterationsPerBatch: number;
    readonly warmupBatchCount: number;
  };
  readonly schemaVersion: 1;
  readonly summary: Readonly<ZapperCpuBenchmarkSummary>;
  readonly timingSource: 'performance.now-main-thread-elapsed';
  readonly workSignature: Readonly<PrototypeZapperCollisionWorkCounters>;
}

const createStationaryTrajectory = (positionY: number, elapsedSeconds: number) =>
  createVerticalFlightTrajectory(
    { positionY, velocityY: 0 },
    elapsedSeconds,
    false,
    FLIGHT_TUNING,
    FLIGHT_BOUNDS,
  );

const createZapper = (rotating: boolean, centerX = 0) => {
  const behavior = createPrototypeZapperBehavior(
    0,
    PROTOTYPE_ZAPPER_LENGTHS.long,
    rotating
      ? {
          direction: 'clockwise',
          speedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.fast,
        }
      : undefined,
  );
  const hitbox = createPrototypeZapperHitbox(centerX, 0, behavior);
  return Object.freeze({
    behavior,
    entryId: rotating ? 'cpu-benchmark-rotating' : 'cpu-benchmark-static',
    hitbox,
    patternEntryIndex: 0,
    patternId: 'zapper-cpu-benchmark',
    runDistance: hitbox.left,
    type: 'placeholder-barrier' as const,
  });
};

const STATIC_MISS = Object.freeze({
  elapsedSeconds: 0.1,
  hazard: createZapper(false),
  initialRunState: Object.freeze({ distance: 0, simulationSeconds: 0 }),
  runMotionTuning: NO_SCROLL,
  trajectory: createStationaryTrajectory(39, 0.1),
});

const ROTATING_DENSE_MISS = Object.freeze({
  elapsedSeconds: 0.1,
  hazard: createZapper(true, 17.5),
  initialRunState: Object.freeze({ distance: 0, simulationSeconds: 0 }),
  runMotionTuning: NORMAL_SCROLL,
  trajectory: createStationaryTrajectory(47, 0.1),
});

const ROTATING_ARC_MISS = Object.freeze({
  elapsedSeconds: 0.01,
  hazard: createZapper(true),
  initialRunState: Object.freeze({ distance: 0, simulationSeconds: 0 }),
  runMotionTuning: NO_SCROLL,
  trajectory: createStationaryTrajectory(100, 0.01),
});

type Scenario = typeof STATIC_MISS;

const SCENARIOS: ReadonlyArray<Scenario> = Object.freeze([
  STATIC_MISS,
  ROTATING_DENSE_MISS,
  ROTATING_ARC_MISS,
]);

const runScenario = (
  scenario: Scenario,
  workCounters?: PrototypeZapperCollisionWorkCounters,
): number => {
  const result = evaluatePlayerPrototypeZapperCoreAndGrazeDuringStep(
    scenario.initialRunState,
    scenario.trajectory,
    scenario.elapsedSeconds,
    scenario.runMotionTuning,
    scenario.hazard,
    PROTOTYPE_ZAPPER_GRAZE_PADDING,
    undefined,
    workCounters,
  );
  return (result.coreHit ? 1 : 0) | (result.grazeHit ? 2 : 0);
};

const runBatch = (iterations: number): number => {
  let checksum = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let scenarioIndex = 0; scenarioIndex < SCENARIOS.length; scenarioIndex += 1) {
      const scenario = SCENARIOS[scenarioIndex];
      if (scenario) {
        checksum = (checksum * 31 + runScenario(scenario)) | 0;
      }
    }
  }
  return checksum;
};

const percentileNearestRank = (sorted: ReadonlyArray<number>, percentile: number): number => {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(percentile * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
};

const median = (sorted: ReadonlyArray<number>): number => {
  if (sorted.length === 0) {
    return 0;
  }
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

export const summarizeZapperCpuBenchmark = (
  durationsMilliseconds: ReadonlyArray<number>,
  operationsPerBatch: number,
): Readonly<ZapperCpuBenchmarkSummary> => {
  const sorted = [...durationsMilliseconds].sort((a, b) => a - b);
  const medianBatchMilliseconds = median(sorted);
  const totalMeasuredMilliseconds = durationsMilliseconds.reduce((sum, value) => sum + value, 0);
  return Object.freeze({
    maximumBatchMilliseconds: sorted.at(-1) ?? 0,
    medianBatchMilliseconds,
    medianOperationsPerSecond:
      medianBatchMilliseconds > 0 ? (operationsPerBatch * 1_000) / medianBatchMilliseconds : 0,
    minimumBatchMilliseconds: sorted[0] ?? 0,
    p95BatchMilliseconds: percentileNearestRank(sorted, 0.95),
    totalMeasuredMilliseconds,
  });
};

export const runZapperCollisionCpuBenchmark = (
  now: () => number = () => performance.now(),
): Readonly<ZapperCpuBenchmarkResult> => {
  let checksum = 0;
  for (let batch = 0; batch < ZAPPER_CPU_BENCHMARK_WARMUP_BATCH_COUNT; batch += 1) {
    checksum ^= runBatch(ZAPPER_CPU_BENCHMARK_ITERATIONS_PER_BATCH);
  }

  const batchDurationsMilliseconds: number[] = [];
  for (let batch = 0; batch < ZAPPER_CPU_BENCHMARK_MEASURED_BATCH_COUNT; batch += 1) {
    const startedAt = now();
    checksum ^= runBatch(ZAPPER_CPU_BENCHMARK_ITERATIONS_PER_BATCH);
    const duration = now() - startedAt;
    if (!Number.isFinite(duration) || duration < 0) {
      throw new RangeError('Zapper CPU benchmark clock must be finite and monotonic.');
    }
    batchDurationsMilliseconds.push(duration);
  }

  const workSignature = createPrototypeZapperCollisionWorkCounters();
  for (const scenario of SCENARIOS) {
    runScenario(scenario, workSignature);
  }

  const operationsPerBatch =
    ZAPPER_CPU_BENCHMARK_ITERATIONS_PER_BATCH * ZAPPER_CPU_BENCHMARK_OPERATIONS_PER_ITERATION;

  return Object.freeze({
    batchDurationsMilliseconds: Object.freeze(batchDurationsMilliseconds),
    checksum,
    config: Object.freeze({
      measuredBatchCount: ZAPPER_CPU_BENCHMARK_MEASURED_BATCH_COUNT,
      operationsPerBatch,
      operationsPerIteration: ZAPPER_CPU_BENCHMARK_OPERATIONS_PER_ITERATION,
      iterationsPerBatch: ZAPPER_CPU_BENCHMARK_ITERATIONS_PER_BATCH,
      warmupBatchCount: ZAPPER_CPU_BENCHMARK_WARMUP_BATCH_COUNT,
    }),
    schemaVersion: 1,
    summary: summarizeZapperCpuBenchmark(batchDurationsMilliseconds, operationsPerBatch),
    timingSource: 'performance.now-main-thread-elapsed',
    workSignature: Object.freeze({ ...workSignature }),
  });
};
