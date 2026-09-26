import type { HazardPattern } from './HazardPattern';

const MAX_PROTOTYPE_RECENT_FAMILY_WINDOW_SIZE = 64;

export interface EncounterVarietyPolicy {
  /** Families exempt from recent-history suppression because recurrence is deliberately authored. */
  readonly repeatableFamilyIds: ReadonlyArray<string>;
  /** Number of accepted encounter families retained, with the most recent entry last. */
  readonly recentFamilyWindowSize: number;
}

export interface EncounterVarietyHistoryState {
  readonly recentFamilyIds: ReadonlyArray<string>;
}

export interface EncounterVarietyCandidateEvaluation {
  readonly patternId: string;
  readonly preferred: boolean;
  readonly recentlyUsed: boolean;
  readonly repeatable: boolean;
  /** One means the family was selected immediately before this request. */
  readonly selectionsSinceLastUse: number | null;
  readonly varietyFamilyId: string;
}

export interface EncounterVarietySelection {
  /** Primary catalog to pass to deterministic generation and hard fairness validation. */
  readonly candidateCatalog: ReadonlyArray<Readonly<HazardPattern>>;
  /** Recently used candidates retained for a later deterministic fallback after primary failure. */
  readonly deferredCatalog: ReadonlyArray<Readonly<HazardPattern>>;
  readonly evaluations: ReadonlyArray<Readonly<EncounterVarietyCandidateEvaluation>>;
  /** True when no preferred candidate existed and the primary catalog had to reuse recent content. */
  readonly fallbackUsed: boolean;
}

export const PROTOTYPE_ENCOUNTER_VARIETY_POLICY: Readonly<EncounterVarietyPolicy> = Object.freeze({
  recentFamilyWindowSize: 4,
  repeatableFamilyIds: Object.freeze([]),
});

const assertStableFamilyId = (id: string, name: string): void => {
  if (id.length === 0 || id !== id.trim()) {
    throw new TypeError(`${name} must be non-empty and have no surrounding whitespace.`);
  }
};

export const createEncounterVarietyPolicy = (
  definition: Readonly<EncounterVarietyPolicy>,
): Readonly<EncounterVarietyPolicy> => {
  if (
    !Number.isSafeInteger(definition.recentFamilyWindowSize) ||
    definition.recentFamilyWindowSize < 0 ||
    definition.recentFamilyWindowSize > MAX_PROTOTYPE_RECENT_FAMILY_WINDOW_SIZE
  ) {
    throw new RangeError(
      `recentFamilyWindowSize must be a safe integer from zero through ${MAX_PROTOTYPE_RECENT_FAMILY_WINDOW_SIZE}.`,
    );
  }

  for (const familyId of definition.repeatableFamilyIds) {
    assertStableFamilyId(familyId, 'Repeatable variety family id');
  }
  if (new Set(definition.repeatableFamilyIds).size !== definition.repeatableFamilyIds.length) {
    throw new TypeError('repeatableFamilyIds must not contain duplicates.');
  }

  return Object.freeze({
    recentFamilyWindowSize: definition.recentFamilyWindowSize,
    repeatableFamilyIds: Object.freeze([...definition.repeatableFamilyIds]),
  });
};

export const createEncounterVarietyHistoryState = (
  recentFamilyIds: ReadonlyArray<string> = [],
  policy: Readonly<EncounterVarietyPolicy> = PROTOTYPE_ENCOUNTER_VARIETY_POLICY,
): Readonly<EncounterVarietyHistoryState> => {
  const validatedPolicy = createEncounterVarietyPolicy(policy);

  if (recentFamilyIds.length > validatedPolicy.recentFamilyWindowSize) {
    throw new RangeError('Encounter variety history exceeds the configured recent-family window.');
  }
  for (const familyId of recentFamilyIds) {
    assertStableFamilyId(familyId, 'Recent variety family id');
  }

  return Object.freeze({ recentFamilyIds: Object.freeze([...recentFamilyIds]) });
};

const assertValidCatalog = (catalog: ReadonlyArray<Readonly<HazardPattern>>): void => {
  const patternIds = new Set<string>();

  for (const pattern of catalog) {
    if (pattern === undefined || pattern === null) {
      throw new TypeError('Encounter variety catalog entries must be defined.');
    }
    if (patternIds.has(pattern.id)) {
      throw new TypeError(`Encounter variety catalog pattern ids must be unique: ${pattern.id}`);
    }
    patternIds.add(pattern.id);
    assertStableFamilyId(pattern.profile.varietyFamilyId, 'Encounter variety family id');
  }
};

/**
 * Narrows only the already-eligible input catalog and consumes no randomness. Preferred candidates
 * avoid recent families unless their family is explicitly repeatable. If every candidate is recent,
 * the least-recent family tier becomes the primary deterministic fallback while newer recent content
 * remains deferred for hard-fairness recovery. When fresh content exists, all recent candidates stay
 * deferred behind it. Full live orchestration belongs to #120.
 */
export const selectPatternsForVariety = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  state: Readonly<EncounterVarietyHistoryState>,
  policy: Readonly<EncounterVarietyPolicy> = PROTOTYPE_ENCOUNTER_VARIETY_POLICY,
): Readonly<EncounterVarietySelection> => {
  assertValidCatalog(catalog);
  const validatedPolicy = createEncounterVarietyPolicy(policy);
  const validatedState = createEncounterVarietyHistoryState(state.recentFamilyIds, validatedPolicy);
  const repeatableFamilies = new Set(validatedPolicy.repeatableFamilyIds);
  const evaluations = catalog.map((pattern) => {
    const varietyFamilyId = pattern.profile.varietyFamilyId;
    const mostRecentIndex = validatedState.recentFamilyIds.lastIndexOf(varietyFamilyId);
    const recentlyUsed = mostRecentIndex >= 0;
    const repeatable = repeatableFamilies.has(varietyFamilyId);

    return Object.freeze({
      patternId: pattern.id,
      preferred: !recentlyUsed || repeatable,
      recentlyUsed,
      repeatable,
      selectionsSinceLastUse: recentlyUsed
        ? validatedState.recentFamilyIds.length - mostRecentIndex
        : null,
      varietyFamilyId,
    });
  });
  const preferredPatternIds = new Set(
    evaluations
      .filter((evaluation) => evaluation.preferred)
      .map((evaluation) => evaluation.patternId),
  );
  const preferredCatalog = catalog.filter((pattern) => preferredPatternIds.has(pattern.id));
  const recentCatalog = catalog.filter((pattern) => !preferredPatternIds.has(pattern.id));
  const fallbackUsed = catalog.length > 0 && preferredCatalog.length === 0;
  const oldestRecentDistance = fallbackUsed
    ? Math.max(
        ...evaluations.map((evaluation) => evaluation.selectionsSinceLastUse ?? 0),
      )
    : null;
  const fallbackPatternIds = new Set(
    fallbackUsed
      ? evaluations
          .filter((evaluation) => evaluation.selectionsSinceLastUse === oldestRecentDistance)
          .map((evaluation) => evaluation.patternId)
      : [],
  );
  const fallbackCatalog = catalog.filter((pattern) => fallbackPatternIds.has(pattern.id));
  const newerRecentCatalog = catalog.filter(
    (pattern) => fallbackUsed && !fallbackPatternIds.has(pattern.id),
  );

  return Object.freeze({
    candidateCatalog: Object.freeze(fallbackUsed ? fallbackCatalog : preferredCatalog),
    deferredCatalog: Object.freeze(fallbackUsed ? newerRecentCatalog : recentCatalog),
    evaluations: Object.freeze(evaluations),
    fallbackUsed,
  });
};

/** Records one accepted encounter only; rejected candidates must never enter recent history. */
export const recordAcceptedEncounterForVariety = (
  state: Readonly<EncounterVarietyHistoryState>,
  pattern: Readonly<HazardPattern>,
  policy: Readonly<EncounterVarietyPolicy> = PROTOTYPE_ENCOUNTER_VARIETY_POLICY,
): Readonly<EncounterVarietyHistoryState> => {
  const validatedPolicy = createEncounterVarietyPolicy(policy);
  const validatedState = createEncounterVarietyHistoryState(state.recentFamilyIds, validatedPolicy);
  const familyId = pattern.profile.varietyFamilyId;
  assertStableFamilyId(familyId, 'Accepted encounter variety family id');

  if (validatedPolicy.recentFamilyWindowSize === 0) {
    return createEncounterVarietyHistoryState([], validatedPolicy);
  }

  return createEncounterVarietyHistoryState(
    [...validatedState.recentFamilyIds, familyId].slice(-validatedPolicy.recentFamilyWindowSize),
    validatedPolicy,
  );
};
