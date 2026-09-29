export interface PrototypeRunResultTotals {
  readonly collectedCount: number;
  readonly collectedValue: number;
  /** Coin pickups before the delivery bonus is applied at run end. */
  readonly earnedReward: number;
  readonly grazeCount: number;
  readonly deliveryCount?: number;
}

export interface PrototypeRunResultSnapshot extends PrototypeRunResultTotals {
  readonly deliveryCount: number;
  readonly deliveryReward: number;
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

const DELIVERY_BONUS_STEPS = Object.freeze([100, 150, 225, 338]);
const DELIVERY_BONUS_CAP = 400;

/** Hand-countable prototype sequence: 100, 150, 225, 338, then 400 per delivery. */
export const calculateDeliveryBonus = (deliveryIndex: number): number => {
  assertNonNegativeInteger(deliveryIndex, 'deliveryIndex');
  return DELIVERY_BONUS_STEPS[deliveryIndex] ?? DELIVERY_BONUS_CAP;
};

export const calculateDeliveryReward = (completedCount: number): number => {
  assertNonNegativeInteger(completedCount, 'completedCount');
  let total = 0;
  for (let index = 0; index < Math.min(completedCount, DELIVERY_BONUS_STEPS.length); index++) {
    total += calculateDeliveryBonus(index);
  }
  total += Math.max(0, completedCount - DELIVERY_BONUS_STEPS.length) * DELIVERY_BONUS_CAP;
  if (!Number.isSafeInteger(total)) {
    throw new RangeError('Delivery reward exceeds the supported integer range.');
  }
  return total;
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
  const deliveryCount = totals.deliveryCount ?? 0;
  const deliveryReward = calculateDeliveryReward(deliveryCount);
  const earnedReward = totals.earnedReward + deliveryReward;
  assertNonNegativeFinite(earnedReward, 'total earnedReward');

  return Object.freeze({
    finalDistance,
    score: calculatePrototypeRunScore(finalDistance),
    collectedCount: totals.collectedCount,
    collectedValue: totals.collectedValue,
    deliveryCount,
    deliveryReward,
    earnedReward,
    grazeCount: totals.grazeCount,
  });
};
