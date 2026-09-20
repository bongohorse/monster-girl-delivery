import { describe, expect, it } from 'vitest';
import type { LogicalCollectibleSpawnInstance } from '../../src/generation/GeneratedCollectibles';
import type { LogicalHazard } from '../../src/systems/HazardCollision';
import {
  EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
  evaluatePrototypeCollectibleStep,
} from '../../src/systems/PrototypeCollectibles';
import type { VerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';

const HORIZONTAL_RADIUS = 32;
const VERTICAL_RADIUS = 38;
const ELAPSED_SECONDS = 2;

interface OpenInterval {
  readonly end: number;
  readonly start: number;
}

interface LinearSegmentSpec {
  readonly endSeconds: number;
  readonly positionY: number;
  readonly startSeconds: number;
  readonly velocityY: number;
}

interface HorizontalCase {
  readonly coinX: number;
  readonly initialDistance: number;
  readonly name: string;
  readonly speed: number;
}

interface VerticalCase {
  readonly name: string;
  readonly segments: ReadonlyArray<Readonly<LinearSegmentSpec>>;
}

const horizontalCases: ReadonlyArray<Readonly<HorizontalCase>> = Object.freeze([
  Object.freeze({ name: 'stationary-inside', initialDistance: 0, speed: 0, coinX: 0 }),
  Object.freeze({ name: 'stationary-edge', initialDistance: 0, speed: 0, coinX: 32 }),
  Object.freeze({ name: 'canonical-pass', initialDistance: 0, speed: 100, coinX: 100 }),
  Object.freeze({ name: 'translated-slow-pass', initialDistance: 20, speed: 25, coinX: 80 }),
  Object.freeze({ name: 'sub-unit-inside', initialDistance: 100, speed: 0.5, coinX: 100 }),
  Object.freeze({ name: 'translated-fast-pass', initialDistance: 40, speed: 60, coinX: 100 }),
  Object.freeze({ name: 'moving-away', initialDistance: 100, speed: 50, coinX: 32 }),
]);

const verticalCases: ReadonlyArray<Readonly<VerticalCase>> = Object.freeze([
  Object.freeze({
    name: 'stationary',
    segments: Object.freeze([
      Object.freeze({ startSeconds: 0, endSeconds: 2, positionY: 195, velocityY: 0 }),
    ]),
  }),
  Object.freeze({
    name: 'linear-down',
    segments: Object.freeze([
      Object.freeze({ startSeconds: 0, endSeconds: 2, positionY: 160, velocityY: 30 }),
    ]),
  }),
  Object.freeze({
    name: 'linear-up',
    segments: Object.freeze([
      Object.freeze({ startSeconds: 0, endSeconds: 2, positionY: 250, velocityY: -40 }),
    ]),
  }),
  Object.freeze({
    name: 'late-second-segment',
    segments: Object.freeze([
      Object.freeze({ startSeconds: 0, endSeconds: 0.5, positionY: 195, velocityY: 0 }),
      Object.freeze({ startSeconds: 0.5, endSeconds: 2, positionY: 195, velocityY: 40 }),
    ]),
  }),
  Object.freeze({
    name: 'boundary-touch-retreat',
    segments: Object.freeze([
      Object.freeze({ startSeconds: 0, endSeconds: 0.5, positionY: 195, velocityY: -90 }),
      Object.freeze({ startSeconds: 0.5, endSeconds: 2, positionY: 150, velocityY: 20 }),
    ]),
  }),
  Object.freeze({
    name: 'three-segment-reset',
    segments: Object.freeze([
      Object.freeze({ startSeconds: 0, endSeconds: 0.4, positionY: 100, velocityY: 100 }),
      Object.freeze({ startSeconds: 0.4, endSeconds: 1, positionY: 140, velocityY: 0 }),
      Object.freeze({ startSeconds: 1, endSeconds: 2, positionY: 140, velocityY: 60 }),
    ]),
  }),
]);

const coinYValues = Object.freeze([80, 112, 150, 195, 233, 250, 300]);

const collectible = (
  id: string,
  runDistance: number,
  y: number,
): Readonly<LogicalCollectibleSpawnInstance> =>
  Object.freeze({
    intent: 'safe-guide',
    pathId: id,
    pathPointIndex: 0,
    patternId: 'gate-5c-reference',
    patternStartDistance: 0,
    runDistance,
    value: 1,
    y,
  });

const solveOpenLinearInterval = (
  startSeconds: number,
  endSeconds: number,
  positionAtStart: number,
  velocity: number,
  minimum: number,
  maximum: number,
): OpenInterval | null => {
  if (velocity === 0) {
    return positionAtStart > minimum && positionAtStart < maximum
      ? { start: startSeconds, end: endSeconds }
      : null;
  }

  const firstBoundary = startSeconds + (minimum - positionAtStart) / velocity;
  const secondBoundary = startSeconds + (maximum - positionAtStart) / velocity;
  const start = Math.max(startSeconds, Math.min(firstBoundary, secondBoundary));
  const end = Math.min(endSeconds, Math.max(firstBoundary, secondBoundary));
  return end > start ? { start, end } : null;
};

const solveReferenceContactOnset = (
  horizontal: Readonly<HorizontalCase>,
  vertical: Readonly<VerticalCase>,
  coinY: number,
): number | null => {
  const horizontalInterval = solveOpenLinearInterval(
    0,
    ELAPSED_SECONDS,
    horizontal.initialDistance,
    horizontal.speed,
    horizontal.coinX - HORIZONTAL_RADIUS,
    horizontal.coinX + HORIZONTAL_RADIUS,
  );
  if (!horizontalInterval) {
    return null;
  }

  let earliest: number | null = null;
  for (const segment of vertical.segments) {
    const verticalInterval = solveOpenLinearInterval(
      segment.startSeconds,
      segment.endSeconds,
      segment.positionY,
      segment.velocityY,
      coinY - VERTICAL_RADIUS,
      coinY + VERTICAL_RADIUS,
    );
    if (!verticalInterval) {
      continue;
    }

    const intersectionStart = Math.max(horizontalInterval.start, verticalInterval.start);
    const intersectionEnd = Math.min(horizontalInterval.end, verticalInterval.end);
    if (intersectionEnd <= intersectionStart) {
      continue;
    }
    earliest = earliest === null ? intersectionStart : Math.min(earliest, intersectionStart);
  }

  return earliest;
};

const createTrajectory = (
  vertical: Readonly<VerticalCase>,
): Readonly<VerticalFlightTrajectory> => {
  const finalSegment = vertical.segments[vertical.segments.length - 1];
  if (!finalSegment) {
    throw new Error('Gate 5C trajectory requires at least one segment.');
  }
  const finalDuration = finalSegment.endSeconds - finalSegment.startSeconds;
  return Object.freeze({
    finalState: Object.freeze({
      positionY: finalSegment.positionY + finalSegment.velocityY * finalDuration,
      velocityY: finalSegment.velocityY,
    }),
    segments: Object.freeze(
      vertical.segments.map((segment) =>
        Object.freeze({
          accelerationY: 0,
          endSeconds: segment.endSeconds,
          positionY: segment.positionY,
          startSeconds: segment.startSeconds,
          velocityY: segment.velocityY,
        }),
      ),
    ),
  });
};

const lifecycleHazard = (startSeconds: number): Readonly<LogicalHazard> =>
  Object.freeze({
    collisionInterval: Object.freeze({ startSeconds, endSeconds: ELAPSED_SECONDS }),
    hitbox: Object.freeze({
      left: -10_000,
      right: 10_000,
      top: -10_000,
      bottom: 10_000,
    }),
  });

const evaluate = (
  horizontal: Readonly<HorizontalCase>,
  vertical: Readonly<VerticalCase>,
  coinY: number,
  hazardStartSeconds?: number,
) =>
  evaluatePrototypeCollectibleStep(
    EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
    Object.freeze({ distance: horizontal.initialDistance }),
    createTrajectory(vertical),
    ELAPSED_SECONDS,
    Object.freeze({ baseScrollSpeed: horizontal.speed }),
    [collectible(`${horizontal.name}-${vertical.name}-${coinY}`, horizontal.coinX, coinY)],
    hazardStartSeconds === undefined ? [] : [lifecycleHazard(hazardStartSeconds)],
  );

describe('PrototypeCollectibles Gate 5C independent piecewise-linear oracle', () => {
  it('matches exact open-interval contact existence across the deterministic reference matrix', () => {
    let checked = 0;

    for (const horizontal of horizontalCases) {
      for (const vertical of verticalCases) {
        for (const coinY of coinYValues) {
          const expectedOnset = solveReferenceContactOnset(horizontal, vertical, coinY);
          const result = evaluate(horizontal, vertical, coinY);
          const actualPickup = result.collectedCount === 1;
          const expectedPickup = expectedOnset !== null;

          if (actualPickup !== expectedPickup) {
            throw new Error(
              `Gate 5C oracle disagreement for ${horizontal.name}/${vertical.name}/Y=${coinY}: expected onset ${expectedOnset}, collectedCount=${result.collectedCount}`,
            );
          }
          checked += 1;
        }
      }
    }

    expect(checked).toBe(horizontalCases.length * verticalCases.length * coinYValues.length);
    expect(checked).toBe(294);
  });

  it('matches independently solved lethal ordering around representative oracle onsets', () => {
    const referenceCases = [
      { horizontal: horizontalCases[2], vertical: verticalCases[0], coinY: 195 },
      { horizontal: horizontalCases[3], vertical: verticalCases[1], coinY: 233 },
      { horizontal: horizontalCases[4], vertical: verticalCases[2], coinY: 195 },
      { horizontal: horizontalCases[5], vertical: verticalCases[3], coinY: 250 },
      { horizontal: horizontalCases[2], vertical: verticalCases[5], coinY: 195 },
    ] as const;

    for (const entry of referenceCases) {
      const { horizontal, vertical, coinY } = entry;
      if (!horizontal || !vertical) {
        throw new Error('Gate 5C reference table contains an invalid fixture.');
      }
      const onset = solveReferenceContactOnset(horizontal, vertical, coinY);
      if (onset === null || onset <= 1e-5 || onset >= ELAPSED_SECONDS - 1e-5) {
        throw new Error(
          `Gate 5C ordering fixture must have an interior contact onset, received ${onset}.`,
        );
      }

      expect(evaluate(horizontal, vertical, coinY, onset - 1e-6).collectedCount).toBe(0);
      expect(evaluate(horizontal, vertical, coinY, onset).collectedCount).toBe(1);
      expect(evaluate(horizontal, vertical, coinY, onset + 1e-6).collectedCount).toBe(1);
    }
  });
});
