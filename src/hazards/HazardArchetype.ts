import type { LogicalHazard, LogicalHitbox } from '../systems/HazardCollision';
import {
  createTelegraphedHazardLifecycleConfig,
  type TelegraphedHazardLifecycleConfig,
} from './TelegraphedHazardLifecycle';

export type HazardArchetype = 'geometric' | 'timed';

export interface StaticGeometricHazardBehavior {
  readonly archetype: 'geometric';
  readonly kind: 'static';
}

/** PROTOTYPE triangle-wave movement authored in logical run-distance space. */
export interface VerticalPatrolHazardBehavior {
  readonly amplitudeY: number;
  readonly archetype: 'geometric';
  readonly cycleDistance: number;
  readonly kind: 'vertical-patrol';
  /** Cycle fraction at the hazard's immutable leading-edge run-distance anchor: [0, 1). */
  readonly phaseOffset: number;
}

/** PROTOTYPE one-shot pulse that is safe while warning/locked and lethal only while active. */
export interface TimedPulseHazardBehavior {
  readonly archetype: 'timed';
  readonly kind: 'pulse';
  readonly lifecycle: Readonly<TelegraphedHazardLifecycleConfig>;
}

export type HazardBehavior =
  | StaticGeometricHazardBehavior
  | TimedPulseHazardBehavior
  | VerticalPatrolHazardBehavior;

export interface BehavioralLogicalHazard extends LogicalHazard {
  readonly behavior: Readonly<HazardBehavior>;
  /** Immutable leading-edge anchor copied from generated spawn data. */
  readonly runDistance: number;
}

export const STATIC_GEOMETRIC_HAZARD_BEHAVIOR: Readonly<StaticGeometricHazardBehavior> =
  Object.freeze({
    archetype: 'geometric',
    kind: 'static',
  });

const assertPositiveFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
};

const assertValidHazardBehavior = (definition: Readonly<HazardBehavior>): void => {
  const rawDefinition = definition as { readonly archetype: unknown; readonly kind: unknown };
  const supportedPair =
    (rawDefinition.archetype === 'geometric' &&
      (rawDefinition.kind === 'static' || rawDefinition.kind === 'vertical-patrol')) ||
    (rawDefinition.archetype === 'timed' && rawDefinition.kind === 'pulse');
  if (!supportedPair) {
    throw new TypeError(
      `Unsupported hazard behavior: ${String(rawDefinition.archetype)}/${String(rawDefinition.kind)}`,
    );
  }

  switch (definition.kind) {
    case 'static':
      return;
    case 'vertical-patrol':
      assertPositiveFinite(definition.amplitudeY, 'Hazard vertical-patrol amplitudeY');
      assertPositiveFinite(definition.cycleDistance, 'Hazard vertical-patrol cycleDistance');
      if (
        !Number.isFinite(definition.phaseOffset) ||
        definition.phaseOffset < 0 ||
        definition.phaseOffset >= 1
      ) {
        throw new RangeError('Hazard vertical-patrol phaseOffset must be in [0, 1).');
      }

      return;
    case 'pulse':
      createTelegraphedHazardLifecycleConfig(definition.lifecycle);
      return;
    default:
      throw new TypeError(
        `Unsupported hazard behavior kind: ${String(
          (definition as { readonly kind: unknown }).kind,
        )}`,
      );
  }
};

/** Validates and snapshots a small serializable behavior union without creating an entity base class. */
export const createHazardBehavior = (
  definition: Readonly<HazardBehavior>,
): Readonly<HazardBehavior> => {
  assertValidHazardBehavior(definition);
  switch (definition.kind) {
    case 'static':
      return STATIC_GEOMETRIC_HAZARD_BEHAVIOR;
    case 'vertical-patrol':
      return Object.freeze({ ...definition });
    case 'pulse':
      return Object.freeze({
        ...definition,
        lifecycle: createTelegraphedHazardLifecycleConfig(definition.lifecycle),
      });
  }
};

export const isTimedPulseHazardBehavior = (
  behavior: Readonly<HazardBehavior>,
): behavior is Readonly<TimedPulseHazardBehavior> =>
  behavior.archetype === 'timed' && behavior.kind === 'pulse';

export const isBehavioralLogicalHazard = (
  hazard: Readonly<LogicalHazard>,
): hazard is Readonly<BehavioralLogicalHazard> => 'behavior' in hazard && 'runDistance' in hazard;

const positiveModulo = (value: number, modulus: number): number =>
  ((value % modulus) + modulus) % modulus;

/**
 * Returns the current logical hitbox from authoritative run progress. The triangle wave is stable
 * across frame partitions and relative to the spawn's immutable impact anchor. Static hazards keep
 * their authored geometry. Collision remains with the shared logical AABB authority.
 */
export const resolveHazardHitboxAtRunDistance = (
  hazard: Readonly<LogicalHazard>,
  currentRunDistance: number,
): Readonly<LogicalHitbox> => {
  if (!Number.isFinite(currentRunDistance) || currentRunDistance < 0) {
    throw new RangeError('Hazard behavior currentRunDistance must be non-negative and finite.');
  }

  if (!isBehavioralLogicalHazard(hazard) || hazard.behavior.kind !== 'vertical-patrol') {
    return hazard.hitbox;
  }

  if (!Number.isFinite(hazard.runDistance) || hazard.runDistance < 0) {
    throw new RangeError('Hazard behavior runDistance anchor must be non-negative and finite.');
  }
  assertValidHazardBehavior(hazard.behavior);
  const behavior = hazard.behavior;

  const cycleProgress = positiveModulo(
    (currentRunDistance - hazard.runDistance) / behavior.cycleDistance + behavior.phaseOffset,
    1,
  );
  const normalizedOffset = 1 - 4 * Math.abs(cycleProgress - 0.5);
  const offsetY = normalizedOffset * behavior.amplitudeY;
  const top = hazard.hitbox.top + offsetY;
  const bottom = hazard.hitbox.bottom + offsetY;

  if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
    throw new RangeError('Resolved moving hazard geometry must remain finite.');
  }

  return Object.freeze({
    left: hazard.hitbox.left,
    right: hazard.hitbox.right,
    top,
    bottom,
  });
};

/** Conservative authored extent used by the existing geometry/reachability validator. */
export const getHazardSweptHitbox = (
  hazard: Readonly<LogicalHazard> & { readonly behavior: Readonly<HazardBehavior> },
): Readonly<LogicalHitbox> => {
  assertValidHazardBehavior(hazard.behavior);
  const behavior = hazard.behavior;
  if (behavior.kind !== 'vertical-patrol') {
    return hazard.hitbox;
  }

  const top = hazard.hitbox.top - behavior.amplitudeY;
  const bottom = hazard.hitbox.bottom + behavior.amplitudeY;
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
    throw new RangeError('Moving hazard swept geometry must remain finite.');
  }

  return Object.freeze({
    left: hazard.hitbox.left,
    right: hazard.hitbox.right,
    top,
    bottom,
  });
};
