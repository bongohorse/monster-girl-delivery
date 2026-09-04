import { describe, expect, it } from 'vitest';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
} from '../../src/generation/GeneratedHazardStream';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import { PROTOTYPE_HAZARD_PATTERN_FIXTURES } from '../../src/generation/PrototypeHazardPatternFixtures';

const LIVE_CONTEXT = Object.freeze({ catalog: PROTOTYPE_HAZARD_PATTERN_FIXTURES });

const BLOCKED_PATTERN = createHazardPattern({
  id: 'blocked-stream-pattern',
  runLength: 300,
  entries: [
    {
      id: 'top',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 48, bottom: 220 },
    },
    {
      id: 'bottom',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 200, bottom: 342 },
    },
  ],
});

describe('generated hazard stream', () => {
  it('pre-fills and advances multiple deterministic patterns from run distance', () => {
    const initial = createGeneratedHazardStream('stream-progress', LIVE_CONTEXT);
    const advanced = advanceGeneratedHazardStream(initial, 1_000, LIVE_CONTEXT);

    expect(initial.scheduledPatternCount).toBeGreaterThan(1);
    expect(initial.spawns.length).toBeGreaterThan(1);
    expect(advanced.scheduledPatternCount).toBeGreaterThan(initial.scheduledPatternCount);
    expect(advanced.nextPatternStartDistance).toBeGreaterThan(initial.nextPatternStartDistance);
    expect(advanced.runDistance).toBe(1_000);
  });

  it('reproduces the same logical sequence when restarted from the same seed', () => {
    const first = createGeneratedHazardStream('same-run-seed', LIVE_CONTEXT);
    const progressed = advanceGeneratedHazardStream(first, 900, LIVE_CONTEXT);
    const restarted = createGeneratedHazardStream('same-run-seed', LIVE_CONTEXT);
    const replayedProgress = advanceGeneratedHazardStream(restarted, 900, LIVE_CONTEXT);

    expect(restarted).toEqual(first);
    expect(replayedProgress).toEqual(progressed);
  });

  it('returns the same state without duplicate spawns at repeated run distance', () => {
    const initial = createGeneratedHazardStream('no-duplicates', LIVE_CONTEXT);
    const advanced = advanceGeneratedHazardStream(initial, 700, LIVE_CONTEXT);
    const repeated = advanceGeneratedHazardStream(advanced, 700, LIVE_CONTEXT);

    expect(repeated).toBe(advanced);
    expect(new Set(repeated.spawns).size).toBe(repeated.spawns.length);
  });

  it('does not consume generation state for zero-delta progress', () => {
    const initial = createGeneratedHazardStream('paused-stream', LIVE_CONTEXT);
    const paused = advanceGeneratedHazardStream(initial, 0, LIVE_CONTEXT);

    expect(paused).toBe(initial);
    expect(paused.generationState).toBe(initial.generationState);
  });

  it('removes hazards only after they leave the fixed logical retention window', () => {
    const initial = createGeneratedHazardStream('retention-window', LIVE_CONTEXT);
    const firstSpawn = initial.spawns[0];

    expect(firstSpawn).toBeDefined();
    if (!firstSpawn) {
      throw new Error('Expected the initial stream to contain a hazard.');
    }

    const advanced = advanceGeneratedHazardStream(
      initial,
      firstSpawn.hitbox.right + PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG.retainBehindDistance + 1,
      LIVE_CONTEXT,
    );

    expect(advanced.spawns).not.toContain(firstSpawn);
    expect(advanced.spawns.every((spawn) => spawn.runDistance >= firstSpawn.runDistance)).toBe(
      true,
    );
  });

  it('records terminal scheduler exhaustion instead of retrying forever', () => {
    const context = {
      catalog: [BLOCKED_PATTERN],
      config: {
        ...PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
        maxCandidateAttempts: 3,
      },
    };
    const exhausted = createGeneratedHazardStream('exhausted-stream', context);
    const generationStateAfterFailure = exhausted.generationState;
    const advanced = advanceGeneratedHazardStream(exhausted, 100, context);

    expect(exhausted.status).toBe('exhausted');
    expect(exhausted.spawns).toEqual([]);
    expect(advanced.generationState).toBe(generationStateAfterFailure);
    expect(advanced.status).toBe('exhausted');
  });

  it('rejects invalid or backward progress and invalid logical window configuration', () => {
    const initial = createGeneratedHazardStream('invalid-progress', LIVE_CONTEXT);

    expect(() => advanceGeneratedHazardStream(initial, -1, LIVE_CONTEXT)).toThrow(RangeError);
    expect(() => advanceGeneratedHazardStream(initial, Number.NaN, LIVE_CONTEXT)).toThrow(
      RangeError,
    );
    expect(() =>
      advanceGeneratedHazardStream(initial, initial.runDistance - 1, LIVE_CONTEXT),
    ).toThrow(RangeError);
    expect(() =>
      createGeneratedHazardStream('invalid-window', {
        catalog: PROTOTYPE_HAZARD_PATTERN_FIXTURES,
        config: {
          ...PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
          spawnAheadDistance: 0,
        },
      }),
    ).toThrow(RangeError);
  });

  it('keeps immutable logical output independent of viewport state', () => {
    const stream = createGeneratedHazardStream('logical-stream', LIVE_CONTEXT);

    expect(Object.isFrozen(stream)).toBe(true);
    expect(Object.isFrozen(stream.spawns)).toBe(true);
    expect(JSON.stringify(stream)).not.toMatch(/viewport|screen|phaser/i);
  });
});
