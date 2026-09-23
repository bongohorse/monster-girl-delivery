export const DIAGNOSTICS_STORAGE_KEY = 'mgd:diagnostics-enabled';
export const DIAGNOSTICS_REQUIRED_TOUCH_COUNT = 5;
export const DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS = 450;
export const DIAGNOSTICS_HOLD_MILLISECONDS = 2_000;
export const DIAGNOSTICS_MAX_MOVEMENT_PIXELS = 32;

interface DiagnosticsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface TrackedTouch {
  readonly startX: number;
  readonly startY: number;
}

const readPersistedDiagnosticsEnabled = (storage: DiagnosticsStorage | null): boolean => {
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(DIAGNOSTICS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const persistDiagnosticsEnabled = (storage: DiagnosticsStorage | null, enabled: boolean): void => {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(DIAGNOSTICS_STORAGE_KEY, String(enabled));
  } catch {
    // Diagnostics remain usable for the current session when storage is unavailable.
  }
};

/**
 * Pure state owner for the hidden production diagnostics gesture.
 *
 * It deliberately does not know about Phaser or gameplay input. Foundation feeds touch
 * contacts into it only while the run-end screen is retry-ready, then uses
 * isGestureClaimed() to suppress the ordinary single-touch retry path.
 */
export class DiagnosticsAccess {
  private readonly touches = new Map<number, TrackedTouch>();
  private eligible = false;
  private enabled: boolean;
  private gestureClaimed = false;
  private gestureInvalid = false;
  private gestureStartedAtMilliseconds: number | null = null;
  private holdStartedAtMilliseconds: number | null = null;
  private toggledForCurrentGesture = false;

  constructor(private readonly storage: DiagnosticsStorage | null) {
    this.enabled = readPersistedDiagnosticsEnabled(storage);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isGestureClaimed(): boolean {
    return this.gestureClaimed;
  }

  setEligible(eligible: boolean): void {
    if (this.eligible === eligible) {
      return;
    }

    this.eligible = eligible;
    if (!eligible) {
      this.resetGesture();
    }
  }

  pointerDown(pointerId: number, x: number, y: number, nowMilliseconds: number): void {
    if (!this.eligible || !Number.isFinite(nowMilliseconds) || this.touches.has(pointerId)) {
      return;
    }

    if (this.touches.size === 0) {
      this.gestureStartedAtMilliseconds = nowMilliseconds;
      this.gestureInvalid = false;
      this.toggledForCurrentGesture = false;
    }

    const gestureStartedAtMilliseconds = this.gestureStartedAtMilliseconds;
    if (
      gestureStartedAtMilliseconds === null ||
      nowMilliseconds - gestureStartedAtMilliseconds > DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS
    ) {
      this.gestureInvalid = true;
      this.holdStartedAtMilliseconds = null;
    }

    this.touches.set(pointerId, { startX: x, startY: y });

    if (this.touches.size >= 2) {
      this.gestureClaimed = true;
    }

    if (this.touches.size > DIAGNOSTICS_REQUIRED_TOUCH_COUNT) {
      this.gestureInvalid = true;
      this.holdStartedAtMilliseconds = null;
      return;
    }

    if (this.touches.size === DIAGNOSTICS_REQUIRED_TOUCH_COUNT && !this.gestureInvalid) {
      this.holdStartedAtMilliseconds = nowMilliseconds;
    }
  }

  pointerMove(pointerId: number, x: number, y: number): void {
    const touch = this.touches.get(pointerId);
    if (!touch || this.gestureInvalid) {
      return;
    }

    const deltaX = x - touch.startX;
    const deltaY = y - touch.startY;
    if (
      deltaX * deltaX + deltaY * deltaY >
      DIAGNOSTICS_MAX_MOVEMENT_PIXELS * DIAGNOSTICS_MAX_MOVEMENT_PIXELS
    ) {
      this.gestureInvalid = true;
      this.holdStartedAtMilliseconds = null;
    }
  }

  pointerUp(pointerId: number): void {
    if (!this.touches.delete(pointerId)) {
      return;
    }

    if (!this.toggledForCurrentGesture && this.touches.size < DIAGNOSTICS_REQUIRED_TOUCH_COUNT) {
      this.holdStartedAtMilliseconds = null;
    }

    if (this.touches.size === 0) {
      this.resetGesture();
    }
  }

  update(nowMilliseconds: number): boolean | null {
    if (
      !this.eligible ||
      this.gestureInvalid ||
      this.toggledForCurrentGesture ||
      this.touches.size !== DIAGNOSTICS_REQUIRED_TOUCH_COUNT ||
      this.holdStartedAtMilliseconds === null ||
      !Number.isFinite(nowMilliseconds) ||
      nowMilliseconds - this.holdStartedAtMilliseconds < DIAGNOSTICS_HOLD_MILLISECONDS
    ) {
      return null;
    }

    this.toggledForCurrentGesture = true;
    this.enabled = !this.enabled;
    persistDiagnosticsEnabled(this.storage, this.enabled);
    return this.enabled;
  }

  resetTransientGesture(): void {
    this.resetGesture();
  }

  private resetGesture(): void {
    this.touches.clear();
    this.gestureClaimed = false;
    this.gestureInvalid = false;
    this.gestureStartedAtMilliseconds = null;
    this.holdStartedAtMilliseconds = null;
    this.toggledForCurrentGesture = false;
  }
}
