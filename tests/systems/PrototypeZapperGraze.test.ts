import { describe, expect, it } from 'vitest';
import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_LENGTHS,
  PROTOTYPE_ZAPPER_ROTATION_SPEEDS,
} from '../../src/hazards/PrototypeZapperHazard';
import {
  EMPTY_PROTOTYPE_GRAZE_RUN_STATE,
  evaluatePrototypeGrazeStep,
} from '../../src/systems/PrototypeGraze';
import { type RunMotionState, stepRunMotion } from '../../src/systems/RunMotionSimulation';
import { createVerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';
import { type FrameSchedule, STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const FLIGHT_TUNING = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 1_000,
  maxRiseVelocity: 1_000,
});

const createGrazeZapper = () => {
  const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.medium);
  const hitbox = createPrototypeZapperHitbox(600, 195, behavior);
  return Object.freeze({
    behavior,
    entryId: 'zapper-graze',
    hitbox,
    patternEntryIndex: 0,
    patternId: 'zapper-graze-pattern',
    runDistance: hitbox.left,
    type: 'placeholder-barrier' as const,
  });
};

const createRotatingGrazeZapper = () => {
  const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.long, {
    direction: 'clockwise',
    speedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.slow,
  });
  const hitbox = createPrototypeZapperHitbox(0, 0, behavior);
  return Object.freeze({
    behavior,
    entryId: 'rotating-zapper-graze',
    hitbox,
    patternEntryIndex: 0,
    patternId: 'rotating-zapper-graze-pattern',
    runDistance: hitbox.left,
    type: 'placeholder-barrier' as const,
  });
};

const runGrazePass = (schedule: FrameSchedule) => {
  const zapper = createGrazeZapper();
  let graze = EMPTY_PROTOTYPE_GRAZE_RUN_STATE;
  let elapsed = 0;
  let distance = 0;
  let stepIndex = 0;
  let lethal = false;

  while (elapsed < 2.4) {
    const delta = Math.min(schedule.getNextDelta(elapsed, stepIndex), 2.4 - elapsed);
    stepIndex += 1;
    const trajectory = createVerticalFlightTrajectory(
      { positionY: 240, velocityY: 0 },
      delta,
      false,
      FLIGHT_TUNING,
      { ceilingY: 0, floorY: 400 },
    );
    const result = evaluatePrototypeGrazeStep(
      graze,
      { distance },
      trajectory,
      delta,
      { baseScrollSpeed: 350 },
      [zapper],
    );
    graze = result.state;
    lethal ||= result.lethalCollision;
    distance += 350 * delta;
    elapsed += delta;
  }

  return { count: graze.count, lethal };
};

const runRotatingGrazePass = (schedule: FrameSchedule) => {
  const zapper = createRotatingGrazeZapper();
  let graze = EMPTY_PROTOTYPE_GRAZE_RUN_STATE;
  let elapsed = 0;
  let stepIndex = 0;
  let motion: RunMotionState = { distance: 40, simulationSeconds: 0 };
  let lethal = false;

  while (elapsed < 0.5) {
    const delta = Math.min(schedule.getNextDelta(elapsed, stepIndex), 0.5 - elapsed);
    stepIndex += 1;
    const trajectory = createVerticalFlightTrajectory(
      { positionY: 48, velocityY: 0 },
      delta,
      false,
      FLIGHT_TUNING,
      { ceilingY: -400, floorY: 400 },
    );
    const finalStep = elapsed + delta >= 0.5 - Number.EPSILON;
    const result = evaluatePrototypeGrazeStep(
      graze,
      motion,
      trajectory,
      delta,
      { baseScrollSpeed: 0 },
      [
        {
          ...zapper,
          collisionEndsAtIntervalEnd: finalStep,
          collisionInterval: { startSeconds: 0, endSeconds: delta },
        },
      ],
    );
    graze = result.state;
    lethal ||= result.lethalCollision;
    motion = stepRunMotion(motion, delta, { baseScrollSpeed: 0 });
    elapsed += delta;
  }

  return { count: graze.count, lethal };
};

describe('M5 Zapper Graze', () => {
  it('awards at most one Graze for endpoint + beam + endpoint contact across frame schedules', () => {
    const results = Object.fromEntries(
      Object.entries(STANDARD_FRAME_SCHEDULES).map(([name, schedule]) => [
        name,
        runGrazePass(schedule),
      ]),
    );

    for (const result of Object.values(results)) {
      expect(result.lethal).toBe(false);
      expect(result.count).toBe(1);
    }
  });

  it('awards one non-lethal Graze for a rotating beam sweep across frame schedules', () => {
    const results = Object.fromEntries(
      Object.entries(STANDARD_FRAME_SCHEDULES).map(([name, schedule]) => [
        name,
        runRotatingGrazePass(schedule),
      ]),
    );

    for (const result of Object.values(results)) {
      expect(result.lethal).toBe(false);
      expect(result.count).toBe(1);
    }
  });
});
