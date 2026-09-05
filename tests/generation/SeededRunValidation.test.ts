import { describe, expect, it } from 'vitest';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  type GeneratedHazardSpawnInstance,
  type GeneratedHazardStreamContext,
  PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
  PROTOTYPE_LIVE_RUN_SEED,
} from '../../src/generation/GeneratedHazardStream';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_HAZARD_PATTERN_FIXTURES,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import type { SeedInput } from '../../src/generation/SeededPrng';
import { PROTOTYPE_PLAYER_COLLISION_EXTENTS } from '../../src/systems/HazardCollision';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

interface AcceptedPatternTrace {
  readonly patternId: string;
  readonly runDistances: ReadonlyArray<number>;
}

const VALIDATION_STREAM_CONFIG = Object.freeze({
  ...PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
  reactionTime: { minimumReactionTimeSeconds: 2 },
  retainBehindDistance: 100_000,
});
// The player-right collision extent plus this two-second horizon preserves the recorded M3 start.
const VALIDATION_RUN_MOTION = Object.freeze({ baseScrollSpeed: 491 });

const VALIDATION_CONTEXT: Readonly<GeneratedHazardStreamContext> = Object.freeze({
  catalog: PROTOTYPE_HAZARD_PATTERN_FIXTURES,
  config: VALIDATION_STREAM_CONFIG,
});

const REPRESENTATIVE_TRACES: ReadonlyArray<{
  readonly expected: ReadonlyArray<AcceptedPatternTrace>;
  readonly normalizedSeed: number;
  readonly seed: SeedInput;
}> = [
  {
    seed: 60,
    normalizedSeed: 60,
    expected: [
      { patternId: 'prototype-line', runDistances: [1_120, 1_276, 1_432] },
      { patternId: 'prototype-line', runDistances: [1_720, 1_876, 2_032] },
      { patternId: 'prototype-line', runDistances: [2_320, 2_476, 2_632] },
      { patternId: 'prototype-corridor', runDistances: [2_960, 2_960] },
      { patternId: 'prototype-corridor', runDistances: [3_360, 3_360] },
      { patternId: 'prototype-offset-pair', runDistances: [3_720, 3_930] },
    ],
  },
  {
    seed: 61,
    normalizedSeed: 61,
    expected: [
      { patternId: 'prototype-corridor', runDistances: [1_160, 1_160] },
      { patternId: 'prototype-offset-pair', runDistances: [1_520, 1_730] },
      { patternId: 'prototype-offset-pair', runDistances: [2_040, 2_250] },
      { patternId: 'prototype-offset-pair', runDistances: [2_560, 2_770] },
      { patternId: 'prototype-line', runDistances: [3_080, 3_236, 3_392] },
      { patternId: 'prototype-line', runDistances: [3_680, 3_836, 3_992] },
    ],
  },
  {
    seed: 62,
    normalizedSeed: 62,
    expected: [
      { patternId: 'prototype-offset-pair', runDistances: [1_120, 1_330] },
      { patternId: 'prototype-line', runDistances: [1_640, 1_796, 1_952] },
      { patternId: 'prototype-line', runDistances: [2_240, 2_396, 2_552] },
      { patternId: 'prototype-corridor', runDistances: [2_880, 2_880] },
      { patternId: 'prototype-line', runDistances: [3_240, 3_396, 3_552] },
      { patternId: 'prototype-line', runDistances: [3_840, 3_996, 4_152] },
    ],
  },
  {
    seed: PROTOTYPE_LIVE_RUN_SEED,
    normalizedSeed: 3_433_278_918,
    expected: [
      { patternId: 'prototype-offset-pair', runDistances: [1_120, 1_330] },
      { patternId: 'prototype-line', runDistances: [1_640, 1_796, 1_952] },
      { patternId: 'prototype-corridor', runDistances: [2_280, 2_280] },
      { patternId: 'prototype-offset-pair', runDistances: [2_640, 2_850] },
      { patternId: 'prototype-corridor', runDistances: [3_200, 3_200] },
      { patternId: 'prototype-corridor', runDistances: [3_600, 3_600] },
    ],
  },
];

const BLOCKED_PATTERN = createHazardPattern({
  id: 'blocked-validation-pattern',
  runLength: 300,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'blocked-top',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 48, bottom: 220 },
    },
    {
      id: 'blocked-bottom',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 200, bottom: 342 },
    },
  ],
});

const collectAcceptedTrace = (seed: SeedInput): ReadonlyArray<AcceptedPatternTrace> => {
  let stream = createGeneratedHazardStream(seed, VALIDATION_CONTEXT, VALIDATION_RUN_MOTION);
  const trace: AcceptedPatternTrace[] = [];

  const appendTrace = (
    addedSpawns: ReadonlyArray<Readonly<GeneratedHazardSpawnInstance>>,
  ): void => {
    const patternIds = new Set(addedSpawns.map((spawn) => spawn.patternId));

    if (patternIds.size !== 1) {
      throw new Error('Representative validation must record exactly one accepted pattern.');
    }

    const patternId = addedSpawns[0]?.patternId;
    if (!patternId) {
      throw new Error('Representative validation expected at least one accepted spawn.');
    }

    trace.push({
      patternId,
      runDistances: addedSpawns.map((spawn) => spawn.runDistance),
    });
  };

  if (stream.scheduledPatternCount !== 1) {
    throw new Error('Representative validation must start with exactly one accepted pattern.');
  }
  appendTrace(stream.spawns);

  for (let patternIndex = 1; patternIndex < 6; patternIndex += 1) {
    const previousSpawnCount = stream.spawns.length;
    const previousPatternCount: number = stream.scheduledPatternCount;
    stream = advanceGeneratedHazardStream(
      stream,
      stream.nextPatternStartDistance -
        stream.schedulingWindow.minimumReactionDistance -
        PROTOTYPE_PLAYER_COLLISION_EXTENTS.right,
      VALIDATION_CONTEXT,
      VALIDATION_RUN_MOTION,
    );

    const addedSpawns = stream.spawns.slice(previousSpawnCount);

    if (stream.scheduledPatternCount !== previousPatternCount + 1) {
      throw new Error('Representative validation must advance exactly one accepted pattern.');
    }
    appendTrace(addedSpawns);
  }

  return trace;
};

describe('M3 seeded-run validation evidence', () => {
  it.each(REPRESENTATIVE_TRACES)(
    'replays seed $seed with the recorded accepted pattern and spawn-distance trace',
    ({ expected, normalizedSeed, seed }) => {
      expect(createRunGenerationState(seed).seed).toBe(normalizedSeed);
      expect(collectAcceptedTrace(seed)).toEqual(expected);
      expect(collectAcceptedTrace(seed)).toEqual(expected);
    },
  );

  it('records meaningful sequence variation across the representative seeds', () => {
    const patternSequences = REPRESENTATIVE_TRACES.map(({ expected }) =>
      expected.map(({ patternId }) => patternId).join(','),
    );

    expect(new Set(patternSequences).size).toBe(REPRESENTATIVE_TRACES.length);
  });

  it('keeps rejected candidates out of the accepted live spawn stream', () => {
    const seed = 60;
    const catalog = [BLOCKED_PATTERN, PROTOTYPE_CORRIDOR_PATTERN];
    const initialState = createRunGenerationState(seed);
    const schedule = scheduleNextPattern({
      catalog,
      maxCandidateAttempts: 4,
      patternStartDistance: 2_000,
      state: initialState,
    });

    expect(schedule.status).toBe('accepted');
    expect(schedule.attempts).toBe(4);
    expect(schedule.rejections.map(({ patternId }) => patternId)).toEqual([
      'blocked-validation-pattern',
      'blocked-validation-pattern',
      'blocked-validation-pattern',
    ]);

    if (schedule.status !== 'accepted') {
      throw new Error('Expected the fourth deterministic candidate to pass validation.');
    }

    const context: Readonly<GeneratedHazardStreamContext> = {
      catalog,
      config: {
        ...VALIDATION_STREAM_CONFIG,
        maxCandidateAttempts: 4,
      },
    };
    const rejectionRunMotion = { baseScrollSpeed: 991 };
    const acceptedStream = createGeneratedHazardStream(seed, context, rejectionRunMotion);
    const acceptedLogicalSpawns = acceptedStream.spawns.map(({ approachTiming, ...spawn }) => {
      expect(approachTiming.minimumReactionTimeSeconds).toBe(2);
      return spawn;
    });

    expect(acceptedLogicalSpawns).toEqual(schedule.spawns);
    expect(acceptedStream.generationState).toEqual(schedule.state);
    expect(acceptedStream.spawns.map(({ patternId }) => patternId)).toEqual([
      'prototype-corridor',
      'prototype-corridor',
    ]);
    expect(acceptedStream.spawns.map(({ runDistance }) => runDistance)).toEqual([2_160, 2_160]);
    expect(acceptedStream.spawns.map(({ entryId }) => entryId)).not.toContain('blocked-top');
    expect(acceptedStream.spawns.map(({ entryId }) => entryId)).not.toContain('blocked-bottom');
  });
});
