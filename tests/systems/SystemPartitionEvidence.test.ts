import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import { TimeService } from '../../src/core/TimeService';
import {
  calculateDifficulty,
  PROTOTYPE_DIFFICULTY_CONFIG,
} from '../../src/difficulty/DifficultySystem';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  type GeneratedHazardStreamContext,
  PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
} from '../../src/generation/GeneratedHazardStream';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../src/generation/LiveEncounterPolicy';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS } from '../../src/generation/PatternValidator';
import {
  PROTOTYPE_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN,
  PROTOTYPE_TIMED_PULSE_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import {
  createTelegraphedHazardSimulationState,
  getLethalHazardsForTelegraphedSimulation,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
  type TelegraphedHazardSimulationState,
} from '../../src/hazards/TelegraphedHazardSimulation';
import { calculatePacing, PROTOTYPE_PACING_CONFIG } from '../../src/pacing/PacingSystem';
import {
  createPrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';
import type { VerticalFlightBounds } from '../../src/systems/VerticalFlightSimulation';
import { type FrameSchedule, STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const SCHEDULE_ENTRIES = Object.entries(STANDARD_FRAME_SCHEDULES);
const FLOATING_POINT_TOLERANCE = 1e-9;
const EPSILON = 1e-12;

const FLIGHT_BOUNDS: Readonly<VerticalFlightBounds> = Object.freeze({
  ceilingY: 28,
  floorY: 362,
});

/** Helper to advance telegraphed simulation to an exact target time across any frame schedule. */
const runTelegraphedPartitionToTime = (
  schedule: FrameSchedule,
  totalDuration: number,
  spawns: Parameters<typeof stepTelegraphedHazardSimulation>[1],
  getTarget: (time: number) => { positionY: number; runDistance: number },
): TelegraphedHazardSimulationState => {
  let simState = createTelegraphedHazardSimulationState();
  let elapsed = 0;
  let stepIndex = 0;

  while (elapsed < totalDuration - EPSILON) {
    const nominalDelta = schedule.getNextDelta(elapsed, stepIndex);
    stepIndex += 1;
    const stepDelta = Math.min(nominalDelta, totalDuration - elapsed);
    elapsed += stepDelta;
    simState = stepTelegraphedHazardSimulation(simState, spawns, stepDelta, getTarget(elapsed));
  }

  return simState;
};

describe('system frame partition evidence', () => {
  describe('authority 1: timed/telegraphed hazard lifecycle progression', () => {
    // Authored PROTOTYPE_TIMED_PULSE_PATTERN lifecycle durations:
    // warning: 1.60s, lock: 0.25s, active: 0.90s.
    // Cumulative phase boundaries:
    // - warning: [0.00s, 1.60s)
    // - lock:    [1.60s, 1.85s)
    // - active:  [1.85s, 2.75s)
    // - expired: [2.75s, +inf)
    const scheduleResult = scheduleNextPattern({
      catalog: [PROTOTYPE_TIMED_PULSE_PATTERN],
      patternStartDistance: 0,
      state: createRunGenerationState('timed-pulse-evidence-seed'),
    });

    if (scheduleResult.status !== 'accepted') {
      throw new Error('Expected PROTOTYPE_TIMED_PULSE_PATTERN to be accepted.');
    }

    const pulseSpawn = scheduleResult.spawns[0];
    const fixedTarget = { positionY: 195, runDistance: 0 };

    it('evaluates warning phase with identical elapsed time and non-lethal state at t=0.80s', () => {
      const targetTime = 0.8;
      const results = SCHEDULE_ENTRIES.map(([name, schedule]) => ({
        name,
        state: runTelegraphedPartitionToTime(schedule, targetTime, [pulseSpawn], () => fixedTarget),
      }));

      for (const { state } of results) {
        const lifecycle = getTelegraphedHazardLifecycle(state, pulseSpawn);
        expect(lifecycle).not.toBeNull();
        expect(lifecycle?.phase).toBe('warning');
        expect(lifecycle?.elapsedPhaseSeconds).toBeCloseTo(0.8, 9);
        const lethals = getLethalHazardsForTelegraphedSimulation(state, [pulseSpawn]);
        expect(lethals).toHaveLength(0);
      }
    });

    it('evaluates lock phase with identical elapsed phase time and non-lethal state at t=1.70s', () => {
      const targetTime = 1.7; // 1.60s + 0.10s into lock
      const results = SCHEDULE_ENTRIES.map(([name, schedule]) => ({
        name,
        state: runTelegraphedPartitionToTime(schedule, targetTime, [pulseSpawn], () => fixedTarget),
      }));

      for (const { state } of results) {
        const lifecycle = getTelegraphedHazardLifecycle(state, pulseSpawn);
        expect(lifecycle).not.toBeNull();
        expect(lifecycle?.phase).toBe('lock');
        expect(lifecycle?.elapsedPhaseSeconds).toBeCloseTo(0.1, 9);
        const lethals = getLethalHazardsForTelegraphedSimulation(state, [pulseSpawn]);
        expect(lethals).toHaveLength(0);
      }
    });

    it('evaluates active phase with identical elapsed phase time and lethal membership at t=2.20s', () => {
      const targetTime = 2.2; // 1.85s + 0.35s into active
      const results = SCHEDULE_ENTRIES.map(([name, schedule]) => ({
        name,
        state: runTelegraphedPartitionToTime(schedule, targetTime, [pulseSpawn], () => fixedTarget),
      }));

      for (const { state } of results) {
        const lifecycle = getTelegraphedHazardLifecycle(state, pulseSpawn);
        expect(lifecycle).not.toBeNull();
        expect(lifecycle?.phase).toBe('active');
        expect(lifecycle?.elapsedPhaseSeconds).toBeCloseTo(0.35, 9);
        const lethals = getLethalHazardsForTelegraphedSimulation(state, [pulseSpawn]);
        expect(lethals).toHaveLength(1);
        expect(lethals[0].hitbox).toEqual(pulseSpawn.hitbox);
      }
    });

    it('evaluates expired phase with zero elapsed time and non-lethal state at t=3.00s', () => {
      const targetTime = 3.0; // expired after 2.75s
      const results = SCHEDULE_ENTRIES.map(([name, schedule]) => ({
        name,
        state: runTelegraphedPartitionToTime(schedule, targetTime, [pulseSpawn], () => fixedTarget),
      }));

      for (const { state } of results) {
        const lifecycle = getTelegraphedHazardLifecycle(state, pulseSpawn);
        expect(lifecycle).not.toBeNull();
        expect(lifecycle?.phase).toBe('expired');
        expect(lifecycle?.elapsedPhaseSeconds).toBe(0);
        const lethals = getLethalHazardsForTelegraphedSimulation(state, [pulseSpawn]);
        expect(lethals).toHaveLength(0);
      }
    });

    it('demonstrates discrete target-lock sampling sensitivity on moving player across coarse vs fine frames', () => {
      // Authored PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN has warning duration = 1.40s.
      // During warning, observed player target moves continuously at vy = 50 px/s (y(t) = 100 + 50 * t).
      // At the frame crossing t = 1.40s, the hazard freezes lockedTarget from latestObservedTarget.
      const strikeSchedule = scheduleNextPattern({
        catalog: [PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN],
        patternStartDistance: 0,
        state: createRunGenerationState('target-lock-strike-seed'),
      });

      if (strikeSchedule.status !== 'accepted') {
        throw new Error('Expected PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN to be accepted.');
      }

      const strikeSpawn = strikeSchedule.spawns[0];
      const targetTime = 2.0; // warning (1.4s) + lock (0.4s) + active (0.2s)

      const results = Object.fromEntries(
        SCHEDULE_ENTRIES.map(([name, schedule]) => {
          const state = runTelegraphedPartitionToTime(schedule, targetTime, [strikeSpawn], (t) => ({
            positionY: 100 + 50 * t,
            runDistance: 350 * t,
          }));
          const lifecycle = getTelegraphedHazardLifecycle(state, strikeSpawn);
          const lethals = getLethalHazardsForTelegraphedSimulation(state, [strikeSpawn]);
          return [name, { lifecycle, lethalHitbox: lethals[0]?.hitbox }];
        }),
      );

      // All schedules reach active phase:
      for (const [_name, result] of Object.entries(results)) {
        expect(result.lifecycle?.phase).toBe('active');
        expect(result.lethalHitbox).toBeDefined();
      }

      // 30 Hz and 60 Hz step on t = 1.4000s exactly, freezing lockedTarget.positionY = 170.0:
      expect(results['30hz'].lifecycle?.lockedTarget?.positionY).toBeCloseTo(170.0, 3);
      expect(results['60hz'].lifecycle?.lockedTarget?.positionY).toBeCloseTo(170.0, 3);

      // Other schedules cross 1.40s on their respective discrete frame boundaries, sampling player position
      // within the single-frame interval [t_lock, t_lock + dt_frame].
      // Sampling jitter across all 6 schedules is tightly bounded within <= 0.6 px:
      for (const [_name, result] of Object.entries(results)) {
        const lockedY = result.lifecycle?.lockedTarget?.positionY;
        expect(lockedY).toBeDefined();
        if (lockedY !== undefined) {
          expect(lockedY).toBeGreaterThanOrEqual(170.0);
          expect(lockedY).toBeLessThanOrEqual(170.6);
        }
      }
    });
  });

  describe('authority 2: generated hazard stream & PRNG draws across schedules', () => {
    it('produces 100% identical PRNG state, pattern sequence, and spawn geometry in contiguous stream across all 6 schedules', () => {
      const legacyContext: GeneratedHazardStreamContext = Object.freeze({
        catalog: PROTOTYPE_HAZARD_PATTERN_FIXTURES,
        config: PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
      });

      const seed = 'm3-contiguous-stream-seed';
      const totalDuration = 8.5; // reaches distance 2975m at 350 px/s
      const runMotion = PROTOTYPE_RUN_MOTION_DEFAULTS;

      const runLegacyStream = (schedule: FrameSchedule) => {
        let stream = createGeneratedHazardStream(seed, legacyContext, runMotion);
        let elapsed = 0;
        let distance = 0;
        let stepIndex = 0;

        while (elapsed < totalDuration - EPSILON) {
          const nominalDelta = schedule.getNextDelta(elapsed, stepIndex);
          stepIndex += 1;
          const delta = Math.min(nominalDelta, totalDuration - elapsed);

          stream = advanceGeneratedHazardStream(
            stream,
            distance,
            legacyContext,
            runMotion,
            0,
            false,
          );

          distance += stream.schedulingWindow.scrollSpeed * delta;
          elapsed += delta;

          stream = advanceGeneratedHazardStream(
            stream,
            distance,
            legacyContext,
            runMotion,
            delta,
            true,
          );
        }

        return { distance, elapsed, stream };
      };

      const results = Object.fromEntries(
        SCHEDULE_ENTRIES.map(([name, schedule]) => [name, runLegacyStream(schedule)]),
      );

      const baseline = results['60hz'];
      expect(baseline.stream.scheduledPatternCount).toBe(7);

      for (const [_name, result] of Object.entries(results)) {
        // Distance and simulated time match exactly
        expect(Math.abs(result.distance - baseline.distance)).toBeLessThanOrEqual(
          FLOATING_POINT_TOLERANCE,
        );
        expect(Math.abs(result.elapsed - baseline.elapsed)).toBeLessThanOrEqual(
          FLOATING_POINT_TOLERANCE,
        );

        // PRNG internal state and counter match identically:
        expect(result.stream.generationState.prngState).toBe(
          baseline.stream.generationState.prngState,
        );

        // Pattern scheduling count and next cursor match identically:
        expect(result.stream.scheduledPatternCount).toBe(baseline.stream.scheduledPatternCount);
        expect(
          Math.abs(
            result.stream.nextPatternStartDistance - baseline.stream.nextPatternStartDistance,
          ),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);

        // Spawns count and individual hazard geometry match identically:
        expect(result.stream.spawns.length).toBe(baseline.stream.spawns.length);
        for (let i = 0; i < baseline.stream.spawns.length; i++) {
          const expectedSpawn = baseline.stream.spawns[i];
          const actualSpawn = result.stream.spawns[i];
          expect(actualSpawn.patternId).toBe(expectedSpawn.patternId);
          expect(Math.abs(actualSpawn.runDistance - expectedSpawn.runDistance)).toBeLessThanOrEqual(
            FLOATING_POINT_TOLERANCE,
          );
          expect(Math.abs(actualSpawn.hitbox.left - expectedSpawn.hitbox.left)).toBeLessThanOrEqual(
            FLOATING_POINT_TOLERANCE,
          );
          expect(
            Math.abs(actualSpawn.hitbox.right - expectedSpawn.hitbox.right),
          ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
          expect(actualSpawn.hitbox.top).toBe(expectedSpawn.hitbox.top);
          expect(actualSpawn.hitbox.bottom).toBe(expectedSpawn.hitbox.bottom);
        }
      }
    });

    it('demonstrates identical PRNG draw count and pattern IDs with bounded gap recovery offset under policy mode', () => {
      const policyContext: GeneratedHazardStreamContext = Object.freeze({
        catalog: PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
        config: PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
        policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
        reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
        constraints: PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      });

      const seed = 'm4-cross-partition-generation-seed';
      const totalDuration = 8.5; // reaches distance 2975m
      const runMotion = PROTOTYPE_RUN_MOTION_DEFAULTS;

      const runPolicyStream = (schedule: FrameSchedule) => {
        let stream = createGeneratedHazardStream(seed, policyContext, runMotion);
        let elapsed = 0;
        let distance = 0;
        let stepIndex = 0;

        while (elapsed < totalDuration - EPSILON) {
          const nominalDelta = schedule.getNextDelta(elapsed, stepIndex);
          stepIndex += 1;
          const delta = Math.min(nominalDelta, totalDuration - elapsed);

          stream = advanceGeneratedHazardStream(
            stream,
            distance,
            policyContext,
            runMotion,
            0,
            false,
          );

          distance += stream.schedulingWindow.scrollSpeed * delta;
          elapsed += delta;

          stream = advanceGeneratedHazardStream(
            stream,
            distance,
            policyContext,
            runMotion,
            delta,
            true,
          );
        }

        return { distance, elapsed, stream };
      };

      const results = Object.fromEntries(
        SCHEDULE_ENTRIES.map(([name, schedule]) => [name, runPolicyStream(schedule)]),
      );

      const baseline = results['60hz'];
      expect(baseline.stream.scheduledPatternCount).toBe(2);

      for (const [_name, result] of Object.entries(results)) {
        // Scheduled pattern count is 100% identical:
        expect(result.stream.scheduledPatternCount).toBe(baseline.stream.scheduledPatternCount);

        // PRNG internal state is 100% identical:
        expect(result.stream.generationState.prngState).toBe(
          baseline.stream.generationState.prngState,
        );

        // Scheduled pattern types and relative sequence are 100% identical:
        expect(result.stream.spawns.length).toBe(baseline.stream.spawns.length);
        for (let i = 0; i < baseline.stream.spawns.length; i++) {
          expect(result.stream.spawns[i].patternId).toBe(baseline.stream.spawns[i].patternId);
        }

        // Discrete gap-recovery sensitivity:
        // In fillPolicySpawnWindow, nextPatternStartDistance is clamped to windowEnd upon crossing tier 1 (2500m).
        // Because windowEnd is sampled at discrete frame steps, the first post-gap pattern exhibits a small
        // placement offset bounded by [0, dt_max * speed] = [0, 0.05s * 350 px/s] = [0, 17.5m].
        // Observed offset between coarse 30Hz/60Hz (2503m) and fine 120Hz (2500.08m) is ~2.92m:
        expect(
          Math.abs(
            result.stream.nextPatternStartDistance - baseline.stream.nextPatternStartDistance,
          ),
        ).toBeLessThanOrEqual(3.5);
      }
    });
  });

  describe('authority 3: difficulty and pacing authority across schedules', () => {
    it('produces identical difficulty snapshots and pacing snapshots at equivalent run distance', () => {
      const distanceCheckpoints = [0, 500, 1250, 2500, 3000, 5000];

      for (const distance of distanceCheckpoints) {
        const difficulty = calculateDifficulty(distance, PROTOTYPE_DIFFICULTY_CONFIG);
        const pacing = calculatePacing(distance, PROTOTYPE_PACING_CONFIG);

        // Mathematical verification that difficulty is a pure function of distance
        const reDifficulty = calculateDifficulty(distance, PROTOTYPE_DIFFICULTY_CONFIG);
        expect(reDifficulty).toEqual(difficulty);

        // Mathematical verification that pacing is a pure function of distance
        const rePacing = calculatePacing(distance, PROTOTYPE_PACING_CONFIG);
        expect(rePacing).toEqual(pacing);
      }
    });

    it('maintains identical difficulty tier and pacing phase snapshots in the live stream across all 6 schedules', () => {
      const context: GeneratedHazardStreamContext = Object.freeze({
        catalog: PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
        config: PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
        policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
        reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
        constraints: PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      });

      const totalDuration = 7.5; // reaches distance 2625m, crossing into difficulty tier 1 at 2500m
      const runMotion = PROTOTYPE_RUN_MOTION_DEFAULTS;

      const runToFinish = (schedule: FrameSchedule) => {
        let stream = createGeneratedHazardStream('policy-snapshot-seed', context, runMotion);
        let elapsed = 0;
        let distance = 0;
        let stepIndex = 0;

        while (elapsed < totalDuration - EPSILON) {
          const nominalDelta = schedule.getNextDelta(elapsed, stepIndex);
          stepIndex += 1;
          const delta = Math.min(nominalDelta, totalDuration - elapsed);

          stream = advanceGeneratedHazardStream(stream, distance, context, runMotion, 0, false);
          distance += stream.schedulingWindow.scrollSpeed * delta;
          elapsed += delta;
          stream = advanceGeneratedHazardStream(stream, distance, context, runMotion, delta, true);
        }

        return stream.policy;
      };

      const results = Object.fromEntries(
        SCHEDULE_ENTRIES.map(([name, schedule]) => [name, runToFinish(schedule)]),
      );

      const baseline = results['60hz'];
      expect(baseline).not.toBeNull();
      expect(baseline?.difficulty.tierIndex).toBe(1); // successfully crossed into tier 1

      const baselineDistance = baseline?.difficulty.runDistance;
      expect(baselineDistance).toBeDefined();

      for (const [_name, policy] of Object.entries(results)) {
        expect(policy).not.toBeNull();
        expect(policy?.difficulty.tierIndex).toBe(baseline?.difficulty.tierIndex);
        if (baselineDistance !== undefined) {
          expect(policy?.difficulty.runDistance).toBeCloseTo(baselineDistance, 9);
        }
        expect(policy?.pacing.intensity).toBe(baseline?.pacing.intensity);
        expect(policy?.pacing.phaseIndex).toBe(baseline?.pacing.phaseIndex);
        expect(policy?.pacing.phaseEndDistance).toBe(baseline?.pacing.phaseEndDistance);
      }
    });
  });

  describe('authority 4: scripted flight around a timed hazard encounter', () => {
    it('safely passes through a timed hazard spatial volume during warning phase without collision across all schedules', () => {
      // Place PROTOTYPE_TIMED_PULSE_PATTERN at start distance 0.
      // Pulse hitbox: left: 120, right: 184, top: 155, bottom: 219.
      // Warning duration: 1.60s. Active window: [1.85s, 2.75s].
      // Player starts at y = 195, speed = 350 px/s.
      // Player scripts thrust from t = 0.10s to 0.35s to stay level at y in [209, 235],
      // directly overlapping pulse vertical range [155, 219] during traversal window [0.291s, 0.577s].
      // Because the hazard is in WARNING phase, no collision occurs across any schedule.
      const scheduleResult = scheduleNextPattern({
        catalog: [PROTOTYPE_TIMED_PULSE_PATTERN],
        patternStartDistance: 0,
        state: createRunGenerationState('timed-encounter-input-seed'),
      });

      if (scheduleResult.status !== 'accepted') {
        throw new Error('Expected PROTOTYPE_TIMED_PULSE_PATTERN to be accepted.');
      }

      const spawns = scheduleResult.spawns;
      const totalDuration = 0.8;

      const runSimulation = (schedule: FrameSchedule) => {
        let runState = createPrototypeRunState(FLIGHT_BOUNDS);
        let telegraphedState = createTelegraphedHazardSimulationState();
        let elapsed = 0;
        let stepIndex = 0;

        while (elapsed < totalDuration - EPSILON) {
          const nominalDelta = schedule.getNextDelta(elapsed, stepIndex);
          stepIndex += 1;
          const delta = Math.min(nominalDelta, totalDuration - elapsed);

          const thrustHeld = elapsed >= 0.1 && elapsed <= 0.35;

          // Step telegraphed hazard lifecycle
          telegraphedState = stepTelegraphedHazardSimulation(telegraphedState, spawns, delta, {
            positionY: runState.flight.positionY,
            runDistance: runState.motion.distance,
          });

          // Get currently lethal hazards
          const lethalHazards = getLethalHazardsForTelegraphedSimulation(telegraphedState, spawns);

          // Step run simulation
          const stepResult = stepPrototypeRun(runState, delta, {
            flightBounds: FLIGHT_BOUNDS,
            flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
            hazards: lethalHazards,
            runMotionTuning: PROTOTYPE_RUN_MOTION_DEFAULTS,
            thrustHeld,
          });

          runState = stepResult.state;
          elapsed += delta;

          if (runState.phase === 'dead') {
            break;
          }
        }

        return { elapsed, runState };
      };

      for (const [_name, schedule] of SCHEDULE_ENTRIES) {
        const result = runSimulation(schedule);
        expect(result.runState.phase).toBe('running');
        expect(result.runState.motion.distance).toBeCloseTo(280.0, 9);
      }
    });

    it('detects collision consistently across all schedules when player climbs into an active pulse', () => {
      // Place pulse pattern at distance 550, so hitbox is [550 + 120, 550 + 184] = [670, 734].
      // Pulse active window is [1.85s, 2.75s].
      // At speed 350 px/s, player reaches [670, 734] at t in [1.863s, 2.149s].
      // Player scripts thrust from 1.50s to 2.05s to climb into y in [198, 220],
      // entering spatial and temporal intersection with the active lethal pulse.
      const scheduleResult = scheduleNextPattern({
        catalog: [PROTOTYPE_TIMED_PULSE_PATTERN],
        patternStartDistance: 550,
        state: createRunGenerationState('active-pulse-collision-seed'),
      });

      if (scheduleResult.status !== 'accepted') {
        throw new Error('Expected PROTOTYPE_TIMED_PULSE_PATTERN to be accepted.');
      }

      const spawns = scheduleResult.spawns;
      const totalDuration = 2.3;

      const runSimulation = (schedule: FrameSchedule) => {
        let runState = createPrototypeRunState(FLIGHT_BOUNDS);
        let telegraphedState = createTelegraphedHazardSimulationState();
        let elapsed = 0;
        let stepIndex = 0;
        let deathTime: number | null = null;

        while (elapsed < totalDuration - EPSILON) {
          const nominalDelta = schedule.getNextDelta(elapsed, stepIndex);
          stepIndex += 1;
          const delta = Math.min(nominalDelta, totalDuration - elapsed);

          const thrustHeld = elapsed >= 1.5 && elapsed <= 2.05;

          telegraphedState = stepTelegraphedHazardSimulation(telegraphedState, spawns, delta, {
            positionY: runState.flight.positionY,
            runDistance: runState.motion.distance,
          });

          const lethalHazards = getLethalHazardsForTelegraphedSimulation(telegraphedState, spawns);

          const stepResult = stepPrototypeRun(runState, delta, {
            flightBounds: FLIGHT_BOUNDS,
            flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
            hazards: lethalHazards,
            runMotionTuning: PROTOTYPE_RUN_MOTION_DEFAULTS,
            thrustHeld,
          });

          runState = stepResult.state;
          elapsed += delta;

          if (stepResult.enteredDead && deathTime === null) {
            deathTime = elapsed;
            break;
          }
        }

        return { deathTime, runState };
      };

      // All schedules detect collision during the active window:
      for (const [_name, schedule] of SCHEDULE_ENTRIES) {
        const result = runSimulation(schedule);
        expect(result.runState.phase).toBe('dead');
        expect(result.deathTime).not.toBeNull();
        if (result.deathTime !== null) {
          expect(result.deathTime).toBeGreaterThanOrEqual(1.85);
          expect(result.deathTime).toBeLessThanOrEqual(2.15);
        }
      }
    });
  });

  describe('authority 5: max-delta clamping and lifecycle boundary', () => {
    it('clamps frame deltas exceeding maxDeltaSeconds to protect hazard lifecycle and simulation stepping', () => {
      const timeService = new TimeService({ maxDeltaSeconds: 0.05 });

      // Frame spike of 500ms wall-clock time is clamped to 50ms (0.05s)
      expect(timeService.update(500)).toBe(0.05);

      // Extreme background lag of 5000ms wall-clock time is clamped to 50ms (0.05s)
      expect(timeService.update(5000)).toBe(0.05);

      // Normal frame times pass through accurately
      expect(timeService.update(16.6667)).toBeCloseTo(0.0166667, 5);
      expect(timeService.update(8.3333)).toBeCloseTo(0.0083333, 5);
    });

    it('zeros simulation delta while paused and discards the first frame on resume to prevent catch-up jumps', () => {
      const timeService = new TimeService({ maxDeltaSeconds: 0.05 });

      timeService.update(16.6667);
      timeService.pause();

      expect(timeService.isPaused()).toBe(true);
      expect(timeService.getDeltaSeconds()).toBe(0);
      expect(timeService.update(10000)).toBe(0); // zero simulation delta while paused

      timeService.resume();
      expect(timeService.isPaused()).toBe(false);

      // First frame after resume returns zero delta, discarding accumulated wall-clock time
      expect(timeService.update(10000)).toBe(0);

      // Subsequent frame advances normally
      expect(timeService.update(16.6667)).toBeCloseTo(0.0166667, 5);
    });
  });
});
