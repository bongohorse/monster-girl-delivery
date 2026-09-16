import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
} from '../generation/PatternSpawnScheduler';
import type { HazardGameplayState } from './HazardReactionState';
import { isPrototypeZapperHazard } from './PrototypeZapperHazard';
import {
  createTimedZapperLifecycleState,
  stepTimedZapperLifecycle,
  type TimedZapperLethalInterval,
  type TimedZapperLifecycleState,
} from './TimedZapperLifecycle';

export interface TimedZapperLifecycleInstance {
  /** Exact lethal slices produced by the most recent authoritative simulation step. */
  readonly lethalIntervals: ReadonlyArray<Readonly<TimedZapperLethalInterval>>;
  readonly lifecycle: Readonly<TimedZapperLifecycleState>;
  readonly spawnIdentity: string;
}

export interface TimedZapperSimulationState {
  readonly instances: ReadonlyArray<Readonly<TimedZapperLifecycleInstance>>;
  /** Most recent normalized simulation delta; zero means collision must not be re-evaluated. */
  readonly stepElapsedSeconds: number;
}

export type TimedZapperGameplayStateResolver = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
) => HazardGameplayState;

const EMPTY_TIMED_ZAPPER_SIMULATION_STATE: Readonly<TimedZapperSimulationState> = Object.freeze({
  instances: Object.freeze([]),
  stepElapsedSeconds: 0,
});

const NO_COLLISION_INTERVAL = Object.freeze({ startSeconds: 0, endSeconds: 0 });

export const createTimedZapperSimulationState = (): Readonly<TimedZapperSimulationState> =>
  EMPTY_TIMED_ZAPPER_SIMULATION_STATE;

const getTimedZapperConfig = (spawn: Readonly<LogicalHazardSpawnInstance>) =>
  isPrototypeZapperHazard(spawn) ? (spawn.behavior.timing ?? null) : null;

/**
 * Synchronizes per-spawn Timed Zapper lifecycle state to the currently retained spawn set. Timing is
 * advanced only from the caller-supplied simulation delta. A zero delta may register a newly spawned
 * Timed Zapper in OFF, but it cannot advance phase or create a lethal interval.
 */
export const stepTimedZapperSimulation = (
  state: Readonly<TimedZapperSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  elapsedSeconds: number,
): Readonly<TimedZapperSimulationState> => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Timed Zapper simulation elapsedSeconds must be non-negative and finite.');
  }

  const existingByIdentity = new Map(
    state.instances.map((instance) => [instance.spawnIdentity, instance] as const),
  );
  const seenIdentities = new Set<string>();
  const instances: TimedZapperLifecycleInstance[] = [];

  for (const spawn of spawns) {
    const config = getTimedZapperConfig(spawn);
    if (!config) {
      continue;
    }

    const spawnIdentity = getLogicalHazardSpawnIdentity(spawn);
    if (seenIdentities.has(spawnIdentity)) {
      throw new TypeError(`Timed Zapper spawn identity must be unique: ${spawnIdentity}`);
    }
    seenIdentities.add(spawnIdentity);

    const existing = existingByIdentity.get(spawnIdentity);
    const lifecycleStep = stepTimedZapperLifecycle(
      existing?.lifecycle ?? createTimedZapperLifecycleState(),
      elapsedSeconds,
      config,
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
    return EMPTY_TIMED_ZAPPER_SIMULATION_STATE;
  }

  return Object.freeze({
    instances: Object.freeze(instances),
    stepElapsedSeconds: elapsedSeconds,
  });
};

/**
 * Adapts Timed Zapper phase authority into the existing logical collision path. OFF, CHARGE,
 * externally disabled, and destroyed states remain present with an explicit empty collision interval
 * so Graze occurrence identity/history is retained without becoming lethal. ON slices are emitted as
 * exact collision intervals over the same authored Zapper geometry; multiple slices are allowed for
 * unexpectedly large deltas without introducing a global microstep. A zero-delta update omits timed
 * collision candidates entirely, matching pause/resize semantics while Graze preserves its state.
 */
export const getCollisionHazardsForTimedZapperSimulation = (
  state: Readonly<TimedZapperSimulationState>,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  resolveGameplayState: TimedZapperGameplayStateResolver = () => 'active',
): ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> => {
  const hazards: Array<Readonly<LogicalHazardSpawnInstance>> = [];

  for (const spawn of spawns) {
    const config = getTimedZapperConfig(spawn);
    if (!config) {
      hazards.push(spawn);
      continue;
    }

    if (state.stepElapsedSeconds === 0) {
      continue;
    }

    const identity = getLogicalHazardSpawnIdentity(spawn);
    const instance = state.instances.find((candidate) => candidate.spawnIdentity === identity);
    const gameplayState = resolveGameplayState(spawn);
    if (!instance || gameplayState !== 'active' || instance.lethalIntervals.length === 0) {
      hazards.push(
        Object.freeze({
          ...spawn,
          collisionEndsAtIntervalEnd: false,
          collisionInterval: NO_COLLISION_INTERVAL,
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
        }),
      );
    }
  }

  return Object.freeze(hazards);
};

/** Authoritative presentation/debug seam. Reading this state cannot advance gameplay time. */
export const getTimedZapperLifecycle = (
  state: Readonly<TimedZapperSimulationState>,
  spawn: Readonly<LogicalHazardSpawnInstance>,
): Readonly<TimedZapperLifecycleState> | null => {
  if (!getTimedZapperConfig(spawn)) {
    return null;
  }
  const identity = getLogicalHazardSpawnIdentity(spawn);
  return state.instances.find((instance) => instance.spawnIdentity === identity)?.lifecycle ?? null;
};
