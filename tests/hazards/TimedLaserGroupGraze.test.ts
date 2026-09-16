import { describe, expect, it } from 'vitest';
import type { LogicalHazardSpawnInstance } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_LASER_GROUP_PATTERNS } from '../../src/generation/PrototypeLaserLaneCatalog';
import {
  createTelegraphedHazardSimulationState,
  getCollisionHazardsForTelegraphedSimulation,
  stepTelegraphedHazardSimulation,
} from '../../src/hazards/TelegraphedHazardSimulation';
import { type PrototypeRunState, stepPrototypeRun } from '../../src/systems/PrototypeRunSimulation';

const playerTarget = Object.freeze({ positionY: 158, runDistance: 100 });
const collisionContext = Object.freeze({
  playerRunDistance: 100,
  playerScreenX: 80,
  scrollSpeed: 0,
  viewportLeft: 0,
  viewportRight: 800,
});
const runOptions = Object.freeze({
  flightBounds: Object.freeze({ ceilingY: -10_000, floorY: 10_000 }),
  flightTuning: Object.freeze({
    gravity: 0,
    thrust: 0,
    maxFallVelocity: 1_000,
    maxRiseVelocity: 1_000,
  }),
  runMotionTuning: Object.freeze({ baseScrollSpeed: 0 }),
  thrustHeld: false,
});

const createSweepSpawns = (): ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> => {
  const pattern = PROTOTYPE_LASER_GROUP_PATTERNS[3];
  if (!pattern) {
    throw new Error('Expected downward Laser sweep pattern.');
  }

  return Object.freeze(
    pattern.entries.map((entry, patternEntryIndex) =>
      Object.freeze({
        ...entry,
        entryId: entry.id,
        patternEntryIndex,
        patternId: pattern.id,
        runDistance: entry.hitbox.left,
      }),
    ),
  );
};

type DeltaSource = (stepIndex: number) => number;

const simulateSweepGraze = (getDelta: DeltaSource): Readonly<PrototypeRunState> => {
  const spawns = createSweepSpawns();
  let lifecycle = createTelegraphedHazardSimulationState();
  let runState: PrototypeRunState = {
    phase: 'running',
    motion: { distance: 100 },
    flight: { positionY: 158, velocityY: 0 },
  };
  let elapsedSeconds = 0;
  let stepIndex = 0;
  const simulationEndSeconds = 4.5;

  while (elapsedSeconds < simulationEndSeconds - 1e-12) {
    const deltaSeconds = Math.min(getDelta(stepIndex), simulationEndSeconds - elapsedSeconds);
    lifecycle = stepTelegraphedHazardSimulation(
      lifecycle,
      spawns,
      deltaSeconds,
      playerTarget,
    );
    runState = stepPrototypeRun(runState, deltaSeconds, {
      ...runOptions,
      hazards: getCollisionHazardsForTelegraphedSimulation(
        lifecycle,
        spawns,
        collisionContext,
      ),
    }).state;

    elapsedSeconds += deltaSeconds;
    stepIndex += 1;
  }

  return runState;
};

const expectOneMiddleBeamGraze = (state: Readonly<PrototypeRunState>): void => {
  expect(state.phase).toBe('running');
  expect(state.graze?.count).toBe(1);
  expect(state.graze?.pendingOccurrenceIds).toEqual([]);
};

describe('Timed Laser group Graze ordering', () => {
  it('awards the same single near miss across 30/60/90/120/144 Hz sweep handoffs', () => {
    for (const framesPerSecond of [30, 60, 90, 120, 144]) {
      expectOneMiddleBeamGraze(simulateSweepGraze(() => 1 / framesPerSecond));
    }
  });

  it('preserves the same Graze result under deterministic frame jitter', () => {
    const jitteredDeltas = [1 / 45, 1 / 120, 1 / 60, 1 / 90, 1 / 30, 1 / 144];
    expectOneMiddleBeamGraze(
      simulateSweepGraze((stepIndex) => jitteredDeltas[stepIndex % jitteredDeltas.length] ?? 1 / 60),
    );
  });
});
