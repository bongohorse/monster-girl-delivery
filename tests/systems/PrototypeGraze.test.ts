import { describe, expect, it } from 'vitest';
import type { LogicalHazard } from '../../src/systems/HazardCollision';
import {
  createPrototypeRunState,
  type PrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';

const BOUNDS = Object.freeze({ ceilingY: -100, floorY: 100 });
const FLIGHT = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 1000,
  maxRiseVelocity: 1000,
});
const MOTION = Object.freeze({ baseScrollSpeed: 100 });

const hazard = (
  id: string,
  top: number,
  bottom: number,
  left = 50,
  right = 60,
): Readonly<LogicalHazard> =>
  Object.freeze({
    grazeOccurrenceId: id,
    hitbox: Object.freeze({ left, right, top, bottom }),
  }) as Readonly<LogicalHazard>;

const context = (hazards: ReadonlyArray<Readonly<LogicalHazard>>) => ({
  flightBounds: BOUNDS,
  flightTuning: FLIGHT,
  hazards,
  runMotionTuning: MOTION,
  thrustHeld: false,
});

const START: PrototypeRunState = {
  phase: 'running',
  motion: { distance: 0 },
  flight: { positionY: 0, velocityY: 0 },
};

describe('prototype Graze skill layer', () => {
  it('distinguishes clear miss, Graze-only crossing, and lethal core overlap', () => {
    expect(
      stepPrototypeRun(START, 1, context([hazard('miss', 40, 45)])).state.graze,
    ).toBeUndefined();

    const grazed = stepPrototypeRun(START, 1, context([hazard('graze', 25, 30)]));
    expect(grazed.enteredDead).toBe(false);
    expect(grazed.state.graze?.count).toBe(1);

    const lethal = stepPrototypeRun(START, 1, context([hazard('lethal', 20, 30)]));
    expect(lethal.enteredDead).toBe(true);
    expect(lethal.state.graze).toBeUndefined();
    expect(lethal.state.finalResult?.grazeCount).toBe(0);
  });

  it('does not duplicate one occurrence and allows a second occurrence independently', () => {
    const firstHazard = hazard('first', 25, 30, 40, 200);
    const first = stepPrototypeRun(START, 0.5, context([firstHazard])).state;
    const repeated = stepPrototypeRun(first, 0.5, context([firstHazard])).state;
    expect(repeated.graze?.count).toBe(1);

    const second = stepPrototypeRun(
      repeated,
      0.5,
      context([hazard('second', 25, 30, 100, 300)]),
    ).state;
    expect(second.graze?.count).toBe(2);
  });

  it('keeps same-occurrence lethal authoritative but retains different-hazard Graze in terminal step', () => {
    const result = stepPrototypeRun(
      START,
      1,
      context([hazard('lethal', 20, 30), hazard('graze', -30, -25)]),
    );

    expect(result.enteredDead).toBe(true);
    expect(result.state.graze?.count).toBe(1);
    expect(result.state.finalResult?.grazeCount).toBe(1);
  });

  it('freezes Graze after death and resets it with a fresh run', () => {
    const grazed = stepPrototypeRun(START, 1, context([hazard('graze', 25, 30)])).state;
    const dead = stepPrototypeRun(grazed, 1, context([hazard('death', 20, 30, 100, 110)])).state;
    const repeated = stepPrototypeRun(dead, 10, context([hazard('late', 25, 30, 0, 1000)])).state;

    expect(repeated).toBe(dead);
    expect(repeated.finalResult?.grazeCount).toBe(1);
    expect(createPrototypeRunState(BOUNDS).graze).toBeUndefined();
  });

  it.each([30, 60, 90, 120, 144])('keeps one Graze across %i Hz partitions', (hz) => {
    let state: Readonly<PrototypeRunState> = START;
    const step = 1 / hz;
    const grazeHazard = hazard('partitioned', 25, 30);
    for (let index = 0; index < hz; index += 1) {
      state = stepPrototypeRun(state, step, context([grazeHazard])).state;
    }
    expect(state.graze?.count).toBe(1);
  });

  it('keeps one Graze under deterministic jitter partitions', () => {
    let state: Readonly<PrototypeRunState> = START;
    const grazeHazard = hazard('jitter', 25, 30);
    for (const step of [0.07, 0.11, 0.03, 0.19, 0.08, 0.17, 0.05, 0.13, 0.09, 0.08]) {
      state = stepPrototypeRun(state, step, context([grazeHazard])).state;
    }
    expect(state.graze?.count).toBe(1);
  });
});
