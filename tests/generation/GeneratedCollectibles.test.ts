import { describe, expect, it } from 'vitest';
import {
  getLogicalCollectibleSpawnIdentity,
  getNextGeneratedCollectiblePruneDistance,
  materializePatternCollectibles,
  reconcileGeneratedCollectibles,
} from '../../src/generation/GeneratedCollectibles';
import { M5_TEACHING_FLIGHT_ARC_PATTERN } from '../../src/generation/M5CollectibleMovementPatterns';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';

describe('GeneratedCollectibles', () => {
  it('materializes one authored collectible-heavy occurrence through the shared path logic', () => {
    const first = materializePatternCollectibles(M5_TEACHING_FLIGHT_ARC_PATTERN, 1_000);
    const repeated = materializePatternCollectibles(M5_TEACHING_FLIGHT_ARC_PATTERN, 1_000);

    expect(first).toHaveLength(60);
    expect(first[0]?.runDistance).toBe(1_000);
    expect(first.at(-1)?.runDistance).toBeGreaterThan(first[0]?.runDistance ?? 0);
    expect(first.map(getLogicalCollectibleSpawnIdentity)).toEqual(
      repeated.map(getLogicalCollectibleSpawnIdentity),
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    expect(() => materializePatternCollectibles(M5_TEACHING_FLIGHT_ARC_PATTERN, -1)).toThrow(
      RangeError,
    );
  });

  it('materializes accepted safe-guide path points without consuming another random decision', () => {
    const initialState = createRunGenerationState('collectible-safe-guide');
    const schedule = scheduleNextPattern({
      catalog: [PROTOTYPE_CORRIDOR_PATTERN],
      patternStartDistance: 1_000,
      state: initialState,
    });

    expect(schedule.status).toBe('accepted');
    if (schedule.status !== 'accepted') {
      throw new Error('Expected corridor pattern to be accepted.');
    }

    const first = reconcileGeneratedCollectibles(
      [],
      schedule.spawns,
      [PROTOTYPE_CORRIDOR_PATTERN],
      0,
    );
    const repeated = reconcileGeneratedCollectibles(
      [],
      schedule.spawns,
      [PROTOTYPE_CORRIDOR_PATTERN],
      0,
    );

    expect(first.map((spawn) => spawn.runDistance)).toEqual([1_080, 1_140, 1_184, 1_248, 1_320]);
    expect(first.map((spawn) => spawn.y)).toEqual([195, 195, 195, 195, 195]);
    expect(first.every((spawn) => spawn.intent === 'safe-guide' && spawn.value === 1)).toBe(true);
    expect(first.map(getLogicalCollectibleSpawnIdentity)).toEqual(
      repeated.map(getLogicalCollectibleSpawnIdentity),
    );
    expect(schedule.state).not.toBe(initialState);
  });

  it('preserves accepted geometry when resize/domain reconciliation no longer rematerializes it', () => {
    const schedule = scheduleNextPattern({
      catalog: [PROTOTYPE_OFFSET_PAIR_PATTERN],
      patternStartDistance: 2_000,
      state: createRunGenerationState('collectible-risk-route'),
    });

    expect(schedule.status).toBe('accepted');
    if (schedule.status !== 'accepted') {
      throw new Error('Expected offset-pair pattern to be accepted.');
    }

    const initial = reconcileGeneratedCollectibles(
      [],
      schedule.spawns,
      [PROTOTYPE_OFFSET_PAIR_PATTERN],
      0,
    );
    const preserved = reconcileGeneratedCollectibles(initial, [], [], 2_100);

    expect(initial).toHaveLength(5);
    expect(initial.every((spawn) => spawn.intent === 'risk-reward')).toBe(true);
    expect(preserved).toEqual(initial);
    expect(preserved[0]).toBe(initial[0]);
  });

  it('exposes the next distance where retained collectible pruning can matter', () => {
    const first = Object.freeze({
      intent: 'safe-guide' as const,
      pathId: 'first',
      pathPointIndex: 0,
      patternId: 'pattern',
      patternStartDistance: 0,
      runDistance: 80,
      value: 1,
      y: 195,
    });
    const second = Object.freeze({ ...first, pathId: 'second', runDistance: 140 });

    expect(getNextGeneratedCollectiblePruneDistance([])).toBeNull();
    expect(getNextGeneratedCollectiblePruneDistance([first, second])).toBe(240);
    expect(getNextGeneratedCollectiblePruneDistance([first], 20)).toBe(100);
    expect(() => getNextGeneratedCollectiblePruneDistance([first], -1)).toThrow(RangeError);
  });

  it('evicts collectible instances only after the bounded behind-distance retention window', () => {
    const schedule = scheduleNextPattern({
      catalog: [PROTOTYPE_CORRIDOR_PATTERN],
      patternStartDistance: 0,
      state: createRunGenerationState('collectible-retention'),
    });

    expect(schedule.status).toBe('accepted');
    if (schedule.status !== 'accepted') {
      throw new Error('Expected corridor pattern to be accepted.');
    }

    const initial = reconcileGeneratedCollectibles(
      [],
      schedule.spawns,
      [PROTOTYPE_CORRIDOR_PATTERN],
      0,
    );
    const retained = reconcileGeneratedCollectibles(initial, [], [], 240);
    const evicted = reconcileGeneratedCollectibles(initial, [], [], 500);

    expect(retained.map((spawn) => spawn.runDistance)).toEqual([80, 140, 184, 248, 320]);
    expect(evicted).toEqual([]);
  });
});
