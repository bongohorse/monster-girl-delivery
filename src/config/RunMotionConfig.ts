export interface RunMotionValues {
  /** Horizontal world-scroll speed magnitude in pixels per second. */
  baseScrollSpeed: number;
}

export type RunMotionUpdate = Partial<RunMotionValues>;

/** Prototype starting value only; it must remain adjustable through playtesting. */
export const PROTOTYPE_RUN_MOTION_DEFAULTS: Readonly<RunMotionValues> = Object.freeze({
  baseScrollSpeed: 350,
});

export const assertValidBaseScrollSpeed: (value: unknown) => asserts value is number = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError('baseScrollSpeed must be a non-negative finite number.');
  }
};

/** Owns the live horizontal run-motion tuning state shared by the application. */
export class RunMotionConfig {
  private snapshot: Readonly<RunMotionValues> = PROTOTYPE_RUN_MOTION_DEFAULTS;

  update(update: RunMotionUpdate): void {
    if (!('baseScrollSpeed' in update)) {
      return;
    }

    const { baseScrollSpeed } = update;
    assertValidBaseScrollSpeed(baseScrollSpeed);
    if (baseScrollSpeed === this.snapshot.baseScrollSpeed) {
      return;
    }
    this.snapshot = Object.freeze({ baseScrollSpeed });
  }

  getSnapshot(): Readonly<RunMotionValues> {
    return this.snapshot;
  }
}
