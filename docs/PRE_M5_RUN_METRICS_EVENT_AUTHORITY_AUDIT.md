# Pre-M5 run metrics and gameplay-event authority audit

Issue: #182  
Specialist: Gameplay Engineer (`gameplay-core`)  
Repository baseline: `main` at `acfeae558edd403674739a5da6fce04dc00ddfb0`

## Decision

**DEFER** adding a new run-stat/event implementation.

The current runtime already has a coherent authoritative run boundary: `PrototypeRunState.motion.distance` is the logical run-distance store, `createPrototypeRunState(...)` defines the new-run reset, and `stepPrototypeRun(...)` produces a one-shot `enteredDead` transition before holding the resulting `dead` state unchanged. That is sufficient to define the semantic boundary that later M5 consumers must use without introducing a generic accumulator or event bus now.

Several requested concepts do not exist yet (collectibles, Graze, score distinct from distance, results, Gear/mode consequence rules). Their exact counting semantics would be product or feature decisions owned by their future issues. This audit therefore defines deterministic integration rules and explicit deferred boundaries rather than inventing counters with no current producer or consumer.

## Current authority

### Run lifecycle

`createPrototypeRunState(flightBounds)` creates the authoritative fresh-run state:

- `phase: 'running'`;
- `motion.distance: 0`;
- centered constrained flight state with zero vertical velocity.

`stepPrototypeRun(...)` is the current run-state transition authority. While `running`, one normalized simulation step advances run motion and flight and evaluates logical continuous collision. When collision is detected, that completed step is returned with `phase: 'dead'` and `enteredDead: true`.

A subsequent call with an already-dead state returns the same state object and `enteredDead: false`; motion and flight do not advance. Therefore the existing runtime already has an idempotent one-shot run-end boundary.

### Important death-distance rule

The current collision API deliberately exposes **no time-of-impact value** to `PrototypeRunSimulation`. The run contract keeps the completed enclosing simulation-step state when collision is found. Therefore, until an approved issue changes that contract:

> final authoritative run distance is the `motion.distance` stored in the first returned `dead` state, not an inferred presentation impact position and not a reconstructed time-of-impact distance.

That value is authoritative for the current run contract, but it is **not frame-partition invariant**. Because run motion advances to the end of the enclosing simulation delta before the swept collision result marks the state dead, two different valid delta partitions may detect the same collision while retaining different final endpoint distances. The current contract is deterministic only for the same explicit simulation-delta/input schedule.

This is a description of current MGD behavior, not a claim that endpoint distance is the eventual production scoring rule. If M5 results or scoring require partition-invariant final distance or exact impact distance, that must be decided and implemented by a focused run/collision-contract change rather than reconstructed downstream.

## Metric / event matrix

| metric/event | authoritative trigger | owner | lifetime | reset / stop rule | consumers / status |
| --- | --- | --- | --- | --- | --- |
| logical run distance | each authoritative `stepRunMotion(...)` inside a `running` `stepPrototypeRun(...)` step | `PrototypeRunState.motion` / `RunMotionSimulation` | per-run | starts at `0`; freezes with the first `dead` state; fresh run recreates `0` | existing gameplay, generation/difficulty consumers; **KEEP** |
| run start | creation/replacement with `createPrototypeRunState(...)` | run orchestration + `PrototypeRunSimulation` factory | per-run event boundary | exactly once per explicitly created run state | restart flow, future contracts/results; **KEEP boundary** |
| authoritative run end / death | first `running -> dead` transition returned by `stepPrototypeRun(...)`; observable as `enteredDead === true` | `PrototypeRunSimulation` | per-run event boundary | one-shot; dead state cannot re-enter death or advance | #184 consequence audit, future #85 results flow; **KEEP boundary** |
| final distance at death | `motion.distance` in the first returned `dead` state | `PrototypeRunState.motion` | per-run final value | immutable while dead; reset by fresh run; current endpoint value may differ across valid frame partitions because TOI is not retained | future results/diagnostics; **KEEP current contract, DEFER partition-invariant impact distance** |
| death cause / hazard identity | no authoritative payload exists today | not yet owned | deferred | must be produced at the same one-shot run-end boundary if later required; never derive from sprite/UI state | #184 owns the smallest consequence/cause contract; **DEFER to #184** |
| final result snapshot | no dedicated snapshot exists today | not yet owned | deferred | future snapshot must be captured once from authoritative run state at run end and remain immutable after death | future #85 results flow; **DEFER implementation** |
| hazard passed | no current gameplay counter/event | not yet owned | deferred | must not use Phaser despawn as authority; future feature must define one stable logical crossing/encounter boundary and dedupe by logical occurrence | contracts/achievements if approved; **DEFER human/feature decision** |
| close call / Graze | not implemented | future #90 | deferred | future rule must be idempotent per explicitly defined logical occurrence and separate from lethal collision | #90 and later consumers; **DEFER** |
| collectible collected | collectibles are not yet an MGD gameplay authority | future collectible system | deferred | collection must occur on successful logical collection resolution, never spawn or pickup animation; one logical collectible occurrence may count at most once | future #84/contracts/achievements; **DEFER implementation, KEEP boundary principle** |
| collectible route completed | route system not implemented | future #84 | deferred | route completion must derive from authoritative route state after qualifying collection events, never HUD/presentation state | #84 and consumers; **DEFER** |
| score distinct from distance | no approved distinct score authority exists | not yet owned | deferred human/product decision | do not create or persist a second score value until its formula/meaning is approved | #85/results and later progression; **DEFER human decision** |
| persistent/lifetime statistics | no persistence/statistics authority is part of this issue | future persistence/progression boundary | persistent, future | may consume authoritative semantic events but must not own run gameplay truth | achievements/profile systems; **reject in this issue** |
| restart / new-run boundary | explicit replacement with `createPrototypeRunState(...)` | scene/run orchestration | per-run reset | creates a new state instead of mutating/reviving the dead one | existing restart behavior; **KEEP** |
| temporary mode / Gear qualification | no current mode/Gear contract | future #87/#156 | deferred | a mode/Gear must explicitly map its consequence into ordinary semantic events or keep mode-local state; UI cannot silently redefine qualification | future #87/#156; **DEFER** |

## Required semantic boundaries for future producers

These rules are architecture constraints for future implementation, not new gameplay features.

1. **Gameplay event producers sit on logical authority boundaries.** Phaser object destruction, animation completion, HUD updates, sound/VFX, and physical backing-buffer state are never counting triggers.
2. **One logical occurrence counts once.** A future hazard/collectible/Graze producer must carry or derive a stable logical occurrence identity or state transition so repeated render/simulation frames cannot increment the same event repeatedly.
3. **Run-end is the freeze boundary.** The first `enteredDead` transition is the only current ordinary-run terminal transition. Per-run metrics intended for results freeze from the returned dead state. Post-death presentation may read them but must not mutate them.
4. **Restart creates a new run.** Reset semantics come from `createPrototypeRunState(...)`; future per-run accumulators should be created alongside the new run rather than globally cleared from presentation code.
5. **Persistent state is downstream.** Future profile statistics, achievements, contracts, or save data may consume semantic gameplay events but must not become the authority for whether the gameplay occurrence happened.
6. **Modes/Gear require explicit mapping.** If a future mode neutralizes, replaces, or remaps ordinary hazards/collections, the mode must explicitly decide whether an ordinary semantic event is emitted. No implicit inheritance from UI labels or presentation behavior.
7. **Time authority remains unchanged.** Event qualification based on elapsed gameplay must consume normalized `TimeService`-derived simulation state or existing logical distance; no wall-clock timestamps or second gameplay timer are introduced.

## Boundary decisions requested by #182

### Hazard passed

**Deferred.** MGD currently has no approved pass counter and no current consumer that requires choosing between trailing-edge crossing, despawn, or pattern completion. Choosing one now would define future objective/balance behavior without evidence. When needed, the owning feature must choose one logical boundary and protect it with a once-per-occurrence test. Phaser despawn is explicitly rejected as authority.

### Graze

**Deferred to #90.** The architecture requirement is only that Graze remain a separate non-lethal logical event and be deduplicated at the semantic occurrence chosen by #90. This audit does not decide once-per-hazard versus once-per-contact-window because that materially defines gameplay/reward behavior.

### Collectible collection

**Boundary principle retained from reference evidence:** count only successful logical collection, never spawn or presentation pickup animation. MGD has no current collectible implementation, so the exact owner/type is deferred to the collectible system. Spawn/discovery statistics and successful collection must remain separate concepts.

### Death distance and post-death state

Current MGD behavior is explicit: collision may be detected continuously within a step, but `PrototypeRunSimulation` preserves the completed enclosing step and does not expose TOI. The first dead state's distance is therefore the current final run distance. Dead-state steps are no-ops, preventing post-death simulation from changing it.

This endpoint-retention behavior does **not** make death distance equivalent across frame partitions. A coarse and a fine delta schedule can both detect the same swept collision but retain different end-of-step distances. Current final distance is therefore deterministic for an identical simulation-delta schedule, not a partition-invariant impact metric.

No presentation-side code is permitted to append distance/score after that transition. If future M5 results or an approved scoring design require exact impact distance or partition-invariant final distance, that requires a focused change to the run/collision contract and dedicated frame-partition validation rather than a results-layer reconstruction.

### Death cause / hazard identity

**Deferred to #184**, but the ownership boundary is fixed: any future cause/identity value must be produced as part of the same authoritative consequence/run-end transition that creates `enteredDead`; it must not be inferred later from whichever Phaser object happened to be visible. #184 may decide the smallest typed result required by current results/diagnostic needs without creating a second run-event authority.

### Final result snapshot

No snapshot object is needed before #85 has actual result fields to consume. When introduced, it should be an immutable value captured exactly once from authoritative run state at the run-end transition. It should not become a second live accumulator.

### Score distinct from distance

**Deferred human/product decision.** No approved formula or distinct current authority exists. Distance remains distance; this audit does not invent a score alias, multiplier, reward formula, or economy coupling.

## Per-run versus persistent separation

The recovered reference demonstrates a useful structural separation: active-run values and persistent/named statistics are different authorities. MGD should preserve that principle without copying the reference implementation.

For MGD:

```text
authoritative gameplay/run state
    -> logical distance
    -> future run-local collected/skill/result inputs
    -> one-shot semantic transitions

future persistent/profile systems
    <- consume approved semantic events/results
    <- never determine whether the gameplay event happened
```

This issue therefore rejects adding persistence, analytics, telemetry, a generic mission bus, or an achievement/statistics manager.

## Reference comparison

| recovered reference idea | MGD disposition | reason |
| --- | --- | --- |
| separate active-run counters from persistent named statistics | **KEEP conceptually** | prevents profile/persistence from becoming gameplay authority |
| collection counts on successful logical collection rather than spawn | **KEEP conceptually** | deterministic semantic boundary; avoids presentation/spawn counting |
| central lethal transition carries cause information | **KEEP conceptually / defer implementation to #184** | MGD needs one consequence boundary, not reference-specific damage/state complexity |
| mission/objective progress consumes semantic gameplay events | **KEEP conceptually for future consumers** | contracts/achievements should consume authoritative events rather than UI state |
| pickup-specific post-death collectability | **reject as a current MGD rule** | MGD currently freezes ordinary run gameplay on death; no approved collectible exception exists |
| revive/vehicle counters and special-mode policy | **defer** | those mechanics are not current MGD scope |
| generic score distinct from distance | **defer** | reference evidence did not establish one and MGD has no approved formula |
| exact Jetpack counter names, mission events, values or persistence design | **reject-for-MGD** | reference implementation is evidence, not product specification |

## Determinism and replay implications

The current run-start/run-end contract is deterministic for the same explicit initial state, **simulation delta/input schedule**, tuning, hazards, and seeded generation state. That qualifier is material: the existing endpoint-retention death-distance value is not guaranteed equivalent across different 30/60/90/120/144 Hz or jitter partitions because collision TOI is not retained in `PrototypeRunState`. This audit adds no PRNG consumption and no timing path.

Future event/counter producers must preserve schedule-relative determinism and, when their acceptance criteria require cross-partition equivalence, prove that property explicitly:

- do not depend on render FPS, wall clock, animation frames, or Phaser lifetime;
- do not consume extra gameplay PRNG merely to identify an event;
- define once-only state transitions so different valid frame partitions cannot multiply semantic counts;
- zero-delta and paused simulation must not create progress events;
- post-death simulation must not mutate frozen per-run metrics.

For final distance specifically, existing collision detection can be partition-safe while the retained endpoint distance still differs between partitions. If M5 results/scoring require a partition-invariant final-distance value, that is a deferred focused run/collision-contract decision requiring appropriate 30/60/90/120/144 Hz and jitter evidence. It must not be synthesized by presentation or results code.

A future implementation that changes any timing/movement/collision/event-producing authority must add the applicable frame-partition evidence; this documentation-only audit does not alter those authorities.

## Consequence for #184

#184 should consume exactly this boundary:

```text
logical collision/consequence resolution
    -> first running -> dead transition
    -> optional smallest typed cause/identity payload if #184 proves it is needed
    -> immutable dead run state / future result snapshot
```

#184 should not create a parallel metric accumulator, event bus, score store, or presentation-derived death source.

## Validation

This change is documentation-only. It was derived from current `main` at `acfeae558edd403674739a5da6fce04dc00ddfb0`, including:

- `src/systems/PrototypeRunSimulation.ts`;
- `tests/systems/PrototypeRunSimulation.test.ts`;
- `ARCHITECTURE.md`;
- the accepted `bongohorse/apk#3` evidence and `docs/run-stats-and-events.md`.

The existing tests already verify the material current contract used by this audit: one running-to-dead transition, no repeated death transition or dead-state advancement, continuous collision detection, and deterministic clean restart. Existing partition tests establish collision detection across partitions; they do not establish equal final death distance, which is now documented explicitly. No production code or tests were changed.

GitHub Actions CI on this PR is the execution authority for repository documentation checks.
