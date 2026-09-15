export type HazardGameplayState = 'active' | 'disabled' | 'destroyed';
export type HazardExternalEffectKind = 'disable' | 'destroy';
export type HazardExternalReaction = 'disable' | 'destroy' | 'immune';

export interface HazardReactionPolicy {
  readonly disable: HazardExternalReaction;
  readonly destroy: HazardExternalReaction;
}

export interface HazardDisableEffect {
  readonly durationSeconds?: number;
  readonly kind: 'disable';
}

export interface HazardDestroyEffect {
  readonly kind: 'destroy';
}

export type HazardExternalEffect = Readonly<HazardDisableEffect> | Readonly<HazardDestroyEffect>;

export interface HazardReactionInstance {
  /** Null means disabled until another gameplay system explicitly changes or removes the hazard. */
  readonly disabledRemainingSeconds: number | null;
  readonly hazardIdentity: string;
  readonly state: Exclude<HazardGameplayState, 'active'>;
}

export interface HazardReactionState {
  readonly instances: ReadonlyArray<Readonly<HazardReactionInstance>>;
}

export interface HazardReactionPolicyCarrier {
  readonly reactionPolicy?: Readonly<HazardReactionPolicy>;
}

const REACTIONS = new Set<HazardExternalReaction>(['disable', 'destroy', 'immune']);

export const DEFAULT_HAZARD_REACTION_POLICY: Readonly<HazardReactionPolicy> = Object.freeze({
  disable: 'disable',
  destroy: 'destroy',
});

export const IMMUNE_HAZARD_REACTION_POLICY: Readonly<HazardReactionPolicy> = Object.freeze({
  disable: 'immune',
  destroy: 'immune',
});

const EMPTY_HAZARD_REACTION_STATE: Readonly<HazardReactionState> = Object.freeze({
  instances: Object.freeze([]),
});

const assertHazardIdentity = (hazardIdentity: string): void => {
  if (hazardIdentity.trim().length === 0) {
    throw new TypeError('Hazard reaction identity must not be empty.');
  }
};

const assertReaction = (reaction: HazardExternalReaction, name: string): void => {
  if (!REACTIONS.has(reaction)) {
    throw new TypeError(`${name} must be disable, destroy, or immune.`);
  }
};

const assertDisableDuration = (durationSeconds: number | undefined): void => {
  if (durationSeconds === undefined) {
    return;
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new RangeError('Hazard disable durationSeconds must be a positive finite number.');
  }
};

export const createHazardReactionPolicy = (
  definition: Readonly<HazardReactionPolicy>,
): Readonly<HazardReactionPolicy> => {
  assertReaction(definition.disable, 'Hazard disable reaction');
  assertReaction(definition.destroy, 'Hazard destroy reaction');
  return Object.freeze({ ...definition });
};

export const getHazardReactionPolicy = (
  hazard: Readonly<HazardReactionPolicyCarrier>,
): Readonly<HazardReactionPolicy> => hazard.reactionPolicy ?? DEFAULT_HAZARD_REACTION_POLICY;

export const resolveHazardExternalReaction = (
  policy: Readonly<HazardReactionPolicy>,
  effectKind: HazardExternalEffectKind,
): HazardExternalReaction => {
  if (effectKind !== 'disable' && effectKind !== 'destroy') {
    throw new TypeError('Unsupported hazard external effect kind.');
  }
  return policy[effectKind];
};

export const createHazardReactionState = (): Readonly<HazardReactionState> =>
  EMPTY_HAZARD_REACTION_STATE;

export const getHazardGameplayState = (
  state: Readonly<HazardReactionState>,
  hazardIdentity: string,
): HazardGameplayState => {
  assertHazardIdentity(hazardIdentity);
  return (
    state.instances.find((instance) => instance.hazardIdentity === hazardIdentity)?.state ?? 'active'
  );
};

const freezeInstance = (
  hazardIdentity: string,
  state: Exclude<HazardGameplayState, 'active'>,
  disabledRemainingSeconds: number | null,
): Readonly<HazardReactionInstance> =>
  Object.freeze({ disabledRemainingSeconds, hazardIdentity, state });

const replaceInstance = (
  state: Readonly<HazardReactionState>,
  instance: Readonly<HazardReactionInstance>,
): Readonly<HazardReactionState> => {
  const existingIndex = state.instances.findIndex(
    (candidate) => candidate.hazardIdentity === instance.hazardIdentity,
  );
  const instances = [...state.instances];
  if (existingIndex === -1) {
    instances.push(instance);
  } else {
    instances[existingIndex] = instance;
  }
  return Object.freeze({ instances: Object.freeze(instances) });
};

/**
 * Applies one already-authoritative gameplay effect to a logical hazard identity. The policy is
 * content data; this function owns only the shared state transition semantics. Destroyed is final.
 */
export const applyHazardExternalEffect = (
  state: Readonly<HazardReactionState>,
  hazardIdentity: string,
  effect: Readonly<HazardExternalEffect>,
  policy: Readonly<HazardReactionPolicy> = DEFAULT_HAZARD_REACTION_POLICY,
): Readonly<HazardReactionState> => {
  assertHazardIdentity(hazardIdentity);
  assertDisableDuration(effect.kind === 'disable' ? effect.durationSeconds : undefined);
  const existing = state.instances.find((instance) => instance.hazardIdentity === hazardIdentity);
  if (existing?.state === 'destroyed') {
    return state;
  }

  const reaction = resolveHazardExternalReaction(policy, effect.kind);
  if (reaction === 'immune') {
    return state;
  }
  if (reaction === 'destroy') {
    return replaceInstance(state, freezeInstance(hazardIdentity, 'destroyed', null));
  }

  const requestedDuration = effect.kind === 'disable' ? (effect.durationSeconds ?? null) : null;
  const disabledRemainingSeconds =
    existing?.state === 'disabled'
      ? existing.disabledRemainingSeconds === null || requestedDuration === null
        ? null
        : Math.max(existing.disabledRemainingSeconds, requestedDuration)
      : requestedDuration;

  if (
    existing?.state === 'disabled' &&
    existing.disabledRemainingSeconds === disabledRemainingSeconds
  ) {
    return state;
  }

  return replaceInstance(
    state,
    freezeInstance(hazardIdentity, 'disabled', disabledRemainingSeconds),
  );
};

/** Advances only temporary disable timers. Pass normalized simulation delta; wall clock is invalid. */
export const stepHazardReactionState = (
  state: Readonly<HazardReactionState>,
  elapsedSeconds: number,
): Readonly<HazardReactionState> => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Hazard reaction elapsedSeconds must be non-negative and finite.');
  }
  if (elapsedSeconds === 0 || state.instances.length === 0) {
    return state;
  }

  let changed = false;
  const instances: Array<Readonly<HazardReactionInstance>> = [];
  for (const instance of state.instances) {
    if (instance.state === 'destroyed' || instance.disabledRemainingSeconds === null) {
      instances.push(instance);
      continue;
    }

    const remaining = instance.disabledRemainingSeconds - elapsedSeconds;
    changed = true;
    if (remaining > 0) {
      instances.push(freezeInstance(instance.hazardIdentity, 'disabled', remaining));
    }
  }

  if (!changed) {
    return state;
  }
  if (instances.length === 0) {
    return EMPTY_HAZARD_REACTION_STATE;
  }
  return Object.freeze({ instances: Object.freeze(instances) });
};

/** Removes runtime state once its logical hazard is no longer retained by the gameplay stream. */
export const reconcileHazardReactionState = (
  state: Readonly<HazardReactionState>,
  retainedHazardIdentities: ReadonlySet<string>,
): Readonly<HazardReactionState> => {
  if (state.instances.length === 0) {
    return state;
  }
  const instances = state.instances.filter((instance) =>
    retainedHazardIdentities.has(instance.hazardIdentity),
  );
  if (instances.length === state.instances.length) {
    return state;
  }
  if (instances.length === 0) {
    return EMPTY_HAZARD_REACTION_STATE;
  }
  return Object.freeze({ instances: Object.freeze(instances) });
};

/** Shared collision gate: disabled and destroyed hazards never reach lethal/Graze authority. */
export const filterGameplayActiveHazards = <THazard>(
  state: Readonly<HazardReactionState>,
  hazards: ReadonlyArray<Readonly<THazard>>,
  getIdentity: (hazard: Readonly<THazard>) => string,
): ReadonlyArray<Readonly<THazard>> => {
  if (state.instances.length === 0 || hazards.length === 0) {
    return hazards;
  }

  const inactiveIdentities = new Set(state.instances.map((instance) => instance.hazardIdentity));
  const activeHazards = hazards.filter((hazard) => !inactiveIdentities.has(getIdentity(hazard)));
  return activeHazards.length === hazards.length ? hazards : Object.freeze(activeHazards);
};
