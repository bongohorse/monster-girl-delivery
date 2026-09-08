import { describe, expect, it } from 'vitest';
import { createAppServices } from '../../src/core/AppServices';
import { createPrototypeFlightBounds } from '../../src/game/PrototypeFlightLayout';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  type GeneratedHazardStreamContext,
  type GeneratedHazardStreamState,
} from '../../src/generation/GeneratedHazardStream';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../src/generation/LiveEncounterPolicy';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createPrototypeHazardVerticalDomain } from '../../src/generation/PrototypeHazardVerticalDomain';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import type { SeedInput } from '../../src/generation/SeededPrng';
import {
  createTelegraphedHazardSimulationState,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
} from '../../src/hazards/TelegraphedHazardSimulation';
import { PROTOTYPE_PLAYER_COLLISION_EXTENTS } from '../../src/systems/HazardCollision';

const BASELINE_VIEWPORT = Object.freeze({
  height: 390,
  safeArea: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 }),
});
const TALL_VIEWPORT = Object.freeze({
  height: 720,
  safeArea: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 }),
});

const createLiveContext = (
  bounds: ReturnType<typeof createPrototypeFlightBounds>,
  observeEncounter?: GeneratedHazardStreamContext['observeEncounter'],
): Readonly<GeneratedHazardStreamContext> => {
  const services = createAppServices();
  const domain = createPrototypeHazardVerticalDomain(bounds);

  return Object.freeze({
    catalog: domain.catalog,
    constraints: domain.constraints,
    observeEncounter,
    policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
    reachability: Object.freeze({
      flightState: Object.freeze({
        ...PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
        positionY: domain.mapAuthoredCenterY(
          PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState.positionY,
        ),
      }),
      flightTuning: services.flightTuning.getSnapshot(),
      playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
    }),
  });
};

interface LiveTrace {
  readonly bounds: ReturnType<typeof createPrototypeFlightBounds>;
  readonly decisions: ReadonlyArray<{
    readonly kind: string;
    readonly primaryCatalog: ReadonlyArray<string>;
    readonly selectedPatternId: string | null;
  }>;
  readonly spawns: ReadonlyArray<{
    readonly entryId: string;
    readonly patternId: string;
    readonly top: number;
    readonly bottom: number;
  }>;
}

const collectLiveTrace = (seed: SeedInput, tall: boolean): LiveTrace => {
  const bounds = createPrototypeFlightBounds(tall ? TALL_VIEWPORT : BASELINE_VIEWPORT);
  const decisions: Array<LiveTrace['decisions'][number]> = [];
  const services = createAppServices();
  const context = createLiveContext(bounds, (observation) => {
    decisions.push({
      kind: observation.kind,
      primaryCatalog: observation.selection?.primaryCatalog.map((pattern) => pattern.id) ?? [],
      selectedPatternId:
        observation.schedule?.status === 'accepted' ? observation.schedule.patternId : null,
    });
  });
  const runMotion = services.runMotion.getSnapshot();
  let stream = createGeneratedHazardStream(seed, context, runMotion);

  for (let step = 0; step < 24 && stream.scheduledPatternCount < 6; step += 1) {
    const schedulingBoundary =
      stream.nextPatternStartDistance -
      stream.schedulingWindow.minimumReactionDistance -
      PROTOTYPE_PLAYER_COLLISION_EXTENTS.right;
    const nextDistance = Math.max(stream.runDistance, schedulingBoundary);
    stream = advanceGeneratedHazardStream(stream, nextDistance, context, runMotion, 0, true);
  }

  return Object.freeze({
    bounds: Object.freeze(bounds),
    decisions: Object.freeze(decisions),
    spawns: Object.freeze(
      stream.spawns.map((spawn) => ({
        entryId: spawn.entryId,
        patternId: spawn.patternId,
        top: spawn.hitbox.top,
        bottom: spawn.hitbox.bottom,
      })),
    ),
  });
};

const expectSpawnPrefixUnchanged = (
  before: Readonly<GeneratedHazardStreamState>,
  after: Readonly<GeneratedHazardStreamState>,
): void => {
  expect(after.spawns.slice(0, before.spawns.length)).toEqual(before.spawns);
};

describe('expanded flight-domain live validation evidence', () => {
  it('records deterministic baseline-vs-tall traces through the live encounter policy path', () => {
    const seed = 'issue-191-live-domain-evidence';
    const baseline = collectLiveTrace(seed, false);
    const tall = collectLiveTrace(seed, true);

    expect(collectLiveTrace(seed, false)).toEqual(baseline);
    expect(collectLiveTrace(seed, true)).toEqual(tall);

    expect(baseline.bounds).toEqual({ ceilingY: 28, floorY: 362 });
    expect(tall.bounds).toEqual({ ceilingY: -302, floorY: 362 });
    expect(baseline.decisions.some((decision) => decision.selectedPatternId !== null)).toBe(true);
    expect(tall.decisions.some((decision) => decision.selectedPatternId !== null)).toBe(true);
    expect(baseline.decisions.some((decision) => decision.primaryCatalog.length > 0)).toBe(true);
    expect(tall.decisions.some((decision) => decision.primaryCatalog.length > 0)).toBe(true);

    const baselineTop = Math.min(...baseline.spawns.map((spawn) => spawn.top));
    const tallTop = Math.min(...tall.spawns.map((spawn) => spawn.top));
    expect(tallTop).toBeLessThan(baselineTop);
    expect(tall.spawns.some((spawn) => spawn.top < 0)).toBe(true);
  });

  it('keeps accepted hazards and PRNG state stable at resize, then applies the new domain to future scheduling', () => {
    const seed = 'issue-191-resize-boundary';
    const services = createAppServices();
    const runMotion = services.runMotion.getSnapshot();
    const baselineBounds = createPrototypeFlightBounds(BASELINE_VIEWPORT);
    const tallBounds = createPrototypeFlightBounds(TALL_VIEWPORT);
    const baselineContext = createLiveContext(baselineBounds);
    const tallContext = createLiveContext(tallBounds);
    const beforeResize = createGeneratedHazardStream(seed, baselineContext, runMotion);

    const atResizeBoundary = advanceGeneratedHazardStream(
      beforeResize,
      beforeResize.runDistance,
      tallContext,
      runMotion,
      0,
      false,
    );

    expect(atResizeBoundary.generationState).toEqual(beforeResize.generationState);
    expect(atResizeBoundary.scheduledPatternCount).toBe(beforeResize.scheduledPatternCount);
    expect(atResizeBoundary.spawns).toEqual(beforeResize.spawns);

    let afterResize = atResizeBoundary;
    for (
      let step = 0;
      step < 24 && afterResize.scheduledPatternCount === beforeResize.scheduledPatternCount;
      step += 1
    ) {
      const schedulingBoundary =
        afterResize.nextPatternStartDistance -
        afterResize.schedulingWindow.minimumReactionDistance -
        PROTOTYPE_PLAYER_COLLISION_EXTENTS.right;
      const nextDistance = Math.max(afterResize.runDistance, schedulingBoundary);
      afterResize = advanceGeneratedHazardStream(
        afterResize,
        nextDistance,
        tallContext,
        runMotion,
        0,
        true,
      );
    }

    expect(afterResize.scheduledPatternCount).toBeGreaterThan(beforeResize.scheduledPatternCount);
    expectSpawnPrefixUnchanged(beforeResize, afterResize);

    const addedSpawns = afterResize.spawns.slice(beforeResize.spawns.length);
    expect(addedSpawns.length).toBeGreaterThan(0);
    expect(addedSpawns.some((spawn) => spawn.hitbox.top < 0)).toBe(true);
  });

  it('does not retroactively retarget an already locked reactive strike when the domain changes', () => {
    const tallDomain = createPrototypeHazardVerticalDomain(
      createPrototypeFlightBounds(TALL_VIEWPORT),
      [PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN],
    );
    const schedule = scheduleNextPattern({
      catalog: tallDomain.catalog,
      constraints: tallDomain.constraints,
      patternStartDistance: 1_000,
      state: createRunGenerationState('issue-191-locked-resize'),
    });
    if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
      throw new Error('Expected expanded-domain target-lock strike to schedule.');
    }

    const spawn = schedule.spawns[0];
    const locked = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      1.5,
      { positionY: -180, runDistance: 100 },
    );
    const before = getTelegraphedHazardLifecycle(locked, spawn);
    expect(before?.phase).toBe('lock');
    expect(before?.lockedTarget).not.toBeNull();

    // A viewport/domain change only affects future generated geometry. The lifecycle receives a
    // very different player target here to prove that the accepted strike remains frozen after Lock.
    const afterDomainChange = stepTelegraphedHazardSimulation(locked, [spawn], 0.1, {
      positionY: 340,
      runDistance: 500,
    });
    const after = getTelegraphedHazardLifecycle(afterDomainChange, spawn);

    expect(after?.phase).toBe('lock');
    expect(after?.lockedTarget).toEqual(before?.lockedTarget);
  });
});
