import type { LogicalHitbox } from '../systems/HazardCollision';
import {
  type BehavioralLogicalHazard,
  isTargetLockStrikeHazardBehavior,
  resolveTargetLockStrikeHitbox,
  type TargetLockMissileMotion,
  type TargetLockStrikeHazardBehavior,
} from './HazardArchetype';
import type { TelegraphedHazardTarget } from './TelegraphedHazardLifecycle';

export interface PrototypeMissileBehavior extends TargetLockStrikeHazardBehavior {
  readonly missile: Readonly<TargetLockMissileMotion>;
}

export interface PrototypeMissileHorizontalLayout {
  readonly playerRunDistance: number;
  readonly playerScreenX: number;
  readonly viewportLeft: number;
  readonly viewportRight: number;
}

/** Presentation-only blink cadence. Gameplay timing remains owned by the lifecycle. */
export const PROTOTYPE_MISSILE_WARNING_BLINK_SECONDS = 0.16;
export const PROTOTYPE_MISSILE_WARNING_EDGE_MARGIN = 10;

export const isPrototypeMissileBehavior = (
  behavior: Readonly<TargetLockStrikeHazardBehavior>,
): behavior is Readonly<PrototypeMissileBehavior> => behavior.missile !== undefined;

/**
 * Keeps the marker behind player movement without integrating frame-by-frame chase state.
 * The warning origin is immutable, so the same exact player target at a lifecycle boundary produces
 * the same marker position across frame partitions.
 */
export const resolvePrototypeMissileTrackingTarget = (
  hazard: Readonly<BehavioralLogicalHazard>,
  warningOrigin: Readonly<TelegraphedHazardTarget>,
  observedTarget: Readonly<TelegraphedHazardTarget>,
): Readonly<TelegraphedHazardTarget> => {
  if (
    !isTargetLockStrikeHazardBehavior(hazard.behavior) ||
    !isPrototypeMissileBehavior(hazard.behavior)
  ) {
    return observedTarget;
  }

  const trackedPositionY =
    warningOrigin.positionY +
    (observedTarget.positionY - warningOrigin.positionY) *
      hazard.behavior.missile.trackingResponsiveness;
  const clampedHitbox = resolveTargetLockStrikeHitbox(hazard, trackedPositionY);

  return Object.freeze({
    positionY: (clampedHitbox.top + clampedHitbox.bottom) / 2,
    runDistance: observedTarget.runDistance,
  });
};

export const getPrototypeMissileRelativeVelocityX = (
  behavior: Readonly<PrototypeMissileBehavior>,
): number => (behavior.missile.launchSide === 'right' ? -1 : 1) * behavior.missile.travelSpeed;

const assertValidHorizontalLayout = (layout: Readonly<PrototypeMissileHorizontalLayout>): void => {
  if (
    !Number.isFinite(layout.playerRunDistance) ||
    !Number.isFinite(layout.playerScreenX) ||
    !Number.isFinite(layout.viewportLeft) ||
    !Number.isFinite(layout.viewportRight) ||
    layout.viewportRight <= layout.viewportLeft
  ) {
    throw new RangeError('Missile horizontal layout must be finite with positive viewport width.');
  }
};

/**
 * Resolves the immutable logical launch offset from the player at the Active boundary. Warning/Lock
 * may follow a resized viewport, but once the Missile launches this relative X must not be recomputed
 * from a later viewport. Keeping the offset player-relative preserves gameplay geometry when resize
 * moves the player's screen anchor and the rest of the world presentation together.
 */
export const resolvePrototypeMissileLaunchRelativeLeft = (
  hazard: Readonly<BehavioralLogicalHazard>,
  layout: Readonly<PrototypeMissileHorizontalLayout>,
): number => {
  assertValidHorizontalLayout(layout);
  if (
    !isTargetLockStrikeHazardBehavior(hazard.behavior) ||
    !isPrototypeMissileBehavior(hazard.behavior)
  ) {
    return hazard.hitbox.left - layout.playerRunDistance;
  }

  const width = hazard.hitbox.right - hazard.hitbox.left;
  const motion = hazard.behavior.missile;
  return motion.launchSide === 'right'
    ? layout.viewportRight - layout.playerScreenX + motion.offscreenPadding
    : layout.viewportLeft - layout.playerScreenX - motion.offscreenPadding - width;
};

/**
 * Resolves the Missile's current authoritative world hitbox from a player-relative horizontal
 * trajectory. The launch offset is frozen at the Active boundary, so a later viewport resize cannot
 * change the Missile's logical distance from the player. Presentation still follows the normal world
 * projection and therefore adapts with the player's resized screen anchor. The present M5 content
 * launches from the right, and the same rule supports a left-side launch.
 *
 * `trajectoryElapsedSeconds` is normally the non-negative elapsed Active time. Continuous collision
 * may pass a negative value only to extrapolate the same linear trajectory back to the beginning of
 * a simulation step whose lethal Active interval starts later inside that step.
 */
export const resolvePrototypeMissileTravelHitbox = (
  hazard: Readonly<BehavioralLogicalHazard>,
  target: Readonly<TelegraphedHazardTarget>,
  trajectoryElapsedSeconds: number,
  layout: Readonly<PrototypeMissileHorizontalLayout>,
  launchRelativeLeft?: number | null,
): Readonly<LogicalHitbox> => {
  const baseHitbox = resolveTargetLockStrikeHitbox(hazard, target.positionY);

  if (
    !isTargetLockStrikeHazardBehavior(hazard.behavior) ||
    !isPrototypeMissileBehavior(hazard.behavior)
  ) {
    return baseHitbox;
  }
  if (!Number.isFinite(trajectoryElapsedSeconds)) {
    throw new RangeError('Missile trajectory elapsed time must be finite.');
  }
  assertValidHorizontalLayout(layout);
  if (
    launchRelativeLeft !== undefined &&
    launchRelativeLeft !== null &&
    !Number.isFinite(launchRelativeLeft)
  ) {
    throw new RangeError('Missile launch relative position must be finite when provided.');
  }

  const width = baseHitbox.right - baseHitbox.left;
  const frozenLaunchRelativeLeft =
    launchRelativeLeft ?? resolvePrototypeMissileLaunchRelativeLeft(hazard, layout);
  const currentRelativeLeft =
    frozenLaunchRelativeLeft +
    getPrototypeMissileRelativeVelocityX(hazard.behavior) * trajectoryElapsedSeconds;
  const left = layout.playerRunDistance + currentRelativeLeft;

  return Object.freeze({
    left,
    right: left + width,
    top: baseHitbox.top,
    bottom: baseHitbox.bottom,
  });
};
