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
  resolvePrototypeMissileLaunchRelativeLeft,
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
  /** Immutable logical X offset from the player captured when a Missile enters Active. */
  readonly missileLaunchRelativeLeft: number | null;
  readonly spawnIdentity: string;
  /** Immutable first warning observation used to initialize the M5 Missile warning marker. */
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
  trackingOriginTarget: Readonly<TelegraphedHazardTarget>,
  elapsedSeconds: number,
  playerTarget: Readonly<TelegraphedHazardTarget>,
): Readonly<TelegraphedHazardTarget> =>
  resolvePrototypeMissileTrackingTarget(
    spawn,
    trackingOriginTarget,
    getObservedTarget(spawn, playerTarget),
    elapsedSeconds,
  );

const freezeInstance = (
  spawnIdentity: string,
  lifecycle: Readonly<TelegraphedHazardLifecycleState>,
  activeInterval: Readonly<TelegraphedHazardActiveInterval> | null,
  warningOriginTarget: Readonly<TelegraphedHazardTarget>,
  missileLaunchRelativeLeft: number | null,
): Readonly<TelegraphedHazardLifecycleInstance> =>
  Object.freeze({
    activeInterval,
    lifecycle,
    missileLaunchRelativeLeft,
    spawnIdentity,
    warningOriginTarget,
  });

/**
 * Synchronizes all telegraphed lifecycles to the generated spawn window. Timed pulses observe their
 * fixed authored center; legacy reactive strikes sample the logical player directly. The M5 Missile
 * advances a rate-limited warning marker from its prior authoritative marker position toward the
 * player, then freezes that marker at the same authoritative warning → lock boundary. Its horizontal
 * launch offset from the player is captured once at lock → active so later viewport changes cannot
 * alter gameplay geometry. All timing still advances only from TimeService-normalized simulation
 * delta through the generic lifecycle.
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
    const trackingOriginTarget = existing?.lifecycle.latestObservedTarget ?? warningOriginTarget;
    const observedTarget = resolvePrototypeMissileTrackingTarget(
      spawn,
      trackingOriginTarget,
      rawObservedTarget,
      elapsedSeconds,
    );
    const resolveTargetAtDelta = resolvePlayerTargetAtDelta
      ? (delta: number): Readonly<TelegraphedHazardTarget> =>
          getLifecycleTarget(
            spawn,
            trackingOriginTarget,
            delta,
            resolvePlayerTargetAtDelta(delta),
          )
      : undefined;
    const lifecycleStep = stepTelegraphedHazardLifecycle(
      existing?.lifecycle ?? createTelegraphedHazardLifecycle(warningOriginTarget),
      elapsedSeconds,
      observedTarget,
      spawn.behavior.lifecycle,
      resolveTargetAtDelta,
    );
    const lifecycle = lifecycleStep.state;
    let missileLaunchRelativeLeft = existing?.missileLaunchRelativeLeft ?? null;

    if (
      missileLaunchRelativeLeft === null &&
      lifecycleStep.transition?.to === 'active' &&
      isTargetLockStrikeHazardBehavior(spawn.behavior) &&
      isPrototypeMissileBehavior(spawn.behavior) &&
      missileLayout
    ) {
      missileLaunchRelativeLeft = resolvePrototypeMissileLaunchRelativeLeft(spawn, missileLayout);
    }

    instances.push(
      existing?.lifecycle === lifecycle &&
        existing.activeInterval === lifecycleStep.activeInterval &&
        existing.missileLaunchRelativeLeft === missileLaunchRelativeLeft
        ? existing
        : freezeInstance(
            spawnIdentity,
            lifecycle,
            lifecycleStep.activeInterval,
            warningOriginTarget,
            missileLaunchRelativeLeft,
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

/**
 * Returns the Missile trajectory time at the beginning of the current simulation step. A negative
 * result is intentional when Active begins partway through the step: collision extrapolates the same
 * linear path backward to t=0, then the Active interval clips lethality until the true launch time.
 */
const getMissileTrajectoryElapsedAtStepStart = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
  instance: Readonly<TelegraphedHazardLifecycleInstance>,
): number => {
  const interval = instance.activeInterval;
  if (!interval || !isTargetLockStrikeHazardBehavior(spawn.behavior)) {
    return 0;
  }

  if (instance.lifecycle.phase === 'expired') {
    return spawn.behavior.lifecycle.durations.activeSeconds - interval.endSeconds;
  }

  return instance.lifecycle.elapsedPhaseSeconds - interval.endSeconds;
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
            getMissileTrajectoryElapsedAtStepStart(spawn, instance),
            missileContext,
            instance.missileLaunchRelativeLeft,
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

export const getPrototypeMissileLaunchRelativeLeft = (
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
      ?.missileLaunchRelativeLeft ?? null
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
              instance?.missileLaunchRelativeLeft,
            )
          : resolveTargetLockStrikeHitbox(spawn, target.positionY);
      lethalHazards.push(Object.freeze({ ...spawn, hitbox }));
      continue;
    }

    lethalHazards.push(spawn);
  }

  return Object.freeze(lethalHazards);
};
