import {
  createHazardBehavior,
  type HazardBehavior,
  STATIC_GEOMETRIC_HAZARD_BEHAVIOR,
} from '../hazards/HazardArchetype';
import type { LogicalHitbox } from '../systems/HazardCollision';
import { createEncounterProfile, type EncounterProfile } from './EncounterProfile';

export type HazardPatternEntryType = 'placeholder-barrier';

export interface HazardPatternEntry {
  readonly behavior: Readonly<HazardBehavior>;
  /** Stable identity within this pattern, used by later diagnostics and spawn mapping. */
  readonly id: string;
  /** Pattern-local logical bounds: left/right are run-distance offsets; top/bottom are vertical. */
  readonly hitbox: Readonly<LogicalHitbox>;
  readonly type: HazardPatternEntryType;
}

export interface HazardPatternEntryDefinition extends Omit<HazardPatternEntry, 'behavior'> {
  /** Omitted only by legacy/test definitions; authored runtime fixtures declare behavior explicitly. */
  readonly behavior?: Readonly<HazardBehavior>;
}

export interface HazardPattern {
  /** Stable catalog identity. */
  readonly id: string;
  /** Entries retain this authored order; construction does not sort them. */
  readonly entries: ReadonlyArray<Readonly<HazardPatternEntry>>;
  /** Explicit immutable metadata for later difficulty, pacing, variety, and readability policy. */
  readonly profile: Readonly<EncounterProfile>;
  /** Logical run-distance span; every entry must remain within zero through this value. */
  readonly runLength: number;
}

export interface HazardPatternDefinition extends Omit<HazardPattern, 'entries'> {
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

    return Object.freeze({
      behavior: createHazardBehavior(entry.behavior ?? STATIC_GEOMETRIC_HAZARD_BEHAVIOR),
      id: entry.id,
      type: entry.type,
      hitbox: Object.freeze({ ...entry.hitbox }),
    });
  });

  return Object.freeze({
    id: definition.id,
    runLength: definition.runLength,
    entries: Object.freeze(entries),
    profile: createEncounterProfile(definition.profile),
  });
};
