import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import { reconcileGeneratedCollectibles } from '../../src/generation/GeneratedCollectibles';
import type { HazardPattern } from '../../src/generation/HazardPattern';
import {
  createLiveEncounterPolicyState,
  evaluateLiveEncounterReadability,
  selectLiveEncounterCandidates,
} from '../../src/generation/LiveEncounterPolicy';
import {
  M5_LASER_ZAPPER_PATTERN,
  PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG,
} from '../../src/generation/M5AuthoredMultiHazardPatterns';
import {
  M5_COLLECTIBLE_MOVEMENT_PATTERNS,
  M5_CORRIDOR_REWARD_PATTERN,
  M5_OFFSET_RISK_REWARD_PATTERN,
  M5_RECOVERY_ROUTE_PATTERN,
  M5_TEACHING_FLIGHT_ARC_PATTERN,
} from '../../src/generation/M5CollectibleMovementPatterns';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { validatePattern } from '../../src/generation/PatternValidator';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_LINE_PATTERN,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
  PROTOTYPE_ZAPPER_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { createPrototypeHazardVerticalDomain } from '../../src/generation/PrototypeHazardVerticalDomain';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';

const REACHABILITY = Object.freeze({
  flightState: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
  flightTuning: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightTuning,
  playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
});

const REPRESENTATIVE_ROUTES = Object.freeze([
  Object.freeze({
    role: 'teaching',
    pattern: M5_TEACHING_FLIGHT_ARC_PATTERN,
    pathId: 'teaching-flight-arc',
    intent: 'safe-guide',
  }),
  Object.freeze({
    role: 'safe-route',
    pattern: M5_CORRIDOR_REWARD_PATTERN,
    pathId: 'corridor-center-route',
    intent: 'safe-guide',
  }),
  Object.freeze({
    role: 'risk',
    pattern: M5_OFFSET_RISK_REWARD_PATTERN,
    pathId: 'offset-graze-route',
    intent: 'risk-reward',
  }),
  Object.freeze({
    role: 'recovery',
    pattern: M5_RECOVERY_ROUTE_PATTERN,
    pathId: 'recovery-wave',
    intent: 'safe-guide',
  }),
  Object.freeze({
    role: 'hazard-composed',
    pattern: M5_LASER_ZAPPER_PATTERN,
    pathId: 'laser-zapper-center-wave',
    intent: 'safe-guide',
  }),
] as const);

const getPath = (pattern: Readonly<HazardPattern>, pathId: string) => {
  const path = pattern.collectiblePaths?.find((candidate) => candidate.id === pathId);
  if (!path) {
    throw new Error(`Missing collectible route ${pattern.id}/${pathId}.`);
  }
  return path;
};

const countCollectibles = (pattern: Readonly<HazardPattern>): number =>
  (pattern.collectiblePaths ?? []).reduce((sum, path) => sum + path.points.length, 0);

describe('M5 collectible movement language', () => {
  it.each(REPRESENTATIVE_ROUTES)(
    '$role route is explicit, correctly classified, and accepted by the existing pattern validator',
    ({ pattern, pathId, intent }) => {
      expect(getPath(pattern, pathId).intent).toBe(intent);
      expect(validatePattern(pattern)).toEqual({ valid: true, issues: [] });
      expect(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG).toContain(pattern);
    },
  );

  it('enriches existing slots without changing established hazard identity, profile, or geometry', () => {
    const pairs = [
      [M5_TEACHING_FLIGHT_ARC_PATTERN, PROTOTYPE_LINE_PATTERN],
      [M5_CORRIDOR_REWARD_PATTERN, PROTOTYPE_CORRIDOR_PATTERN],
      [M5_OFFSET_RISK_REWARD_PATTERN, PROTOTYPE_OFFSET_PAIR_PATTERN],
      [M5_RECOVERY_ROUTE_PATTERN, PROTOTYPE_ZAPPER_PATTERN],
    ] as const;

    for (const [enriched, baseline] of pairs) {
      expect(enriched).toMatchObject({
        id: baseline.id,
        runLength: baseline.runLength,
        profile: baseline.profile,
        entries: baseline.entries,
      });
      expect(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG).toContain(enriched);
    }
  });

  it('keeps normal live collectible routes sparse and single-purpose', () => {
    expect(M5_CORRIDOR_REWARD_PATTERN.collectiblePaths).toHaveLength(1);
    expect(M5_OFFSET_RISK_REWARD_PATTERN.collectiblePaths).toHaveLength(1);
    expect(M5_RECOVERY_ROUTE_PATTERN.collectiblePaths).toHaveLength(1);
    expect(M5_TEACHING_FLIGHT_ARC_PATTERN.collectiblePaths).toHaveLength(1);

    for (const pattern of M5_COLLECTIBLE_MOVEMENT_PATTERNS) {
      expect(countCollectibles(pattern)).toBeGreaterThan(0);
      expect(countCollectibles(pattern)).toBeLessThanOrEqual(20);
    }
  });

  it('keeps decorative bitmap/grid reward formations out of the normal live movement patterns', () => {
    const livePathIds = M5_COLLECTIBLE_MOVEMENT_PATTERNS.flatMap(
      (pattern) => pattern.collectiblePaths?.map((path) => path.id) ?? [],
    );

    expect(livePathIds).not.toContain('corridor-triple-row-row-1');
    expect(livePathIds.some((id) => id.startsWith('teaching-heart-reward-row-'))).toBe(false);
    expect(livePathIds.some((id) => id.startsWith('offset-star-reward-row-'))).toBe(false);
    expect(livePathIds.some((id) => id.startsWith('recovery-coins-text-row-'))).toBe(false);
    expect(M5_COLLECTIBLE_MOVEMENT_PATTERNS).toHaveLength(4);
  });

  it('keeps risky guidance optional without adding a second visual reward formation', () => {
    const riskPath = getPath(M5_OFFSET_RISK_REWARD_PATTERN, 'offset-graze-route');
    expect(riskPath.intent).toBe('risk-reward');
    expect(M5_OFFSET_RISK_REWARD_PATTERN.collectiblePaths).toEqual([riskPath]);
    expect(validatePattern(M5_OFFSET_RISK_REWARD_PATTERN)).toEqual({ valid: true, issues: [] });
  });

  it('materializes sparse authored routes deterministically with stable identities', () => {
    const schedule = () =>
      scheduleNextPattern({
        catalog: [M5_TEACHING_FLIGHT_ARC_PATTERN],
        patternStartDistance: 2_000,
        reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
        state: createRunGenerationState('m5-route-language'),
      });

    const firstSchedule = schedule();
    const secondSchedule = schedule();
    expect(firstSchedule).toEqual(secondSchedule);
    expect(firstSchedule.status).toBe('accepted');
    if (firstSchedule.status !== 'accepted' || secondSchedule.status !== 'accepted') {
      throw new Error('Teaching route must schedule through the existing pattern authority.');
    }

    const first = reconcileGeneratedCollectibles(
      [],
      firstSchedule.spawns,
      [M5_TEACHING_FLIGHT_ARC_PATTERN],
      0,
    );
    const second = reconcileGeneratedCollectibles(
      [],
      secondSchedule.spawns,
      [M5_TEACHING_FLIGHT_ARC_PATTERN],
      0,
    );

    expect(first).toEqual(second);
    expect(first).toHaveLength(countCollectibles(M5_TEACHING_FLIGHT_ARC_PATTERN));
    expect(first.length).toBeGreaterThan(5);
    expect(first.length).toBeLessThanOrEqual(20);
    expect(new Set(first.map((spawn) => `${spawn.pathId}:${spawn.pathPointIndex}`)).size).toBe(
      first.length,
    );
  });

  it.each([
    { pattern: M5_OFFSET_RISK_REWARD_PATTERN, runDistance: 6_400, intensity: 'high' },
    { pattern: M5_RECOVERY_ROUTE_PATTERN, runDistance: 3_900, intensity: 'medium' },
  ] as const)(
    '$pattern.id remains selectable through its accepted $intensity pressure beat',
    ({ pattern, runDistance, intensity }) => {
      const state = createLiveEncounterPolicyState(runDistance, REACHABILITY);
      const selection = selectLiveEncounterCandidates([pattern], runDistance, state);
      expect(selection.pacing.intensity).toBe(intensity);
      const candidateCatalog = [...selection.primaryCatalog, ...selection.deferredCatalog];
      expect(candidateCatalog).toContain(pattern);

      const evaluation = evaluateLiveEncounterReadability(
        candidateCatalog,
        state,
        selection.pacing,
        0,
        runDistance,
        runDistance,
        350,
        REACHABILITY.playerExtents,
      ).find((candidate) => candidate.pattern === pattern);

      expect(evaluation).toMatchObject({
        intrinsicallyEligible: true,
        decision: { status: 'reserved' },
      });
    },
  );

  it.each([M5_TEACHING_FLIGHT_ARC_PATTERN, M5_CORRIDOR_REWARD_PATTERN])(
    '$id keeps its collectible language but is withheld from the denser normal live pacing',
    (pattern) => {
      const runDistance = 6_400;
      const state = createLiveEncounterPolicyState(runDistance, REACHABILITY);
      const selection = selectLiveEncounterCandidates([pattern], runDistance, state);
      expect(selection.pacing.intensity).toBe('high');
      expect([...selection.primaryCatalog, ...selection.deferredCatalog]).not.toContain(pattern);
      expect(validatePattern(pattern)).toEqual({ valid: true, issues: [] });
      expect(countCollectibles(pattern)).toBeGreaterThan(0);
    },
  );

  it('maps every route Y position with the logical vertical domain while preserving authored X', () => {
    const domain = createPrototypeHazardVerticalDomain({ ceilingY: -172, floorY: 362 }, [
      M5_TEACHING_FLIGHT_ARC_PATTERN,
      M5_LASER_ZAPPER_PATTERN,
    ]);
    const adaptedTeaching = domain.catalog[0];
    const adaptedComposed = domain.catalog[1];
    if (!adaptedTeaching || !adaptedComposed) {
      throw new Error('Expected adapted route patterns.');
    }

    for (const [authored, adapted] of [
      [M5_TEACHING_FLIGHT_ARC_PATTERN, adaptedTeaching],
      [M5_LASER_ZAPPER_PATTERN, adaptedComposed],
    ] as const) {
      expect(adapted.collectiblePaths).toHaveLength(authored.collectiblePaths?.length ?? 0);
      for (
        let pathIndex = 0;
        pathIndex < (authored.collectiblePaths?.length ?? 0);
        pathIndex += 1
      ) {
        const authoredPath = authored.collectiblePaths?.[pathIndex];
        const adaptedPath = adapted.collectiblePaths?.[pathIndex];
        if (!authoredPath || !adaptedPath) {
          throw new Error(`Expected route data for ${authored.id}.`);
        }

        expect(adaptedPath.points.map((point) => point.runDistance)).toEqual(
          authoredPath.points.map((point) => point.runDistance),
        );
        expect(adaptedPath.points.map((point) => point.y)).toEqual(
          authoredPath.points.map((point) => domain.mapAuthoredCenterY(point.y)),
        );
      }

      expect(
        validatePattern(adapted, domain.constraints, {
          ...PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
          flightState: {
            ...PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
            positionY: domain.mapAuthoredCenterY(
              PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState.positionY,
            ),
          },
        }),
      ).toEqual({ valid: true, issues: [] });
    }
  });
});
