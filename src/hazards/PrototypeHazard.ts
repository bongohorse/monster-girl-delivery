import type { LogicalHitbox } from '../systems/HazardCollision';
import type { RunMotionState } from '../systems/RunMotionSimulation';

export interface PrototypePlaceholderHazard {
  hitbox: Readonly<LogicalHitbox>;
  id: 'm2-placeholder-barrier';
  type: 'placeholder-barrier';
}

/**
 * Temporary M2 hazard geometry in run-distance space. These dimensions and its placement are
 * prototype values, kept as data so later tuning does not require changing collision rules.
 */
export const PROTOTYPE_PLACEHOLDER_HAZARD: Readonly<PrototypePlaceholderHazard> = Object.freeze({
  id: 'm2-placeholder-barrier',
  type: 'placeholder-barrier',
  hitbox: Object.freeze({
    left: 1_200,
    right: 1_248,
    top: 147,
    bottom: 243,
  }),
});

/**
 * Projects a world-space hazard hitbox into presentation space. Horizontal motion comes only from
 * run progress; playerScreenX and verticalOffset are presentation anchors and do not participate in collision.
 */
export const projectHazardHitboxToScreen = (
  hazard: Pick<PrototypePlaceholderHazard, 'hitbox'>,
  runState: Readonly<RunMotionState>,
  playerScreenX: number,
  verticalOffset = 0,
): LogicalHitbox => {
  if (
    !Number.isFinite(runState.distance) ||
    !Number.isFinite(playerScreenX) ||
    !Number.isFinite(verticalOffset)
  ) {
    throw new RangeError(
      'Run distance, player screen position, and vertical offset must be finite.',
    );
  }

  const horizontalOffset = playerScreenX - runState.distance;

  return {
    left: hazard.hitbox.left + horizontalOffset,
    right: hazard.hitbox.right + horizontalOffset,
    top: hazard.hitbox.top + verticalOffset,
    bottom: hazard.hitbox.bottom + verticalOffset,
  };
};
