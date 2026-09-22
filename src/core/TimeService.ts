export interface TimeServiceOptions {
  maxDeltaSeconds?: number;
  frameClockMilliseconds?: (() => number) | null;
}

export const DEFAULT_MAX_SIMULATION_DELTA_SECONDS = 0.05;

const getDefaultFrameClockMilliseconds = (): (() => number) | null => {
  if (
    typeof window === 'undefined' ||
    typeof performance === 'undefined' ||
    typeof performance.now !== 'function'
  ) {
    return null;
  }

  return () => performance.now();
};

/** Owns authoritative simulation elapsed time and prevents inactive frames from reaching gameplay. */
export class TimeService {
  private readonly maxDeltaSeconds: number;
  private readonly frameClockMilliseconds: (() => number) | null;
  private previousFrameClockMilliseconds: number | null = null;
  private paused = false;
  private discardNextDelta = false;
  private simulationDeltaSeconds = 0;

  constructor(options: TimeServiceOptions = {}) {
    const maxDeltaSeconds = options.maxDeltaSeconds ?? DEFAULT_MAX_SIMULATION_DELTA_SECONDS;

    if (!Number.isFinite(maxDeltaSeconds) || maxDeltaSeconds <= 0) {
      throw new RangeError('maxDeltaSeconds must be a positive finite number.');
    }

    this.maxDeltaSeconds = maxDeltaSeconds;
    this.frameClockMilliseconds =
      options.frameClockMilliseconds === undefined
        ? getDefaultFrameClockMilliseconds()
        : options.frameClockMilliseconds;
  }

  update(frameDeltaMilliseconds: number): number {
    const effectiveDeltaMilliseconds = this.resolveFrameDeltaMilliseconds(frameDeltaMilliseconds);

    if (this.paused || this.discardNextDelta) {
      this.simulationDeltaSeconds = 0;
      this.discardNextDelta = false;
      return this.simulationDeltaSeconds;
    }

    this.simulationDeltaSeconds = Math.min(
      effectiveDeltaMilliseconds / 1_000,
      this.maxDeltaSeconds,
    );

    return this.simulationDeltaSeconds;
  }

  pause(): void {
    this.paused = true;
    this.previousFrameClockMilliseconds = null;
    this.simulationDeltaSeconds = 0;
  }

  resume(): void {
    if (!this.paused) {
      return;
    }

    this.paused = false;
    this.previousFrameClockMilliseconds = null;
    this.discardNextDelta = true;
    this.simulationDeltaSeconds = 0;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getDeltaSeconds(): number {
    return this.simulationDeltaSeconds;
  }

  private resolveFrameDeltaMilliseconds(frameDeltaMilliseconds: number): number {
    const fallbackDeltaMilliseconds =
      Number.isFinite(frameDeltaMilliseconds) && frameDeltaMilliseconds > 0
        ? frameDeltaMilliseconds
        : 0;
    const clock = this.frameClockMilliseconds;
    if (!clock) {
      return fallbackDeltaMilliseconds;
    }

    const currentFrameClockMilliseconds = clock();
    if (!Number.isFinite(currentFrameClockMilliseconds)) {
      this.previousFrameClockMilliseconds = null;
      return fallbackDeltaMilliseconds;
    }

    const previousFrameClockMilliseconds = this.previousFrameClockMilliseconds;
    this.previousFrameClockMilliseconds = currentFrameClockMilliseconds;
    if (previousFrameClockMilliseconds === null) {
      return fallbackDeltaMilliseconds;
    }

    return Math.max(0, currentFrameClockMilliseconds - previousFrameClockMilliseconds);
  }
}
