import { MAX_PROTOTYPE_ENCOUNTER_COST } from './EncounterProfile';
import type { HazardPattern } from './HazardPattern';

const MAX_PROTOTYPE_TRACKED_ENCOUNTERS = 64;

export interface EncounterReadabilityLimits {
  readonly maximumActivePressureCost: number;
  readonly maximumActiveReadabilityCost: number;
  readonly maximumConcurrentLethalWindows: number;
  readonly maximumConcurrentWarnings: number;
}

export interface EncounterReadabilityBudgetConfig {
  readonly hardLimits: Readonly<EncounterReadabilityLimits>;
  readonly maximumTrackedEncounters: number;
}

/** Relative simulation-time interval using [start, end) edge semantics. */
export interface EncounterReadabilityWindow {
  readonly endSeconds: number;
  readonly startSeconds: number;
}

export interface EncounterReadabilityTiming {
  /** Entire interval during which the encounter contributes its profile costs. */
  readonly activeWindow: Readonly<EncounterReadabilityWindow>;
  readonly lethalWindows: ReadonlyArray<Readonly<EncounterReadabilityWindow>>;
  readonly warningWindows: ReadonlyArray<Readonly<EncounterReadabilityWindow>>;
}

export interface EncounterReadabilityReservation extends EncounterReadabilityTiming {
  /** Stable identity for this scheduled occurrence, distinct from reusable pattern identity. */
  readonly encounterId: string;
  readonly patternId: string;
  readonly pressureCost: number;
  readonly readabilityCost: number;
}

export interface EncounterReadabilityBudgetState {
  readonly reservations: ReadonlyArray<Readonly<EncounterReadabilityReservation>>;
}

export interface EncounterReadabilityBudgetRequest {
  readonly candidate: Readonly<EncounterReadabilityReservation>;
  /** Optional pressure request; hard limits remain an upper bound. Zero supports breathers. */
  readonly requestedLimits?: Readonly<EncounterReadabilityLimits>;
}

export type EncounterReadabilityBudgetIssueCode =
  | 'active-pressure-budget-exceeded'
  | 'active-readability-budget-exceeded'
  | 'warning-concurrency-exceeded'
  | 'lethal-concurrency-exceeded'
  | 'tracked-encounter-capacity-exceeded';

export interface EncounterReadabilityBudgetIssue {
  readonly actual: number;
  readonly atSeconds: number;
  readonly code: EncounterReadabilityBudgetIssueCode;
  readonly limit: number;
}

export interface EncounterReadabilityMetricUsage {
  readonly actual: number;
  readonly atSeconds: number;
  readonly limit: number;
}

export interface EncounterReadabilityUsage {
  readonly activePressureCost: Readonly<EncounterReadabilityMetricUsage>;
  readonly activeReadabilityCost: Readonly<EncounterReadabilityMetricUsage>;
  readonly concurrentLethalWindows: Readonly<EncounterReadabilityMetricUsage>;
  readonly concurrentWarnings: Readonly<EncounterReadabilityMetricUsage>;
}

export interface EncounterReadabilityBudgetDecision {
  readonly effectiveLimits: Readonly<EncounterReadabilityLimits>;
  readonly issues: ReadonlyArray<Readonly<EncounterReadabilityBudgetIssue>>;
  /** Accepted decisions contain the new reservation; deferred decisions retain the input state. */
  readonly state: Readonly<EncounterReadabilityBudgetState>;
  readonly status: 'reserved' | 'deferred';
  readonly usage: Readonly<EncounterReadabilityUsage>;
}

export const PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG: Readonly<EncounterReadabilityBudgetConfig> =
  Object.freeze({
    hardLimits: Object.freeze({
      maximumActivePressureCost: 6,
      maximumActiveReadabilityCost: 6,
      maximumConcurrentWarnings: 2,
      maximumConcurrentLethalWindows: 2,
    }),
    maximumTrackedEncounters: 32,
  });

const EMPTY_ENCOUNTER_READABILITY_BUDGET_STATE: Readonly<EncounterReadabilityBudgetState> =
  Object.freeze({ reservations: Object.freeze([]) });

const assertNonNegativeSafeInteger = (value: number, name: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer.`);
  }
};

const assertStableId = (id: string, name: string): void => {
  if (id.length === 0 || id !== id.trim()) {
    throw new TypeError(`${name} must be non-empty and have no surrounding whitespace.`);
  }
};

const assertValidLimits = (limits: Readonly<EncounterReadabilityLimits>): void => {
  assertNonNegativeSafeInteger(limits.maximumActivePressureCost, 'maximumActivePressureCost');
  assertNonNegativeSafeInteger(limits.maximumActiveReadabilityCost, 'maximumActiveReadabilityCost');
  assertNonNegativeSafeInteger(limits.maximumConcurrentWarnings, 'maximumConcurrentWarnings');
  assertNonNegativeSafeInteger(
    limits.maximumConcurrentLethalWindows,
    'maximumConcurrentLethalWindows',
  );
};

export const createEncounterReadabilityBudgetConfig = (
  definition: Readonly<EncounterReadabilityBudgetConfig>,
): Readonly<EncounterReadabilityBudgetConfig> => {
  assertValidLimits(definition.hardLimits);
  if (
    !Number.isSafeInteger(definition.maximumTrackedEncounters) ||
    definition.maximumTrackedEncounters <= 0 ||
    definition.maximumTrackedEncounters > MAX_PROTOTYPE_TRACKED_ENCOUNTERS
  ) {
    throw new RangeError(
      `maximumTrackedEncounters must be a positive safe integer no greater than ${MAX_PROTOTYPE_TRACKED_ENCOUNTERS}.`,
    );
  }

  return Object.freeze({
    hardLimits: Object.freeze({ ...definition.hardLimits }),
    maximumTrackedEncounters: definition.maximumTrackedEncounters,
  });
};

export const resolveEncounterReadabilityLimits = (
  requested: Readonly<EncounterReadabilityLimits>,
  config: Readonly<EncounterReadabilityBudgetConfig> = PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG,
): Readonly<EncounterReadabilityLimits> => {
  const validatedConfig = createEncounterReadabilityBudgetConfig(config);
  assertValidLimits(requested);

  return Object.freeze({
    maximumActivePressureCost: Math.min(
      requested.maximumActivePressureCost,
      validatedConfig.hardLimits.maximumActivePressureCost,
    ),
    maximumActiveReadabilityCost: Math.min(
      requested.maximumActiveReadabilityCost,
      validatedConfig.hardLimits.maximumActiveReadabilityCost,
    ),
    maximumConcurrentWarnings: Math.min(
      requested.maximumConcurrentWarnings,
      validatedConfig.hardLimits.maximumConcurrentWarnings,
    ),
    maximumConcurrentLethalWindows: Math.min(
      requested.maximumConcurrentLethalWindows,
      validatedConfig.hardLimits.maximumConcurrentLethalWindows,
    ),
  });
};

const snapshotWindow = (
  window: Readonly<EncounterReadabilityWindow>,
  name: string,
): Readonly<EncounterReadabilityWindow> => {
  if (
    !Number.isFinite(window.startSeconds) ||
    window.startSeconds < 0 ||
    !Number.isFinite(window.endSeconds) ||
    window.endSeconds <= window.startSeconds
  ) {
    throw new RangeError(`${name} must be a finite positive [start, end) interval.`);
  }

  return Object.freeze({ startSeconds: window.startSeconds, endSeconds: window.endSeconds });
};

const snapshotReservation = (
  reservation: Readonly<EncounterReadabilityReservation>,
): Readonly<EncounterReadabilityReservation> => {
  assertStableId(reservation.encounterId, 'Readability reservation encounterId');
  assertStableId(reservation.patternId, 'Readability reservation patternId');
  assertNonNegativeSafeInteger(reservation.pressureCost, 'Readability reservation pressureCost');
  assertNonNegativeSafeInteger(
    reservation.readabilityCost,
    'Readability reservation readabilityCost',
  );
  if (
    reservation.pressureCost > MAX_PROTOTYPE_ENCOUNTER_COST ||
    reservation.readabilityCost > MAX_PROTOTYPE_ENCOUNTER_COST
  ) {
    throw new RangeError(
      `Readability reservation costs must not exceed ${MAX_PROTOTYPE_ENCOUNTER_COST}.`,
    );
  }

  const activeWindow = snapshotWindow(reservation.activeWindow, 'Encounter activeWindow');
  const snapshotContainedWindows = (
    windows: ReadonlyArray<Readonly<EncounterReadabilityWindow>>,
    name: string,
  ): ReadonlyArray<Readonly<EncounterReadabilityWindow>> =>
    Object.freeze(
      windows.map((window) => {
        const snapshot = snapshotWindow(window, name);
        if (
          snapshot.startSeconds < activeWindow.startSeconds ||
          snapshot.endSeconds > activeWindow.endSeconds
        ) {
          throw new RangeError(`${name} must remain within the encounter activeWindow.`);
        }
        return snapshot;
      }),
    );

  return Object.freeze({
    encounterId: reservation.encounterId,
    patternId: reservation.patternId,
    pressureCost: reservation.pressureCost,
    readabilityCost: reservation.readabilityCost,
    activeWindow,
    lethalWindows: snapshotContainedWindows(reservation.lethalWindows, 'Encounter lethalWindow'),
    warningWindows: snapshotContainedWindows(reservation.warningWindows, 'Encounter warningWindow'),
  });
};

/** Copies profile costs into an explicit logical schedule supplied by later orchestration. */
export const createEncounterReadabilityCandidate = (
  pattern: Readonly<HazardPattern>,
  encounterId: string,
  timing: Readonly<EncounterReadabilityTiming>,
): Readonly<EncounterReadabilityReservation> =>
  snapshotReservation({
    ...timing,
    encounterId,
    patternId: pattern.id,
    pressureCost: pattern.profile.pressureCost,
    readabilityCost: pattern.profile.readabilityCost,
  });

export const createEncounterReadabilityBudgetState = (
  reservations: ReadonlyArray<Readonly<EncounterReadabilityReservation>> = [],
  config: Readonly<EncounterReadabilityBudgetConfig> = PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG,
): Readonly<EncounterReadabilityBudgetState> => {
  const validatedConfig = createEncounterReadabilityBudgetConfig(config);
  if (reservations.length > validatedConfig.maximumTrackedEncounters) {
    throw new RangeError('Readability reservations exceed maximumTrackedEncounters.');
  }

  const encounterIds = new Set<string>();
  const snapshots = reservations.map((reservation) => {
    const snapshot = snapshotReservation(reservation);
    if (encounterIds.has(snapshot.encounterId)) {
      throw new TypeError(
        `Readability reservation encounterIds must be unique: ${snapshot.encounterId}`,
      );
    }
    encounterIds.add(snapshot.encounterId);
    return snapshot;
  });

  return snapshots.length === 0
    ? EMPTY_ENCOUNTER_READABILITY_BUDGET_STATE
    : Object.freeze({ reservations: Object.freeze(snapshots) });
};

interface WeightedWindow {
  readonly value: number;
  readonly window: Readonly<EncounterReadabilityWindow>;
}

const calculatePeakUsage = (
  weightedWindows: ReadonlyArray<Readonly<WeightedWindow>>,
  limit: number,
): Readonly<EncounterReadabilityMetricUsage> => {
  const startTimes = [...new Set(weightedWindows.map(({ window }) => window.startSeconds))].sort(
    (first, second) => first - second,
  );
  let actual = 0;
  let atSeconds = 0;

  for (const startSeconds of startTimes) {
    const usage = weightedWindows.reduce(
      (sum, item) =>
        item.window.startSeconds <= startSeconds && startSeconds < item.window.endSeconds
          ? sum + item.value
          : sum,
      0,
    );
    if (usage > actual) {
      actual = usage;
      atSeconds = startSeconds;
    }
  }

  return Object.freeze({ actual, atSeconds, limit });
};

const calculateUsage = (
  reservations: ReadonlyArray<Readonly<EncounterReadabilityReservation>>,
  limits: Readonly<EncounterReadabilityLimits>,
): Readonly<EncounterReadabilityUsage> => {
  const costWindows = reservations.map((reservation) => ({
    reservation,
    window: reservation.activeWindow,
  }));
  const warningWindows = reservations.flatMap((reservation) => reservation.warningWindows);
  const lethalWindows = reservations.flatMap((reservation) => reservation.lethalWindows);

  return Object.freeze({
    activePressureCost: calculatePeakUsage(
      costWindows.map(({ reservation, window }) => ({ value: reservation.pressureCost, window })),
      limits.maximumActivePressureCost,
    ),
    activeReadabilityCost: calculatePeakUsage(
      costWindows.map(({ reservation, window }) => ({
        value: reservation.readabilityCost,
        window,
      })),
      limits.maximumActiveReadabilityCost,
    ),
    concurrentWarnings: calculatePeakUsage(
      warningWindows.map((window) => ({ value: 1, window })),
      limits.maximumConcurrentWarnings,
    ),
    concurrentLethalWindows: calculatePeakUsage(
      lethalWindows.map((window) => ({ value: 1, window })),
      limits.maximumConcurrentLethalWindows,
    ),
  });
};

const createIssue = (
  code: EncounterReadabilityBudgetIssueCode,
  usage: Readonly<EncounterReadabilityMetricUsage>,
): Readonly<EncounterReadabilityBudgetIssue> => Object.freeze({ code, ...usage });

/**
 * Reserves one candidate only when its complete pending/active schedule stays within every limit.
 * Difficulty or pacing requests are intersected with the hard config and therefore cannot relax it.
 */
export const reserveEncounterReadabilityBudget = (
  state: Readonly<EncounterReadabilityBudgetState>,
  request: Readonly<EncounterReadabilityBudgetRequest>,
  config: Readonly<EncounterReadabilityBudgetConfig> = PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG,
): Readonly<EncounterReadabilityBudgetDecision> => {
  const validatedConfig = createEncounterReadabilityBudgetConfig(config);
  const validatedState = createEncounterReadabilityBudgetState(state.reservations, validatedConfig);
  const candidate = snapshotReservation(request.candidate);
  if (
    validatedState.reservations.some(
      (reservation) => reservation.encounterId === candidate.encounterId,
    )
  ) {
    throw new TypeError(
      `Readability reservation encounterId already exists: ${candidate.encounterId}`,
    );
  }

  const effectiveLimits = resolveEncounterReadabilityLimits(
    request.requestedLimits ?? validatedConfig.hardLimits,
    validatedConfig,
  );
  const proposedReservations = [...validatedState.reservations, candidate];
  const usage = calculateUsage(proposedReservations, effectiveLimits);
  const issues: Array<Readonly<EncounterReadabilityBudgetIssue>> = [];

  if (usage.activePressureCost.actual > usage.activePressureCost.limit) {
    issues.push(createIssue('active-pressure-budget-exceeded', usage.activePressureCost));
  }
  if (usage.activeReadabilityCost.actual > usage.activeReadabilityCost.limit) {
    issues.push(createIssue('active-readability-budget-exceeded', usage.activeReadabilityCost));
  }
  if (usage.concurrentWarnings.actual > usage.concurrentWarnings.limit) {
    issues.push(createIssue('warning-concurrency-exceeded', usage.concurrentWarnings));
  }
  if (usage.concurrentLethalWindows.actual > usage.concurrentLethalWindows.limit) {
    issues.push(createIssue('lethal-concurrency-exceeded', usage.concurrentLethalWindows));
  }
  if (proposedReservations.length > validatedConfig.maximumTrackedEncounters) {
    issues.push(
      Object.freeze({
        actual: proposedReservations.length,
        atSeconds: candidate.activeWindow.startSeconds,
        code: 'tracked-encounter-capacity-exceeded',
        limit: validatedConfig.maximumTrackedEncounters,
      }),
    );
  }

  const frozenIssues = Object.freeze(issues);
  if (frozenIssues.length > 0) {
    return Object.freeze({
      effectiveLimits,
      issues: frozenIssues,
      state,
      status: 'deferred',
      usage,
    });
  }

  return Object.freeze({
    effectiveLimits,
    issues: frozenIssues,
    state: createEncounterReadabilityBudgetState(proposedReservations, validatedConfig),
    status: 'reserved',
    usage,
  });
};

const shiftWindow = (
  window: Readonly<EncounterReadabilityWindow>,
  elapsedSeconds: number,
): Readonly<EncounterReadabilityWindow> | null => {
  if (window.endSeconds <= elapsedSeconds) {
    return null;
  }

  return Object.freeze({
    startSeconds: Math.max(0, window.startSeconds - elapsedSeconds),
    endSeconds: window.endSeconds - elapsedSeconds,
  });
};

/** Advances only from normalized simulation delta; zero delta preserves state identity. */
export const stepEncounterReadabilityBudget = (
  state: Readonly<EncounterReadabilityBudgetState>,
  elapsedSeconds: number,
  config: Readonly<EncounterReadabilityBudgetConfig> = PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG,
): Readonly<EncounterReadabilityBudgetState> => {
  const validatedConfig = createEncounterReadabilityBudgetConfig(config);
  createEncounterReadabilityBudgetState(state.reservations, validatedConfig);
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Readability budget elapsedSeconds must be non-negative and finite.');
  }
  if (elapsedSeconds === 0 || state.reservations.length === 0) {
    return state;
  }

  const reservations: Array<Readonly<EncounterReadabilityReservation>> = [];
  for (const reservation of state.reservations) {
    const activeWindow = shiftWindow(reservation.activeWindow, elapsedSeconds);
    if (activeWindow === null) {
      continue;
    }

    const shiftContainedWindows = (
      windows: ReadonlyArray<Readonly<EncounterReadabilityWindow>>,
    ): ReadonlyArray<Readonly<EncounterReadabilityWindow>> =>
      windows.flatMap((window) => {
        const shifted = shiftWindow(window, elapsedSeconds);
        return shifted === null ? [] : [shifted];
      });
    reservations.push(
      snapshotReservation({
        ...reservation,
        activeWindow,
        lethalWindows: shiftContainedWindows(reservation.lethalWindows),
        warningWindows: shiftContainedWindows(reservation.warningWindows),
      }),
    );
  }

  return createEncounterReadabilityBudgetState(reservations, validatedConfig);
};
