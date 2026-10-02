---
name: mgd-art
description: "Create or visually revise MGD characters, hazards, parcels, backgrounds, UI graphics or animation/gallery variants using scoped art references. Technical integration of unchanged images and gameplay/hitbox changes belong to their existing owners."
---

# MGD Art

Use [ART_DIRECTION.md](../../../docs/ART_DIRECTION.md) for the relevant visual profile and reference status. [AGENTS.md](../../../AGENTS.md) owns authorization; an art request authorizes its routine creation and review work. Unresolved production art decisions do not prevent a requested trial or draft.

## Make the requested art

1. **Resolve only the relevant brief.** Read the current request/Issue and the applicable profile/reference in Art Direction. Inspect supplied/reference images and preserve expressly requested identity, composition and source bytes. Use existing decisions and reasonable reversible defaults; ask only when a missing choice materially changes the requested result. If an exact reference is unavailable, finish independent work and identify that limitation. A draft can use the available brief without inventing reference approval.
2. **Respect the source medium.** Keep created or supplied bitmap assets raster; change medium only on an explicit user request (see [Art Direction's media rule](../../../docs/ART_DIRECTION.md#technical-and-acceptance-boundary)). For bitmap generation/editing, use available image tools and their instructions (`imagegen` when available), with concrete reference images where available. Edit existing SVG/vector/code-native art in its current medium. A repeated prompt alone does not prove consistency. A requested native editable pixel sprite needs a real pixel-grid source; a resized soft illustration does not satisfy that deliverable. If the exact source cannot be made, provide a useful permitted comparison or handoff and state the remaining limitation.
3. **Create a bounded candidate.** Keep original sources and accepted references recoverable. Give a new variant its own identity and select dimensions, alpha, anchor and format from its actual use and existing integration conventions. One experiment does not lock project-wide asset sizes or style.
4. **Compare what matters.** Inspect the candidate at its intended display size against the relevant reference and context. Check silhouette, contrast and detail; inspect transparent edges for halos/background remnants, and native pixels when delivering pixel art. Animation variants also need stable identity, anchor and apparent scale. Use live-run or device evidence when the claim depends on it; label unavailable checks pending. Do not require every context/device comparison for a simple icon or draft.
5. **Deliver and continue in scope.** Provide source/output locations, relevant reference/variant identity, dimensions/alpha/anchor and meaningful comparison results in the existing review artifact, normally the PR. Technical integration uses [mgd-asset-integration](../mgd-asset-integration/SKILL.md) when requested; a combined art-and-integration request continues through that work without a new approval checkpoint. Collision, spawn and warning timing remain gameplay-owned. Record reusable Director-accepted references in Art Direction when an actual scoped decision exists; agent inspection alone is not acceptance.

On a missing input or tool/check failure, report the cause and affected deliverable. Correct an identified in-scope cause and repeat the affected check; if the same cause remains unresolved without new evidence, stop that path and report the blocker. Continue independent authorized work; creative iteration stays within the requested variant scope.

## Supplied images and JPG backgrounds

An unchanged integration request preserves the supplied image and background. A transparent sprite/cutout request authorizes the needed background removal and alpha-capable output such as PNG; retain the JPG and check edges. Format conversion alone does not remove a background, and JPG has no alpha. If the destination reasonably resolves the treatment, proceed; ask only if preservation versus removal materially changes an ambiguous request. A background/gallery image may intentionally keep its background.

For an unchanged image or technical export, use [mgd-asset-integration](../mgd-asset-integration/SKILL.md). Individual hazard behavior, such as “make this volleyball bounce off walls,” is led by [mgd-hazards](../mgd-hazards/SKILL.md); encounter-wide rules use [mgd-gameplay](../mgd-gameplay/SKILL.md). Art contributes only the visual work needed by the request. Load other skills only for their actual triggers, rather than treating them as a prerequisite chain.

## Completion

The requested candidate/revision is reviewable, originals are recoverable, and performed checks and any concrete limitations are clear. Verification follows [DEVELOPMENT.md](../../../DEVELOPMENT.md#3-required-verification); Art Gate approval remains a separate recorded Director decision.
