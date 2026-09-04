import type { HazardPattern, HazardPatternEntry } from './HazardPattern';

export interface PatternValidationConstraints {
  readonly minimumReactionSpacing: number;
  readonly minimumVerticalCorridor: number;
  readonly playableBottom: number;
  readonly playableTop: number;
}

/** Prototype logical-space values only; later playtesting may tune them through focused work. */
export const PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS: Readonly<PatternValidationConstraints> =
  Object.freeze({
    playableTop: 48,
    playableBottom: 342,
    minimumVerticalCorridor: 96,
    minimumReactionSpacing: 96,
  });

export type PatternValidationIssueCode =
  | 'insufficient-reaction-spacing'
  | 'vertical-corridor-too-narrow'
  | 'vertical-route-blocked';

export interface PatternValidationIssue {
  readonly actual: number;
  readonly code: PatternValidationIssueCode;
  readonly entryIds: ReadonlyArray<string>;
  readonly required: number;
  readonly runEnd: number;
  readonly runStart: number;
}

export interface PatternValidationResult {
  readonly issues: ReadonlyArray<Readonly<PatternValidationIssue>>;
  readonly valid: boolean;
}

interface HorizontalEncounterGroup {
  end: number;
  readonly entryIds: string[];
  readonly start: number;
}

const assertValidConstraints = (constraints: Readonly<PatternValidationConstraints>): void => {
  if (
    !Number.isFinite(constraints.playableTop) ||
    !Number.isFinite(constraints.playableBottom) ||
    constraints.playableBottom <= constraints.playableTop
  ) {
    throw new RangeError('Pattern validation playable bounds must be finite and non-empty.');
  }

  if (
    !Number.isFinite(constraints.minimumVerticalCorridor) ||
    constraints.minimumVerticalCorridor <= 0 ||
    constraints.minimumVerticalCorridor > constraints.playableBottom - constraints.playableTop
  ) {
    throw new RangeError(
      'minimumVerticalCorridor must be positive, finite, and no larger than the playable band.',
    );
  }

  if (
    !Number.isFinite(constraints.minimumReactionSpacing) ||
    constraints.minimumReactionSpacing < 0
  ) {
    throw new RangeError('minimumReactionSpacing must be a non-negative finite number.');
  }
};

const createIssue = (issue: PatternValidationIssue): Readonly<PatternValidationIssue> =>
  Object.freeze({
    ...issue,
    entryIds: Object.freeze([...issue.entryIds]),
  });

const getLargestVerticalCorridor = (
  entries: ReadonlyArray<Readonly<HazardPatternEntry>>,
  constraints: Readonly<PatternValidationConstraints>,
): number => {
  const occupiedIntervals = entries
    .map((entry) => ({
      top: Math.max(entry.hitbox.top, constraints.playableTop),
      bottom: Math.min(entry.hitbox.bottom, constraints.playableBottom),
    }))
    .filter((interval) => interval.bottom > interval.top)
    .sort((first, second) => first.top - second.top || first.bottom - second.bottom);

  let occupiedThrough = constraints.playableTop;
  let largestCorridor = 0;

  for (const interval of occupiedIntervals) {
    largestCorridor = Math.max(largestCorridor, interval.top - occupiedThrough);
    occupiedThrough = Math.max(occupiedThrough, interval.bottom);
  }

  return Math.max(largestCorridor, constraints.playableBottom - occupiedThrough);
};

const collectVerticalCorridorIssues = (
  pattern: Readonly<HazardPattern>,
  constraints: Readonly<PatternValidationConstraints>,
): ReadonlyArray<Readonly<PatternValidationIssue>> => {
  const verticallyRelevantEntries = pattern.entries.filter(
    (entry) =>
      entry.hitbox.bottom > constraints.playableTop &&
      entry.hitbox.top < constraints.playableBottom,
  );
  const runBoundaries = [
    ...new Set(
      verticallyRelevantEntries.flatMap((entry) => [entry.hitbox.left, entry.hitbox.right]),
    ),
  ].sort((first, second) => first - second);
  const issues: Array<Readonly<PatternValidationIssue>> = [];

  for (let index = 0; index < runBoundaries.length - 1; index += 1) {
    const runStart = runBoundaries[index];
    const runEnd = runBoundaries[index + 1];

    if (runStart === undefined || runEnd === undefined || runEnd <= runStart) {
      continue;
    }

    const activeEntries = verticallyRelevantEntries.filter(
      (entry) => entry.hitbox.left < runEnd && entry.hitbox.right > runStart,
    );

    if (activeEntries.length === 0) {
      continue;
    }

    const largestCorridor = getLargestVerticalCorridor(activeEntries, constraints);
    const entryIds = activeEntries.map((entry) => entry.id);

    if (largestCorridor <= 0) {
      issues.push(
        createIssue({
          actual: 0,
          code: 'vertical-route-blocked',
          entryIds,
          required: constraints.minimumVerticalCorridor,
          runStart,
          runEnd,
        }),
      );
    } else if (largestCorridor < constraints.minimumVerticalCorridor) {
      issues.push(
        createIssue({
          actual: largestCorridor,
          code: 'vertical-corridor-too-narrow',
          entryIds,
          required: constraints.minimumVerticalCorridor,
          runStart,
          runEnd,
        }),
      );
    }
  }

  return issues;
};

const compareEntriesByRunPosition = (
  first: Readonly<HazardPatternEntry>,
  second: Readonly<HazardPatternEntry>,
): number => {
  const positionComparison =
    first.hitbox.left - second.hitbox.left || first.hitbox.right - second.hitbox.right;

  if (positionComparison !== 0) {
    return positionComparison;
  }

  if (first.id === second.id) {
    return 0;
  }

  return first.id < second.id ? -1 : 1;
};

const collectHorizontalEncounterGroups = (
  pattern: Readonly<HazardPattern>,
): HorizontalEncounterGroup[] => {
  const sortedEntries = [...pattern.entries].sort(compareEntriesByRunPosition);
  const groups: HorizontalEncounterGroup[] = [];

  for (const entry of sortedEntries) {
    const currentGroup = groups[groups.length - 1];

    if (currentGroup === undefined || entry.hitbox.left > currentGroup.end) {
      groups.push({
        start: entry.hitbox.left,
        end: entry.hitbox.right,
        entryIds: [entry.id],
      });
      continue;
    }

    currentGroup.end = Math.max(currentGroup.end, entry.hitbox.right);
    currentGroup.entryIds.push(entry.id);
  }

  return groups;
};

const collectReactionSpacingIssues = (
  pattern: Readonly<HazardPattern>,
  constraints: Readonly<PatternValidationConstraints>,
): ReadonlyArray<Readonly<PatternValidationIssue>> => {
  const groups = collectHorizontalEncounterGroups(pattern);
  const issues: Array<Readonly<PatternValidationIssue>> = [];

  for (let index = 1; index < groups.length; index += 1) {
    const previous = groups[index - 1];
    const current = groups[index];

    if (previous === undefined || current === undefined) {
      continue;
    }

    const spacing = current.start - previous.end;

    if (spacing < constraints.minimumReactionSpacing) {
      issues.push(
        createIssue({
          actual: spacing,
          code: 'insufficient-reaction-spacing',
          entryIds: [...previous.entryIds, ...current.entryIds],
          required: constraints.minimumReactionSpacing,
          runStart: previous.end,
          runEnd: current.start,
        }),
      );
    }
  }

  return issues;
};

/** Validates deterministic prototype fairness constraints in logical gameplay space. */
export const validatePattern = (
  pattern: Readonly<HazardPattern>,
  constraints: Readonly<PatternValidationConstraints> = PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
): Readonly<PatternValidationResult> => {
  assertValidConstraints(constraints);

  const issues = Object.freeze([
    ...collectVerticalCorridorIssues(pattern, constraints),
    ...collectReactionSpacingIssues(pattern, constraints),
  ]);

  return Object.freeze({ valid: issues.length === 0, issues });
};
