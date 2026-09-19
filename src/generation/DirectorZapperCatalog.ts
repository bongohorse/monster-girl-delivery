import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_LENGTHS,
  PROTOTYPE_ZAPPER_ROTATION_SPEEDS,
} from '../hazards/PrototypeZapperHazard';
import { PROTOTYPE_TIMED_ZAPPER_CONFIG } from '../hazards/TimedZapperLifecycle';
import type { EncounterBehaviorTag } from './EncounterProfile';
import { createHazardPattern, type HazardPattern } from './HazardPattern';

export interface DirectorZapperSelection {
  readonly label: string;
  readonly pattern: Readonly<HazardPattern>;
}

const createProfile = (behaviorTag: EncounterBehaviorTag, readabilityCost = 2) =>
  Object.freeze({
    behaviorTags: [behaviorTag],
    difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: null },
    pacingIntensities: ['low', 'medium', 'high', 'peak'] as const,
    pressureCost: 1,
    readabilityCost,
    varietyFamilyId: 'zapper',
  });

const createZapperEntry = (
  id: string,
  centerX: number,
  centerY: number,
  angleDegrees: number,
  length: number,
  options: Readonly<{
    rotationDirection?: 'clockwise' | 'counterclockwise';
    rotationSpeedDegreesPerSecond?: number;
    timed?: boolean;
  }> = {},
) => {
  const baseBehavior = createPrototypeZapperBehavior(
    angleDegrees,
    length,
    options.rotationDirection
      ? {
          direction: options.rotationDirection,
          speedDegreesPerSecond:
            options.rotationSpeedDegreesPerSecond ?? PROTOTYPE_ZAPPER_ROTATION_SPEEDS.slow,
        }
      : undefined,
  );
  const behavior = Object.freeze({
    ...baseBehavior,
    ...(options.timed ? { timing: PROTOTYPE_TIMED_ZAPPER_CONFIG } : {}),
  });

  return Object.freeze({
    behavior,
    id,
    type: 'placeholder-barrier' as const,
    hitbox: createPrototypeZapperHitbox(centerX, centerY, behavior),
  });
};

const createSinglePattern = (
  id: string,
  label: string,
  entry: ReturnType<typeof createZapperEntry>,
  behaviorTag: EncounterBehaviorTag,
  readabilityCost = 2,
): Readonly<DirectorZapperSelection> =>
  Object.freeze({
    label,
    pattern: createHazardPattern({
      id,
      runLength: 640,
      profile: createProfile(behaviorTag, readabilityCost),
      entries: [entry],
    }),
  });

export const DIRECTOR_ZAPPER_VARIANTS: ReadonlyArray<Readonly<DirectorZapperSelection>> =
  Object.freeze([
    createSinglePattern(
      'director-zapper-h-short',
      'H-short',
      createZapperEntry('h-short', 280, 100, 0, PROTOTYPE_ZAPPER_LENGTHS.short),
      'static-barrier',
    ),
    createSinglePattern(
      'director-zapper-h-long',
      'H-long',
      createZapperEntry('h-long', 280, 285, 0, PROTOTYPE_ZAPPER_LENGTHS.long),
      'static-barrier',
    ),
    createSinglePattern(
      'director-zapper-v',
      'V',
      createZapperEntry('vertical', 280, 110, 90, PROTOTYPE_ZAPPER_LENGTHS.short),
      'static-barrier',
    ),
    createSinglePattern(
      'director-zapper-diagonal-up',
      'D↗',
      createZapperEntry('diagonal-up', 280, 110, -45, PROTOTYPE_ZAPPER_LENGTHS.short),
      'static-barrier',
    ),
    createSinglePattern(
      'director-zapper-diagonal-down',
      'D↘',
      createZapperEntry('diagonal-down', 280, 280, 45, PROTOTYPE_ZAPPER_LENGTHS.short),
      'static-barrier',
    ),
    createSinglePattern(
      'director-zapper-rotate-clockwise',
      'ROT↻',
      createZapperEntry('rotate-clockwise', 280, 110, 0, PROTOTYPE_ZAPPER_LENGTHS.short, {
        rotationDirection: 'clockwise',
      }),
      'moving-barrier',
    ),
    createSinglePattern(
      'director-zapper-rotate-counterclockwise',
      'ROT↺',
      createZapperEntry('rotate-counterclockwise', 280, 280, 0, PROTOTYPE_ZAPPER_LENGTHS.short, {
        rotationDirection: 'counterclockwise',
      }),
      'moving-barrier',
    ),
    createSinglePattern(
      'director-zapper-timed',
      'TIMED',
      createZapperEntry('timed', 280, 195, 0, PROTOTYPE_ZAPPER_LENGTHS.medium, {
        timed: true,
      }),
      'timed-pulse',
      3,
    ),
  ]);

export const DIRECTOR_ZAPPER_GROUPS: ReadonlyArray<Readonly<DirectorZapperSelection>> =
  Object.freeze([
    Object.freeze({
      label: 'H-pair',
      pattern: createHazardPattern({
        id: 'director-zapper-group-horizontal-pair',
        runLength: 820,
        profile: createProfile('static-barrier', 3),
        entries: [
          createZapperEntry('pair-high', 280, 100, 0, PROTOTYPE_ZAPPER_LENGTHS.medium),
          createZapperEntry('pair-low', 560, 285, 0, PROTOTYPE_ZAPPER_LENGTHS.medium),
        ],
      }),
    }),
    Object.freeze({
      label: 'H+D',
      pattern: createHazardPattern({
        id: 'director-zapper-group-horizontal-diagonal',
        runLength: 760,
        profile: createProfile('static-barrier', 3),
        entries: [
          createZapperEntry('horizontal-high', 280, 100, 0, PROTOTYPE_ZAPPER_LENGTHS.short),
          createZapperEntry('diagonal-low', 500, 280, -45, PROTOTYPE_ZAPPER_LENGTHS.short),
        ],
      }),
    }),
    Object.freeze({
      label: 'D-corridor',
      pattern: createHazardPattern({
        id: 'director-zapper-group-diagonal-corridor',
        runLength: 640,
        profile: createProfile('static-barrier', 3),
        entries: [
          createZapperEntry('corridor-top', 300, 95, 45, PROTOTYPE_ZAPPER_LENGTHS.short),
          createZapperEntry('corridor-bottom', 300, 295, -45, PROTOTYPE_ZAPPER_LENGTHS.short),
        ],
      }),
    }),
  ]);


export const DIRECTOR_ZAPPER_PERFORMANCE_PRESET_ID = 'zapper-heavy-v1';

export const DIRECTOR_ZAPPER_PERFORMANCE_PRESET: Readonly<DirectorZapperSelection> = Object.freeze({
  label: 'ZPERF',
  pattern: createHazardPattern({
    id: 'director-zapper-performance-v1',
    runLength: 2_320,
    profile: createProfile('moving-barrier', 4),
    entries: [
      createZapperEntry('perf-static-top', 280, 90, 0, PROTOTYPE_ZAPPER_LENGTHS.long),
      createZapperEntry('perf-static-bottom', 280, 300, 0, PROTOTYPE_ZAPPER_LENGTHS.long),
      createZapperEntry('perf-rotate-slow-top', 560, 110, 0, PROTOTYPE_ZAPPER_LENGTHS.long, {
        rotationDirection: 'clockwise',
      }),
      createZapperEntry('perf-rotate-slow-bottom', 560, 280, 0, PROTOTYPE_ZAPPER_LENGTHS.long, {
        rotationDirection: 'counterclockwise',
      }),
      createZapperEntry('perf-rotate-fast-top', 840, 125, 0, PROTOTYPE_ZAPPER_LENGTHS.long, {
        rotationDirection: 'clockwise',
        rotationSpeedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.fast,
      }),
      createZapperEntry('perf-rotate-fast-bottom', 840, 265, 0, PROTOTYPE_ZAPPER_LENGTHS.long, {
        rotationDirection: 'counterclockwise',
        rotationSpeedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.fast,
      }),
      createZapperEntry(
        'perf-diagonal-top',
        1_120,
        105,
        45,
        PROTOTYPE_ZAPPER_LENGTHS.medium,
      ),
      createZapperEntry(
        'perf-diagonal-bottom',
        1_120,
        285,
        -45,
        PROTOTYPE_ZAPPER_LENGTHS.medium,
      ),
      createZapperEntry('perf-rotate-medium-top', 1_400, 100, 0, PROTOTYPE_ZAPPER_LENGTHS.long, {
        rotationDirection: 'counterclockwise',
        rotationSpeedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.medium,
      }),
      createZapperEntry(
        'perf-rotate-medium-bottom',
        1_400,
        290,
        0,
        PROTOTYPE_ZAPPER_LENGTHS.long,
        {
          rotationDirection: 'clockwise',
          rotationSpeedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.medium,
        },
      ),
      createZapperEntry('perf-timed', 1_680, 195, 0, PROTOTYPE_ZAPPER_LENGTHS.medium, {
        timed: true,
      }),
      createZapperEntry('perf-vertical', 1_680, 195, 90, PROTOTYPE_ZAPPER_LENGTHS.medium),
      createZapperEntry('perf-rotate-fast-high', 1_960, 90, 0, PROTOTYPE_ZAPPER_LENGTHS.medium, {
        rotationDirection: 'clockwise',
        rotationSpeedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.fast,
      }),
      createZapperEntry('perf-rotate-fast-low', 1_960, 300, 0, PROTOTYPE_ZAPPER_LENGTHS.medium, {
        rotationDirection: 'counterclockwise',
        rotationSpeedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.fast,
      }),
    ],
  }),
});
