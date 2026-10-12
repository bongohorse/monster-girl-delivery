---
name: mgd-hazards
description: "Create or change MGD hazards: movement, spawn, collision, lifecycle or artwork affecting visual fairness. Leads individual hazard requests; encounter-wide rules use mgd-gameplay and standalone image preparation uses the asset workflow."
---

# MGD Hazards

Deliver the requested hazard change through the real game path. [AGENTS](../../../AGENTS.md) owns scope and permissions; an already authorized implementation proceeds through its focused PR. This skill supports the work without adding an approval stage.

## Start with the changed path

Identify the hazard, intended normal/Director entry point, expected behavior and what must remain unchanged. Read the assigned task, relevant [hazard/fairness rules](../../../MASTER_SPEC.md#8-hazards-and-fairness), [architecture](../../../ARCHITECTURE.md) sections and current implementation/tests. Choose ordinary reversible details from existing patterns; ask only when a missing product decision materially changes the result.

This skill leads a wall-bouncing ball or a Missile-image replacement. Use [mgd-gameplay](../mgd-gameplay/SKILL.md) for encounter-wide pacing/spawn rules, [mgd-asset-integration](../mgd-asset-integration/SKILL.md) for technical image/runtime work and [mgd-art](../mgd-art/SKILL.md) for image creation/restyling. Use supporting diagnosis, tests, design or review guidance when their actual triggers apply. Missing optional skills/tools are not a reason to stop supported work or build substitutes.

For image work, locate the actual supplied source and its existing integration under [ASSET_WORKFLOW](../../../docs/ASSET_WORKFLOW.md). A described but absent replacement blocks replacement, not inspection of retained wiring/geometry; do not fabricate substitute artwork or successful exports. Existing or supplied bitmaps stay raster: no automatic SVG conversion or vector recreation, including for Phaser integration. A medium change requires an explicit user request; technical crop, scale, padding, optimization and raster export remain allowed. Edit existing SVG/vector assets in their native medium.

Useful source entry points, as needed:

- Spawn/admission: [GeneratedHazardStream](../../../src/generation/GeneratedHazardStream.ts), [HazardPattern](../../../src/generation/HazardPattern.ts) and their callers in [Foundation](../../../src/game/scenes/Foundation.ts).
- Effective shape and consequence: the relevant `src/hazards/` resolver, [HazardCollision](../../../src/systems/HazardCollision.ts) and [PrototypeRunSimulation](../../../src/systems/PrototypeRunSimulation.ts).
- Presentation: the applicable `src/entities/` presentation and its scene wiring.

Verify current calls. A catalog entry or manual Director fixture does not prove automatic spawn reachability. Different hazards may have different shapes and phase models; Zapper's enclosing AABB is not its exact lethal shape.

## Implement and verify the delta

1. Trace the affected path from supported spawn/input through authoritative behavior and effective geometry to collision/consequence and presentation. Inspect retirement, restart and shared consumers where the change can affect them. For artwork-only work, confirm retained geometry/wiring without turning it into a complete simulation audit.
2. Implement through existing typed behavior, validation, scheduling and presentation seams. Keep movement/lifecycle with [TimeService and simulation ownership](../../../ARCHITECTURE.md#5-time-authority-and-simulation-step-policy), generated randomness with the existing seeded PRNG, and collision geometry with gameplay. A random initial height does not imply new motion. Preserve applicable hazard reactions and warning/lethal phases.
3. Keep generated content on generate → validate → spawn. Respect pacing, spacing, reachable corridors, recovery and protected delivery approaches. Retain explicitly authored/Editor positions unless their change is requested. Do not weaken hard fairness rules simply to admit a candidate.
4. Protect the changed behavior with focused regression evidence using [TEST_QUALITY](../../../docs/TEST_QUALITY.md#evidence-selection-matrix). Check an affected lethal contact and neighboring safe case through supported paths when collision/consequence changes. Select representative existing hazards only when they share a changed path. Add partition evidence for time/collision sensitivity and same-seed evidence for generation changes.
5. Compare visible danger with authoritative geometry at relevant gameplay sizes/phases when artwork, crop, pivot, scale or motion changes. Use the existing geometry display; do not enlarge a hitbox to compensate for an oversized sprite. Exercise live integration when needed, then run the [required code/config checks](../../../DEVELOPMENT.md#3-required-verification) and review the focused diff.

A visible sprite or isolated overlap helper is not sufficient evidence for a new integrated hazard. When behavior is unchanged, report the retained wiring you inspected rather than inventing unrelated edits/tests.

## Wall-bouncing ball

Use the existing playable corridor unless the request specifies another domain; clarify only a materially ambiguous arena. Obtain shape/radius, motion and lifetime from approved intent/current patterns. Reuse existing motion/boundary ownership before proposing a narrow extension.

Verify radius-aware center limits, reflection on each axis, corner/high-speed/repeated contacts and collision along the reflected path. Endpoint-only overlap or one clamp can miss lethal contact. Check resize if the domain changes with it; preserve pause/replay when relevant. Use simple independently expected trajectories and realistic supported inputs, not a new general physics layer by default.

## Examples and completion

- **Replace a Missile image:** inspect its actual presentation before assuming a loader; preserve target-lock/travel/collision and compare warning/active appearance at gameplay size. Choose checks for the actual loader/presentation delta, without retuning geometry or auditing every hazard.
- **Change shared hazard update:** identify actual callers, then test representative affected static/patrol, Missile and timed/rotating paths. Check relevant phase, consequence and identity/reset behavior; do not impose one lifecycle on all types.

Report the changed behavior, supported entry point, effective hitbox and collision/consequence status, relevant regression results and short playtest steps. Account for motion, cleanup/reset and visuals to the extent affected. Keep evidence in the existing PR; no extra report/template is required.

If an input, tool or check fails, report the cause and affected deliverable. Correct an identified in-scope cause and rerun the affected check; stop that path when the same unresolved cause repeats without new evidence, while continuing independent work. Separate inspected wiring and planned checks from executed gameplay, collision and visual results.

Finish authorized implementation and independent checks even when visual/device evidence is unavailable. Mark the specific unverified criterion and give replay steps; it limits that acceptance claim, not all implementation work. A disconnected collision path remains a real integration defect. Merge/release and any required Director acceptance follow existing authorization and task conditions, with no new approval chain from this skill.
