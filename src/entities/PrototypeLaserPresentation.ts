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
    _playerScreenX: number,
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
    const authoredCenterY = (this.hazard.hitbox.top + this.hazard.hitbox.bottom) / 2;
    const horizontal = behavior.orientation === 'horizontal';
    const axisPosition = horizontal
      ? projectLogicalYToScreen(authoredCenterY, projection)
      : viewport.width * (behavior.screenPositionRatio ?? 0.5);
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

    const drawBeam = (thickness: number, color: number, alpha: number): void => {
      if (beamAlpha <= 0 || alpha <= 0) {
        return;
      }
      graphics.lineStyle(thickness, color, alpha * beamAlpha);
      if (horizontal) {
        graphics.lineBetween(0, axisPosition, viewport.width, axisPosition);
      } else {
        graphics.lineBetween(axisPosition, 0, axisPosition, viewport.height);
      }
    };

    if (state.phase !== 'off') {
      drawBeam(glowThickness, 0xff5a36, state.phase === 'on' ? 0.45 : 0.25);
      drawBeam(coreThickness, state.phase === 'on' ? 0xffffff : 0xff7043, 1);
      if (state.phase === 'on') {
        drawBeam(Math.max(3, coreThickness * 0.28), 0xfff5b5, 1);
      }
    }

    const chargePulse = state.phase === 'charge' ? 0.55 + 0.45 * Math.sin(progress * Math.PI * 8) ** 2 : 1;
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

    if (horizontal) {
      drawEmitter(LASER_EMITTER_INSET, axisPosition);
      drawEmitter(viewport.width - LASER_EMITTER_INSET, axisPosition);
    } else {
      drawEmitter(axisPosition, LASER_EMITTER_INSET);
      drawEmitter(axisPosition, viewport.height - LASER_EMITTER_INSET);
    }

    // Screen-event Lasers are presentation-pinned, so the renderer never follows run-distance scroll.
    graphics.setPosition(0, 0);
    graphics.setScale?.(1, 1);
    void runState;
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
