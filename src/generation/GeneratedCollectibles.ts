import type { CollectiblePathIntent, HazardPattern } from './HazardPattern';
import type { LogicalHazardSpawnInstance } from './PatternSpawnScheduler';

export const PROTOTYPE_COLLECTIBLE_VALUE = 1;
export const PROTOTYPE_COLLECTIBLE_RETAIN_BEHIND_DISTANCE = 160;

export interface LogicalCollectibleSpawnInstance {
  readonly intent: CollectiblePathIntent;
  readonly pathId: string;
  readonly pathPointIndex: number;
  readonly patternId: string;
  readonly patternStartDistance: number;
  readonly runDistance: number;
  readonly value: number;
  readonly y: number;
}

export const getLogicalCollectibleSpawnIdentity = (
  spawn: Readonly<LogicalCollectibleSpawnInstance>,
): string =>
  `${spawn.patternId}:${spawn.patternStartDistance}:${spawn.pathId}:${spawn.pathPointIndex}`;

const materializeCurrentPatternOccurrences = (
  hazardSpawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
): ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>> => {
  const patternsById = new Map(catalog.map((pattern) => [pattern.id, pattern] as const));
  const occurrenceStarts = new Map<string, { pattern: Readonly<HazardPattern>; start: number }>();

  for (const spawn of hazardSpawns) {
    const pattern = patternsById.get(spawn.patternId);
    const entry = pattern?.entries[spawn.patternEntryIndex];
    if (!pattern || !entry || entry.id !== spawn.entryId) {
      continue;
    }

    const patternStartDistance = spawn.runDistance - entry.hitbox.left;
    if (!Number.isFinite(patternStartDistance)) {
      throw new RangeError('Collectible pattern start distance must remain finite.');
    }

    occurrenceStarts.set(`${pattern.id}:${patternStartDistance}`, {
      pattern,
      start: patternStartDistance,
    });
  }

  const materialized: Array<Readonly<LogicalCollectibleSpawnInstance>> = [];
  for (const { pattern, start } of occurrenceStarts.values()) {
    for (const path of pattern.collectiblePaths ?? []) {
      path.points.forEach((point, pathPointIndex) => {
        const runDistance = start + point.runDistance;
        if (!Number.isFinite(runDistance)) {
          throw new RangeError('Collectible run distance must remain finite.');
        }

        materialized.push(
          Object.freeze({
            intent: path.intent,
            pathId: path.id,
            pathPointIndex,
            patternId: pattern.id,
            patternStartDistance: start,
            runDistance,
            value: PROTOTYPE_COLLECTIBLE_VALUE,
            y: point.y,
          }),
        );
      });
    }
  }

  materialized.sort(
    (first, second) =>
      first.runDistance - second.runDistance ||
      first.patternStartDistance - second.patternStartDistance ||
      first.patternId.localeCompare(second.patternId) ||
      first.pathId.localeCompare(second.pathId) ||
      first.pathPointIndex - second.pathPointIndex,
  );
  return Object.freeze(materialized);
};

/**
 * Reconciles visible M5 collectible instances from the already accepted hazard-pattern window.
 * No PRNG is consumed here: accepted pattern identity and start distance are reconstructed from the
 * authoritative generated hazard spawns, while previously accepted collectible geometry is retained
 * until it is safely behind the player. This also preserves accepted geometry across live resize.
 */
export const reconcileGeneratedCollectibles = (
  state: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>>,
  hazardSpawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  runDistance: number,
  retainBehindDistance = PROTOTYPE_COLLECTIBLE_RETAIN_BEHIND_DISTANCE,
): ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>> => {
  if (!Number.isFinite(runDistance) || runDistance < 0) {
    throw new RangeError(
      'Collectible reconciliation run distance must be non-negative and finite.',
    );
  }
  if (!Number.isFinite(retainBehindDistance) || retainBehindDistance < 0) {
    throw new RangeError('Collectible retention distance must be non-negative and finite.');
  }

  const retained = new Map<string, Readonly<LogicalCollectibleSpawnInstance>>();
  for (const spawn of state) {
    if (spawn.runDistance >= runDistance - retainBehindDistance) {
      retained.set(getLogicalCollectibleSpawnIdentity(spawn), spawn);
    }
  }

  for (const spawn of materializeCurrentPatternOccurrences(hazardSpawns, catalog)) {
    const identity = getLogicalCollectibleSpawnIdentity(spawn);
    if (!retained.has(identity)) {
      retained.set(identity, spawn);
    }
  }

  return Object.freeze(
    [...retained.values()].sort(
      (first, second) =>
        first.runDistance - second.runDistance ||
        getLogicalCollectibleSpawnIdentity(first).localeCompare(
          getLogicalCollectibleSpawnIdentity(second),
        ),
    ),
  );
};
