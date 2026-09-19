import { describe, expect, it } from 'vitest';
import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  doesHitboxOverlapPrototypeZapper,
  PROTOTYPE_ZAPPER_ENDPOINT_DIAMETER,
  PROTOTYPE_ZAPPER_LENGTHS,
  PROTOTYPE_ZAPPER_ROTATION_SPEEDS,
  resolvePrototypeZapperGeometry,
} from '../../src/hazards/PrototypeZapperHazard';

const createFastLongRotatingZapper = () => {
  const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.long, {
    direction: 'clockwise',
    speedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.fast,
  });
  const hitbox = createPrototypeZapperHitbox(0, 0, behavior);

  return Object.freeze({
    behavior,
    entryId: 'rotation-sampling-evidence',
    hitbox,
    patternEntryIndex: 0,
    patternId: 'rotation-sampling-evidence',
    runDistance: hitbox.left,
    type: 'placeholder-barrier' as const,
  });
};

const createNearTangentPlayerHitbox = (targetAngleDegrees: number, endpointPenetration: number) => {
  const radians = (targetAngleDegrees * Math.PI) / 180;
  const directionX = Math.cos(radians);
  const directionY = Math.sin(radians);
  const halfLength = PROTOTYPE_ZAPPER_LENGTHS.long / 2;
  const endpointRadius = PROTOTYPE_ZAPPER_ENDPOINT_DIAMETER / 2;
  const endpointX = directionX * halfLength;
  const endpointY = directionY * halfLength;
  const nearestCornerDistance = endpointRadius - endpointPenetration;
  const nearestX = endpointX + directionX * nearestCornerDistance;
  const nearestY = endpointY + directionY * nearestCornerDistance;

  // The box extends farther into the same quadrant, so nearestX/nearestY is the relevant corner.
  return Object.freeze({
    bottom: nearestY + 48,
    left: nearestX,
    right: nearestX + 36,
    top: nearestY,
  });
};

const doesFixedTimeLatticeObserveContact = (
  hazard: ReturnType<typeof createFastLongRotatingZapper>,
  playerHitbox: Readonly<{ bottom: number; left: number; right: number; top: number }>,
  samplesPerSecond: number,
): boolean => {
  for (let index = 0; index <= samplesPerSecond; index += 1) {
    const geometry = resolvePrototypeZapperGeometry(hazard, index / samplesPerSecond);
    if (geometry && doesHitboxOverlapPrototypeZapper(playerHitbox, geometry)) {
      return true;
    }
  }
  return false;
};

describe('M5 rotating Zapper sampling safety evidence', () => {
  it('shows that blindly coarsening 1/720 s to 1/360 s can miss a real contact', () => {
    const hazard = createFastLongRotatingZapper();

    // At 90 deg/s, 45.125 degrees lies exactly on the 1/720 s lattice and halfway between
    // neighboring 1/360 s poses. The endpoint penetrates by only 0.0005 px at that middle pose.
    const playerHitbox = createNearTangentPlayerHitbox(45.125, 0.0005);

    expect(doesFixedTimeLatticeObserveContact(hazard, playerHitbox, 360)).toBe(false);
    expect(doesFixedTimeLatticeObserveContact(hazard, playerHitbox, 720)).toBe(true);
  });

  it('sweeps adversarial half-phase contacts across the first quadrant', () => {
    const hazard = createFastLongRotatingZapper();

    // Odd 1/720 indices are exactly halfway between neighboring 1/360 samples at 90 deg/s.
    // Sweep many such phases instead of relying on one hand-picked angle.
    for (let fineIndex = 161; fineIndex <= 559; fineIndex += 26) {
      const targetAngleDegrees = fineIndex / 8;
      const playerHitbox = createNearTangentPlayerHitbox(targetAngleDegrees, 0.0005);

      expect(doesFixedTimeLatticeObserveContact(hazard, playerHitbox, 360)).toBe(false);
      expect(doesFixedTimeLatticeObserveContact(hazard, playerHitbox, 720)).toBe(true);
    }
  });

  it('records that any fixed-rate pose lattice is a tolerance, not an exact continuous proof', () => {
    const hazard = createFastLongRotatingZapper();

    // This intentionally mirrors the previous construction one level deeper: the contact sits on
    // 1/1440 s and halfway between two 1/720 s poses. This is evidence against claiming that a
    // particular fixed frequency is analytically exact under strict positive-area overlap.
    const playerHitbox = createNearTangentPlayerHitbox(45.0625, 0.0001);

    expect(doesFixedTimeLatticeObserveContact(hazard, playerHitbox, 720)).toBe(false);
    expect(doesFixedTimeLatticeObserveContact(hazard, playerHitbox, 1_440)).toBe(true);
  });
});
