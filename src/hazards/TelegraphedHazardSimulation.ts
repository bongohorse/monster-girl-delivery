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
  type TelegraphedHazardActiveInterval,
  type TelegraphedHazardLifecycleState,
  type TelegraphedHazardTarget,
  type TelegraphedHazardTargetResolver,
} from './TelegraphedHazardLifecycle';

export interface TelegraphedHazardLifecycleInstance {
  readonly activeInterval: Readonly<TelegraphedHazardActiveInterval> | null;
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
  activeInterval: Readonly<TelegraphedHazardActiveInterval> | null,
): Readonly<TelegraphedHazardLifecycleInstance> =>
  Object.freeze({ activeInterval, lifecycle, spawnIdentity });

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
  resolvePlayerTargetAtDelta?: TelegraphedHazardTargetResolver,
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
    const resolveTargetAtDelta = resolvePlayerTargetAtDelta
      ? (delta: number): Readonly<TelegraphedHazardTarget> =>
          getObservedTarget(spawn, resolvePlayerTargetAtDelta(delta))
      : undefined;
    const existing = existingByIdentity.get(spawnIdentity);
    const lifecycleStep = stepTelegraphedHazardLifecycle(
      existing?.lifecycle ?? createTelegraphedHazardLifecycle(observedTarget),
      elapsedSeconds,
      observedTarget,
      spawn.behavior.lifecycle,
      resolveTargetAtDelta,
    );
    const lifecycle = lifecycleStep.state;

    instances.push(
      existing?.lifecycle === lifecycle && existing.activeInterval === lifecycleStep.activeInterval
        ? existing
        : freezeInstance(spawnIdentity, lifecycle, lifecycleStep.activeInterval),
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

/**
 * Supplies collision with each persistent hazard and only the true Active slice of telegraphed
 * hazards from the most recent lifecycle step. The interval is relative to that run step.
 */
export const getCollisionHazardsForTelegraphedSimulation = (
  state: Readonly<TelegraphedHazardSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
): ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> => {
  const collisionHazards: Array<Readonly<LogicalHazardSpawnInstance>> = [];

  for (const spawn of spawns) {
    if (!isTelegraphedHazardBehavior(spawn.behavior)) {
      collisionHazards.push(spawn);
      continue;
    }

    const identity = getLogicalHazardSpawnIdentity(spawn);
    const instance = state.instances.find((candidate) => candidate.spawnIdentity === identity);
    if (!instance?.activeInterval) {
      continue;
    }

    const hitbox = isTargetLockStrikeHazardBehavior(spawn.behavior)
      ? resolveTargetLockStrikeHitbox(
          spawn,
          (instance.lifecycle.lockedTarget ?? instance.lifecycle.latestObservedTarget).positionY,
        )
      : spawn.hitbox;
    collisionHazards.push(
      Object.freeze({
        ...spawn,
        collisionInterval: instance.activeInterval,
        collisionEndsAtIntervalEnd: instance.lifecycle.phase === 'expired',
        hitbox,
      }),
    );
  }

  return Object.freeze(collisionHazards);
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
