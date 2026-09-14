import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../../src/core/AppServices';
import { ViewportService } from '../../../src/core/ViewportService';
import { createPrototypeFlightBounds } from '../../../src/game/PrototypeFlightLayout';
import { Foundation } from '../../../src/game/scenes/Foundation';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../../src/generation/FlightReachability';
import {
  createGeneratedHazardStream,
  type GeneratedHazardSpawnInstance,
  type GeneratedHazardStreamState,
  PROTOTYPE_LIVE_RUN_SEED,
} from '../../../src/generation/GeneratedHazardStream';
import { evaluateHazardApproachTiming } from '../../../src/generation/HazardApproachTiming';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../../src/generation/LiveEncounterPolicy';
import { createPrototypeHazardVerticalDomain } from '../../../src/generation/PrototypeHazardVerticalDomain';
import {
  createTelegraphedHazardSimulationState,
  type TelegraphedHazardSimulationState,
} from '../../../src/hazards/TelegraphedHazardSimulation';
import {
  type LogicalHitbox,
  PROTOTYPE_PLAYER_COLLISION_EXTENTS,
} from '../../../src/systems/HazardCollision';
import {
  PROTOTYPE_FAIL_STATE_DURATION_SECONDS,
  type PrototypeDeathRetryState,
} from '../../../src/systems/PrototypeDeathRetryFlow';
import type { PrototypeRunState } from '../../../src/systems/PrototypeRunSimulation';
import { type FrameSchedule, STANDARD_FRAME_SCHEDULES } from '../../support/FramePartitionHarness';

vi.mock('phaser', () => ({
  Scale: { Events: { RESIZE: 'resize' } },
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
}));

const PLAYER_Y = 195;
const GRAZE_HITBOX: Readonly<LogicalHitbox> = Object.freeze({
  left: 800,
  right: 820,
  top: 160,
  bottom: 168,
});
const LETHAL_HITBOX: Readonly<LogicalHitbox> = Object.freeze({
  left: 1_100,
  right: 1_130,
  top: 180,
  bottom: 210,
});
const NEXT_RUN_SEED = 0x1234_5678;
const MAX_RUN_SECONDS = 5;
const MAX_PARTITION_DELTA_SECONDS = 1 / 30;
const EPSILON = 1e-9;
const SCHEDULE_ENTRIES = Object.entries(STANDARD_FRAME_SCHEDULES);

interface LifecycleEvidence {
  readonly deathDistance: number;
  readonly grazeCount: number;
  readonly retrySeed: number;
  readonly scrollSpeed: number;
}

const getRunState = (foundation: Foundation): PrototypeRunState =>
  Reflect.get(foundation, 'runState') as PrototypeRunState;

const getDeathRetryState = (foundation: Foundation): Readonly<PrototypeDeathRetryState> =>
  Reflect.get(foundation, 'deathRetryState') as Readonly<PrototypeDeathRetryState>;

const getHazardStream = (foundation: Foundation): Readonly<GeneratedHazardStreamState> =>
  Reflect.get(foundation, 'hazardStream') as Readonly<GeneratedHazardStreamState>;

const getTelegraphedState = (foundation: Foundation): Readonly<TelegraphedHazardSimulationState> =>
  Reflect.get(foundation, 'telegraphedHazardState') as Readonly<TelegraphedHazardSimulationState>;

const createStaticSpawn = (
  entryId: string,
  patternEntryIndex: number,
  hitbox: Readonly<LogicalHitbox>,
  stream: Readonly<GeneratedHazardStreamState>,
): Readonly<GeneratedHazardSpawnInstance> =>
  Object.freeze({
    approachTiming: evaluateHazardApproachTiming(
      Math.max(0, hitbox.left - PROTOTYPE_PLAYER_COLLISION_EXTENTS.right),
      0,
      stream.schedulingWindow,
    ),
    behavior: Object.freeze({ archetype: 'geometric' as const, kind: 'static' as const }),
    entryId,
    hitbox,
    patternEntryIndex,
    patternId: 'm5-lifecycle-integration',
    runDistance: hitbox.left,
    type: 'placeholder-barrier',
  });

const createHarness = () => {
  const services = createAppServices();
  services.flightTuning.update({
    gravity: 0,
    thrust: 0,
    maxFallVelocity: 0,
    maxRiseVelocity: 0,
  });

  const foundation = new Foundation(services, false);
  const viewportService = new ViewportService(400, 800);
  const viewport = viewportService.getSnapshot();
  const verticalDomain = createPrototypeHazardVerticalDomain(createPrototypeFlightBounds(viewport));
  const generatedStream = createGeneratedHazardStream(
    PROTOTYPE_LIVE_RUN_SEED,
    Object.freeze({
      catalog: verticalDomain.catalog,
      constraints: verticalDomain.constraints,
      policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
      reachability: Object.freeze({
        flightState: Object.freeze({
          ...PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
          positionY: PLAYER_Y,
          velocityY: 0,
        }),
        flightTuning: services.flightTuning.getSnapshot(),
        playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
      }),
    }),
    services.runMotion.getSnapshot(),
  );
  const hazardStream: Readonly<GeneratedHazardStreamState> = Object.freeze({
    ...generatedStream,
    spawns: Object.freeze([
      createStaticSpawn('graze-only', 0, GRAZE_HITBOX, generatedStream),
      createStaticSpawn('terminal-core', 1, LETHAL_HITBOX, generatedStream),
    ]),
    status: 'exhausted',
  });
  const generatedHazardPresentation = { destroy: vi.fn(), sync: vi.fn() };
  const playerPresentation = {
    destroy: vi.fn(),
    setPosition: vi.fn(),
    setRotation: vi.fn(),
    setScale: vi.fn(),
  };
  const scrollingWorldPresentation = { destroy: vi.fn(), render: vi.fn() };
  const instructions = {
    setPosition: vi.fn(),
    setResolution: vi.fn(),
    setText: vi.fn(),
    setWordWrapWidth: vi.fn(),
  };
  instructions.setPosition.mockReturnValue(instructions);
  instructions.setText.mockReturnValue(instructions);
  instructions.setWordWrapWidth.mockReturnValue(instructions);
  const cameraMain = { setOrigin: vi.fn(), setZoom: vi.fn() };
  cameraMain.setOrigin.mockReturnValue(cameraMain);
  cameraMain.setZoom.mockReturnValue(cameraMain);

  Reflect.set(foundation, 'viewportService', viewportService);
  Reflect.set(foundation, 'hazardVerticalDomain', verticalDomain);
  Reflect.set(foundation, 'hazardStream', hazardStream);
  Reflect.set(foundation, 'telegraphedHazardState', createTelegraphedHazardSimulationState());
  Reflect.set(foundation, 'instructions', instructions);
  Reflect.set(foundation, 'playerPresentation', playerPresentation);
  Reflect.set(foundation, 'generatedHazardPresentation', generatedHazardPresentation);
  Reflect.set(foundation, 'scrollingWorldPresentation', scrollingWorldPresentation);
  Reflect.set(foundation, 'runState', {
    phase: 'running',
    motion: { distance: 0 },
    flight: { positionY: PLAYER_Y, velocityY: 0 },
  } satisfies PrototypeRunState);
  Reflect.set(foundation, 'game', { loop: { actualFps: 60, rawDelta: 16 } });
  Reflect.set(foundation, 'scale', {
    height: 800,
    off: vi.fn(),
    width: 400,
    zoom: 1,
  });
  Reflect.set(foundation, 'cameras', {
    main: cameraMain,
    resize: vi.fn(),
  });

  return {
    foundation,
    generatedHazardPresentation,
    initialStream: hazardStream,
    playerPresentation,
    scrollingWorldPresentation,
    services,
  };
};

const runUntilDead = (foundation: Foundation, schedule: FrameSchedule): void => {
  let elapsedSeconds = 0;
  let steps = 0;

  while (getRunState(foundation).phase === 'running' && elapsedSeconds < MAX_RUN_SECONDS) {
    const deltaSeconds = schedule.getNextDelta(elapsedSeconds, steps);
    foundation.update(0, deltaSeconds * 1_000);
    elapsedSeconds += deltaSeconds;
    steps += 1;
  }

  expect(getRunState(foundation).phase).toBe('dead');
};

const advanceFailStateToReady = (foundation: Foundation, schedule: FrameSchedule): void => {
  let elapsedSeconds = 0;
  let steps = 0;

  while (getDeathRetryState(foundation).phase !== 'retry-ready') {
    if (elapsedSeconds > PROTOTYPE_FAIL_STATE_DURATION_SECONDS + MAX_PARTITION_DELTA_SECONDS) {
      throw new Error(`Schedule ${schedule.name} did not reach retry-ready in bounded time.`);
    }

    const deltaSeconds = schedule.getNextDelta(elapsedSeconds, steps);
    foundation.update(0, deltaSeconds * 1_000);
    elapsedSeconds += deltaSeconds;
    steps += 1;
  }
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Foundation integrated M5 arcade lifecycle', () => {
  it('preserves Graze, death, immutable results, and fresh retry across frame partitions', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: vi.fn((values: Uint32Array) => {
        values[0] = NEXT_RUN_SEED;
        return values;
      }),
    });

    const evidence: LifecycleEvidence[] = [];

    for (const [name, schedule] of SCHEDULE_ENTRIES) {
      const {
        foundation,
        generatedHazardPresentation,
        initialStream,
        playerPresentation,
        scrollingWorldPresentation,
        services,
      } = createHarness();
      const scrollSpeed = initialStream.schedulingWindow.scrollSpeed;
      const collisionOpportunityStart =
        LETHAL_HITBOX.left - PROTOTYPE_PLAYER_COLLISION_EXTENTS.right;

      runUntilDead(foundation, schedule);

      const deadState = getRunState(foundation);
      const finalResult = deadState.finalResult;
      const deadStream = getHazardStream(foundation);
      const deadTelegraphs = getTelegraphedState(foundation);
      const deadRetryState = getDeathRetryState(foundation);

      expect(finalResult).toBeDefined();
      if (!finalResult) {
        throw new Error(`Schedule ${name} ended without an authoritative final result.`);
      }
      const finalResultValue = { ...finalResult };

      expect(deadState.graze?.count).toBe(1);
      expect(finalResult.grazeCount).toBe(1);
      expect(finalResult.collectedCount).toBe(0);
      expect(finalResult.collectedValue).toBe(0);
      expect(finalResult.earnedReward).toBe(0);
      expect(finalResult.score).toBe(Math.floor(finalResult.finalDistance));
      expect(Object.isFrozen(finalResult)).toBe(true);
      expect(finalResult.finalDistance).toBeGreaterThan(collisionOpportunityStart);
      expect(finalResult.finalDistance).toBeLessThanOrEqual(
        collisionOpportunityStart + scrollSpeed * MAX_PARTITION_DELTA_SECONDS + EPSILON,
      );
      expect(deadRetryState).toMatchObject({
        elapsedSeconds: 0,
        phase: 'fail-state',
        result: finalResult,
      });
      expect(services.input.isThrustHeld()).toBe(false);

      foundation.update(0, 0);
      expect(getDeathRetryState(foundation)).toBe(deadRetryState);
      expect(getRunState(foundation).finalResult).toBe(finalResult);
      expect(getHazardStream(foundation)).toBe(deadStream);
      expect(getTelegraphedState(foundation)).toBe(deadTelegraphs);

      services.lifecycle.pause('hidden');
      foundation.update(0, 1_000);
      expect(getDeathRetryState(foundation)).toBe(deadRetryState);
      expect(getRunState(foundation).finalResult).toBe(finalResult);
      services.lifecycle.resume('hidden');
      foundation.update(0, 1_000);
      expect(getDeathRetryState(foundation)).toBe(deadRetryState);

      services.input.pressPointer(7, 'touch');
      foundation.update(0, schedule.getNextDelta(0, 0) * 1_000);
      services.input.releasePointer(7);
      expect(getRunState(foundation).phase).toBe('dead');
      expect(getRunState(foundation).finalResult).toBe(finalResult);

      advanceFailStateToReady(foundation, schedule);
      expect(getDeathRetryState(foundation)).toMatchObject({
        elapsedSeconds: PROTOTYPE_FAIL_STATE_DURATION_SECONDS,
        phase: 'retry-ready',
        result: finalResult,
      });
      expect(getRunState(foundation)).toBe(deadState);
      expect(getRunState(foundation).finalResult).toBe(finalResult);
      expect(getRunState(foundation).finalResult).toEqual(finalResultValue);
      expect(getHazardStream(foundation)).toBe(deadStream);
      expect(getTelegraphedState(foundation)).toBe(deadTelegraphs);
      expect(services.input.consumePrimaryActionPress()).toBe(false);

      services.input.setSpaceHeld(true);
      foundation.update(0, 0);

      const restartedState = getRunState(foundation);
      const restartedStream = getHazardStream(foundation);
      expect(restartedState).toMatchObject({ phase: 'running', motion: { distance: 0 } });
      expect(restartedState.finalResult).toBeUndefined();
      expect(restartedState.graze).toBeUndefined();
      expect(getDeathRetryState(foundation)).toEqual({
        elapsedSeconds: 0,
        phase: 'running',
        result: null,
      });
      expect(restartedStream.generationState.seed).toBe(NEXT_RUN_SEED);
      expect(restartedStream).not.toBe(deadStream);
      expect(services.input.isThrustHeld()).toBe(false);
      expect(services.input.consumePrimaryActionPress()).toBe(false);
      expect(finalResult).toEqual(finalResultValue);
      expect(Reflect.get(foundation, 'playerPresentation')).toBe(playerPresentation);
      expect(Reflect.get(foundation, 'generatedHazardPresentation')).toBe(
        generatedHazardPresentation,
      );
      expect(Reflect.get(foundation, 'scrollingWorldPresentation')).toBe(
        scrollingWorldPresentation,
      );
      expect(playerPresentation.destroy).not.toHaveBeenCalled();
      expect(generatedHazardPresentation.destroy).not.toHaveBeenCalled();
      expect(scrollingWorldPresentation.destroy).not.toHaveBeenCalled();

      evidence.push({
        deathDistance: finalResult.finalDistance,
        grazeCount: finalResult.grazeCount,
        retrySeed: restartedStream.generationState.seed,
        scrollSpeed,
      });
    }

    expect(evidence).toHaveLength(SCHEDULE_ENTRIES.length);
    expect(new Set(evidence.map((entry) => entry.grazeCount))).toEqual(new Set([1]));
    expect(new Set(evidence.map((entry) => entry.retrySeed))).toEqual(new Set([NEXT_RUN_SEED]));

    const deathDistances = evidence.map((entry) => entry.deathDistance);
    const distanceSpread = Math.max(...deathDistances) - Math.min(...deathDistances);
    const maximumObservedSpeed = Math.max(...evidence.map((entry) => entry.scrollSpeed));
    expect(distanceSpread).toBeLessThanOrEqual(
      maximumObservedSpeed * MAX_PARTITION_DELTA_SECONDS + EPSILON,
    );
  });
});
