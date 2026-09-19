import type { RunMotionValues } from '../config/RunMotionConfig';
import {
  isBehavioralLogicalHazard,
  resolveHazardHitboxAtRunDistance,
  resolveVerticalPatrolOffsetAtRunDistance,
} from '../hazards/HazardArchetype';
import {
  doesHitboxOverlapPrototypeZapper,
  isPrototypeZapperHazard,
  PROTOTYPE_ZAPPER_LETHAL_PADDING,
  type PrototypeZapperGeometryPadding,
  resolvePrototypeZapperGeometry,
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

const ZAPPER_MAX_COLLISION_SAMPLE_DISTANCE = 0.5;
const ZAPPER_MAX_COLLISION_SAMPLE_SECONDS = 1 / 720;

const createZapperCollisionSampleTimes = (
  trajectory: Readonly<VerticalFlightTrajectory>,
  initialDistance: number,
  initialSimulationSeconds: number,
  scrollSpeed: number,
  interval: Readonly<LogicalHazardCollisionInterval>,
): number[] => {
  if (!Number.isFinite(initialSimulationSeconds) || initialSimulationSeconds < 0) {
    throw new RangeError('Zapper initial simulation time must be non-negative and finite.');
  }

  const candidates = [interval.startSeconds, interval.endSeconds];
  for (const segment of trajectory.segments) {
    addCandidate(candidates, segment.startSeconds, interval.startSeconds, interval.endSeconds);
    addCandidate(candidates, segment.endSeconds, interval.startSeconds, interval.endSeconds);
    if (segment.accelerationY !== 0) {
      addCandidate(
        candidates,
        segment.startSeconds - segment.velocityY / segment.accelerationY,
        interval.startSeconds,
        interval.endSeconds,
      );
    }
  }

  if (scrollSpeed !== 0) {
    const firstDistance = initialDistance + scrollSpeed * interval.startSeconds;
    const lastDistance = initialDistance + scrollSpeed * interval.endSeconds;
    const minimumDistance = Math.min(firstDistance, lastDistance);
    const maximumDistance = Math.max(firstDistance, lastDistance);
    const firstIndex = Math.ceil(minimumDistance / ZAPPER_MAX_COLLISION_SAMPLE_DISTANCE);
    const lastIndex = Math.floor(maximumDistance / ZAPPER_MAX_COLLISION_SAMPLE_DISTANCE);
    for (let index = firstIndex; index <= lastIndex; index += 1) {
      const distance = index * ZAPPER_MAX_COLLISION_SAMPLE_DISTANCE;
      const seconds = (distance - initialDistance) / scrollSpeed;
      addCandidate(candidates, seconds, interval.startSeconds, interval.endSeconds);
    }
  }

  // A global simulation-time lattice makes angular sweep sampling partition-stable even when the
  // world scroll is zero or changes independently of Zapper rotation.
  const absoluteStartSeconds = initialSimulationSeconds + interval.startSeconds;
  const absoluteEndSeconds = initialSimulationSeconds + interval.endSeconds;
  const firstTimeIndex = Math.ceil(absoluteStartSeconds / ZAPPER_MAX_COLLISION_SAMPLE_SECONDS);
  const lastTimeIndex = Math.floor(absoluteEndSeconds / ZAPPER_MAX_COLLISION_SAMPLE_SECONDS);
  for (let index = firstTimeIndex; index <= lastTimeIndex; index += 1) {
    addCandidate(
      candidates,
      index * ZAPPER_MAX_COLLISION_SAMPLE_SECONDS - initialSimulationSeconds,
      interval.startSeconds,
      interval.endSeconds,
    );
  }

  candidates.sort((first, second) => first - second);
  let uniqueCount = 0;
  for (const candidate of candidates) {
    if (uniqueCount === 0 || candidate !== candidates[uniqueCount - 1]) {
      candidates[uniqueCount] = candidate;
      uniqueCount += 1;
    }
  }
  candidates.length = uniqueCount;
  return candidates;
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

const evaluatePrototypeZapperPaddingPairDuringStep = (
  initialRunState: Readonly<RunMotionState>,
  trajectory: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
  runMotionTuning: Readonly<RunMotionValues>,
  hazard: Readonly<LogicalHazard>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents>,
  primaryPadding: Readonly<PrototypeZapperGeometryPadding>,
  secondaryPadding?: Readonly<PrototypeZapperGeometryPadding>,
): Readonly<PrototypeZapperPaddingPairContacts> => {
  if (!isPrototypeZapperHazard(hazard)) {
    return NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
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
    const playerHitbox = createPrototypePlayerHitbox(
      initialRunState,
      trajectory.finalState,
      playerExtents,
    );
    if (doesHitboxOverlapPrototypeZapper(playerHitbox, geometry, primaryPadding)) {
      return PROTOTYPE_ZAPPER_PRIMARY_CONTACT;
    }
    return secondaryPadding &&
      doesHitboxOverlapPrototypeZapper(playerHitbox, geometry, secondaryPadding)
      ? PROTOTYPE_ZAPPER_SECONDARY_ONLY_CONTACT
      : NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
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
    return NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
  }

  const sampleTimes = createZapperCollisionSampleTimes(
    trajectory,
    initialRunState.distance,
    initialSimulationSeconds,
    runMotionTuning.baseScrollSpeed,
    interval,
  );
  const rotating = hazard.behavior.rotation !== undefined;
  let staticGeometry: ReturnType<typeof resolvePrototypeZapperGeometry> | undefined;
  let secondaryHit = false;
  let trajectorySegmentIndex = 0;
  const trajectorySegments = trajectory.segments;

  for (const seconds of sampleTimes) {
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
    const playerHitbox = createPrototypePlayerHitbox(
      { distance: initialRunState.distance + runMotionTuning.baseScrollSpeed * seconds },
      { positionY: playerPositionY, velocityY: 0 },
      playerExtents,
    );
    let geometry: ReturnType<typeof resolvePrototypeZapperGeometry>;
    if (rotating) {
      geometry = resolvePrototypeZapperGeometry(hazard, initialSimulationSeconds + seconds);
    } else {
      if (staticGeometry === undefined) {
        staticGeometry = resolvePrototypeZapperGeometry(hazard, initialSimulationSeconds);
      }
      geometry = staticGeometry;
    }
    if (!geometry) {
      continue;
    }

    if (doesHitboxOverlapPrototypeZapper(playerHitbox, geometry, primaryPadding)) {
      return PROTOTYPE_ZAPPER_PRIMARY_CONTACT;
    }
    if (
      secondaryPadding &&
      !secondaryHit &&
      doesHitboxOverlapPrototypeZapper(playerHitbox, geometry, secondaryPadding)
    ) {
      secondaryHit = true;
    }
  }

  return secondaryHit
    ? PROTOTYPE_ZAPPER_SECONDARY_ONLY_CONTACT
    : NO_PROTOTYPE_ZAPPER_PADDING_PAIR_CONTACT;
};

/**
 * Continuous-step authority for static and rotating Zappers. The authored Zapper hitbox is a
 * conservative horizontal envelope; rotating Zappers reserve their full angular sweep. A cheap
 * player-sweep broadphase rejects envelopes that cannot reach the player during the active interval
 * before any dense sample times or geometry are created. Samples remain anchored to absolute world
 * distance plus an authoritative 1/720-second simulation-time lattice. Sorted samples advance one
 * monotonic flight-segment cursor instead of linearly searching the trajectory again per sample.
 * Static Zappers resolve their immutable geometry once per step; rotating Zappers resolve each
 * sample from authoritative simulation time so a beam cannot tunnel between endpoint poses.
 */
export const isPlayerCollidingWithPrototypeZapperDuringStep = (
  initialRunState: Readonly<RunMotionState>,
  trajectory: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
  runMotionTuning: Readonly<RunMotionValues>,
  hazard: Readonly<LogicalHazard>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents> = PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  padding: Readonly<PrototypeZapperGeometryPadding> = PROTOTYPE_ZAPPER_LETHAL_PADDING,
): boolean =>
  evaluatePrototypeZapperPaddingPairDuringStep(
    initialRunState,
    trajectory,
    elapsedSeconds,
    runMotionTuning,
    hazard,
    playerExtents,
    padding,
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
