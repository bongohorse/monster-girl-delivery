# Pre-M5 player consequence ownership audit

Issue: [#184](https://github.com/bongohorse/monster-girl-delivery/issues/184) · Parent: [#179](https://github.com/bongohorse/monster-girl-delivery/issues/179)

Repository evidence: `d246e8bb142f90e880f89754dda29f54a739eed9` (unchanged production baseline)

Decision: **KEEP**

Keep `running | dead` and the existing centralized logical run-end authority. M5's results, Graze, and fail-state presentation do not require another gameplay phase, damage manager, HP, immunity, or revive framework. This consolidates the four prior audit checkpoints in #184; it does not approve the overall Pre-M5 exit gate or implement M5 consumers.

## Existing authority and evidence

The [#182 run-metric/event decision](PRE_M5_RUN_METRICS_EVENT_AUTHORITY_AUDIT.md), merged through [#196](https://github.com/bongohorse/monster-girl-delivery/pull/196), remains authoritative for reset, run end, counting, and final distance.

| Boundary | Current source and behavior |
| --- | --- |
| Contact detection | [`HazardCollision.ts`](../src/systems/HazardCollision.ts) answers continuous logical overlap using the flight trajectory, hazard geometry/motion, and applicable active interval. It does not decide score, presentation, or player consequence policy. |
| Hazard eligibility | [`TelegraphedHazardSimulation.ts`](../src/hazards/TelegraphedHazardSimulation.ts), `getCollisionHazardsForTelegraphedSimulation`, supplies persistent hazards and the true Active slice of timed/reactive hazards. Spawn metadata survives the adapter. |
| Consequence / run end | [`PrototypeRunSimulation.ts`](../src/systems/PrototypeRunSimulation.ts), `stepPrototypeRun`, maps any qualifying contact to one `running -> dead` transition and `enteredDead: true`. Already-dead calls return the same state with no repeated transition. |
| Runtime integration | [`Foundation.ts`](../src/game/scenes/Foundation.ts), `update`, supplies the normalized `TimeService` delta and commits the returned run state. Death releases input and updates feedback; subsequent dead updates skip run, stream, and telegraphed simulation. The death branch skips post-step stream advancement. |
| Fresh run | `createPrototypeRunState` recreates running phase, zero distance, and centered flight with zero velocity. `Foundation.restartRun` also recreates stream/telegraphed state and releases input. |

The contract is therefore already centralized:

```text
logical hazard geometry/lifecycle → contact predicate
    → run authority resolves lethal consequence
    → one enteredDead transition + returned dead state
    → future #198 result snapshot → #85 presentation
```

Hazards must not independently kill the player or award results; presentation must consume the resolved transition rather than cause it. No second event bus, clock, or metric accumulator is needed.

## Death source and richer hit result

Today the run result retains no selected hazard identity: the hazard input narrows to `LogicalHazard`, and `.some(...)` produces a boolean. [`PatternSpawnScheduler.ts`](../src/generation/PatternSpawnScheduler.ts) already provides `getLogicalHazardSpawnIdentity` from pattern ID, entry index, entry ID, and run distance. The collision adapter preserves this metadata, so a future source payload needs no new ID generator or RNG consumption.

**Keep the boolean collision contract now.** [#198](https://github.com/bongohorse/monster-girl-delivery/issues/198) requires distance/score results; [#85](https://github.com/bongohorse/monster-girl-delivery/issues/85) asks for cause feedback where practical. Neither requires a hazard-specific payload before this audit can conclude.

If cause-specific feedback needs one, capture a small immutable logical cause/source value in the same run-authority transition that emits `enteredDead`. #198 retains that value in its single final result; #85 reads it. Do not rescan sprites, rerun collision after death, or store a competing cause in UI/debug state. The numeric collision predicate should remain independent of UI strings and score.

An attribution implementation must explicitly choose and test its reporting policy. Replacing `.some` with `.find` selects the first matching array entry, **not necessarily the earliest physical impact**. Multiple hazards can intersect one simulation interval; the current API exposes no time of impact (TOI). Stable array order does not establish chronological attribution or cause equivalence across frame partitions. Chronological impact semantics require a deliberate collision-contract change and corresponding evidence, not an implicit consequence of adding a payload.

## Graze remains a separate skill outcome

[MASTER_SPEC §9](../MASTER_SPEC.md#9-graze) and [#90](https://github.com/bongohorse/monster-girl-delivery/issues/90) own Graze geometry and qualification. Their integration must preserve these boundaries:

- Core contact remains lethal; an outer-zone candidate cannot suppress it or reward the same lethal occurrence.
- Use the same logical trajectory and relevant hazard lifecycle/active interval when establishing a continuous near miss; an endpoint-only check cannot establish that behavior.
- Deduplicate in run-local logical state using the existing spawn occurrence identity where it fits #90's pass contract. Sprite lifetime and animation completion are not counting triggers.
- Commit qualified skill events before #198 freezes the result. Dead updates cannot append rewards; a fresh run resets consumption state.

#90 must explicitly decide and test how an earlier nonlethal candidate and later lethal contact within one enclosing step qualify, including different hazards. The boolean collision API does not supply their order. Neither awarding every candidate first nor discarding the whole death frame follows automatically from #182. Cross-partition event-count equivalence needs focused evidence. This audit selects no Graze dimensions, rewards, or new ordering policy.

## Future consequences without a framework today

| Concern | Decision / extension direction |
| --- | --- |
| Temporary modes (#87) | Resolve contact into mode loss/setback versus terminal death inside the logical run/consequence owner, before committing run end. Geometry/lifecycle still reports contact, so each hazard need not learn mode rules. Add only the state and mapping required by an approved concrete mode, not a registry or modifier stack now. |
| Immunity / HP (#96) | Absent today. Normal lethal contact terminates the run once; repeated dead updates do not process contact. No current mechanic justifies a cooldown, immunity timer, or health model. Any later timed mechanic must consume `TimeService`-derived simulation time. |
| Revive / continue | Absent today. A future feature must decide whether it continues the same run, how an already-finalized result is handled, and how input/hazard safety recovers. It must deliberately revise terminal semantics rather than flip phase behind #198's snapshot. Ordinary restart creates a fresh run. |
| VFX / crash / results stages | #85 may stage these in presentation while gameplay remains dead. They consume `enteredDead` and the future result, never determine whether contact or run end occurred. |

These are extension boundaries, not approval or implementation of future mechanics.

## Freeze and immutability limits

Per #182, final distance is `motion.distance` in the first returned dead state: the completed enclosing simulation-step endpoint, not exact TOI. It is deterministic for the same delta/input schedule, **not guaranteed equal across different frame partitions**. Results must not reconstruct another distance from visual impact. Any requirement for partition-invariant final distance belongs to a focused run/collision-contract change with representative frame-partition validation.

Dead simulation stepping preserves state, but the scene state is not a deeply immutable result object. `Foundation.handleResize` can replace/constrain `runState.flight` while dead; it does not advance distance or revive the run. #198 must capture an immutable result value once at run end, not retain the scene's mutable run state or reconstruct impact position after resize.

Distance freeze exists now. Score, collected totals, Graze totals, rewards, and the final result snapshot are not implemented here: their freeze remains an explicit #198/#90/#84 obligation. Post-death presentation must not mutate these values or RNG state. Existing tests cannot prove an unimplemented score system immutable.

## Reference comparison and provenance

The [#184 discussion](https://github.com/bongohorse/monster-girl-delivery/issues/184) records prior inspection of `bongohorse/apk/docs/collision-and-damage.md`; the merged [#182 audit](PRE_M5_RUN_METRICS_EVENT_AUTHORITY_AUDIT.md#reference-comparison) records accepted `apk#3` metric/event evidence. Those records describe separation of collision detection, central hurt/consequence handling, immunity/mode interactions, death/revive, and statistic side effects.

The relevant lesson is central consequence ownership, which MGD already has. Reference immunity, vehicles, revive, and special post-death counting are not MGD requirements. No proprietary code, values, or assets are copied.

On this completion pass, GitHub returned HTTP 404 for both the APK repository and the referenced document. The reference comparison therefore relies on the recorded prior evidence; it is not claimed as a fresh APK verification. Current MGD sources, tests, #184 discussion, #182, #85, #90, #197, and #198 were inspected directly at the baseline above. The KEEP conclusion is independently supported by that live call path and approved M5 scope.

## Validation

Documentation-only change; no production code or tests changed. Existing coverage inspected:

- [`PrototypeRunSimulation.test.ts`](../tests/systems/PrototypeRunSimulation.test.ts): one-shot death, dead-step no-op, generated/moving collision, coarse/fine crossing detection, clean reset.
- [`Foundation.test.ts`](../tests/game/scenes/Foundation.test.ts): scene death feedback once, held dead state, input release and fresh-input restart, resize behavior. These use a scene harness, not a manual browser playtest.

Local validation on 2026-09-12: `bun run ci:check` passed (133 files; existing informational Biome schema-version mismatch). The first attempt included temporary Graphify JSON and failed formatting; moving that generated, untracked analysis to `/tmp` restored the clean repository check without configuration changes. `bun run test -- tests/systems/PrototypeRunSimulation.test.ts tests/game/scenes/Foundation.test.ts` passed: 2 files, 18 tests. `git diff --check` passed. Typecheck, the full test suite, and build were not run locally because this is documentation-only; #184 explicitly permits that validation scope. No manual/device or game-feel claim is made. M5 implementation and the parent #179 exit decision remain separate work.
