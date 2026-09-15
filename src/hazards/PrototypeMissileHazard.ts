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

/**
 * Resolves the Missile's current authoritative world hitbox from a player-relative horizontal
 * trajectory. The present M5 content launches from the right, while the same rule also supports a
 * left-side launch without teaching collision or presentation that Missiles have one fixed side.
 */
export const resolvePrototypeMissileTravelHitbox = (
  hazard: Readonly<BehavioralLogicalHazard>,
  target: Readonly<TelegraphedHazardTarget>,
  activeElapsedSeconds: number,
  layout: Readonly<PrototypeMissileHorizontalLayout>,
): Readonly<LogicalHitbox> => {
  const baseHitbox = resolveTargetLockStrikeHitbox(hazard, target.positionY);

  if (
    !isTargetLockStrikeHazardBehavior(hazard.behavior) ||
    !isPrototypeMissileBehavior(hazard.behavior)
  ) {
    return baseHitbox;
  }
  if (!Number.isFinite(activeElapsedSeconds)) {
    throw new RangeError('Missile active elapsed time must be finite.');
  }
  if (
    !Number.isFinite(layout.playerRunDistance) ||
    !Number.isFinite(layout.playerScreenX) ||
    !Number.isFinite(layout.viewportLeft) ||
    !Number.isFinite(layout.viewportRight) ||
    layout.viewportRight <= layout.viewportLeft
  ) {
    throw new RangeError('Missile horizontal layout must be finite with positive viewport width.');
  }

  const width = baseHitbox.right - baseHitbox.left;
  const motion = hazard.behavior.missile;
  const launchLeftOffset =
    motion.launchSide === 'right'
      ? layout.viewportRight - layout.playerScreenX + motion.offscreenPadding
      : layout.viewportLeft - layout.playerScreenX - motion.offscreenPadding - width;
  const left =
    layout.playerRunDistance +
    launchLeftOffset +
    getPrototypeMissileRelativeVelocityX(hazard.behavior) * activeElapsedSeconds;

  return Object.freeze({
    left,
    right: left + width,
    top: baseHitbox.top,
    bottom: baseHitbox.bottom,
  });
};
