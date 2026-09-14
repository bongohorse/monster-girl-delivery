import type { GameObjects, Scene } from 'phaser';
import type { ViewportSnapshot } from '../core/ViewportService';
import {
  getLogicalCollectibleSpawnIdentity,
  type LogicalCollectibleSpawnInstance,
} from '../generation/GeneratedCollectibles';
import { PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG } from '../generation/GeneratedHazardStream';
import type { LogicalHazardSpawnInstance } from '../generation/PatternSpawnScheduler';
import {
  createPrototypeFlightBounds,
  getPrototypePlayerX,
  getPrototypeVerticalProjection,
  projectLogicalYToScreen,
  type PrototypeVerticalProjection,
} from '../game/PrototypeFlightLayout';
import {
  isTargetLockStrikeHazardBehavior,
  isTelegraphedHazardBehavior,
  resolveHazardHitboxAtRunDistance,
  resolveTargetLockStrikeHitbox,
} from '../hazards/HazardArchetype';
import { projectHazardHitboxToScreen } from '../hazards/PrototypeHazard';
import {
  getTelegraphedHazardLifecycle,
  type TelegraphedHazardSimulationState,
} from '../hazards/TelegraphedHazardSimulation';
import {
  createPrototypePlayerHitbox,
  type LogicalHitbox,
  PROTOTYPE_PLAYER_COLLISION_EXTENTS,
} from '../systems/HazardCollision';
import { PROTOTYPE_COLLECTIBLE_HALF_SIZE } from '../systems/PrototypeCollectibles';
import { PROTOTYPE_PLAYER_GRAZE_EXTENTS } from '../systems/PrototypeGraze';
import type { RunMotionState } from '../systems/RunMotionSimulation';
import type { VerticalFlightState } from '../systems/VerticalFlightSimulation';

export const DIRECTOR_DEBUG_COLORS = Object.freeze({
  collectible: 0x52ff9d,
  despawnBoundary: 0xff4dff,
  flightBounds: 0x9be7ff,
  hazardLethal: 0xff375f,
  hazardPreview: 0xffd166,
  playerCore: 0x00f0ff,
  playerGraze: 0x3a86ff,
  safeArea: 0xffffff,
  schedulingBoundary: 0xa970ff,
  viewport: 0x7d8597,
});

export type DirectorDebugRectangleKind =
  | 'collectible'
  | 'hazard-lethal'
  | 'hazard-preview'
  | 'player-core'
  | 'player-graze'
  | 'safe-area'
  | 'viewport';

export type DirectorDebugLineKind =
  | 'despawn-boundary'
  | 'flight-ceiling'
  | 'flight-floor'
  | 'scheduling-boundary';

export interface DirectorDebugRectangle {
  readonly color: number;
  readonly hitbox: Readonly<LogicalHitbox>;
  readonly kind: DirectorDebugRectangleKind;
}

export interface DirectorDebugLine {
  readonly color: number;
  readonly kind: DirectorDebugLineKind;
  readonly x1: number;
  readonly x2: number;
  readonly y1: number;
  readonly y2: number;
}

export interface DirectorDebugGeometry {
  readonly lines: ReadonlyArray<Readonly<DirectorDebugLine>>;
  readonly rectangles: ReadonlyArray<Readonly<DirectorDebugRectangle>>;
}

export interface DirectorDebugOverlayFrame {
  readonly collectibles: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>>;
  readonly consumedCollectibleIds: ReadonlyArray<string>;
  readonly flight: Readonly<VerticalFlightState>;
  readonly hazards: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>;
  readonly motion: Readonly<RunMotionState>;
  readonly nextPatternStartDistance: number | null;
  readonly telegraphedHazards: Readonly<TelegraphedHazardSimulationState>;
  readonly viewport: Readonly<ViewportSnapshot>;
}

const projectLogicalHitbox = (
  hitbox: Readonly<LogicalHitbox>,
  motion: Readonly<RunMotionState>,
  playerScreenX: number,
  projection: Readonly<PrototypeVerticalProjection>,
): Readonly<LogicalHitbox> =>
  projectHazardHitboxToScreen({ hitbox }, motion, playerScreenX, projection);

const resolveCurrentHazardHitbox = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
  runDistance: number,
  telegraphedHazards: Readonly<TelegraphedHazardSimulationState>,
): Readonly<LogicalHitbox> | null => {
  const lifecycle = getTelegraphedHazardLifecycle(telegraphedHazards, spawn);
  if (lifecycle?.phase === 'expired') {
    return null;
  }

  if (isTargetLockStrikeHazardBehavior(spawn.behavior) && lifecycle) {
    const target = lifecycle.lockedTarget ?? lifecycle.latestObservedTarget;
    return resolveTargetLockStrikeHitbox(spawn, target.positionY);
  }

  return resolveHazardHitboxAtRunDistance(spawn, runDistance);
};

const isHazardCurrentlyLethal = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
  telegraphedHazards: Readonly<TelegraphedHazardSimulationState>,
): boolean => {
  if (!isTelegraphedHazardBehavior(spawn.behavior)) {
    return true;
  }

  return getTelegraphedHazardLifecycle(telegraphedHazards, spawn)?.phase === 'active';
};

const createSafeAreaHitbox = (viewport: Readonly<ViewportSnapshot>): Readonly<LogicalHitbox> => {
  const left = Math.min(viewport.width, viewport.safeArea.left);
  const rightInset = Math.min(viewport.width - left, viewport.safeArea.right);
  const top = Math.min(viewport.height, viewport.safeArea.top);
  const bottomInset = Math.min(viewport.height - top, viewport.safeArea.bottom);

  return {
    left,
    right: viewport.width - rightInset,
    top,
    bottom: viewport.height - bottomInset,
  };
};

export const createDirectorDebugGeometry = (
  frame: Readonly<DirectorDebugOverlayFrame>,
): Readonly<DirectorDebugGeometry> => {
  const playerScreenX = getPrototypePlayerX(frame.viewport);
  const projection = getPrototypeVerticalProjection(frame.viewport);
  const safeArea = createSafeAreaHitbox(frame.viewport);
  const rectangles: DirectorDebugRectangle[] = [
    {
      kind: 'viewport',
      color: DIRECTOR_DEBUG_COLORS.viewport,
      hitbox: { left: 0, right: frame.viewport.width, top: 0, bottom: frame.viewport.height },
    },
    { kind: 'safe-area', color: DIRECTOR_DEBUG_COLORS.safeArea, hitbox: safeArea },
    {
      kind: 'player-graze',
      color: DIRECTOR_DEBUG_COLORS.playerGraze,
      hitbox: projectLogicalHitbox(
        createPrototypePlayerHitbox(frame.motion, frame.flight, PROTOTYPE_PLAYER_GRAZE_EXTENTS),
        frame.motion,
        playerScreenX,
        projection,
      ),
    },
    {
      kind: 'player-core',
      color: DIRECTOR_DEBUG_COLORS.playerCore,
      hitbox: projectLogicalHitbox(
        createPrototypePlayerHitbox(frame.motion, frame.flight, PROTOTYPE_PLAYER_COLLISION_EXTENTS),
        frame.motion,
        playerScreenX,
        projection,
      ),
    },
  ];

  for (const spawn of frame.hazards) {
    const hitbox = resolveCurrentHazardHitbox(
      spawn,
      frame.motion.distance,
      frame.telegraphedHazards,
    );
    if (!hitbox) {
      continue;
    }

    const lethal = isHazardCurrentlyLethal(spawn, frame.telegraphedHazards);
    rectangles.push({
      kind: lethal ? 'hazard-lethal' : 'hazard-preview',
      color: lethal ? DIRECTOR_DEBUG_COLORS.hazardLethal : DIRECTOR_DEBUG_COLORS.hazardPreview,
      hitbox: projectLogicalHitbox(hitbox, frame.motion, playerScreenX, projection),
    });
  }

  const consumedCollectibles = new Set(frame.consumedCollectibleIds);
  for (const collectible of frame.collectibles) {
    if (consumedCollectibles.has(getLogicalCollectibleSpawnIdentity(collectible))) {
      continue;
    }

    rectangles.push({
      kind: 'collectible',
      color: DIRECTOR_DEBUG_COLORS.collectible,
      hitbox: projectLogicalHitbox(
        {
          left: collectible.runDistance - PROTOTYPE_COLLECTIBLE_HALF_SIZE,
          right: collectible.runDistance + PROTOTYPE_COLLECTIBLE_HALF_SIZE,
          top: collectible.y - PROTOTYPE_COLLECTIBLE_HALF_SIZE,
          bottom: collectible.y + PROTOTYPE_COLLECTIBLE_HALF_SIZE,
        },
        frame.motion,
        playerScreenX,
        projection,
      ),
    });
  }

  const flightBounds = createPrototypeFlightBounds(frame.viewport);
  const ceilingY = projectLogicalYToScreen(flightBounds.ceilingY, projection);
  const floorY = projectLogicalYToScreen(flightBounds.floorY, projection);
  const lines: DirectorDebugLine[] = [
    {
      kind: 'flight-ceiling',
      color: DIRECTOR_DEBUG_COLORS.flightBounds,
      x1: safeArea.left,
      y1: ceilingY,
      x2: safeArea.right,
      y2: ceilingY,
    },
    {
      kind: 'flight-floor',
      color: DIRECTOR_DEBUG_COLORS.flightBounds,
      x1: safeArea.left,
      y1: floorY,
      x2: safeArea.right,
      y2: floorY,
    },
    {
      kind: 'despawn-boundary',
      color: DIRECTOR_DEBUG_COLORS.despawnBoundary,
      x1: playerScreenX - PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG.retainBehindDistance,
      y1: safeArea.top,
      x2: playerScreenX - PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG.retainBehindDistance,
      y2: safeArea.bottom,
    },
  ];

  if (frame.nextPatternStartDistance !== null && Number.isFinite(frame.nextPatternStartDistance)) {
    const schedulingX = playerScreenX + frame.nextPatternStartDistance - frame.motion.distance;
    lines.push({
      kind: 'scheduling-boundary',
      color: DIRECTOR_DEBUG_COLORS.schedulingBoundary,
      x1: schedulingX,
      y1: safeArea.top,
      x2: schedulingX,
      y2: safeArea.bottom,
    });
  }

  return Object.freeze({
    lines: Object.freeze(lines),
    rectangles: Object.freeze(rectangles),
  });
};

/** Development-only 1px geometry overlay driven directly from authoritative MGD state. */
export class DirectorDebugOverlay {
  private graphics?: GameObjects.Graphics;
  private destroyed = false;
  private enabled = false;

  constructor(private readonly scene: Scene) {}

  setEnabled(enabled: boolean): void {
    if (this.destroyed || this.enabled === enabled) {
      return;
    }

    this.enabled = enabled;
    if (enabled) {
      const graphics =
        this.graphics ??
        this.scene.add.graphics().setScrollFactor(0).setDepth(9_500).setVisible(true);
      this.graphics = graphics;
      graphics.setVisible(true);
      return;
    }

    this.graphics?.clear();
    this.graphics?.setVisible(false);
  }

  render(frame: Readonly<DirectorDebugOverlayFrame>): void {
    const graphics = this.graphics;
    if (this.destroyed || !this.enabled || !graphics) {
      return;
    }

    const geometry = createDirectorDebugGeometry(frame);
    graphics.clear();

    for (const rectangle of geometry.rectangles) {
      const { hitbox } = rectangle;
      graphics.lineStyle(1, rectangle.color, 1);
      graphics.strokeRect(
        hitbox.left,
        hitbox.top,
        hitbox.right - hitbox.left,
        hitbox.bottom - hitbox.top,
      );
    }

    for (const line of geometry.lines) {
      graphics.lineStyle(1, line.color, 1);
      graphics.beginPath();
      graphics.moveTo(line.x1, line.y1);
      graphics.lineTo(line.x2, line.y2);
      graphics.strokePath();
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.graphics?.destroy();
    this.graphics = undefined;
  }
}
