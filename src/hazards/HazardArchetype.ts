import type { LogicalHazard, LogicalHitbox } from '../systems/HazardCollision';
import {
  createTelegraphedHazardLifecycleConfig,
  type TelegraphedHazardLifecycleConfig,
} from './TelegraphedHazardLifecycle';

export type HazardArchetype = 'geometric' | 'reactive' | 'timed';

export interface StaticGeometricHazardBehavior {
  readonly archetype: 'geometric';
  readonly kind: 'static';
}

export type ZapperRotationDirection = 'clockwise' | 'counterclockwise';

export interface ZapperRotationMotion {
  readonly direction: ZapperRotationDirection;
  readonly speedDegreesPerSecond: number;
}

/** Two-node electric barrier. Angle and length remain free content data. */
export interface ZapperHazardBehavior {
  readonly angleDegrees: number;
  readonly archetype: 'geometric';
  readonly beamThickness: number;
  readonly endpointDiameter: number;
  readonly grazeBeamPadding: number;
  readonly grazeEndpointPadding: number;
  readonly kind: 'zapper';
  /** Distance between endpoint centers in logical pixels. */
  readonly length: number;
  /** Optional continuous midpoint rotation driven only by authoritative simulation time. */
  readonly rotation?: Readonly<ZapperRotationMotion>;
}

/** PROTOTYPE triangle-wave movement authored in logical run-distance space. */
export interface VerticalPatrolHazardBehavior {
  readonly amplitudeY: number;
  readonly archetype: 'geometric';
  readonly cycleDistance: number;
  readonly kind: 'vertical-patrol';
  /** Cycle fraction at the hazard's immutable leading-edge run-distance anchor: [0, 1). */
  readonly phaseOffset: number;
}

/** PROTOTYPE one-shot pulse that is safe while warning/locked and lethal only while active. */
export interface TimedPulseHazardBehavior {
  readonly archetype: 'timed';
  readonly kind: 'pulse';
  readonly lifecycle: Readonly<TelegraphedHazardLifecycleConfig>;
}

/**
 * Optional M5 Missile motion layered onto the generic target-lock interaction. The current authored
 * Missile launches from the right and travels left, but launch side is data so later content is not
 * coupled to one permanent direction. Curved/homing trajectories remain future behavior work.
 */
export interface TargetLockMissileMotion {
  readonly launchSide: 'left' | 'right';
  readonly offscreenPadding: number;
  /** Maximum vertical warning-marker chase speed in logical pixels per second. */
  readonly trackingSpeed: number;
  readonly travelSpeed: number;
}

/** PROTOTYPE warning-track, lock, then fixed-height strike with no post-lock tracking. */
export interface TargetLockStrikeHazardBehavior {
  readonly archetype: 'reactive';
  readonly kind: 'target-lock-strike';
  readonly lifecycle: Readonly<TelegraphedHazardLifecycleConfig>;
  readonly maximumTargetY: number;
  readonly minimumTargetY: number;
  readonly strikeHeight: number;
  readonly missile?: Readonly<TargetLockMissileMotion>;
}

export type HazardBehavior =
  | StaticGeometricHazardBehavior
  | TargetLockStrikeHazardBehavior
  | TimedPulseHazardBehavior
  | VerticalPatrolHazardBehavior
  | ZapperHazardBehavior;

export interface BehavioralLogicalHazard extends LogicalHazard {
  readonly behavior: Readonly<HazardBehavior>;
  /** Immutable leading-edge anchor copied from generated spawn data. */
  readonly runDistance: number;
}

export const STATIC_GEOMETRIC_HAZARD_BEHAVIOR: Readonly<StaticGeometricHazardBehavior> =
  Object.freeze({
    archetype: 'geometric',
    kind: 'static',
  });

const assertPositiveFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
};

const assertNonNegativeFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number.`);
  }
};

const assertValidHazardBehavior = (definition: Readonly<HazardBehavior>): void => {
  const rawDefinition = definition as { readonly archetype: unknown; readonly kind: unknown };
  const supportedPair =
    (rawDefinition.archetype === 'geometric' &&
      (rawDefinition.kind === 'static' ||
        rawDefinition.kind === 'vertical-patrol' ||
        rawDefinition.kind === 'zapper')) ||
    (rawDefinition.archetype === 'timed' && rawDefinition.kind === 'pulse') ||
    (rawDefinition.archetype === 'reactive' && rawDefinition.kind === 'target-lock-strike');
  if (!supportedPair) {
    throw new TypeError(
      `Unsupported hazard behavior: ${String(rawDefinition.archetype)}/${String(rawDefinition.kind)}`,
    );
  }

  switch (definition.kind) {
    case 'static':
      return;
    case 'zapper':
      if (!Number.isFinite(definition.angleDegrees)) {
        throw new RangeError('Hazard Zapper angleDegrees must be finite.');
      }
      assertPositiveFinite(definition.length, 'Hazard Zapper length');
      assertPositiveFinite(definition.beamThickness, 'Hazard Zapper beamThickness');
      assertPositiveFinite(definition.endpointDiameter, 'Hazard Zapper endpointDiameter');
      assertNonNegativeFinite(definition.grazeBeamPadding, 'Hazard Zapper grazeBeamPadding');
      assertNonNegativeFinite(
        definition.grazeEndpointPadding,
        'Hazard Zapper grazeEndpointPadding',
      );
      if (definition.rotation) {
        if (
          definition.rotation.direction !== 'clockwise' &&
          definition.rotation.direction !== 'counterclockwise'
        ) {
          throw new TypeError('Hazard Zapper rotation direction must be clockwise or counterclockwise.');
        }
        assertPositiveFinite(
          definition.rotation.speedDegreesPerSecond,
          'Hazard Zapper rotation speedDegreesPerSecond',
        );
      }
      return;
    case 'vertical-patrol':
      assertPositiveFinite(definition.amplitudeY, 'Hazard vertical-patrol amplitudeY');
      assertPositiveFinite(definition.cycleDistance, 'Hazard vertical-patrol cycleDistance');
      if (
        !Number.isFinite(definition.phaseOffset) ||
        definition.phaseOffset < 0 ||
        definition.phaseOffset >= 1
      ) {
        throw new RangeError('Hazard vertical-patrol phaseOffset must be in [0, 1).');
      }

      return;
    case 'pulse':
      createTelegraphedHazardLifecycleConfig(definition.lifecycle);
      return;
    case 'target-lock-strike': {
      createTelegraphedHazardLifecycleConfig(definition.lifecycle);
      assertPositiveFinite(definition.strikeHeight, 'Hazard target-lock strikeHeight');
      if (
        !Number.isFinite(definition.minimumTargetY) ||
        !Number.isFinite(definition.maximumTargetY) ||
        definition.maximumTargetY <= definition.minimumTargetY
      ) {
        throw new RangeError(
          'Hazard target-lock target range must be finite with maximumTargetY above minimumTargetY.',
        );
      }

      const missile = definition.missile;
      if (missile) {
        assertPositiveFinite(missile.trackingSpeed, 'Hazard Missile trackingSpeed');
        if (missile.launchSide !== 'left' && missile.launchSide !== 'right') {
          throw new TypeError('Hazard Missile launchSide must be left or right.');
        }
        assertPositiveFinite(missile.travelSpeed, 'Hazard Missile travelSpeed');
        if (!Number.isFinite(missile.offscreenPadding) || missile.offscreenPadding < 0) {
          throw new RangeError('Hazard Missile offscreenPadding must be non-negative and finite.');
        }
      }
      return;
    }
    default:
      throw new TypeError(
        `Unsupported hazard behavior kind: ${String(
          (definition as { readonly kind: unknown }).kind,
        )}`,
      );
  }
};

/** Validates and snapshots a small serializable behavior union without creating an entity base class. */
export const createHazardBehavior = (
  definition: Readonly<HazardBehavior>,
): Readonly<HazardBehavior> => {
  assertValidHazardBehavior(definition);
  switch (definition.kind) {
    case 'static':
      return STATIC_GEOMETRIC_HAZARD_BEHAVIOR;
    case 'zapper':
      return Object.freeze({
        ...definition,
        ...(definition.rotation ? { rotation: Object.freeze({ ...definition.rotation }) } : {}),
      });
    case 'vertical-patrol':
      return Object.freeze({ ...definition });
    case 'pulse':
      return Object.freeze({
        ...definition,
        lifecycle: createTelegraphedHazardLifecycleConfig(definition.lifecycle),
      });
    case 'target-lock-strike':
      return Object.freeze({
        ...definition,
        lifecycle: createTelegraphedHazardLifecycleConfig(definition.lifecycle),
        ...(definition.missile ? { missile: Object.freeze({ ...definition.missile }) } : {}),
      });
  }
};

export const isTimedPulseHazardBehavior = (
  behavior: Readonly<HazardBehavior>,
): behavior is Readonly<TimedPulseHazardBehavior> =>
  behavior.archetype === 'timed' && behavior.kind === 'pulse';

export const isTargetLockStrikeHazardBehavior = (
  behavior: Readonly<HazardBehavior>,
): behavior is Readonly<TargetLockStrikeHazardBehavior> =>
  behavior.archetype === 'reactive' && behavior.kind === 'target-lock-strike';

export const isZapperHazardBehavior = (
  behavior: Readonly<HazardBehavior>,
): behavior is Readonly<ZapperHazardBehavior> =>
  behavior.archetype === 'geometric' && behavior.kind === 'zapper';

export const isTelegraphedHazardBehavior = (
  behavior: Readonly<HazardBehavior>,
): behavior is Readonly<TargetLockStrikeHazardBehavior | TimedPulseHazardBehavior> =>
  isTimedPulseHazardBehavior(behavior) || isTargetLockStrikeHazardBehavior(behavior);

export const isBehavioralLogicalHazard = (
  hazard: Readonly<LogicalHazard>,
): hazard is Readonly<BehavioralLogicalHazard> => 'behavior' in hazard && 'runDistance' in hazard;

const positiveModulo = (value: number, modulus: number): number =>
  ((value % modulus) + modulus) % modulus;

/** Resolves the vertical-patrol offset without allocating a hitbox. */
export const resolveVerticalPatrolOffsetAtRunDistance = (
  hazard: Readonly<BehavioralLogicalHazard>,
  currentRunDistance: number,
): number => {
  if (hazard.behavior.kind !== 'vertical-patrol') {
    return 0;
  }
  if (!Number.isFinite(currentRunDistance) || currentRunDistance < 0) {
    throw new RangeError('Hazard behavior currentRunDistance must be non-negative and finite.');
  }
  if (!Number.isFinite(hazard.runDistance) || hazard.runDistance < 0) {
    throw new RangeError('Hazard behavior runDistance anchor must be non-negative and finite.');
  }
  assertValidHazardBehavior(hazard.behavior);

  const cycleProgress = positiveModulo(
    (currentRunDistance - hazard.runDistance) / hazard.behavior.cycleDistance +
      hazard.behavior.phaseOffset,
    1,
  );
  return (1 - 4 * Math.abs(cycleProgress - 0.5)) * hazard.behavior.amplitudeY;
};

/**
 * Returns the current logical hitbox from authoritative run progress. The triangle wave is stable
 * across frame partitions and relative to the spawn's immutable impact anchor. Static hazards keep
 * their authored geometry. Collision remains with the shared logical authority.
 */
export const resolveHazardHitboxAtRunDistance = (
  hazard: Readonly<LogicalHazard>,
  currentRunDistance: number,
): Readonly<LogicalHitbox> => {
  if (!Number.isFinite(currentRunDistance) || currentRunDistance < 0) {
    throw new RangeError('Hazard behavior currentRunDistance must be non-negative and finite.');
  }

  if (!isBehavioralLogicalHazard(hazard) || hazard.behavior.kind !== 'vertical-patrol') {
    return hazard.hitbox;
  }

  if (!Number.isFinite(hazard.runDistance) || hazard.runDistance < 0) {
    throw new RangeError('Hazard behavior runDistance anchor must be non-negative and finite.');
  }
  assertValidHazardBehavior(hazard.behavior);
  const offsetY = resolveVerticalPatrolOffsetAtRunDistance(hazard, currentRunDistance);
  const top = hazard.hitbox.top + offsetY;
  const bottom = hazard.hitbox.bottom + offsetY;

  if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
    throw new RangeError('Resolved moving hazard geometry must remain finite.');
  }

  return Object.freeze({
    left: hazard.hitbox.left,
    right: hazard.hitbox.right,
    top,
    bottom,
  });
};

/** Resolves the reactive strike at a sampled or locked target height without mutating spawn data. */
export const resolveTargetLockStrikeHitbox = (
  hazard: Readonly<BehavioralLogicalHazard>,
  targetPositionY: number,
): Readonly<LogicalHitbox> => {
  if (!isTargetLockStrikeHazardBehavior(hazard.behavior)) {
    return hazard.hitbox;
  }
  if (!Number.isFinite(targetPositionY)) {
    throw new RangeError('Hazard target-lock targetPositionY must be finite.');
  }

  assertValidHazardBehavior(hazard.behavior);
  const targetY = Math.min(
    hazard.behavior.maximumTargetY,
    Math.max(hazard.behavior.minimumTargetY, targetPositionY),
  );
  const halfHeight = hazard.behavior.strikeHeight / 2;

  return Object.freeze({
    left: hazard.hitbox.left,
    right: hazard.hitbox.right,
    top: targetY - halfHeight,
    bottom: targetY + halfHeight,
  });
};

/** Conservative authored extent used by the existing geometry/reachability validator. */
export const getHazardSweptHitbox = (
  hazard: Readonly<LogicalHazard> & { readonly behavior: Readonly<HazardBehavior> },
): Readonly<LogicalHitbox> => {
  assertValidHazardBehavior(hazard.behavior);
  const behavior = hazard.behavior;
  if (behavior.kind === 'target-lock-strike') {
    const halfHeight = behavior.strikeHeight / 2;
    return Object.freeze({
      left: hazard.hitbox.left,
      right: hazard.hitbox.right,
      top: behavior.minimumTargetY - halfHeight,
      bottom: behavior.maximumTargetY + halfHeight,
    });
  }
  if (behavior.kind === 'zapper' && behavior.rotation) {
    const centerX = (hazard.hitbox.left + hazard.hitbox.right) / 2;
    const centerY = (hazard.hitbox.top + hazard.hitbox.bottom) / 2;
    const radius =
      behavior.length / 2 + Math.max(behavior.beamThickness / 2, behavior.endpointDiameter / 2);
    return Object.freeze({
      left: centerX - radius,
      right: centerX + radius,
      top: centerY - radius,
      bottom: centerY + radius,
    });
  }
  if (behavior.kind !== 'vertical-patrol') {
    return hazard.hitbox;
  }

  const top = hazard.hitbox.top - behavior.amplitudeY;
  const bottom = hazard.hitbox.bottom + behavior.amplitudeY;
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
    throw new RangeError('Moving hazard swept geometry must remain finite.');
  }

  return Object.freeze({
    left: hazard.hitbox.left,
    right: hazard.hitbox.right,
    top,
    bottom,
  });
};
