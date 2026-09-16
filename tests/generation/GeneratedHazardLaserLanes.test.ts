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

const AUTHORED_CENTERS = Object.freeze([294, 244, 195, 146, 96]);
const centerY = (top: number, bottom: number): number => (top + bottom) / 2;

const getEncounters = (seed: string): ReadonlyArray<ReadonlyArray<number>> => {
  let stream = createGeneratedHazardStream(seed, LASER_ONLY_CONTEXT, PROTOTYPE_RUN_MOTION_DEFAULTS);
  const encounters: number[][] = [
    stream.spawns.map((spawn) => centerY(spawn.hitbox.top, spawn.hitbox.bottom)),
  ];

  if (stream.scheduledPatternCount !== 1 || encounters[0]?.length === 0) {
    throw new Error('Laser encounter validation must start with one accepted non-empty pattern.');
  }

  for (let patternIndex = 1; patternIndex < 8; patternIndex += 1) {
    const previousSpawnCount = stream.spawns.length;
    const previousPatternCount: number = stream.scheduledPatternCount;
    stream = advanceGeneratedHazardStream(
      stream,
      stream.nextPatternStartDistance -
        stream.schedulingWindow.minimumReactionDistance -
        PROTOTYPE_PLAYER_COLLISION_EXTENTS.right,
      LASER_ONLY_CONTEXT,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );

    if (stream.scheduledPatternCount !== previousPatternCount + 1) {
      throw new Error(
        'Laser encounter validation must advance exactly one accepted pattern at a time.',
      );
    }

    const addedSpawns = stream.spawns.slice(previousSpawnCount);
    if (addedSpawns.length === 0) {
      throw new Error(
        'Laser encounter validation expected at least one spawn per accepted pattern.',
      );
    }
    encounters.push(addedSpawns.map((spawn) => centerY(spawn.hitbox.top, spawn.hitbox.bottom)));
  }

  return encounters;
};

describe('generated horizontal Laser encounters', () => {
  it('mixes single lanes with bounded authored groups instead of repeating one fixed Y', () => {
    const encounters = getEncounters('laser-lane-variation');
    const flattened = encounters.flat();

    expect(encounters).toHaveLength(8);
    expect(encounters.some((encounter) => encounter.length === 1)).toBe(true);
    expect(encounters.some((encounter) => encounter.length > 1)).toBe(true);
    expect(new Set(flattened).size).toBeGreaterThan(1);
    expect(flattened.every((center) => AUTHORED_CENTERS.includes(center))).toBe(true);
  });

  it('limits generated groups to the authored simultaneous safe-corridor formations', () => {
    const groupEncounters = getEncounters('laser-lane-variation').filter(
      (encounter) => encounter.length > 1,
    );
    const allowedGroups = new Set(['294,244,195', '195,146,96', '294,96']);

    expect(groupEncounters.length).toBeGreaterThan(0);
    expect(groupEncounters.every((encounter) => allowedGroups.has(encounter.join(',')))).toBe(true);
  });

  it('replays the exact same single/group sequence from the same seed', () => {
    expect(getEncounters('laser-lane-replay')).toEqual(getEncounters('laser-lane-replay'));
  });
});
