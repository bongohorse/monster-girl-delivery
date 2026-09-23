export const DIAGNOSTICS_STORAGE_KEY = 'mgd:diagnostics-enabled';
export const DIAGNOSTICS_REQUIRED_TOUCH_COUNT = 4;
export const DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS = 1_000;
export const DIAGNOSTICS_HOLD_MILLISECONDS = 2_000;

interface DiagnosticsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type DiagnosticsGesturePhase =
  | 'idle'
  | 'joining'
  | 'holding'
  | 'failed-await-release'
  | 'completed-await-release';

export interface DiagnosticsGestureSnapshot {
  readonly phase: DiagnosticsGesturePhase;
  readonly touchCount: number;
  readonly joinElapsedMilliseconds: number;
  readonly holdElapsedMilliseconds: number;
  readonly claimed: boolean;
}

const readPersistedDiagnosticsEnabled = (storage: DiagnosticsStorage | null): boolean => {
  if (!storage) return false;
  try {
    return storage.getItem(DIAGNOSTICS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const persistDiagnosticsEnabled = (storage: DiagnosticsStorage | null, enabled: boolean): void => {
  if (!storage) return;
  try {
    storage.setItem(DIAGNOSTICS_STORAGE_KEY, String(enabled));
  } catch {
    // Diagnostics remain usable for the current session when storage is unavailable.
  }
};

/** Owns the one-shot production diagnostics touch sequence on the death screen. */
export class DiagnosticsAccess {
  private readonly touches = new Set<number>();
  private eligible = false;
  private enabled: boolean;
  private claimed = false;
  private phase: DiagnosticsGesturePhase = 'idle';
  private startedAt: number | null = null;
  private holdStartedAt: number | null = null;
  private joinElapsed = 0;
  private holdElapsed = 0;

  constructor(private readonly storage: DiagnosticsStorage | null) {
    this.enabled = readPersistedDiagnosticsEnabled(storage);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isGestureClaimed(): boolean {
    return this.claimed;
  }

  setEligible(eligible: boolean): void {
    if (this.eligible === eligible) return;
    this.eligible = eligible;
    if (!eligible) this.resetGesture();
  }

  pointerDown(pointerId: number, nowMilliseconds: number): void {
    if (!this.eligible || !Number.isFinite(nowMilliseconds) || this.touches.has(pointerId)) return;
    this.expireJoin(nowMilliseconds);
    if (this.touches.size === 0) {
      this.phase = 'joining';
      this.startedAt = nowMilliseconds;
    }
    this.touches.add(pointerId);
    if (this.touches.size >= 2) this.claimed = true;

    if (this.phase === 'failed-await-release' || this.phase === 'completed-await-release') return;
    if (this.touches.size > DIAGNOSTICS_REQUIRED_TOUCH_COUNT) {
      this.fail();
    } else if (this.touches.size === DIAGNOSTICS_REQUIRED_TOUCH_COUNT) {
      this.joinElapsed = Math.min(
        nowMilliseconds - (this.startedAt ?? nowMilliseconds),
        DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS,
      );
      this.phase = 'holding';
      this.holdStartedAt = nowMilliseconds;
    }
  }

  pointerUp(pointerId: number): void {
    if (!this.touches.delete(pointerId)) return;
    if (this.touches.size === 0) {
      this.resetGesture();
    } else if (this.phase === 'holding') {
      this.fail();
    }
  }

  update(nowMilliseconds: number): boolean | null {
    if (!this.eligible || !Number.isFinite(nowMilliseconds)) return null;
    this.expireJoin(nowMilliseconds);
    if (this.phase !== 'holding' || this.holdStartedAt === null) return null;
    this.holdElapsed = Math.min(
      DIAGNOSTICS_HOLD_MILLISECONDS,
      Math.max(0, nowMilliseconds - this.holdStartedAt),
    );
    if (this.holdElapsed < DIAGNOSTICS_HOLD_MILLISECONDS) return null;
    this.phase = 'completed-await-release';
    this.enabled = !this.enabled;
    persistDiagnosticsEnabled(this.storage, this.enabled);
    return this.enabled;
  }

  getGestureSnapshot(nowMilliseconds: number): DiagnosticsGestureSnapshot {
    this.expireJoin(nowMilliseconds);
    const joinElapsedMilliseconds =
      this.phase === 'joining' && this.startedAt !== null && Number.isFinite(nowMilliseconds)
        ? Math.min(
            DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS,
            Math.max(0, nowMilliseconds - this.startedAt),
          )
        : this.joinElapsed;
    return {
      phase: this.phase,
      touchCount: this.touches.size,
      joinElapsedMilliseconds,
      holdElapsedMilliseconds: this.holdElapsed,
      claimed: this.claimed,
    };
  }

  resetTransientGesture(): void {
    this.resetGesture();
  }

  private expireJoin(nowMilliseconds: number): void {
    if (
      this.phase === 'joining' &&
      this.startedAt !== null &&
      Number.isFinite(nowMilliseconds) &&
      nowMilliseconds - this.startedAt > DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS
    ) {
      this.joinElapsed = DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS;
      this.fail();
    }
  }

  private fail(): void {
    this.phase = 'failed-await-release';
    this.holdStartedAt = null;
    this.holdElapsed = 0;
  }

  private resetGesture(): void {
    this.touches.clear();
    this.claimed = false;
    this.phase = 'idle';
    this.startedAt = null;
    this.holdStartedAt = null;
    this.joinElapsed = 0;
    this.holdElapsed = 0;
  }
}
