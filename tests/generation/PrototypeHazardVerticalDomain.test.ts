import { describe, expect, it } from 'vitest';
import { PROTOTYPE_LOGICAL_FLIGHT_BOUNDS } from '../../src/game/PrototypeFlightLayout';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import { PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS } from '../../src/generation/PatternValidator';
import {
  PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_M5_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { createPrototypeHazardVerticalDomain } from '../../src/generation/PrototypeHazardVerticalDomain';

const getPattern = (
  catalog: ReturnType<typeof createPrototypeHazardVerticalDomain>['catalog'],
  patternId: string,
) => {
  const pattern = catalog.find((candidate) => candidate.id === patternId);
  if (!pattern) {
    throw new Error(`Missing test pattern: ${patternId}`);
  }
  return pattern;
};

const getEntry = (
  catalog: ReturnType<typeof createPrototypeHazardVerticalDomain>['catalog'],
  patternId: string,
  entryId: string,
) => {
  const entry = getPattern(catalog, patternId).entries.find(
    (candidate) => candidate.id === entryId,
  );
  if (!entry) {
    throw new Error(`Missing test entry: ${patternId}/${entryId}`);
  }
  return entry;
};

describe('prototype hazard vertical domain', () => {
  it('preserves the authored M5 baseline catalog and validation contract exactly', () => {
    const domain = createPrototypeHazardVerticalDomain(PROTOTYPE_LOGICAL_FLIGHT_BOUNDS);

    expect(domain.catalog).toBe(PROTOTYPE_M5_HAZARD_PATTERN_FIXTURES);
    expect(domain.constraints).toBe(PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS);
    expect(domain.mapAuthoredCenterY(195)).toBe(195);
  });

  it('distributes geometric hazard centers across added upper flight room without resizing hazards', () => {
    const bounds = { ceilingY: -272, floorY: 362 };
    const domain = createPrototypeHazardVerticalDomain(bounds);
    const authored = getEntry(
      PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
      'prototype-corridor',
      'corridor-top',
    );
    const adapted = getEntry(domain.catalog, 'prototype-corridor', 'corridor-top');
    const authoredCenter = (authored.hitbox.top + authored.hitbox.bottom) / 2;
    const adaptedCenter = (adapted.hitbox.top + adapted.hitbox.bottom) / 2;

    expect(domain.constraints.playableTop).toBe(-252);
    expect(domain.constraints.playableBottom).toBe(342);
    expect(adaptedCenter).toBeCloseTo(domain.mapAuthoredCenterY(authoredCenter), 10);
    expect(adapted.hitbox.bottom - adapted.hitbox.top).toBe(
      authored.hitbox.bottom - authored.hitbox.top,
    );
    expect(adapted.hitbox.left).toBe(authored.hitbox.left);
    expect(adapted.hitbox.right).toBe(authored.hitbox.right);
    expect(adaptedCenter).toBeLessThan(authoredCenter);
  });

  it('preserves authored reaction policy while adapting a non-baseline vertical domain', () => {
    const pattern = createHazardPattern({
      id: 'reaction-policy-domain-test',
      runLength: 400,
      profile: {
        behaviorTags: ['static-barrier'],
        difficultyTierRange: { minimumTierIndex: 0, maximumTierIndex: null },
        pacingIntensities: ['low'],
        pressureCost: 1,
        readabilityCost: 1,
        varietyFamilyId: 'reaction-policy-domain-test',
      },
      entries: [
        {
          id: 'policy-hazard',
          type: 'placeholder-barrier',
          hitbox: { left: 120, right: 168, top: 160, bottom: 208 },
          reactionPolicy: { disable: 'destroy', destroy: 'immune' },
        },
      ],
    });
    const domain = createPrototypeHazardVerticalDomain(
      { ceilingY: -272, floorY: 362 },
      [pattern],
    );

    expect(domain.catalog[0]?.entries[0]?.reactionPolicy).toEqual({
      disable: 'destroy',
      destroy: 'immune',
    });
  });

  it('expands target-lock coverage with the flight-bound edges while preserving strike size', () => {
    const bounds = { ceilingY: -272, floorY: 362 };
    const domain = createPrototypeHazardVerticalDomain(bounds);
    const adapted = getEntry(
      domain.catalog,
      'prototype-target-lock-strike',
      'target-lock-strike-1',
    );

    expect(PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN.entries[0]?.behavior.kind).toBe(
      'target-lock-strike',
    );
    expect(adapted.behavior.kind).toBe('target-lock-strike');
    if (adapted.behavior.kind !== 'target-lock-strike') {
      throw new Error('Expected target-lock behavior.');
    }

    expect(adapted.behavior.minimumTargetY).toBe(-228);
    expect(adapted.behavior.maximumTargetY).toBe(222);
    expect(adapted.behavior.strikeHeight).toBe(48);
  });

  it('keeps catalog identity/order and produces deterministic geometry for the same logical domain', () => {
    const bounds = { ceilingY: -172, floorY: 362 };
    const first = createPrototypeHazardVerticalDomain(bounds);
    const second = createPrototypeHazardVerticalDomain(bounds);

    expect(first.catalog.map((pattern) => pattern.id)).toEqual(
      PROTOTYPE_M5_HAZARD_PATTERN_FIXTURES.map((pattern) => pattern.id),
    );
    expect(first.catalog).toEqual(second.catalog);
    expect(first.constraints).toEqual(second.constraints);
    expect(PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN.entries[0]?.behavior.kind).toBe(
      'target-lock-strike',
    );
    if (PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN.entries[0]?.behavior.kind === 'target-lock-strike') {
      expect(PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN.entries[0].behavior.minimumTargetY).toBe(72);
      expect(PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN.entries[0].behavior.maximumTargetY).toBe(222);
    }
  });
});
