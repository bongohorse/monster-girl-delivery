import type { InputService } from '../input/InputService';
import type { TimeService } from './TimeService';

export type PauseReason = 'blur' | 'hidden' | 'suspended';

export interface LifecycleSnapshot {
  pauseReasons: readonly PauseReason[];
  paused: boolean;
}

/** Coordinates lifecycle state without letting one resume event override another pause reason. */
export class LifecycleService {
  private readonly pauseReasons = new Set<PauseReason>();

  constructor(
    private readonly timeService: TimeService,
    private readonly inputService: InputService,
  ) {}

  pause(reason: PauseReason): void {
    this.pauseReasons.add(reason);
    this.inputService.releaseAll();
    this.timeService.pause();
  }

  resume(reason: PauseReason): void {
    this.pauseReasons.delete(reason);

    if (this.pauseReasons.size === 0) {
      this.timeService.resume();
    }
  }

  isPaused(): boolean {
    return this.pauseReasons.size > 0;
  }

  getSnapshot(): LifecycleSnapshot {
    return {
      pauseReasons: [...this.pauseReasons].sort(),
      paused: this.isPaused(),
    };
  }
}
