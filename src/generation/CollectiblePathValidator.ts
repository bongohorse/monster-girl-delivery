import { getHazardSweptHitbox } from '../hazards/HazardArchetype';
import type { PrototypePlayerCollisionExtents } from '../systems/HazardCollision';
import type { CollectiblePathPoint, HazardPattern } from './HazardPattern';

export interface CollectiblePathValidationBounds {
  readonly playableBottom: number;
  readonly playableTop: number;
}

export type CollectiblePathValidationIssueCode =
  | 'collectible-path-intersects-hazard'
  | 'collectible-path-outside-playable-band';

export interface CollectiblePathValidationIssue {
  readonly code: CollectiblePathValidationIssueCode;
  readonly entryIds: ReadonlyArray<string>;
  readonly pathId: string;
  readonly runEnd: number;
  readonly runStart: number;
}

const createIssue = (
  issue: CollectiblePathValidationIssue,
): Readonly<CollectiblePathValidationIssue> =>
  Object.freeze({
    ...issue,
    entryIds: Object.freeze([...issue.entryIds]),
  });

const interpolatePathY = (
  start: Readonly<CollectiblePathPoint>,
  end: Readonly<CollectiblePathPoint>,
  runDistance: number,
): number => {
  const progress = (runDistance - start.runDistance) / (end.runDistance - start.runDistance);
  return start.y + (end.y - start.y) * progress;
};

/**
 * Validates authored collectible guidance against the same conservative swept hazard geometry used
 * by pattern fairness. Points represent suggested player-center positions: the hazard footprint is
 * expanded by the logical player collision extents before testing each implied path segment.
 *
 * This deliberately does not create a second movement/reachability authority. The owning pattern
 * validator still decides whether the encounter itself has a physically reachable survival route;
 * this pass ensures collectible guidance does not point outside the playable center band or through
 * geometry that the existing validator already knows is lethal.
 */
export const validateCollectiblePaths = (
  pattern: Readonly<HazardPattern>,
  bounds: Readonly<CollectiblePathValidationBounds>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents>,
): ReadonlyArray<Readonly<CollectiblePathValidationIssue>> => {
  if (pattern.collectiblePaths === undefined) {
    return Object.freeze([]);
  }

  const issues: Array<Readonly<CollectiblePathValidationIssue>> = [];
  const minimumCenterY = bounds.playableTop + playerExtents.top;
  const maximumCenterY = bounds.playableBottom - playerExtents.bottom;
  const expandedHazards = pattern.entries.map((entry) => {
    const swept = getHazardSweptHitbox(entry);
    return Object.freeze({
      entryId: entry.id,
      left: swept.left - playerExtents.right,
      right: swept.right + playerExtents.left,
      top: swept.top - playerExtents.bottom,
      bottom: swept.bottom + playerExtents.top,
    });
  });

  for (const path of pattern.collectiblePaths) {
    for (const point of path.points) {
      if (point.y < minimumCenterY || point.y > maximumCenterY) {
        issues.push(
          createIssue({
            code: 'collectible-path-outside-playable-band',
            entryIds: [],
            pathId: path.id,
            runStart: point.runDistance,
            runEnd: point.runDistance,
          }),
        );
      }
    }

    for (let index = 1; index < path.points.length; index += 1) {
      const start = path.points[index - 1];
      const end = path.points[index];

      if (start === undefined || end === undefined) {
        continue;
      }

      for (const hazard of expandedHazards) {
        const runStart = Math.max(start.runDistance, hazard.left);
        const runEnd = Math.min(end.runDistance, hazard.right);

        if (runEnd <= runStart) {
          continue;
        }

        const startY = interpolatePathY(start, end, runStart);
        const endY = interpolatePathY(start, end, runEnd);
        const minimumY = Math.min(startY, endY);
        const maximumY = Math.max(startY, endY);

        if (maximumY > hazard.top && minimumY < hazard.bottom) {
          issues.push(
            createIssue({
              code: 'collectible-path-intersects-hazard',
              entryIds: [hazard.entryId],
              pathId: path.id,
              runStart,
              runEnd,
            }),
          );
        }
      }
    }
  }

  return Object.freeze(issues);
};
