import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  type GeneratedHazardStreamContext,
  PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
} from '../../src/generation/GeneratedHazardStream';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../src/generation/LiveEncounterPolicy';
import {
  type LogicalHazardSpawnInstance,
  scheduleNextPattern,
} from '../../src/generation/PatternSpawnScheduler';
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
import {
  createPrototypeRunState,
  type PrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';
import { stepRunMotion } from '../../src/systems/RunMotionSimulation';
import {
  stepVerticalFlight,
  type VerticalFlightBounds,
} from '../../src/systems/VerticalFlightSimulation';
import { type FrameSchedule, STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const SCHEDULE_ENTRIES = Object.entries(STANDARD_FRAME_SCHEDULES);
const FLOATING_POINT_TOLERANCE = 1e-9;
const EPSILON = 1e-12;

const FLIGHT_BOUNDS: Readonly<VerticalFlightBounds> = Object.freeze({
  ceilingY: 28,
  floorY: 362,
});

/**
 * Advances telegraphed simulation to an exact target time across any frame schedule.
 * Matches live Foundation ordering: target observation is sampled pre-step before
 * simulationDeltaSeconds is stepped.
 */
const runTelegraphedPartitionToTime = (
  schedule: FrameSchedule,
  totalDuration: number,
  spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  getTarget: (time: number) => { positionY: number; runDistance: number },
): TelegraphedHazardSimulationState => {
  let simState = createTelegraphedHazardSimulationState();
  let elapsed = 0;
  let stepIndex = 0;

  while (elapsed < totalDuration - EPSILON) {
    const nominalDelta = schedule.getNextDelta(elapsed, stepIndex);
    stepIndex += 1;
    const stepDelta = Math.min(nominalDelta, totalDuration - elapsed);

    // Pre-step target observation matching live Foundation ordering
    const preStepTarget = getTarget(elapsed);

    simState = stepTelegraphedHazardSimulation(
      simState,
      spawns,
      stepDelta,
      preStepTarget,
      (delta) => getTarget(elapsed + delta),
    );
    elapsed += stepDelta;
  }

  return simState;
};

interface ScriptedInputTransition {
  readonly thrustHeld: boolean;
  readonly time: number;
}

interface ScriptedTelegraphedRunOptions {
  readonly flightBounds: Readonly<VerticalFlightBounds>;
  readonly initialRunState: Readonly<PrototypeRunState>;
  readonly inputScript?: ReadonlyArray<ScriptedInputTransition>;
  readonly schedule: FrameSchedule;
  readonly telegraphedSpawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>;
  readonly totalDuration: number;
}

interface ScriptedTelegraphedRunResult {
  readonly deathRecordedAtDistance: number | null;
  readonly deathRecordedAtTime: number | null;
  readonly finalRunState: Readonly<PrototypeRunState>;
}

/**
 * Scenario-local runner for telegraphed hazards with exact input-transition frame splitting.
 * If a frame spans across an input transition timestamp, the step is subdivided at the exact
 * transition time so input application remains frame-rate independent.
 */
const runScriptedTelegraphedSimulation = (
  options: ScriptedTelegraphedRunOptions,
): ScriptedTelegraphedRunResult => {
  const {
    flightBounds,
    initialRunState,
    inputScript = [],
    schedule,
    telegraphedSpawns,
    totalDuration,
  } = options;

  const sortedScript = [...inputScript].sort((a, b) => a.time - b.time);
  let scriptIndex = 0;
  let currentThrustHeld = false;

  while (scriptIndex < sortedScript.length && sortedScript[scriptIndex].time <= EPSILON) {
    currentThrustHeld = sortedScript[scriptIndex].thrustHeld;
    scriptIndex += 1;
  }

  let runState = initialRunState;
  let telegraphedState = createTelegraphedHazardSimulationState();
  let currentSimulatedTime = 0;
  let logicalFrames = 0;
  let deathRecordedAtTime: number | null = null;
  let deathRecordedAtDistance: number | null = null;

  while (currentSimulatedTime < totalDuration - EPSILON) {
    const nominalDelta = schedule.getNextDelta(currentSimulatedTime, logicalFrames);
    logicalFrames += 1;
    const frameEndTime = Math.min(totalDuration, currentSimulatedTime + nominalDelta);

    while (currentSimulatedTime < frameEndTime - EPSILON) {
      let nextTargetTime = frameEndTime;
      let transitionToApply: ScriptedInputTransition | null = null;

      if (
        scriptIndex < sortedScript.length &&
        sortedScript[scriptIndex].time < frameEndTime - EPSILON
      ) {
        nextTargetTime = sortedScript[scriptIndex].time;
        transitionToApply = sortedScript[scriptIndex];
      }

      const stepDelta = nextTargetTime - currentSimulatedTime;
      if (stepDelta > EPSILON) {
        // Pre-step player target observation matching live Foundation ordering
        const preStepTarget = {
          positionY: runState.flight.positionY,
          runDistance: runState.motion.distance,
        };

        const initialFlight = runState.flight;
        const initialMotion = runState.motion;
        const resolvePlayerTargetAtDelta = (delta: number) => {
          const subMotion = stepRunMotion(initialMotion, delta, PROTOTYPE_RUN_MOTION_DEFAULTS);
          const subFlight = stepVerticalFlight(
            initialFlight,
            delta,
            currentThrustHeld,
            PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
            flightBounds,
          );
          return {
            positionY: subFlight.positionY,
            runDistance: subMotion.distance,
          };
        };

        telegraphedState = stepTelegraphedHazardSimulation(
          telegraphedState,
          telegraphedSpawns,
          stepDelta,
          preStepTarget,
          resolvePlayerTargetAtDelta,
        );

        const lethalHazards = getLethalHazardsForTelegraphedSimulation(
          telegraphedState,
          telegraphedSpawns,
        );

        const stepResult = stepPrototypeRun(runState, stepDelta, {
          flightBounds,
          flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
          hazards: lethalHazards,
          runMotionTuning: PROTOTYPE_RUN_MOTION_DEFAULTS,
          thrustHeld: currentThrustHeld,
        });

        runState = stepResult.state;
        currentSimulatedTime = nextTargetTime;

        if (stepResult.enteredDead && deathRecordedAtTime === null) {
          deathRecordedAtTime = currentSimulatedTime;
          deathRecordedAtDistance = runState.motion.distance;
          break;
        }
      } else {
        currentSimulatedTime = nextTargetTime;
      }

      if (transitionToApply !== null) {
        currentThrustHeld = transitionToApply.thrustHeld;
        scriptIndex += 1;
        while (
          scriptIndex < sortedScript.length &&
          Math.abs(sortedScript[scriptIndex].time - currentSimulatedTime) <= EPSILON
        ) {
          currentThrustHeld = sortedScript[scriptIndex].thrustHeld;
          scriptIndex += 1;
        }
      }
    }

    if (deathRecordedAtTime !== null) {
      break;
    }

    while (
      scriptIndex < sortedScript.length &&
      Math.abs(sortedScript[scriptIndex].time - currentSimulatedTime) <= EPSILON
    ) {
      currentThrustHeld = sortedScript[scriptIndex].thrustHeld;
      scriptIndex += 1;
    }
  }

  return {
    deathRecordedAtDistance,
    deathRecordedAtTime,
    finalRunState: runState,
  };
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

    it('produces identical locked target and lethal strike hitbox across all 6 schedules with boundary-sampled target lock', () => {
      // Authored PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN has warning duration = 1.40s.
      // Under boundary sampling, the warning -> lock transition samples the player target at the
      // exact boundary time t = 1.40s instead of freezing the pre-step observation.
      // With player moving at vy = 50 px/s (y(t) = 100 + 50 * t) and vx = 350 px/s (x(t) = 350 * t),
      // the frozen target at t = 1.40s is exactly y = 170.000 px, distance = 490.000 across all schedules.
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
          return [name, { lethalHitbox: lethals[0]?.hitbox, lifecycle }];
        }),
      );

      // All schedules reach active phase with identical locked targets and hitboxes:
      for (const [_name, result] of Object.entries(results)) {
        expect(result.lifecycle?.phase).toBe('active');
        expect(result.lethalHitbox).toBeDefined();

        expect(
          Math.abs((result.lifecycle?.lockedTarget?.positionY ?? 0) - 170.0),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs((result.lifecycle?.lockedTarget?.runDistance ?? 0) - 490.0),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(Math.abs((result.lethalHitbox?.top ?? 0) - 146.0)).toBeLessThanOrEqual(
          FLOATING_POINT_TOLERANCE,
        );
        expect(Math.abs((result.lethalHitbox?.bottom ?? 0) - 194.0)).toBeLessThanOrEqual(
          FLOATING_POINT_TOLERANCE,
        );
        expect(result.lethalHitbox?.left).toBe(120);
        expect(result.lethalHitbox?.right).toBe(184);
      }

      // Concrete assertions across individual schedules confirm exact values:
      expect(results['30hz'].lifecycle?.lockedTarget?.positionY).toBeCloseTo(170.0, 9);
      expect(results['60hz'].lifecycle?.lockedTarget?.positionY).toBeCloseTo(170.0, 9);
      expect(results['90hz'].lifecycle?.lockedTarget?.positionY).toBeCloseTo(170.0, 9);
      expect(results['120hz'].lifecycle?.lockedTarget?.positionY).toBeCloseTo(170.0, 9);
      expect(results['144hz'].lifecycle?.lockedTarget?.positionY).toBeCloseTo(170.0, 9);
      expect(results.jittered.lifecycle?.lockedTarget?.positionY).toBeCloseTo(170.0, 9);

      expect(results['30hz'].lethalHitbox?.top).toBeCloseTo(146.0, 9);
      expect(results['120hz'].lethalHitbox?.top).toBeCloseTo(146.0, 9);
    });

    it('falls back to pre-step observation when no target resolver is provided', () => {
      const strikeSchedule = scheduleNextPattern({
        catalog: [PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN],
        patternStartDistance: 0,
        state: createRunGenerationState('target-lock-strike-seed-fallback'),
      });

      if (strikeSchedule.status !== 'accepted') {
        throw new Error('Expected PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN to be accepted.');
      }

      const strikeSpawn = strikeSchedule.spawns[0];
      const targetTime = 2.0;

      const runWithoutResolver = (schedule: FrameSchedule) => {
        let simState = createTelegraphedHazardSimulationState();
        let elapsed = 0;
        let stepIndex = 0;
        while (elapsed < targetTime - EPSILON) {
          const nominalDelta = schedule.getNextDelta(elapsed, stepIndex);
          stepIndex += 1;
          const stepDelta = Math.min(nominalDelta, targetTime - elapsed);
          const preStepTarget = {
            positionY: 100 + 50 * elapsed,
            runDistance: 350 * elapsed,
          };
          simState = stepTelegraphedHazardSimulation(
            simState,
            [strikeSpawn],
            stepDelta,
            preStepTarget,
          );
          elapsed += stepDelta;
        }
        return simState;
      };

      const state30 = runWithoutResolver(STANDARD_FRAME_SCHEDULES['30hz']);
      const state120 = runWithoutResolver(STANDARD_FRAME_SCHEDULES['120hz']);
      const lifecycle30 = getTelegraphedHazardLifecycle(state30, strikeSpawn);
      const lifecycle120 = getTelegraphedHazardLifecycle(state120, strikeSpawn);

      // Unadjusted discrete pre-step sampling exhibits frame-rate lag:
      expect(lifecycle30?.lockedTarget?.positionY).toBeCloseTo(168.333, 3);
      expect(lifecycle120?.lockedTarget?.positionY).toBeCloseTo(170.0, 3);
    });
  });

  describe('authority 2: generated hazard stream & PRNG state across schedules', () => {
    it('produces identical PRNG state, pattern sequence, and spawn geometry in contiguous stream across all 6 schedules in sampled scenario', () => {
      const legacyContext: GeneratedHazardStreamContext = Object.freeze({
        catalog: PROTOTYPE_HAZARD_PATTERN_FIXTURES,
        config: PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
      });

      const seed = 'm3-contiguous-stream-seed';
      const totalDuration = 8.5; // reaches distance 2975 logical distance units at 350 px/s
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
        // Distance and simulated time match within floating-point epsilon
        expect(Math.abs(result.distance - baseline.distance)).toBeLessThanOrEqual(
          FLOATING_POINT_TOLERANCE,
        );
        expect(Math.abs(result.elapsed - baseline.elapsed)).toBeLessThanOrEqual(
          FLOATING_POINT_TOLERANCE,
        );

        // PRNG internal state matches identically:
        expect(result.stream.generationState.prngState).toBe(
          baseline.stream.generationState.prngState,
        );

        // Pattern scheduling count and next cursor match within tolerance:
        expect(result.stream.scheduledPatternCount).toBe(baseline.stream.scheduledPatternCount);
        expect(
          Math.abs(
            result.stream.nextPatternStartDistance - baseline.stream.nextPatternStartDistance,
          ),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);

        // Spawns count and individual hazard geometry match:
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

    it('produces identical PRNG state, pattern sequence, and exact spawn/cursor placement across all 6 schedules under policy mode', () => {
      // When recovering from a no-content gap across a policy boundary, selectLiveEncounterCandidates
      // determines the exact deterministic policy boundary selection.nextPolicyBoundaryDistance (here: 2500).
      // The cursor remains anchored to this deterministic policy boundary rather than absorbing incidental
      // frame-sampling overshoot from the crossing frame's windowEnd. When the scheduling window reaches
      // the boundary, the first post-gap pattern is scheduled at exactly distance 2500 (first spawn at 2620)
      // across all 6 schedules.
      const policyContext: GeneratedHazardStreamContext = Object.freeze({
        catalog: PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
        config: PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
        policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
        reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
        constraints: PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      });

      const seed = 'm4-cross-partition-generation-seed';
      const totalDuration = 8.5; // reaches distance 2975 logical distance units
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
      expect(baseline.stream.spawns.length).toBe(4);

      for (const [_name, result] of Object.entries(results)) {
        // Scheduled pattern count is identical in this scenario:
        expect(result.stream.scheduledPatternCount).toBe(baseline.stream.scheduledPatternCount);

        // PRNG internal state matches identically across all schedules:
        expect(result.stream.generationState.prngState).toBe(
          baseline.stream.generationState.prngState,
        );

        // Scheduled pattern types and exact spawn geometry match across all schedules:
        expect(result.stream.spawns.length).toBe(baseline.stream.spawns.length);
        for (let i = 0; i < baseline.stream.spawns.length; i++) {
          const actualSpawn = result.stream.spawns[i];
          const expectedSpawn = baseline.stream.spawns[i];
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

        // nextPatternStartDistance matches identically within floating-point tolerance:
        expect(
          Math.abs(
            result.stream.nextPatternStartDistance - baseline.stream.nextPatternStartDistance,
          ),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
      }

      // Concrete observed placement values demonstrating exact deterministic anchoring:
      // Pattern 1 (prototype-timed-pulse) start distance = 2500, hitbox left = 120 -> runDistance = 2620.0
      expect(results['30hz'].stream.spawns[0].runDistance).toBeCloseTo(2620.0, 9);
      expect(results['60hz'].stream.spawns[0].runDistance).toBeCloseTo(2620.0, 9);
      expect(results['90hz'].stream.spawns[0].runDistance).toBeCloseTo(2620.0, 9);
      expect(results['120hz'].stream.spawns[0].runDistance).toBeCloseTo(2620.0, 9);
      expect(results['144hz'].stream.spawns[0].runDistance).toBeCloseTo(2620.0, 9);
      expect(results.jittered.stream.spawns[0].runDistance).toBeCloseTo(2620.0, 9);

      // nextPatternStartDistance is exactly 3800.0 across all schedules:
      expect(results['30hz'].stream.nextPatternStartDistance).toBeCloseTo(3800.0, 9);
      expect(results['60hz'].stream.nextPatternStartDistance).toBeCloseTo(3800.0, 9);
      expect(results['90hz'].stream.nextPatternStartDistance).toBeCloseTo(3800.0, 9);
      expect(results['120hz'].stream.nextPatternStartDistance).toBeCloseTo(3800.0, 9);
      expect(results['144hz'].stream.nextPatternStartDistance).toBeCloseTo(3800.0, 9);
      expect(results.jittered.stream.nextPatternStartDistance).toBeCloseTo(3800.0, 9);
    });
  });

  describe('authority 3: integrated difficulty and pacing snapshots across schedules', () => {
    it('maintains identical difficulty tier and pacing phase snapshots in the live stream across all 6 schedules', () => {
      const context: GeneratedHazardStreamContext = Object.freeze({
        catalog: PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
        config: PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
        policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
        reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
        constraints: PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      });

      const totalDuration = 7.5; // reaches distance 2625 logical distance units, crossing into difficulty tier 1 at 2500 logical distance units
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
    it('safely passes through a timed hazard spatial volume during warning phase with exact input splitting across all schedules', () => {
      // Place PROTOTYPE_TIMED_PULSE_PATTERN at start distance 0.
      // Pulse hitbox: left: 120, right: 184, top: 155, bottom: 219.
      // Warning duration: 1.60s. Active window: [1.85s, 2.75s].
      // Player starts at y = 195, speed = 350 px/s.
      // Player scripts thrust from t = 0.10s to 0.35s, with frames split at exact transition times.
      // Because the hazard is in WARNING phase, no collision occurs across any schedule.
      const scheduleResult = scheduleNextPattern({
        catalog: [PROTOTYPE_TIMED_PULSE_PATTERN],
        patternStartDistance: 0,
        state: createRunGenerationState('timed-encounter-input-seed'),
      });

      if (scheduleResult.status !== 'accepted') {
        throw new Error('Expected PROTOTYPE_TIMED_PULSE_PATTERN to be accepted.');
      }

      const totalDuration = 0.8;
      const inputScript: ReadonlyArray<ScriptedInputTransition> = [
        { thrustHeld: true, time: 0.1 },
        { thrustHeld: false, time: 0.35 },
      ];

      const results = Object.fromEntries(
        SCHEDULE_ENTRIES.map(([name, schedule]) => [
          name,
          runScriptedTelegraphedSimulation({
            flightBounds: FLIGHT_BOUNDS,
            initialRunState: createPrototypeRunState(FLIGHT_BOUNDS),
            inputScript,
            schedule,
            telegraphedSpawns: scheduleResult.spawns,
            totalDuration,
          }),
        ]),
      );

      const baseline = results['60hz'];
      expect(baseline.finalRunState.phase).toBe('running');
      expect(baseline.deathRecordedAtTime).toBeNull();

      for (const [_name, result] of Object.entries(results)) {
        expect(result.finalRunState.phase).toBe('running');
        expect(result.deathRecordedAtTime).toBeNull();
        expect(result.deathRecordedAtDistance).toBeNull();

        // Exact trajectory assertions (distance, positionY, velocityY):
        expect(
          Math.abs(result.finalRunState.motion.distance - baseline.finalRunState.motion.distance),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs(result.finalRunState.flight.positionY - baseline.finalRunState.flight.positionY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
        expect(
          Math.abs(result.finalRunState.flight.velocityY - baseline.finalRunState.flight.velocityY),
        ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
      }
    });

    it('detects collision consistently across all schedules when player climbs into an active pulse with exact input splitting', () => {
      // Place pulse pattern at distance 550, so hitbox is [550 + 120, 550 + 184] = [670, 734].
      // Pulse active window is [1.85s, 2.75s].
      // At speed 350 px/s, player reaches [670, 734] at t in [1.863s, 2.149s].
      // Player scripts thrust from 1.50s to 2.05s, entering spatial and temporal intersection
      // with the active lethal pulse.
      const scheduleResult = scheduleNextPattern({
        catalog: [PROTOTYPE_TIMED_PULSE_PATTERN],
        patternStartDistance: 550,
        state: createRunGenerationState('active-pulse-collision-seed'),
      });

      if (scheduleResult.status !== 'accepted') {
        throw new Error('Expected PROTOTYPE_TIMED_PULSE_PATTERN to be accepted.');
      }

      const totalDuration = 2.3;
      const inputScript: ReadonlyArray<ScriptedInputTransition> = [
        { thrustHeld: true, time: 1.5 },
        { thrustHeld: false, time: 2.05 },
      ];

      const results = Object.fromEntries(
        SCHEDULE_ENTRIES.map(([name, schedule]) => [
          name,
          runScriptedTelegraphedSimulation({
            flightBounds: FLIGHT_BOUNDS,
            initialRunState: createPrototypeRunState(FLIGHT_BOUNDS),
            inputScript,
            schedule,
            telegraphedSpawns: scheduleResult.spawns,
            totalDuration,
          }),
        ]),
      );

      // All schedules detect collision during the active window:
      for (const [_name, result] of Object.entries(results)) {
        expect(result.finalRunState.phase).toBe('dead');
        expect(result.deathRecordedAtTime).not.toBeNull();
        if (result.deathRecordedAtTime !== null) {
          expect(result.deathRecordedAtTime).toBeGreaterThanOrEqual(1.85);
          expect(result.deathRecordedAtTime).toBeLessThanOrEqual(2.15);
        }
      }

      // Concrete death recorded times:
      expect(results['30hz'].deathRecordedAtTime).toBeCloseTo(2.05, 3);
      expect(results['60hz'].deathRecordedAtTime).toBeCloseTo(2.05, 3);
      expect(results['90hz'].deathRecordedAtTime).toBeCloseTo(2.05, 3);
      expect(results['120hz'].deathRecordedAtTime).toBeCloseTo(2.05, 3);
      expect(results['144hz'].deathRecordedAtTime).toBeCloseTo(2.0486, 3);
      expect(results.jittered.deathRecordedAtTime).toBeCloseTo(2.05, 3);
    });
  });
});
