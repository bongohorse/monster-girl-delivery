import { describe, expect, it } from 'vitest';
import {
  calculateDifficulty,
  scaleRunMotionForDifficulty,
} from '../../src/difficulty/DifficultySystem';

describe('difficulty speed ramp', () => {
  it.each([
    [0, 1],
    [1_250, 1.04],
    [2_500, 1.08],
    [4_250, 1.12],
    [6_000, 1.16],
    [8_000, 1.2],
    [10_000, 1.24],
  ] as const)('ramps continuously at distance %s toward multiplier %s', (runDistance, expected) => {
    expect(calculateDifficulty(runDistance).scrollSpeedMultiplier).toBeCloseTo(expected, 10);
  });

  it('makes speed strictly increase inside tiers instead of jumping only at boundaries', () => {
    const distances = [0, 625, 1_250, 1_875, 2_500, 3_375, 4_250, 5_125, 6_000];
    const multipliers = distances.map(
      (runDistance) => calculateDifficulty(runDistance).scrollSpeedMultiplier,
    );

    for (let index = 1; index < multipliers.length; index += 1) {
      expect(multipliers[index]).toBeGreaterThan(multipliers[index - 1] ?? 0);
    }
  });

  it('applies the interpolated multiplier to authoritative run motion and keeps the late cap', () => {
    expect(
      scaleRunMotionForDifficulty({ baseScrollSpeed: 350 }, calculateDifficulty(1_250)),
    ).toEqual({ baseScrollSpeed: 364 });
    expect(calculateDifficulty(100_000).scrollSpeedMultiplier).toBe(1.24);
  });
});
