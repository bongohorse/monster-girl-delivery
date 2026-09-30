import { describe, expect, it } from 'vitest';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import { PROTOTYPE_LOGICAL_FLIGHT_BOUNDS } from '../../src/game/PrototypeFlightLayout';
import { FIRST_DELIVERY_PROTECTED_INTERVALS } from '../../src/generation/FirstDeliveryRoute';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  PROTOTYPE_LIVE_RUN_SEED,
} from '../../src/generation/GeneratedHazardStream';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../src/generation/LiveEncounterPolicy';
import {
  M6_MOLTEN_SPIKE_TRIAL,
  PROTOTYPE_M6_TRIAL_HAZARD_PATTERN_CATALOG,
} from '../../src/generation/M6MoltenSpikeTrial';
import { validatePattern } from '../../src/generation/PatternValidator';
import { createPrototypeHazardVerticalDomain } from '../../src/generation/PrototypeHazardVerticalDomain';

describe('M6 molten spike visual trial', () => {
  it('has one fair, static live encounter with a lower coin route', () => {
    expect(validatePattern(M6_MOLTEN_SPIKE_TRIAL)).toEqual({ valid: true, issues: [] });
    expect(M6_MOLTEN_SPIKE_TRIAL.entries[0]).toMatchObject({
      type: 'molten-spike',
      hitbox: { left: 256, right: 304, top: 86, bottom: 134 },
      behavior: { kind: 'static' },
    });
    expect(M6_MOLTEN_SPIKE_TRIAL.collectiblePaths?.[0]).toMatchObject({
      intent: 'safe-guide',
    });
    expect(
      PROTOTYPE_M6_TRIAL_HAZARD_PATTERN_CATALOG[
        PROTOTYPE_M6_TRIAL_HAZARD_PATTERN_CATALOG.length - 1
      ],
    ).toBe(M6_MOLTEN_SPIKE_TRIAL);
    expect(createPrototypeHazardVerticalDomain(PROTOTYPE_LOGICAL_FLIGHT_BOUNDS).catalog).toContain(
      M6_MOLTEN_SPIKE_TRIAL,
    );
  });

  it('is actually accepted into the seeded AUTO run outside delivery safe approaches', () => {
    const context = {
      catalog: PROTOTYPE_M6_TRIAL_HAZARD_PATTERN_CATALOG,
      policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
      reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
      protectedIntervals: FIRST_DELIVERY_PROTECTED_INTERVALS,
    };
    let stream = createGeneratedHazardStream(
      PROTOTYPE_LIVE_RUN_SEED,
      context,
      PROTOTYPE_RUN_MOTION_DEFAULTS,
    );
    let sawSpike = false;
    for (let distance = 0; distance <= 3_000; distance += 100) {
      stream = advanceGeneratedHazardStream(
        stream,
        distance,
        context,
        PROTOTYPE_RUN_MOTION_DEFAULTS,
        distance === 0 ? 0 : 100 / PROTOTYPE_RUN_MOTION_DEFAULTS.baseScrollSpeed,
      );
      sawSpike ||= stream.spawns.some((spawn) => spawn.type === 'molten-spike');
    }
    expect(sawSpike).toBe(true);
  });

  it.each([390, 800])(
    'varies fair AUTO spike heights reproducibly at viewport height %s',
    (height) => {
      const domain = createPrototypeHazardVerticalDomain({
        ceilingY: 28 - (height - 390),
        floorY: 362,
      });
      const collect = () => {
        const context = {
          catalog: domain.catalog,
          constraints: domain.constraints,
          policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
          reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
          protectedIntervals: FIRST_DELIVERY_PROTECTED_INTERVALS,
        };
        const spikes = new Map<string, { top: number; bottom: number }>();
        for (let seed = 0; seed < 128; seed += 1) {
          let stream = createGeneratedHazardStream(seed, context, PROTOTYPE_RUN_MOTION_DEFAULTS);
          for (let distance = 0; distance <= 3_000; distance += 100) {
            stream = advanceGeneratedHazardStream(
              stream,
              distance,
              context,
              PROTOTYPE_RUN_MOTION_DEFAULTS,
              distance === 0 ? 0 : 100 / PROTOTYPE_RUN_MOTION_DEFAULTS.baseScrollSpeed,
            );
            for (const spawn of stream.spawns) {
              if (spawn.type !== 'molten-spike') continue;
              expect(spawn.behavior.kind).toBe('static');
              expect(spawn.hitbox.top).toBeGreaterThanOrEqual(domain.constraints.playableTop);
              expect(spawn.hitbox.bottom).toBeLessThanOrEqual(domain.constraints.playableBottom);
              for (const interval of FIRST_DELIVERY_PROTECTED_INTERVALS) {
                expect(
                  spawn.hitbox.right <= interval.start || spawn.hitbox.left >= interval.end,
                ).toBe(true);
              }
              spikes.set(`${seed}:${spawn.runDistance}`, {
                top: spawn.hitbox.top,
                bottom: spawn.hitbox.bottom,
              });
            }
          }
        }
        return [...spikes];
      };
      const spikes = collect();
      expect(spikes).toEqual(collect());
      expect(spikes.length).toBeGreaterThan(3);
      expect(new Set(spikes.map(([, box]) => box.top)).size).toBeGreaterThan(3);
      const centers = spikes.map(([, box]) => (box.top + box.bottom) / 2);
      const span = domain.constraints.playableBottom - domain.constraints.playableTop;
      expect(Math.min(...centers)).toBeLessThan(domain.constraints.playableTop + span * 0.3);
      expect(Math.max(...centers)).toBeGreaterThan(domain.constraints.playableTop + span * 0.8);
    },
  );

  it('cannot give this static picture a moving or timed collision behavior', () => {
    const entry = M6_MOLTEN_SPIKE_TRIAL.entries[0];
    if (!entry) throw new Error('Missing spike trial entry');
    expect(() =>
      createHazardPattern({
        ...M6_MOLTEN_SPIKE_TRIAL,
        entries: [{ ...entry, behavior: undefined }],
      }),
    ).toThrow('requires static geometric hazard behavior');
  });
});
