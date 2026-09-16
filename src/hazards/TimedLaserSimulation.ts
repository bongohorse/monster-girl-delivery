import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
} from '../generation/PatternSpawnScheduler';
import type { HazardGameplayState } from './HazardReactionState';
import {
  isPrototypeLaserHazard,
  resolvePrototypeLaserHitbox,
  type PrototypeLaserLayout,
} from './PrototypeLaserHazard';
import {
  createTimedLaserLifecycleState,
  stepTimedLaserLifecycle,
  type TimedLaserLethalInterval,
  type TimedLaserLifecycleState,
} from './TimedLaserLifecycle';

export interface TimedLaserLifecycleInstance {
  readonly lethalIntervals: ReadonlyArray<Readonly<TimedLaserLethalInterval>>;
  readonly lifecycle: Readonly<TimedLaserLifecycleState>;
  readonly spawnIdentity: string;
}

export interface TimedLaserSimulationState {
  readonly instances: ReadonlyArray<Readonly<TimedLaserLifecycleInstance>>;
  readonly stepElapsedSeconds: number;
}

export interface TimedLaserCollisionContext extends PrototypeLaserLayout {
  readonly scrollSpeed: number;
}

export type TimedLaserGameplayStateResolver = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
) => HazardGameplayState;

const EMPTY_TIMED_LASER_SIMULATION_STATE: Readonly<TimedLaserSimulationState> = Object.freeze({
  instances: Object.freeze([]),
  stepElapsedSeconds: 0,
});

const NO_COLLISION_INTERVAL = Object.freeze({ startSeconds: 0, endSeconds: 0 });

export const createTimedLaserSimulationState = (): Readonly<TimedLaserSimulationState> =>
  EMPTY_TIMED_LASER_SIMULATION_STATE;

export const stepTimedLaserSimulation = (
  state: Readonly<TimedLaserSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  elapsedSeconds: number,
): Readonly<TimedLaserSimulationState> => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Timed Laser simulation elapsedSeconds must be non-negative and finite.');
  }

  const existingByIdentity = new Map(
    state.instances.map((instance) => [instance.spawnIdentity, instance] as const),
  );
  const seenIdentities = new Set<string>();
  const instances: TimedLaserLifecycleInstance[] = [];

  for (const spawn of spawns) {
    if (!isPrototypeLaserHazard(spawn)) {
      continue;
    }

    const spawnIdentity = getLogicalHazardSpawnIdentity(spawn);
    if (seenIdentities.has(spawnIdentity)) {
      throw new TypeError(`Timed Laser spawn identity must be unique: ${spawnIdentity}`);
    }
    seenIdentities.add(spawnIdentity);

    const existing = existingByIdentity.get(spawnIdentity);
    const lifecycleStep = stepTimedLaserLifecycle(
      existing?.lifecycle ?? createTimedLaserLifecycleState(),
      elapsedSeconds,
      spawn.behavior.lifecycle,
    );
    instances.push(
      Object.freeze({
        lethalIntervals: lifecycleStep.lethalIntervals,
        lifecycle: lifecycleStep.state,
        spawnIdentity,
      }),
    );
  }

  if (instances.length === 0) {
    return EMPTY_TIMED_LASER_SIMULATION_STATE;
  }

  return Object.freeze({
    instances: Object.freeze(instances),
    stepElapsedSeconds: elapsedSeconds,
  });
};

/**
 * Converts Laser ON slices into the existing continuous collision authority. Safe phases keep an
 * explicit empty interval so Graze occurrence history remains stable without awarding safe-warning
 * grazes. Screen-span beams move horizontally with run scroll in world coordinates, pinning them to
 * the same screen position for the complete event.
 */
export const getCollisionHazardsForTimedLaserSimulation = (
  state: Readonly<TimedLaserSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  context: Readonly<TimedLaserCollisionContext>,
  resolveGameplayState: TimedLaserGameplayStateResolver = () => 'active',
): ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> => {
  if (!Number.isFinite(context.scrollSpeed) || context.scrollSpeed < 0) {
    throw new RangeError('Timed Laser scrollSpeed must be non-negative and finite.');
  }

  const hazards: Array<Readonly<LogicalHazardSpawnInstance>> = [];

  for (const spawn of spawns) {
    if (!isPrototypeLaserHazard(spawn)) {
      hazards.push(spawn);
      continue;
    }

    if (state.stepElapsedSeconds === 0) {
      continue;
    }

    const identity = getLogicalHazardSpawnIdentity(spawn);
    const instance = state.instances.find((candidate) => candidate.spawnIdentity === identity);
    const gameplayState = resolveGameplayState(spawn);
    const hitbox = resolvePrototypeLaserHitbox(spawn, context);
    if (!hitbox) {
      continue;
    }

    const screenPinned = spawn.behavior.span === 'screen';
    if (!instance || gameplayState !== 'active' || instance.lethalIntervals.length === 0) {
      hazards.push(
        Object.freeze({
          ...spawn,
          collisionEndsAtIntervalEnd: false,
          collisionInterval: NO_COLLISION_INTERVAL,
          ...(screenPinned ? { horizontalVelocity: context.scrollSpeed } : {}),
          hitbox,
        }),
      );
      continue;
    }

    for (const interval of instance.lethalIntervals) {
      hazards.push(
        Object.freeze({
          ...spawn,
          collisionEndsAtIntervalEnd: interval.endsPhase,
          collisionInterval: Object.freeze({
            startSeconds: interval.startSeconds,
            endSeconds: interval.endSeconds,
          }),
          ...(screenPinned ? { horizontalVelocity: context.scrollSpeed } : {}),
          hitbox,
        }),
      );
    }
  }

  return Object.freeze(hazards);
};

export const getTimedLaserLifecycle = (
  state: Readonly<TimedLaserSimulationState>,
  spawn: Readonly<LogicalHazardSpawnInstance>,
): Readonly<TimedLaserLifecycleState> | null => {
  if (!isPrototypeLaserHazard(spawn)) {
    return null;
  }
  const identity = getLogicalHazardSpawnIdentity(spawn);
  return state.instances.find((instance) => instance.spawnIdentity === identity)?.lifecycle ?? null;
};
