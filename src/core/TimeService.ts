export interface TimeServiceOptions {
  maxDeltaSeconds?: number;
}

export const DEFAULT_MAX_SIMULATION_DELTA_SECONDS = 0.05;

/** Owns the simulation delta and prevents inactive frames from reaching gameplay systems. */
export class TimeService {
  private readonly maxDeltaSeconds: number;
  private paused = false;
  private discardNextDelta = false;
  private simulationDeltaSeconds = 0;

  constructor(options: TimeServiceOptions = {}) {
    const maxDeltaSeconds = options.maxDeltaSeconds ?? DEFAULT_MAX_SIMULATION_DELTA_SECONDS;

    if (!Number.isFinite(maxDeltaSeconds) || maxDeltaSeconds <= 0) {
      throw new RangeError('maxDeltaSeconds must be a positive finite number.');
    }

    this.maxDeltaSeconds = maxDeltaSeconds;
  }

  update(frameDeltaMilliseconds: number): number {
    if (this.paused || this.discardNextDelta) {
      this.simulationDeltaSeconds = 0;
      this.discardNextDelta = false;
      return this.simulationDeltaSeconds;
    }

    const safeDeltaMilliseconds =
      Number.isFinite(frameDeltaMilliseconds) && frameDeltaMilliseconds > 0
        ? frameDeltaMilliseconds
        : 0;

    this.simulationDeltaSeconds = Math.min(safeDeltaMilliseconds / 1_000, this.maxDeltaSeconds);

    return this.simulationDeltaSeconds;
  }

  pause(): void {
    this.paused = true;
    this.simulationDeltaSeconds = 0;
  }

  resume(): void {
    if (!this.paused) {
      return;
    }

    this.paused = false;
    this.discardNextDelta = true;
    this.simulationDeltaSeconds = 0;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getDeltaSeconds(): number {
    return this.simulationDeltaSeconds;
  }
}
