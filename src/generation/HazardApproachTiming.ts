import { assertValidBaseScrollSpeed, type RunMotionValues } from '../config/RunMotionConfig';

export interface HazardReactionTimeConstraint {
  readonly minimumReactionTimeSeconds: number;
}

/** PROTOTYPE starting value only; M4 playtesting may tune it through focused work. */
export const PROTOTYPE_HAZARD_REACTION_TIME_CONSTRAINT: Readonly<HazardReactionTimeConstraint> =
  Object.freeze({
    minimumReactionTimeSeconds: 2,
  });

export interface HazardReactionWindow extends HazardReactionTimeConstraint {
  readonly minimumReactionDistance: number;
  readonly scrollSpeed: number;
}

export interface HazardApproachTiming extends HazardReactionWindow {
  readonly distanceToImpact: number;
  readonly meetsMinimumReactionTime: boolean;
  readonly observedAtRunDistance: number;
  readonly targetRunDistance: number;
  /** `null` means the world is stationary, so no finite impact time is advancing. */
  readonly timeToImpactSeconds: number | null;
}

const assertValidReactionTime = (minimumReactionTimeSeconds: number): void => {
  if (!Number.isFinite(minimumReactionTimeSeconds) || minimumReactionTimeSeconds <= 0) {
    throw new RangeError('minimumReactionTimeSeconds must be a positive finite number.');
  }
};

const assertValidRunDistance = (runDistance: number, name: string): void => {
  if (!Number.isFinite(runDistance) || runDistance < 0) {
    throw new RangeError(`${name} must be a non-negative finite number.`);
  }
};

/** Converts the typed reaction-time constraint into logical run-distance. */
export const createHazardReactionWindow = (
  runMotion: Readonly<RunMotionValues>,
  constraint: Readonly<HazardReactionTimeConstraint> = PROTOTYPE_HAZARD_REACTION_TIME_CONSTRAINT,
): Readonly<HazardReactionWindow> => {
  assertValidBaseScrollSpeed(runMotion.baseScrollSpeed);
  assertValidReactionTime(constraint.minimumReactionTimeSeconds);

  const minimumReactionDistance = runMotion.baseScrollSpeed * constraint.minimumReactionTimeSeconds;

  if (!Number.isFinite(minimumReactionDistance)) {
    throw new RangeError('Calculated minimum reaction distance must remain finite.');
  }

  return Object.freeze({
    minimumReactionDistance,
    minimumReactionTimeSeconds: constraint.minimumReactionTimeSeconds,
    scrollSpeed: runMotion.baseScrollSpeed,
  });
};

/**
 * Produces viewport-independent timing data for one logical impact target.
 *
 * Callers can re-evaluate an immutable scheduled target with the current run distance and speed.
 * This makes a later speed increase observable without moving an already-scheduled hazard.
 */
export const evaluateHazardApproachTiming = (
  targetRunDistance: number,
  observedAtRunDistance: number,
  reactionWindow: Readonly<HazardReactionWindow>,
): Readonly<HazardApproachTiming> => {
  assertValidRunDistance(targetRunDistance, 'targetRunDistance');
  assertValidRunDistance(observedAtRunDistance, 'observedAtRunDistance');
  const validatedWindow = createHazardReactionWindow(
    { baseScrollSpeed: reactionWindow.scrollSpeed },
    { minimumReactionTimeSeconds: reactionWindow.minimumReactionTimeSeconds },
  );

  if (reactionWindow.minimumReactionDistance !== validatedWindow.minimumReactionDistance) {
    throw new RangeError('reactionWindow minimum distance must match its speed and time values.');
  }

  const distanceToImpact = Math.max(0, targetRunDistance - observedAtRunDistance);
  const timeToImpactSeconds =
    validatedWindow.scrollSpeed === 0 ? null : distanceToImpact / validatedWindow.scrollSpeed;

  if (timeToImpactSeconds !== null && !Number.isFinite(timeToImpactSeconds)) {
    throw new RangeError('Calculated time to impact must remain finite.');
  }

  const meetsMinimumReactionTime =
    timeToImpactSeconds === null ||
    timeToImpactSeconds >= validatedWindow.minimumReactionTimeSeconds;

  return Object.freeze({
    ...validatedWindow,
    distanceToImpact,
    meetsMinimumReactionTime,
    observedAtRunDistance,
    targetRunDistance,
    timeToImpactSeconds,
  });
};
