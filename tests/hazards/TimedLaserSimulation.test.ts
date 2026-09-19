import { describe, expect, it } from 'vitest';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
} from '../../src/generation/PatternSpawnScheduler';
import { createPrototypeLaserBehavior } from '../../src/hazards/PrototypeLaserHazard';
import {
  createTelegraphedHazardSimulationState,
  getCollisionHazardsForTelegraphedSimulation,
  getTimedLaserLifecycle,
  stepTelegraphedHazardSimulation,
} from '../../src/hazards/TelegraphedHazardSimulation';

const createSpawn = (orientation: 'horizontal' | 'vertical'): LogicalHazardSpawnInstance => {
  const pattern = createHazardPattern({
    id: `laser-${orientation}`,
    runLength: 600,
    profile: {
      behaviorTags: ['timed-pulse'],
      difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: null },
      pacingIntensities: ['medium'],
      pressureCost: 1,
      readabilityCost: 3,
      varietyFamilyId: 'laser-test',
    },
    entries: [
      {
        behavior: createPrototypeLaserBehavior(orientation, 'screen'),
        id: 'laser',
        type: 'placeholder-barrier',
        hitbox: { left: 120, right: 144, top: 183, bottom: 207 },
      },
    ],
  });
  const entry = pattern.entries[0];
  if (!entry) throw new Error('Expected Laser test entry.');
  return Object.freeze({
    ...entry,
    entryId: entry.id,
    patternEntryIndex: 0,
    patternId: pattern.id,
    runDistance: entry.hitbox.left,
  });
};

const playerTarget = Object.freeze({ positionY: 100, runDistance: 0 });
const collisionContext = Object.freeze({
  playerRunDistance: 100,
  playerScreenX: 80,
  scrollSpeed: 240,
  viewportLeft: 0,
  viewportRight: 800,
});

describe('Timed Laser telegraph integration', () => {
  it('uses the authoritative identity index for telegraphed lifecycle lookups', () => {
    const spawn = createSpawn('horizontal');
    const state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      2.6,
      playerTarget,
    );
    const identity = getLogicalHazardSpawnIdentity(spawn);
    const indexedInstance = state.instanceByIdentity?.[identity];

    expect(indexedInstance).toBe(state.instances[0]);

    const noLinearFindState = Object.freeze({
      ...state,
      instances: new Proxy(state.instances, {
        get(target, property, receiver) {
          if (property === 'find' || property === 'map') {
            throw new Error('telegraphed lifecycle state fell back to array indexing work');
          }
          return Reflect.get(target, property, receiver);
        },
      }),
    });

    expect(getTimedLaserLifecycle(noLinearFindState, spawn)).toBe(indexedInstance?.laserLifecycle);
    expect(
      getCollisionHazardsForTelegraphedSimulation(noLinearFindState, [spawn], collisionContext),
    ).toHaveLength(1);

    const missingSpawn = Object.freeze({
      ...spawn,
      entryId: 'missing-laser',
      patternId: 'missing-laser-pattern',
      runDistance: spawn.runDistance + 1_000,
    });
    expect(getTimedLaserLifecycle(noLinearFindState, missingSpawn)).toBeNull();
    expect(
      getCollisionHazardsForTelegraphedSimulation(
        noLinearFindState,
        [missingSpawn],
        collisionContext,
      ),
    ).toEqual([]);
    expect(() =>
      stepTelegraphedHazardSimulation(noLinearFindState, [spawn], 0.1, playerTarget),
    ).not.toThrow();
  });

  it('keeps OFF, TELEGRAPH and CHARGE out of collision and exposes the real phase', () => {
    const spawn = createSpawn('horizontal');
    const state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      2.2,
      playerTarget,
    );

    const lifecycle = getTimedLaserLifecycle(state, spawn);
    expect(lifecycle).toMatchObject({ phase: 'charge', complete: false });
    expect(lifecycle?.elapsedPhaseSeconds).toBeCloseTo(0.5, 12);
    expect(getCollisionHazardsForTelegraphedSimulation(state, [spawn], collisionContext)).toEqual(
      [],
    );
  });

  it('pins a full-width horizontal Laser to the screen and clips exact ON collision timing', () => {
    const spawn = createSpawn('horizontal');
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      2.3,
      playerTarget,
    );
    state = stepTelegraphedHazardSimulation(state, [spawn], 0.5, playerTarget);
    const hazards = getCollisionHazardsForTelegraphedSimulation(state, [spawn], collisionContext);

    expect(hazards).toHaveLength(1);
    expect(hazards[0]?.collisionInterval?.startSeconds).toBeCloseTo(0.2, 12);
    expect(hazards[0]?.collisionInterval?.endSeconds).toBeCloseTo(0.5, 12);
    expect(hazards[0]?.horizontalVelocity).toBe(240);
    expect(hazards[0]?.hitbox).toMatchObject({ left: 20, right: 820, top: 183, bottom: 207 });
  });

  it('makes Director vertical screen-span geometry cover the complete vertical domain while ON', () => {
    const spawn = createSpawn('vertical');
    const state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      2.6,
      playerTarget,
    );
    const hazards = getCollisionHazardsForTelegraphedSimulation(state, [spawn], collisionContext);

    expect(hazards).toHaveLength(1);
    expect(hazards[0]?.hitbox.top).toBeLessThan(-100_000);
    expect(hazards[0]?.hitbox.bottom).toBeGreaterThan(100_000);
    expect(hazards[0]?.hitbox.right - hazards[0]?.hitbox.left).toBe(24);
  });

  it('ends lethality at the exact ON boundary and stays safe through RECOVERY', () => {
    const spawn = createSpawn('horizontal');
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      3.25,
      playerTarget,
    );
    expect(getTimedLaserLifecycle(state, spawn)?.phase).toBe('recovery');
    const crossingHazards = getCollisionHazardsForTelegraphedSimulation(
      state,
      [spawn],
      collisionContext,
    );
    expect(crossingHazards).toHaveLength(1);
    expect(crossingHazards[0]?.collisionInterval?.startSeconds).toBeCloseTo(2.5, 12);
    expect(crossingHazards[0]?.collisionInterval?.endSeconds).toBeCloseTo(3.2, 12);
    expect(crossingHazards[0]?.collisionEndsAtIntervalEnd).toBe(true);

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.2, playerTarget);
    expect(getTimedLaserLifecycle(state, spawn)?.phase).toBe('recovery');
    expect(getCollisionHazardsForTelegraphedSimulation(state, [spawn], collisionContext)).toEqual(
      [],
    );

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.15, playerTarget);
    expect(getTimedLaserLifecycle(state, spawn)).toEqual({
      complete: true,
      elapsedPhaseSeconds: 0,
      phase: 'off',
    });
  });
});
