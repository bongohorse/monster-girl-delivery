---
name: mgd-gameplay
description: "Implement approved MGD flight, collectible, delivery, scoring or encounter/pacing changes, especially interactions across game systems. Individual hazard behavior uses mgd-hazards; presentation-only UI and performance investigation use their own guidance."
---

# MGD Gameplay and Encounters

Turn approved intent into observable behavior in the real game. [AGENTS](../../../AGENTS.md) owns scope and permissions; this skill adds no approval or handoff stage.

## Establish the focused delta

Read the assigned task, relevant rules in [MASTER_SPEC](../../../MASTER_SPEC.md), affected ownership in [ARCHITECTURE](../../../ARCHITECTURE.md) and existing source/tests. Consult the roadmap only when milestone scope matters. Describe a concrete before/after scenario and what remains unchanged; prototype tuning does not become a final product rule through implementation.

Choose routine reversible details autonomously. Ask only when an unresolved decision materially changes product behavior or architecture; continue independent work. A coin request does not implicitly authorize a new economy or scoring system.

This skill leads changes to rules or interactions across systems. Let [mgd-hazards](../mgd-hazards/SKILL.md) lead individual hazard behavior, [mgd-ui](../mgd-ui/SKILL.md) lead presentation-only interactions and [diagnosing-bugs](../diagnosing-bugs/SKILL.md) lead diagnosis/performance investigation. Add a supporting skill only to resolve a relevant need; missing optional skills are not implementation blockers.

## Trace, implement, validate

1. Follow the supported input/configuration → authoritative state/rule → event/consequence → presentation/result path. Identify affected shared consumers and reset boundaries. For encounters, include selection, admission, scheduling and actual live use; construction or a Director-only fixture does not prove automatic spawn reachability.
2. Reuse existing ownership and extension points. Keep input with InputService, time with TimeService, randomness with the seeded authority, and final values/consequences with gameplay. Wire the smallest complete change into the runtime; retire obsolete in-scope paths without adding parallel event, metric or physics systems.
3. Add focused behavior/regression evidence where it protects the change. Use [TEST_QUALITY](../../../docs/TEST_QUALITY.md#evidence-selection-matrix) to choose independently expected results and realistic supported inputs. A hand-counted reward or explicit state transition often suffices; tests copying production calculations do not establish the rule.
4. Check affected pause/restart/death/event-ordering/cleanup boundaries. Select partition evidence for time/collision sensitivity and fixed-seed replay for generation changes under the [simulation-step policy](../../../ARCHITECTURE.md#5-time-authority-and-simulation-step-policy). The current terminal endpoint remains schedule-relative; do not claim exact impact metrics beyond its contract.
5. Exercise relevant live integration, then complete [required code/config checks](../../../DEVELOPMENT.md#3-required-verification) and review the focused diff. Browser/device/performance evidence follows the changed behavior and TEST_QUALITY triggers; no blanket benchmark, full domain audit or separate acceptance report is added here.
6. Record an approved durable rule change in MASTER_SPEC with its actual decision state. Change technical ownership documentation only when that ownership changes. Report behavior, checks, limits and short playtest steps in the existing PR, then deliver according to current authorization.

## Current source entry points

Use only the rows relevant to the request, verifying current callers:

| Area | Starting points |
|---|---|
| Flight/input | `InputService`, [VerticalFlightSimulation](../../../src/systems/VerticalFlightSimulation.ts), [Foundation](../../../src/game/scenes/Foundation.ts) |
| Coins/results | [PrototypeCollectibles](../../../src/systems/PrototypeCollectibles.ts), [PrototypeRunSimulation](../../../src/systems/PrototypeRunSimulation.ts), [PrototypeRunResult](../../../src/systems/PrototypeRunResult.ts) |
| Deliveries | [ParcelDelivery](../../../src/systems/ParcelDelivery.ts), [FirstDeliveryRoute](../../../src/generation/FirstDeliveryRoute.ts), Foundation's route/presentation consumers |
| Encounter admission | [LiveEncounterPolicy](../../../src/generation/LiveEncounterPolicy.ts), [GeneratedHazardStream](../../../src/generation/GeneratedHazardStream.ts), [PatternValidator](../../../src/generation/PatternValidator.ts), [EncounterTransitionValidator](../../../src/generation/EncounterTransitionValidator.ts), [EncounterReadabilityBudget](../../../src/generation/EncounterReadabilityBudget.ts) |

## Encounter fairness

Keep generate → validate → spawn. For changed combinations, check applicable effective/swept geometry, reachable corridors, previous-encounter transitions, warning/lethal timing, pressure/readability budgets, recovery and protected delivery approaches. Inspect relevant defer/rejection behavior rather than loosening hard constraints to force admission. Keep authored positions intact unless their change is part of the request.

If current constraints cannot admit the intended combination, identify the concrete conflict. Continue compatible work; seek a decision only if materially different gameplay rules are needed. Seeded evidence must use the same initial state and simulation-time inputs, not merely matching frame numbers.

## Dry examples

- **Coin valuation:** distinguish pickup count/value, earned reward and score; current PrototypeRunResult score is distance-based. Follow changed values to final snapshot/display, checking single award and death ordering where affected. Use hand-counted results; do not add a records store to demonstrate the change.
- **Delivery flow:** express allowed state transitions, then follow pickup/carry/handoff or miss and the next route as relevant. Check completion/reward once and restart clearing route-local/carried state, retaining protected approach and run continuation.
- **Multi-hazard encounter:** trace shared timing/admission and individual effective shapes, then validate joint reachability/transition/readability and delivery protection. Test affected existing consumers and a representative seeded live run. A fair isolated pattern or attractive manual fixture does not prove a fair admitted sequence.

For missing input or a failed tool/check, identify the affected rule or evidence claim. Fix an identified in-scope cause and rerun the relevant check. If no supported correction is available, or the same cause persists without new evidence, stop that dependent path and continue independent work. Report source inspection and planned checks separately from executed gameplay, fairness, seed, collision or device evidence.

Complete authorized implementation and available checks even if a browser/device or subjective playtest is unavailable. State exactly which criterion remains unverified with replay instructions; automated results cannot establish feel or visual acceptance. Missing evidence limits its corresponding claim/action under the task's existing conditions, without creating an extra implementation gate. Completion means the requested behavior is integrated, relevant results/reset/fairness paths are accounted for, and actual checks and remaining limits are clear.
