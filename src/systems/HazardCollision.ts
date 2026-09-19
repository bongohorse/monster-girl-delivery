import type { RunMotionValues } from '../config/RunMotionConfig';
import {
  isBehavioralLogicalHazard,
  resolveHazardHitboxAtRunDistance,
  resolveVerticalPatrolOffsetAtRunDistance,
} from '../hazards/HazardArchetype';
import {
  createPrototypeZapperGeometryScratch,
  doesHitboxOverlapPrototypeZapper,
  doesHitboxOverlapPrototypeZapperWithCanonicalPadding,
  isPrototypeZapperHazard,
  PROTOTYPE_ZAPPER_GRAZE_PADDING,
  PROTOTYPE_ZAPPER_LETHAL_PADDING,
  type PrototypeZapperGeometryPadding,
  resolvePrototypeZapperGeometry,
  resolvePrototypeZapperGeometryInto,
} from '../hazards/PrototypeZapperHazard';
import type { RunMotionState } from './RunMotionSimulation';
import type {
  VerticalFlightState,
  VerticalFlightTrajectory,
  VerticalFlightTrajectorySegment,
} from './VerticalFlightSimulation';

export interface LogicalHitbox {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface LogicalHazard {
  /** Lethal portion of the current simulation step; omitted means the whole step. */
  collisionInterval?: Readonly<LogicalHazardCollisionInterval>;
  /** True only when this interval ends the occurrence's final Active phase, not just the frame. */
  collisionEndsAtIntervalEnd?: boolean;
  /** Optional world-space horizontal velocity for hazards that move independently of run scroll. */
  horizontalVelocity?: number;
  hitbox: Readonly<LogicalHitbox>;
}

export interface LogicalHazardCollisionInterval {
  readonly endSeconds: number;
  readonly startSeconds: number;
}

export interface PrototypePlayerCollisionExtents {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

/**
 * Optional additive diagnostics for work actually performed by the authoritative Zapper collision
 * path. Gameplay never reads these values; Director/performance tooling may supply one collector.
 */
export interface PrototypeZapperCollisionWorkCounters {
  broadphaseRejectedCallCount: number;
  candidateSampleCount: number;
  collisionCallCount: number;
  evaluatedSampleCount: number;
  geometryResolutionCount: number;
  primaryNarrowphaseCheckCount: number;
  secondaryNarrowphaseCheckCount: number;
}

export const createPrototypeZapperCollisionWorkCounters =
  (): PrototypeZapperCollisionWorkCounters => ({
    broadphaseRejectedCallCount: 0,
    candidateSampleCount: 0,
    collisionCallCount: 0,
    evaluatedSampleCount: 0,
    geometryResolutionCount: 0,
    primaryNarrowphaseCheckCount: 0,
    secondaryNarrowphaseCheckCount: 0,
  });

export const resetPrototypeZapperCollisionWorkCounters = (
  counters: PrototypeZapperCollisionWorkCounters,
): void => {
  counters.broadphaseRejectedCallCount = 0;
  counters.candidateSampleCount = 0;
  counters.collisionCallCount = 0;
  counters.evaluatedSampleCount = 0;
  counters.geometryResolutionCount = 0;
  counters.primaryNarrowphaseCheckCount = 0;
  counters.secondaryNarrowphaseCheckCount = 0;
};

/**
 * Temporary M2 collision footprint around the player's logical position. Callers may supply tuned
 * extents later without coupling the rule to a sprite or Phaser body.
 */
export const PROTOTYPE_PLAYER_COLLISION_EXTENTS: Readonly<PrototypePlayerCollisionExtents> =
  Object.freeze({
    left: 18,
    right: 18,
    top: 24,
    bottom: 24,
  });

export const assertValidPlayerCollisionExtents = (
  extents: Readonly<PrototypePlayerCollisionExtents>,
): void => {
  if (
    !Number.isFinite(extents.left) ||
    extents.left < 0 ||
    !Number.isFinite(extents.right) ||
    extents.right < 0 ||
    !Number.isFinite(extents.top) ||
    extents.top < 0 ||
    !Number.isFinite(extents.bottom) ||
    extents.bottom < 0
  ) {
    throw new RangeError('Player collision extents must be finite and non-negative.');
  }
};

/** Creates the player's world-space logical hitbox from deterministic run and flight state. */
export const createPrototypePlayerHitbox = (
  runState: Readonly<RunMotionState>,
  flightState: Readonly<VerticalFlightState>,
  extents: Readonly<PrototypePlayerCollisionExtents> = PROTOTYPE_PLAYER_COLLISION_EXTENTS,
): LogicalHitbox => {
  if (!Number.isFinite(runState.distance) || !Number.isFinite(flightState.positionY)) {
    throw new RangeError('Player run distance and vertical position must be finite.');
  }
  assertValidPlayerCollisionExtents(extents);

  return {
    left: runState.distance - extents.left,
    right: runState.distance + extents.right,
    top: flightState.positionY - extents.top,
    bottom: flightState.positionY + extents.bottom,
  };
};

/**
 * Pure positive-area AABB overlap. Hitboxes that only share an edge do not overlap, keeping the
 * collision boundary explicit and stable across renderers.
 */
export const doLogicalHitboxesOverlap = (
  first: Readonly<LogicalHitbox>,
  second: Readonly<LogicalHitbox>,
): boolean =>
  first.left < second.right &&
  first.right > second.left &&
  first.top < second.bottom &&
  first.bottom > second.top;

/** Tests the current logical player state against one hazard without consulting presentation. */
export const isPlayerCollidingWithHazard = (
  runState: Readonly<RunMotionState>,
  flightState: Readonly<VerticalFlightState>,
  hazard: Readonly<LogicalHazard>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents> = PROTOTYPE_PLAYER_COLLISION_EXTENTS,
): boolean => {
  const playerHitbox = createPrototypePlayerHitbox(runState, flightState, playerExtents);
  const zapperGeometry = resolvePrototypeZapperGeometry(hazard, runState.simulationSeconds ?? 0);
  return zapperGeometry
    ? doesHitboxOverlapPrototypeZapper(playerHitbox, zapperGeometry)
    : doLogicalHitboxesOverlap(playerHitbox, hazard.hitbox);
};

const evaluateFlightSegmentPosition = (
  segment: Readonly<VerticalFlightTrajectorySegment>,
  elapsedSeconds: number,
): number => {
  const localSeconds = elapsedSeconds - segment.startSeconds;
  return (
    segment.positionY +
    segment.velocityY * localSeconds +
    0.5 * segment.accelerationY * localSeconds * localSeconds
  );
};

const evaluateFlightTrajectoryPosition = (
  trajectory: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
): number => {
  const segment =
    trajectory.segments.find(
      (candidate) =>
        elapsedSeconds >= candidate.startSeconds && elapsedSeconds <= candidate.endSeconds,
    ) ?? trajectory.segments[trajectory.segments.length - 1];
  if (!segment) {
    return trajectory.finalState.positionY;
  }
  return evaluateFlightSegmentPosition(segment, elapsedSeconds);
};

const getCollisionTimeRange = (
  hazard: Readonly<LogicalHazard>,
  elapsedSeconds: number,
): Readonly<LogicalHazardCollisionInterval> | null => {
  const interval = hazard.collisionInterval ?? { startSeconds: 0, endSeconds: elapsedSeconds };
  if (
    !Number.isFinite(interval.startSeconds) ||
    !Number.isFinite(interval.endSeconds) ||
    interval.startSeconds < 0 ||
    interval.endSeconds < interval.startSeconds ||
    interval.endSeconds > elapsedSeconds
  ) {
    throw new RangeError('Hazard collision interval must fall within the current simulation step.');
  }
  return interval.endSeconds > interval.startSeconds ? interval : null;
};

const getHorizontalOverlapRange = (
  initialDistance: number,
  scrollSpeed: number,
  hazard: Readonly<LogicalHazard>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents>,
  interval: Readonly<LogicalHazardCollisionInterval>,
  hazardHorizontalPadding = 0,
  hazardHorizontalVelocity = hazard.horizontalVelocity ?? 0,
): Readonly<LogicalHazardCollisionInterval> | null => {
  const hazardVelocity = hazardHorizontalVelocity;
  if (!Number.isFinite(hazardVelocity)) {
    throw new RangeError('Hazard horizontalVelocity must be finite when provided.');
  }
  if (!Number.isFinite(hazardHorizontalPadding) || hazardHorizontalPadding < 0) {
    throw new RangeError('Hazard horizontal broadphase padding must be finite and non-negative.');
  }
  const relativeScrollSpeed = scrollSpeed - hazardVelocity;
  const minimumPlayerDistance = hazard.hitbox.left - hazardHorizontalPadding - playerExtents.right;
  const maximumPlayerDistance = hazard.hitbox.right + hazardHorizontalPadding + playerExtents.left;

  if (relativeScrollSpeed === 0) {
    return initialDistance > minimumPlayerDistance && initialDistance < maximumPlayerDistance
      ? interval
      : null;
  }

  const firstCrossing = (minimumPlayerDistance - initialDistance) / relativeScrollSpeed;
  const secondCrossing = (maximumPlayerDistance - initialDistance) / relativeScrollSpeed;
  const startSeconds = Math.max(interval.startSeconds, Math.min(firstCrossing, secondCrossing));
  const endSeconds = Math.min(interval.endSeconds, Math.max(firstCrossing, secondCrossing));
  return endSeconds > startSeconds ? { startSeconds, endSeconds } : null;
};

const addCandidate = (
  candidates: number[],
  candidate: number,
  startSeconds: number,
  endSeconds: number,
): void => {
  if (candidate >= startSeconds && candidate <= endSeconds) {
    candidates.push(candidate);
  }
};

/**
 * Adds the constant-sized set that contains the extrema of a quadratic sampled at one family of
 * vertical-patrol turns. First/last turns cover monotone extrema; the two integers nearest the
 * quadratic vertex cover an interior extremum, regardless of how many patrol cycles elapsed.
 */
const addPatrolTurnCandidates = (
  candidates: number[],
  segment: Readonly<VerticalFlightTrajectorySegment>,
  startSeconds: number,
  endSeconds: number,
  rawCycleAtZero: number,
  cyclesPerSecond: number,
  turnOffset: 0 | 0.5,
): void => {
  const firstIndex = Math.ceil(rawCycleAtZero + cyclesPerSecond * startSeconds - turnOffset);
  const lastIndex = Math.floor(rawCycleAtZero + cyclesPerSecond * endSeconds - turnOffset);
  if (firstIndex > lastIndex) {
    return;
  }

  const addIndex = (index: number): void => {
    const boundedIndex = Math.min(lastIndex, Math.max(firstIndex, index));
    addCandidate(
      candidates,
      (boundedIndex + turnOffset - rawCycleAtZero) / cyclesPerSecond,
      startSeconds,
      endSeconds,
    );
  };

  addIndex(firstIndex);
  addIndex(lastIndex);
  if (segment.accelerationY !== 0) {
    const vertexSeconds = segment.startSeconds - segment.velocityY / segment.accelerationY;
    const vertexIndex = rawCycleAtZero + cyclesPerSecond * vertexSeconds - turnOffset;
    addIndex(Math.floor(vertexIndex));
    addIndex(Math.ceil(vertexIndex));
  }
};

const getRelativeVerticalRange = (
  trajectory: Readonly<VerticalFlightTrajectory>,
  initialDistance: number,
  scrollSpeed: number,
  hazard: Readonly<LogicalHazard>,
  interval: Readonly<LogicalHazardCollisionInterval>,
): Readonly<{ maximum: number; minimum: number }> => {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  const isVerticalPatrol =
    isBehavioralLogicalHazard(hazard) && hazard.behavior.kind === 'vertical-patrol';
  const cyclesPerSecond = isVerticalPatrol ? scrollSpeed / hazard.behavior.cycleDistance : 0;
  const rawCycleAtZero = isVerticalPatrol
    ? (initialDistance - hazard.runDistance) / hazard.behavior.cycleDistance +
      hazard.behavior.phaseOffset
    : 0;
  const patrolSpeed = isVerticalPatrol
    ? (4 * hazard.behavior.amplitudeY * scrollSpeed) / hazard.behavior.cycleDistance
    : 0;

  for (const segment of trajectory.segments) {
    const startSeconds = Math.max(interval.startSeconds, segment.startSeconds);
    const endSeconds = Math.min(interval.endSeconds, segment.endSeconds);
    if (endSeconds < startSeconds) {
      continue;
    }

    const candidates = [startSeconds, endSeconds];
    if (!isVerticalPatrol || cyclesPerSecond === 0) {
      if (segment.accelerationY !== 0) {
        addCandidate(
          candidates,
          segment.startSeconds - segment.velocityY / segment.accelerationY,
          startSeconds,
          endSeconds,
        );
      }
    } else if (cyclesPerSecond !== 0) {
      for (const hazardVelocity of [patrolSpeed, -patrolSpeed]) {
        if (segment.accelerationY === 0) {
          continue;
        }
        const criticalSeconds =
          segment.startSeconds + (hazardVelocity - segment.velocityY) / segment.accelerationY;
        if (criticalSeconds < startSeconds || criticalSeconds > endSeconds) {
          continue;
        }
        const cycleProgress = (((rawCycleAtZero + cyclesPerSecond * criticalSeconds) % 1) + 1) % 1;
        const actualHazardVelocity = cycleProgress < 0.5 ? patrolSpeed : -patrolSpeed;
        if (actualHazardVelocity === hazardVelocity) {
          candidates.push(criticalSeconds);
        }
      }
      addPatrolTurnCandidates(
        candidates,
        segment,
        startSeconds,
        endSeconds,
        rawCycleAtZero,
        cyclesPerSecond,
        0,
      );
      addPatrolTurnCandidates(
        candidates,
        segment,
        startSeconds,
        endSeconds,
        rawCycleAtZero,
        cyclesPerSecond,
        0.5,
      );
    }

    for (const candidate of candidates) {
      const playerPositionY = evaluateFlightSegmentPosition(segment, candidate);
      const hazardOffsetY = isVerticalPatrol
        ? resolveVerticalPatrolOffsetAtRunDistance(
            hazard,
            initialDistance + scrollSpeed * candidate,
          )
        : 0;
      const relativePositionY = playerPositionY - hazardOffsetY;
      minimum = Math.min(minimum, relativePositionY);
      maximum = Math.max(maximum, relativePositionY);
    }
  }

  return { maximum, minimum };
};

const canFlightTrajectoryOverlapVerticalRange = (
  trajectory: Readonly<VerticalFlightTrajectory>,
  interval: Readonly<LogicalHazardCollisionInterval>,
  minimumCenterY: number,
  maximumCenterY: number,
): boolean => {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  let foundSegment = false;

  for (const segment of trajectory.segments) {
    const startSeconds = Math.max(interval.startSeconds, segment.startSeconds);
    const endSeconds = Math.min(interval.endSeconds, segment.endSeconds);
    if (endSeconds < startSeconds) {
      continue;
    }

    const startPositionY = evaluateFlightSegmentPosition(segment, startSeconds);
    const endPositionY = evaluateFlightSegmentPosition(segment, endSeconds);
    if (!Number.isFinite(startPositionY) || !Number.isFinite(endPositionY)) {
      return true;
    }
    foundSegment = true;
    minimum = Math.min(minimum, startPositionY, endPositionY);
    maximum = Math.max(maximum, startPositionY, endPositionY);

    if (segment.accelerationY !== 0) {
      const vertexSeconds = segment.startSeconds - segment.velocityY / segment.accelerationY;
      if (vertexSeconds > startSeconds && vertexSeconds < endSeconds) {
        const vertexPositionY = evaluateFlightSegmentPosition(segment, vertexSeconds);
        if (!Number.isFinite(vertexPositionY)) {
          return true;
        }
        minimum = Math.min(minimum, vertexPositionY);
        maximum = Math.max(maximum, vertexPositionY);
      }
    }
  }

  if (!foundSegment) {
    return true;
  }
  return maximum > minimumCenterY && minimum < maximumCenterY;
};

const evaluateStaticZapperOneAxisSweep = (
  initialRunState: Readonly<RunMotionState>,
  trajectory: Readonly<VerticalFlightTrajectory>,
  runMotionTuning: Readonly<RunMotionValues>,
  hazard: Readonly<LogicalHazard>,
  interval: Readonly<LogicalHazardCollisionInterval>,
  primaryPadding: Readonly<PrototypeZapperGeometryPadding>,
  secondaryPadding: Readonly<PrototypeZapperGeometryPadding> | undefined,
  workCounters: PrototypeZapperCollisionWorkCounters | undefined,
): Readonly<PrototypeZapperPaddingPairContacts> | null => {
  if (!isPrototypeZapperHazard(hazard) || hazard.behavior.rotation !== undefined) {
    return null;
  }

  let minimumPositionY = Number.POSITIVE_INFINITY;
  let maximumPositionY = Number.NEGATIVE_INFINITY;
  let coveredUntilSeconds = interval.startSeconds;
  let previousEndPositionY: number | undefined;
  let foundSegment = false;

  for (const segment of trajectory.segments) {
    const startSeconds = Math.max(interval.startSeconds, segment.startSeconds);
    const endSeconds = Math.min(interval.endSeconds, segment.endSeconds);
    if (endSeconds < startSeconds) {
      continue;
    }

    if (foundSegment && startSeconds !== coveredUntilSeconds) {
      return null;
    }
    if (!foundSegment && startSeconds !== interval.startSeconds) {
      return null;
    }

    const startPositionY = evaluateFlightSegmentPosition(segment, startSeconds);
    const endPositionY = evaluateFlightSegmentPosition(segment, endSeconds);
    if (!Number.isFinite(startPositionY) || !Number.isFinite(endPositionY)) {
      return null;
    }
    if (previousEndPositionY !== undefined && startPositionY !== previousEndPositionY) {
      return null;
    }

    foundSegment = true;
    minimumPositionY = Math.min(minimumPositionY, startPositionY, endPositionY);
    maximumPositionY = Math.max(maximumPositionY, startPositionY, endPositionY);

    if (segment.accelerationY !== 0) {
      const vertexSeconds = segment.startSeconds - segment.velocityY / segment.accelerationY;
      if (vertexSeconds > startSeconds && vertexSeconds < endSeconds) {
        const vertexPositionY = evaluateFlightSegmentPosition(segment, vertexSeconds);
        if (!Number.isFinite(vertexPositionY)) {
          return null;
        }
        minimumPositionY = Math.min(minimumPositionY, vertexPositionY);
        maximumPositionY = Math.max(maximumPositionY, vertexPositionY);
      }
    }

    coveredUntilSeconds = endSeconds;
    previousEndPositionY = endPositionY;
    if (coveredUntilSeconds === interval.endSeconds) {
      break;
    }
  }

  if (!foundSegment || coveredUntilSeconds !== interval.endSeconds) {
    return null;
  }

  const scrollSpeed = runMotionTuning.baseScrollSpeed;
  const verticalOnly = scrollSpeed === 0;
  const horizontalOnly = minimumPositionY === maximumPositionY;
  if (!verticalOnly && !horizontalOnly) {
    return null;
  }

  const startDistance = initialRunState.distance + scrollSpeed * interval.startSeconds;
  const endDistance = initialRunState.distance + scrollSpeed * interval.endSeconds;
  if (!Number.isFinite(startDistance) || !Number.isFinite(endDistance)) {
    return null;
  }

  const sweptPlayerHitbox: LogicalHitbox = {
    bottom: maximumPositionY + PROTOTYPE_PLAYER_COLLISION_EXTENTS.bottom,
    left: Math.min(startDistance, endDistance) - PROTOTYPE_PLAYER_COLLISION_EXTENTS.left,
    right: Math.max(startDistance, endDistance) + PROTOTYPE_PLAYER_COLLISION_EXTENTS.right,
    top: minimumPositionY - PROTOTYPE_PLAYER_COLLISION_EXTENTS.top,
  };
  const geometry = resolvePrototypeZapperGeometry(hazard, initialRunState.simulationSeconds ?? 0);
  if (!geometry) {
    return null;
  }

  if (workCounters) {
    workCounters.geometryResolutionCount += 1;
    workCounters.primaryNarrowphaseCheckCount += 1;
  }
  if (
    doesHitboxOverlapPrototypeZapperOnValidatedPath(sweptPlayerHitbox, geometry, primaryPadding)
  ) {
    return PROTOTYPE_ZAPPER_PRIMARY_CONTACT;
  }

  if (secondaryPadding) {
    if (workCounters) {
      workCounters.secondaryNarrowphaseCheckCount += 1;
    }
    if (
      doesHitboxOverlapPrototypeZapperOnValidatedPath(sweptPlayerHitbox, geometry, secondaryPadding)
    ) {
      return PROTOTYPE_ZAPPER_SECONDARY_ONLY_CONTACT;
    }
  }

  return NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
};

const ZAPPER_MAX_COLLISION_SAMPLE_DISTANCE = 0.5;
const ZAPPER_MAX_COLLISION_SAMPLE_SECONDS = 1 / 720;

interface ZapperCollisionSampleCursor {
  readonly eventCandidates: number[];
  readonly initialDistance: number;
  readonly initialSimulationSeconds: number;
  readonly interval: Readonly<LogicalHazardCollisionInterval>;
  readonly scrollSpeed: number;
  distanceIndex: number;
  distanceLastIndex: number;
  distanceStep: number;
  eventIndex: number;
  previousCandidate: number | undefined;
  timeIndex: number;
  readonly timeLastIndex: number;
}

const createZapperCollisionSampleCursor = (
  trajectory: Readonly<VerticalFlightTrajectory>,
  initialDistance: number,
  initialSimulationSeconds: number,
  scrollSpeed: number,
  interval: Readonly<LogicalHazardCollisionInterval>,
): ZapperCollisionSampleCursor => {
  if (!Number.isFinite(initialSimulationSeconds) || initialSimulationSeconds < 0) {
    throw new RangeError('Zapper initial simulation time must be non-negative and finite.');
  }

  // Trajectory events are the only unsorted source and remain a tiny set relative to the dense
  // globally anchored lattices.
  const eventCandidates = [interval.startSeconds, interval.endSeconds];
  for (const segment of trajectory.segments) {
    addCandidate(eventCandidates, segment.startSeconds, interval.startSeconds, interval.endSeconds);
    addCandidate(eventCandidates, segment.endSeconds, interval.startSeconds, interval.endSeconds);
    if (segment.accelerationY !== 0) {
      addCandidate(
        eventCandidates,
        segment.startSeconds - segment.velocityY / segment.accelerationY,
        interval.startSeconds,
        interval.endSeconds,
      );
    }
  }
  eventCandidates.sort((first, second) => first - second);
  let eventUniqueCount = 0;
  for (const candidate of eventCandidates) {
    if (eventUniqueCount === 0 || candidate !== eventCandidates[eventUniqueCount - 1]) {
      eventCandidates[eventUniqueCount] = candidate;
      eventUniqueCount += 1;
    }
  }
  eventCandidates.length = eventUniqueCount;

  let distanceIndex = 0;
  let distanceLastIndex = -1;
  let distanceStep = 1;
  if (scrollSpeed !== 0) {
    const firstDistance = initialDistance + scrollSpeed * interval.startSeconds;
    const lastDistance = initialDistance + scrollSpeed * interval.endSeconds;
    const minimumDistance = Math.min(firstDistance, lastDistance);
    const maximumDistance = Math.max(firstDistance, lastDistance);
    const firstIndex = Math.ceil(minimumDistance / ZAPPER_MAX_COLLISION_SAMPLE_DISTANCE);
    const lastIndex = Math.floor(maximumDistance / ZAPPER_MAX_COLLISION_SAMPLE_DISTANCE);
    if (scrollSpeed > 0) {
      distanceIndex = firstIndex;
      distanceLastIndex = lastIndex;
    } else {
      distanceIndex = lastIndex;
      distanceLastIndex = firstIndex;
      distanceStep = -1;
    }
  }

  const absoluteStartSeconds = initialSimulationSeconds + interval.startSeconds;
  const absoluteEndSeconds = initialSimulationSeconds + interval.endSeconds;

  return {
    distanceIndex,
    distanceLastIndex,
    distanceStep,
    eventCandidates,
    eventIndex: 0,
    initialDistance,
    initialSimulationSeconds,
    interval,
    previousCandidate: undefined,
    scrollSpeed,
    timeIndex: Math.ceil(absoluteStartSeconds / ZAPPER_MAX_COLLISION_SAMPLE_SECONDS),
    timeLastIndex: Math.floor(absoluteEndSeconds / ZAPPER_MAX_COLLISION_SAMPLE_SECONDS),
  };
};

const getNextZapperCollisionSampleTime = (
  cursor: ZapperCollisionSampleCursor,
): number | null => {
  while (true) {
    const eventSeconds =
      cursor.eventIndex < cursor.eventCandidates.length
        ? (cursor.eventCandidates[cursor.eventIndex] ?? Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY;

    let distanceSeconds = Number.POSITIVE_INFINITY;
    while (
      cursor.scrollSpeed !== 0 &&
      (cursor.distanceStep > 0
        ? cursor.distanceIndex <= cursor.distanceLastIndex
        : cursor.distanceIndex >= cursor.distanceLastIndex)
    ) {
      const candidate =
        (cursor.distanceIndex * ZAPPER_MAX_COLLISION_SAMPLE_DISTANCE - cursor.initialDistance) /
        cursor.scrollSpeed;
      if (candidate >= cursor.interval.startSeconds && candidate <= cursor.interval.endSeconds) {
        distanceSeconds = candidate;
        break;
      }
      cursor.distanceIndex += cursor.distanceStep;
    }

    let timeSeconds = Number.POSITIVE_INFINITY;
    while (cursor.timeIndex <= cursor.timeLastIndex) {
      const candidate =
        cursor.timeIndex * ZAPPER_MAX_COLLISION_SAMPLE_SECONDS - cursor.initialSimulationSeconds;
      if (candidate >= cursor.interval.startSeconds && candidate <= cursor.interval.endSeconds) {
        timeSeconds = candidate;
        break;
      }
      cursor.timeIndex += 1;
    }

    const nextCandidate = Math.min(eventSeconds, distanceSeconds, timeSeconds);
    if (nextCandidate === Number.POSITIVE_INFINITY) {
      return null;
    }

    if (eventSeconds === nextCandidate) {
      cursor.eventIndex += 1;
    }
    if (distanceSeconds === nextCandidate) {
      cursor.distanceIndex += cursor.distanceStep;
    }
    if (timeSeconds === nextCandidate) {
      cursor.timeIndex += 1;
    }

    if (cursor.previousCandidate === undefined || nextCandidate !== cursor.previousCandidate) {
      cursor.previousCandidate = nextCandidate;
      return nextCandidate;
    }
  }
};

const countRemainingZapperCollisionSamples = (
  cursor: ZapperCollisionSampleCursor,
): number => {
  let count = 0;
  while (getNextZapperCollisionSampleTime(cursor) !== null) {
    count += 1;
  }
  return count;
};

interface PrototypeZapperPaddingPairContacts {
  readonly primaryHit: boolean;
  readonly secondaryHitWithoutPrimary: boolean;
}

export interface PrototypeZapperCoreGrazeContacts {
  readonly coreHit: boolean;
  readonly grazeHit: boolean;
}

const NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT: Readonly<PrototypeZapperPaddingPairContacts> =
  Object.freeze({
    primaryHit: false,
    secondaryHitWithoutPrimary: false,
  });
const PROTOTYPE_ZAPPER_SECONDARY_ONLY_CONTACT: Readonly<PrototypeZapperPaddingPairContacts> =
  Object.freeze({
    primaryHit: false,
    secondaryHitWithoutPrimary: true,
  });
const PROTOTYPE_ZAPPER_PRIMARY_CONTACT: Readonly<PrototypeZapperPaddingPairContacts> =
  Object.freeze({
    primaryHit: true,
    secondaryHitWithoutPrimary: false,
  });

const NO_PROTOTYPE_ZAPPER_CORE_GRAZE_CONTACT: Readonly<PrototypeZapperCoreGrazeContacts> =
  Object.freeze({
    coreHit: false,
    grazeHit: false,
  });
const PROTOTYPE_ZAPPER_GRAZE_ONLY_CONTACT: Readonly<PrototypeZapperCoreGrazeContacts> =
  Object.freeze({
    coreHit: false,
    grazeHit: true,
  });
const PROTOTYPE_ZAPPER_CORE_CONTACT: Readonly<PrototypeZapperCoreGrazeContacts> = Object.freeze({
  coreHit: true,
  grazeHit: false,
});

const assertValidPrototypeZapperPadding = (
  padding: Readonly<PrototypeZapperGeometryPadding>,
): void => {
  if (
    !Number.isFinite(padding.beam) ||
    padding.beam < 0 ||
    !Number.isFinite(padding.endpoints) ||
    padding.endpoints < 0
  ) {
    throw new RangeError('Zapper geometry padding must be finite and non-negative.');
  }
};

const doesHitboxOverlapPrototypeZapperOnValidatedPath = (
  hitbox: Readonly<LogicalHitbox>,
  geometry: NonNullable<ReturnType<typeof resolvePrototypeZapperGeometry>>,
  padding: Readonly<PrototypeZapperGeometryPadding>,
): boolean =>
  padding === PROTOTYPE_ZAPPER_LETHAL_PADDING || padding === PROTOTYPE_ZAPPER_GRAZE_PADDING
    ? doesHitboxOverlapPrototypeZapperWithCanonicalPadding(hitbox, geometry, padding)
    : doesHitboxOverlapPrototypeZapper(hitbox, geometry, padding);

const evaluatePrototypeZapperPaddingPairDuringStep = (
  initialRunState: Readonly<RunMotionState>,
  trajectory: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
  runMotionTuning: Readonly<RunMotionValues>,
  hazard: Readonly<LogicalHazard>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents>,
  primaryPadding: Readonly<PrototypeZapperGeometryPadding>,
  secondaryPadding?: Readonly<PrototypeZapperGeometryPadding>,
  workCounters?: PrototypeZapperCollisionWorkCounters,
): Readonly<PrototypeZapperPaddingPairContacts> => {
  if (!isPrototypeZapperHazard(hazard)) {
    return NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
  }
  if (workCounters) {
    workCounters.collisionCallCount += 1;
  }
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('elapsedSeconds must be a non-negative finite number.');
  }

  const initialSimulationSeconds = initialRunState.simulationSeconds ?? 0;
  if (elapsedSeconds === 0) {
    const geometry = resolvePrototypeZapperGeometry(hazard, initialSimulationSeconds);
    if (!geometry) {
      return NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
    }
    if (workCounters) {
      workCounters.candidateSampleCount += 1;
      workCounters.evaluatedSampleCount += 1;
      workCounters.geometryResolutionCount += 1;
    }
    const playerHitbox = createPrototypePlayerHitbox(
      initialRunState,
      trajectory.finalState,
      playerExtents,
    );
    if (workCounters) {
      workCounters.primaryNarrowphaseCheckCount += 1;
    }
    if (doesHitboxOverlapPrototypeZapper(playerHitbox, geometry, primaryPadding)) {
      return PROTOTYPE_ZAPPER_PRIMARY_CONTACT;
    }
    if (secondaryPadding) {
      if (workCounters) {
        workCounters.secondaryNarrowphaseCheckCount += 1;
      }
      return doesHitboxOverlapPrototypeZapper(playerHitbox, geometry, secondaryPadding)
        ? PROTOTYPE_ZAPPER_SECONDARY_ONLY_CONTACT
        : NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
    }
    return NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
  }

  const interval = getCollisionTimeRange(hazard, elapsedSeconds);
  if (!interval) {
    return NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
  }
  if (!Number.isFinite(initialRunState.distance)) {
    throw new RangeError('Player run distance must be finite.');
  }
  assertValidPlayerCollisionExtents(playerExtents);
  if (!Number.isFinite(initialSimulationSeconds) || initialSimulationSeconds < 0) {
    throw new RangeError('Zapper initial simulation time must be non-negative and finite.');
  }
  if (!Number.isFinite(runMotionTuning.baseScrollSpeed)) {
    throw new RangeError('Zapper scroll speed must be finite.');
  }
  assertValidPrototypeZapperPadding(primaryPadding);
  if (secondaryPadding) {
    assertValidPrototypeZapperPadding(secondaryPadding);
  }

  const maximumPadding = Math.max(
    primaryPadding.beam,
    primaryPadding.endpoints,
    secondaryPadding?.beam ?? 0,
    secondaryPadding?.endpoints ?? 0,
  );
  if (
    !getHorizontalOverlapRange(
      initialRunState.distance,
      runMotionTuning.baseScrollSpeed,
      hazard,
      playerExtents,
      interval,
      maximumPadding,
      0,
    )
  ) {
    if (workCounters) {
      workCounters.broadphaseRejectedCallCount += 1;
    }
    return NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
  }

  if (playerExtents === PROTOTYPE_PLAYER_COLLISION_EXTENTS) {
    const minimumPlayerCenterY =
      hazard.hitbox.top - maximumPadding - PROTOTYPE_PLAYER_COLLISION_EXTENTS.bottom;
    const maximumPlayerCenterY =
      hazard.hitbox.bottom + maximumPadding + PROTOTYPE_PLAYER_COLLISION_EXTENTS.top;
    if (
      !canFlightTrajectoryOverlapVerticalRange(
        trajectory,
        interval,
        minimumPlayerCenterY,
        maximumPlayerCenterY,
      )
    ) {
      if (workCounters) {
        workCounters.broadphaseRejectedCallCount += 1;
      }
      return NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
    }
  }

  if (playerExtents === PROTOTYPE_PLAYER_COLLISION_EXTENTS) {
    const staticOneAxisContacts = evaluateStaticZapperOneAxisSweep(
      initialRunState,
      trajectory,
      runMotionTuning,
      hazard,
      interval,
      primaryPadding,
      secondaryPadding,
      workCounters,
    );
    if (staticOneAxisContacts !== null) {
      return staticOneAxisContacts;
    }
  }

  const sampleCursor = createZapperCollisionSampleCursor(
    trajectory,
    initialRunState.distance,
    initialSimulationSeconds,
    runMotionTuning.baseScrollSpeed,
    interval,
  );
  const rotatingGeometryScratch =
    hazard.behavior.rotation === undefined ? null : createPrototypeZapperGeometryScratch();
  let staticGeometry: ReturnType<typeof resolvePrototypeZapperGeometry> | undefined;
  let secondaryHit = false;
  let trajectorySegmentIndex = 0;
  const trajectorySegments = trajectory.segments;
  const canReusePlayerHitboxScratch = playerExtents === PROTOTYPE_PLAYER_COLLISION_EXTENTS;
  const playerHitboxScratch: LogicalHitbox = { bottom: 0, left: 0, right: 0, top: 0 };

  while (true) {
    const seconds = getNextZapperCollisionSampleTime(sampleCursor);
    if (seconds === null) {
      break;
    }
    if (workCounters) {
      workCounters.candidateSampleCount += 1;
      workCounters.evaluatedSampleCount += 1;
    }
    let trajectorySegment = trajectorySegments[trajectorySegmentIndex];
    while (
      trajectorySegment &&
      trajectorySegmentIndex < trajectorySegments.length - 1 &&
      seconds > trajectorySegment.endSeconds
    ) {
      trajectorySegmentIndex += 1;
      trajectorySegment = trajectorySegments[trajectorySegmentIndex];
    }
    const playerPositionY =
      trajectorySegment &&
      seconds >= trajectorySegment.startSeconds &&
      seconds <= trajectorySegment.endSeconds
        ? evaluateFlightSegmentPosition(trajectorySegment, seconds)
        : evaluateFlightTrajectoryPosition(trajectory, seconds);
    const playerDistance = initialRunState.distance + runMotionTuning.baseScrollSpeed * seconds;
    let playerHitbox: Readonly<LogicalHitbox>;
    if (canReusePlayerHitboxScratch) {
      if (!Number.isFinite(playerDistance) || !Number.isFinite(playerPositionY)) {
        throw new RangeError('Player run distance and vertical position must be finite.');
      }
      playerHitboxScratch.left = playerDistance - PROTOTYPE_PLAYER_COLLISION_EXTENTS.left;
      playerHitboxScratch.right = playerDistance + PROTOTYPE_PLAYER_COLLISION_EXTENTS.right;
      playerHitboxScratch.top = playerPositionY - PROTOTYPE_PLAYER_COLLISION_EXTENTS.top;
      playerHitboxScratch.bottom = playerPositionY + PROTOTYPE_PLAYER_COLLISION_EXTENTS.bottom;
      playerHitbox = playerHitboxScratch;
    } else {
      playerHitbox = createPrototypePlayerHitbox(
        { distance: playerDistance },
        { positionY: playerPositionY, velocityY: 0 },
        playerExtents,
      );
    }
    let geometry: ReturnType<typeof resolvePrototypeZapperGeometry>;
    if (rotatingGeometryScratch !== null) {
      geometry = resolvePrototypeZapperGeometryInto(
        hazard,
        initialSimulationSeconds + seconds,
        rotatingGeometryScratch,
      );
      if (workCounters) {
        workCounters.geometryResolutionCount += 1;
      }
    } else {
      if (staticGeometry === undefined) {
        staticGeometry = resolvePrototypeZapperGeometry(hazard, initialSimulationSeconds);
        if (workCounters) {
          workCounters.geometryResolutionCount += 1;
        }
      }
      geometry = staticGeometry;
    }
    if (!geometry) {
      continue;
    }

    if (workCounters) {
      workCounters.primaryNarrowphaseCheckCount += 1;
    }
    if (doesHitboxOverlapPrototypeZapperOnValidatedPath(playerHitbox, geometry, primaryPadding)) {
      if (workCounters) {
        workCounters.candidateSampleCount += countRemainingZapperCollisionSamples(sampleCursor);
      }
      return PROTOTYPE_ZAPPER_PRIMARY_CONTACT;
    }
    if (secondaryPadding && !secondaryHit) {
      if (workCounters) {
        workCounters.secondaryNarrowphaseCheckCount += 1;
      }
      if (
        doesHitboxOverlapPrototypeZapperOnValidatedPath(playerHitbox, geometry, secondaryPadding)
      ) {
        secondaryHit = true;
      }
    }
  }

  return secondaryHit
    ? PROTOTYPE_ZAPPER_SECONDARY_ONLY_CONTACT
    : NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
};

/**
 * Continuous-step authority for static and rotating Zappers. The authored Zapper hitbox is a
 * conservative horizontal envelope; rotating Zappers reserve their full angular sweep. Cheap
 * horizontal plus exact canonical-extents vertical trajectory broadphases reject envelopes that
 * cannot reach the player during the active interval before dense sample times or geometry are
 * created. Static Zappers also collapse canonical one-axis player motion into one exact swept AABB:
 * vertical-only continuous flight or horizontal-only scrolling therefore needs one geometry check
 * instead of the dense lattice. Two-axis motion and unusual/gapped trajectories retain the lattice.
 * Custom extents retain the historical path. Samples remain anchored to absolute world
 * distance plus an authoritative 1/720-second simulation-time lattice. The ordered event/time/
 * distance sources are consumed through one local cursor instead of materializing a dense sample
 * array; Director counters drain only the remaining cursor after an early core hit so planned-sample
 * accounting stays unchanged. Sorted samples advance one monotonic flight-segment cursor instead of
 * linearly searching the trajectory again per sample.
 * The canonical frozen player extents reuse one local hitbox scratch instead of allocating transient
 * run-state, flight-state, and hitbox objects per sample. Custom extents keep the historical
 * per-sample validation/allocation path so dynamic runtime inputs preserve their previous contract.
 * Static Zappers resolve immutable geometry once per step; rotating Zappers rewrite one local
 * geometry scratch from authoritative simulation time so a beam cannot tunnel between endpoint
 * poses without allocating/freeze-building a geometry tree per sample.
 */
export const isPlayerCollidingWithPrototypeZapperDuringStep = (
  initialRunState: Readonly<RunMotionState>,
  trajectory: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
  runMotionTuning: Readonly<RunMotionValues>,
  hazard: Readonly<LogicalHazard>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents> = PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  padding: Readonly<PrototypeZapperGeometryPadding> = PROTOTYPE_ZAPPER_LETHAL_PADDING,
  workCounters?: PrototypeZapperCollisionWorkCounters,
): boolean =>
  evaluatePrototypeZapperPaddingPairDuringStep(
    initialRunState,
    trajectory,
    elapsedSeconds,
    runMotionTuning,
    hazard,
    playerExtents,
    padding,
    undefined,
    workCounters,
  ).primaryHit;

/**
 * Resolves lethal core and Zapper Graze-padding contact from one shared sample/geometry pass.
 * grazeHit is intentionally false whenever a core hit occurs anywhere in the step.
 */
export const evaluatePlayerPrototypeZapperCoreAndGrazeDuringStep = (
  initialRunState: Readonly<RunMotionState>,
  trajectory: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
  runMotionTuning: Readonly<RunMotionValues>,
  hazard: Readonly<LogicalHazard>,
  grazePadding: Readonly<PrototypeZapperGeometryPadding>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents> = PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  workCounters?: PrototypeZapperCollisionWorkCounters,
): Readonly<PrototypeZapperCoreGrazeContacts> => {
  const contacts = evaluatePrototypeZapperPaddingPairDuringStep(
    initialRunState,
    trajectory,
    elapsedSeconds,
    runMotionTuning,
    hazard,
    playerExtents,
    PROTOTYPE_ZAPPER_LETHAL_PADDING,
    grazePadding,
    workCounters,
  );
  if (contacts.primaryHit) {
    return PROTOTYPE_ZAPPER_CORE_CONTACT;
  }
  return contacts.secondaryHitWithoutPrimary
    ? PROTOTYPE_ZAPPER_GRAZE_ONLY_CONTACT
    : NO_PROTOTYPE_ZAPPER_CORE_GRAZE_CONTACT;
};

/**
 * Tests continuous positive-area overlap during one authoritative run step. Horizontal relative
 * motion is linear and may include an independently moving hazard. Flight is the exact bounded
 * polynomial trajectory produced by VerticalFlightSimulation; vertical patrol is an exact triangle
 * wave. Zappers use their compound capsule/circle geometry and authoritative simulation-time pose
 * instead of their conservative scheduling AABB.
 */
export const isPlayerCollidingWithHazardDuringStep = (
  initialRunState: Readonly<RunMotionState>,
  trajectory: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
  runMotionTuning: Readonly<RunMotionValues>,
  hazard: Readonly<LogicalHazard>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents> = PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  workCounters?: PrototypeZapperCollisionWorkCounters,
): boolean => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('elapsedSeconds must be a non-negative finite number.');
  }
  assertValidPlayerCollisionExtents(playerExtents);

  if (isPrototypeZapperHazard(hazard)) {
    return isPlayerCollidingWithPrototypeZapperDuringStep(
      initialRunState,
      trajectory,
      elapsedSeconds,
      runMotionTuning,
      hazard,
      playerExtents,
      PROTOTYPE_ZAPPER_LETHAL_PADDING,
      workCounters,
    );
  }

  if (elapsedSeconds === 0) {
    return isPlayerCollidingWithHazard(
      initialRunState,
      trajectory.finalState,
      { hitbox: resolveHazardHitboxAtRunDistance(hazard, initialRunState.distance) },
      playerExtents,
    );
  }

  const collisionRange = getCollisionTimeRange(hazard, elapsedSeconds);
  if (!collisionRange) {
    return false;
  }
  const horizontalRange = getHorizontalOverlapRange(
    initialRunState.distance,
    runMotionTuning.baseScrollSpeed,
    hazard,
    playerExtents,
    collisionRange,
  );
  if (!horizontalRange) {
    return false;
  }

  const relativeVerticalRange = getRelativeVerticalRange(
    trajectory,
    initialRunState.distance,
    runMotionTuning.baseScrollSpeed,
    hazard,
    horizontalRange,
  );
  const minimumPlayerCenterY = hazard.hitbox.top - playerExtents.bottom;
  const maximumPlayerCenterY = hazard.hitbox.bottom + playerExtents.top;

  return (
    relativeVerticalRange.minimum < maximumPlayerCenterY &&
    relativeVerticalRange.maximum > minimumPlayerCenterY
  );
};
