import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import { ViewportService } from '../../src/core/ViewportService';
import {
  createPrototypeFlightBounds,
  getPrototypePlayerX,
  getPrototypeVerticalOffset,
  PROTOTYPE_LOGICAL_FLIGHT_BOUNDS,
} from '../../src/game/PrototypeFlightLayout';
import { createPrototypeScrollingWorldLayout } from '../../src/game/PrototypeScrollingWorldLayout';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { projectHazardHitboxToScreen } from '../../src/hazards/PrototypeHazard';
import {
  createPrototypePlayerHitbox,
  doLogicalHitboxesOverlap,
  isPlayerCollidingWithHazard,
  PROTOTYPE_PLAYER_COLLISION_EXTENTS,
} from '../../src/systems/HazardCollision';
import {
  createPrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';
import type { VerticalFlightState } from '../../src/systems/VerticalFlightSimulation';

describe('Issue #177: viewport-height-dependent permanent floor safe lane regression', () => {
  const VIEWPORT_BASELINE_PHONE = new ViewportService(844, 390).getSnapshot();
  const VIEWPORT_TALL_DESKTOP = new ViewportService(1_280, 720).getSnapshot();
  const VIEWPORT_TABLET = new ViewportService(1_024, 768).getSnapshot();
  const VIEWPORT_ULTRAWIDE_1080P = new ViewportService(1_920, 1_080).getSnapshot();
  const VIEWPORT_IPHONE_SAFE_AREA = new ViewportService(844, 390, {
    top: 0,
    right: 44,
    bottom: 21,
    left: 44,
  }).getSnapshot();

  const corridorBottomHazard = PROTOTYPE_CORRIDOR_PATTERN.entries.find(
    (entry) => entry.id === 'corridor-bottom',
  );
  if (!corridorBottomHazard) {
    throw new Error('Expected corridor-bottom fixture in PROTOTYPE_CORRIDOR_PATTERN.');
  }

  it('keeps logical flight bounds invariant to physical viewport height and safe areas', () => {
    const viewports = [
      VIEWPORT_BASELINE_PHONE,
      VIEWPORT_TALL_DESKTOP,
      VIEWPORT_TABLET,
      VIEWPORT_ULTRAWIDE_1080P,
      VIEWPORT_IPHONE_SAFE_AREA,
    ];

    for (const vp of viewports) {
      const bounds = createPrototypeFlightBounds(vp);
      expect(bounds).toEqual(PROTOTYPE_LOGICAL_FLIGHT_BOUNDS);
      expect(bounds.ceilingY).toBe(28);
      expect(bounds.floorY).toBe(362);
    }
  });

  it('eliminates the permanent floor safe lane on tall viewports (player at floor collides with corridor-bottom)', () => {
    const floorFlightState: VerticalFlightState = {
      positionY: PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.floorY,
      velocityY: 0,
    };
    const playerHitboxAtFloor = createPrototypePlayerHitbox(
      { distance: 180 },
      floorFlightState,
      PROTOTYPE_PLAYER_COLLISION_EXTENTS,
    );

    // Player hitbox: [top: 362 - 24 = 338, bottom: 362 + 24 = 386]
    // Hazard hitbox: [top: 258, bottom: 342]
    // Overlap: player top 338 < hazard bottom 342
    expect(playerHitboxAtFloor.top).toBe(338);
    expect(playerHitboxAtFloor.bottom).toBe(386);
    expect(corridorBottomHazard.hitbox.top).toBe(258);
    expect(corridorBottomHazard.hitbox.bottom).toBe(342);

    expect(doLogicalHitboxesOverlap(playerHitboxAtFloor, corridorBottomHazard.hitbox)).toBe(true);
    expect(
      isPlayerCollidingWithHazard(
        { distance: 180 },
        floorFlightState,
        corridorBottomHazard,
        PROTOTYPE_PLAYER_COLLISION_EXTENTS,
      ),
    ).toBe(true);
  });

  it('produces bit-for-bit identical run simulation outcomes when idling at floor across all viewports', () => {
    const viewports = [
      VIEWPORT_BASELINE_PHONE,
      VIEWPORT_TALL_DESKTOP,
      VIEWPORT_TABLET,
      VIEWPORT_ULTRAWIDE_1080P,
      VIEWPORT_IPHONE_SAFE_AREA,
    ];

    const simulationResults = viewports.map((vp) => {
      const bounds = createPrototypeFlightBounds(vp);
      let run = createPrototypeRunState(bounds);

      // Place player at the floor from distance 0
      run = {
        ...run,
        flight: { positionY: bounds.floorY, velocityY: 0 },
      };

      const dt = 1 / 60;
      let totalSteps = 0;
      const maxSteps = 300;

      while (run.phase === 'running' && totalSteps < maxSteps) {
        const stepResult = stepPrototypeRun(run, dt, {
          flightBounds: bounds,
          flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
          hazards: [corridorBottomHazard],
          runMotionTuning: PROTOTYPE_RUN_MOTION_DEFAULTS,
          thrustHeld: false,
        });
        run = stepResult.state;
        totalSteps += 1;
      }

      return {
        phase: run.phase,
        finalDistance: run.motion.distance,
        finalPositionY: run.flight.positionY,
        stepsUntilDeath: totalSteps,
      };
    });

    // Every viewport must produce death at the exact same step and distance!
    const baselineResult = simulationResults[0];
    expect(baselineResult).toBeDefined();
    if (!baselineResult) return;

    expect(baselineResult.phase).toBe('dead');
    expect(baselineResult.finalPositionY).toBe(362);

    for (let index = 1; index < simulationResults.length; index += 1) {
      expect(simulationResults[index]).toEqual(baselineResult);
    }
  });

  it('preserves exact presentation-simulation collision alignment via vertical projection offset', () => {
    const viewports = [
      { vp: VIEWPORT_BASELINE_PHONE, expectedOffset: 0 },
      { vp: VIEWPORT_TALL_DESKTOP, expectedOffset: 165 },
      { vp: VIEWPORT_TABLET, expectedOffset: 189 },
      { vp: VIEWPORT_ULTRAWIDE_1080P, expectedOffset: 345 },
    ];

    for (const { vp, expectedOffset } of viewports) {
      const verticalOffset = getPrototypeVerticalOffset(vp);
      expect(verticalOffset).toBe(expectedOffset);

      const playerScreenX = getPrototypePlayerX(vp);
      const runState = { distance: 180 };
      const floorFlightState = {
        positionY: PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.floorY,
        velocityY: 0,
      };

      const projectedHazardHitbox = projectHazardHitboxToScreen(
        corridorBottomHazard,
        runState,
        playerScreenX,
        verticalOffset,
      );

      const playerLogicalHitbox = createPrototypePlayerHitbox(
        runState,
        floorFlightState,
        PROTOTYPE_PLAYER_COLLISION_EXTENTS,
      );
      const playerScreenHitbox = {
        left: playerLogicalHitbox.left + (playerScreenX - runState.distance),
        right: playerLogicalHitbox.right + (playerScreenX - runState.distance),
        top: playerLogicalHitbox.top + verticalOffset,
        bottom: playerLogicalHitbox.bottom + verticalOffset,
      };

      // Screen overlap must match logical overlap exactly (4px vertically)
      const logicalVerticalOverlap = corridorBottomHazard.hitbox.bottom - playerLogicalHitbox.top;
      const screenVerticalOverlap = projectedHazardHitbox.bottom - playerScreenHitbox.top;
      expect(logicalVerticalOverlap).toBe(4);
      expect(screenVerticalOverlap).toBe(4);
      expect(doLogicalHitboxesOverlap(playerScreenHitbox, projectedHazardHitbox)).toBe(true);
    }
  });

  it('keeps ground presentation anchored to the logical arena across viewports', () => {
    const baselineLayout = createPrototypeScrollingWorldLayout(VIEWPORT_BASELINE_PHONE, 0);
    const tallLayout = createPrototypeScrollingWorldLayout(VIEWPORT_TALL_DESKTOP, 0);
    const tabletLayout = createPrototypeScrollingWorldLayout(VIEWPORT_TABLET, 0);

    // Logical ground is at 390 - 12 = 378
    expect(baselineLayout.groundTopY).toBe(378);
    // On 720p: verticalOffset 165 + 378 = 543
    expect(tallLayout.groundTopY).toBe(543);
    // On 768p: verticalOffset 189 + 378 = 567
    expect(tabletLayout.groundTopY).toBe(567);

    // In all viewports, player at floor (positionY 362) has feet at screenY:
    // playerScreenY = positionY + verticalOffset = 362 + offset
    // groundTopY = 378 + offset
    // Difference is ALWAYS 16px!
    const baselineOffset = getPrototypeVerticalOffset(VIEWPORT_BASELINE_PHONE);
    const tallOffset = getPrototypeVerticalOffset(VIEWPORT_TALL_DESKTOP);
    const tabletOffset = getPrototypeVerticalOffset(VIEWPORT_TABLET);

    expect(baselineLayout.groundTopY - (362 + baselineOffset)).toBe(16);
    expect(tallLayout.groundTopY - (362 + tallOffset)).toBe(16);
    expect(tabletLayout.groundTopY - (362 + tabletOffset)).toBe(16);
  });

  it('ensures all bottom-blocking catalog fixtures cannot be bypassed by resting at floor', () => {
    const floorFlightState: VerticalFlightState = {
      positionY: PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.floorY,
      velocityY: 0,
    };

    for (const pattern of PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES) {
      for (const entry of pattern.entries) {
        if (entry.hitbox.bottom >= 338) {
          // Any entry authored to reach the floor zone must overlap with player at floor
          const overlap = doLogicalHitboxesOverlap(
            createPrototypePlayerHitbox(
              { distance: entry.hitbox.left + 20 },
              floorFlightState,
              PROTOTYPE_PLAYER_COLLISION_EXTENTS,
            ),
            entry.hitbox,
          );
          expect(overlap).toBe(true);
        }
      }
    }
  });
});
