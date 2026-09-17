import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import { reconcileGeneratedCollectibles } from '../../src/generation/GeneratedCollectibles';
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
    pattern: PROTOTYPE_CORRIDOR_PATTERN,
    pathId: 'corridor-safe-guide',
    intent: 'safe-guide',
  }),
  Object.freeze({
    role: 'risk',
    pattern: PROTOTYPE_OFFSET_PAIR_PATTERN,
    pathId: 'offset-graze-route',
    intent: 'risk-reward',
  }),
  Object.freeze({
    role: 'recovery',
    pattern: M5_RECOVERY_ROUTE_PATTERN,
    pathId: 'recovery-gentle-wave',
    intent: 'safe-guide',
  }),
  Object.freeze({
    role: 'hazard-composed',
    pattern: M5_LASER_ZAPPER_PATTERN,
    pathId: 'laser-zapper-center-route',
    intent: 'safe-guide',
  }),
] as const);

const getPath = (pattern: (typeof REPRESENTATIVE_ROUTES)[number]['pattern'], pathId: string) => {
  const path = pattern.collectiblePaths?.find((candidate) => candidate.id === pathId);
  if (!path) {
    throw new Error(`Missing collectible route ${pattern.id}/${pathId}.`);
  }
  return path;
};

describe('M5 collectible movement language', () => {
  it.each(REPRESENTATIVE_ROUTES)(
    '$role route is explicit, correctly classified, and accepted by the existing pattern validator',
    ({ pattern, pathId, intent }) => {
      expect(getPath(pattern, pathId).intent).toBe(intent);
      expect(validatePattern(pattern)).toEqual({ valid: true, issues: [] });
      expect(PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG).toContain(pattern);
    },
  );

  it('adds teaching and recovery routes without changing their established hazard slots', () => {
    expect(M5_TEACHING_FLIGHT_ARC_PATTERN).toMatchObject({
      id: PROTOTYPE_LINE_PATTERN.id,
      runLength: PROTOTYPE_LINE_PATTERN.runLength,
      profile: PROTOTYPE_LINE_PATTERN.profile,
      entries: PROTOTYPE_LINE_PATTERN.entries,
    });
    expect(M5_RECOVERY_ROUTE_PATTERN).toMatchObject({
      id: PROTOTYPE_ZAPPER_PATTERN.id,
      runLength: PROTOTYPE_ZAPPER_PATTERN.runLength,
      profile: PROTOTYPE_ZAPPER_PATTERN.profile,
      entries: PROTOTYPE_ZAPPER_PATTERN.entries,
    });
  });

  it('keeps risky collectible guidance optional relative to the pattern survival route', () => {
    const riskPath = getPath(PROTOTYPE_OFFSET_PAIR_PATTERN, 'offset-graze-route');

    expect(riskPath.intent).toBe('risk-reward');
    expect(PROTOTYPE_OFFSET_PAIR_PATTERN.collectiblePaths).toHaveLength(1);
    expect(validatePattern(PROTOTYPE_OFFSET_PAIR_PATTERN).valid).toBe(true);
  });

  it('materializes the same teaching-route collectible identities and geometry deterministically', () => {
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
    expect(first).toHaveLength(7);
    expect(
      first.map(({ pathPointIndex, runDistance, y }) => ({ pathPointIndex, runDistance, y })),
    ).toEqual(
      M5_TEACHING_FLIGHT_ARC_PATTERN.collectiblePaths?.[0]?.points.map((point, pathPointIndex) => ({
        pathPointIndex,
        runDistance: 2_000 + point.runDistance,
        y: point.y,
      })),
    );
  });

  it.each([
    { pattern: M5_TEACHING_FLIGHT_ARC_PATTERN, runDistance: 3_200, intensity: 'medium' },
    { pattern: M5_RECOVERY_ROUTE_PATTERN, runDistance: 2_600, intensity: 'low' },
  ] as const)(
    '$pattern.id is admitted by its established live policy window instead of existing only as test data',
    ({ pattern, runDistance, intensity }) => {
      const state = createLiveEncounterPolicyState(runDistance, REACHABILITY);
      const selection = selectLiveEncounterCandidates([pattern], runDistance, state);
      expect(selection.pacing.intensity).toBe(intensity);
      expect(selection.primaryCatalog).toEqual([pattern]);

      const evaluation = evaluateLiveEncounterReadability(
        selection.primaryCatalog,
        state,
        selection.pacing,
        0,
        runDistance,
        runDistance,
        350,
        REACHABILITY.playerExtents,
      )[0];

      expect(evaluation).toMatchObject({
        intrinsicallyEligible: true,
        decision: { status: 'reserved' },
      });
    },
  );

  it('maps route Y positions with the logical vertical domain while preserving authored run distances', () => {
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
      const authoredPath = authored.collectiblePaths?.[0];
      const adaptedPath = adapted.collectiblePaths?.[0];
      if (!authoredPath || !adaptedPath) {
        throw new Error(`Expected route data for ${authored.id}.`);
      }

      expect(adaptedPath.points.map((point) => point.runDistance)).toEqual(
        authoredPath.points.map((point) => point.runDistance),
      );
      expect(adaptedPath.points.map((point) => point.y)).toEqual(
        authoredPath.points.map((point) => domain.mapAuthoredCenterY(point.y)),
      );
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
