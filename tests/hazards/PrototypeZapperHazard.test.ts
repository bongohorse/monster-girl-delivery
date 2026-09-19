import { describe, expect, it } from 'vitest';
import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  doesHitboxOverlapPrototypeZapper,
  type LogicalPoint,
  PROTOTYPE_ZAPPER_GRAZE_PADDING,
  PROTOTYPE_ZAPPER_LENGTHS,
  type PrototypeZapperGeometry,
  type PrototypeZapperGeometryPadding,
  resolvePrototypeZapperGeometry,
} from '../../src/hazards/PrototypeZapperHazard';
import {
  isPlayerCollidingWithHazardDuringStep,
  type LogicalHitbox,
} from '../../src/systems/HazardCollision';
import { createVerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';
import { STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const createZapper = (angleDegrees: number, length: number, centerX = 600, centerY = 195) => {
  const behavior = createPrototypeZapperBehavior(angleDegrees, length);
  const hitbox = createPrototypeZapperHitbox(centerX, centerY, behavior);
  return Object.freeze({
    behavior,
    entryId: 'zapper-test',
    hitbox,
    patternEntryIndex: 0,
    patternId: 'zapper-test-pattern',
    runDistance: hitbox.left,
    type: 'placeholder-barrier' as const,
  });
};

const expectHitboxClose = (
  actual: Readonly<LogicalHitbox>,
  expected: Readonly<LogicalHitbox>,
): void => {
  expect(actual.left).toBeCloseTo(expected.left, 9);
  expect(actual.right).toBeCloseTo(expected.right, 9);
  expect(actual.top).toBeCloseTo(expected.top, 9);
  expect(actual.bottom).toBeCloseTo(expected.bottom, 9);
};

const legacyPointToHitboxDistanceSquared = (
  point: Readonly<LogicalPoint>,
  hitbox: Readonly<LogicalHitbox>,
): number => {
  const nearestX = Math.max(hitbox.left, Math.min(hitbox.right, point.x));
  const nearestY = Math.max(hitbox.top, Math.min(hitbox.bottom, point.y));
  const dx = point.x - nearestX;
  const dy = point.y - nearestY;
  return dx * dx + dy * dy;
};

const legacyPointToSegmentDistanceSquared = (
  point: Readonly<LogicalPoint>,
  start: Readonly<LogicalPoint>,
  end: Readonly<LogicalPoint>,
): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    const px = point.x - start.x;
    const py = point.y - start.y;
    return px * px + py * py;
  }

  const projection = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );
  const nearestX = start.x + projection * dx;
  const nearestY = start.y + projection * dy;
  const px = point.x - nearestX;
  const py = point.y - nearestY;
  return px * px + py * py;
};

const legacySegmentIntersectsHitbox = (
  start: Readonly<LogicalPoint>,
  end: Readonly<LogicalPoint>,
  hitbox: Readonly<LogicalHitbox>,
): boolean => {
  let lower = 0;
  let upper = 1;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const constraints = [
    [-dx, start.x - hitbox.left],
    [dx, hitbox.right - start.x],
    [-dy, start.y - hitbox.top],
    [dy, hitbox.bottom - start.y],
  ] as const;

  for (const [p, q] of constraints) {
    if (p === 0) {
      if (q < 0) {
        return false;
      }
      continue;
    }
    const ratio = q / p;
    if (p < 0) {
      lower = Math.max(lower, ratio);
    } else {
      upper = Math.min(upper, ratio);
    }
    if (lower > upper) {
      return false;
    }
  }
  return true;
};

const legacySegmentToHitboxDistanceSquared = (
  start: Readonly<LogicalPoint>,
  end: Readonly<LogicalPoint>,
  hitbox: Readonly<LogicalHitbox>,
): number => {
  if (legacySegmentIntersectsHitbox(start, end, hitbox)) {
    return 0;
  }

  const corners = [
    { x: hitbox.left, y: hitbox.top },
    { x: hitbox.right, y: hitbox.top },
    { x: hitbox.right, y: hitbox.bottom },
    { x: hitbox.left, y: hitbox.bottom },
  ];

  return Math.min(
    legacyPointToHitboxDistanceSquared(start, hitbox),
    legacyPointToHitboxDistanceSquared(end, hitbox),
    ...corners.map((corner) => legacyPointToSegmentDistanceSquared(corner, start, end)),
  );
};

const legacyDoesHitboxOverlapPrototypeZapper = (
  hitbox: Readonly<LogicalHitbox>,
  geometry: Readonly<PrototypeZapperGeometry>,
  padding: Readonly<PrototypeZapperGeometryPadding>,
): boolean => {
  const beamRadius = geometry.beam.radius + padding.beam;
  const endpointARadius = geometry.endpointA.radius + padding.endpoints;
  const endpointBRadius = geometry.endpointB.radius + padding.endpoints;

  return (
    legacySegmentToHitboxDistanceSquared(geometry.beam.start, geometry.beam.end, hitbox) <
      beamRadius * beamRadius ||
    legacyPointToHitboxDistanceSquared(geometry.endpointA.center, hitbox) <
      endpointARadius * endpointARadius ||
    legacyPointToHitboxDistanceSquared(geometry.endpointB.center, hitbox) <
      endpointBRadius * endpointBRadius
  );
};

describe('M5 static Zapper geometry', () => {
  it('resolves horizontal and vertical variants from free angle/length data', () => {
    const horizontal = createZapper(0, PROTOTYPE_ZAPPER_LENGTHS.medium, 280, 195);
    const horizontalGeometry = resolvePrototypeZapperGeometry(horizontal);
    expect(horizontalGeometry).not.toBeNull();
    expect(horizontalGeometry?.endpointA.center).toEqual({ x: 210, y: 195 });
    expect(horizontalGeometry?.endpointB.center).toEqual({ x: 350, y: 195 });
    expect(horizontalGeometry?.beam.radius).toBe(7);
    expect(horizontalGeometry?.endpointA.radius).toBe(16);
    expectHitboxClose(horizontal.hitbox, { left: 194, right: 366, top: 179, bottom: 211 });

    const vertical = createZapper(90, PROTOTYPE_ZAPPER_LENGTHS.short, 300, 200);
    const verticalGeometry = resolvePrototypeZapperGeometry(vertical);
    expect(verticalGeometry).not.toBeNull();
    expect(verticalGeometry?.endpointA.center.x).toBeCloseTo(300, 9);
    expect(verticalGeometry?.endpointA.center.y).toBeCloseTo(160, 9);
    expect(verticalGeometry?.endpointB.center.x).toBeCloseTo(300, 9);
    expect(verticalGeometry?.endpointB.center.y).toBeCloseTo(240, 9);
    expectHitboxClose(vertical.hitbox, { left: 284, right: 316, top: 144, bottom: 256 });
  });

  it('keeps arbitrary diagonal angles rather than collapsing to orientation categories', () => {
    const zapper = createZapper(30, PROTOTYPE_ZAPPER_LENGTHS.long, 400, 200);
    const geometry = resolvePrototypeZapperGeometry(zapper);
    if (!geometry) {
      throw new Error('Expected Zapper geometry.');
    }

    expect(geometry.endpointA.center.x).toBeCloseTo(313.3974596, 7);
    expect(geometry.endpointA.center.y).toBeCloseTo(150, 9);
    expect(geometry.endpointB.center.x).toBeCloseTo(486.6025404, 7);
    expect(geometry.endpointB.center.y).toBeCloseTo(250, 9);
  });

  it('matches the legacy narrowphase across angle, hitbox, and padding grids', () => {
    const lethalPadding = Object.freeze({ beam: 0, endpoints: 0 });
    const paddings = [lethalPadding, PROTOTYPE_ZAPPER_GRAZE_PADDING] as const;
    const angles = [0, 15, 30, 45, 60, 89, 90, 135, 179] as const;
    const offsets = [-120, -80, -40, 0, 40, 80, 120] as const;
    const halfSizes = [1, 8, 24] as const;

    for (const angle of angles) {
      const zapper = createZapper(angle, PROTOTYPE_ZAPPER_LENGTHS.long, 200, 200);
      const geometry = resolvePrototypeZapperGeometry(zapper);
      if (!geometry) {
        throw new Error('Expected Zapper geometry.');
      }

      for (const offsetX of offsets) {
        for (const offsetY of offsets) {
          for (const halfSize of halfSizes) {
            const hitbox = {
              bottom: 200 + offsetY + halfSize,
              left: 200 + offsetX - halfSize,
              right: 200 + offsetX + halfSize,
              top: 200 + offsetY - halfSize,
            };

            for (const padding of paddings) {
              expect(doesHitboxOverlapPrototypeZapper(hitbox, geometry, padding)).toBe(
                legacyDoesHitboxOverlapPrototypeZapper(hitbox, geometry, padding),
              );
            }
          }
        }
      }
    }
  });

  it('does not turn a diagonal Zapper bounding box corner into a false lethal hit', () => {
    const zapper = createZapper(45, PROTOTYPE_ZAPPER_LENGTHS.long, 200, 200);
    const geometry = resolvePrototypeZapperGeometry(zapper);
    if (!geometry) {
      throw new Error('Expected Zapper geometry.');
    }

    const emptyBoundingCorner = { left: 265, right: 280, top: 120, bottom: 135 };
    expect(
      emptyBoundingCorner.left < geometry.bounds.right &&
        emptyBoundingCorner.right > geometry.bounds.left &&
        emptyBoundingCorner.top < geometry.bounds.bottom &&
        emptyBoundingCorner.bottom > geometry.bounds.top,
    ).toBe(true);
    expect(doesHitboxOverlapPrototypeZapper(emptyBoundingCorner, geometry)).toBe(false);

    expect(
      doesHitboxOverlapPrototypeZapper({ left: 193, right: 207, top: 193, bottom: 207 }, geometry),
    ).toBe(true);
  });

  it('treats endpoint nodes as lethal and gives beam/nodes the configured Graze shell', () => {
    const zapper = createZapper(0, PROTOTYPE_ZAPPER_LENGTHS.medium, 280, 195);
    const geometry = resolvePrototypeZapperGeometry(zapper);
    if (!geometry) {
      throw new Error('Expected Zapper geometry.');
    }

    expect(
      doesHitboxOverlapPrototypeZapper({ left: 195, right: 205, top: 187, bottom: 203 }, geometry),
    ).toBe(true);

    const nearBeam = { left: 270, right: 290, top: 204, bottom: 212 };
    expect(doesHitboxOverlapPrototypeZapper(nearBeam, geometry)).toBe(false);
    expect(
      doesHitboxOverlapPrototypeZapper(nearBeam, geometry, PROTOTYPE_ZAPPER_GRAZE_PADDING),
    ).toBe(true);
  });

  it('produces the same pass-through collision result across standard frame schedules', () => {
    const zapper = createZapper(45, PROTOTYPE_ZAPPER_LENGTHS.medium, 600, 195);
    const results: Record<string, boolean> = {};

    for (const [name, schedule] of Object.entries(STANDARD_FRAME_SCHEDULES)) {
      let elapsed = 0;
      let stepIndex = 0;
      let distance = 0;
      let collided = false;
      while (elapsed < 2.2 && !collided) {
        const delta = Math.min(schedule.getNextDelta(elapsed, stepIndex), 2.2 - elapsed);
        stepIndex += 1;
        const trajectory = createVerticalFlightTrajectory(
          { positionY: 195, velocityY: 0 },
          delta,
          false,
          { gravity: 0, thrust: 0, maxFallVelocity: 1_000, maxRiseVelocity: 1_000 },
          { ceilingY: 0, floorY: 400 },
        );
        collided = isPlayerCollidingWithHazardDuringStep(
          { distance },
          trajectory,
          delta,
          { baseScrollSpeed: 350 },
          zapper,
        );
        distance += 350 * delta;
        elapsed += delta;
      }
      results[name] = collided;
    }

    expect(new Set(Object.values(results))).toEqual(new Set([true]));
  });

  it('does not miss fast vertical crossing when world scroll is low but nonzero', () => {
    const zapper = createZapper(0, PROTOTYPE_ZAPPER_LENGTHS.medium, 600, 195);
    const trajectory = createVerticalFlightTrajectory(
      { positionY: 100, velocityY: 500 },
      0.4,
      false,
      { gravity: 0, thrust: 0, maxFallVelocity: 1_000, maxRiseVelocity: 1_000 },
      { ceilingY: 0, floorY: 400 },
    );

    expect(
      isPlayerCollidingWithHazardDuringStep(
        { distance: 600 },
        trajectory,
        0.4,
        { baseScrollSpeed: 1 },
        zapper,
      ),
    ).toBe(true);
  });
});
