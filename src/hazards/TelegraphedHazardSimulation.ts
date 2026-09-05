import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
} from '../generation/PatternSpawnScheduler';
import {
  isTargetLockStrikeHazardBehavior,
  isTelegraphedHazardBehavior,
  isTimedPulseHazardBehavior,
  resolveTargetLockStrikeHitbox,
} from './HazardArchetype';
import {
  createTelegraphedHazardLifecycle,
  isTelegraphedHazardLethal,
  stepTelegraphedHazardLifecycle,
  type TelegraphedHazardLifecycleState,
  type TelegraphedHazardTarget,
} from './TelegraphedHazardLifecycle';

export interface TelegraphedHazardLifecycleInstance {
  readonly lifecycle: Readonly<TelegraphedHazardLifecycleState>;
  readonly spawnIdentity: string;
}

export interface TelegraphedHazardSimulationState {
  readonly instances: ReadonlyArray<Readonly<TelegraphedHazardLifecycleInstance>>;
}

const EMPTY_TELEGRAPHED_HAZARD_SIMULATION_STATE: Readonly<TelegraphedHazardSimulationState> =
  Object.freeze({ instances: Object.freeze([]) });

export const createTelegraphedHazardSimulationState =
  (): Readonly<TelegraphedHazardSimulationState> => EMPTY_TELEGRAPHED_HAZARD_SIMULATION_STATE;

const createFixedHazardTarget = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
): Readonly<TelegraphedHazardTarget> =>
  Object.freeze({
    positionY: (spawn.hitbox.top + spawn.hitbox.bottom) / 2,
    runDistance: spawn.runDistance,
  });

const getObservedTarget = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
  playerTarget: Readonly<TelegraphedHazardTarget>,
): Readonly<TelegraphedHazardTarget> => {
  if (isTimedPulseHazardBehavior(spawn.behavior)) {
    return createFixedHazardTarget(spawn);
  }

  if (isTargetLockStrikeHazardBehavior(spawn.behavior)) {
    const targetHitbox = resolveTargetLockStrikeHitbox(spawn, playerTarget.positionY);
    return Object.freeze({
      positionY: (targetHitbox.top + targetHitbox.bottom) / 2,
      runDistance: playerTarget.runDistance,
    });
  }

  return playerTarget;
};

const freezeInstance = (
  spawnIdentity: string,
  lifecycle: Readonly<TelegraphedHazardLifecycleState>,
): Readonly<TelegraphedHazardLifecycleInstance> => Object.freeze({ lifecycle, spawnIdentity });

/**
 * Synchronizes all telegraphed lifecycles to the generated spawn window. Timed pulses observe their
 * fixed authored center; reactive strikes sample the supplied logical player target during warning.
 * Both advance only from TimeService-normalized simulation delta through the generic lifecycle.
 */
export const stepTelegraphedHazardSimulation = (
  state: Readonly<TelegraphedHazardSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  elapsedSeconds: number,
  playerTarget: Readonly<TelegraphedHazardTarget>,
): Readonly<TelegraphedHazardSimulationState> => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Telegraphed hazard elapsedSeconds must be non-negative and finite.');
  }

  const existingByIdentity = new Map(
    state.instances.map((instance) => [instance.spawnIdentity, instance] as const),
  );
  const seenIdentities = new Set<string>();
  const instances: Array<Readonly<TelegraphedHazardLifecycleInstance>> = [];

  for (const spawn of spawns) {
    if (!isTelegraphedHazardBehavior(spawn.behavior)) {
      continue;
    }

    const spawnIdentity = getLogicalHazardSpawnIdentity(spawn);
    if (seenIdentities.has(spawnIdentity)) {
      throw new TypeError(`Telegraphed hazard spawn identity must be unique: ${spawnIdentity}`);
    }
    seenIdentities.add(spawnIdentity);

    const observedTarget = getObservedTarget(spawn, playerTarget);
    const existing = existingByIdentity.get(spawnIdentity);
    const lifecycle = stepTelegraphedHazardLifecycle(
      existing?.lifecycle ?? createTelegraphedHazardLifecycle(observedTarget),
      elapsedSeconds,
      observedTarget,
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
    return EMPTY_TELEGRAPHED_HAZARD_SIMULATION_STATE;
  }

  return Object.freeze({ instances: Object.freeze(instances) });
};

export const getTelegraphedHazardLifecycle = (
  state: Readonly<TelegraphedHazardSimulationState>,
  spawn: Readonly<LogicalHazardSpawnInstance>,
): Readonly<TelegraphedHazardLifecycleState> | null => {
  if (!isTelegraphedHazardBehavior(spawn.behavior)) {
    return null;
  }

  const identity = getLogicalHazardSpawnIdentity(spawn);
  return state.instances.find((instance) => instance.spawnIdentity === identity)?.lifecycle ?? null;
};

/**
 * Supplies the existing collision authority with persistent hazards plus active telegraphed ones.
 * Reactive strikes resolve a new immutable hitbox from their locked target; spawn data stays fixed.
 */
export const getLethalHazardsForTelegraphedSimulation = (
  state: Readonly<TelegraphedHazardSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
): ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> => {
  const lethalHazards: Array<Readonly<LogicalHazardSpawnInstance>> = [];

  for (const spawn of spawns) {
    if (!isTelegraphedHazardBehavior(spawn.behavior)) {
      lethalHazards.push(spawn);
      continue;
    }

    const lifecycle = getTelegraphedHazardLifecycle(state, spawn);
    if (!lifecycle || !isTelegraphedHazardLethal(lifecycle)) {
      continue;
    }

    if (isTargetLockStrikeHazardBehavior(spawn.behavior)) {
      const target = lifecycle.lockedTarget ?? lifecycle.latestObservedTarget;
      lethalHazards.push(
        Object.freeze({
          ...spawn,
          hitbox: resolveTargetLockStrikeHitbox(spawn, target.positionY),
        }),
      );
      continue;
    }

    lethalHazards.push(spawn);
  }

  return Object.freeze(lethalHazards);
};
