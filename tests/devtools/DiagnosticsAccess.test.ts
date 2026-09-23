import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTICS_HOLD_MILLISECONDS,
  DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS,
  DIAGNOSTICS_STORAGE_KEY,
  DiagnosticsAccess,
} from '../../src/devtools/DiagnosticsAccess';

const createStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    values,
  };
};

const putFiveTouchesDown = (access: DiagnosticsAccess, startedAt = 1_000): number => {
  for (let index = 0; index < 5; index += 1) {
    access.pointerDown(index + 1, 100 + index * 10, 100, startedAt + index * 20);
  }
  return startedAt + 80;
};

describe('DiagnosticsAccess', () => {
  it('restores and persists diagnostics state', () => {
    const storage = createStorage({ [DIAGNOSTICS_STORAGE_KEY]: 'true' });
    const access = new DiagnosticsAccess(storage);

    expect(access.isEnabled()).toBe(true);

    access.setEligible(true);
    const holdStartedAt = putFiveTouchesDown(access);
    expect(access.update(holdStartedAt + DIAGNOSTICS_HOLD_MILLISECONDS)).toBe(false);
    expect(access.isEnabled()).toBe(false);
    expect(storage.values.get(DIAGNOSTICS_STORAGE_KEY)).toBe('false');
  });

  it('requires five touches inside the join window and a full hold', () => {
    const storage = createStorage();
    const access = new DiagnosticsAccess(storage);
    access.setEligible(true);

    const holdStartedAt = putFiveTouchesDown(access);
    expect(access.isGestureClaimed()).toBe(true);
    expect(access.update(holdStartedAt + DIAGNOSTICS_HOLD_MILLISECONDS - 1)).toBeNull();
    expect(access.isEnabled()).toBe(false);

    expect(access.update(holdStartedAt + DIAGNOSTICS_HOLD_MILLISECONDS)).toBe(true);
    expect(access.isEnabled()).toBe(true);

    // One continuous hold toggles only once.
    expect(access.update(holdStartedAt + DIAGNOSTICS_HOLD_MILLISECONDS + 5_000)).toBeNull();
    expect(access.isEnabled()).toBe(true);
  });

  it('does not claim a normal single-touch retry gesture', () => {
    const access = new DiagnosticsAccess(createStorage());
    access.setEligible(true);

    access.pointerDown(1, 50, 60, 100);
    expect(access.isGestureClaimed()).toBe(false);
    expect(access.update(10_000)).toBeNull();

    access.pointerUp(1);
    expect(access.isGestureClaimed()).toBe(false);
  });

  it('claims multi-touch attempts so gameplay retry can be suppressed', () => {
    const access = new DiagnosticsAccess(createStorage());
    access.setEligible(true);

    access.pointerDown(1, 0, 0, 100);
    access.pointerDown(2, 10, 0, 110);

    expect(access.isGestureClaimed()).toBe(true);

    access.pointerUp(1);
    expect(access.isGestureClaimed()).toBe(true);
    access.pointerUp(2);
    expect(access.isGestureClaimed()).toBe(false);
  });

  it('rejects slow joins, movement, and more than five touches', () => {
    const slow = new DiagnosticsAccess(createStorage());
    slow.setEligible(true);
    slow.pointerDown(1, 0, 0, 0);
    for (let index = 2; index <= 5; index += 1) {
      slow.pointerDown(index, index * 10, 0, DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS + index);
    }
    expect(slow.update(10_000)).toBeNull();

    const moved = new DiagnosticsAccess(createStorage());
    moved.setEligible(true);
    const movedHoldStartedAt = putFiveTouchesDown(moved);
    moved.pointerMove(3, 1_000, 1_000);
    expect(moved.update(movedHoldStartedAt + DIAGNOSTICS_HOLD_MILLISECONDS)).toBeNull();

    const tooMany = new DiagnosticsAccess(createStorage());
    tooMany.setEligible(true);
    const tooManyHoldStartedAt = putFiveTouchesDown(tooMany);
    tooMany.pointerDown(6, 200, 100, tooManyHoldStartedAt + 1);
    expect(tooMany.update(tooManyHoldStartedAt + DIAGNOSTICS_HOLD_MILLISECONDS)).toBeNull();
  });

  it('is inert when the results screen is not eligible', () => {
    const access = new DiagnosticsAccess(createStorage());

    putFiveTouchesDown(access);
    expect(access.isGestureClaimed()).toBe(false);
    expect(access.update(100_000)).toBeNull();

    access.setEligible(true);
    const holdStartedAt = putFiveTouchesDown(access, 200_000);
    access.setEligible(false);
    expect(access.update(holdStartedAt + DIAGNOSTICS_HOLD_MILLISECONDS)).toBeNull();
    expect(access.isGestureClaimed()).toBe(false);
  });

  it('keeps working for the current session when storage throws', () => {
    const access = new DiagnosticsAccess({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(access.isEnabled()).toBe(false);

    access.setEligible(true);
    const holdStartedAt = putFiveTouchesDown(access);
    expect(access.update(holdStartedAt + DIAGNOSTICS_HOLD_MILLISECONDS)).toBe(true);
    expect(access.isEnabled()).toBe(true);
  });
});
