import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
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
    it('remains equivalent across all schedules when crossing fall velocity cap', () => {
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

    it('remains equivalent across all schedules when crossing rise velocity cap and decelerating', () => {
      const initialState: PrototypeRunState = {
        phase: 'running',
        motion: { distance: 0 },
        flight: { positionY: 500, velocityY: 0 },
      };
      // Upward accel = 2200 - 1400 = 800 px/s^2. Crosses maxRiseVelocity 550 at t = 550/800 = 0.6875s.
      // Held until 0.90s, then released until 1.20s.
      const totalDuration = 1.2;
      const inputScript = [
        { time: 0, thrustHeld: true },
        { time: 0.9, thrustHeld: false },
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
      expect(baseline.finalState.motion.distance).toBeCloseTo(420.0, 9);

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

  describe('scenario 4: collision partition-sensitivity probe', () => {
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

    it('characterizes collision partition divergence on an adversarial corner-grazing trajectory', () => {
      // Deliberately adversarial, runtime-valid trajectory:
      // Player starts at (distance: 0, positionY: 100, velocityY: 0) and falls under gravity.
      // Player extents are [-18, +18] in X and [-24, +24] in Y.
      // Static hazard hitbox: [46.5, 100] in X, [50, 81.6] in Y.
      //
      // Player horizontal position x(t) = 350 * t.
      // Player right edge enters hazard left (46.5) at t = (46.5 - 18) / 350 = 0.08143s.
      // Player vertical position y(t) = 100 + 700 * t^2.
      // Player top edge falls below hazard bottom (81.6) when y(t) - 24 > 81.6 -> y(t) > 105.6.
      // y(t) = 105.6 at t = sqrt(5.6 / 700) = sqrt(0.008) ≈ 0.08944s.
      //
      // Therefore, the geometric overlap interval is brief: t in (0.08143s, 0.08944s).
      //
      // Findings:
      // - Higher refresh rates (60 Hz, 90 Hz, 120 Hz, 144 Hz) sample inside this window
      //   and transition the run to 'dead' at t ≈ 0.083 - 0.089s.
      // - 30 Hz (delta ≈ 0.0333s) samples at t ≈ 0.0667s (before X overlap) and t = 0.1000s
      //   (after player has fallen below the hazard), jumping completely over the overlap window.
      // - Jittered schedule also jumps over the window without sampling inside it.
      // - This proves that post-step discrete AABB evaluation without continuous collision detection
      //   (CCD) or a fixed simulation timestep is refresh-rate dependent.
      const adversarialHazard = {
        hitbox: {
          left: 46.5,
          right: 100,
          top: 50,
          bottom: 81.6,
        },
      };

      const initialState: PrototypeRunState = {
        phase: 'running',
        motion: { distance: 0 },
        flight: { positionY: 100, velocityY: 0 },
      };
      const totalDuration = 0.2;

      const results = Object.fromEntries(
        SCHEDULE_ENTRIES.map(([name, schedule]) => [
          name,
          runPartitionedSimulation({
            initialState,
            totalDuration,
            schedule,
            flightBounds: UNRESTRICTIVE_BOUNDS,
            hazards: [adversarialHazard],
            initialThrustHeld: false,
            inputScript: [],
          }),
        ]),
      );

      // Fine partitions sample the overlap window and detect the collision:
      expect(results['60hz'].finalState.phase).toBe('dead');
      expect(results['90hz'].finalState.phase).toBe('dead');
      expect(results['120hz'].finalState.phase).toBe('dead');
      expect(results['144hz'].finalState.phase).toBe('dead');

      expect(results['60hz'].deathRecordedAtTime).toBeCloseTo(0.0833, 3);
      expect(results['90hz'].deathRecordedAtTime).toBeCloseTo(0.0889, 3);
      expect(results['120hz'].deathRecordedAtTime).toBeCloseTo(0.0833, 3);
      expect(results['144hz'].deathRecordedAtTime).toBeCloseTo(0.0833, 3);

      // Coarse / jittered partitions step completely over the window without detection (tunneling):
      expect(results['30hz'].finalState.phase).toBe('running');
      expect(results['30hz'].deathRecordedAtTime).toBeNull();
      expect(results.jittered.finalState.phase).toBe('running');
      expect(results.jittered.deathRecordedAtTime).toBeNull();
    });
  });
});
