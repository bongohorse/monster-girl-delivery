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

const putFourTouchesDown = (access: DiagnosticsAccess, startedAt = 1_000): number => {
  for (let index = 0; index < 4; index += 1) {
    access.pointerDown(index + 1, 100 + index * 10, 100, startedAt + index * 20);
  }
  return startedAt + 60;
};

describe('DiagnosticsAccess', () => {
  it('accepts four contacts within 1000 ms and toggles exactly once after 2000 ms', () => {
    const storage = createStorage();
    const access = new DiagnosticsAccess(storage);
    access.setEligible(true);
    const holdStart = putFourTouchesDown(access);
    expect(access.getGestureSnapshot(holdStart)).toMatchObject({
      phase: 'holding',
      claimed: true,
      joinElapsedMilliseconds: 60,
    });
    expect(access.update(holdStart + DIAGNOSTICS_HOLD_MILLISECONDS - 1)).toBeNull();
    expect(access.getGestureSnapshot(holdStart + 1_999).holdElapsedMilliseconds).toBe(1_999);
    expect(access.update(holdStart + DIAGNOSTICS_HOLD_MILLISECONDS)).toBe(true);
    expect(access.getGestureSnapshot(holdStart + 2_000).phase).toBe('completed-await-release');
    expect(access.update(holdStart + 10_000)).toBeNull();
    expect(storage.values.get(DIAGNOSTICS_STORAGE_KEY)).toBe('true');

    for (let index = 1; index <= 4; index += 1) access.pointerUp(index);
    const secondHold = putFourTouchesDown(access, 20_000);
    expect(access.update(secondHold + 2_000)).toBe(false);
    expect(new DiagnosticsAccess(storage).isEnabled()).toBe(false);
  });

  it('keeps ordinary one-finger input unclaimed and three contacts below activation', () => {
    const access = new DiagnosticsAccess(createStorage());
    access.setEligible(true);
    access.pointerDown(1, 10, 10, 100);
    expect(access.isGestureClaimed()).toBe(false);
    access.pointerDown(2, 20, 20, 200);
    access.pointerDown(3, 30, 30, 300);
    expect(access.isGestureClaimed()).toBe(true);
    expect(access.update(10_000)).toBeNull();
    expect(access.getGestureSnapshot(10_000).phase).toBe('failed-await-release');
  });

  it('rejects the fourth contact beyond the join deadline and requires full release', () => {
    const access = new DiagnosticsAccess(createStorage());
    access.setEligible(true);
    for (let id = 1; id <= 3; id += 1) access.pointerDown(id, id, id, id * 10);
    access.pointerDown(4, 4, 4, 11 + DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS);
    expect(access.getGestureSnapshot(1_030).phase).toBe('failed-await-release');
    expect(access.update(10_000)).toBeNull();
    for (let id = 1; id <= 3; id += 1) access.pointerUp(id);
    access.pointerDown(5, 5, 5, 1_040);
    expect(access.getGestureSnapshot(1_040).phase).toBe('failed-await-release');
    access.pointerUp(4);
    access.pointerUp(5);
    expect(access.getGestureSnapshot(1_050).phase).toBe('idle');
    const holdStart = putFourTouchesDown(access, 2_000);
    expect(access.update(holdStart + 2_000)).toBe(true);
  });

  it('tracks natural movement without canceling the hold and rejects a fifth contact', () => {
    const access = new DiagnosticsAccess(createStorage());
    access.setEligible(true);
    const holdStart = putFourTouchesDown(access);
    access.pointerMove(3, 400, 300);
    expect(access.getGestureSnapshot(holdStart).touches[2]).toEqual({ x: 400, y: 300 });
    access.pointerDown(5, 200, 100, holdStart + 1);
    expect(access.getGestureSnapshot(holdStart + 1)).toMatchObject({
      phase: 'failed-await-release',
      claimed: true,
    });
    expect(access.update(holdStart + 5_000)).toBeNull();
    for (let id = 1; id <= 5; id += 1) access.pointerUp(id);
    const nextHold = putFourTouchesDown(access, 10_000);
    access.pointerMove(3, 1_000, 1_000);
    expect(access.update(nextHold + DIAGNOSTICS_HOLD_MILLISECONDS)).toBe(true);
  });

  it('fails an interrupted hold and cannot reactivate during a completed contact sequence', () => {
    const access = new DiagnosticsAccess(createStorage());
    access.setEligible(true);
    let holdStart = putFourTouchesDown(access);
    access.pointerUp(4);
    access.pointerDown(5, 100, 100, holdStart + 100);
    expect(access.update(holdStart + 3_000)).toBeNull();
    for (const id of [1, 2, 3, 5]) access.pointerUp(id);
    holdStart = putFourTouchesDown(access, 10_000);
    expect(access.update(holdStart + 2_000)).toBe(true);
    access.pointerUp(1);
    access.pointerDown(5, 100, 100, holdStart + 2_010);
    expect(access.update(holdStart + 5_000)).toBeNull();
    expect(access.isEnabled()).toBe(true);
  });

  it('resets transient state when ineligible and tolerates inaccessible storage', () => {
    const access = new DiagnosticsAccess({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(access.isEnabled()).toBe(false);
    putFourTouchesDown(access);
    expect(access.isGestureClaimed()).toBe(false);
    access.setEligible(true);
    putFourTouchesDown(access);
    access.setEligible(false);
    expect(access.getGestureSnapshot(10_000).phase).toBe('idle');
    access.setEligible(true);
    const holdStart = putFourTouchesDown(access, 20_000);
    expect(access.update(holdStart + 2_000)).toBe(true);
  });
});
