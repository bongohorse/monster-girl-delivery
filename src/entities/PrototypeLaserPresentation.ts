import type { GameObjects, Scene } from 'phaser';
import {
  type PrototypeVerticalOffsetOrProjection,
  projectLogicalYToScreen,
  resolveVerticalProjection,
} from '../game/PrototypeFlightLayout';
import type { LogicalHazardSpawnInstance } from '../generation/PatternSpawnScheduler';
import { isPrototypeLaserHazard } from '../hazards/PrototypeLaserHazard';
import type { TimedLaserLifecycleState } from '../hazards/TimedLaserLifecycle';
import type { RunMotionState } from '../systems/RunMotionSimulation';

const LASER_EMITTER_RADIUS = 20;
const LASER_EMITTER_INSET = 18;

const getLogicalViewport = (scene: Scene): Readonly<{ height: number; width: number }> | null => {
  const camera = scene.cameras?.main;
  const zoom = camera?.zoom;
  if (
    !camera ||
    !Number.isFinite(camera.width) ||
    !Number.isFinite(camera.height) ||
    !Number.isFinite(zoom) ||
    zoom === undefined ||
    zoom <= 0
  ) {
    return null;
  }
  return Object.freeze({ width: camera.width / zoom, height: camera.height / zoom });
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Presentation-only renderer; lifecycle and collision remain Phaser-independent authorities. */
export class PrototypeLaserPresentation {
  private graphics?: GameObjects.Graphics;

  constructor(
    private readonly scene: Scene,
    private readonly hazard: Readonly<LogicalHazardSpawnInstance>,
  ) {
    if (!isPrototypeLaserHazard(hazard)) {
      throw new TypeError('PrototypeLaserPresentation requires a Laser hazard.');
    }
    this.graphics = scene.add.graphics().setDepth(-45);
  }

  render(
    runState: Readonly<RunMotionState>,
    playerScreenX: number,
    lifecycle: Readonly<TimedLaserLifecycleState> | null,
    verticalProjection: PrototypeVerticalOffsetOrProjection = 0,
  ): void {
    const graphics = this.graphics;
    const viewport = getLogicalViewport(this.scene);
    if (!graphics || !viewport || !isPrototypeLaserHazard(this.hazard)) {
      return;
    }

    const state = lifecycle ?? { complete: false, elapsedPhaseSeconds: 0, phase: 'off' as const };
    graphics.clear();
    if (state.complete) {
      graphics.setVisible(false);
      return;
    }
    graphics.setVisible(true);

    const behavior = this.hazard.behavior;
    const projection = resolveVerticalProjection(verticalProjection);
    const authoredCenterX = (this.hazard.hitbox.left + this.hazard.hitbox.right) / 2;
    const authoredCenterY = (this.hazard.hitbox.top + this.hazard.hitbox.bottom) / 2;
    const horizontal = behavior.orientation === 'horizontal';
    const screenCenterX = playerScreenX + authoredCenterX - runState.distance;
    const screenCenterY = projectLogicalYToScreen(authoredCenterY, projection);
    const finiteLength = behavior.finiteLength ?? 1;
    const beam = horizontal
      ? behavior.span === 'screen'
        ? { x1: 0, y1: screenCenterY, x2: viewport.width, y2: screenCenterY }
        : {
            x1: screenCenterX - finiteLength / 2,
            y1: screenCenterY,
            x2: screenCenterX + finiteLength / 2,
            y2: screenCenterY,
          }
      : behavior.span === 'screen'
        ? {
            x1: viewport.width * (behavior.screenPositionRatio ?? 0.5),
            y1: 0,
            x2: viewport.width * (behavior.screenPositionRatio ?? 0.5),
            y2: viewport.height,
          }
        : {
            x1: screenCenterX,
            y1: screenCenterY - (finiteLength * projection.scaleY) / 2,
            x2: screenCenterX,
            y2: screenCenterY + (finiteLength * projection.scaleY) / 2,
          };
    const phaseDuration =
      state.phase === 'off'
        ? behavior.lifecycle.offSeconds
        : state.phase === 'telegraph'
          ? behavior.lifecycle.telegraphSeconds
          : state.phase === 'charge'
            ? behavior.lifecycle.chargeSeconds
            : state.phase === 'on'
              ? behavior.lifecycle.onSeconds
              : behavior.lifecycle.recoverySeconds;
    const progress = clamp01(state.elapsedPhaseSeconds / phaseDuration);

    const beamAlpha =
      state.phase === 'off'
        ? 0
        : state.phase === 'telegraph'
          ? 0.42
          : state.phase === 'charge'
            ? 0.5 + 0.35 * progress
            : state.phase === 'on'
              ? 1
              : 0.45 * (1 - progress);
    const glowThickness =
      state.phase === 'on'
        ? behavior.visualGlowThickness
        : state.phase === 'charge'
          ? behavior.telegraphThickness +
            (behavior.visualGlowThickness * 0.55 - behavior.telegraphThickness) * progress
          : behavior.telegraphThickness;
    const coreThickness =
      state.phase === 'on'
        ? behavior.lethalThickness
        : state.phase === 'charge'
          ? behavior.telegraphThickness + 2 * progress
          : behavior.telegraphThickness;
    const thicknessScale = horizontal ? projection.scaleY : 1;

    const drawBeam = (thickness: number, color: number, alpha: number): void => {
      if (beamAlpha <= 0 || alpha <= 0) {
        return;
      }
      graphics.lineStyle(thickness * thicknessScale, color, alpha * beamAlpha);
      graphics.lineBetween(beam.x1, beam.y1, beam.x2, beam.y2);
    };

    if (state.phase !== 'off') {
      drawBeam(glowThickness, 0xff5a36, state.phase === 'on' ? 0.45 : 0.25);
      drawBeam(coreThickness, state.phase === 'on' ? 0xffffff : 0xff7043, 1);
      if (state.phase === 'on') {
        drawBeam(Math.max(3, coreThickness * 0.28), 0xfff5b5, 1);
      }
    }

    const chargePulse =
      state.phase === 'charge' ? 0.55 + 0.45 * Math.sin(progress * Math.PI * 8) ** 2 : 1;
    const emitterAlpha =
      state.phase === 'off'
        ? 0.32
        : state.phase === 'recovery'
          ? 0.75 * (1 - progress)
          : Math.min(1, (0.62 + 0.38 * progress) * chargePulse);
    const emitterColor = state.phase === 'on' ? 0xffffff : 0xff6b35;
    const drawEmitter = (x: number, y: number): void => {
      graphics
        .fillStyle(0xff3d1f, 0.24 * emitterAlpha)
        .fillCircle(x, y, LASER_EMITTER_RADIUS + 7)
        .fillStyle(0xff8c42, 0.65 * emitterAlpha)
        .fillCircle(x, y, LASER_EMITTER_RADIUS)
        .lineStyle(3, 0xffd166, Math.max(0.25, emitterAlpha))
        .strokeCircle(x, y, LASER_EMITTER_RADIUS)
        .fillStyle(emitterColor, Math.max(0.35, emitterAlpha))
        .fillCircle(x, y, 7);
    };

    if (behavior.span === 'screen') {
      if (horizontal) {
        drawEmitter(LASER_EMITTER_INSET, beam.y1);
        drawEmitter(viewport.width - LASER_EMITTER_INSET, beam.y2);
      } else {
        drawEmitter(beam.x1, LASER_EMITTER_INSET);
        drawEmitter(beam.x2, viewport.height - LASER_EMITTER_INSET);
      }
    } else {
      drawEmitter(beam.x1, beam.y1);
      drawEmitter(beam.x2, beam.y2);
    }

    // Coordinates above are resolved directly into logical screen space for both span modes.
    graphics.setPosition(0, 0);
    graphics.setScale?.(1, 1);
  }

  destroy(): void {
    if (!this.graphics) {
      return;
    }
    const graphics = this.graphics;
    this.graphics = undefined;
    graphics.destroy();
  }
}
