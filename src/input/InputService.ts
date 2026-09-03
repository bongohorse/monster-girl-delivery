export type PointerSource = 'mouse' | 'touch' | 'pen' | 'unknown';

export interface InputSnapshot {
  activePointerId: number | null;
  gameplayBlocked: boolean;
  pointerHeld: boolean;
  pointerSource: PointerSource | null;
  spaceHeld: boolean;
  thrustHeld: boolean;
}

/** Converts device state into gameplay intent without exposing Phaser input objects. */
export class InputService {
  private activePointerId: number | null = null;
  private activePointerSource: PointerSource | null = null;
  private gameplayBlocked = false;
  private spaceHeld = false;

  pressPointer(pointerId: number, source: PointerSource): void {
    if (this.gameplayBlocked || this.activePointerId !== null) {
      return;
    }

    this.activePointerId = pointerId;
    this.activePointerSource = source;
  }

  releasePointer(pointerId: number): void {
    if (pointerId !== this.activePointerId) {
      return;
    }

    this.activePointerId = null;
    this.activePointerSource = null;
  }

  cancelPointer(pointerId: number): void {
    this.releasePointer(pointerId);
  }

  setSpaceHeld(held: boolean): void {
    if (!held) {
      this.spaceHeld = false;
      return;
    }

    if (!this.gameplayBlocked) {
      this.spaceHeld = true;
    }
  }

  setGameplayBlocked(blocked: boolean): void {
    if (this.gameplayBlocked === blocked) {
      return;
    }

    this.gameplayBlocked = blocked;

    if (blocked) {
      this.releaseAll();
    }
  }

  releaseAll(): void {
    this.activePointerId = null;
    this.activePointerSource = null;
    this.spaceHeld = false;
  }

  isThrustHeld(): boolean {
    return !this.gameplayBlocked && (this.activePointerId !== null || this.spaceHeld);
  }

  getSnapshot(): InputSnapshot {
    return {
      activePointerId: this.activePointerId,
      gameplayBlocked: this.gameplayBlocked,
      pointerHeld: this.activePointerId !== null,
      pointerSource: this.activePointerSource,
      spaceHeld: this.spaceHeld,
      thrustHeld: this.isThrustHeld(),
    };
  }
}
