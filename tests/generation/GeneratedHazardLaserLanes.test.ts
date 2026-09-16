import { describe, expect, it } from 'vitest';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import {
  createGeneratedHazardStream,
  PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
} from '../../src/generation/GeneratedHazardStream';
import { PROTOTYPE_LASER_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';

const LASER_ONLY_CONTEXT = Object.freeze({
  catalog: Object.freeze([PROTOTYPE_LASER_PATTERN]),
  config: Object.freeze({
    ...PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
    reactionTime: Object.freeze({ minimumReactionTimeSeconds: 20 }),
  }),
});

const getCenters = (seed: string): ReadonlyArray<number> => {
  const stream = createGeneratedHazardStream(
    seed,
    LASER_ONLY_CONTEXT,
    PROTOTYPE_RUN_MOTION_DEFAULTS,
  );
  return stream.spawns.map((spawn) => (spawn.hitbox.top + spawn.hitbox.bottom) / 2);
};

describe('generated horizontal Laser lanes', () => {
  it('uses multiple authored heights instead of repeating one fixed Y', () => {
    const centers = getCenters('laser-lane-variation');

    expect(centers.length).toBeGreaterThan(5);
    expect(new Set(centers).size).toBeGreaterThan(1);
    expect(centers.every((center) => [294, 244, 195, 146, 96].includes(center))).toBe(true);
  });

  it('replays the exact same lane sequence from the same seed', () => {
    expect(getCenters('laser-lane-replay')).toEqual(getCenters('laser-lane-replay'));
  });
});
