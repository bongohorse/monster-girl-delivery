import {
  createHazardBehavior,
  type HazardBehavior,
  STATIC_GEOMETRIC_HAZARD_BEHAVIOR,
} from '../hazards/HazardArchetype';
import {
  createHazardReactionPolicy,
  type HazardReactionPolicy,
} from '../hazards/HazardReactionState';
import type { LogicalHitbox } from '../systems/HazardCollision';
import { createEncounterProfile, type EncounterProfile } from './EncounterProfile';

export type HazardPatternEntryType = 'placeholder-barrier';

export interface HazardPatternEntry {
  readonly behavior: Readonly<HazardBehavior>;
  /** Stable identity within this pattern, used by later diagnostics and spawn mapping. */
  readonly id: string;
  /** Pattern-local logical bounds: left/right are run-distance offsets; top/bottom are vertical. */
  readonly hitbox: Readonly<LogicalHitbox>;
  /** Omitted for the default disable/destroy semantics; explicit content may override either effect. */
  readonly reactionPolicy?: Readonly<HazardReactionPolicy>;
  readonly type: HazardPatternEntryType;
}

export interface HazardPatternEntryDefinition extends Omit<HazardPatternEntry, 'behavior'> {
  /** Omitted only by legacy/test definitions; authored runtime fixtures declare behavior explicitly. */
  readonly behavior?: Readonly<HazardBehavior>;
}

export type CollectiblePathIntent = 'safe-guide' | 'risk-reward';

export interface CollectiblePathPoint {
  /** Pattern-local logical run-distance offset, independent of viewport dimensions. */
  readonly runDistance: number;
  /** Logical player-center Y suggested by this collectible point. */
  readonly y: number;
}

export interface CollectiblePath {
  /** Stable identity within this pattern for presentation/diagnostics. */
  readonly id: string;
  /** Presentation-readable route purpose; this never changes collision/fairness authority. */
  readonly intent: CollectiblePathIntent;
  /** Authored traversal order. Run distance must increase strictly from point to point. */
  readonly points: ReadonlyArray<Readonly<CollectiblePathPoint>>;
}

export interface HazardPattern {
  /** Optional authored movement-language routes. Omitted when this pattern has no collectible path. */
  readonly collectiblePaths?: ReadonlyArray<Readonly<CollectiblePath>>;
  /** Stable catalog identity. */
  readonly id: string;
  /** Entries retain this authored order; construction does not sort them. */
  readonly entries: ReadonlyArray<Readonly<HazardPatternEntry>>;
  /** Explicit immutable metadata for later difficulty, pacing, variety, and readability policy. */
  readonly profile: Readonly<EncounterProfile>;
  /** Logical run-distance span; every entry and collectible point must remain within this value. */
  readonly runLength: number;
}

export interface HazardPatternDefinition
  extends Omit<HazardPattern, 'collectiblePaths' | 'entries'> {
  readonly collectiblePaths?: ReadonlyArray<Readonly<CollectiblePath>>;
  readonly entries: ReadonlyArray<Readonly<HazardPatternEntryDefinition>>;
}

const assertNonEmptyId = (id: string, name: string): void => {
  if (id.trim().length === 0) {
    throw new TypeError(`${name} must not be empty.`);
  }
};

const assertValidRunLength = (runLength: number): void => {
  if (!Number.isFinite(runLength) || runLength <= 0) {
    throw new RangeError('Pattern runLength must be a positive finite number.');
  }
};

const assertValidPatternHitbox = (hitbox: Readonly<LogicalHitbox>, runLength: number): void => {
  if (
    !Number.isFinite(hitbox.left) ||
    !Number.isFinite(hitbox.right) ||
    !Number.isFinite(hitbox.top) ||
    !Number.isFinite(hitbox.bottom)
  ) {
    throw new RangeError('Pattern hitbox coordinates must be finite.');
  }

  if (hitbox.left < 0 || hitbox.right <= hitbox.left || hitbox.right > runLength) {
    throw new RangeError(
      'Pattern hitbox must have positive width and remain within the pattern runLength.',
    );
  }

  if (hitbox.bottom <= hitbox.top) {
    throw new RangeError('Pattern hitbox must have positive height.');
  }
};

const createCollectiblePaths = (
  paths: ReadonlyArray<Readonly<CollectiblePath>> | undefined,
  runLength: number,
): ReadonlyArray<Readonly<CollectiblePath>> | undefined => {
  if (paths === undefined) {
    return undefined;
  }

  const pathIds = new Set<string>();
  const collectiblePaths = paths.map((path) => {
    assertNonEmptyId(path.id, 'Collectible path id');

    if (pathIds.has(path.id)) {
      throw new TypeError(`Collectible path id must be unique: ${path.id}`);
    }
    pathIds.add(path.id);

    if (path.intent !== 'safe-guide' && path.intent !== 'risk-reward') {
      throw new TypeError(`Unsupported collectible path intent: ${path.intent}`);
    }

    if (path.points.length < 2) {
      throw new RangeError('Collectible path must contain at least two ordered points.');
    }

    let previousRunDistance = Number.NEGATIVE_INFINITY;
    const points = path.points.map((point) => {
      if (!Number.isFinite(point.runDistance) || !Number.isFinite(point.y)) {
        throw new RangeError('Collectible path coordinates must be finite.');
      }

      if (point.runDistance < 0 || point.runDistance > runLength) {
        throw new RangeError(
          'Collectible path run distance must remain within the pattern runLength.',
        );
      }

      if (point.runDistance <= previousRunDistance) {
        throw new RangeError(
          'Collectible path run distance must increase strictly in authored order.',
        );
      }
      previousRunDistance = point.runDistance;

      return Object.freeze({ runDistance: point.runDistance, y: point.y });
    });

    return Object.freeze({
      id: path.id,
      intent: path.intent,
      points: Object.freeze(points),
    });
  });

  return Object.freeze(collectiblePaths);
};

/**
 * Validates and snapshots one Phaser-independent logical hazard pattern.
 * Structural geometry checks here do not replace the focused M3 fairness validator.
 */
export const createHazardPattern = (
  definition: Readonly<HazardPatternDefinition>,
): Readonly<HazardPattern> => {
  assertNonEmptyId(definition.id, 'Pattern id');
  assertValidRunLength(definition.runLength);

  if (definition.entries.length === 0) {
    throw new RangeError('Pattern must contain at least one hazard entry.');
  }

  const entryIds = new Set<string>();
  const entries = definition.entries.map((entry) => {
    assertNonEmptyId(entry.id, 'Pattern entry id');

    if (entryIds.has(entry.id)) {
      throw new TypeError(`Pattern entry id must be unique: ${entry.id}`);
    }
    entryIds.add(entry.id);

    if (entry.type !== 'placeholder-barrier') {
      throw new TypeError(`Unsupported pattern entry type: ${entry.type}`);
    }

    assertValidPatternHitbox(entry.hitbox, definition.runLength);
    const reactionPolicy =
      entry.reactionPolicy === undefined
        ? undefined
        : createHazardReactionPolicy(entry.reactionPolicy);

    return Object.freeze({
      behavior: createHazardBehavior(entry.behavior ?? STATIC_GEOMETRIC_HAZARD_BEHAVIOR),
      id: entry.id,
      type: entry.type,
      hitbox: Object.freeze({ ...entry.hitbox }),
      ...(reactionPolicy === undefined ? {} : { reactionPolicy }),
    });
  });
  const collectiblePaths = createCollectiblePaths(
    definition.collectiblePaths,
    definition.runLength,
  );

  return Object.freeze({
    ...(collectiblePaths === undefined ? {} : { collectiblePaths }),
    id: definition.id,
    runLength: definition.runLength,
    entries: Object.freeze(entries),
    profile: createEncounterProfile(definition.profile),
  });
};
