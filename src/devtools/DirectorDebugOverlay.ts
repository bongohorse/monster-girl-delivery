import type { GameObjects, Scene } from 'phaser';
import type { ViewportSnapshot } from '../core/ViewportService';
import {
  createPrototypeFlightBounds,
  getPrototypePlayerX,
  getPrototypeVerticalProjection,
  type PrototypeVerticalProjection,
  projectLogicalYToScreen,
} from '../game/PrototypeFlightLayout';
import {
  getLogicalCollectibleSpawnIdentity,
  type LogicalCollectibleSpawnInstance,
} from '../generation/GeneratedCollectibles';
import { PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG } from '../generation/GeneratedHazardStream';
import type { LogicalHazardSpawnInstance } from '../generation/PatternSpawnScheduler';
import {
  isTargetLockStrikeHazardBehavior,
  isTelegraphedHazardBehavior,
  resolveHazardHitboxAtRunDistance,
  resolveTargetLockStrikeHitbox,
} from '../hazards/HazardArchetype';
import { projectHazardHitboxToScreen } from '../hazards/PrototypeHazard';
import {
  isPrototypeMissileBehavior,
  PROTOTYPE_MISSILE_WARNING_EDGE_MARGIN,
  resolvePrototypeMissileTravelHitbox,
} from '../hazards/PrototypeMissileHazard';
import { resolvePrototypeZapperGeometry } from '../hazards/PrototypeZapperHazard';
import {
  getPrototypeMissileLaunchRelativeLeft,
  getTelegraphedHazardLifecycle,
  type TelegraphedHazardSimulationState,
} from '../hazards/TelegraphedHazardSimulation';
import {
  getTimedZapperLifecycle,
  type TimedZapperSimulationState,
} from '../hazards/TimedZapperSimulation';
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
  | 'despawn-indicator'
  | 'flight-ceiling'
  | 'flight-floor'
  | 'scheduling-boundary';

export type DirectorDebugPathKind = 'hazard-lethal' | 'hazard-preview';

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

export interface DirectorDebugPoint {
  readonly x: number;
  readonly y: number;
}

export interface DirectorDebugPath {
  readonly color: number;
  readonly kind: DirectorDebugPathKind;
  readonly points: ReadonlyArray<Readonly<DirectorDebugPoint>>;
}

export interface DirectorDebugLabel {
  readonly color: number;
  readonly text: string;
  readonly x: number;
  readonly y: number;
}

export interface DirectorDebugGeometry {
  readonly labels: ReadonlyArray<Readonly<DirectorDebugLabel>>;
  readonly lines: ReadonlyArray<Readonly<DirectorDebugLine>>;
  readonly paths: ReadonlyArray<Readonly<DirectorDebugPath>>;
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
  readonly timedZappers?: Readonly<TimedZapperSimulationState>;
  readonly viewport: Readonly<ViewportSnapshot>;
}

const projectLogicalHitbox = (
  hitbox: Readonly<LogicalHitbox>,
  motion: Readonly<RunMotionState>,
  playerScreenX: number,
  projection: Readonly<PrototypeVerticalProjection>,
): Readonly<LogicalHitbox> =>
  projectHazardHitboxToScreen({ hitbox }, motion, playerScreenX, projection);

const projectLogicalPoint = (
  point: Readonly<DirectorDebugPoint>,
  motion: Readonly<RunMotionState>,
  playerScreenX: number,
  projection: Readonly<PrototypeVerticalProjection>,
): Readonly<DirectorDebugPoint> =>
  Object.freeze({
    x: playerScreenX + point.x - motion.distance,
    y: projectLogicalYToScreen(point.y, projection),
  });

const createProjectedCirclePath = (
  center: Readonly<DirectorDebugPoint>,
  radius: number,
  color: number,
  kind: DirectorDebugPathKind,
  motion: Readonly<RunMotionState>,
  playerScreenX: number,
  projection: Readonly<PrototypeVerticalProjection>,
): Readonly<DirectorDebugPath> => {
  const points: DirectorDebugPoint[] = [];
  const segmentCount = 24;
  for (let index = 0; index < segmentCount; index += 1) {
    const radians = (index / segmentCount) * Math.PI * 2;
    points.push(
      projectLogicalPoint(
        {
          x: center.x + Math.cos(radians) * radius,
          y: center.y + Math.sin(radians) * radius,
        },
        motion,
        playerScreenX,
        projection,
      ),
    );
  }
  return Object.freeze({ color, kind, points: Object.freeze(points) });
};

const createProjectedCapsulePath = (
  start: Readonly<DirectorDebugPoint>,
  end: Readonly<DirectorDebugPoint>,
  radius: number,
  color: number,
  kind: DirectorDebugPathKind,
  motion: Readonly<RunMotionState>,
  playerScreenX: number,
  projection: Readonly<PrototypeVerticalProjection>,
): Readonly<DirectorDebugPath> => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return createProjectedCirclePath(start, radius, color, kind, motion, playerScreenX, projection);
  }

  const tangentAngle = Math.atan2(dy, dx);
  const normalAngle = tangentAngle + Math.PI / 2;
  const points: DirectorDebugPoint[] = [];
  const pushPoint = (center: Readonly<DirectorDebugPoint>, radians: number) => {
    points.push(
      projectLogicalPoint(
        {
          x: center.x + Math.cos(radians) * radius,
          y: center.y + Math.sin(radians) * radius,
        },
        motion,
        playerScreenX,
        projection,
      ),
    );
  };

  pushPoint(start, normalAngle);
  pushPoint(end, normalAngle);
  const capSegments = 8;
  for (let index = 1; index <= capSegments; index += 1) {
    pushPoint(end, normalAngle - (Math.PI * index) / capSegments);
  }
  pushPoint(start, normalAngle - Math.PI);
  for (let index = 1; index <= capSegments; index += 1) {
    pushPoint(start, normalAngle - Math.PI - (Math.PI * index) / capSegments);
  }

  return Object.freeze({ color, kind, points: Object.freeze(points) });
};

const resolveCurrentHazardHitbox = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
  runDistance: number,
  telegraphedHazards: Readonly<TelegraphedHazardSimulationState>,
  playerScreenX: number,
  viewport: Readonly<ViewportSnapshot>,
): Readonly<LogicalHitbox> | null => {
  const lifecycle = getTelegraphedHazardLifecycle(telegraphedHazards, spawn);
  if (lifecycle?.phase === 'expired') {
    return null;
  }

  if (isTargetLockStrikeHazardBehavior(spawn.behavior) && lifecycle) {
    const target = lifecycle.lockedTarget ?? lifecycle.latestObservedTarget;
    const targetHitbox = resolveTargetLockStrikeHitbox(spawn, target.positionY);

    if (isPrototypeMissileBehavior(spawn.behavior)) {
      if (lifecycle.phase === 'active') {
        return resolvePrototypeMissileTravelHitbox(
          spawn,
          target,
          lifecycle.elapsedPhaseSeconds,
          {
            playerRunDistance: runDistance,
            playerScreenX,
            viewportLeft: 0,
            viewportRight: viewport.width,
          },
          getPrototypeMissileLaunchRelativeLeft(telegraphedHazards, spawn),
        );
      }

      const geometry = spawn.behavior.lifecycle.warningGeometry;
      const warningWidth = geometry.rightOffset - geometry.leftOffset;
      const targetCenterY = (targetHitbox.top + targetHitbox.bottom) / 2;
      const screenLeft =
        spawn.behavior.missile.launchSide === 'right'
          ? viewport.width - PROTOTYPE_MISSILE_WARNING_EDGE_MARGIN - warningWidth
          : PROTOTYPE_MISSILE_WARNING_EDGE_MARGIN;
      const worldLeft = runDistance + screenLeft - playerScreenX;
      return Object.freeze({
        left: worldLeft,
        right: worldLeft + warningWidth,
        top: targetCenterY + geometry.topOffset,
        bottom: targetCenterY + geometry.bottomOffset,
      });
    }

    return targetHitbox;
  }

  return resolveHazardHitboxAtRunDistance(spawn, runDistance);
};

const isHazardCurrentlyLethal = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
  telegraphedHazards: Readonly<TelegraphedHazardSimulationState>,
  timedZappers?: Readonly<TimedZapperSimulationState>,
): boolean => {
  if (spawn.behavior.kind === 'zapper' && spawn.behavior.timing) {
    const timedLifecycle = timedZappers ? getTimedZapperLifecycle(timedZappers, spawn) : null;
    return timedLifecycle?.phase === 'on' && !timedLifecycle.complete;
  }

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
  const paths: DirectorDebugPath[] = [];

  for (const spawn of frame.hazards) {
    const lethal = isHazardCurrentlyLethal(
      spawn,
      frame.telegraphedHazards,
      frame.timedZappers,
    );
    const kind = lethal ? 'hazard-lethal' : 'hazard-preview';
    const color = lethal ? DIRECTOR_DEBUG_COLORS.hazardLethal : DIRECTOR_DEBUG_COLORS.hazardPreview;
    const zapper = resolvePrototypeZapperGeometry(spawn, frame.motion.simulationSeconds ?? 0);
    if (zapper) {
      paths.push(
        createProjectedCapsulePath(
          zapper.beam.start,
          zapper.beam.end,
          zapper.beam.radius,
          color,
          kind,
          frame.motion,
          playerScreenX,
          projection,
        ),
        createProjectedCirclePath(
          zapper.endpointA.center,
          zapper.endpointA.radius,
          color,
          kind,
          frame.motion,
          playerScreenX,
          projection,
        ),
        createProjectedCirclePath(
          zapper.endpointB.center,
          zapper.endpointB.radius,
          color,
          kind,
          frame.motion,
          playerScreenX,
          projection,
        ),
      );
      continue;
    }

    const hitbox = resolveCurrentHazardHitbox(
      spawn,
      frame.motion.distance,
      frame.telegraphedHazards,
      playerScreenX,
      frame.viewport,
    );
    if (!hitbox) {
      continue;
    }

    rectangles.push({
      kind,
      color,
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
  const despawnX = playerScreenX - PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG.retainBehindDistance;
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
      x1: despawnX,
      y1: safeArea.top,
      x2: despawnX,
      y2: safeArea.bottom,
    },
  ];
  const labels: DirectorDebugLabel[] = [];

  if (despawnX < 0) {
    lines.push({
      kind: 'despawn-indicator',
      color: DIRECTOR_DEBUG_COLORS.despawnBoundary,
      x1: 1,
      y1: safeArea.top,
      x2: 1,
      y2: safeArea.bottom,
    });
    labels.push({
      color: DIRECTOR_DEBUG_COLORS.despawnBoundary,
      text: `DESPAWN ← ${Math.round(-despawnX)}px`,
      x: 4,
      y: safeArea.top + 4,
    });
  }

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
    labels: Object.freeze(labels),
    lines: Object.freeze(lines),
    paths: Object.freeze(paths),
    rectangles: Object.freeze(rectangles),
  });
};

/** Development-only 1px geometry overlay driven directly from authoritative MGD state. */
export class DirectorDebugOverlay {
  private graphics?: GameObjects.Graphics;
  private despawnLabel?: GameObjects.Text;
  private destroyed = false;
  private enabled = false;
  private textResolution = 1;

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
      this.syncTextResolution();

      const despawnLabel =
        this.despawnLabel ??
        this.scene.add
          .text(0, 0, '', {
            color: '#ff4dff',
            fontFamily: 'monospace',
            fontSize: '10px',
          })
          .setResolution(this.textResolution)
          .setScrollFactor(0)
          .setDepth(9_501)
          .setVisible(false);
      this.despawnLabel = despawnLabel;
      return;
    }

    this.graphics?.clear();
    this.graphics?.setVisible(false);
    this.despawnLabel?.setVisible(false);
  }

  render(frame: Readonly<DirectorDebugOverlayFrame>): void {
    const graphics = this.graphics;
    if (this.destroyed || !this.enabled || !graphics) {
      return;
    }

    this.syncTextResolution();
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

    for (const path of geometry.paths) {
      const first = path.points[0];
      if (!first) {
        continue;
      }
      graphics.lineStyle(1, path.color, 1);
      graphics.beginPath();
      graphics.moveTo(first.x, first.y);
      for (const point of path.points.slice(1)) {
        graphics.lineTo(point.x, point.y);
      }
      graphics.lineTo(first.x, first.y);
      graphics.strokePath();
    }

    for (const line of geometry.lines) {
      graphics.lineStyle(1, line.color, 1);
      graphics.beginPath();
      graphics.moveTo(line.x1, line.y1);
      graphics.lineTo(line.x2, line.y2);
      graphics.strokePath();
    }

    const label = geometry.labels[0];
    if (label) {
      this.despawnLabel?.setPosition(label.x, label.y).setText(label.text).setVisible(true);
    } else {
      this.despawnLabel?.setVisible(false);
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.graphics?.destroy();
    this.graphics = undefined;
    this.despawnLabel?.destroy();
    this.despawnLabel = undefined;
  }

  private syncTextResolution(): void {
    const resolution = this.scene.cameras.main.zoom;
    if (resolution === this.textResolution) {
      return;
    }

    this.textResolution = resolution;
    this.despawnLabel?.setResolution(resolution);
  }
}
