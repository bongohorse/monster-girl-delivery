import { describe, expect, it } from 'vitest';
import {
  createTimedZapperLifecycleState,
  PROTOTYPE_TIMED_ZAPPER_CONFIG,
  stepTimedZapperLifecycle,
  type TimedZapperLifecycleState,
} from '../../src/hazards/TimedZapperLifecycle';

const advance = (state: Readonly<TimedZapperLifecycleState>, deltaSeconds: number) =>
  stepTimedZapperLifecycle(state, deltaSeconds, PROTOTYPE_TIMED_ZAPPER_CONFIG);

describe('Timed Zapper lifecycle', () => {
  it('uses the approved OFF -> CHARGE -> ON -> OFF cyclic phases', () => {
    let state = createTimedZapperLifecycleState();
    state = advance(state, 0.8).state;
    expect(state).toMatchObject({ phase: 'charge', elapsedSeconds: 0 });
    state = advance(state, 0.6).state;
    expect(state).toMatchObject({ phase: 'on', elapsedSeconds: 0 });
    state = advance(state, 1.2).state;
    expect(state).toMatchObject({ phase: 'off', elapsedSeconds: 0, complete: false });
  });

  it('exposes only the ON portion when a coarse step crosses CHARGE -> ON', () => {
    const charge = advance(createTimedZapperLifecycleState(), 1.2).state;
    const result = advance(charge, 0.4);
    expect(result.lethalIntervals).toStrictEqual([{ startSeconds: 0.2, endSeconds: 0.4 }]);
    expect(result.state).toMatchObject({ phase: 'on', elapsedSeconds: 0.2 });
  });

  it('does not extend lethality past ON -> OFF', () => {
    const on = advance(createTimedZapperLifecycleState(), 1.4).state;
    const result = advance(on, 1.4);
    expect(result.lethalIntervals).toStrictEqual([{ startSeconds: 0, endSeconds: 1.2 }]);
    expect(result.state).toMatchObject({ phase: 'off', elapsedSeconds: 0.2 });
  });

  it('suppresses collision while externally disabled or destroyed without changing timed phase', () => {
    const on = advance(createTimedZapperLifecycleState(), 1.4).state;
    for (const gameplayState of ['disabled', 'destroyed'] as const) {
      const result = stepTimedZapperLifecycle(on, 0.25, PROTOTYPE_TIMED_ZAPPER_CONFIG, gameplayState);
      expect(result.lethalIntervals).toHaveLength(0);
      expect(result.state).toMatchObject({ phase: 'on', elapsedSeconds: 0.25 });
    }
  });

  it('does not advance on zero delta or while paused', () => {
    const start = createTimedZapperLifecycleState();
    expect(advance(start, 0)).toStrictEqual({ lethalIntervals: [], state: start });
    expect(stepTimedZapperLifecycle(start, 0.5, PROTOTYPE_TIMED_ZAPPER_CONFIG, 'active', true)).toStrictEqual({
      lethalIntervals: [],
      state: start,
    });
  });

  it('supports a one-shot lifecycle that cannot reactivate after ON completes', () => {
    const config = { ...PROTOTYPE_TIMED_ZAPPER_CONFIG, mode: 'one-shot' as const };
    const completed = stepTimedZapperLifecycle(createTimedZapperLifecycleState(), 2.6, config);
    expect(completed.state).toMatchObject({ phase: 'off', complete: true });
    expect(completed.lethalIntervals).toStrictEqual([{ startSeconds: 1.4, endSeconds: 2.6 }]);
    expect(stepTimedZapperLifecycle(completed.state, 10, config).lethalIntervals).toHaveLength(0);
  });

  it.each([30, 60, 90, 120, 144])('reaches the same phase across %i Hz partitions', (hz) => {
    let state = createTimedZapperLifecycleState();
    const step = 1 / hz;
    for (let elapsed = 0; elapsed < 3; ) {
      const delta = Math.min(step, 3 - elapsed);
      state = advance(state, delta).state;
      elapsed += delta;
    }
    expect(state.phase).toBe('off');
    expect(state.elapsedSeconds).toBeCloseTo(0.4, 9);
  });

  it('is partition-stable under deterministic jitter', () => {
    let state = createTimedZapperLifecycleState();
    const deltas = [0.011, 0.023, 0.007, 0.019];
    let elapsed = 0;
    let index = 0;
    while (elapsed < 3) {
      const delta = Math.min(deltas[index % deltas.length] ?? 0, 3 - elapsed);
      state = advance(state, delta).state;
      elapsed += delta;
      index += 1;
    }
    expect(state.phase).toBe('off');
    expect(state.elapsedSeconds).toBeCloseTo(0.4, 9);
  });
});
