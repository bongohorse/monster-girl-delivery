import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../../src/core/AppServices';
import { ViewportService } from '../../../src/core/ViewportService';
import { createPrototypeFlightBounds } from '../../../src/game/PrototypeFlightLayout';
import { Foundation } from '../../../src/game/scenes/Foundation';
import {
  createGeneratedHazardStream,
  type GeneratedHazardSpawnInstance,
  type GeneratedHazardStreamState,
  PROTOTYPE_LIVE_RUN_SEED,
} from '../../../src/generation/GeneratedHazardStream';
import { evaluateHazardApproachTiming } from '../../../src/generation/HazardApproachTiming';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../../src/generation/LiveEncounterPolicy';
import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
} from '../../../src/generation/PatternSpawnScheduler';
import { createPrototypeHazardVerticalDomain } from '../../../src/generation/PrototypeHazardVerticalDomain';
import {
  createTelegraphedHazardSimulationState,
  stepTelegraphedHazardSimulation,
  type TelegraphedHazardSimulationState,
} from '../../../src/hazards/TelegraphedHazardSimulation';
import {
  type LogicalHitbox,
  PROTOTYPE_PLAYER_COLLISION_EXTENTS,
} from '../../../src/systems/HazardCollision';
import {
  enterPrototypeFailState,
  PROTOTYPE_FAIL_STATE_DURATION_SECONDS,
  type PrototypeDeathRetryState,
  stepPrototypeDeathRetryState,
} from '../../../src/systems/PrototypeDeathRetryFlow';
import { createPrototypeRunResultSnapshot } from '../../../src/systems/PrototypeRunResult';
import type { PrototypeRunState } from '../../../src/systems/PrototypeRunSimulation';

vi.mock('phaser', () => ({
  Scale: { Events: { RESIZE: 'resize' } },
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
}));

const NEXT_RUN_SEED = 0x7654_3210;
const OLD_PATTERN_ID = 'm5-retry-isolation';
const OLD_STATIC_HITBOX: Readonly<LogicalHitbox> = Object.freeze({
  left: 1_400,
  right: 1_432,
  top: 90,
  bottom: 122,
});
const OLD_TELEGRAPH_HITBOX: Readonly<LogicalHitbox> = Object.freeze({
  left: 10_000,
  right: 10_064,
  top: 155,
  bottom: 219,
});

const STATIC_BEHAVIOR: GeneratedHazardSpawnInstance['behavior'] = Object.freeze({
  archetype: 'geometric',
  kind: 'static',
});
const TIMED_BEHAVIOR: GeneratedHazardSpawnInstance['behavior'] = Object.freeze({
  archetype: 'timed',
  kind: 'pulse',
  lifecycle: Object.freeze({
    durations: Object.freeze({
      warningSeconds: 10,
      lockSeconds: 0.25,
      activeSeconds: 0.9,
    }),
    warningGeometry: Object.freeze({
      leftOffset: -42,
      rightOffset: 42,
      topOffset: -42,
      bottomOffset: 42,
    }),
  }),
});

const createSpawn = (
  entryId: string,
  patternEntryIndex: number,
  hitbox: Readonly<LogicalHitbox>,
  behavior: GeneratedHazardSpawnInstance['behavior'],
  stream: Readonly<GeneratedHazardStreamState>,
): Readonly<GeneratedHazardSpawnInstance> =>
  Object.freeze({
    approachTiming: evaluateHazardApproachTiming(
      Math.max(0, hitbox.left - PROTOTYPE_PLAYER_COLLISION_EXTENTS.right),
      0,
      stream.schedulingWindow,
    ),
    behavior,
    entryId,
    hitbox,
    patternEntryIndex,
    patternId: OLD_PATTERN_ID,
    runDistance: hitbox.left,
    type: 'placeholder-barrier',
  });

const getRunState = (foundation: Foundation): PrototypeRunState =>
  Reflect.get(foundation, 'runState') as PrototypeRunState;
const getDeathRetryState = (foundation: Foundation): Readonly<PrototypeDeathRetryState> =>
  Reflect.get(foundation, 'deathRetryState') as Readonly<PrototypeDeathRetryState>;
const getHazardStream = (foundation: Foundation): Readonly<GeneratedHazardStreamState> =>
  Reflect.get(foundation, 'hazardStream') as Readonly<GeneratedHazardStreamState>;
const getTelegraphedState = (foundation: Foundation): Readonly<TelegraphedHazardSimulationState> =>
  Reflect.get(foundation, 'telegraphedHazardState') as Readonly<TelegraphedHazardSimulationState>;

const getSpawnIdentities = (
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
): ReadonlyArray<string> => spawns.map(getLogicalHazardSpawnIdentity);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Foundation M5 retry state isolation', () => {
  it('clears non-empty telegraph lifecycle and old hazard identities on ordinary retry', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: vi.fn((values: Uint32Array) => {
        values[0] = NEXT_RUN_SEED;
        return values;
      }),
    });

    const services = createAppServices();
    const foundation = new Foundation(services, false);
    const viewportService = new ViewportService(400, 800);
    const viewport = viewportService.getSnapshot();
    const verticalDomain = createPrototypeHazardVerticalDomain(
      createPrototypeFlightBounds(viewport),
    );
    const generatedStream = createGeneratedHazardStream(
      PROTOTYPE_LIVE_RUN_SEED,
      Object.freeze({
        catalog: verticalDomain.catalog,
        constraints: verticalDomain.constraints,
        policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
      }),
      services.runMotion.getSnapshot(),
    );
    const oldStaticSpawn = createSpawn(
      'old-static',
      0,
      OLD_STATIC_HITBOX,
      STATIC_BEHAVIOR,
      generatedStream,
    );
    const oldTelegraphSpawn = createSpawn(
      'old-timed-pulse',
      1,
      OLD_TELEGRAPH_HITBOX,
      TIMED_BEHAVIOR,
      generatedStream,
    );
    const oldStream: Readonly<GeneratedHazardStreamState> = Object.freeze({
      ...generatedStream,
      spawns: Object.freeze([oldStaticSpawn, oldTelegraphSpawn]),
      status: 'exhausted',
    });
    const oldTelegraphs = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      oldStream.spawns,
      0,
      { positionY: 195, runDistance: 1_000 },
    );
    const oldTelegraphIdentity = getLogicalHazardSpawnIdentity(oldTelegraphSpawn);
    const oldHazardIdentities = new Set(getSpawnIdentities(oldStream.spawns));
    const finalResult = createPrototypeRunResultSnapshot(1_000, {
      collectedCount: 0,
      collectedValue: 0,
      earnedReward: 0,
      grazeCount: 1,
    });
    const retryReadyState = stepPrototypeDeathRetryState(
      enterPrototypeFailState(finalResult),
      PROTOTYPE_FAIL_STATE_DURATION_SECONDS,
    );

    expect(oldTelegraphs.instances).toHaveLength(1);
    expect(oldTelegraphs.instances[0]?.spawnIdentity).toBe(oldTelegraphIdentity);
    expect(retryReadyState.phase).toBe('retry-ready');

    const playerPresentation = {
      setPosition: vi.fn(),
      setRotation: vi.fn(),
      setScale: vi.fn(),
    };
    const generatedHazardPresentation = { sync: vi.fn() };
    const scrollingWorldPresentation = { render: vi.fn() };
    const instructions = { setText: vi.fn() };

    Reflect.set(foundation, 'viewportService', viewportService);
    Reflect.set(foundation, 'hazardVerticalDomain', verticalDomain);
    Reflect.set(foundation, 'hazardStream', oldStream);
    Reflect.set(foundation, 'telegraphedHazardState', oldTelegraphs);
    Reflect.set(foundation, 'runState', {
      phase: 'dead',
      motion: { distance: finalResult.finalDistance },
      flight: { positionY: 195, velocityY: 0 },
      finalResult,
    } satisfies PrototypeRunState);
    Reflect.set(foundation, 'deathRetryState', retryReadyState);
    Reflect.set(foundation, 'playerPresentation', playerPresentation);
    Reflect.set(foundation, 'generatedHazardPresentation', generatedHazardPresentation);
    Reflect.set(foundation, 'scrollingWorldPresentation', scrollingWorldPresentation);
    Reflect.set(foundation, 'instructions', instructions);

    services.input.setSpaceHeld(true);
    foundation.update(0, 0);

    const restartedState = getRunState(foundation);
    const restartedStream = getHazardStream(foundation);
    const restartedTelegraphs = getTelegraphedState(foundation);
    const restartedHazardIdentities = new Set(getSpawnIdentities(restartedStream.spawns));

    expect(restartedState).toMatchObject({ phase: 'running', motion: { distance: 0 } });
    expect(restartedState.finalResult).toBeUndefined();
    expect(getDeathRetryState(foundation)).toEqual({
      elapsedSeconds: 0,
      phase: 'running',
      result: null,
    });
    expect(restartedStream.generationState.seed).toBe(NEXT_RUN_SEED);
    expect(restartedStream).not.toBe(oldStream);
    for (const oldIdentity of oldHazardIdentities) {
      expect(restartedHazardIdentities.has(oldIdentity)).toBe(false);
    }
    expect(restartedStream.spawns.some((spawn) => spawn.patternId === OLD_PATTERN_ID)).toBe(false);
    expect(restartedTelegraphs).not.toBe(oldTelegraphs);
    expect(
      restartedTelegraphs.instances.some(
        (instance) => instance.spawnIdentity === oldTelegraphIdentity,
      ),
    ).toBe(false);
    expect(services.input.isThrustHeld()).toBe(false);
    expect(services.input.consumePrimaryActionPress()).toBe(false);
  });
});
