import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_CORRIDOR_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import { PROTOTYPE_PLACEHOLDER_HAZARD } from '../../src/hazards/PrototypeHazard';
import {
  createPrototypeRunState,
  type PrototypeRunState,
} from '../../src/systems/PrototypeRunSimulation';
import type { VerticalFlightBounds } from '../../src/systems/VerticalFlightSimulation';
import {
  runPartitionedSimulation,
  STANDARD_FRAME_SCHEDULES,
} from '../support/FramePartitionHarness';

const FLIGHT_BOUNDS: Readonly<VerticalFlightBounds> = Object.freeze({
  ceilingY: 28,
  floorY: 362,
});

const UNRESTRICTIVE_BOUNDS: Readonly<VerticalFlightBounds> = Object.freeze({
  ceilingY: -5_000,
  floorY: 5_000,
});

const SCHEDULE_ENTRIES = Object.entries(STANDARD_FRAME_SCHEDULES);
const FLOATING_POINT_TOLERANCE = 1e-9;

describe('frame partition simulation harness', () => {
  describe('scenario 1: no-input control run', () => {
    it('produces identical distance, position, velocity, and running phase across all 6 schedules', () => {
      const initialState = createPrototypeRunState(FLIGHT_BOUNDS);
      const totalDuration = 0.35;

      const results = SCHEDULE_ENTRIES.map(([_name, schedule]) =>
        runPartitionedSimulation({
          initialState,
          totalDuration,
          schedule,
          flightBounds: FLIGHT_BOUNDS,
          hazards: [],
          initialThrustHeld: false,
          inputScript: [],
        }),
      );

      const [baseline, ...others] = results;

      expect(baseline.finalState.phase).toBe('running');
      expect(baseline.totalSimulatedTime).toBe(totalDuration);
      expect(baseline.finalState.motion.distance).toBeCloseTo(122.5, 9);
      expect(baseline.finalState.flight.positionY).toBeCloseTo(280.75, 9);
      expect(baseline.finalState.flight.velocityY).toBeCloseTo(490, 9);

      for (const result of others) {
        expect(result.finalState.phase).toBe('running');
        expect(result.totalSimulatedTime).toBe(totalDuration);
        expect(
          Math.abs(result.finalState.motion.distance - baseline.finalState.motion.distance),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs(result.finalState.flight.positionY - baseline.finalState.flight.positionY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs(result.finalState.flight.velocityY - baseline.finalState.flight.velocityY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
      }
    });
  });

  describe('scenario 2: scripted thrust/release run', () => {
    it('applies time-based input transitions at exact simulation times across all schedules', () => {
      const initialState = createPrototypeRunState(FLIGHT_BOUNDS);
      const totalDuration = 0.7;
      const inputScript = [
        { time: 0.15, thrustHeld: true },
        { time: 0.425, thrustHeld: false }, // Intentionally non-60Hz-aligned (frame 25.5)
        { time: 0.55, thrustHeld: true },
      ];

      const results = SCHEDULE_ENTRIES.map(([_name, schedule]) =>
        runPartitionedSimulation({
          initialState,
          totalDuration,
          schedule,
          flightBounds: FLIGHT_BOUNDS,
          hazards: [],
          initialThrustHeld: false,
          inputScript,
        }),
      );

      const [baseline, ...others] = results;

      expect(baseline.finalState.phase).toBe('running');
      expect(baseline.totalSimulatedTime).toBe(totalDuration);
      expect(baseline.finalState.motion.distance).toBeCloseTo(245.0, 9);
      expect(baseline.finalState.flight.positionY).toBeCloseTo(263.6875, 9);
      expect(baseline.finalState.flight.velocityY).toBeCloseTo(45.0, 9);

      for (const result of others) {
        expect(result.finalState.phase).toBe('running');
        expect(result.totalSimulatedTime).toBe(totalDuration);
        expect(
          Math.abs(result.finalState.motion.distance - baseline.finalState.motion.distance),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs(result.finalState.flight.positionY - baseline.finalState.flight.positionY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs(result.finalState.flight.velocityY - baseline.finalState.flight.velocityY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
      }
    });
  });

  describe('scenario 3: velocity-cap crossing', () => {
    it('remains equivalent across all schedules when crossing and holding fall velocity cap', () => {
      const initialState: PrototypeRunState = {
        phase: 'running',
        motion: { distance: 0 },
        flight: { positionY: 0, velocityY: 0 },
      };
      // Gravity 1400 px/s^2 crosses maxFallVelocity 650 at t = 650/1400 ≈ 0.4643s
      const totalDuration = 0.8;

      const results = SCHEDULE_ENTRIES.map(([_name, schedule]) =>
        runPartitionedSimulation({
          initialState,
          totalDuration,
          schedule,
          flightBounds: UNRESTRICTIVE_BOUNDS,
          hazards: [],
          initialThrustHeld: false,
          inputScript: [],
        }),
      );

      const [baseline, ...others] = results;

      expect(baseline.finalState.flight.velocityY).toBe(
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS.maxFallVelocity,
      );
      expect(baseline.finalState.motion.distance).toBeCloseTo(280.0, 9);
      expect(baseline.finalState.flight.positionY).toBeCloseTo(369.1071428571, 9);

      for (const result of others) {
        expect(result.finalState.flight.velocityY).toBe(
          PROTOTYPE_FLIGHT_TUNING_DEFAULTS.maxFallVelocity,
        );
        expect(
          Math.abs(result.finalState.motion.distance - baseline.finalState.motion.distance),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs(result.finalState.flight.positionY - baseline.finalState.flight.positionY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
      }
    });

    it('remains equivalent across all schedules when crossing and holding rise velocity cap', () => {
      const initialState: PrototypeRunState = {
        phase: 'running',
        motion: { distance: 0 },
        flight: { positionY: 500, velocityY: 0 },
      };
      // Upward accel = 2200 - 1400 = 800 px/s^2. Crosses maxRiseVelocity 550 at t = 550/800 = 0.6875s.
      // Run for 0.8s with thrust held to verify holding at the cap.
      const totalDuration = 0.8;

      const results = SCHEDULE_ENTRIES.map(([_name, schedule]) =>
        runPartitionedSimulation({
          initialState,
          totalDuration,
          schedule,
          flightBounds: UNRESTRICTIVE_BOUNDS,
          hazards: [],
          initialThrustHeld: true,
          inputScript: [],
        }),
      );

      const [baseline, ...others] = results;

      expect(baseline.finalState.phase).toBe('running');
      expect(baseline.totalSimulatedTime).toBe(totalDuration);
      expect(baseline.finalState.flight.velocityY).toBe(
        -PROTOTYPE_FLIGHT_TUNING_DEFAULTS.maxRiseVelocity,
      );
      expect(baseline.finalState.motion.distance).toBeCloseTo(280.0, 9);

      for (const result of others) {
        expect(result.finalState.phase).toBe('running');
        expect(result.totalSimulatedTime).toBe(totalDuration);
        expect(result.finalState.flight.velocityY).toBe(
          -PROTOTYPE_FLIGHT_TUNING_DEFAULTS.maxRiseVelocity,
        );
        expect(
          Math.abs(result.finalState.motion.distance - baseline.finalState.motion.distance),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs(result.finalState.flight.positionY - baseline.finalState.flight.positionY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
      }
    });

    it('remains equivalent across all schedules during post-cap release deceleration', () => {
      const initialState: PrototypeRunState = {
        phase: 'running',
        motion: { distance: 0 },
        flight: { positionY: 500, velocityY: 0 },
      };
      // Thrust held past rise cap (0.6875s) until 0.80s, then released until 1.10s.
      const totalDuration = 1.1;
      const inputScript = [
        { time: 0, thrustHeld: true },
        { time: 0.8, thrustHeld: false },
      ];

      const results = SCHEDULE_ENTRIES.map(([_name, schedule]) =>
        runPartitionedSimulation({
          initialState,
          totalDuration,
          schedule,
          flightBounds: UNRESTRICTIVE_BOUNDS,
          hazards: [],
          initialThrustHeld: true,
          inputScript,
        }),
      );

      const [baseline, ...others] = results;

      expect(baseline.finalState.phase).toBe('running');
      expect(baseline.totalSimulatedTime).toBe(totalDuration);
      expect(baseline.finalState.motion.distance).toBeCloseTo(385.0, 9);

      for (const result of others) {
        expect(result.finalState.phase).toBe('running');
        expect(result.totalSimulatedTime).toBe(totalDuration);
        expect(
          Math.abs(result.finalState.motion.distance - baseline.finalState.motion.distance),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs(result.finalState.flight.positionY - baseline.finalState.flight.positionY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs(result.finalState.flight.velocityY - baseline.finalState.flight.velocityY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
      }
    });
  });

  describe('scenario 4: boundary contact followed by release', () => {
    it('keeps the exact #175/#176 authoritative flight state equivalent across all schedules', () => {
      const initialState = createPrototypeRunState(FLIGHT_BOUNDS);
      const totalDuration = 1.3;
      const inputScript = [
        { time: 0, thrustHeld: true },
        { time: 0.522, thrustHeld: false },
      ];

      const results = SCHEDULE_ENTRIES.map(([_name, schedule]) =>
        runPartitionedSimulation({
          initialState,
          totalDuration,
          schedule,
          flightBounds: FLIGHT_BOUNDS,
          hazards: [],
          initialThrustHeld: true,
          inputScript,
        }),
      );

      const [baseline, ...others] = results;

      expect(baseline.finalState.phase).toBe('running');
      expect(baseline.totalSimulatedTime).toBe(totalDuration);
      expect(baseline.finalState.flight.positionY).toBeCloseTo(239.721_669_612_155, 9);
      expect(baseline.finalState.flight.velocityY).toBe(
        PROTOTYPE_FLIGHT_TUNING_DEFAULTS.maxFallVelocity,
      );

      for (const result of others) {
        expect(result.finalState.phase).toBe('running');
        expect(result.totalSimulatedTime).toBe(totalDuration);
        expect(
          Math.abs(result.finalState.flight.positionY - baseline.finalState.flight.positionY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs(result.finalState.flight.velocityY - baseline.finalState.flight.velocityY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
      }
    });
  });

  describe('scenario 5: collision partition-sensitivity probe', () => {
    it('detects collision across all schedules on a standard broad hazard', () => {
      // Starting just before the placeholder hazard [1200, 1248]
      const initialState: PrototypeRunState = {
        phase: 'running',
        motion: { distance: 1_150 },
        flight: { positionY: 195, velocityY: 0 },
      };
      const totalDuration = 0.2;

      const results = SCHEDULE_ENTRIES.map(([_name, schedule]) =>
        runPartitionedSimulation({
          initialState,
          totalDuration,
          schedule,
          flightBounds: FLIGHT_BOUNDS,
          hazards: [PROTOTYPE_PLACEHOLDER_HAZARD],
          initialThrustHeld: false,
          inputScript: [],
        }),
      );

      for (const result of results) {
        expect(result.finalState.phase).toBe('dead');
        expect(result.deathRecordedAtTime).not.toBeNull();
        expect(result.deathRecordedAtDistance).toBeGreaterThanOrEqual(1_182);
        expect(result.deathRecordedAtDistance).toBeLessThanOrEqual(1_266);
      }
    });

    it('demonstrates collision partition divergence on authored corridor geometry mapped through the scheduler', () => {
      // Uses authored PROTOTYPE_CORRIDOR_PATTERN geometry mapped through the PatternSpawnScheduler.
      // Evidence boundary note: this fixture isolates the collision behavior of authoritative
      // stepPrototypeRun using authored/scheduled hazard geometry and normal flight bounds.
      // This exact corridor-at-distance-zero arrangement is NOT claimed to be admitted by current
      // live difficulty/pacing policy (corridor requires tier 1, which starts at distance 2500).
      // It serves as an authored-content collision counterexample disproving universal partition invariance.
      const scheduleResult = scheduleNextPattern({
        catalog: [PROTOTYPE_CORRIDOR_PATTERN],
        patternStartDistance: 0,
        state: createRunGenerationState('frame-partition-test-seed'),
      });

      if (scheduleResult.status !== 'accepted') {
        throw new Error('Expected PROTOTYPE_CORRIDOR_PATTERN to be accepted by scheduler.');
      }

      // Starting state: the exact authoritative initial centered run state
      const initialState = createPrototypeRunState(FLIGHT_BOUNDS);
      const totalDuration = 0.6;

      // Trajectory: player holds thrust for 252ms from normal centered start (y=195, vy=0),
      // then releases thrust into downward gravitational acceleration.
      //
      // Corridor top barrier: [left: 160, right: 208, top: 48, bottom: 132].
      // Player hitbox extents: [-18, +18] in X, [-24, +24] in Y.
      //
      // Mathematical geometry:
      // Player enters horizontal overlap (x + 18 > 160) at t = (160 - 18) / 350 = 0.40571s.
      // Player exits vertical overlap (y - 24 > 132 -> y > 156) at t ≈ 0.4326s.
      // Overlap window: t in (0.4057s, 0.4326s).
      //
      // Partition divergence:
      // - 60 Hz, 90 Hz, 120 Hz, 144 Hz, and jittered schedules sample inside the overlap window
      //   (at t ≈ 0.408s - 0.420s), detecting collision with corridor-top and transitioning to 'dead'.
      // - 30 Hz steps at t = 0.4000s (x + 18 = 158 < 160, not yet overlapping in X)
      //   and t = 0.4333s (y - 24 = 132.06 > 132, already below corridor-top in Y).
      // - 30 Hz steps completely over the corner without evaluating collision during the overlap window,
      //   surviving to the end with phase 'running'.
      const inputScript = [
        { time: 0, thrustHeld: true },
        { time: 0.252, thrustHeld: false },
      ];

      const results = Object.fromEntries(
        SCHEDULE_ENTRIES.map(([name, schedule]) => [
          name,
          runPartitionedSimulation({
            initialState,
            totalDuration,
            schedule,
            flightBounds: FLIGHT_BOUNDS,
            hazards: scheduleResult.spawns,
            initialThrustHeld: true,
            inputScript,
          }),
        ]),
      );

      // Fine and jittered schedules detect the collision on corridor-top:
      expect(results['60hz'].finalState.phase).toBe('dead');
      expect(results['90hz'].finalState.phase).toBe('dead');
      expect(results['120hz'].finalState.phase).toBe('dead');
      expect(results['144hz'].finalState.phase).toBe('dead');
      expect(results.jittered.finalState.phase).toBe('dead');

      expect(results['60hz'].deathRecordedAtTime).toBeCloseTo(0.4167, 3);
      expect(results['90hz'].deathRecordedAtTime).toBeCloseTo(0.4111, 3);
      expect(results['120hz'].deathRecordedAtTime).toBeCloseTo(0.4083, 3);
      expect(results['144hz'].deathRecordedAtTime).toBeCloseTo(0.4097, 3);
      expect(results.jittered.deathRecordedAtTime).toBeCloseTo(0.42, 2);

      // 30 Hz steps completely over the corner and tunnels through:
      expect(results['30hz'].finalState.phase).toBe('running');
      expect(results['30hz'].deathRecordedAtTime).toBeNull();
    });
  });
});
