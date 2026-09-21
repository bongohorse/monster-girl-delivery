import { describe, expect, it } from 'vitest';
import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
  scheduleNextPattern,
} from '../../src/generation/PatternSpawnScheduler';
import {
  PROTOTYPE_M5_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_ZAPPER_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { PROTOTYPE_TIMED_ZAPPER_PATTERN } from '../../src/generation/PrototypeTimedZapperFixture';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import {
  applyHazardExternalEffect,
  createHazardReactionState,
  getHazardGameplayState,
} from '../../src/hazards/HazardReactionState';
import {
  createTimedZapperSimulationState,
  getCollisionHazardsForTimedZapperSimulation,
  getTimedZapperLifecycle,
  stepTimedZapperSimulation,
} from '../../src/hazards/TimedZapperSimulation';
import {
  isPlayerCollidingWithHazardDuringStep,
  type LogicalHazard,
} from '../../src/systems/HazardCollision';
import {
  EMPTY_PROTOTYPE_GRAZE_RUN_STATE,
  evaluatePrototypeGrazeStep,
  type PrototypeGrazeRunState,
} from '../../src/systems/PrototypeGraze';
import type { RunMotionState } from '../../src/systems/RunMotionSimulation';
import { createVerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';
import { STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const FLIGHT_TUNING = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 1_000,
  maxRiseVelocity: 1_000,
});
const FLIGHT_BOUNDS = Object.freeze({ ceilingY: -1_000, floorY: 1_000 });

const createTimedSpawn = (): Readonly<LogicalHazardSpawnInstance> => {
  const schedule = scheduleNextPattern({
    catalog: [PROTOTYPE_TIMED_ZAPPER_PATTERN],
    patternStartDistance: 0,
    state: createRunGenerationState('timed-zapper-simulation'),
  });
  if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
    throw new Error('Expected Timed Zapper fixture to schedule.');
  }
  return schedule.spawns[0];
};

const requireSingleHazard = (
  hazards: ReadonlyArray<Readonly<LogicalHazard>>,
): Readonly<LogicalHazard> => {
  const hazard = hazards[0];
  if (hazards.length !== 1 || !hazard) {
    throw new Error(`Expected exactly one collision hazard, received ${hazards.length}.`);
  }
  return hazard;
};

const createStationaryTrajectory = (positionY: number, elapsedSeconds: number) =>
  createVerticalFlightTrajectory(
    { positionY, velocityY: 0 },
    elapsedSeconds,
    false,
    FLIGHT_TUNING,
    FLIGHT_BOUNDS,
  );

const collides = (
  hazard: Readonly<LogicalHazard>,
  initialRunState: Readonly<RunMotionState>,
  elapsedSeconds: number,
  scrollSpeed: number,
  positionY = 195,
) =>
  isPlayerCollidingWithHazardDuringStep(
    initialRunState,
    createStationaryTrajectory(positionY, elapsedSeconds),
    elapsedSeconds,
    { baseScrollSpeed: scrollSpeed },
    hazard,
  );

describe('Timed Zapper simulation', () => {
  it('keeps the timed fixture separate from the permanent-active live Zapper catalog slot', () => {
    expect(PROTOTYPE_M5_HAZARD_PATTERN_FIXTURES).not.toContain(PROTOTYPE_TIMED_ZAPPER_PATTERN);

    const liveBehavior = PROTOTYPE_ZAPPER_PATTERN.entries[0]?.behavior;
    expect(liveBehavior?.kind).toBe('zapper');
    if (liveBehavior?.kind === 'zapper') {
      expect(liveBehavior.timing).toBeUndefined();
    }

    const timedBehavior = PROTOTYPE_TIMED_ZAPPER_PATTERN.entries[0]?.behavior;
    expect(timedBehavior?.kind).toBe('zapper');
    if (timedBehavior?.kind === 'zapper') {
      expect(timedBehavior.timing).toEqual({
        offSeconds: 0.8,
        chargeSeconds: 1.2,
        onSeconds: 1.2,
        mode: 'cyclic',
      });
    }
  });

  it('uses the authoritative identity index for lifecycle and collision lookups', () => {
    const spawn = createTimedSpawn();
    const state = stepTimedZapperSimulation(createTimedZapperSimulationState(), [spawn], 2.2);
    const identity = getLogicalHazardSpawnIdentity(spawn);
    const indexedInstance = state.instanceByIdentity?.[identity];

    expect(indexedInstance).toBe(state.instances[0]);

    const noLinearFindState = Object.freeze({
      ...state,
      instances: new Proxy(state.instances, {
        get(target, property, receiver) {
          if (property === 'find' || property === 'map') {
            throw new Error('timed Zapper lifecycle state fell back to array indexing work');
          }
          return Reflect.get(target, property, receiver);
        },
      }),
    });

    expect(getTimedZapperLifecycle(noLinearFindState, spawn)).toBe(indexedInstance?.lifecycle);
    expect(getCollisionHazardsForTimedZapperSimulation(noLinearFindState, [spawn])).toHaveLength(1);

    const missingSpawn = Object.freeze({
      ...spawn,
      entryId: 'missing-timed-zapper',
      patternId: 'missing-timed-zapper-pattern',
      runDistance: spawn.runDistance + 1_000,
    });
    expect(getTimedZapperLifecycle(noLinearFindState, missingSpawn)).toBeNull();
    expect(
      getCollisionHazardsForTimedZapperSimulation(noLinearFindState, [missingSpawn]),
    ).toHaveLength(1);
    expect(() => stepTimedZapperSimulation(noLinearFindState, [spawn], 0.1)).not.toThrow();
  });

  it('uses only the true ON slice when a coarse step crosses CHARGE -> ON', () => {
    const spawn = createTimedSpawn();
    let state = stepTimedZapperSimulation(createTimedZapperSimulationState(), [spawn], 1.8);
    state = stepTimedZapperSimulation(state, [spawn], 0.4);

    const lifecycle = getTimedZapperLifecycle(state, spawn);
    expect(lifecycle?.phase).toBe('on');
    expect(lifecycle?.elapsedPhaseSeconds).toBeCloseTo(0.2, 12);

    const hazards = getCollisionHazardsForTimedZapperSimulation(state, [spawn]);
    expect(hazards).toHaveLength(1);
    expect(hazards[0]?.collisionInterval?.startSeconds).toBeCloseTo(0.2, 12);
    expect(hazards[0]?.collisionInterval?.endSeconds).toBeCloseTo(0.4, 12);

    expect(
      collides(requireSingleHazard(hazards), { distance: 100, simulationSeconds: 1.8 }, 0.4, 350),
    ).toBe(true);
  });

  it('keeps epsilon-snapped ON intervals valid for exact collision evaluation', () => {
    const spawn = createTimedSpawn();
    let state = stepTimedZapperSimulation(createTimedZapperSimulationState(), [spawn], 2);
    const delta = 1.2 - 5e-13;
    state = stepTimedZapperSimulation(state, [spawn], delta);

    const hazard = requireSingleHazard(getCollisionHazardsForTimedZapperSimulation(state, [spawn]));
    expect(hazard.collisionInterval?.endSeconds).toBe(delta);
    expect(hazard.collisionInterval?.endSeconds).toBeLessThanOrEqual(delta);
    expect(() => collides(hazard, { distance: 100, simulationSeconds: 2 }, delta, 350)).not.toThrow();
  });

  it('cannot remain lethal after an ON -> OFF boundary inside a coarse step', () => {
    const spawn = createTimedSpawn();
    let state = stepTimedZapperSimulation(createTimedZapperSimulationState(), [spawn], 3);
    state = stepTimedZapperSimulation(state, [spawn], 0.4);

    const hazards = getCollisionHazardsForTimedZapperSimulation(state, [spawn]);
    expect(hazards).toHaveLength(1);
    expect(hazards[0]?.collisionInterval?.startSeconds).toBe(0);
    expect(hazards[0]?.collisionInterval?.endSeconds).toBeCloseTo(0.2, 12);
    expect(hazards[0]?.collisionEndsAtIntervalEnd).toBe(true);

    expect(
      collides(requireSingleHazard(hazards), { distance: 100, simulationSeconds: 3 }, 0.4, 350),
    ).toBe(false);
  });

  it('keeps timed OFF distinct from external disabled/destroyed state and never reactivates destroyed collision', () => {
    const spawn = createTimedSpawn();
    const identity = getLogicalHazardSpawnIdentity(spawn);
    let timedState = stepTimedZapperSimulation(createTimedZapperSimulationState(), [spawn], 0.2);
    let reactionState = createHazardReactionState();

    expect(getTimedZapperLifecycle(timedState, spawn)?.phase).toBe('off');
    expect(getHazardGameplayState(reactionState, identity)).toBe('active');

    timedState = stepTimedZapperSimulation(timedState, [spawn], 2);
    reactionState = applyHazardExternalEffect(reactionState, identity, { kind: 'disable' });
    const disabledHazards = getCollisionHazardsForTimedZapperSimulation(timedState, [spawn], () =>
      getHazardGameplayState(reactionState, identity),
    );
    expect(getTimedZapperLifecycle(timedState, spawn)?.phase).toBe('on');
    expect(getHazardGameplayState(reactionState, identity)).toBe('disabled');
    expect(
      collides(
        requireSingleHazard(disabledHazards),
        { distance: 280, simulationSeconds: 0.2 },
        2,
        0,
      ),
    ).toBe(false);

    reactionState = applyHazardExternalEffect(reactionState, identity, { kind: 'destroy' });
    timedState = stepTimedZapperSimulation(timedState, [spawn], 5.2);
    const destroyedHazards = getCollisionHazardsForTimedZapperSimulation(timedState, [spawn], () =>
      getHazardGameplayState(reactionState, identity),
    );
    expect(getHazardGameplayState(reactionState, identity)).toBe('destroyed');
    expect(destroyedHazards).toHaveLength(1);
    expect(destroyedHazards[0]?.collisionInterval).toEqual({ startSeconds: 0, endSeconds: 0 });
    expect(
      collides(
        requireSingleHazard(destroyedHazards),
        { distance: 280, simulationSeconds: 2.2 },
        5.2,
        0,
      ),
    ).toBe(false);
  });

  it('does not advance phase or expose collision candidates on zero-delta pause/resize updates', () => {
    const spawn = createTimedSpawn();
    const on = stepTimedZapperSimulation(createTimedZapperSimulationState(), [spawn], 2.2);
    const before = getTimedZapperLifecycle(on, spawn);
    const paused = stepTimedZapperSimulation(on, [spawn], 0);

    expect(getTimedZapperLifecycle(paused, spawn)).toBe(before);
    expect(paused.stepElapsedSeconds).toBe(0);
    expect(getCollisionHazardsForTimedZapperSimulation(paused, [spawn])).toEqual([]);
  });

  it('preserves one logical Graze identity across OFF/CHARGE and later ON cycles', () => {
    const spawn = createTimedSpawn();
    let timedState = createTimedZapperSimulationState();
    let grazeState: Readonly<PrototypeGrazeRunState> = EMPTY_PROTOTYPE_GRAZE_RUN_STATE;
    let runState: RunMotionState = { distance: 280, simulationSeconds: 0 };

    const evaluate = (delta: number) => {
      timedState = stepTimedZapperSimulation(timedState, [spawn], delta);
      const result = evaluatePrototypeGrazeStep(
        grazeState,
        runState,
        createStationaryTrajectory(233, delta),
        delta,
        { baseScrollSpeed: 0 },
        getCollisionHazardsForTimedZapperSimulation(timedState, [spawn]),
      );
      grazeState = result.state;
      runState = {
        distance: runState.distance,
        simulationSeconds: (runState.simulationSeconds ?? 0) + delta,
      };
      expect(result.lethalCollision).toBe(false);
    };

    evaluate(3.2);
    expect(grazeState.count).toBe(1);
    expect(grazeState.consumedOccurrenceIds).toHaveLength(1);

    evaluate(0.8);
    expect(grazeState.count).toBe(1);
    expect(grazeState.consumedOccurrenceIds).toHaveLength(1);

    evaluate(1.2);
    expect(grazeState.count).toBe(1);
    expect(grazeState.consumedOccurrenceIds).toHaveLength(1);
  });

  it('produces equivalent phase and collision outcomes across standard frame schedules', () => {
    const spawn = createTimedSpawn();

    for (const schedule of Object.values(STANDARD_FRAME_SCHEDULES)) {
      let timedState = createTimedZapperSimulationState();
      let elapsed = 0;
      let stepIndex = 0;
      let collided = false;

      while (elapsed < 3.6) {
        const delta = Math.min(schedule.getNextDelta(elapsed, stepIndex), 3.6 - elapsed);
        timedState = stepTimedZapperSimulation(timedState, [spawn], delta);
        const hazards = getCollisionHazardsForTimedZapperSimulation(timedState, [spawn]);
        collided ||= hazards.some((hazard) =>
          collides(hazard, { distance: 280, simulationSeconds: elapsed }, delta, 0),
        );
        elapsed += delta;
        stepIndex += 1;
      }

      const lifecycle = getTimedZapperLifecycle(timedState, spawn);
      expect(collided, schedule.name).toBe(true);
      expect(lifecycle?.phase, schedule.name).toBe('off');
      expect(lifecycle?.elapsedPhaseSeconds, schedule.name).toBeCloseTo(0.4, 9);
    }
  });
});
