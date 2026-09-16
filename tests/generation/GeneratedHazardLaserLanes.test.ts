import { describe, expect, it } from 'vitest';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
} from '../../src/generation/GeneratedHazardStream';
import { PROTOTYPE_LASER_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { PROTOTYPE_PLAYER_COLLISION_EXTENTS } from '../../src/systems/HazardCollision';

const LASER_ONLY_CONTEXT = Object.freeze({
  catalog: Object.freeze([PROTOTYPE_LASER_PATTERN]),
  config: Object.freeze({
    ...PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
    reactionTime: Object.freeze({ minimumReactionTimeSeconds: 20 }),
    retainBehindDistance: 100_000,
  }),
});

const centerY = (top: number, bottom: number): number => (top + bottom) / 2;

const getCenters = (seed: string): ReadonlyArray<number> => {
  let stream = createGeneratedHazardStream(seed, LASER_ONLY_CONTEXT, PROTOTYPE_RUN_MOTION_DEFAULTS);
  const centers = stream.spawns.map((spawn) => centerY(spawn.hitbox.top, spawn.hitbox.bottom));

  if (stream.scheduledPatternCount !== 1 || centers.length !== 1) {
    throw new Error('Laser lane validation must start with exactly one accepted Laser pattern.');
  }

  for (let patternIndex = 1; patternIndex < 6; patternIndex += 1) {
    const previousSpawnCount = stream.spawns.length;
    const previousPatternCount = stream.scheduledPatternCount;
    stream = advanceGeneratedHazardStream(
      stream,
      stream.nextPatternStartDistance -
        stream.schedulingWindow.minimumReactionDistance -
        PROTOTYPE_PLAYER_COLLISION_EXTENTS.right,
      LASER_ONLY_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    if (stream.scheduledPatternCount !== previousPatternCount + 1) {
      throw new Error('Laser lane validation must advance exactly one accepted pattern at a time.');
    }

    const addedSpawns = stream.spawns.slice(previousSpawnCount);
    if (addedSpawns.length !== 1) {
      throw new Error('Laser lane validation expected one spawn for the accepted Laser pattern.');
    }
    const spawn = addedSpawns[0];
    if (!spawn) {
      throw new Error('Laser lane validation expected an accepted Laser spawn.');
    }
    centers.push(centerY(spawn.hitbox.top, spawn.hitbox.bottom));
  }

  return centers;
};

describe('generated horizontal Laser lanes', () => {
  it('uses multiple authored heights across successive scheduling windows', () => {
    const centers = getCenters('laser-lane-variation');

    expect(centers).toHaveLength(6);
    expect(new Set(centers).size).toBeGreaterThan(1);
    expect(centers.every((center) => [294, 244, 195, 146, 96].includes(center))).toBe(true);
  });

  it('replays the exact same lane sequence from the same seed', () => {
    expect(getCenters('laser-lane-replay')).toEqual(getCenters('laser-lane-replay'));
  });
});
