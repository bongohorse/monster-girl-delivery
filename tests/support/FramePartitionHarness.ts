import {
  type FlightTuningValues,
  PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
} from '../../src/config/FlightTuningConfig';
import {
  PROTOTYPE_RUN_MOTION_DEFAULTS,
  type RunMotionValues,
} from '../../src/config/RunMotionConfig';
import type { LogicalCollectibleSpawnInstance } from '../../src/generation/GeneratedCollectibles';
import type { LogicalHazard } from '../../src/systems/HazardCollision';
import { type PrototypeRunState, stepPrototypeRun } from '../../src/systems/PrototypeRunSimulation';
import type { VerticalFlightBounds } from '../../src/systems/VerticalFlightSimulation';

export interface FrameSchedule {
  readonly getNextDelta: (elapsedSeconds: number, stepIndex: number) => number;
  readonly name: string;
}

export const createFixedRateSchedule = (name: string, fps: number): FrameSchedule => {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError(`Frame rate fps must be a positive finite number, received ${fps}`);
  }
  return {
    name,
    getNextDelta: () => 1 / fps,
  };
};

export const createJitteredSchedule = (
  name: string,
  deltas: ReadonlyArray<number>,
): FrameSchedule => {
  if (deltas.length === 0) {
    throw new RangeError('Jittered schedule must contain at least one delta.');
  }
  for (const delta of deltas) {
    if (!Number.isFinite(delta) || delta <= 0) {
      throw new RangeError(`Jittered deltas must be positive finite numbers, received ${delta}`);
    }
  }
  return {
    name,
    getNextDelta: (_elapsed, stepIndex) => deltas[stepIndex % deltas.length],
  };
};

/** Deterministic sequence of varying frame deltas within normal simulation delta limits (<0.05s). */
export const DETERMINISTIC_JITTER_DELTAS: ReadonlyArray<number> = Object.freeze([
  0.011, 0.023, 0.008, 0.031, 0.019, 0.007, 0.025, 0.016,
]);

export const STANDARD_FRAME_SCHEDULES: Readonly<Record<string, FrameSchedule>> = Object.freeze({
  '30hz': createFixedRateSchedule('30hz', 30),
  '60hz': createFixedRateSchedule('60hz', 60),
  '90hz': createFixedRateSchedule('90hz', 90),
  '120hz': createFixedRateSchedule('120hz', 120),
  '144hz': createFixedRateSchedule('144hz', 144),
  jittered: createJitteredSchedule('jittered', DETERMINISTIC_JITTER_DELTAS),
});

export interface ScriptedInputTransition {
  /** The exact simulation time in seconds when this transition takes effect. */
  readonly thrustHeld: boolean;
  readonly time: number;
}

export interface PartitionedSimulationOptions {
  readonly collectibles?: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>>;
  readonly flightBounds: Readonly<VerticalFlightBounds>;
  readonly flightTuning?: Readonly<FlightTuningValues>;
  readonly hazards?: ReadonlyArray<Readonly<LogicalHazard>>;
  readonly initialThrustHeld?: boolean;
  readonly initialState: Readonly<PrototypeRunState>;
  readonly inputScript?: ReadonlyArray<ScriptedInputTransition>;
  readonly runMotionTuning?: Readonly<RunMotionValues>;
  readonly schedule: FrameSchedule;
  readonly totalDuration: number;
}

export interface PartitionedSimulationResult {
  readonly deathRecordedAtDistance: number | null;
  readonly deathRecordedAtTime: number | null;
  readonly finalState: Readonly<PrototypeRunState>;
  readonly totalSimulatedTime: number;
}

const EPSILON = 1e-12;

export const runPartitionedSimulation = (
  options: PartitionedSimulationOptions,
): PartitionedSimulationResult => {
  const {
    initialState,
    totalDuration,
    schedule,
    flightBounds,
    collectibles = [],
    flightTuning = PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
    runMotionTuning = PROTOTYPE_RUN_MOTION_DEFAULTS,
    hazards = [],
    initialThrustHeld = false,
    inputScript = [],
  } = options;

  if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
    throw new RangeError(
      `totalDuration must be a positive finite number, received ${totalDuration}`,
    );
  }

  const sortedScript = [...inputScript].sort((a, b) => a.time - b.time);
  for (const transition of sortedScript) {
    if (!Number.isFinite(transition.time) || transition.time < 0) {
      throw new RangeError(
        `Input transition time must be a non-negative finite number, received ${transition.time}`,
      );
    }
  }

  let state = initialState;
  let currentSimulatedTime = 0;
  let currentThrustHeld = initialThrustHeld;
  let scriptIndex = 0;
  let logicalFrames = 0;
  let deathRecordedAtTime: number | null = state.phase === 'dead' ? 0 : null;
  let deathRecordedAtDistance: number | null =
    state.phase === 'dead' ? state.motion.distance : null;

  // Apply any transitions scheduled at t=0 prior to first simulation step
  while (scriptIndex < sortedScript.length && sortedScript[scriptIndex].time <= EPSILON) {
    currentThrustHeld = sortedScript[scriptIndex].thrustHeld;
    scriptIndex += 1;
  }

  while (currentSimulatedTime < totalDuration - EPSILON) {
    const nominalDelta = schedule.getNextDelta(currentSimulatedTime, logicalFrames);
    if (!Number.isFinite(nominalDelta) || nominalDelta <= 0) {
      throw new RangeError(
        `Schedule ${schedule.name} returned a non-positive delta: ${nominalDelta}`,
      );
    }
    logicalFrames += 1;

    // Clamp the logical frame end time to totalDuration so total simulated time is exact
    const isFinalFrame = currentSimulatedTime + nominalDelta >= totalDuration - EPSILON;
    const frameEndTime = isFinalFrame ? totalDuration : currentSimulatedTime + nominalDelta;

    while (currentSimulatedTime < frameEndTime - EPSILON) {
      // Check if next input transition falls strictly within (currentSimulatedTime, frameEndTime)
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
        const stepResult = stepPrototypeRun(state, stepDelta, {
          collectibles,
          flightBounds,
          flightTuning,
          hazards,
          runMotionTuning,
          thrustHeld: currentThrustHeld,
        });

        state = stepResult.state;
        currentSimulatedTime = nextTargetTime;

        if (stepResult.enteredDead && deathRecordedAtTime === null) {
          deathRecordedAtTime = currentSimulatedTime;
          deathRecordedAtDistance = state.motion.distance;
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

    // Check if an input transition lands exactly on frameEndTime
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
    finalState: state,
    totalSimulatedTime: totalDuration,
  };
};
