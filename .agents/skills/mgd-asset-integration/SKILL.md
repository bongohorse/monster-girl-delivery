---
name: mgd-asset-integration
description: "Import or update MGD image sources, inspect exports, or connect images to game presentation. Use current tooling and separate candidate previews from runtime replacement; visual creation and new gameplay behavior retain their existing owners."
---

# MGD Asset Integration

Take the requested image from source to the requested preview or reachable game presentation. [AGENTS.md](../../../AGENTS.md) owns authorization: a request to integrate an asset authorizes the necessary in-scope source/export/loader/presentation work, including a supported manual route. Missing future pipeline tooling is a limitation, not a reason to stop routine integration.

## Choose the available route

Inspect the relevant source/export notes, current commands and loader/presentation consumers. [DEVELOPMENT.md §11](../../../DEVELOPMENT.md#11-asset-commands) identifies available versus planned commands; [ARCHITECTURE.md §13](../../../ARCHITECTURE.md#13-assets) owns the technical stages.

If `docs/ASSET_WORKFLOW.md` exists, use its current commands and identity, candidate/runtime, concurrency and evidence rules. [#494](https://github.com/bongohorse/monster-girl-delivery/issues/494) owns that shared workflow's implementation; this skill does not introduce a competing builder, registry, schema or locking system. Its unimplemented interfaces are not prerequisites.

The existing spike route is in [source/export notes](../../../assets/source/district-01/hazards/README.md). Its Python/Pillow exporter writes directly into `public/assets/m6/`; for an export-only preview, run it in an isolated checkout or temporary copy with the required source, not the active checkout. Its crop, dimensions and sampling are specific to that asset. [Preloader](../../../src/game/scenes/Preloader.ts) loads `molten-spike-trial`; [MoltenSpikePresentation](../../../src/entities/MoltenSpikePresentation.ts) displays it. Other imports can use the existing source/public/loader/presentation conventions without first implementing #494.

## Prepare and integrate

1. **Resolve the minimum inputs.** Identify source, target use and preview versus integration intent. Reuse an existing technical ID for replacements; choose a clear stable ID for a new manual import. A human filename is not automatically the import key. Retain original bytes/history and record known provenance. Derive crop, sampling, dimensions and anchor from the actual presentation; distinguish source pixels, texture pixels, logical units and screen pixels.
2. **Prepare the requested output.** Use the current reproducible recipe/exporter or supported manual route. Preserve aspect ratio and the source anchor through crop/scale/padding. For new processing, keep only the reproducible recipe needed by this asset rather than constructing a shared pipeline. Visual changes use [mgd-art](../mgd-art/SKILL.md). JPG has no alpha; unchanged integration keeps its background, while a requested transparent sprite permits background removal with an alpha-capable export.
3. **Inspect the current candidate.** Compare at target size, checking relevant visible bounds, pivot, transparency and visual footprint. Re-export after source or recipe changes; an old preview does not validate a new asset. Keep source/recipe/export identity traceable through Git and use the implemented fingerprint/report when available. Additional enlarged, alpha-background or motion views are useful when they resolve an actual risk, not a fixed checklist for every import.
4. **Apply only the requested runtime change.** A candidate-only preview stays isolated from active files and consumers. For integration/replacement, use the managed activation/full-build route if available; otherwise update the intended runtime export and real loader/presentation path manually. Do not race writes to the same outputs; use implemented serialization or run legacy writes sequentially. A direct export does not imply live Phaser texture reload: restart/reload as needed and inspect the intended version.
5. **Verify real use and visual correspondence.** Trace source → export → URL/key/frame → reachable scene/presentation and inspect the built output. For integration, check loader success and a visible instance when browser access is available; label unavailable visual checks pending. For crop, scale or anchor changes, compare against existing gameplay geometry at relevant sizes/states, including resize and floor/ceiling when player sizing is affected. Artwork and alpha bounds never silently redefine collision. New bouncing, damage, pickup or other behavior needs its own real gameplay integration/evidence within the requested scope.
6. **Finish with useful evidence.** Record source/ID, recipe or exporter, output location, preview/manual/managed status, meaningful checks and concrete limitations in the PR. Preserve accepted reusable comparisons and their scoped decision/build links when an actual acceptance needs durable evidence; a transient CI image alone is not that record. Follow the owning workflow rather than creating a parallel evidence archive.

For fresh-checkout reproducibility, verify the actual dependency/export route without relying on ignored outputs when that claim matters. For parallel work or stale previews, address the conflicting write or changed input; these cases do not require inventing new automation.

## Routing and removal

A prepared-ball preview can complete without integration. A spike replacement reuses the existing identity and verifies presentation. A supplied volleyball requested as a bouncing hazard combines image integration with behavior work, without waiting for an unimplemented import API or inventing behavior from image metadata.

For an authorized removal, inspect actual consumers and update them with the runtime output/state. Age alone is not a reason to remove sources or assets. Retain still-needed content and accepted evidence; source deletion must be within the requested removal scope.

## Completion

A preview request has a reviewable candidate; an integration request has its real production wiring and appropriate evidence, with unavailable visual/device checks explicitly pending. Run [DEVELOPMENT.md's required checks](../../../DEVELOPMENT.md#3-required-verification) for code/config changes and select additional evidence under [TEST_QUALITY.md](../../../docs/TEST_QUALITY.md) only when its triggers apply. Concrete missing input/tooling blocks only the affected deliverable; continue the authorized independent work.
