import {
  evaluateFlightReachability,
  type FlightReachabilityResult,
  type PatternReachabilityContext,
  PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
  type VerticalCorridor,
} from './FlightReachability';
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
  | 'vertical-corridor-unreachable'
  | 'vertical-route-blocked';

interface PatternValidationIssueBase {
  readonly code: PatternValidationIssueCode;
  readonly entryIds: ReadonlyArray<string>;
  readonly runEnd: number;
  readonly runStart: number;
}

export interface PatternThresholdValidationIssue extends PatternValidationIssueBase {
  readonly actual: number;
  readonly code: Exclude<PatternValidationIssueCode, 'vertical-corridor-unreachable'>;
  readonly required: number;
}

export interface PatternReachabilityValidationIssue extends PatternValidationIssueBase {
  readonly code: 'vertical-corridor-unreachable';
  readonly reachability: Readonly<FlightReachabilityResult>;
}

export type PatternValidationIssue =
  | PatternThresholdValidationIssue
  | PatternReachabilityValidationIssue;

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

const createIssue = <Issue extends PatternValidationIssue>(issue: Issue): Readonly<Issue> =>
  Object.freeze({
    ...issue,
    entryIds: Object.freeze([...issue.entryIds]),
  }) as Readonly<Issue>;

const getVerticalCorridors = (
  entries: ReadonlyArray<Readonly<HazardPatternEntry>>,
  constraints: Readonly<PatternValidationConstraints>,
): ReadonlyArray<Readonly<VerticalCorridor>> => {
  const occupiedIntervals = entries
    .map((entry) => ({
      top: Math.max(entry.hitbox.top, constraints.playableTop),
      bottom: Math.min(entry.hitbox.bottom, constraints.playableBottom),
    }))
    .filter((interval) => interval.bottom > interval.top)
    .sort((first, second) => first.top - second.top || first.bottom - second.bottom);

  let occupiedThrough = constraints.playableTop;
  const corridors: Array<Readonly<VerticalCorridor>> = [];

  for (const interval of occupiedIntervals) {
    if (interval.top > occupiedThrough) {
      corridors.push(Object.freeze({ top: occupiedThrough, bottom: interval.top }));
    }
    occupiedThrough = Math.max(occupiedThrough, interval.bottom);
  }

  if (occupiedThrough < constraints.playableBottom) {
    corridors.push(Object.freeze({ top: occupiedThrough, bottom: constraints.playableBottom }));
  }

  return Object.freeze(corridors);
};

const collectVerticalCorridorIssues = (
  pattern: Readonly<HazardPattern>,
  constraints: Readonly<PatternValidationConstraints>,
  reachabilityContext: Readonly<PatternReachabilityContext>,
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

    const corridors = getVerticalCorridors(activeEntries, constraints);
    const largestCorridor = corridors.reduce(
      (largest, corridor) => Math.max(largest, corridor.bottom - corridor.top),
      0,
    );
    const eligibleCorridors = corridors.filter(
      (corridor) => corridor.bottom - corridor.top >= constraints.minimumVerticalCorridor,
    );
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
    } else {
      const reachability = evaluateFlightReachability(
        eligibleCorridors,
        {
          ceilingY: constraints.playableTop + reachabilityContext.playerExtents.top,
          floorY: constraints.playableBottom - reachabilityContext.playerExtents.bottom,
        },
        reachabilityContext,
      );

      if (!reachability.reachable) {
        issues.push(
          createIssue({
            code: 'vertical-corridor-unreachable',
            entryIds,
            reachability,
            runStart,
            runEnd,
          }),
        );
      }
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

/** Validates deterministic geometry and flight reachability in logical gameplay space. */
export const validatePattern = (
  pattern: Readonly<HazardPattern>,
  constraints: Readonly<PatternValidationConstraints> = PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
  reachabilityContext: Readonly<PatternReachabilityContext> = PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
): Readonly<PatternValidationResult> => {
  assertValidConstraints(constraints);

  const issues = Object.freeze([
    ...collectVerticalCorridorIssues(pattern, constraints, reachabilityContext),
    ...collectReactionSpacingIssues(pattern, constraints),
  ]);

  return Object.freeze({ valid: issues.length === 0, issues });
};
