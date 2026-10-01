---
name: mgd-asset-integration
description: "Import or update MGD image sources, inspect exports, or connect images to game presentation. Use current tooling and separate candidate previews from runtime replacement; visual creation and new gameplay behavior retain their existing owners."
---

# MGD Asset Integration

Take the image to the requested candidate, inspection result or reachable game presentation. [AGENTS.md](../../../AGENTS.md) owns authorization; an integration request covers necessary in-scope source/export/loader/presentation work without another approval between steps.

## Choose the available route

Inspect source, recipe and real consumers. [DEVELOPMENT.md §11](../../../DEVELOPMENT.md#11-asset-commands) lists current commands; [ARCHITECTURE.md §13](../../../ARCHITECTURE.md#13-assets) owns technical stages. [ASSET_WORKFLOW.md](../../../docs/ASSET_WORKFLOW.md) owns processing, identity, isolation, locking and evidence; [#494](https://github.com/bongohorse/monster-girl-delivery/issues/494) tracks its remaining acceptance.

Choose by requested output and existing ownership:

- **Candidate or inspection:** read [Prepare and inspect](../../../docs/ASSET_WORKFLOW.md#prepare-and-inspect). Candidate commands leave runtime files and activation state unchanged, including when the existing recipe is already active. A pure inspection validates existing output without preparing it.
- **Managed integration:** read [Managed runtime build](../../../docs/ASSET_WORKFLOW.md#managed-runtime-build). Spike **and Missile** already use versioned recipes and generated registry URLs in [Preloader](../../../src/game/scenes/Preloader.ts); their [source/export notes](../../../assets/source/district-01/hazards/README.md) retain presentation and collision ownership.
- **Legacy integration:** for an unmanaged consumer, retain its supported source/export/public/loader conventions until its assigned migration. Inspect its actual exporter and dependencies; missing future interfaces do not block an authorized manual route. A failed managed check does not turn a managed asset into a legacy import.

## Prepare and integrate

1. **Resolve inputs from the task and existing consumers.** Identify source, technical ID, target use and candidate/inspection/integration intent. Reuse the ID and recipe for a replacement. A new managed static-image import needs source file, stable ID, provenance, profile, canvas and logical display size under [Recipe and source ownership](../../../docs/ASSET_WORKFLOW.md#recipe-and-source-ownership). Reuse supported existing values; report missing or invalid required inputs rather than inventing successful substitutes. Retain original bytes/history and distinguish source pixels, texture pixels, logical units and screen pixels.
2. **Prepare only when the task requires it.** `assets:prepare --id` uses the existing source/recipe and supports processing-option changes. Replacing its source requires `--update --file`; nullable changes such as `trimAlpha: null` use the versioned recipe, then prepare. Follow the existing CLI/profile rules rather than adding a builder. Preserve aspect ratio and source anchor through crop/scale/padding. Visual revision, including requested background removal, uses [mgd-art](../mgd-art/SKILL.md) with a traceable edited source; unchanged JPG integration retains its background.
3. **Check current identity and inspect the candidate.** Use [Identity, isolation and concurrent work](../../../docs/ASSET_WORKFLOW.md#identity-isolation-and-concurrent-work): `assets:validate --id` and `assets:preview --id` check current source, effective recipe, toolchain fingerprint and expected output hashes; they do not repair. Old HTML/report presence or matching old output hashes alone is insufficient after inputs change. Reprepare within an authorized preparation/update task, then recheck; a pure inspection reports the stale/failed result. Inspect relevant bounds, pivot, transparency and footprint at target size; label unavailable browser/size observations pending. Extra comparison views need a concrete risk.
4. **Wire only requested integration.** For managed assets, activate the intended recipe, build the complete active set with `assets:build`, verify with `assets:validate --runtime`, and connect its registry export to the real loader/presentation. For legacy assets, update the intended export and existing consumer path. Use implemented serialization; legacy writes must not race. Stop/restart a dev server before replacing changed managed output; an export does not prove live Phaser texture reload. Candidate-only work ends without runtime replacement.
5. **Verify the requested use.** For integration, trace source → export → URL/key/frame → reachable scene/presentation. Check actual loader success and a visible instance when tools permit, rather than claiming them from source inspection. For crop/scale/anchor changes compare relevant gameplay geometry and sizes/states, including resize/floor/ceiling when player sizing is affected. Artwork, alpha bounds and recipe metadata never redefine collision or gameplay.
6. **Report distinct evidence.** Record source/ID, recipe/exporter, current fingerprint and actual output paths. Separate technical export/validation, runtime freshness, static wiring, executed loader/visible-instance evidence and scoped visual/device acceptance. Relevant loader/presentation changes also invalidate prior in-game evidence even when image bytes match. Preserve accepted comparisons only when an actual acceptance requires durable evidence under the owning workflow; no parallel archive or acceptance from transient CI images.

On a missing input or failed check, report the command, cause and affected deliverable. Correct an identified in-scope cause and rerun the affected check; if the same cause remains unresolved without new evidence, stop that path and report the blocker. Continue independent authorized work. Use the workflow's existing lock/timeout/recovery bounds. Verify dependencies and fresh-checkout reproducibility when that claim matters; ignored output is not a substitute.

## Routing and removal

Image creation/revision uses [mgd-art](../mgd-art/SKILL.md). Individual hazard behavior, including a supplied image requested as a bouncing hazard, is led by [mgd-hazards](../mgd-hazards/SKILL.md); encounter-wide rules use [mgd-gameplay](../mgd-gameplay/SKILL.md). Support only the image work actually needed. An unchanged image needs no preparation merely because its gameplay behavior changes.

For an authorized removal, inspect actual consumers and update them with the runtime output/state. Age alone is not a reason to remove sources or assets. Retain still-needed content and accepted evidence; source deletion must be within the requested removal scope.

## Completion

An inspection finishes with a supported valid/stale/failure judgment; preparation finishes with a current reviewable candidate; integration finishes with real wiring and evidence separated as above. State failed or unavailable checks explicitly; these are not successful acceptance. Follow [DEVELOPMENT's required verification](../../../DEVELOPMENT.md#3-required-verification) for the actual diff and [TEST_QUALITY](../../../docs/TEST_QUALITY.md) only for triggered evidence. Routine processing within scope needs no further approval; a new creative/product decision remains with the Director.
