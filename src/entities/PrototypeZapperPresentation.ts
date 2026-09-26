import type { GameObjects, Scene } from 'phaser';
import {
  type PrototypeVerticalOffsetOrProjection,
  resolveVerticalProjection,
} from '../game/PrototypeFlightLayout';
import type { LogicalHazardSpawnInstance } from '../generation/PatternSpawnScheduler';
import type { HazardGameplayState } from '../hazards/HazardReactionState';
import {
  getPrototypeZapperGrazePadding,
  isPrototypeZapperHazard,
  resolvePrototypeZapperGeometry,
} from '../hazards/PrototypeZapperHazard';
import type { TimedZapperLifecycleState, TimedZapperPhase } from '../hazards/TimedZapperLifecycle';
import {
  getTimedZapperLifecycle,
  type TimedZapperGameplayStateResolver,
  type TimedZapperSimulationState,
} from '../hazards/TimedZapperSimulation';
import type { RunMotionState } from '../systems/RunMotionSimulation';

export type PrototypeZapperPresentationState = 'on' | 'charge' | 'off' | 'disabled' | 'destroyed';

export interface PrototypeZapperPresentationStateSources {
  readonly resolveGameplayState?: TimedZapperGameplayStateResolver;
  readonly timedZappers?: Readonly<TimedZapperSimulationState>;
}

interface PrototypeZapperPresentationSample {
  readonly chargeProgress: number;
  readonly state: PrototypeZapperPresentationState;
}

const EMPTY_STATE_SOURCES: Readonly<PrototypeZapperPresentationStateSources> = Object.freeze({});

const ZAPPER_COLORS = Object.freeze({
  body: 0xffd166,
  charge: 0xff9f1c,
  disabled: 0x7d8597,
  glow: 0xff9f1c,
  white: 0xffffff,
});

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const resolveTimedPhase = (
  phase: TimedZapperPhase,
): Extract<PrototypeZapperPresentationState, 'on' | 'charge' | 'off'> => phase;

export const resolvePrototypeZapperPresentationSample = (
  spawn: Readonly<LogicalHazardSpawnInstance>,
  timedLifecycle: Readonly<TimedZapperLifecycleState> | null,
  gameplayState: HazardGameplayState = 'active',
): Readonly<PrototypeZapperPresentationSample> => {
  if (!isPrototypeZapperHazard(spawn)) {
    throw new TypeError('Zapper presentation state requires a Zapper spawn.');
  }

  if (gameplayState === 'destroyed') {
    return Object.freeze({ chargeProgress: 0, state: 'destroyed' });
  }
  if (gameplayState === 'disabled') {
    return Object.freeze({ chargeProgress: 0, state: 'disabled' });
  }

  if (!spawn.behavior.timing) {
    return Object.freeze({ chargeProgress: 1, state: 'on' });
  }
  if (!timedLifecycle || timedLifecycle.complete) {
    return Object.freeze({ chargeProgress: 0, state: 'off' });
  }

  const state = resolveTimedPhase(timedLifecycle.phase);
  const chargeProgress =
    state === 'charge'
      ? clamp01(timedLifecycle.elapsedPhaseSeconds / spawn.behavior.timing.chargeSeconds)
      : state === 'on'
        ? 1
        : 0;
  return Object.freeze({ chargeProgress, state });
};

const drawLine = (
  graphics: GameObjects.Graphics,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): void => {
  graphics.beginPath();
  graphics.moveTo(ax, ay);
  graphics.lineTo(bx, by);
  graphics.strokePath();
};

const drawDashedLine = (
  graphics: GameObjects.Graphics,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): void => {
  const dx = bx - ax;
  const dy = by - ay;
  const segmentCount = 7;
  for (let index = 0; index < segmentCount; index += 2) {
    const start = index / segmentCount;
    const end = Math.min(1, (index + 1) / segmentCount);
    drawLine(graphics, ax + dx * start, ay + dy * start, ax + dx * end, ay + dy * end);
  }
};

const drawDisabledEndpoint = (
  graphics: GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
): void => {
  graphics.strokeCircle(x, y, radius);
  const crossRadius = Math.max(3, radius * 0.45);
  drawLine(graphics, x - crossRadius, y - crossRadius, x + crossRadius, y + crossRadius);
  drawLine(graphics, x - crossRadius, y + crossRadius, x + crossRadius, y - crossRadius);
};

/** Draws every visible Zapper with the same Graphics layers from authoritative geometry and state. */
export class PrototypeZapperPresentation {
  private graphics?: GameObjects.Graphics;
  private destroyed = false;

  constructor(private readonly scene: Scene) {}

  render(
    spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
    runState: Readonly<RunMotionState>,
    playerScreenX: number,
    verticalProjection: PrototypeVerticalOffsetOrProjection = 0,
    stateSources: Readonly<PrototypeZapperPresentationStateSources> = EMPTY_STATE_SOURCES,
  ): void {
    if (this.destroyed) {
      return;
    }
    if (spawns.length === 0) {
      this.graphics?.clear();
      this.graphics?.setVisible(false);
      return;
    }

    this.ensureResources();
    const graphics = this.graphics;
    if (!graphics) {
      return;
    }

    const projection = resolveVerticalProjection(verticalProjection);
    const simulationSeconds = runState.simulationSeconds ?? 0;
    const resolveGameplayState = stateSources.resolveGameplayState;
    const timedZappers = stateSources.timedZappers;
    const camera = this.scene.cameras?.main;
    const cameraZoom = camera?.zoom && camera.zoom > 0 ? camera.zoom : 1;
    const viewportWidth = (camera?.width ?? Number.POSITIVE_INFINITY) / cameraZoom;
    const viewportHeight = (camera?.height ?? Number.POSITIVE_INFINITY) / cameraZoom;
    let hasVisibleZapper = false;

    graphics.clear();
    graphics.setVisible(true);
    graphics.setPosition(0, projection.offsetY);
    graphics.setScale?.(1, projection.scaleY);

    for (const spawn of spawns) {
      const geometry = resolvePrototypeZapperGeometry(spawn, simulationSeconds);
      if (!geometry) {
        continue;
      }
      const ax = playerScreenX + geometry.endpointA.center.x - runState.distance;
      const ay = geometry.endpointA.center.y;
      const bx = playerScreenX + geometry.endpointB.center.x - runState.distance;
      const by = geometry.endpointB.center.y;
      const beamWidth = geometry.beam.radius * 2;
      const endpointRadius = geometry.endpointA.radius;
      const padding = getPrototypeZapperGrazePadding(spawn);
      const visualPadding = Math.max(
        endpointRadius + padding.endpoints,
        beamWidth + padding.beam,
        32,
      );
      const left = Math.min(ax, bx) - visualPadding;
      const right = Math.max(ax, bx) + visualPadding;
      const top = projection.offsetY + (Math.min(ay, by) - visualPadding) * projection.scaleY;
      const bottom = projection.offsetY + (Math.max(ay, by) + visualPadding) * projection.scaleY;
      if (right < 0 || left > viewportWidth || bottom < 0 || top > viewportHeight) {
        continue;
      }

      const gameplayState = resolveGameplayState?.(spawn) ?? 'active';
      const timedLifecycle = timedZappers ? getTimedZapperLifecycle(timedZappers, spawn) : null;
      const sample = resolvePrototypeZapperPresentationSample(spawn, timedLifecycle, gameplayState);
      if (sample.state === 'destroyed') {
        continue;
      }

      hasVisibleZapper = true;

      this.drawZapper(
        graphics,
        ax,
        ay,
        bx,
        by,
        beamWidth,
        endpointRadius,
        sample,
        simulationSeconds,
      );
    }

    if (!hasVisibleZapper) {
      graphics.setVisible(false);
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

  private ensureResources(): void {
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics().setDepth(-50);
    }
  }

  private drawZapper(
    graphics: GameObjects.Graphics,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    beamWidth: number,
    endpointRadius: number,
    sample: Readonly<PrototypeZapperPresentationSample>,
    simulationSeconds: number,
  ): void {
    switch (sample.state) {
      case 'destroyed':
        return;
      case 'off':
        graphics.lineStyle(2, ZAPPER_COLORS.body, 0.32);
        graphics.strokeCircle(ax, ay, endpointRadius);
        graphics.strokeCircle(bx, by, endpointRadius);
        return;
      case 'disabled':
        graphics.lineStyle(2, ZAPPER_COLORS.disabled, 0.45);
        drawDisabledEndpoint(graphics, ax, ay, endpointRadius);
        drawDisabledEndpoint(graphics, bx, by, endpointRadius);
        return;
      case 'charge': {
        const pulse = 0.65 + 0.35 * Math.abs(Math.sin(simulationSeconds * 7));
        const width = Math.max(2, beamWidth * (0.25 + sample.chargeProgress * 0.5));
        graphics.lineStyle(width + 5, ZAPPER_COLORS.glow, 0.12 * pulse);
        drawDashedLine(graphics, ax, ay, bx, by);
        graphics.lineStyle(
          width,
          ZAPPER_COLORS.charge,
          (0.34 + sample.chargeProgress * 0.38) * pulse,
        );
        drawDashedLine(graphics, ax, ay, bx, by);
        graphics.lineStyle(2, ZAPPER_COLORS.body, 0.65 + sample.chargeProgress * 0.25);
        graphics.strokeCircle(ax, ay, endpointRadius + sample.chargeProgress * 3);
        graphics.strokeCircle(bx, by, endpointRadius + sample.chargeProgress * 3);
        return;
      }
      case 'on':
        graphics.lineStyle(beamWidth + 32, ZAPPER_COLORS.glow, 0.14);
        drawLine(graphics, ax, ay, bx, by);
        graphics.lineStyle(beamWidth + 18, ZAPPER_COLORS.glow, 0.24);
        drawLine(graphics, ax, ay, bx, by);
        graphics.lineStyle(beamWidth, ZAPPER_COLORS.body, 0.78);
        drawLine(graphics, ax, ay, bx, by);
        graphics.lineStyle(Math.max(2, beamWidth * 0.28), ZAPPER_COLORS.white, 0.9);
        drawLine(graphics, ax, ay, bx, by);
        graphics.fillStyle(ZAPPER_COLORS.glow, 0.14);
        graphics.fillCircle(ax, ay, endpointRadius + 12);
        graphics.fillCircle(bx, by, endpointRadius + 12);
        graphics.fillStyle(ZAPPER_COLORS.glow, 0.3);
        graphics.fillCircle(ax, ay, endpointRadius + 5);
        graphics.fillCircle(bx, by, endpointRadius + 5);
        graphics.fillStyle(ZAPPER_COLORS.body, 0.86);
        graphics.fillCircle(ax, ay, endpointRadius);
        graphics.fillCircle(bx, by, endpointRadius);
        graphics.fillStyle(ZAPPER_COLORS.white, 0.94);
        graphics.fillCircle(ax, ay, Math.max(3, endpointRadius * 0.32));
        graphics.fillCircle(bx, by, Math.max(3, endpointRadius * 0.32));
        return;
    }
  }
}
