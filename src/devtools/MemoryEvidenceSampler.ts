import { PERFORMANCE_SLOW_FRAME_THRESHOLD_MILLISECONDS } from './PerformanceSampler';

export const MEMORY_EVIDENCE_DURATION_MILLISECONDS = 60_000;
export const MEMORY_EVIDENCE_HEAP_SAMPLE_INTERVAL_MILLISECONDS = 1_000;
export const MEMORY_EVIDENCE_MAX_FRAME_SAMPLES = 8_192;
export const MEMORY_EVIDENCE_MAX_HEAP_SAMPLES =
  MEMORY_EVIDENCE_DURATION_MILLISECONDS / MEMORY_EVIDENCE_HEAP_SAMPLE_INTERVAL_MILLISECONDS + 2;
export const MEMORY_EVIDENCE_HEAP_DROP_THRESHOLD_BYTES = 64 * 1024;

export interface ChromiumPerformanceMemory {
  readonly jsHeapSizeLimit: number;
  readonly totalJSHeapSize: number;
  readonly usedJSHeapSize: number;
}

export interface MemoryEvidenceHeapSample {
  readonly activeElapsedMilliseconds: number;
  readonly jsHeapSizeLimitBytes: number;
  readonly totalJSHeapSizeBytes: number;
  readonly usedJSHeapSizeBytes: number;
}

export interface MemoryEvidenceFrameSummary {
  readonly averageFrameTimeMilliseconds: number | null;
  readonly frameSampleCount: number;
  readonly p95FrameTimeMilliseconds: number | null;
  readonly p99FrameTimeMilliseconds: number | null;
  readonly samplesTruncated: boolean;
  readonly slowFrameCount: number;
  readonly slowFrameThresholdMilliseconds: number;
  readonly worstFrameTimeMilliseconds: number | null;
}

export interface MemoryEvidenceHeapSummary {
  readonly available: boolean;
  readonly firstUsedJSHeapSizeBytes: number | null;
  readonly heapDropCount: number;
  readonly largestHeapDropBytes: number;
  readonly lastUsedJSHeapSizeBytes: number | null;
  readonly maximumTotalJSHeapSizeBytes: number | null;
  readonly maximumUsedJSHeapSizeBytes: number | null;
  readonly minimumUsedJSHeapSizeBytes: number | null;
  readonly negativeHeapDeltaBytes: number;
  readonly positiveHeapDeltaBytes: number;
  readonly sampleCount: number;
  readonly samples: ReadonlyArray<Readonly<MemoryEvidenceHeapSample>>;
  readonly source: 'chromium-performance-memory' | 'unavailable';
}

export interface MemoryEvidenceResult {
  readonly activeDurationMilliseconds: number;
  readonly config: {
    readonly heapDropThresholdBytes: number;
    readonly heapSampleIntervalMilliseconds: number;
    readonly maxFrameSamples: number;
    readonly targetDurationMilliseconds: number;
  };
  readonly frame: Readonly<MemoryEvidenceFrameSummary>;
  readonly heap: Readonly<MemoryEvidenceHeapSummary>;
  readonly schemaVersion: 1;
}

export type ChromiumPerformanceMemoryReader = () => Readonly<ChromiumPerformanceMemory> | null;

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const readChromiumPerformanceMemory = (): Readonly<ChromiumPerformanceMemory> | null => {
  if (typeof performance === 'undefined') {
    return null;
  }

  const candidate = (performance as Performance & { memory?: Partial<ChromiumPerformanceMemory> })
    .memory;
  if (
    !candidate ||
    !isFiniteNonNegative(candidate.jsHeapSizeLimit) ||
    !isFiniteNonNegative(candidate.totalJSHeapSize) ||
    !isFiniteNonNegative(candidate.usedJSHeapSize)
  ) {
    return null;
  }

  return candidate as Readonly<ChromiumPerformanceMemory>;
};

const percentile = (sorted: ReadonlyArray<number>, fraction: number): number | null => {
  if (sorted.length === 0) {
    return null;
  }

  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? null;
};

export class MemoryEvidenceSampler {
  private readonly frameSamples = new Float64Array(MEMORY_EVIDENCE_MAX_FRAME_SAMPLES);
  private readonly heapElapsedMilliseconds = new Float64Array(MEMORY_EVIDENCE_MAX_HEAP_SAMPLES);
  private readonly heapUsedBytes = new Float64Array(MEMORY_EVIDENCE_MAX_HEAP_SAMPLES);
  private readonly heapTotalBytes = new Float64Array(MEMORY_EVIDENCE_MAX_HEAP_SAMPLES);
  private readonly heapLimitBytes = new Float64Array(MEMORY_EVIDENCE_MAX_HEAP_SAMPLES);
  private activeElapsedMilliseconds = 0;
  private frameSampleCount = 0;
  private frameSamplesTruncated = false;
  private heapSampleCount = 0;
  private nextHeapSampleAtMilliseconds = 0;
  private previousTimestampMilliseconds: number | null = null;
  private rejectNextActiveSample = false;
  private running = false;

  constructor(
    private readonly heapReader: ChromiumPerformanceMemoryReader = readChromiumPerformanceMemory,
  ) {}

  start(gameStepTimestampMilliseconds: number): void {
    if (!Number.isFinite(gameStepTimestampMilliseconds) || gameStepTimestampMilliseconds < 0) {
      throw new RangeError('Memory benchmark start timestamp must be finite and non-negative.');
    }

    this.reset();
    this.running = true;
    this.previousTimestampMilliseconds = gameStepTimestampMilliseconds;
    this.captureHeapSampleIfDue();
  }

  sample(
    gameStepTimestampMilliseconds: number,
    paused: boolean,
    discardCurrentSample = false,
  ): boolean {
    if (!this.running) {
      return false;
    }

    const previousTimestampMilliseconds = this.previousTimestampMilliseconds;
    const timestampIsValid =
      Number.isFinite(gameStepTimestampMilliseconds) && gameStepTimestampMilliseconds >= 0;
    this.previousTimestampMilliseconds = timestampIsValid ? gameStepTimestampMilliseconds : null;

    if (paused) {
      this.rejectNextActiveSample = true;
      return false;
    }
    if (discardCurrentSample) {
      this.rejectNextActiveSample = false;
      return false;
    }
    if (this.rejectNextActiveSample) {
      this.rejectNextActiveSample = false;
      return false;
    }
    if (
      !timestampIsValid ||
      previousTimestampMilliseconds === null ||
      gameStepTimestampMilliseconds <= previousTimestampMilliseconds
    ) {
      return false;
    }

    const intervalMilliseconds = gameStepTimestampMilliseconds - previousTimestampMilliseconds;
    this.activeElapsedMilliseconds += intervalMilliseconds;

    if (this.frameSampleCount < this.frameSamples.length) {
      this.frameSamples[this.frameSampleCount] = intervalMilliseconds;
      this.frameSampleCount += 1;
    } else {
      this.frameSamplesTruncated = true;
    }

    this.captureHeapSampleIfDue();

    if (this.activeElapsedMilliseconds >= MEMORY_EVIDENCE_DURATION_MILLISECONDS) {
      this.running = false;
      return true;
    }

    return false;
  }

  isRunning(): boolean {
    return this.running;
  }

  getProgress(): number {
    return Math.min(1, this.activeElapsedMilliseconds / MEMORY_EVIDENCE_DURATION_MILLISECONDS);
  }

  createResult(): Readonly<MemoryEvidenceResult> {
    const frameValues = Array.from(this.frameSamples.subarray(0, this.frameSampleCount));
    const sortedFrames = [...frameValues].sort((a, b) => a - b);
    const averageFrameTimeMilliseconds =
      frameValues.length === 0
        ? null
        : frameValues.reduce((sum, value) => sum + value, 0) / frameValues.length;
    let slowFrameCount = 0;
    let worstFrameTimeMilliseconds: number | null = null;
    for (const value of frameValues) {
      if (value > PERFORMANCE_SLOW_FRAME_THRESHOLD_MILLISECONDS) {
        slowFrameCount += 1;
      }
      worstFrameTimeMilliseconds = Math.max(worstFrameTimeMilliseconds ?? value, value);
    }

    const heapSamples: MemoryEvidenceHeapSample[] = [];
    let positiveHeapDeltaBytes = 0;
    let negativeHeapDeltaBytes = 0;
    let heapDropCount = 0;
    let largestHeapDropBytes = 0;
    let minimumUsedJSHeapSizeBytes: number | null = null;
    let maximumUsedJSHeapSizeBytes: number | null = null;
    let maximumTotalJSHeapSizeBytes: number | null = null;

    for (let index = 0; index < this.heapSampleCount; index += 1) {
      const used = this.heapUsedBytes[index] ?? 0;
      const total = this.heapTotalBytes[index] ?? 0;
      const sample = Object.freeze({
        activeElapsedMilliseconds: this.heapElapsedMilliseconds[index] ?? 0,
        jsHeapSizeLimitBytes: this.heapLimitBytes[index] ?? 0,
        totalJSHeapSizeBytes: total,
        usedJSHeapSizeBytes: used,
      });
      heapSamples.push(sample);

      minimumUsedJSHeapSizeBytes = Math.min(minimumUsedJSHeapSizeBytes ?? used, used);
      maximumUsedJSHeapSizeBytes = Math.max(maximumUsedJSHeapSizeBytes ?? used, used);
      maximumTotalJSHeapSizeBytes = Math.max(maximumTotalJSHeapSizeBytes ?? total, total);

      if (index === 0) {
        continue;
      }

      const previousUsed = this.heapUsedBytes[index - 1] ?? used;
      const delta = used - previousUsed;
      if (delta >= 0) {
        positiveHeapDeltaBytes += delta;
      } else {
        const drop = -delta;
        negativeHeapDeltaBytes += drop;
        largestHeapDropBytes = Math.max(largestHeapDropBytes, drop);
        if (drop >= MEMORY_EVIDENCE_HEAP_DROP_THRESHOLD_BYTES) {
          heapDropCount += 1;
        }
      }
    }

    return Object.freeze({
      activeDurationMilliseconds: this.activeElapsedMilliseconds,
      config: Object.freeze({
        heapDropThresholdBytes: MEMORY_EVIDENCE_HEAP_DROP_THRESHOLD_BYTES,
        heapSampleIntervalMilliseconds: MEMORY_EVIDENCE_HEAP_SAMPLE_INTERVAL_MILLISECONDS,
        maxFrameSamples: MEMORY_EVIDENCE_MAX_FRAME_SAMPLES,
        targetDurationMilliseconds: MEMORY_EVIDENCE_DURATION_MILLISECONDS,
      }),
      frame: Object.freeze({
        averageFrameTimeMilliseconds,
        frameSampleCount: this.frameSampleCount,
        p95FrameTimeMilliseconds: percentile(sortedFrames, 0.95),
        p99FrameTimeMilliseconds: percentile(sortedFrames, 0.99),
        samplesTruncated: this.frameSamplesTruncated,
        slowFrameCount,
        slowFrameThresholdMilliseconds: PERFORMANCE_SLOW_FRAME_THRESHOLD_MILLISECONDS,
        worstFrameTimeMilliseconds,
      }),
      heap: Object.freeze({
        available: heapSamples.length > 0,
        firstUsedJSHeapSizeBytes: heapSamples[0]?.usedJSHeapSizeBytes ?? null,
        heapDropCount,
        largestHeapDropBytes,
        lastUsedJSHeapSizeBytes: heapSamples[heapSamples.length - 1]?.usedJSHeapSizeBytes ?? null,
        maximumTotalJSHeapSizeBytes,
        maximumUsedJSHeapSizeBytes,
        minimumUsedJSHeapSizeBytes,
        negativeHeapDeltaBytes,
        positiveHeapDeltaBytes,
        sampleCount: heapSamples.length,
        samples: Object.freeze(heapSamples),
        source: heapSamples.length > 0 ? 'chromium-performance-memory' : 'unavailable',
      }),
      schemaVersion: 1,
    });
  }

  reset(): void {
    this.frameSamples.fill(0);
    this.heapElapsedMilliseconds.fill(0);
    this.heapUsedBytes.fill(0);
    this.heapTotalBytes.fill(0);
    this.heapLimitBytes.fill(0);
    this.activeElapsedMilliseconds = 0;
    this.frameSampleCount = 0;
    this.frameSamplesTruncated = false;
    this.heapSampleCount = 0;
    this.nextHeapSampleAtMilliseconds = 0;
    this.previousTimestampMilliseconds = null;
    this.rejectNextActiveSample = false;
    this.running = false;
  }

  private captureHeapSampleIfDue(): void {
    if (
      this.heapSampleCount >= MEMORY_EVIDENCE_MAX_HEAP_SAMPLES ||
      this.activeElapsedMilliseconds < this.nextHeapSampleAtMilliseconds
    ) {
      return;
    }

    const memory = this.heapReader();
    if (memory) {
      this.heapElapsedMilliseconds[this.heapSampleCount] = this.activeElapsedMilliseconds;
      this.heapUsedBytes[this.heapSampleCount] = memory.usedJSHeapSize;
      this.heapTotalBytes[this.heapSampleCount] = memory.totalJSHeapSize;
      this.heapLimitBytes[this.heapSampleCount] = memory.jsHeapSizeLimit;
      this.heapSampleCount += 1;
    }

    this.nextHeapSampleAtMilliseconds =
      this.activeElapsedMilliseconds + MEMORY_EVIDENCE_HEAP_SAMPLE_INTERVAL_MILLISECONDS;
  }
}
