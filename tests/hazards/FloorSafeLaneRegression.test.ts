import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import { ViewportService } from '../../src/core/ViewportService';
import {
  createPrototypeFlightBounds,
  getPrototypePlayerX,
  getPrototypeVerticalOffset,
  getPrototypeVerticalProjection,
  PROTOTYPE_LOGICAL_FLIGHT_BOUNDS,
  PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT,
  PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS,
  projectLogicalYToScreen,
} from '../../src/game/PrototypeFlightLayout';
import { createPrototypeScrollingWorldLayout } from '../../src/game/PrototypeScrollingWorldLayout';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
  validatePattern,
} from '../../src/generation/PatternValidator';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN,
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

  it('preserves the authored floor while allowing a higher ceiling on taller viewports', () => {
    const viewports = [
      VIEWPORT_BASELINE_PHONE,
      VIEWPORT_TALL_DESKTOP,
      VIEWPORT_TABLET,
      VIEWPORT_ULTRAWIDE_1080P,
      VIEWPORT_IPHONE_SAFE_AREA,
    ];

    for (const vp of viewports) {
      const bounds = createPrototypeFlightBounds(vp);
      expect(bounds.ceilingY).toBeLessThanOrEqual(28);
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

  it('preserves exact presentation-simulation collision alignment via unified vertical projection', () => {
    const viewports = [
      { vp: VIEWPORT_BASELINE_PHONE, expectedScale: 1, expectedOffset: 0 },
      { vp: VIEWPORT_TALL_DESKTOP, expectedScale: 1, expectedOffset: 330 },
      { vp: VIEWPORT_TABLET, expectedScale: 1, expectedOffset: 378 },
      { vp: VIEWPORT_ULTRAWIDE_1080P, expectedScale: 1, expectedOffset: 690 },
      {
        vp: new ViewportService(800, 300).getSnapshot(),
        expectedScale: 300 / 390,
        expectedOffset: 0,
      },
      {
        vp: new ViewportService(640, 360).getSnapshot(),
        expectedScale: 360 / 390,
        expectedOffset: 0,
      },
    ];

    for (const { vp, expectedScale, expectedOffset } of viewports) {
      const projection = getPrototypeVerticalProjection(vp);
      expect(projection.scaleY).toBeCloseTo(expectedScale, 6);
      expect(projection.offsetY).toBe(expectedOffset);

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
        projection,
      );

      const playerLogicalHitbox = createPrototypePlayerHitbox(
        runState,
        floorFlightState,
        PROTOTYPE_PLAYER_COLLISION_EXTENTS,
      );
      const playerScreenHitbox = {
        left: playerLogicalHitbox.left + (playerScreenX - runState.distance),
        right: playerLogicalHitbox.right + (playerScreenX - runState.distance),
        top: projectLogicalYToScreen(playerLogicalHitbox.top, projection),
        bottom: projectLogicalYToScreen(playerLogicalHitbox.bottom, projection),
      };

      // Screen overlap must match logical overlap scaled by projection.scaleY
      const logicalVerticalOverlap = corridorBottomHazard.hitbox.bottom - playerLogicalHitbox.top;
      const screenVerticalOverlap = projectedHazardHitbox.bottom - playerScreenHitbox.top;
      expect(logicalVerticalOverlap).toBe(4);
      expect(screenVerticalOverlap).toBeCloseTo(4 * projection.scaleY, 6);
      expect(screenVerticalOverlap).toBeGreaterThan(0);
      expect(doLogicalHitboxesOverlap(playerScreenHitbox, projectedHazardHitbox)).toBe(true);
    }
  });

  it('keeps ground presentation anchored to the logical arena across viewports', () => {
    const baselineLayout = createPrototypeScrollingWorldLayout(VIEWPORT_BASELINE_PHONE, 0);
    const tallLayout = createPrototypeScrollingWorldLayout(VIEWPORT_TALL_DESKTOP, 0);
    const tabletLayout = createPrototypeScrollingWorldLayout(VIEWPORT_TABLET, 0);
    const shortLayout = createPrototypeScrollingWorldLayout(
      new ViewportService(800, 300).getSnapshot(),
      0,
    );

    // Logical ground is at 390 - 12 = 378
    expect(baselineLayout.groundTopY).toBe(378);
    // On 720p: bottom anchor 330 + 378 = 708
    expect(tallLayout.groundTopY).toBe(708);
    // On 768p: bottom anchor 378 + 378 = 756
    expect(tabletLayout.groundTopY).toBe(756);
    // On 300p: 378 * (300 / 390) = 290.769...
    expect(shortLayout.groundTopY).toBeCloseTo(378 * (300 / 390), 2);

    // On 1:1 viewports, player at floor (positionY 362) has feet at screenY:
    // playerScreenY = positionY + verticalOffset = 362 + offset
    // groundTopY = 378 + offset
    // Difference is ALWAYS 16px!
    const baselineOffset = getPrototypeVerticalOffset(VIEWPORT_BASELINE_PHONE);
    const tallOffset = getPrototypeVerticalOffset(VIEWPORT_TALL_DESKTOP);
    const tabletOffset = getPrototypeVerticalOffset(VIEWPORT_TABLET);

    expect(baselineLayout.groundTopY - (362 + baselineOffset)).toBe(16);
    expect(tallLayout.groundTopY - (362 + tallOffset)).toBe(16);
    expect(tabletLayout.groundTopY - (362 + tabletOffset)).toBe(16);

    // On short viewport, difference is 16 * scaleY
    const shortProjection = getPrototypeVerticalProjection({
      height: 300,
      safeArea: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    const playerScreenY = projectLogicalYToScreen(362, shortProjection);
    expect(shortLayout.groundTopY - playerScreenY).toBeCloseTo(16 * shortProjection.scaleY, 2);
  });

  it('retains the authored baseline for pattern validation, reachability and hazard templates', () => {
    // 1. Authored baseline size (live tall viewports additionally expose negative Y)
    expect(PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT).toBe(390);

    // 2. Flight bounds and vertical extents
    expect(PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.ceilingY).toBe(28);
    expect(PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.floorY).toBe(362);
    expect(PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS.top).toBe(28);
    expect(PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS.bottom).toBe(28);

    // 3. Collision extents
    expect(PROTOTYPE_PLAYER_COLLISION_EXTENTS.top).toBe(24);
    expect(PROTOTYPE_PLAYER_COLLISION_EXTENTS.bottom).toBe(24);

    // 4. Center coordinates parity
    const flightBoundsCenter =
      (PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.ceilingY + PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.floorY) / 2;
    const playableCorridorCenter =
      (PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS.playableTop +
        PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS.playableBottom) /
      2;
    const arenaCenter = PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT / 2;

    expect(flightBoundsCenter).toBe(195);
    expect(playableCorridorCenter).toBe(195);
    expect(arenaCenter).toBe(195);
    expect(PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState.positionY).toBe(195);

    // 5. Symmetric 4px overlap at ceiling and floor boundaries
    // Ceiling: player center 28, collision extents 24 -> [4, 52]. Overlaps top playable boundary 48 by 4px.
    const playerAtCeilingHitboxBottom =
      PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.ceilingY + PROTOTYPE_PLAYER_COLLISION_EXTENTS.top;
    const ceilingOverlap =
      playerAtCeilingHitboxBottom - PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS.playableTop;
    expect(ceilingOverlap).toBe(4);

    // Floor: player center 362, collision extents 24 -> [338, 386]. Overlaps bottom playable boundary 342 by 4px.
    const playerAtFloorHitboxTop =
      PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.floorY - PROTOTYPE_PLAYER_COLLISION_EXTENTS.bottom;
    const floorOverlap =
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS.playableBottom - playerAtFloorHitboxTop;
    expect(floorOverlap).toBe(4);

    // 6. Reachability corridor bounds alignment
    const reachableCeilingY =
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS.playableTop +
      PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents.top;
    const reachableFloorY =
      PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS.playableBottom -
      PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents.bottom;
    expect(reachableCeilingY).toBe(72);
    expect(reachableFloorY).toBe(318);
    expect((reachableCeilingY + reachableFloorY) / 2).toBe(195);

    // In target-lock-strike: minimumTargetY matches reachability ceiling
    const targetLockBehavior = PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN.entries[0]?.behavior;
    if (targetLockBehavior && 'minimumTargetY' in targetLockBehavior) {
      expect(targetLockBehavior.minimumTargetY).toBe(72);
    }

    // 7. Authored hazard templates stay within [0, 390] and pass validation with 0 issues
    for (const pattern of PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES) {
      for (const entry of pattern.entries) {
        expect(entry.hitbox.top).toBeGreaterThanOrEqual(0);
        expect(entry.hitbox.bottom).toBeLessThanOrEqual(PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT);
        expect(entry.hitbox.top).toBeLessThan(entry.hitbox.bottom);
        expect(entry.hitbox.left).toBeLessThan(entry.hitbox.right);
      }

      const validationResult = validatePattern(
        pattern,
        PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
        PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
      );
      expect(validationResult.valid).toBe(true);
      expect(validationResult.issues).toHaveLength(0);
    }
  });

  it('guarantees presentation safety across short and tall viewports with and without safe-area insets', () => {
    const testViewports = [
      // Short viewports
      { name: '800x300 short landscape', vp: new ViewportService(800, 300).getSnapshot() },
      { name: '640x360 Android landscape', vp: new ViewportService(640, 360).getSnapshot() },
      { name: '667x375 iPhone 8/SE landscape', vp: new ViewportService(667, 375).getSnapshot() },
      // Baseline and tall viewports
      { name: '844x390 baseline landscape', vp: VIEWPORT_BASELINE_PHONE },
      { name: '1280x720 tall desktop', vp: VIEWPORT_TALL_DESKTOP },
      { name: '1024x768 tablet', vp: VIEWPORT_TABLET },
      // Safe-area insets on short viewports
      {
        name: '800x300 with insets',
        vp: new ViewportService(800, 300, {
          top: 12,
          right: 20,
          bottom: 16,
          left: 20,
        }).getSnapshot(),
      },
      {
        name: '640x360 with insets',
        vp: new ViewportService(640, 360, {
          top: 10,
          right: 30,
          bottom: 15,
          left: 30,
        }).getSnapshot(),
      },
      // Safe-area insets on baseline and tall viewports
      {
        name: '844x390 with iPhone insets',
        vp: VIEWPORT_IPHONE_SAFE_AREA,
      },
      {
        name: '1280x720 with insets',
        vp: new ViewportService(1280, 720, {
          top: 24,
          right: 0,
          bottom: 34,
          left: 0,
        }).getSnapshot(),
      },
    ];

    for (const { name, vp } of testViewports) {
      // 1. Floor remains fixed; taller viewports extend the ceiling
      const bounds = createPrototypeFlightBounds(vp);
      expect(bounds.floorY, `${name}: floor`).toBe(PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.floorY);

      const projection = getPrototypeVerticalProjection(vp);
      expect(projection.scaleY, `${name}: scaleY must be positive`).toBeGreaterThan(0);
      expect(projection.scaleY, `${name}: scaleY must be <= 1`).toBeLessThanOrEqual(1);

      const safeTop = Math.min(vp.height, vp.safeArea.top);
      const safeBottom = vp.height - Math.min(vp.height - safeTop, vp.safeArea.bottom);

      // 2. Player body and collision bounds at the actual dynamic ceiling
      const playerCeilingY = projectLogicalYToScreen(bounds.ceilingY, projection);
      const playerCeilingCollisionTop = projectLogicalYToScreen(bounds.ceilingY - 24, projection);
      const playerCeilingVisualTop = projectLogicalYToScreen(bounds.ceilingY - 28, projection);

      expect(playerCeilingY, `${name}: player ceiling Y >= safeTop`).toBeGreaterThanOrEqual(
        safeTop - 1e-6,
      );
      expect(
        playerCeilingCollisionTop,
        `${name}: player ceiling collision top >= safeTop`,
      ).toBeGreaterThanOrEqual(safeTop - 1e-6);
      expect(
        playerCeilingVisualTop,
        `${name}: player ceiling visual top >= safeTop`,
      ).toBeGreaterThanOrEqual(safeTop - 1e-6);

      // 3. Player presentation bounds at floor (positionY = 362)
      const playerFloorY = projectLogicalYToScreen(362, projection);
      const playerFloorCollisionBottom = projectLogicalYToScreen(362 + 24, projection);
      const playerFloorVisualBottom = projectLogicalYToScreen(390, projection);

      expect(playerFloorY, `${name}: player floor Y <= safeBottom`).toBeLessThanOrEqual(
        safeBottom + 1e-6,
      );
      expect(
        playerFloorCollisionBottom,
        `${name}: player floor collision bottom <= safeBottom`,
      ).toBeLessThanOrEqual(safeBottom + 1e-6);
      expect(
        playerFloorVisualBottom,
        `${name}: player floor visual bottom <= safeBottom`,
      ).toBeLessThanOrEqual(safeBottom + 1e-6);

      // 4. Catalog hazards projection
      for (const pattern of PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES) {
        for (const entry of pattern.entries) {
          const screenTop = projectLogicalYToScreen(entry.hitbox.top, projection);
          const screenBottom = projectLogicalYToScreen(entry.hitbox.bottom, projection);

          expect(screenTop, `${name}: hazard ${entry.id} top >= safeTop`).toBeGreaterThanOrEqual(
            safeTop - 1e-6,
          );
          expect(
            screenBottom,
            `${name}: hazard ${entry.id} bottom <= safeBottom`,
          ).toBeLessThanOrEqual(safeBottom + 1e-6);
        }
      }

      // 5. World ground layout
      const worldLayout = createPrototypeScrollingWorldLayout(vp, 0);
      expect(worldLayout.groundTopY, `${name}: groundTopY >= safeTop`).toBeGreaterThanOrEqual(
        safeTop - 1e-6,
      );
      expect(worldLayout.groundTopY, `${name}: groundTopY <= safeBottom`).toBeLessThanOrEqual(
        safeBottom + 1e-6,
      );
      for (const building of worldLayout.buildings) {
        expect(building.y, `${name}: building y >= safeTop`).toBeGreaterThanOrEqual(safeTop - 1e-6);
      }
    }
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
