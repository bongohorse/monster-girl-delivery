import { describe, expect, it } from 'vitest';
import {
  getLogicalCollectibleSpawnIdentity,
  reconcileGeneratedCollectibles,
} from '../../src/generation/GeneratedCollectibles';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';

describe('GeneratedCollectibles', () => {
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

  it('preserves accepted geometry and distinguishes risk-reward path identity', () => {
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
    const preserved = reconcileGeneratedCollectibles(
      initial,
      [],
      [PROTOTYPE_OFFSET_PAIR_PATTERN],
      2_100,
    );

    expect(initial).toHaveLength(5);
    expect(initial.every((spawn) => spawn.intent === 'risk-reward')).toBe(true);
    expect(preserved).toEqual(initial);
    expect(preserved[0]).toBe(initial[0]);
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
