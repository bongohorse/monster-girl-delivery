---
name: mgd-hazards
description: "Create or change MGD hazards, including movement, spawn, collision and hazard artwork changes that can affect visual fairness. Leads requests such as a wall-bouncing beach volleyball; pure image preparation and non-hazard gameplay changes use their own workflows."
---

# MGD Hazards

Use this skill to deliver a hazard through its actual lifecycle and interaction path. Creating the skill does not authorize implementing its examples. [AGENTS.md](../../../AGENTS.md) controls scope and permissions.

## Inputs and routing

Identify the requested hazard/variant, intended runtime entry point, existing behavior to retain, allowed gameplay/art changes and acceptance criteria. Describe the expected motion, lethal/safe phases, target/boundary domain, collision geometry, consequence, spawn eligibility and lifetime in observable terms. Resolve ordinary implementation choices from current patterns; ask the Director only about a materially missing product decision, such as what “walls” means when different domains change the encounter.

Hazards lead “turn this beach volleyball into a wall-bouncing hazard.” Art creation/restyling and technical image preparation contribute only where requested. Read `mgd-art` and `mgd-asset-integration` from the current catalog when available; their separate introductions are [PR #504](https://github.com/bongohorse/monster-girl-delivery/pull/504) and [PR #505](https://github.com/bongohorse/monster-girl-delivery/pull/505), not presumed merged dependencies. [#494](https://github.com/bongohorse/monster-girl-delivery/issues/494) owns the shared asset workflow; do not implement it under a hazard request. Non-hazard encounter/gameplay rules and acceptance remain with their owners; future skills #499/#501 are tracked by [#495](https://github.com/bongohorse/monster-girl-delivery/issues/495).

## Canonical contract and type-specific rules

Use the existing owners rather than creating a second registration or rules system:

| Decision | Canonical source / applicability |
|---|---|
| Hazard behavior, fairness, consequences and approved decision state | [MASTER_SPEC §8](../../../MASTER_SPEC.md#8-hazards-and-fairness), relevant Graze/core-loop rules and the assigned Issue. Prototype content/tuning does not become final through this skill. |
| Simulation-time, physics and collision ownership | [ARCHITECTURE §5](../../../ARCHITECTURE.md#5-time-authority-and-simulation-step-policy). Applies to every authoritative hazard path, including locally resolved boundary/collision sensitivity. |
| Logical domain, lifecycle and presentation separation | [ARCHITECTURE §8](../../../ARCHITECTURE.md#8-viewport-and-scaling) and [§9](../../../ARCHITECTURE.md#9-gameplay-vs-presentation). Use the applicable hazard's current contract, not one lifecycle for all types. |
| Seeded generation and fairness admission | [ARCHITECTURE §10](../../../ARCHITECTURE.md#10-randomness-and-procedural-generation), [MASTER_SPEC §10](../../../MASTER_SPEC.md#10-procedural-generation-seeds-difficulty-and-pacing). Applies to generated content; manual Director fixtures are a distinct entry point. |
| Evidence and ordinary checks | [TEST_QUALITY](../../../docs/TEST_QUALITY.md), [DEVELOPMENT §3](../../../DEVELOPMENT.md#3-required-verification). Select regression/device evidence by the claim and changed ownership path. |

Current source distinguishes static/patrol geometry, reactive target-lock/Missile, timed pulse/Laser and Zapper geometry with optional timing/rotation. Inspect [HazardArchetype](../../../src/hazards/HazardArchetype.ts) and the relevant lifecycle/resolvers before deciding which branch fits. A visual type, behavior kind, spawn identity and presentation route are different responsibilities; adding one does not automatically complete the others. Do not assume every hazard uses a rectangle as its final interaction shape or Warning → Lock → Active → Expired timing.

## Procedure

1. **Trace the real lifecycle and impact.** Start from the supported runtime/configuration entry point. Inspect creation/validation, catalog admission and scheduling, per-instance state and update, resolved geometry, lethal filtering, collision, damage/death consequence, warning presentation, retirement, restart and scene shutdown. The current generated path uses [HazardPattern](../../../src/generation/HazardPattern.ts), [GeneratedHazardStream](../../../src/generation/GeneratedHazardStream.ts), [Foundation](../../../src/game/scenes/Foundation.ts), the appropriate hazard simulations, [PrototypeRunSimulation](../../../src/systems/PrototypeRunSimulation.ts), [HazardCollision](../../../src/systems/HazardCollision.ts) and [GeneratedHazardPresentation](../../../src/entities/GeneratedHazardPresentation.ts). Verify current calls; a catalog entry or Director-only fixture does not prove AUTO reachability. Use `graphify` if relationships remain unclear, then verify conclusions in source/tests.
2. **Specify the focused change.** Turn the requested behavior into checkable expected outcomes, including geometry and consequence. List retained invariants and the shared consumers actually affected. Establish who advances motion/lifecycle and what state is keyed to a spawn versus recreated on restart. Preserve `TimeService` and the existing seeded PRNG contract; avoid a second clock, random source or physics authority. Use existing logical resolvers and appropriate JavaScript/Phaser capabilities under the architecture's reuse rules. Phaser physics is not currently the default hazard authority; adopting it requires reconciliation with the single-clock policy, not an automatic custom physics layer.
3. **Implement through public behavior seams when authorized.** Use `tdd` for deterministic changes and `diagnosing-bugs` for defects needing reproduction; use `codebase-design` only when an ownership/interface seam changes. Follow the current typed behavior/validation/scheduler paths, collision adapters and presentation selection. Confirm that the authored geometry survives into the effective collision input during the correct lethal interval. A visible sprite, exported image or isolated behavior helper is not an integrated hazard. Keep artwork/alpha/camera projection outside gameplay authority; preserve applicable external disable/destroy/immune reactions in [HazardReactionState](../../../src/hazards/HazardReactionState.ts).
4. **Verify consequence, not only overlap.** Stimulate supported spawn/input/configuration paths to establish a lethal contact and a neighboring safe case, including phase boundaries for timed hazards. Observe the existing run consequence through `stepPrototypeRun` and the scene's death/retry flow; do not introduce a health/damage system merely to satisfy the word “damage.” Check that god mode or a manual fixture is not masking the claimed normal-run result. Validate admitted spawns, effective hitbox/shape, collision routing and consequence together. If these are unchanged in an artwork-only request, confirm the retained wiring and report exactly what was inspected/tested rather than forcing unrelated gameplay edits.
5. **Protect the affected shared paths.** Select representative existing hazards that consume the changed path. Check despawn, identity reconciliation and restart/shutdown for stale state, warnings or presentations. Inspect pooling, timer and listener cleanup only where actually used; do not add these mechanisms just to check them. Confirm pause/resume/resize behavior when the change touches those paths. Existing continuous-collision, timing and reaction behavior must remain coherent for the consumers in scope.
6. **Compare the real visual danger.** At actual gameplay size and the relevant movement/rotation/warning states, compare visible danger with authoritative collision geometry. After artwork/crop/pivot/scale/flip changes, an unchanged hitbox still needs a plausible visible correspondence. If adjusting gameplay geometry is necessary, make that an explicit scoped gameplay change with corresponding fairness/collision evidence. Use existing Director geometry displays rather than an image-derived hitbox. Record live/static/device context and leave unavailable manual acceptance visibly pending.
7. **Review and hand off.** Apply `code-review` to the exact diff; report changed behavior, real integration path, targeted evidence and unresolved product/device acceptance. Follow DEVELOPMENT's baseline checks for code/config changes; use TEST_QUALITY to add partition, replay, browser or device evidence where triggered. A pure image-file change does not automatically require all gameplay suites or a performance campaign. Do not claim manually accepted feel or visual fairness from automated tests.

## Wall-bouncing ball request

Resolve the supported boundary domain first (logical flight corridor, screen-relative domain or another explicitly requested arena). Identify collision shape/radius, motion speed/direction, initial placement, lethal phases and lifetime from the request/current rules. Use existing boundary and movement ownership; visual radius and gameplay shape are separately justified. If existing resolvers cannot express the behavior, explain the narrow required extension without making a new general physics layer the default.

Check radius-aware center limits, reflection on each contacted axis, simultaneous corner contacts, high-speed multi-contact travel and repeated edge contact. A supported resize may change the domain: define/check that behavior without retargeting immutable accepted state accidentally. Preserve collision over the actual path through a reflection; checking only the endpoint or clamping once can miss danger. Use independent expected trajectories/contact cases and frame-partition evidence under ARCHITECTURE/TEST_QUALITY, with realistic validated input and bounded runtime work. Include pause and replay where applicable.

Completion of an authorized ball implementation needs admitted spawn, motion, geometry, lethal collision/consequence, retirement/restart and actual presentation evidence. A source JPG or texture export alone cannot satisfy it. No bounce implementation is performed while creating this skill.

## Evidence selection and examples

The named tests are navigation aids, not a mandatory suite for every request or claims of tests run here.

| Request / changed path | Focused evidence to choose |
|---|---|
| “Make this beach volleyball bounce off walls as a hazard.” | Boundary/reflection and continuous collision cases, effective shape and run consequence, admitted spawn/live wiring, retirement/restart; partition/replay and real visual checks when triggered. |
| “Replace the Missile image without changing behavior.” | Inspect the actual current Missile presentation (it may still use Graphics), so no texture loader is assumed. Preserve target-lock, launch/travel geometry and collision; compare the replacement at warning/active sizes and orientation. Asset/loader/presentation changes get their applicable checks; no geometry retuning or full hazard audit by default. Relevant seams include [Missile behavior](../../../src/hazards/PrototypeMissileHazard.ts), [presentation](../../../src/entities/PrototypeHazardPresentation.ts), [mid-frame collision tests](../../../tests/hazards/PrototypeMissileMidFrameCollision.test.ts) and [resize integration tests](../../../tests/game/scenes/FoundationMissileResize.test.ts). |
| “Change the common hazard update.” | Identify the actual affected callers; select static/patrol, Missile, timed pulse/Laser and timed/rotating Zapper regressions where they share the changed path. Include geometry/consequence, phase transitions and identity cleanup/restart; inspect reaction/Graze ordering if affected. [HazardCollision tests](../../../tests/systems/HazardCollision.test.ts), [SystemPartitionEvidence](../../../tests/systems/SystemPartitionEvidence.test.ts) and [FoundationRetryStateIsolation](../../../tests/game/scenes/FoundationRetryStateIsolation.test.ts) are existing starting points. |

## Completion gate

For each changed hazard, the review trail must account for:

- supported spawn/registration path and intended normal/Director availability;
- effective hitbox/shape and its collision adapter, lethal interval and retained/new damage or death consequence;
- motion/update/time/randomness ownership, lifetime, retirement and restart/shutdown;
- visual-danger correspondence and relevant shared-hazard regressions;
- checks actually performed, test/build identity, and pending manual/Director decisions.

For each item give concrete evidence or explain why the unchanged path was only inspected. Unavailable required evidence is an explicit blocker/pending criterion, not an implied success. Missing geometry or disconnected consequence cannot be hidden behind an asset handoff. Documentation-only skill creation ends with documentation/example review and its focused PR, without executing any of these future game changes.
