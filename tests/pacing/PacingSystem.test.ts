import { describe, expect, it } from 'vitest';
import { TimeService } from '../../src/core/TimeService';
import { calculateDifficulty } from '../../src/difficulty/DifficultySystem';
import {
  calculatePacing,
  type PacingPhaseDefinition,
  PROTOTYPE_PACING_CONFIG,
} from '../../src/pacing/PacingSystem';
import { stepRunMotion } from '../../src/systems/RunMotionSimulation';

const CYCLE_LENGTH = PROTOTYPE_PACING_CONFIG.phases.reduce(
  (sum, phase) => sum + phase.distanceLength,
  0,
);

describe('pacing system', () => {
  it.each([
    [0, 'breather', 0, 1_600],
    [1_599.999, 'breather', 0, 1_600],
    [1_600, 'low', 1_600, 2_500],
    [2_499.999, 'low', 1_600, 2_500],
    [2_500, 'breather', 2_500, 3_900],
    [3_899.999, 'breather', 2_500, 3_900],
    [3_900, 'medium', 3_900, 4_800],
    [4_799.999, 'medium', 3_900, 4_800],
    [4_800, 'breather', 4_800, 6_400],
    [6_399.999, 'breather', 4_800, 6_400],
    [6_400, 'high', 6_400, 8_700],
    [8_699.999, 'high', 6_400, 8_700],
    [8_700, 'breather', 8_700, 11_500],
    [11_499.999, 'breather', 8_700, 11_500],
    [11_500, 'peak', 11_500, 13_800],
    [13_799.999, 'peak', 11_500, 13_800],
    [13_800, 'breather', 13_800, 15_400],
  ] as const)(
    'resolves distance %s to %s with explicit boundaries',
    (distance, intensity, start, end) => {
      expect(calculatePacing(distance)).toMatchObject({
        intensity,
        phaseStartDistance: start,
        phaseEndDistance: end,
        remainingPhaseDistance: end - distance,
        runDistance: distance,
      });
    },
  );

  it('puts an explicit hazard-free recovery phase after every pressure phase', () => {
    const phases = PROTOTYPE_PACING_CONFIG.phases;
    for (const [index, phase] of phases.entries()) {
      if (phase.intensity === 'breather') continue;
      expect(phases[(index + 1) % phases.length]?.intensity).toBe('breather');
    }
    const breatherDistance = phases
      .filter((phase) => phase.intensity === 'breather')
      .reduce((sum, phase) => sum + phase.distanceLength, 0);
    expect(breatherDistance / CYCLE_LENGTH).toBeGreaterThan(0.5);
  });

  it('keeps low and medium to one hazard entry and bounds challenge beats to two entries', () => {
    const pressure = Object.fromEntries(
      PROTOTYPE_PACING_CONFIG.phases
        .filter((phase) => phase.intensity !== 'breather')
        .map((phase) => [phase.intensity, phase]),
    );
    expect(pressure.low).toMatchObject({ maximumPatternEntries: 1, maximumHazardsPer1000Distance: 2, distanceLength: 900 });
    expect(pressure.medium).toMatchObject({ maximumPatternEntries: 1, maximumHazardsPer1000Distance: 2, distanceLength: 900 });
    expect(pressure.high).toMatchObject({ maximumPatternEntries: 2, maximumHazardsPer1000Distance: 4, distanceLength: 2_300 });
    expect(pressure.peak).toMatchObject({ maximumPatternEntries: 2, maximumHazardsPer1000Distance: 4, distanceLength: 2_300 });
  });

  it('bounds every peak and guarantees a full recovery window over 1,000 cycles', () => {
    for (let cycleIndex = 0; cycleIndex < 1_000; cycleIndex += 1) {
      const start = cycleIndex * CYCLE_LENGTH;
      const peak = calculatePacing(start + 11_500);
      const recovery = calculatePacing(peak.phaseEndDistance);
      expect(peak).toMatchObject({ cycleIndex, intensity: 'peak', remainingPhaseDistance: 2_300 });
      expect(recovery).toMatchObject({
        cycleIndex: cycleIndex + 1,
        intensity: 'breather',
        remainingPhaseDistance: 1_600,
        maximumPatternEntries: 1,
        maximumHazardsPer1000Distance: 2,
      });
      expect(calculatePacing(recovery.phaseEndDistance - 0.001).intensity).toBe('breather');
    }
  });

  it('recovers even after difficulty has capped and resolves jumps without transition history', () => {
    const opening = calculatePacing(0);
    const distance = 1_000_000 * CYCLE_LENGTH;
    expect(calculateDifficulty(distance).capped).toBe(true);
    expect(calculatePacing(distance)).toMatchObject({ cycleIndex: 1_000_000, intensity: 'breather', phaseIndex: 0 });
    calculatePacing(distance + 11_500);
    expect(calculatePacing(0)).toEqual(opening);
    expect(calculatePacing(distance)).not.toHaveProperty('tierIndex');
  });

  it('holds at zero delta, while paused, and on the first resume frame', () => {
    const time = new TimeService();
    const tuning = { baseScrollSpeed: 350 };
    let motion = { distance: 13_799 };
    const before = calculatePacing(motion.distance);
    motion = stepRunMotion(motion, time.update(0), tuning);
    expect(calculatePacing(motion.distance)).toEqual(before);
    time.pause();
    motion = stepRunMotion(motion, time.update(60_000), tuning);
    expect(calculatePacing(motion.distance)).toEqual(before);
    time.resume();
    motion = stepRunMotion(motion, time.update(60_000), tuning);
    expect(calculatePacing(motion.distance)).toEqual(before);
    motion = stepRunMotion(motion, time.update(10), tuning);
    expect(calculatePacing(motion.distance).intensity).toBe('breather');
  });

  it('resolves equivalent simulation progress independently of frame partitioning', () => {
    const advance = (frameMilliseconds: number, frames: number) => {
      const time = new TimeService();
      let motion = { distance: 13_000 };
      for (let frame = 0; frame < frames; frame += 1) {
        motion = stepRunMotion(motion, time.update(frameMilliseconds), { baseScrollSpeed: 350 });
      }
      return calculatePacing(motion.distance);
    };
    expect(advance(20, 100)).toEqual(advance(10, 200));
  });

  it('uses explicit custom phase order and durations with immutable serializable snapshots', () => {
    const phases: PacingPhaseDefinition[] = [
      { intensity: 'peak', distanceLength: 30, maximumPatternEntries: 3, maximumHazardsPer1000Distance: 6 },
      { intensity: 'breather', distanceLength: 70, maximumPatternEntries: 1, maximumHazardsPer1000Distance: 1 },
    ];
    const snapshot = calculatePacing(30, { phases });
    expect(snapshot).toMatchObject({ intensity: 'breather', phaseIndex: 1, phaseEndDistance: 100 });
    expect(calculatePacing(100, { phases })).toMatchObject({ intensity: 'peak', cycleIndex: 1 });
    phases[1] = { intensity: 'breather', distanceLength: 1, maximumPatternEntries: 2, maximumHazardsPer1000Distance: 3 };
    expect(snapshot.remainingPhaseDistance).toBe(70);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(PROTOTYPE_PACING_CONFIG)).toBe(true);
    expect(Object.isFrozen(PROTOTYPE_PACING_CONFIG.phases)).toBe(true);
    expect(PROTOTYPE_PACING_CONFIG.phases.every(Object.isFrozen)).toBe(true);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER])(
    'rejects unsupported progress or unrepresentable boundaries: %s',
    (distance) => expect(() => calculatePacing(distance)).toThrow(RangeError),
  );

  it('rejects missing recovery, invalid intensities, invalid pressure limits and duration overflow', () => {
    const breather: PacingPhaseDefinition = { intensity: 'breather', distanceLength: 100, maximumPatternEntries: 1, maximumHazardsPer1000Distance: 2 };
    expect(() => calculatePacing(0, { phases: [] })).toThrow(/breather/);
    expect(() => calculatePacing(0, { phases: [{ ...breather, intensity: 'peak' }] })).toThrow(/breather/);
    expect(() => calculatePacing(0, { phases: [breather, { ...breather, intensity: 'unknown' as 'peak' }] })).toThrow(TypeError);
    for (const value of [0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => calculatePacing(0, { phases: [{ ...breather, distanceLength: value }] })).toThrow(RangeError);
      expect(() => calculatePacing(0, { phases: [{ ...breather, maximumPatternEntries: value }] })).toThrow(RangeError);
    }
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => calculatePacing(0, { phases: [{ ...breather, maximumHazardsPer1000Distance: value }] })).toThrow(RangeError);
    }
    expect(() => calculatePacing(0, { phases: [breather, { ...breather, distanceLength: Number.MAX_SAFE_INTEGER }] })).toThrow(/cycle length/);
  });
});
