import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import {
  evaluateFlightReachability,
  type PatternReachabilityContext,
} from '../../src/generation/FlightReachability';

const BOUNDS = Object.freeze({ ceilingY: 24, floorY: 366 });
const PLAYER_EXTENTS = Object.freeze({ left: 18, right: 18, top: 24, bottom: 24 });

const createContext = (
  flightState: Readonly<{ positionY: number; velocityY: number }>,
  availableReactionTimeSeconds: number,
): Readonly<PatternReachabilityContext> => ({
  availableReactionTimeSeconds,
  flightState,
  flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
  playerExtents: PLAYER_EXTENTS,
});

describe('flight reachability', () => {
  it('reaches an upward corridor when continuous thrust intersects its safe center range', () => {
    const result = evaluateFlightReachability(
      [{ top: 48, bottom: 180 }],
      BOUNDS,
      createContext({ positionY: 250, velocityY: 0 }, 0.5),
    );

    expect(result).toMatchObject({
      failureReason: null,
      reachable: true,
      reachableCenterRange: { top: 150, bottom: 366 },
      reachableTargetCenterRange: { top: 150, bottom: 156 },
      targetCenterRanges: [{ top: 72, bottom: 156 }],
      upwardExtreme: { positionY: 150, velocityY: -400 },
    });
  });

  it('rejects that upward corridor from fast downward motion when time is insufficient', () => {
    const result = evaluateFlightReachability(
      [{ top: 48, bottom: 180 }],
      BOUNDS,
      createContext({ positionY: 250, velocityY: 650 }, 0.2),
    );

    expect(result).toMatchObject({
      failureReason: 'safe-corridor-above-reachable-envelope',
      reachable: false,
      reachableCenterRange: { top: 364, bottom: 366 },
      reachableTargetCenterRange: null,
    });
  });

  it('uses current velocity materially for the same position, time, and upward target', () => {
    const upwardVelocity = evaluateFlightReachability(
      [{ top: 48, bottom: 180 }],
      BOUNDS,
      createContext({ positionY: 200, velocityY: -550 }, 0.1),
    );
    const downwardVelocity = evaluateFlightReachability(
      [{ top: 48, bottom: 180 }],
      BOUNDS,
      createContext({ positionY: 200, velocityY: 650 }, 0.1),
    );

    expect(upwardVelocity.reachable).toBe(true);
    expect(downwardVelocity).toMatchObject({
      failureReason: 'safe-corridor-above-reachable-envelope',
      reachable: false,
    });
  });

  it('reaches a downward corridor by releasing thrust', () => {
    const result = evaluateFlightReachability(
      [{ top: 200, bottom: 342 }],
      BOUNDS,
      createContext({ positionY: 100, velocityY: 0 }, 0.5),
    );

    expect(result).toMatchObject({
      downwardExtreme: { velocityY: 650 },
      failureReason: null,
      reachable: true,
      reachableTargetCenterRange: { top: 224 },
    });
    expect(result.downwardExtreme.positionY).toBeCloseTo(274.107_142_857_1, 10);
    expect(result.reachableTargetCenterRange?.bottom).toBeCloseTo(274.107_142_857_1, 10);
  });

  it('treats exact edge contact as reachable and a separated target as unreachable', () => {
    const stationaryContext: Readonly<PatternReachabilityContext> = {
      availableReactionTimeSeconds: 1,
      flightState: { positionY: 100, velocityY: 0 },
      flightTuning: { gravity: 0, thrust: 0, maxFallVelocity: 0, maxRiseVelocity: 0 },
      playerExtents: { left: 0, right: 0, top: 10, bottom: 10 },
    };
    const exactBoundary = evaluateFlightReachability(
      [{ top: 90, bottom: 110 }],
      { ceilingY: 0, floorY: 200 },
      stationaryContext,
    );
    const separated = evaluateFlightReachability(
      [{ top: 89, bottom: 109 }],
      { ceilingY: 0, floorY: 200 },
      stationaryContext,
    );

    expect(exactBoundary).toMatchObject({
      reachable: true,
      reachableTargetCenterRange: { top: 100, bottom: 100 },
    });
    expect(separated).toMatchObject({
      failureReason: 'safe-corridor-above-reachable-envelope',
      reachable: false,
      targetCenterRanges: [{ top: 99, bottom: 99 }],
    });
  });

  it('honors representative maximum rise and fall velocities analytically', () => {
    const extentlessContext = {
      availableReactionTimeSeconds: 0.1,
      flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
      playerExtents: { left: 0, right: 0, top: 0, bottom: 0 },
    };
    const maxRise = evaluateFlightReachability(
      [{ top: 0, bottom: 400 }],
      { ceilingY: 0, floorY: 400 },
      { ...extentlessContext, flightState: { positionY: 200, velocityY: -550 } },
    );
    const maxFall = evaluateFlightReachability(
      [{ top: 0, bottom: 400 }],
      { ceilingY: 0, floorY: 400 },
      { ...extentlessContext, flightState: { positionY: 200, velocityY: 650 } },
    );

    expect(maxRise).toMatchObject({
      reachableCenterRange: { top: 145, bottom: 152 },
      upwardExtreme: { positionY: 145, velocityY: -550 },
    });
    expect(maxFall).toMatchObject({
      downwardExtreme: { positionY: 265, velocityY: 650 },
      reachableCenterRange: { top: 261, bottom: 265 },
    });
  });

  it('returns deterministic deeply immutable structured results', () => {
    const context = createContext({ positionY: 250, velocityY: 0 }, 0.5);
    const first = evaluateFlightReachability([{ top: 48, bottom: 180 }], BOUNDS, context);
    const repeated = evaluateFlightReachability([{ top: 48, bottom: 180 }], BOUNDS, context);

    expect(repeated).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.upwardExtreme)).toBe(true);
    expect(Object.isFrozen(first.downwardExtreme)).toBe(true);
    expect(Object.isFrozen(first.reachableCenterRange)).toBe(true);
    expect(Object.isFrozen(first.targetCenterRanges)).toBe(true);
    expect(first.targetCenterRanges.every(Object.isFrozen)).toBe(true);
  });

  it('rejects invalid timing, state, tuning, extents, corridors, and bounds', () => {
    const context = createContext({ positionY: 200, velocityY: 0 }, 0.5);
    const corridor = [{ top: 48, bottom: 180 }];

    expect(() =>
      evaluateFlightReachability(corridor, BOUNDS, {
        ...context,
        availableReactionTimeSeconds: 0,
      }),
    ).toThrow(RangeError);
    expect(() =>
      evaluateFlightReachability(corridor, BOUNDS, {
        ...context,
        flightState: { positionY: Number.NaN, velocityY: 0 },
      }),
    ).toThrow(RangeError);
    expect(() =>
      evaluateFlightReachability(corridor, BOUNDS, {
        ...context,
        flightTuning: { ...context.flightTuning, gravity: -1 },
      }),
    ).toThrow(RangeError);
    expect(() =>
      evaluateFlightReachability(corridor, BOUNDS, {
        ...context,
        playerExtents: { ...context.playerExtents, top: Number.POSITIVE_INFINITY },
      }),
    ).toThrow(RangeError);
    expect(() => evaluateFlightReachability([{ top: 100, bottom: 100 }], BOUNDS, context)).toThrow(
      RangeError,
    );
    expect(() =>
      evaluateFlightReachability(corridor, { ceilingY: 300, floorY: 200 }, context),
    ).toThrow(RangeError);
  });
});
