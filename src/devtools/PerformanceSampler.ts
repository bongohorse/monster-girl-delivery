export const PERFORMANCE_SAMPLE_WINDOW_SIZE = 300;
export const PERFORMANCE_SLOW_FRAME_THRESHOLD_MILLISECONDS = 25;

export interface PerformanceSamplerOptions {
  readonly sampleWindowSize?: number;
  readonly slowFrameThresholdMilliseconds?: number;
}

export interface PerformanceSnapshot {
  readonly averageFrameTimeMilliseconds: number | null;
  readonly currentFrameTimeMilliseconds: number | null;
  readonly p95FrameTimeMilliseconds: number | null;
  readonly p99FrameTimeMilliseconds: number | null;
  readonly sampleCount: number;
  readonly slowFrameCount: number;
  readonly windowCapacity: number;
  readonly worstFrameTimeMilliseconds: number | null;
}

const assertPositiveFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
};

/** Fixed-capacity game-step interval sampler with an allocation-free O(1) recording path. */
export class PerformanceSampler {
  private readonly samples: Float64Array;
  private readonly percentileScratch: Float64Array;
  private readonly slowFrameThresholdMilliseconds: number;
  private currentFrameTimeMilliseconds: number | null = null;
  private nextSampleIndex = 0;
  private rejectNextActiveSample = false;
  private rollingSampleCount = 0;
  private rollingSumMilliseconds = 0;
  private slowFrameCount = 0;
  private worstFrameTimeMilliseconds: number | null = null;

  constructor(options: Readonly<PerformanceSamplerOptions> = {}) {
    const sampleWindowSize = options.sampleWindowSize ?? PERFORMANCE_SAMPLE_WINDOW_SIZE;
    const slowFrameThresholdMilliseconds =
      options.slowFrameThresholdMilliseconds ?? PERFORMANCE_SLOW_FRAME_THRESHOLD_MILLISECONDS;

    if (!Number.isSafeInteger(sampleWindowSize) || sampleWindowSize <= 0) {
      throw new RangeError('Performance sampleWindowSize must be a positive safe integer.');
    }
    assertPositiveFinite(
      slowFrameThresholdMilliseconds,
      'Performance slowFrameThresholdMilliseconds',
    );

    this.samples = new Float64Array(sampleWindowSize);
    this.percentileScratch = new Float64Array(sampleWindowSize);
    this.percentileScratch.fill(Number.POSITIVE_INFINITY);
    this.slowFrameThresholdMilliseconds = slowFrameThresholdMilliseconds;
  }

  /**
   * Records one game-step wall-clock interval. Paused steps are ignored and arm one active-step
   * rejection; discardCurrentSample handles a resume step already rejected by the caller.
   */
  sample(gameStepIntervalMilliseconds: number, paused: boolean, discardCurrentSample = false): boolean {
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

    if (!Number.isFinite(gameStepIntervalMilliseconds) || gameStepIntervalMilliseconds <= 0) {
      return false;
    }

    if (this.rollingSampleCount === this.samples.length) {
      this.rollingSumMilliseconds -= this.samples[this.nextSampleIndex] ?? 0;
    } else {
      this.rollingSampleCount += 1;
    }

    this.samples[this.nextSampleIndex] = gameStepIntervalMilliseconds;
    this.nextSampleIndex = (this.nextSampleIndex + 1) % this.samples.length;
    this.rollingSumMilliseconds += gameStepIntervalMilliseconds;
    this.currentFrameTimeMilliseconds = gameStepIntervalMilliseconds;
    this.worstFrameTimeMilliseconds = Math.max(
      this.worstFrameTimeMilliseconds ?? gameStepIntervalMilliseconds,
      gameStepIntervalMilliseconds,
    );

    if (gameStepIntervalMilliseconds > this.slowFrameThresholdMilliseconds) {
      this.slowFrameCount += 1;
    }

    return true;
  }

  getSampleCount(): number {
    return this.rollingSampleCount;
  }

  getWindowCapacity(): number {
    return this.samples.length;
  }

  /** Computes distribution values only when the low-frequency HUD asks for them. */
  createSnapshot(): Readonly<PerformanceSnapshot> {
    if (this.rollingSampleCount === 0) {
      return Object.freeze({
        averageFrameTimeMilliseconds: null,
        currentFrameTimeMilliseconds: null,
        p95FrameTimeMilliseconds: null,
        p99FrameTimeMilliseconds: null,
        sampleCount: 0,
        slowFrameCount: this.slowFrameCount,
        windowCapacity: this.samples.length,
        worstFrameTimeMilliseconds: this.worstFrameTimeMilliseconds,
      });
    }

    for (let index = 0; index < this.rollingSampleCount; index += 1) {
      this.percentileScratch[index] = this.samples[index] ?? Number.POSITIVE_INFINITY;
    }
    this.percentileScratch.sort();

    return Object.freeze({
      averageFrameTimeMilliseconds: this.rollingSumMilliseconds / this.rollingSampleCount,
      currentFrameTimeMilliseconds: this.currentFrameTimeMilliseconds,
      p95FrameTimeMilliseconds:
        this.percentileScratch[Math.ceil(this.rollingSampleCount * 0.95) - 1] ?? null,
      p99FrameTimeMilliseconds:
        this.percentileScratch[Math.ceil(this.rollingSampleCount * 0.99) - 1] ?? null,
      sampleCount: this.rollingSampleCount,
      slowFrameCount: this.slowFrameCount,
      windowCapacity: this.samples.length,
      worstFrameTimeMilliseconds: this.worstFrameTimeMilliseconds,
    });
  }

  reset(): void {
    this.samples.fill(0);
    this.percentileScratch.fill(Number.POSITIVE_INFINITY);
    this.currentFrameTimeMilliseconds = null;
    this.nextSampleIndex = 0;
    this.rejectNextActiveSample = false;
    this.rollingSampleCount = 0;
    this.rollingSumMilliseconds = 0;
    this.slowFrameCount = 0;
    this.worstFrameTimeMilliseconds = null;
  }
}
