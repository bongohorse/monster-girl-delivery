import { describe, expect, it } from 'vitest';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import type { LogicalHazardSpawnInstance } from '../../src/generation/PatternSpawnScheduler';
import { createPrototypeLaserBehavior } from '../../src/hazards/PrototypeLaserHazard';
import {
  createTelegraphedHazardSimulationState,
  getCollisionHazardsForTelegraphedSimulation,
  stepTelegraphedHazardSimulation,
} from '../../src/hazards/TelegraphedHazardSimulation';
import { type PrototypeRunState, stepPrototypeRun } from '../../src/systems/PrototypeRunSimulation';

const createSpawn = (): Readonly<LogicalHazardSpawnInstance> => {
  const pattern = createHazardPattern({
    id: 'laser-graze-test',
    runLength: 600,
    profile: {
      behaviorTags: ['timed-pulse'],
      difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: null },
      pacingIntensities: ['medium'],
      pressureCost: 1,
      readabilityCost: 3,
      varietyFamilyId: 'laser-graze-test',
    },
    entries: [
      {
        behavior: createPrototypeLaserBehavior('horizontal', 'screen'),
        id: 'laser',
        type: 'placeholder-barrier',
        hitbox: { left: 120, right: 144, top: 183, bottom: 207 },
      },
    ],
  });
  const entry = pattern.entries[0];
  if (!entry) {
    throw new Error('Expected Laser Graze test entry.');
  }
  return Object.freeze({
    ...entry,
    entryId: entry.id,
    patternEntryIndex: 0,
    patternId: pattern.id,
    runDistance: entry.hitbox.left,
  });
};

const target = Object.freeze({ positionY: 158, runDistance: 100 });
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

describe('Timed Laser Graze lifecycle', () => {
  it('never Grazes before ON and awards one near miss when the one-shot ON interval resolves', () => {
    const spawn = createSpawn();
    let lifecycle = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      2.4,
      target,
    );
    expect(getCollisionHazardsForTelegraphedSimulation(lifecycle, [spawn], collisionContext)).toEqual(
      [],
    );

    let runState: PrototypeRunState = {
      phase: 'running',
      motion: { distance: 100 },
      flight: { positionY: 158, velocityY: 0 },
    };

    lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], 0.15, target);
    runState = stepPrototypeRun(runState, 0.15, {
      ...runOptions,
      hazards: getCollisionHazardsForTelegraphedSimulation(lifecycle, [spawn], collisionContext),
    }).state;
    expect(runState.phase).toBe('running');
    expect(runState.graze?.count).toBe(0);
    expect(runState.graze?.pendingOccurrenceIds).toHaveLength(1);

    lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], 0.65, target);
    const finalOnHazards = getCollisionHazardsForTelegraphedSimulation(
      lifecycle,
      [spawn],
      collisionContext,
    );
    expect(finalOnHazards).toHaveLength(1);
    expect(finalOnHazards[0]?.collisionEndsAtIntervalEnd).toBe(true);
    runState = stepPrototypeRun(runState, 0.65, {
      ...runOptions,
      hazards: finalOnHazards,
    }).state;

    expect(runState.phase).toBe('running');
    expect(runState.graze?.count).toBe(1);
    expect(runState.graze?.pendingOccurrenceIds).toHaveLength(0);
  });
});
