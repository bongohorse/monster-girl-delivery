import type { HazardBehavior } from '../hazards/HazardArchetype';
import type { HazardReactionPolicy } from '../hazards/HazardReactionState';
import type { LogicalHazard, LogicalHitbox } from '../systems/HazardCollision';
import {
  type EncounterTransitionContext,
  type EncounterTransitionValidationResult,
  validateEncounterTransition,
} from './EncounterTransitionValidator';
import type { PatternReachabilityContext } from './FlightReachability';
import type { HazardPattern, HazardPatternEntryType } from './HazardPattern';
import { generateNextPattern } from './PatternGenerator';
import {
  type PatternValidationConstraints,
  type PatternValidationIssue,
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
  validatePattern,
} from './PatternValidator';
import type { RunGenerationState } from './RunGenerationState';

/** Prototype retry bound only; later pacing work may replace it with another explicit policy. */
export const PROTOTYPE_MAX_PATTERN_CANDIDATE_ATTEMPTS = 8;
const MAX_SUPPORTED_PATTERN_CANDIDATE_ATTEMPTS = 1_024;

export interface PatternSpawnScheduleRequest {
  readonly catalog: ReadonlyArray<Readonly<HazardPattern>>;
  readonly constraints?: Readonly<PatternValidationConstraints>;
  readonly maxCandidateAttempts?: number;
  /** Absolute logical run distance where the accepted pattern's local span begins. */
  readonly patternStartDistance: number;
  readonly reachability?: Readonly<PatternReachabilityContext>;
  readonly state: Readonly<RunGenerationState>;
  /** Optional sequence-level fairness input; live stream policy integration remains separate. */
  readonly transition?: Readonly<EncounterTransitionContext>;
}

export interface LogicalHazardSpawnIdentityFields {
  readonly entryId: string;
  readonly patternEntryIndex: number;
  readonly patternId: string;
  readonly runDistance: number;
}

export interface LogicalHazardSpawnInstance
  extends LogicalHazard,
    LogicalHazardSpawnIdentityFields {
  readonly behavior: Readonly<HazardBehavior>;
  readonly hitbox: Readonly<LogicalHitbox>;
  /** Optional authored override; omission uses the shared default hazard reaction policy. */
  readonly reactionPolicy?: Readonly<HazardReactionPolicy>;
  readonly type: HazardPatternEntryType;
}

const LOGICAL_HAZARD_SPAWN_IDENTITY_CACHE = new WeakMap<
  Readonly<LogicalHazardSpawnIdentityFields>,
  string
>();

/**
 * Stable serializable identity shared by logical runtime state and Phaser presentation.
 *
 * Authoritative spawns and collision adapters are immutable, so their composite string is cached by
 * object identity after the first request. Mutable/manual carriers deliberately bypass caching so a
 * caller that changes identity fields cannot observe stale identity.
 */
export const getLogicalHazardSpawnIdentity = (
  spawn: Readonly<LogicalHazardSpawnIdentityFields>,
): string => {
  const cached = LOGICAL_HAZARD_SPAWN_IDENTITY_CACHE.get(spawn);
  if (cached !== undefined) {
    return cached;
  }

  const identity = `${spawn.patternId}:${spawn.patternEntryIndex}:${spawn.entryId}:${spawn.runDistance}`;
  if (Object.isFrozen(spawn)) {
    LOGICAL_HAZARD_SPAWN_IDENTITY_CACHE.set(spawn, identity);
  }
  return identity;
};

export interface RejectedPatternCandidate {
  /** One-based position of this candidate within the current scheduling call. */
  readonly attempt: number;
  readonly catalogIndex: number;
  readonly issues: ReadonlyArray<Readonly<PatternValidationIssue>>;
  readonly patternId: string;
  readonly reason: 'pattern' | 'transition';
  readonly transitionValidation: Readonly<EncounterTransitionValidationResult> | null;
}

interface PatternSpawnScheduleBase {
  /** Number of generated candidates, including the accepted candidate when present. */
  readonly attempts: number;
  readonly patternStartDistance: number;
  readonly rejections: ReadonlyArray<Readonly<RejectedPatternCandidate>>;
  /** State after every attempted candidate has consumed exactly one PRNG step. */
  readonly state: Readonly<RunGenerationState>;
}

export interface AcceptedPatternSpawnSchedule extends PatternSpawnScheduleBase {
  readonly transitionValidation: Readonly<EncounterTransitionValidationResult> | null;
  readonly catalogIndex: number;
  readonly nextPatternStartDistance: number;
  readonly patternId: string;
  readonly spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>;
  readonly status: 'accepted';
}

export interface ExhaustedPatternSpawnSchedule extends PatternSpawnScheduleBase {
  readonly status: 'exhausted';
}

export type PatternSpawnSchedule =
  | Readonly<AcceptedPatternSpawnSchedule>
  | Readonly<ExhaustedPatternSpawnSchedule>;

const assertValidRequest = (patternStartDistance: number, maxCandidateAttempts: number): void => {
  if (!Number.isFinite(patternStartDistance) || patternStartDistance < 0) {
    throw new RangeError('patternStartDistance must be a non-negative finite number.');
  }

  if (
    !Number.isSafeInteger(maxCandidateAttempts) ||
    maxCandidateAttempts <= 0 ||
    maxCandidateAttempts > MAX_SUPPORTED_PATTERN_CANDIDATE_ATTEMPTS
  ) {
    throw new RangeError(
      `maxCandidateAttempts must be a positive integer no greater than ${MAX_SUPPORTED_PATTERN_CANDIDATE_ATTEMPTS}.`,
    );
  }
};

const createRejection = (rejection: RejectedPatternCandidate): Readonly<RejectedPatternCandidate> =>
  Object.freeze({
    ...rejection,
    issues: Object.freeze([...rejection.issues]),
  });

const mapPatternToAbsoluteSpawns = (
  pattern: Readonly<HazardPattern>,
  patternStartDistance: number,
): ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> =>
  Object.freeze(
    pattern.entries
      .map((entry, patternEntryIndex) => {
        const left = patternStartDistance + entry.hitbox.left;
        const right = patternStartDistance + entry.hitbox.right;

        if (!Number.isFinite(left) || !Number.isFinite(right)) {
          throw new RangeError('Mapped hazard run distances must remain finite.');
        }

        return Object.freeze({
          behavior: entry.behavior,
          entryId: entry.id,
          hitbox: Object.freeze({
            left,
            right,
            top: entry.hitbox.top,
            bottom: entry.hitbox.bottom,
          }),
          patternEntryIndex,
          patternId: pattern.id,
          ...(entry.reactionPolicy === undefined ? {} : { reactionPolicy: entry.reactionPolicy }),
          runDistance: left,
          type: entry.type,
        });
      })
      .sort(
        (first, second) =>
          first.runDistance - second.runDistance ||
          first.hitbox.right - second.hitbox.right ||
          first.patternEntryIndex - second.patternEntryIndex,
      ),
  );

/**
 * Selects candidates until one passes fairness validation or the retry policy is exhausted.
 * Rejections and acceptance each consume one generator step; only accepted entries become spawns.
 */
export const scheduleNextPattern = (
  request: Readonly<PatternSpawnScheduleRequest>,
): Readonly<PatternSpawnSchedule> => {
  const constraints = request.constraints ?? PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS;
  const maxCandidateAttempts =
    request.maxCandidateAttempts ?? PROTOTYPE_MAX_PATTERN_CANDIDATE_ATTEMPTS;
  assertValidRequest(request.patternStartDistance, maxCandidateAttempts);

  let state = request.state;
  const rejections: Array<Readonly<RejectedPatternCandidate>> = [];

  for (let attempt = 1; attempt <= maxCandidateAttempts; attempt += 1) {
    const candidate = generateNextPattern(state, request.catalog);
    state = candidate.state;
    const validation = validatePattern(candidate.pattern, constraints, request.reachability);

    if (!validation.valid) {
      rejections.push(
        createRejection({
          attempt,
          catalogIndex: candidate.catalogIndex,
          issues: validation.issues,
          patternId: candidate.pattern.id,
          reason: 'pattern',
          transitionValidation: null,
        }),
      );
      continue;
    }

    let transitionValidation: Readonly<EncounterTransitionValidationResult> | null = null;
    if (request.transition !== undefined) {
      transitionValidation = validateEncounterTransition(
        candidate.pattern,
        request.patternStartDistance,
        constraints,
        request.transition,
      );

      if (!transitionValidation.valid) {
        rejections.push(
          createRejection({
            attempt,
            catalogIndex: candidate.catalogIndex,
            issues: [],
            patternId: candidate.pattern.id,
            reason: 'transition',
            transitionValidation,
          }),
        );
        continue;
      }
    }

    const nextPatternStartDistance = request.patternStartDistance + candidate.pattern.runLength;

    if (!Number.isFinite(nextPatternStartDistance)) {
      throw new RangeError('Next pattern start distance must remain finite.');
    }

    return Object.freeze({
      status: 'accepted',
      transitionValidation,
      attempts: attempt,
      catalogIndex: candidate.catalogIndex,
      patternId: candidate.pattern.id,
      patternStartDistance: request.patternStartDistance,
      nextPatternStartDistance,
      rejections: Object.freeze(rejections),
      spawns: mapPatternToAbsoluteSpawns(candidate.pattern, request.patternStartDistance),
      state,
    });
  }

  return Object.freeze({
    status: 'exhausted',
    attempts: maxCandidateAttempts,
    patternStartDistance: request.patternStartDistance,
    rejections: Object.freeze(rejections),
    state,
  });
};
