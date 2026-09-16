import type { LogicalHazardSpawnInstance } from '../generation/PatternSpawnScheduler';
import type { LogicalHazard, LogicalHitbox } from '../systems/HazardCollision';
import {
  isBehavioralLogicalHazard,
  isLaserHazardBehavior,
  type LaserHazardBehavior,
  type LaserOrientation,
  type LaserSpan,
} from './HazardArchetype';
import {
  PROTOTYPE_TIMED_LASER_CONFIG,
  type TimedLaserLifecycleConfig,
} from './TimedLaserLifecycle';

export const PROTOTYPE_LASER_LETHAL_THICKNESS = 24;
export const PROTOTYPE_LASER_GRAZE_PADDING = 8;
export const PROTOTYPE_LASER_TELEGRAPH_THICKNESS = 4;
export const PROTOTYPE_LASER_VISUAL_GLOW_THICKNESS = 52;
export const PROTOTYPE_LASER_VERTICAL_SCREEN_POSITION_RATIO = 0.68;

export interface PrototypeLaserLayout {
  readonly playerRunDistance: number;
  readonly playerScreenX: number;
  readonly viewportHeight: number;
  readonly viewportWidth: number;
}

const assertLayout = (layout: Readonly<PrototypeLaserLayout>): void => {
  if (
    !Number.isFinite(layout.playerRunDistance) ||
    layout.playerRunDistance < 0 ||
    !Number.isFinite(layout.playerScreenX) ||
    !Number.isFinite(layout.viewportWidth) ||
    layout.viewportWidth <= 0 ||
    !Number.isFinite(layout.viewportHeight) ||
    layout.viewportHeight <= 0
  ) {
    throw new RangeError('Prototype Laser layout values must be finite with a positive viewport.');
  }
};

export const createPrototypeLaserBehavior = (
  orientation: LaserOrientation,
  span: LaserSpan = 'screen',
  options: Readonly<{
    finiteLength?: number;
    lifecycle?: Readonly<TimedLaserLifecycleConfig>;
    screenPositionRatio?: number;
  }> = {},
): Readonly<LaserHazardBehavior> =>
  Object.freeze({
    archetype: 'timed',
    kind: 'laser',
    orientation,
    span,
    lethalThickness: PROTOTYPE_LASER_LETHAL_THICKNESS,
    grazePadding: PROTOTYPE_LASER_GRAZE_PADDING,
    telegraphThickness: PROTOTYPE_LASER_TELEGRAPH_THICKNESS,
    visualGlowThickness: PROTOTYPE_LASER_VISUAL_GLOW_THICKNESS,
    lifecycle: options.lifecycle ?? PROTOTYPE_TIMED_LASER_CONFIG,
    ...(options.finiteLength === undefined ? {} : { finiteLength: options.finiteLength }),
    ...(options.screenPositionRatio === undefined
      ? orientation === 'vertical'
        ? { screenPositionRatio: PROTOTYPE_LASER_VERTICAL_SCREEN_POSITION_RATIO }
        : {}
      : { screenPositionRatio: options.screenPositionRatio }),
  });

export const isPrototypeLaserHazard = (
  hazard: Readonly<LogicalHazard>,
): hazard is Readonly<LogicalHazardSpawnInstance> & {
  readonly behavior: Readonly<LaserHazardBehavior>;
} => isBehavioralLogicalHazard(hazard) && isLaserHazardBehavior(hazard.behavior);

/**
 * Resolves the current lethal-core geometry. Screen-span Lasers are anchored to the viewport for the
 * whole warning/fire sequence by expressing their current screen bounds back in world-run distance.
 */
export const resolvePrototypeLaserHitbox = (
  hazard: Readonly<LogicalHazard>,
  layout: Readonly<PrototypeLaserLayout>,
): Readonly<LogicalHitbox> | null => {
  if (!isPrototypeLaserHazard(hazard)) {
    return null;
  }
  assertLayout(layout);

  const behavior = hazard.behavior;
  const halfThickness = behavior.lethalThickness / 2;
  const authoredCenterX = (hazard.hitbox.left + hazard.hitbox.right) / 2;
  const authoredCenterY = (hazard.hitbox.top + hazard.hitbox.bottom) / 2;

  if (behavior.orientation === 'horizontal') {
    if (behavior.span === 'screen') {
      const left = layout.playerRunDistance - layout.playerScreenX;
      return Object.freeze({
        left,
        right: left + layout.viewportWidth,
        top: authoredCenterY - halfThickness,
        bottom: authoredCenterY + halfThickness,
      });
    }

    const halfLength = (behavior.finiteLength ?? 1) / 2;
    return Object.freeze({
      left: authoredCenterX - halfLength,
      right: authoredCenterX + halfLength,
      top: authoredCenterY - halfThickness,
      bottom: authoredCenterY + halfThickness,
    });
  }

  const centerX =
    behavior.span === 'screen'
      ? layout.playerRunDistance +
        layout.viewportWidth * (behavior.screenPositionRatio ?? 0.5) -
        layout.playerScreenX
      : authoredCenterX;
  if (behavior.span === 'screen') {
    return Object.freeze({
      left: centerX - halfThickness,
      right: centerX + halfThickness,
      top: 0,
      bottom: layout.viewportHeight,
    });
  }

  const halfLength = (behavior.finiteLength ?? 1) / 2;
  return Object.freeze({
    left: centerX - halfThickness,
    right: centerX + halfThickness,
    top: authoredCenterY - halfLength,
    bottom: authoredCenterY + halfLength,
  });
};
