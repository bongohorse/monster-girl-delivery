import { describe, expect, it } from 'vitest';
import { PROTOTYPE_LASER_GROUP_PATTERNS } from '../../src/generation/PrototypeLaserLaneCatalog';
import type { LogicalHazardSpawnInstance } from '../../src/generation/PatternSpawnScheduler';
import {
  createTelegraphedHazardSimulationState,
  getCollisionHazardsForTelegraphedSimulation,
  stepTelegraphedHazardSimulation,
} from '../../src/hazards/TelegraphedHazardSimulation';

const playerTarget = Object.freeze({ positionY: 195, runDistance: 0 });
const collisionContext = Object.freeze({
  playerRunDistance: 100,
  playerScreenX: 80,
  scrollSpeed: 240,
  viewportLeft: 0,
  viewportRight: 800,
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

interface AbsoluteLethalWindow {
  endSeconds: number;
  startSeconds: number;
}

type DeltaSource = (stepIndex: number) => number;

const simulateSweep = (getDelta: DeltaSource): ReadonlyArray<Readonly<AbsoluteLethalWindow>> => {
  const spawns = createSweepSpawns();
  let state = createTelegraphedHazardSimulationState();
  let elapsedSeconds = 0;
  let stepIndex = 0;
  const windows = new Map<string, AbsoluteLethalWindow>();
  const simulationEndSeconds = 4.5;

  while (elapsedSeconds < simulationEndSeconds - 1e-12) {
    const deltaSeconds = Math.min(getDelta(stepIndex), simulationEndSeconds - elapsedSeconds);
    state = stepTelegraphedHazardSimulation(
      state,
      spawns,
      deltaSeconds,
      playerTarget,
    );

    for (const hazard of getCollisionHazardsForTelegraphedSimulation(
      state,
      spawns,
      collisionContext,
    )) {
      const interval = hazard.collisionInterval;
      if (!interval) {
        continue;
      }
      const absoluteStart = elapsedSeconds + interval.startSeconds;
      const absoluteEnd = elapsedSeconds + interval.endSeconds;
      const existing = windows.get(hazard.entryId);
      windows.set(hazard.entryId, {
        startSeconds: existing ? Math.min(existing.startSeconds, absoluteStart) : absoluteStart,
        endSeconds: existing ? Math.max(existing.endSeconds, absoluteEnd) : absoluteEnd,
      });
    }

    elapsedSeconds += deltaSeconds;
    stepIndex += 1;
  }

  return Object.freeze(
    spawns.map((spawn) => {
      const window = windows.get(spawn.entryId);
      if (!window) {
        throw new Error(`Expected lethal window for ${spawn.entryId}.`);
      }
      return Object.freeze(window);
    }),
  );
};

const expectAuthoredSweepWindows = (
  windows: ReadonlyArray<Readonly<AbsoluteLethalWindow>>,
): void => {
  const expected = [
    { startSeconds: 2.25, endSeconds: 2.95 },
    { startSeconds: 2.95, endSeconds: 3.65 },
    { startSeconds: 3.65, endSeconds: 4.35 },
  ];

  expect(windows).toHaveLength(expected.length);
  for (let index = 0; index < expected.length; index += 1) {
    expect(windows[index]?.startSeconds).toBeCloseTo(expected[index]?.startSeconds ?? 0, 9);
    expect(windows[index]?.endSeconds).toBeCloseTo(expected[index]?.endSeconds ?? 0, 9);
  }
};

describe('Timed Laser group simulation', () => {
  it('preserves the authored HIGH -> MID -> LOW lethal order across frame partitions', () => {
    for (const framesPerSecond of [30, 60, 90, 120, 144]) {
      expectAuthoredSweepWindows(simulateSweep(() => 1 / framesPerSecond));
    }
  });

  it('preserves the same lethal windows under deterministic frame jitter', () => {
    const jitteredDeltas = [1 / 45, 1 / 120, 1 / 60, 1 / 90, 1 / 30, 1 / 144];
    expectAuthoredSweepWindows(
      simulateSweep((stepIndex) => jitteredDeltas[stepIndex % jitteredDeltas.length] ?? 1 / 60),
    );
  });

  it('does not advance any group member on a zero-delta pause step', () => {
    const spawns = createSweepSpawns();
    const beforePause = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      spawns,
      2.4,
      playerTarget,
    );
    const afterPause = stepTelegraphedHazardSimulation(beforePause, spawns, 0, playerTarget);

    expect(afterPause).toEqual(beforePause);
  });
});
