import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import {
  createEncounterExitStateEnvelope,
  type EncounterTransitionContext,
  validateEncounterTransition,
} from '../../src/generation/EncounterTransitionValidator';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import {
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
  validatePattern,
} from '../../src/generation/PatternValidator';
import {
  PROTOTYPE_TIMED_PULSE_PATTERN,
  PROTOTYPE_VERTICAL_PATROL_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { PROTOTYPE_PLAYER_COLLISION_EXTENTS } from '../../src/systems/HazardCollision';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

const HIGH_ENTRY_PATTERN = createHazardPattern({
  id: 'high-entry',
  runLength: 300,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'lower-wall',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 180, bottom: 342 },
    },
  ],
});

const LOW_ENTRY_PATTERN = createHazardPattern({
  id: 'low-entry',
  runLength: 300,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'upper-wall',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 48, bottom: 210 },
    },
  ],
});

const createContext = (
  state: Readonly<{ positionY: number; velocityY: number }>,
  runDistance = 1_000,
): Readonly<EncounterTransitionContext> => ({
  exitEnvelope: { runDistance, states: [state] },
  flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
  playerExtents: PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  scrollSpeed: 350,
});

describe('encounter transition validation', () => {
  it('rejects an immediate low-exit to high-entry transition although both patterns are valid alone', () => {
    expect(validatePattern(LOW_ENTRY_PATTERN).valid).toBe(true);
    expect(validatePattern(HIGH_ENTRY_PATTERN).valid).toBe(true);

    const result = validateEncounterTransition(
      HIGH_ENTRY_PATTERN,
      1_000,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      createContext({ positionY: 300, velocityY: 650 }),
    );

    expect(result).toMatchObject({
      availableTransitionTimeSeconds: 100 / 350,
      entryRequirement: {
        absoluteRunDistance: 1_100,
        entryIds: ['lower-wall'],
        localRunDistance: 100,
        safeCorridors: [{ top: 48, bottom: 180 }],
      },
      failureReason: 'next-entry-unreachable-from-exit-envelope',
      reachableExitStateIndex: null,
      transitionDistance: 100,
      valid: false,
    });
    expect(result.stateEvaluations[0]?.reachability).toMatchObject({
      failureReason: 'safe-corridor-above-reachable-envelope',
      reachable: false,
    });
  });

  it('accepts low-to-high and high-to-low transitions when logical distance provides enough time', () => {
    const lowToHigh = validateEncounterTransition(
      HIGH_ENTRY_PATTERN,
      1_600,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      createContext({ positionY: 300, velocityY: 650 }),
    );
    const highToLow = validateEncounterTransition(
      LOW_ENTRY_PATTERN,
      1_600,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      createContext({ positionY: 90, velocityY: -550 }),
    );

    expect(lowToHigh).toMatchObject({
      availableTransitionTimeSeconds: 2,
      failureReason: null,
      reachableExitStateIndex: 0,
      transitionDistance: 700,
      valid: true,
    });
    expect(highToLow).toMatchObject({
      availableTransitionTimeSeconds: 2,
      failureReason: null,
      reachableExitStateIndex: 0,
      transitionDistance: 700,
      valid: true,
    });
  });

  it('uses correlated exit velocity materially and accepts any represented reachable exit state', () => {
    const rising = validateEncounterTransition(
      HIGH_ENTRY_PATTERN,
      935,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      createContext({ positionY: 200, velocityY: -550 }, 1_000),
    );
    const falling = validateEncounterTransition(
      HIGH_ENTRY_PATTERN,
      935,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      createContext({ positionY: 200, velocityY: 650 }, 1_000),
    );
    const envelope = validateEncounterTransition(
      HIGH_ENTRY_PATTERN,
      935,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      {
        ...createContext({ positionY: 200, velocityY: 650 }, 1_000),
        exitEnvelope: {
          runDistance: 1_000,
          states: [
            { positionY: 200, velocityY: 650 },
            { positionY: 200, velocityY: -550 },
          ],
        },
      },
    );

    expect(rising).toMatchObject({ valid: true, reachableExitStateIndex: 0 });
    expect(falling).toMatchObject({
      valid: false,
      failureReason: 'next-entry-unreachable-from-exit-envelope',
    });
    expect(envelope).toMatchObject({ valid: true, reachableExitStateIndex: 1 });
  });

  it('treats exact safe-corridor edge contact as a reachable transition boundary', () => {
    const exactBoundaryPattern = createHazardPattern({
      id: 'exact-boundary-entry',
      runLength: 200,
      profile: TEST_ENCOUNTER_PROFILE,
      entries: [
        {
          id: 'boundary-lower-wall',
          type: 'placeholder-barrier',
          hitbox: { left: 100, right: 148, top: 110, bottom: 200 },
        },
      ],
    });
    const constraints = {
      playableTop: 48,
      playableBottom: 200,
      minimumVerticalCorridor: 60,
      minimumReactionSpacing: 0,
    };
    const result = validateEncounterTransition(exactBoundaryPattern, 1_000, constraints, {
      exitEnvelope: { runDistance: 1_000, states: [{ positionY: 100, velocityY: 0 }] },
      flightTuning: { gravity: 0, thrust: 0, maxFallVelocity: 0, maxRiseVelocity: 0 },
      playerExtents: { left: 0, right: 0, top: 10, bottom: 10 },
      scrollSpeed: 100,
    });

    expect(result).toMatchObject({
      availableTransitionTimeSeconds: 1,
      reachableExitStateIndex: 0,
      valid: true,
    });
    expect(result.stateEvaluations[0]?.reachability.reachableTargetCenterRange).toEqual({
      top: 100,
      bottom: 100,
    });
  });

  it('uses conservative swept moving geometry and authored timed geometry at entry', () => {
    const moving = validateEncounterTransition(
      PROTOTYPE_VERTICAL_PATROL_PATTERN,
      1_500,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      createContext({ positionY: 280, velocityY: 0 }),
    );
    const timed = validateEncounterTransition(
      PROTOTYPE_TIMED_PULSE_PATTERN,
      1_500,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      createContext({ positionY: 195, velocityY: 0 }),
    );

    expect(moving.entryRequirement).toMatchObject({
      entryIds: ['vertical-patrol-1'],
      localRunDistance: 280,
      safeCorridors: [{ top: 243, bottom: 342 }],
    });
    expect(timed.entryRequirement).toMatchObject({
      entryIds: ['timed-pulse-1'],
      localRunDistance: 120,
      safeCorridors: [
        { top: 48, bottom: 155 },
        { top: 219, bottom: 342 },
      ],
    });
    expect(moving.valid).toBe(true);
    expect(timed.valid).toBe(true);
  });

  it('is deterministic, immutable, serializable, and independent of physical viewport dimensions', () => {
    const context = createContext({ positionY: 300, velocityY: 650 });
    const evaluateForViewport = (_width: number, _height: number) =>
      validateEncounterTransition(
        HIGH_ENTRY_PATTERN,
        1_000,
        PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
        context,
      );
    const first = evaluateForViewport(640, 360);
    const replay = evaluateForViewport(2_560, 1_080);

    expect(replay).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.exitEnvelope)).toBe(true);
    expect(Object.isFrozen(first.exitEnvelope.states)).toBe(true);
    expect(first.exitEnvelope.states.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(first.entryRequirement)).toBe(true);
    expect(Object.isFrozen(first.entryRequirement?.safeCorridors)).toBe(true);
    expect(Object.isFrozen(first.stateEvaluations)).toBe(true);
    expect(first.stateEvaluations.every(Object.isFrozen)).toBe(true);
  });

  it('reports a non-positive logical transition window without invoking flight reachability', () => {
    const result = validateEncounterTransition(
      HIGH_ENTRY_PATTERN,
      900,
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      createContext({ positionY: 200, velocityY: 0 }),
    );

    expect(result).toMatchObject({
      availableTransitionTimeSeconds: 0,
      failureReason: 'non-positive-transition-window',
      stateEvaluations: [],
      transitionDistance: 0,
      valid: false,
    });
  });

  it('validates exit envelopes, logical timing, bounds, and extent inputs', () => {
    expect(() => createEncounterExitStateEnvelope({ runDistance: 0, states: [] })).toThrow(
      RangeError,
    );
    expect(() =>
      createEncounterExitStateEnvelope({
        runDistance: 0,
        states: [{ positionY: Number.NaN, velocityY: 0 }],
      }),
    ).toThrow(RangeError);
    expect(() =>
      validateEncounterTransition(
        HIGH_ENTRY_PATTERN,
        1_000,
        PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
        { ...createContext({ positionY: 200, velocityY: 0 }), scrollSpeed: 0 },
      ),
    ).toThrow(RangeError);
    expect(() =>
      validateEncounterTransition(
        HIGH_ENTRY_PATTERN,
        1_000,
        PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
        createContext({ positionY: 20, velocityY: 0 }),
      ),
    ).toThrow(RangeError);
    expect(() =>
      validateEncounterTransition(
        HIGH_ENTRY_PATTERN,
        Number.POSITIVE_INFINITY,
        PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
        createContext({ positionY: 200, velocityY: 0 }),
      ),
    ).toThrow(RangeError);
  });
});
