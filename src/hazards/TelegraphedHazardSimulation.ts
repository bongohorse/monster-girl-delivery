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
  getPrototypeMissileRelativeVelocityX,
  isPrototypeMissileBehavior,
  type PrototypeMissileHorizontalLayout,
  resolvePrototypeMissileLaunchScreenLeft,
  resolvePrototypeMissileTrackingTarget,
  resolvePrototypeMissileTravelHitbox,
} from './PrototypeMissileHazard';
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
  /** Immutable screen-space X captured when a Missile enters Active. */
  readonly missileLaunchScreenLeft: number | null;
  readonly spawnIdentity: string;
  /** Immutable first warning observation used by the M5 Missile lag response. */
  readonly warningOriginTarget: Readonly<TelegraphedHazardTarget>;
}

export interface TelegraphedHazardSimulationState {
  readonly instances: ReadonlyArray<Readonly<TelegraphedHazardLifecycleInstance>>;
}

export interface PrototypeMissileCollisionContext extends PrototypeMissileHorizontalLayout {
  readonly scrollSpeed: number;
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

const getLifecycleTarget = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
  warningOriginTarget: Readonly<TelegraphedHazardTarget>,
  playerTarget: Readonly<TelegraphedHazardTarget>,
): Readonly<TelegraphedHazardTarget> =>
  resolvePrototypeMissileTrackingTarget(
    spawn,
    warningOriginTarget,
    getObservedTarget(spawn, playerTarget),
  );

const freezeInstance = (
  spawnIdentity: string,
  lifecycle: Readonly<TelegraphedHazardLifecycleState>,
  activeInterval: Readonly<TelegraphedHazardActiveInterval> | null,
  warningOriginTarget: Readonly<TelegraphedHazardTarget>,
  missileLaunchScreenLeft: number | null,
): Readonly<TelegraphedHazardLifecycleInstance> =>
  Object.freeze({
    activeInterval,
    lifecycle,
    missileLaunchScreenLeft,
    spawnIdentity,
    warningOriginTarget,
  });

/**
 * Synchronizes all telegraphed lifecycles to the generated spawn window. Timed pulses observe their
 * fixed authored center; legacy reactive strikes sample the logical player directly. The M5 Missile
 * instead resolves a deterministic lagged marker from its immutable warning origin, then freezes
 * that marker at the same authoritative warning → lock boundary. Its horizontal launch screen X is
 * captured once at lock → active so later viewport changes cannot move an in-flight projectile.
 * All timing still advances only from TimeService-normalized simulation delta through the generic
 * lifecycle.
 */
export const stepTelegraphedHazardSimulation = (
  state: Readonly<TelegraphedHazardSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  elapsedSeconds: number,
  playerTarget: Readonly<TelegraphedHazardTarget>,
  resolvePlayerTargetAtDelta?: TelegraphedHazardTargetResolver,
  missileLayout?: Readonly<PrototypeMissileHorizontalLayout>,
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

    const existing = existingByIdentity.get(spawnIdentity);
    const rawObservedTarget = getObservedTarget(spawn, playerTarget);
    const warningOriginTarget = existing?.warningOriginTarget ?? rawObservedTarget;
    const observedTarget = resolvePrototypeMissileTrackingTarget(
      spawn,
      warningOriginTarget,
      rawObservedTarget,
    );
    const resolveTargetAtDelta = resolvePlayerTargetAtDelta
      ? (delta: number): Readonly<TelegraphedHazardTarget> =>
          getLifecycleTarget(spawn, warningOriginTarget, resolvePlayerTargetAtDelta(delta))
      : undefined;
    const lifecycleStep = stepTelegraphedHazardLifecycle(
      existing?.lifecycle ?? createTelegraphedHazardLifecycle(warningOriginTarget),
      elapsedSeconds,
      observedTarget,
      spawn.behavior.lifecycle,
      resolveTargetAtDelta,
    );
    const lifecycle = lifecycleStep.state;
    let missileLaunchScreenLeft = existing?.missileLaunchScreenLeft ?? null;

    if (
      missileLaunchScreenLeft === null &&
      lifecycleStep.transition?.to === 'active' &&
      isTargetLockStrikeHazardBehavior(spawn.behavior) &&
      isPrototypeMissileBehavior(spawn.behavior) &&
      missileLayout
    ) {
      missileLaunchScreenLeft = resolvePrototypeMissileLaunchScreenLeft(spawn, missileLayout);
    }

    instances.push(
      existing?.lifecycle === lifecycle &&
        existing.activeInterval === lifecycleStep.activeInterval &&
        existing.missileLaunchScreenLeft === missileLaunchScreenLeft
        ? existing
        : freezeInstance(
            spawnIdentity,
            lifecycle,
            lifecycleStep.activeInterval,
            warningOriginTarget,
            missileLaunchScreenLeft,
          ),
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

const getMissileActiveElapsedAtStepStart = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
  instance: Readonly<TelegraphedHazardLifecycleInstance>,
): number => {
  const interval = instance.activeInterval;
  if (!interval || !isTargetLockStrikeHazardBehavior(spawn.behavior)) {
    return 0;
  }

  if (instance.lifecycle.phase === 'expired') {
    return Math.max(0, spawn.behavior.lifecycle.durations.activeSeconds - interval.endSeconds);
  }

  return Math.max(0, instance.lifecycle.elapsedPhaseSeconds - interval.endSeconds);
};

/**
 * Supplies collision with each persistent hazard and only the true Active slice of telegraphed
 * hazards from the most recent lifecycle step. The interval is relative to that run step.
 */
export const getCollisionHazardsForTelegraphedSimulation = (
  state: Readonly<TelegraphedHazardSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  missileContext?: Readonly<PrototypeMissileCollisionContext>,
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

    const target = instance.lifecycle.lockedTarget ?? instance.lifecycle.latestObservedTarget;
    const missile =
      isTargetLockStrikeHazardBehavior(spawn.behavior) &&
      isPrototypeMissileBehavior(spawn.behavior);
    const hitbox =
      missile && missileContext
        ? resolvePrototypeMissileTravelHitbox(
            spawn,
            target,
            getMissileActiveElapsedAtStepStart(spawn, instance),
            missileContext,
            instance.missileLaunchScreenLeft,
          )
        : isTargetLockStrikeHazardBehavior(spawn.behavior)
          ? resolveTargetLockStrikeHitbox(spawn, target.positionY)
          : spawn.hitbox;
    const horizontalVelocity =
      missile && missileContext
        ? missileContext.scrollSpeed + getPrototypeMissileRelativeVelocityX(spawn.behavior)
        : undefined;

    collisionHazards.push(
      Object.freeze({
        ...spawn,
        collisionInterval: instance.activeInterval,
        collisionEndsAtIntervalEnd: instance.lifecycle.phase === 'expired',
        ...(horizontalVelocity === undefined ? {} : { horizontalVelocity }),
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

export const getPrototypeMissileLaunchScreenLeft = (
  state: Readonly<TelegraphedHazardSimulationState>,
  spawn: Readonly<LogicalHazardSpawnInstance>,
): number | null => {
  if (
    !isTargetLockStrikeHazardBehavior(spawn.behavior) ||
    !isPrototypeMissileBehavior(spawn.behavior)
  ) {
    return null;
  }

  const identity = getLogicalHazardSpawnIdentity(spawn);
  return (
    state.instances.find((instance) => instance.spawnIdentity === identity)
      ?.missileLaunchScreenLeft ?? null
  );
};

/**
 * Supplies the existing collision authority with persistent hazards plus active telegraphed ones.
 * Reactive strikes resolve immutable hitboxes from their committed target and current travel state.
 */
export const getLethalHazardsForTelegraphedSimulation = (
  state: Readonly<TelegraphedHazardSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  missileLayout?: Readonly<PrototypeMissileHorizontalLayout>,
): ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> => {
  const lethalHazards: Array<Readonly<LogicalHazardSpawnInstance>> = [];

  for (const spawn of spawns) {
    if (!isTelegraphedHazardBehavior(spawn.behavior)) {
      lethalHazards.push(spawn);
      continue;
    }

    const identity = getLogicalHazardSpawnIdentity(spawn);
    const instance = state.instances.find((candidate) => candidate.spawnIdentity === identity);
    const lifecycle = instance?.lifecycle;
    if (!lifecycle || !isTelegraphedHazardLethal(lifecycle)) {
      continue;
    }

    if (isTargetLockStrikeHazardBehavior(spawn.behavior)) {
      const target = lifecycle.lockedTarget ?? lifecycle.latestObservedTarget;
      const hitbox =
        isPrototypeMissileBehavior(spawn.behavior) && missileLayout
          ? resolvePrototypeMissileTravelHitbox(
              spawn,
              target,
              lifecycle.elapsedPhaseSeconds,
              missileLayout,
              instance?.missileLaunchScreenLeft,
            )
          : resolveTargetLockStrikeHitbox(spawn, target.positionY);
      lethalHazards.push(Object.freeze({ ...spawn, hitbox }));
      continue;
    }

    lethalHazards.push(spawn);
  }

  return Object.freeze(lethalHazards);
};
