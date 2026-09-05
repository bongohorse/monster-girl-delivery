import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
} from '../generation/PatternSpawnScheduler';
import { isTimedPulseHazardBehavior } from './HazardArchetype';
import {
  createTelegraphedHazardLifecycle,
  isTelegraphedHazardLethal,
  stepTelegraphedHazardLifecycle,
  type TelegraphedHazardLifecycleState,
  type TelegraphedHazardTarget,
} from './TelegraphedHazardLifecycle';

export interface TimedHazardLifecycleInstance {
  readonly lifecycle: Readonly<TelegraphedHazardLifecycleState>;
  readonly spawnIdentity: string;
}

export interface TimedHazardSimulationState {
  readonly instances: ReadonlyArray<Readonly<TimedHazardLifecycleInstance>>;
}

const EMPTY_TIMED_HAZARD_SIMULATION_STATE: Readonly<TimedHazardSimulationState> = Object.freeze({
  instances: Object.freeze([]),
});

export const createTimedHazardSimulationState = (): Readonly<TimedHazardSimulationState> =>
  EMPTY_TIMED_HAZARD_SIMULATION_STATE;

const createFixedHazardTarget = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
): Readonly<TelegraphedHazardTarget> =>
  Object.freeze({
    positionY: (spawn.hitbox.top + spawn.hitbox.bottom) / 2,
    runDistance: spawn.runDistance,
  });

const freezeInstance = (
  spawnIdentity: string,
  lifecycle: Readonly<TelegraphedHazardLifecycleState>,
): Readonly<TimedHazardLifecycleInstance> => Object.freeze({ lifecycle, spawnIdentity });

/**
 * Synchronizes one-shot pulse lifecycles to the generated spawn window and advances them only from
 * TimeService-normalized simulation delta. The fixed authored target deliberately keeps this first
 * timed archetype non-reactive while reusing the generic warning → lock → active → expired model.
 */
export const stepTimedHazardSimulation = (
  state: Readonly<TimedHazardSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  elapsedSeconds: number,
): Readonly<TimedHazardSimulationState> => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Timed hazard elapsedSeconds must be non-negative and finite.');
  }

  const existingByIdentity = new Map(
    state.instances.map((instance) => [instance.spawnIdentity, instance] as const),
  );
  const seenIdentities = new Set<string>();
  const instances: Array<Readonly<TimedHazardLifecycleInstance>> = [];

  for (const spawn of spawns) {
    if (!isTimedPulseHazardBehavior(spawn.behavior)) {
      continue;
    }

    const spawnIdentity = getLogicalHazardSpawnIdentity(spawn);
    if (seenIdentities.has(spawnIdentity)) {
      throw new TypeError(`Timed hazard spawn identity must be unique: ${spawnIdentity}`);
    }
    seenIdentities.add(spawnIdentity);

    const target = createFixedHazardTarget(spawn);
    const existing = existingByIdentity.get(spawnIdentity);
    const lifecycle = stepTelegraphedHazardLifecycle(
      existing?.lifecycle ?? createTelegraphedHazardLifecycle(target),
      elapsedSeconds,
      target,
      spawn.behavior.lifecycle,
    ).state;

    instances.push(
      existing?.lifecycle === lifecycle ? existing : freezeInstance(spawnIdentity, lifecycle),
    );
  }

  if (
    instances.length === state.instances.length &&
    instances.every((instance, index) => instance === state.instances[index])
  ) {
    return state;
  }

  if (instances.length === 0) {
    return EMPTY_TIMED_HAZARD_SIMULATION_STATE;
  }

  return Object.freeze({ instances: Object.freeze(instances) });
};

export const getTimedHazardLifecycle = (
  state: Readonly<TimedHazardSimulationState>,
  spawn: Readonly<LogicalHazardSpawnInstance>,
): Readonly<TelegraphedHazardLifecycleState> | null => {
  if (!isTimedPulseHazardBehavior(spawn.behavior)) {
    return null;
  }

  const identity = getLogicalHazardSpawnIdentity(spawn);
  return state.instances.find((instance) => instance.spawnIdentity === identity)?.lifecycle ?? null;
};

/** Non-timed hazards remain lethal; a timed hazard is safe until its tracked state is active. */
export const isHazardLethalInTimedSimulation = (
  state: Readonly<TimedHazardSimulationState>,
  spawn: Readonly<LogicalHazardSpawnInstance>,
): boolean => {
  if (!isTimedPulseHazardBehavior(spawn.behavior)) {
    return true;
  }

  const lifecycle = getTimedHazardLifecycle(state, spawn);
  return lifecycle !== null && isTelegraphedHazardLethal(lifecycle);
};

/** Supplies the existing collision authority with only hazards that are logically lethal now. */
export const getLethalHazardsForTimedSimulation = (
  state: Readonly<TimedHazardSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
): ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> =>
  Object.freeze(spawns.filter((spawn) => isHazardLethalInTimedSimulation(state, spawn)));
