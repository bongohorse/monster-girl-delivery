import { describe, expect, it } from 'vitest';
import { generateNextPattern } from '../../src/generation/PatternGenerator';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import { validatePattern } from '../../src/generation/PatternValidator';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { createPrototypeHazardVerticalDomain } from '../../src/generation/PrototypeHazardVerticalDomain';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

const createPatternWithPath = (
  points: ReadonlyArray<Readonly<{ runDistance: number; y: number }>>,
) =>
  createHazardPattern({
    id: 'collectible-path-test',
    runLength: 300,
    profile: TEST_ENCOUNTER_PROFILE,
    entries: [
      {
        id: 'barrier',
        type: 'placeholder-barrier',
        hitbox: { left: 100, right: 148, top: 160, bottom: 208 },
      },
    ],
    collectiblePaths: [
      {
        id: 'guide',
        intent: 'safe-guide',
        points,
      },
    ],
  });

describe('collectible paths', () => {
  it('snapshots ordered logical path data immutably and deterministically', () => {
    const sourcePoints = [
      { runDistance: 20, y: 100 },
      { runDistance: 80, y: 96 },
      { runDistance: 220, y: 92 },
    ];
    const first = createPatternWithPath(sourcePoints);
    const repeated = createPatternWithPath(sourcePoints);

    expect(first.collectiblePaths).toEqual([
      {
        id: 'guide',
        intent: 'safe-guide',
        points: sourcePoints,
      },
    ]);
    expect(first.collectiblePaths).toEqual(repeated.collectiblePaths);
    expect(JSON.stringify(first.collectiblePaths)).toBe(JSON.stringify(repeated.collectiblePaths));
    expect(Object.isFrozen(first.collectiblePaths)).toBe(true);
    expect(Object.isFrozen(first.collectiblePaths?.[0])).toBe(true);
    expect(Object.isFrozen(first.collectiblePaths?.[0]?.points)).toBe(true);
    expect(Object.isFrozen(first.collectiblePaths?.[0]?.points[0])).toBe(true);

    sourcePoints[0]!.y = 250;
    expect(first.collectiblePaths?.[0]?.points[0]?.y).toBe(100);
  });

  it('rejects invalid, non-finite, out-of-span, and unordered path data', () => {
    const invalidPointSets = [
      [{ runDistance: 20, y: 100 }],
      [
        { runDistance: 20, y: 100 },
        { runDistance: Number.NaN, y: 100 },
      ],
      [
        { runDistance: 20, y: 100 },
        { runDistance: 80, y: Number.POSITIVE_INFINITY },
      ],
      [
        { runDistance: -1, y: 100 },
        { runDistance: 80, y: 100 },
      ],
      [
        { runDistance: 20, y: 100 },
        { runDistance: 301, y: 100 },
      ],
      [
        { runDistance: 80, y: 100 },
        { runDistance: 80, y: 96 },
      ],
      [
        { runDistance: 80, y: 100 },
        { runDistance: 40, y: 96 },
      ],
    ];

    for (const points of invalidPointSets) {
      expect(() => createPatternWithPath(points)).toThrow(RangeError);
    }
  });

  it('rejects duplicate or empty collectible path identities', () => {
    const validPath = {
      id: 'guide',
      intent: 'safe-guide' as const,
      points: [
        { runDistance: 20, y: 100 },
        { runDistance: 80, y: 96 },
      ],
    };
    const base = {
      id: 'collectible-path-identity-test',
      runLength: 300,
      profile: TEST_ENCOUNTER_PROFILE,
      entries: [
        {
          id: 'barrier',
          type: 'placeholder-barrier' as const,
          hitbox: { left: 100, right: 148, top: 160, bottom: 208 },
        },
      ],
    };

    expect(() =>
      createHazardPattern({ ...base, collectiblePaths: [{ ...validPath, id: '   ' }] }),
    ).toThrow(TypeError);
    expect(() =>
      createHazardPattern({ ...base, collectiblePaths: [validPath, validPath] }),
    ).toThrow(TypeError);
  });

  it('accepts the representative safe teaching path and risky Graze-adjacent route', () => {
    expect(PROTOTYPE_CORRIDOR_PATTERN.collectiblePaths?.[0]?.intent).toBe('safe-guide');
    expect(PROTOTYPE_OFFSET_PAIR_PATTERN.collectiblePaths?.[0]?.intent).toBe('risk-reward');
    expect(validatePattern(PROTOTYPE_CORRIDOR_PATTERN)).toEqual({ valid: true, issues: [] });
    expect(validatePattern(PROTOTYPE_OFFSET_PAIR_PATTERN)).toEqual({ valid: true, issues: [] });
  });

  it('rejects guidance that crosses lethal geometry instead of teaching an impossible route', () => {
    const pattern = createPatternWithPath([
      { runDistance: 40, y: 195 },
      { runDistance: 220, y: 195 },
    ]);
    const result = validatePattern(pattern);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'collectible-path-intersects-hazard',
      entryIds: ['barrier'],
      pathId: 'guide',
      runStart: 82,
      runEnd: 166,
    });
  });

  it('rejects guidance outside the playable player-center band', () => {
    const pattern = createPatternWithPath([
      { runDistance: 20, y: 60 },
      { runDistance: 80, y: 70 },
    ]);
    const result = validatePattern(pattern);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'collectible-path-outside-playable-band',
      entryIds: [],
      pathId: 'guide',
      runStart: 20,
      runEnd: 20,
    });
  });

  it('keeps collectible path selection deterministic for the same seed and catalog', () => {
    const catalog = [PROTOTYPE_CORRIDOR_PATTERN, PROTOTYPE_OFFSET_PAIR_PATTERN];
    const first = generateNextPattern(createRunGenerationState('collectible-path-seed'), catalog);
    const repeated = generateNextPattern(createRunGenerationState('collectible-path-seed'), catalog);

    expect(first.catalogIndex).toBe(repeated.catalogIndex);
    expect(first.pattern.id).toBe(repeated.pattern.id);
    expect(first.pattern.collectiblePaths).toEqual(repeated.pattern.collectiblePaths);
  });

  it('maps collectible guidance with an expanded logical flight domain without changing run distance', () => {
    const domain = createPrototypeHazardVerticalDomain(
      { ceilingY: -272, floorY: 362 },
      [PROTOTYPE_OFFSET_PAIR_PATTERN],
    );
    const adapted = domain.catalog[0];
    const authoredPath = PROTOTYPE_OFFSET_PAIR_PATTERN.collectiblePaths?.[0];
    const adaptedPath = adapted?.collectiblePaths?.[0];

    expect(adaptedPath?.points.map((point) => point.runDistance)).toEqual(
      authoredPath?.points.map((point) => point.runDistance),
    );
    expect(adaptedPath?.points[0]?.y).toBeCloseTo(domain.mapAuthoredCenterY(195), 10);
    expect(adaptedPath?.intent).toBe('risk-reward');
    expect(adapted).toBeDefined();
    if (adapted !== undefined) {
      expect(validatePattern(adapted, domain.constraints)).toEqual({ valid: true, issues: [] });
    }
  });
});
