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

export const PROTOTYPE_ZAPPER_SHARED_SHADER_CAPACITY = 12;

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

const ZAPPER_STATE_CODE: Readonly<Record<PrototypeZapperPresentationState, number>> = Object.freeze(
  {
    off: 0,
    charge: 1,
    on: 2,
    disabled: 3,
    destroyed: 4,
  },
);

const ZAPPER_COLORS = Object.freeze({
  body: 0xffd166,
  charge: 0xff9f1c,
  disabled: 0x7d8597,
  glow: 0xff9f1c,
  white: 0xffffff,
});

const PROTOTYPE_ZAPPER_SHARED_FRAGMENT_SHADER = `
precision mediump float;

#define MAX_ZAPPERS ${PROTOTYPE_ZAPPER_SHARED_SHADER_CAPACITY}

varying vec2 outTexCoord;
uniform float uCount;
uniform float uTime;
uniform vec2 uQuadOrigin;
uniform vec2 uQuadSize;
uniform vec2 uProjectionY;
uniform vec4 uSegments[MAX_ZAPPERS];
uniform vec4 uParams[MAX_ZAPPERS];

float capsuleDistance(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float denominator = max(dot(ab, ab), 0.0001);
  float t = clamp(dot(p - a, ab) / denominator, 0.0, 1.0);
  return length(p - (a + ab * t));
}

float ringMask(float distanceFromCenter, float radius, float thickness) {
  return 1.0 - smoothstep(thickness, thickness + 1.0, abs(distanceFromCenter - radius));
}

vec4 layerOver(vec4 under, vec4 overColor) {
  float alpha = overColor.a + under.a * (1.0 - overColor.a);
  if (alpha <= 0.0001) {
    return vec4(0.0);
  }
  vec3 rgb =
    (overColor.rgb * overColor.a + under.rgb * under.a * (1.0 - overColor.a)) / alpha;
  return vec4(rgb, alpha);
}

void main() {
  float screenY = uQuadOrigin.y + (1.0 - outTexCoord.y) * uQuadSize.y;
  vec2 p = vec2(
    uQuadOrigin.x + outTexCoord.x * uQuadSize.x,
    (screenY - uProjectionY.x) / max(uProjectionY.y, 0.0001)
  );
  vec4 color = vec4(0.0);

  for (int i = 0; i < MAX_ZAPPERS; i++) {
    if (float(i) < uCount) {
      vec4 segment = uSegments[i];
      vec4 params = uParams[i];
      vec2 a = segment.xy;
      vec2 b = segment.zw;
      float beamRadius = params.x;
      float endpointRadius = params.y;
      float state = params.z;
      float charge = params.w;

      if (state < 3.5) {
        vec2 ab = b - a;
        float segmentLength = max(length(ab), 0.0001);
        float along = clamp(dot(p - a, ab) / (segmentLength * segmentLength), 0.0, 1.0);
        // The rendered beam follows the same straight capsule as collision at every angle.
        float beamDistance = capsuleDistance(p, a, b);
        float endpointDistance = min(length(p - a), length(p - b));
        float flicker = 0.92 + 0.08 * sin(uTime * 29.0 + float(i) * 4.73);

        if (state > 1.5 && state < 2.5) {
          float glow = 1.0 - smoothstep(beamRadius + 3.0, beamRadius + 13.0, beamDistance);
          float body = 1.0 - smoothstep(beamRadius - 1.0, beamRadius + 1.0, beamDistance);
          float core = 1.0 - smoothstep(max(1.0, beamRadius * 0.28), max(2.0, beamRadius * 0.5), beamDistance);
          float nodeGlow = 1.0 - smoothstep(endpointRadius + 2.0, endpointRadius + 11.0, endpointDistance);
          float nodeBody = 1.0 - smoothstep(endpointRadius - 1.0, endpointRadius + 1.0, endpointDistance);
          float nodeCore = 1.0 - smoothstep(endpointRadius * 0.28, endpointRadius * 0.48, endpointDistance);

          color = layerOver(color, vec4(1.0, 0.48, 0.08, glow * 0.20 * flicker));
          color = layerOver(color, vec4(1.0, 0.82, 0.40, body * 0.74 * flicker));
          color = layerOver(color, vec4(1.0, 1.0, 1.0, core * 0.92 * flicker));
          color = layerOver(color, vec4(1.0, 0.48, 0.08, nodeGlow * 0.24 * flicker));
          color = layerOver(color, vec4(1.0, 0.82, 0.40, nodeBody * 0.82 * flicker));
          color = layerOver(color, vec4(1.0, 1.0, 1.0, nodeCore * 0.95));
        } else if (state > 0.5 && state < 1.5) {
          float dashWave = sin(along * 57.0 - uTime * 13.0);
          float dash = smoothstep(-0.15, 0.2, dashWave);
          float chargeWidth = max(1.5, beamRadius * (0.25 + 0.65 * charge));
          float glow = 1.0 - smoothstep(chargeWidth + 1.0, chargeWidth + 8.0, beamDistance);
          float body = 1.0 - smoothstep(chargeWidth - 1.0, chargeWidth + 1.0, beamDistance);
          float pulse = 0.45 + 0.55 * abs(sin(uTime * 7.0));
          float nodeRing = ringMask(endpointDistance, endpointRadius + 3.0 * charge, 1.8);

          color = layerOver(color, vec4(1.0, 0.48, 0.08, glow * dash * 0.16 * pulse));
          color = layerOver(color, vec4(1.0, 0.62, 0.11, body * dash * (0.25 + 0.45 * charge)));
          color = layerOver(color, vec4(1.0, 0.82, 0.40, nodeRing * (0.45 + 0.4 * charge)));
        } else if (state < 0.5) {
          float nodeRing = ringMask(endpointDistance, endpointRadius, 1.5);
          color = layerOver(color, vec4(1.0, 0.82, 0.40, nodeRing * 0.28));
        } else {
          float nodeRing = ringMask(endpointDistance, endpointRadius, 1.8);
          color = layerOver(color, vec4(0.49, 0.52, 0.59, nodeRing * 0.38));
        }
      }
    }
  }

  gl_FragColor = color;
}
`;

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

/**
 * One scene-shared Zapper renderer. A single Shader quad enhances every visible Zapper in one draw;
 * one vector Graphics layer underneath remains readable if WebGL/shader creation is unavailable.
 * Both consume authoritative beam/node geometry and lifecycle state without advancing gameplay time.
 */
export class PrototypeZapperPresentation {
  private readonly segments = new Float32Array(PROTOTYPE_ZAPPER_SHARED_SHADER_CAPACITY * 4);
  private readonly params = new Float32Array(PROTOTYPE_ZAPPER_SHARED_SHADER_CAPACITY * 4);
  private graphics?: GameObjects.Graphics;
  private shader?: GameObjects.Shader;
  private shaderCreationAttempted = false;
  private shaderCount = 0;
  private shaderQuadLeft = 0;
  private shaderQuadTop = 0;
  private shaderQuadWidth = 1;
  private shaderQuadHeight = 1;
  private shaderOffsetY = 0;
  private shaderScaleY = 1;
  private shaderTime = 0;
  private destroyed = false;

  constructor(private readonly scene: Scene) {
    this.ensureShader();
  }

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
      this.shader?.setVisible(false);
      this.shaderCount = 0;
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
    let shaderCount = 0;
    let unionLeft = Number.POSITIVE_INFINITY;
    let unionRight = Number.NEGATIVE_INFINITY;
    let unionTop = Number.POSITIVE_INFINITY;
    let unionBottom = Number.NEGATIVE_INFINITY;

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

      unionLeft = Math.min(unionLeft, left);
      unionRight = Math.max(unionRight, right);
      unionTop = Math.min(unionTop, top);
      unionBottom = Math.max(unionBottom, bottom);

      this.drawFallback(
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

      if (shaderCount < PROTOTYPE_ZAPPER_SHARED_SHADER_CAPACITY) {
        const base = shaderCount * 4;
        this.segments[base] = ax;
        this.segments[base + 1] = ay;
        this.segments[base + 2] = bx;
        this.segments[base + 3] = by;
        this.params[base] = geometry.beam.radius;
        this.params[base + 1] = endpointRadius;
        this.params[base + 2] = ZAPPER_STATE_CODE[sample.state];
        this.params[base + 3] = sample.chargeProgress;
        shaderCount += 1;
      }
    }

    this.shaderCount = shaderCount;
    this.shaderTime = simulationSeconds;
    this.shaderOffsetY = projection.offsetY;
    this.shaderScaleY = projection.scaleY;

    if (shaderCount === 0 || !Number.isFinite(unionLeft)) {
      this.shader?.setVisible(false);
      if (!Number.isFinite(unionLeft)) {
        graphics.setVisible(false);
      }
      return;
    }

    const shader = this.shader;
    if (!shader) {
      return;
    }

    this.shaderQuadLeft = Math.floor(unionLeft);
    this.shaderQuadTop = Math.floor(unionTop);
    this.shaderQuadWidth = Math.max(1, Math.ceil(unionRight) - this.shaderQuadLeft);
    this.shaderQuadHeight = Math.max(1, Math.ceil(unionBottom) - this.shaderQuadTop);

    shader
      .setPosition(this.shaderQuadLeft, this.shaderQuadTop)
      .setSize(this.shaderQuadWidth, this.shaderQuadHeight)
      .setDisplaySize(this.shaderQuadWidth, this.shaderQuadHeight)
      .setVisible(true);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.graphics?.destroy();
    this.graphics = undefined;
    this.shader?.destroy();
    this.shader = undefined;
  }

  private ensureResources(): void {
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics().setDepth(-50);
    }
    this.ensureShader();
  }

  private ensureShader(): void {
    if (this.shaderCreationAttempted) {
      return;
    }
    this.shaderCreationAttempted = true;

    if (typeof this.scene.add.shader !== 'function') {
      return;
    }

    try {
      const shader = this.scene.add.shader(
        {
          name: 'mgd-zapper-shared-beam',
          fragmentSource: PROTOTYPE_ZAPPER_SHARED_FRAGMENT_SHADER,
          setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
            setUniform('uCount', this.shaderCount);
            setUniform('uTime', this.shaderTime);
            setUniform('uQuadOrigin', [this.shaderQuadLeft, this.shaderQuadTop]);
            setUniform('uQuadSize', [this.shaderQuadWidth, this.shaderQuadHeight]);
            setUniform('uProjectionY', [this.shaderOffsetY, this.shaderScaleY]);
            setUniform('uSegments[0]', this.segments);
            setUniform('uParams[0]', this.params);
          },
        },
        0,
        0,
        1,
        1,
      );
      shader.setOrigin(0, 0).setDepth(-49).setVisible(false);
      this.shader = shader;
    } catch {
      // Canvas, restricted WebGL, or shader construction failure: the shared vector layer stays live.
      this.shader = undefined;
    }
  }

  private drawFallback(
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
        graphics.lineStyle(beamWidth + 8, ZAPPER_COLORS.glow, 0.18);
        drawLine(graphics, ax, ay, bx, by);
        graphics.lineStyle(beamWidth, ZAPPER_COLORS.body, 0.78);
        drawLine(graphics, ax, ay, bx, by);
        graphics.lineStyle(Math.max(2, beamWidth * 0.28), ZAPPER_COLORS.white, 0.9);
        drawLine(graphics, ax, ay, bx, by);
        graphics.fillStyle(ZAPPER_COLORS.glow, 0.24);
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
