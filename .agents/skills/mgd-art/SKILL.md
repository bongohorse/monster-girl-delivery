---
name: mgd-art
description: "Create or visually revise MGD characters, hazards, parcels, backgrounds, UI graphics, or animation/gallery variants using the project's reference statuses and art direction. Excludes technical integration of unchanged images and gameplay/hitbox changes."
---

# MGD Art

Use [AGENTS.md](../../../AGENTS.md) for authorization and [ART_DIRECTION.md](../../../docs/ART_DIRECTION.md) for visual constraints, reference status and asset-type profiles. Creating this skill does not authorize making artwork or completing the Art Gate.

## Inputs and routing

Determine the source image/editable original (if any), intended asset type and use, applicable reference IDs, target display size/context, requested outputs and allowed changes. Preserve any expressly requested identity, composition or source bytes. Inspect supplied images before choosing a tool.

A supplied image is not automatically permission to restyle it. If the request leaves unchanged integration versus visual revision ambiguous and the choice affects the outcome, ask that focused question; continue independent inspection. Follow an already explicit choice without reconfirmation.

Art leads visual creation/revision. For an unchanged image, technical export or runtime hookup, hand off to the asset workflow. For a request such as a beach volleyball bouncing off walls, hazard behavior leads; art contributes only if a visual change is requested. Consult the repository skill catalog at execution time: asset (#497), hazard (#498), gameplay (#499) and acceptance (#501) skills are planned by [#495](https://github.com/bongohorse/monster-girl-delivery/issues/495), not dependencies to invent here. Existing Phaser skills describe runtime APIs, not visual approval.

## Procedure

1. **Resolve the brief.** Read the relevant profile and reference register in Art Direction, then the current Issue/Director decision. Distinguish accepted references within their recorded scope from trial choices, drafts and rejected work. Inspect the actual referenced image, not only its prompt or description. If a reference is unavailable, report the missing input rather than substituting an unrelated image. Ask only for an unresolved decision that materially affects the requested result; an authorized experiment can proceed as a clearly labeled draft.
2. **Choose the medium and tool.** Use available raster image generation/editing for bitmap work; load `imagegen` when available and follow its tool instructions. Supply concrete reference images plus the reusable profile constraints. A repeated prompt alone does not establish consistency. Edit existing SVG/vector/code-native art with suitable existing tools when that is the appropriate medium. A native editable pixel sprite requires a real pixel-grid source; a soft illustration resized or traced into pixels is not that deliverable. If available tools cannot provide the requested source, document the gap and deliver only what the brief permits, with limitations.
3. **Create a bounded variant.** Keep originals and reference assets intact. Identify the new candidate separately; do not silently replace accepted references. Use current source conventions for the relevant asset; choose source dimensions, alpha, anchor, palette and export format from the request and verified integration needs. Coordinate technical decisions with the asset workflow described below, without locking project-wide sizes from one experiment.
4. **Compare at the intended size.** Inspect native pixels and the same candidate at actual display size in the relevant gameplay/UI/gallery context. Compare silhouette, palette, contours, shading, perspective and detail against the chosen references. Check the profile's readability priorities; for transparent output inspect edges over light and dark backgrounds for halos, baked backgrounds and lost details. For animation variants compare identity, anchor and apparent scale across poses. Report whether the evidence is a static preview, a live run or a real-device check. If context/device access is missing, explicitly leave that check pending; do not change runtime code merely to claim visual validation.
5. **Record and hand off.** Provide output/source locations, reference IDs, changes, dimensions/grid where applicable, format/alpha/anchor, performed comparisons and remaining limitations in the task's review artifact (normally the PR). Keep agent inspection separate from Director acceptance. Add lasting reusable references to Art Direction only when warranted; record Director acceptance with its decision/evidence link and exact scope. Hand off technical preparation/integration with this information. Collision, spawn, warning timing and game values remain with gameplay owners, never inferred from artwork or alpha bounds.

## Supplied JPG with background

Use the requested destination to decide treatment. Unchanged integration preserves the JPG and background. A standalone sprite/icon needing transparency may require authorized background removal and an alpha-capable output such as PNG; retain the original JPG, check silhouette and fringes, and record the edit. A background/gallery image may intentionally retain its background. If removal versus preservation is unspecified and materially changes the supplied art, ask before that edit. Never claim that a JPG carries alpha or that format conversion alone removes its background.

## Asset workflow boundary

[ARCHITECTURE.md §13](../../../ARCHITECTURE.md#13-assets) owns technical stages; [MASTER_SPEC.md §15](../../../MASTER_SPEC.md#15-asset-production-principles) owns product constraints; [DEVELOPMENT.md §11](../../../DEVELOPMENT.md#11-asset-commands) distinguishes planned commands from available ones. [#494](https://github.com/bongohorse/monster-girl-delivery/issues/494) owns the shared asset-workflow implementation. Read `docs/ASSET_WORKFLOW.md` if that task has since introduced it; otherwise use the issue and actual existing tools, report the gap and do not implement a pipeline under an art request.

## Completion

The requested art output or concrete tool/input blocker is reviewable; originals and scoped references remain recoverable; source, variant and reference identities are recorded; size/context/alpha checks have results or explicit pending status; and technical handoff and Director acceptance status are clear. Run only checks relevant to the changed files under [DEVELOPMENT.md](../../../DEVELOPMENT.md#3-required-verification) and [TEST_QUALITY.md](../../../docs/TEST_QUALITY.md). No agent inspection implies Art Gate completion.

## Request walkthroughs

These are routing/check examples, not evidence that images were made or accepted:

| Request | Expected handling |
|---|---|
| “Draw a new molten-spike hazard in the MGD style.” | Use H1 within the provisional gameplay profile, create a separate art candidate, compare with courier/coins at intended size, hand off without changing hitboxes. |
| “Revise this hazard; keep its silhouette but reduce the glow.” | Inspect the supplied source, preserve silhouette and original, revise only the permitted treatment and check lethality readability without glow. |
| “Make a parcel UI icon in the same style.” | Use the UI profile and explicit approved/trial reference scope; compare at HUD size. Do not treat a courier concept as approval of a full UI style. |
| “Integrate this JPG unchanged.” / “Cut out this JPG as a transparent hazard.” | Route the first to integration with its background; for the second preserve the JPG, remove the background and verify alpha-capable output/edges. An unspecified background treatment needs a focused decision. |
