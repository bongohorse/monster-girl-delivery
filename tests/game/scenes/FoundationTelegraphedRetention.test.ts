import { describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../../src/core/AppServices';
import { Foundation } from '../../../src/game/scenes/Foundation';
import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
  scheduleNextPattern,
} from '../../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_MISSILE_PATTERN } from '../../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../../src/generation/RunGenerationState';
import {
  createTelegraphedHazardSimulationState,
  stepTelegraphedHazardSimulation,
  type TelegraphedHazardSimulationState,
} from '../../../src/hazards/TelegraphedHazardSimulation';

vi.mock('phaser', () => ({
  Scale: { Events: { RESIZE: 'resize' } },
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
}));

const createMissileSpawn = (): Readonly<LogicalHazardSpawnInstance> => {
  const schedule = scheduleNextPattern({
    catalog: [PROTOTYPE_MISSILE_PATTERN],
    patternStartDistance: 0,
    state: createRunGenerationState('generated-missile-retention'),
  });
  if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
    throw new Error('Expected M5 Missile spawn.');
  }
  return schedule.spawns[0];
};

const reachActive = (
  missile: Readonly<LogicalHazardSpawnInstance>,
): Readonly<TelegraphedHazardSimulationState> => {
  let state = stepTelegraphedHazardSimulation(
    createTelegraphedHazardSimulationState(),
    [missile],
    0,
    { positionY: 100, runDistance: 0 },
  );
  state = stepTelegraphedHazardSimulation(
    state,
    [missile],
    1.4,
    { positionY: 100, runDistance: 0 },
    (delta) => ({ positionY: 100 + 50 * delta, runDistance: 350 * delta }),
  );
  return stepTelegraphedHazardSimulation(state, [missile], 0.4, {
    positionY: 72,
    runDistance: 630,
  });
};

describe('Foundation generated telegraph retention', () => {
  it('keeps a generated Missile after stream pruning until its authoritative lifecycle expires', () => {
    const missile = createMissileSpawn();
    const foundation = new Foundation(createAppServices(), false);
    let telegraphedState = reachActive(missile);

    const currentGenerated: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> = Object.freeze(
      [],
    );
    Reflect.set(foundation, 'hazardStream', { spawns: currentGenerated });
    Reflect.set(foundation, 'telegraphedHazardState', telegraphedState);

    const reconcile = Reflect.get(foundation, 'reconcileRetainedGeneratedTelegraphedHazards') as (
      previous: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
    ) => void;
    reconcile.call(foundation, [missile]);

    const retained = Reflect.get(
      foundation,
      'retainedGeneratedTelegraphedHazards',
    ) as ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>;
    expect(retained.map(getLogicalHazardSpawnIdentity)).toEqual([
      getLogicalHazardSpawnIdentity(missile),
    ]);

    const getActive = Reflect.get(foundation, 'getActiveHazardSpawns') as () => ReadonlyArray<
      Readonly<LogicalHazardSpawnInstance>
    >;
    expect(getActive.call(foundation).map(getLogicalHazardSpawnIdentity)).toContain(
      getLogicalHazardSpawnIdentity(missile),
    );

    // Stable generated membership must not rebuild the retained container while its lifecycle is
    // still active. This is the ordinary frame-to-frame allocation fast path.
    reconcile.call(foundation, currentGenerated);
    expect(Reflect.get(foundation, 'retainedGeneratedTelegraphedHazards')).toBe(retained);

    telegraphedState = stepTelegraphedHazardSimulation(telegraphedState, [missile], 3.2, {
      positionY: 72,
      runDistance: 1_750,
    });
    Reflect.set(foundation, 'telegraphedHazardState', telegraphedState);
    reconcile.call(foundation, currentGenerated);

    const expiredRetained = Reflect.get(
      foundation,
      'retainedGeneratedTelegraphedHazards',
    ) as ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>;
    expect(expiredRetained).toEqual([]);
    expect(expiredRetained).not.toBe(retained);
    expect(Object.isFrozen(expiredRetained)).toBe(true);
  });
});
