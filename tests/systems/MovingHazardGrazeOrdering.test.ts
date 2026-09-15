import { describe, expect, it } from 'vitest';
import type { LogicalHazard } from '../../src/systems/HazardCollision';
import { type PrototypeRunState, stepPrototypeRun } from '../../src/systems/PrototypeRunSimulation';

const BOUNDS = Object.freeze({ ceilingY: -100, floorY: 100 });
const FLIGHT = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 1000,
  maxRiseVelocity: 1000,
});
const MOTION = Object.freeze({ baseScrollSpeed: 100 });
const START: PrototypeRunState = {
  phase: 'running',
  motion: { distance: 0 },
  flight: { positionY: 0, velocityY: 0 },
};

const hazard = (
  id: string,
  top: number,
  bottom: number,
  left: number,
  right: number,
  horizontalVelocity?: number,
): Readonly<LogicalHazard> =>
  Object.freeze({
    grazeOccurrenceId: id,
    hitbox: Object.freeze({ left, right, top, bottom }),
    ...(horizontalVelocity === undefined ? {} : { horizontalVelocity }),
  }) as Readonly<LogicalHazard>;

const context = (hazards: ReadonlyArray<Readonly<LogicalHazard>>) => ({
  flightBounds: BOUNDS,
  flightTuning: FLIGHT,
  hazards,
  runMotionTuning: MOTION,
  thrustHeld: false,
});

const partitionDuration = (duration: number, hz: number): ReadonlyArray<number> => {
  const step = 1 / hz;
  const fullSteps = Math.floor(duration / step + 1e-9);
  const steps = Array.from({ length: fullSteps }, () => step);
  const remainder = duration - fullSteps * step;
  if (remainder > 1e-12) {
    steps.push(remainder);
  }
  return steps;
};

const SCHEDULES: ReadonlyArray<readonly [string, ReadonlyArray<number>]> = [
  ['coarse 50 ms', [0.05]],
  ...[30, 60, 90, 120, 144].map((hz) => [`${hz} Hz`, partitionDuration(0.05, hz)] as const),
  ['deterministic jitter', [0.007, 0.011, 0.005, 0.013, 0.014]],
];

const advanceMovingHazards = (
  hazards: ReadonlyArray<Readonly<LogicalHazard>>,
  elapsedSeconds: number,
): ReadonlyArray<Readonly<LogicalHazard>> =>
  hazards.map((entry) => {
    const velocity = entry.horizontalVelocity ?? 0;
    if (velocity === 0) {
      return entry;
    }

    const offset = velocity * elapsedSeconds;
    return Object.freeze({
      ...entry,
      hitbox: Object.freeze({
        ...entry.hitbox,
        left: entry.hitbox.left + offset,
        right: entry.hitbox.right + offset,
      }),
    });
  });

const run = (
  steps: ReadonlyArray<number>,
  hazards: ReadonlyArray<Readonly<LogicalHazard>>,
): Readonly<PrototypeRunState> => {
  let state: Readonly<PrototypeRunState> = START;
  let currentHazards = hazards;
  for (const elapsedSeconds of steps) {
    state = stepPrototypeRun(state, elapsedSeconds, context(currentHazards)).state;
    currentHazards = advanceMovingHazards(currentHazards, elapsedSeconds);
  }
  return state;
};

describe('moving-hazard Graze/death same-step ordering', () => {
  const movingGraze = hazard('moving-graze', 25, 30, -33, -23, -500);
  const laterLethal = hazard('later-lethal', 20, 30, 20, 30);
  const earlierLethal = hazard('earlier-lethal', 20, 30, 18.2, 28.2);

  it('does not advance Graze or death state on zero delta', () => {
    for (const hazards of [
      [movingGraze, laterLethal],
      [laterLethal, movingGraze],
    ] as const) {
      const result = stepPrototypeRun(START, 0, context(hazards));
      expect(result.enteredDead).toBe(false);
      expect(result.state).toStrictEqual(START);
      expect(result.state.graze).toBeUndefined();
      expect(result.state.finalResult).toBeUndefined();
    }
  });

  it.each(SCHEDULES)(
    'retains a moving-hazard Graze that resolves before a different lethal contact under %s',
    (_label, steps) => {
      for (const hazards of [
        [movingGraze, laterLethal],
        [laterLethal, movingGraze],
      ] as const) {
        const state = run(steps, hazards);
        expect(state.phase).toBe('dead');
        expect(state.finalResult?.grazeCount).toBe(1);
      }
    },
  );

  it.each(SCHEDULES)(
    'suppresses a moving-hazard Graze that resolves after a different lethal contact under %s',
    (_label, steps) => {
      for (const hazards of [
        [movingGraze, earlierLethal],
        [earlierLethal, movingGraze],
      ] as const) {
        const state = run(steps, hazards);
        expect(state.phase).toBe('dead');
        expect(state.finalResult?.grazeCount).toBe(0);
      }
    },
  );
});
