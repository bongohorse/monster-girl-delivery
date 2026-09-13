export interface PrototypeRunResultTotals {
  readonly collectedCount: number;
  readonly collectedValue: number;
  readonly earnedReward: number;
  readonly grazeCount: number;
}

export interface PrototypeRunResultSnapshot extends PrototypeRunResultTotals {
  readonly finalDistance: number;
  readonly score: number;
}

export const EMPTY_PROTOTYPE_RUN_RESULT_TOTALS: Readonly<PrototypeRunResultTotals> = Object.freeze({
  collectedCount: 0,
  collectedValue: 0,
  earnedReward: 0,
  grazeCount: 0,
});

const assertNonNegativeFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number.`);
  }
};

const assertNonNegativeInteger = (value: number, name: string): void => {
  assertNonNegativeFinite(value, name);
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} must be an integer.`);
  }
};

/**
 * M5 starts with distance as the only implemented authoritative score signal.
 * #84 and #90 own collectible/Graze qualification and may add explicitly approved prototype
 * coefficients later without presentation code recounting gameplay events.
 */
export const calculatePrototypeRunScore = (finalDistance: number): number => {
  assertNonNegativeFinite(finalDistance, 'finalDistance');
  return Math.floor(finalDistance);
};

/** Creates the flat immutable value consumed by later fail/results presentation. */
export const createPrototypeRunResultSnapshot = (
  finalDistance: number,
  totals: Readonly<PrototypeRunResultTotals> = EMPTY_PROTOTYPE_RUN_RESULT_TOTALS,
): Readonly<PrototypeRunResultSnapshot> => {
  assertNonNegativeFinite(finalDistance, 'finalDistance');
  assertNonNegativeInteger(totals.collectedCount, 'collectedCount');
  assertNonNegativeFinite(totals.collectedValue, 'collectedValue');
  assertNonNegativeFinite(totals.earnedReward, 'earnedReward');
  assertNonNegativeInteger(totals.grazeCount, 'grazeCount');

  return Object.freeze({
    finalDistance,
    score: calculatePrototypeRunScore(finalDistance),
    collectedCount: totals.collectedCount,
    collectedValue: totals.collectedValue,
    earnedReward: totals.earnedReward,
    grazeCount: totals.grazeCount,
  });
};
