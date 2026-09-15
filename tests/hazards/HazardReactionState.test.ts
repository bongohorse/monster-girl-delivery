import { describe, expect, it } from 'vitest';
import {
  applyHazardExternalEffect,
  createHazardReactionPolicy,
  createHazardReactionState,
  DEFAULT_HAZARD_REACTION_POLICY,
  filterGameplayActiveHazards,
  getHazardGameplayState,
  IMMUNE_HAZARD_REACTION_POLICY,
  reconcileHazardReactionState,
  resolveHazardExternalReaction,
  stepHazardReactionState,
} from '../../src/hazards/HazardReactionState';

describe('shared hazard reaction state', () => {
  it('defaults every untracked hazard to active', () => {
    const state = createHazardReactionState();

    expect(getHazardGameplayState(state, 'hazard-a')).toBe('active');
    expect(state.instances).toEqual([]);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.instances)).toBe(true);
  });

  it('applies disable, destroy, and immune policy deterministically', () => {
    let state = createHazardReactionState();
    state = applyHazardExternalEffect(state, 'hazard-a', { kind: 'disable' });
    expect(getHazardGameplayState(state, 'hazard-a')).toBe('disabled');

    state = applyHazardExternalEffect(state, 'hazard-a', { kind: 'destroy' });
    expect(getHazardGameplayState(state, 'hazard-a')).toBe('destroyed');

    const unchanged = applyHazardExternalEffect(
      state,
      'hazard-b',
      { kind: 'destroy' },
      IMMUNE_HAZARD_REACTION_POLICY,
    );
    expect(unchanged).toBe(state);
    expect(getHazardGameplayState(unchanged, 'hazard-b')).toBe('active');
  });

  it('never reactivates a destroyed hazard through later effects', () => {
    let state = applyHazardExternalEffect(
      createHazardReactionState(),
      'hazard-a',
      { kind: 'destroy' },
      DEFAULT_HAZARD_REACTION_POLICY,
    );
    const destroyed = state;

    state = applyHazardExternalEffect(state, 'hazard-a', {
      kind: 'disable',
      durationSeconds: 1,
    });

    expect(state).toBe(destroyed);
    expect(getHazardGameplayState(state, 'hazard-a')).toBe('destroyed');
  });

  it('supports temporary and permanent disable without shortening an existing disable', () => {
    let state = applyHazardExternalEffect(createHazardReactionState(), 'hazard-a', {
      kind: 'disable',
      durationSeconds: 2,
    });
    state = stepHazardReactionState(state, 0.5);
    expect(state.instances[0]?.disabledRemainingSeconds).toBeCloseTo(1.5, 9);

    state = applyHazardExternalEffect(state, 'hazard-a', {
      kind: 'disable',
      durationSeconds: 0.25,
    });
    expect(state.instances[0]?.disabledRemainingSeconds).toBeCloseTo(1.5, 9);

    state = applyHazardExternalEffect(state, 'hazard-a', { kind: 'disable' });
    expect(state.instances[0]?.disabledRemainingSeconds).toBeNull();
    expect(stepHazardReactionState(state, 100)).toBe(state);
  });

  it('ages temporary disable only from supplied simulation delta and reactivates on expiry', () => {
    let state = applyHazardExternalEffect(createHazardReactionState(), 'hazard-a', {
      kind: 'disable',
      durationSeconds: 1,
    });
    const paused = stepHazardReactionState(state, 0);
    expect(paused).toBe(state);
    expect(paused.instances[0]?.disabledRemainingSeconds).toBe(1);

    state = stepHazardReactionState(state, 0.4);
    expect(getHazardGameplayState(state, 'hazard-a')).toBe('disabled');
    expect(state.instances[0]?.disabledRemainingSeconds).toBeCloseTo(0.6, 9);

    state = stepHazardReactionState(state, 0.6);
    expect(state).toBe(createHazardReactionState());
    expect(getHazardGameplayState(state, 'hazard-a')).toBe('active');
  });

  it('lets content map disable/destroy effects to different reactions', () => {
    const destroyOnDisable = createHazardReactionPolicy({
      disable: 'destroy',
      destroy: 'immune',
    });

    expect(resolveHazardExternalReaction(destroyOnDisable, 'disable')).toBe('destroy');
    expect(resolveHazardExternalReaction(destroyOnDisable, 'destroy')).toBe('immune');

    let state = applyHazardExternalEffect(
      createHazardReactionState(),
      'hazard-a',
      { kind: 'disable', durationSeconds: 3 },
      destroyOnDisable,
    );
    expect(getHazardGameplayState(state, 'hazard-a')).toBe('destroyed');

    state = applyHazardExternalEffect(
      state,
      'hazard-b',
      { kind: 'destroy' },
      destroyOnDisable,
    );
    expect(getHazardGameplayState(state, 'hazard-b')).toBe('active');
  });

  it('filters disabled and destroyed hazards from shared collision input', () => {
    const hazards = Object.freeze([
      Object.freeze({ id: 'active', hitbox: { left: 0, right: 1, top: 0, bottom: 1 } }),
      Object.freeze({ id: 'disabled', hitbox: { left: 1, right: 2, top: 0, bottom: 1 } }),
      Object.freeze({ id: 'destroyed', hitbox: { left: 2, right: 3, top: 0, bottom: 1 } }),
    ]);
    let state = applyHazardExternalEffect(createHazardReactionState(), 'disabled', {
      kind: 'disable',
    });
    state = applyHazardExternalEffect(state, 'destroyed', { kind: 'destroy' });

    const filtered = filterGameplayActiveHazards(state, hazards, (hazard) => hazard.id);

    expect(filtered.map((hazard) => hazard.id)).toEqual(['active']);
    expect(Object.isFrozen(filtered)).toBe(true);
  });

  it('prunes reaction entries after their logical hazards leave the runtime stream', () => {
    let state = applyHazardExternalEffect(createHazardReactionState(), 'keep', { kind: 'disable' });
    state = applyHazardExternalEffect(state, 'drop', { kind: 'destroy' });

    const reconciled = reconcileHazardReactionState(state, new Set(['keep']));

    expect(reconciled.instances.map((instance) => instance.hazardIdentity)).toEqual(['keep']);
    expect(getHazardGameplayState(reconciled, 'drop')).toBe('active');
  });

  it('rejects malformed policies, identities, durations, and deltas', () => {
    expect(() =>
      createHazardReactionPolicy({ disable: 'invalid' as 'disable', destroy: 'destroy' }),
    ).toThrow(TypeError);
    expect(() => getHazardGameplayState(createHazardReactionState(), '   ')).toThrow(TypeError);
    expect(() =>
      applyHazardExternalEffect(createHazardReactionState(), 'hazard-a', {
        kind: 'disable',
        durationSeconds: 0,
      }),
    ).toThrow(RangeError);
    expect(() => stepHazardReactionState(createHazardReactionState(), Number.NaN)).toThrow(
      RangeError,
    );
  });
});
