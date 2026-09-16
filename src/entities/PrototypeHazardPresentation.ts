import type { GameObjects, Scene } from 'phaser';
import {
  type PrototypeVerticalOffsetOrProjection,
  resolveVerticalProjection,
} from '../game/PrototypeFlightLayout';
import {
  isBehavioralLogicalHazard,
  isTargetLockStrikeHazardBehavior,
  isTelegraphedHazardBehavior,
  resolveHazardHitboxAtRunDistance,
  resolveTargetLockStrikeHitbox,
} from '../hazards/HazardArchetype';
import {
  PROTOTYPE_PLACEHOLDER_HAZARD,
  projectHazardHitboxToScreen,
} from '../hazards/PrototypeHazard';
import {
  isPrototypeMissileBehavior,
  PROTOTYPE_MISSILE_WARNING_BLINK_SECONDS,
  PROTOTYPE_MISSILE_WARNING_EDGE_MARGIN,
  resolvePrototypeMissileTravelHitbox,
} from '../hazards/PrototypeMissileHazard';
import type {
  TelegraphedHazardLifecycleState,
  TelegraphedHazardPhase,
} from '../hazards/TelegraphedHazardLifecycle';
import type { LogicalHazard } from '../systems/HazardCollision';
import type { RunMotionState } from '../systems/RunMotionSimulation';

/** Temporary barrier presentation; logical collision and generated identity remain outside Phaser. */
export class PrototypeHazardPresentation {
  private graphics?: GameObjects.Graphics;
  private telegraphedPhase?: TelegraphedHazardPhase;

  constructor(
    private readonly scene: Scene,
    private readonly hazard: Readonly<LogicalHazard> = PROTOTYPE_PLACEHOLDER_HAZARD,
  ) {
    const graphics = scene.add.graphics().setDepth(-50);
    const moving = isBehavioralLogicalHazard(hazard) && hazard.behavior.kind === 'vertical-patrol';

    this.graphics = graphics;

    if (
      isBehavioralLogicalHazard(hazard) &&
      isTelegraphedHazardBehavior(hazard.behavior) &&
      hazard.behavior.kind !== 'laser'
    ) {
      this.drawTelegraphedPhase('warning');
      return;
    }

    const width = hazard.hitbox.right - hazard.hitbox.left;
    const height = hazard.hitbox.bottom - hazard.hitbox.top;
    graphics
      .fillStyle(moving ? 0x8a4fff : 0xd93f55, 1)
      .fillRoundedRect(0, 0, width, height, 6)
      .lineStyle(4, moving ? 0x6fffe9 : 0xffd166, 1)
      .strokeRoundedRect(0, 0, width, height, 6)
      .fillStyle(moving ? 0x6fffe9 : 0xffd166, 0.9);

    for (let y = 12; y < height - 8; y += 24) {
      graphics.fillTriangle(8, y, width - 8, y + 8, 8, y + 16);
    }
  }

  render(
    runState: Readonly<RunMotionState>,
    playerScreenX: number,
    lifecycle: Readonly<TelegraphedHazardLifecycleState> | null = null,
    verticalProjection: PrototypeVerticalOffsetOrProjection = 0,
    missileLaunchRelativeLeft: number | null = null,
  ): void {
    const graphics = this.graphics;

    if (!graphics) {
      return;
    }

    const projection = resolveVerticalProjection(verticalProjection);

    let screenHitbox = projectHazardHitboxToScreen(
      { hitbox: resolveHazardHitboxAtRunDistance(this.hazard, runState.distance) },
      runState,
      playerScreenX,
      projection,
    );

    if (
      isBehavioralLogicalHazard(this.hazard) &&
      isTelegraphedHazardBehavior(this.hazard.behavior) &&
      this.hazard.behavior.kind !== 'laser'
    ) {
      const phase = lifecycle?.phase ?? 'warning';
      this.drawTelegraphedPhase(phase);

      if (phase === 'expired') {
        return;
      }

      const target =
        lifecycle === null
          ? null
          : phase === 'warning'
            ? lifecycle.latestObservedTarget
            : (lifecycle.lockedTarget ?? lifecycle.latestObservedTarget);
      const reactive = isTargetLockStrikeHazardBehavior(this.hazard.behavior);
      const missile = reactive && isPrototypeMissileBehavior(this.hazard.behavior);
      const camera = this.scene.cameras?.main;
      const cameraZoom = camera?.zoom;
      const logicalViewportWidth =
        camera &&
        Number.isFinite(camera.width) &&
        Number.isFinite(cameraZoom) &&
        cameraZoom !== undefined &&
        cameraZoom > 0
          ? camera.width / cameraZoom
          : null;

      if (reactive && target) {
        const resolvedHitbox =
          missile && lifecycle && phase === 'active' && logicalViewportWidth !== null
            ? resolvePrototypeMissileTravelHitbox(
                this.hazard,
                target,
                lifecycle.elapsedPhaseSeconds,
                {
                  playerRunDistance: runState.distance,
                  playerScreenX,
                  viewportLeft: 0,
                  viewportRight: logicalViewportWidth,
                },
                missileLaunchRelativeLeft,
              )
            : resolveTargetLockStrikeHitbox(this.hazard, target.positionY);
        screenHitbox = projectHazardHitboxToScreen(
          { hitbox: resolvedHitbox },
          runState,
          playerScreenX,
          projection,
        );
      }

      if (phase === 'warning' || phase === 'lock') {
        const centerX = (screenHitbox.left + screenHitbox.right) / 2;
        const centerY = (screenHitbox.top + screenHitbox.bottom) / 2;
        const geometry = this.hazard.behavior.lifecycle.warningGeometry;
        screenHitbox = {
          left: centerX + geometry.leftOffset,
          right: centerX + geometry.rightOffset,
          top: centerY + geometry.topOffset * projection.scaleY,
          bottom: centerY + geometry.bottomOffset * projection.scaleY,
        };

        if (missile && logicalViewportWidth !== null) {
          const width = screenHitbox.right - screenHitbox.left;
          if (this.hazard.behavior.missile.launchSide === 'right') {
            const right = logicalViewportWidth - PROTOTYPE_MISSILE_WARNING_EDGE_MARGIN;
            screenHitbox = { ...screenHitbox, left: right - width, right };
          } else {
            const left = PROTOTYPE_MISSILE_WARNING_EDGE_MARGIN;
            screenHitbox = { ...screenHitbox, left, right: left + width };
          }
        }
      }

      if (missile && lifecycle && phase === 'warning') {
        const blinkIndex = Math.floor(
          lifecycle.elapsedPhaseSeconds / PROTOTYPE_MISSILE_WARNING_BLINK_SECONDS,
        );
        graphics.setVisible(blinkIndex % 2 === 0);
      } else {
        graphics.setVisible(true);
      }
    }

    graphics.setPosition(screenHitbox.left, screenHitbox.top);
    graphics.setScale?.(1, projection.scaleY);
  }

  private drawTelegraphedPhase(phase: TelegraphedHazardPhase): void {
    const graphics = this.graphics;
    if (
      !graphics ||
      this.telegraphedPhase === phase ||
      !isBehavioralLogicalHazard(this.hazard) ||
      !isTelegraphedHazardBehavior(this.hazard.behavior) ||
      this.hazard.behavior.kind === 'laser'
    ) {
      return;
    }

    this.telegraphedPhase = phase;
    graphics.clear();
    graphics.setVisible(phase !== 'expired');

    if (phase === 'expired') {
      return;
    }

    const warningGeometry = this.hazard.behavior.lifecycle.warningGeometry;
    const warningWidth = warningGeometry.rightOffset - warningGeometry.leftOffset;
    const warningHeight = warningGeometry.bottomOffset - warningGeometry.topOffset;
    const activeWidth = this.hazard.hitbox.right - this.hazard.hitbox.left;
    const activeHeight = isTargetLockStrikeHazardBehavior(this.hazard.behavior)
      ? this.hazard.behavior.strikeHeight
      : this.hazard.hitbox.bottom - this.hazard.hitbox.top;
    const safePhase = phase === 'warning' || phase === 'lock';
    const width = safePhase ? warningWidth : activeWidth;
    const height = safePhase ? warningHeight : activeHeight;
    const reactive = isTargetLockStrikeHazardBehavior(this.hazard.behavior);
    const missile = reactive && isPrototypeMissileBehavior(this.hazard.behavior);
    const fillColor = reactive
      ? phase === 'warning'
        ? 0x6fffe9
        : phase === 'lock'
          ? missile
            ? 0xff9f1c
            : 0x3a86ff
          : 0xff2d95
      : phase === 'warning'
        ? 0xffd166
        : phase === 'lock'
          ? 0xff9f1c
          : 0xf72545;
    const fillAlpha =
      phase === 'warning' ? 0.16 : phase === 'lock' ? (missile ? 0.64 : 0.36) : 0.95;
    const strokeColor =
      phase === 'active' || (missile && phase === 'lock')
        ? 0xffffff
        : reactive
          ? 0x6fffe9
          : 0xffd166;
    const lineWidth = phase === 'warning' ? 3 : missile && phase === 'lock' ? 6 : 5;

    graphics
      .fillStyle(fillColor, fillAlpha)
      .fillRoundedRect(0, 0, width, height, 8)
      .lineStyle(lineWidth, strokeColor, 1)
      .strokeRoundedRect(0, 0, width, height, 8)
      .fillStyle(strokeColor, phase === 'warning' ? 0.45 : 0.9);

    for (let y = 10; y < height - 8; y += 20) {
      graphics.fillTriangle(8, y, width - 8, y + 6, 8, y + 12);
    }
  }

  destroy(): void {
    const graphics = this.graphics;

    if (!graphics) {
      return;
    }

    this.graphics = undefined;
    graphics.destroy();
  }
}
