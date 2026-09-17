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
    pathId: 'corridor-triple-row-row-2',
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
    pathId: 'recovery-coins-text-row-1',
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

  it('uses an exact 3x10 aligned reward block through the safe corridor', () => {
    const rows = M5_CORRIDOR_REWARD_PATTERN.collectiblePaths ?? [];
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.points.length)).toEqual([10, 10, 10]);
    expect(rows.map((row) => row.points[0]?.y)).toEqual([172, 195, 218]);

    for (const row of rows) {
      const gaps = row.points.slice(1).map((point, index) => {
        const previous = row.points[index];
        if (!previous) {
          throw new Error('Missing previous corridor coin.');
        }
        return point.runDistance - previous.runDistance;
      });
      expect(gaps).toEqual(Array(9).fill(32));
    }
  });

  it('ships visible heart, star, and COINS! reward formations without adding hazard slots', () => {
    expect(
      M5_TEACHING_FLIGHT_ARC_PATTERN.collectiblePaths?.some((path) =>
        path.id.startsWith('teaching-heart-reward-row-'),
      ),
    ).toBe(true);
    expect(
      M5_OFFSET_RISK_REWARD_PATTERN.collectiblePaths?.some((path) =>
        path.id.startsWith('offset-star-reward-row-'),
      ),
    ).toBe(true);
    expect(
      M5_RECOVERY_ROUTE_PATTERN.collectiblePaths?.some((path) =>
        path.id.startsWith('recovery-coins-text-row-'),
      ),
    ).toBe(true);
    expect(M5_COLLECTIBLE_MOVEMENT_PATTERNS).toHaveLength(4);
  });

  it('keeps risky guidance optional while placing separate safe reward geometry after it', () => {
    const riskPath = getPath(M5_OFFSET_RISK_REWARD_PATTERN, 'offset-graze-route');
    expect(riskPath.intent).toBe('risk-reward');
    expect(
      M5_OFFSET_RISK_REWARD_PATTERN.collectiblePaths?.some(
        (path) => path.intent === 'safe-guide' && path.id.startsWith('offset-star-reward-row-'),
      ),
    ).toBe(true);
    expect(validatePattern(M5_OFFSET_RISK_REWARD_PATTERN)).toEqual({ valid: true, issues: [] });
  });

  it('materializes dense authored formations deterministically with stable identities', () => {
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
    expect(first.length).toBeGreaterThan(30);
    expect(new Set(first.map((spawn) => `${spawn.pathId}:${spawn.pathPointIndex}`)).size).toBe(
      first.length,
    );
  });

  it.each(M5_COLLECTIBLE_MOVEMENT_PATTERNS)(
    '$id remains selectable through its established live policy window',
    (pattern) => {
      const runDistance = 3_200;
      const state = createLiveEncounterPolicyState(runDistance, REACHABILITY);
      const selection = selectLiveEncounterCandidates([pattern], runDistance, state);
      expect(selection.pacing.intensity).toBe('medium');
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
