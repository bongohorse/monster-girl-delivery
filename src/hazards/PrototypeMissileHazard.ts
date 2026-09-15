import {
  type BehavioralLogicalHazard,
  isTargetLockStrikeHazardBehavior,
  resolveTargetLockStrikeHitbox,
  type TargetLockStrikeHazardBehavior,
} from './HazardArchetype';
import type { TelegraphedHazardTarget } from './TelegraphedHazardLifecycle';

export interface PrototypeMissileBehavior extends TargetLockStrikeHazardBehavior {
  readonly minimumLaunchLeadDistance: number;
  readonly trackingResponsiveness: number;
}

/** Presentation-only blink cadence. Gameplay timing remains owned by the lifecycle. */
export const PROTOTYPE_MISSILE_WARNING_BLINK_SECONDS = 0.16;

export const isPrototypeMissileBehavior = (
  behavior: Readonly<TargetLockStrikeHazardBehavior>,
): behavior is Readonly<PrototypeMissileBehavior> =>
  behavior.trackingResponsiveness !== undefined && behavior.minimumLaunchLeadDistance !== undefined;

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
    (observedTarget.positionY - warningOrigin.positionY) * hazard.behavior.trackingResponsiveness;
  const clampedHitbox = resolveTargetLockStrikeHitbox(hazard, trackedPositionY);

  return Object.freeze({
    positionY: (clampedHitbox.top + clampedHitbox.bottom) / 2,
    runDistance: observedTarget.runDistance,
  });
};

/**
 * Resolves the committed Missile strike. Authored scheduling remains a lower bound, while the
 * locked player run position guarantees enough lead for a visible right-to-left launch even when
 * the Director spawns a Missile manually near the screen edge.
 */
export const resolvePrototypeMissileStrikeHitbox = (
  hazard: Readonly<BehavioralLogicalHazard>,
  target: Readonly<TelegraphedHazardTarget>,
) => {
  const baseHitbox = resolveTargetLockStrikeHitbox(hazard, target.positionY);

  if (
    !isTargetLockStrikeHazardBehavior(hazard.behavior) ||
    !isPrototypeMissileBehavior(hazard.behavior)
  ) {
    return baseHitbox;
  }

  const width = baseHitbox.right - baseHitbox.left;
  const left = Math.max(
    baseHitbox.left,
    target.runDistance + hazard.behavior.minimumLaunchLeadDistance,
  );

  return Object.freeze({
    left,
    right: left + width,
    top: baseHitbox.top,
    bottom: baseHitbox.bottom,
  });
};
