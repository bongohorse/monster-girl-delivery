import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
} from '../generation/PatternSpawnScheduler';
import {
  isLaserHazardBehavior,
  isTargetLockStrikeHazardBehavior,
  isTelegraphedHazardBehavior,
  isTimedPulseHazardBehavior,
  resolveTargetLockStrikeHitbox,
} from './HazardArchetype';
import {
  isPrototypeLaserHazard,
  resolvePrototypeLaserHitbox,
} from './PrototypeLaserHazard';
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
import {
  createTimedLaserLifecycleState,
  isTimedLaserLethal,
  stepTimedLaserLifecycle,
  type TimedLaserLethalInterval,
  type TimedLaserLifecycleState,
} from './TimedLaserLifecycle';

export interface TelegraphedHazardLifecycleInstance {
  readonly activeInterval: Readonly<TelegraphedHazardActiveInterval> | null;
  readonly laserLethalIntervals: ReadonlyArray<Readonly<TimedLaserLethalInterval>>;
  readonly laserLifecycle: Readonly<TimedLaserLifecycleState> | null;
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
const EMPTY_LASER_INTERVALS: ReadonlyArray<Readonly<TimedLaserLethalInterval>> = Object.freeze([]);
const LASER_VERTICAL_COLLISION_EXTENT = 1_000_000;

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
  if (isTimedPulseHazardBehavior(spawn.behavior) || isLaserHazardBehavior(spawn.behavior)) {
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

const createLaserCompatibilityLifecycle = (
  laserLifecycle: Readonly<TimedLaserLifecycleState>,
  target: Readonly<TelegraphedHazardTarget>,
): Readonly<TelegraphedHazardLifecycleState> => {
  const phase = laserLifecycle.complete
    ? 'expired'
    : laserLifecycle.phase === 'on'
      ? 'active'
      : laserLifecycle.phase === 'charge'
        ? 'lock'
        : 'warning';
  return Object.freeze({
    elapsedPhaseSeconds: laserLifecycle.complete ? 0 : laserLifecycle.elapsedPhaseSeconds,
    latestObservedTarget: target,
    lockedTarget: null,
    phase,
  });
};

const freezeInstance = (
  spawnIdentity: string,
  lifecycle: Readonly<TelegraphedHazardLifecycleState>,
  activeInterval: Readonly<TelegraphedHazardActiveInterval> | null,
  warningOriginTarget: Readonly<TelegraphedHazardTarget>,
  missileLaunchRelativeLeft: number | null,
  laserLifecycle: Readonly<TimedLaserLifecycleState> | null = null,
  laserLethalIntervals: ReadonlyArray<Readonly<TimedLaserLethalInterval>> = EMPTY_LASER_INTERVALS,
): Readonly<TelegraphedHazardLifecycleInstance> =>
  Object.freeze({
    activeInterval,
    laserLethalIntervals,
    laserLifecycle,
    lifecycle,
    missileLaunchRelativeLeft,
    spawnIdentity,
    warningOriginTarget,
  });

/**
 * Synchronizes all lifecycle-owned hazards to the generated spawn window. The M5 Laser uses its own
 * five-phase lifecycle inside this existing retention authority; Missile/pulse behavior keeps the
 * established telegraphed lifecycle. All timing advances only from normalized simulation delta.
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

    if (isLaserHazardBehavior(spawn.behavior)) {
      const laserStep = stepTimedLaserLifecycle(
        existing?.laserLifecycle ?? createTimedLaserLifecycleState(),
        elapsedSeconds,
        spawn.behavior.lifecycle,
      );
      const compatibilityLifecycle = createLaserCompatibilityLifecycle(
        laserStep.state,
        warningOriginTarget,
      );
      const firstLethalInterval = laserStep.lethalIntervals[0] ?? null;
      instances.push(
        freezeInstance(
          spawnIdentity,
          compatibilityLifecycle,
          firstLethalInterval,
          warningOriginTarget,
          null,
          laserStep.state,
          laserStep.lethalIntervals,
        ),
      );
      continue;
    }

    const trackingOriginTarget = existing?.lifecycle.latestObservedTarget ?? warningOriginTarget;
    const observedTarget = resolvePrototypeMissileTrackingTarget(
      spawn,
      trackingOriginTarget,
      rawObservedTarget,
      elapsedSeconds,
    );
    const resolveTargetAtDelta = resolvePlayerTargetAtDelta
      ? (delta: number): Readonly<TelegraphedHazardTarget> =>
          getLifecycleTarget(spawn, trackingOriginTarget, delta, resolvePlayerTargetAtDelta(delta))
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

const resolveLaserCollisionHitbox = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
  context: Readonly<PrototypeMissileCollisionContext>,
) => {
  const hitbox = resolvePrototypeLaserHitbox(spawn, {
    playerRunDistance: context.playerRunDistance,
    playerScreenX: context.playerScreenX,
    viewportHeight: 1,
    viewportWidth: context.viewportRight - context.viewportLeft,
  });
  if (!hitbox || !isPrototypeLaserHazard(spawn)) {
    return spawn.hitbox;
  }
  if (spawn.behavior.orientation === 'vertical' && spawn.behavior.span === 'screen') {
    return Object.freeze({
      ...hitbox,
      top: -LASER_VERTICAL_COLLISION_EXTENT,
      bottom: LASER_VERTICAL_COLLISION_EXTENT,
    });
  }
  return hitbox;
};

/**
 * Supplies collision with persistent hazards and only true lethal lifecycle slices. Laser ON can
 * yield multiple exact slices for unusually large deltas; TELEGRAPH/CHARGE/RECOVERY never enter the
 * collision stream, so they cannot accidentally award Graze or kill the player.
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

    if (isLaserHazardBehavior(spawn.behavior)) {
      if (!instance?.laserLifecycle || instance.laserLethalIntervals.length === 0 || !missileContext) {
        continue;
      }
      const hitbox = resolveLaserCollisionHitbox(spawn, missileContext);
      for (const interval of instance.laserLethalIntervals) {
        collisionHazards.push(
          Object.freeze({
            ...spawn,
            collisionInterval: Object.freeze({
              startSeconds: interval.startSeconds,
              endSeconds: interval.endSeconds,
            }),
            collisionEndsAtIntervalEnd: interval.endsPhase,
            ...(spawn.behavior.span === 'screen'
              ? { horizontalVelocity: missileContext.scrollSpeed }
              : {}),
            hitbox,
          }),
        );
      }
      continue;
    }

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

export const getTimedLaserLifecycle = (
  state: Readonly<TelegraphedHazardSimulationState>,
  spawn: Readonly<LogicalHazardSpawnInstance>,
): Readonly<TimedLaserLifecycleState> | null => {
  if (!isLaserHazardBehavior(spawn.behavior)) {
    return null;
  }
  const identity = getLogicalHazardSpawnIdentity(spawn);
  return state.instances.find((instance) => instance.spawnIdentity === identity)?.laserLifecycle ?? null;
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
 * Supplies the existing instantaneous lethal snapshot authority. Laser callers use exact lifecycle
 * ON state plus the current screen-event layout when available; the run-step path above remains the
 * authoritative continuous collision source.
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

    if (isLaserHazardBehavior(spawn.behavior)) {
      if (!instance?.laserLifecycle || !isTimedLaserLethal(instance.laserLifecycle)) {
        continue;
      }
      if (!missileLayout) {
        lethalHazards.push(spawn);
        continue;
      }
      const hitbox = resolveLaserCollisionHitbox(spawn, { ...missileLayout, scrollSpeed: 0 });
      lethalHazards.push(Object.freeze({ ...spawn, hitbox }));
      continue;
    }

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
