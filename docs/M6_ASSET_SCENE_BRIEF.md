# M6 asset and scene brief — Art Gate working plan

**Status:** Working brief for [Art Gate #487](https://github.com/bongohorse/monster-girl-delivery/issues/487). This plans a small playable comparison; it does not approve production art, a pixel grid, a palette, or an asset pipeline. Trial work can continue within the current request; final production decisions need a recorded Director decision.

## Goal and representative scene

Prove that separately made assets form one readable modern-fantasy Monster City run on a landscape phone. Use the existing Endless gameplay and the delivery route from [PR #490](https://github.com/bongohorse/monster-girl-delivery/pull/490). The first comparison uses one stable courier pose, one molten spike hazard, an ordinary coin, a parcel, the existing directional cue, and a small city sample. Show both an ordinary approach and an approaching delivery handoff with the **same exported assets**, rather than painting those elements into a single wide scene.

The first spike trial is integrated via [PR #492](https://github.com/bongohorse/monster-girl-delivery/pull/492), and the provisional courier concept poses via [PR #489](https://github.com/bongohorse/monster-girl-delivery/pull/489). These are playable comparison assets, not production-art approval. Keep later trials small enough to judge the requested change clearly. The Gallery and tilt artwork belong to a later decision and do not define gameplay pixel resolution.

## Composition contract

| Layer | Content in this trial | What it must communicate |
|---|---|---|
| Gameplay foreground | Courier, active hazards, warning graphics | Player and lethal shape remain recognizable at run speed. A hazard reads as dangerous without bloom, tiny details, or a matching background color. |
| Objectives | Coins, parcel, recipient zone, short-range GPS cue | Each has a different silhouette and meaning. The delivery cue keeps its current right-then-down behavior and the marked handoff remains generous. |
| City middle ground | A few contemporary facades with fantasy accents and restrained near-future details | A lived-in Monster City; modern planes, glass/metal or signage may help. This must not look mostly sandy, medieval, or neon cyberpunk. |
| Far background | Sky and sparse skyline | Depth and atmosphere with slow, subdued parallax. |
| Near framing | Limited facade/roof/ground fragments | Depth at the top and bottom, never a cover over the courier, hazard warnings, recipient zone, or intended flight corridor. |

The current layout places the courier about one quarter of the safe viewport width from the left and projects the logical arena from the safe bottom edge. These are **integration facts**, not a locked final art scale. Keep useful forward view on both phone and tablet. The logical player/hazard hitboxes, fairness rules, delivery coordinates, and one-button controls stay authoritative; asset bounds, glow, and parallax never redefine them. Check that an apparently safe gap is not visually deceptive and that coin paths do not suggest an unsafe route.

Treat color as a functional hierarchy before choosing a final palette: player and lethal warning contrast first, gold/value and navigation cues second, city material/light last. Do not rely on hue alone to distinguish lethal and collectible items. Keep outlines and accents stable against both bright sky and dark buildings. An exact palette, outline width, lighting style, and layer speeds require the combined phone comparison.

## Asset inventory and dependencies

| Unit | Smallest useful deliverable | Depends on |
|---|---|---|
| Spike trial — integrated | GPT Image variant A, retained source and reproducible transparent export; native editable pixel work remains unproven | Source/export notes and representative visual review |
| Courier trial | One adult compact/chibi courier, stable right-facing flight, visible cap/horns/hair/tail and parcel pack; two nearby display sizes | Real editable source method; spike/coin readability context |
| Objective trial | Coin, parcel, carried parcel indication, one recipient/marked handoff and cue treatment | Courier scale and existing delivery state |
| City trial | One seamless distant skyline and a few modular modern-fantasy facade/ground pieces | Current gameplay contrast/corridor framing and shared comparison context |
| M6 production continuation | Remaining hazard families, hit/crash and handoff effects, HUD/results, SFX and representative music | Art Gate visual method and hierarchy accepted together |

The optional rising/falling poses, detailed residents, extra districts, parcel variants, Gallery art, and a full animation set are outside these first trials. A hit/crash treatment will be chosen for the slice after the stable gameplay figure is established. This supersedes the older #487 comment that listed three flight poses as a starting requirement; the phone playtest found frequent switching distracting.

## Source-to-runtime handoff

Use the existing source/export and presentation route for each real trial. Retain the original and reproducible recipe, and record dimensions, transparency and intended anchor. A native editable pixel-art deliverable needs an actual native-grid source; a concept/export alone does not satisfy it. This specific production-source requirement does not prevent other authorized art or integration work.

Compare the actual runtime export at the intended size beside the gameplay elements it must coexist with. Keep logical hitboxes, timing, generation and delivery rules authoritative. A presentation trial does not justify a scene-wide filtering change. Select phone/large-viewport, alpha, sharpness, movement or runtime-cost checks according to the change and the claim being made; unavailable checks stay pending. Final pixel dimensions, atlas and automated workflow remain undecided until their relevant evidence exists.

The intended source stages remain owned by [MASTER_SPEC.md §15](../MASTER_SPEC.md#15-asset-production-principles) and [ARCHITECTURE.md §13](../ARCHITECTURE.md#13-assets). Use actual commands from [DEVELOPMENT.md §11](../DEVELOPMENT.md#11-asset-commands); do not wait for or invent an unimplemented pipeline. If the requested native pixel source cannot be produced, identify that precise limitation and complete a permitted comparison or handoff rather than substituting fake pixels.

## Current trial status — 2026-09-30

- **Spike:** [PR #492](https://github.com/bongohorse/monster-girl-delivery/pull/492) integrated GPT Image variant A. [Source/export notes](../assets/source/district-01/hazards/README.md) retain the original and Python/Pillow export recipe. This is generated artwork, not the originally proposed newly drawn editable pixel source. Final source method, sprite size/colors and phone acceptance remain open.
- **Courier:** [PR #489](https://github.com/bongohorse/monster-girl-delivery/pull/489) integrated provisional A/B/C concepts; steady A remains the visual baseline from the newer #487 brief. The concepts do not supply the requested native editable pixel source.
- **Sizing and placement:** [PR #520](https://github.com/bongohorse/monster-girl-delivery/pull/520) removed viewport-height-relative courier growth, aligned each pose's visible contours with existing player extents, and checked browser resize/floor/ceiling visibility. It also varied automatic spike heights deterministically while retaining static hazards, coin clearance, pacing and delivery protections. Explicit editor positions remain unchanged. These are validated browser/runtime fixes; they do not establish phone art acceptance.
- **Still pending:** genuine native production-source evidence, representative phone scale/sharpness/hierarchy review, a small environment/parallax comparison, final animation/source/export conventions and final Art Gate decision. #487 stays open.

For the next explicitly requested trial, inspect the current export beside courier/coins and relevant warning/delivery states. The spike must read as lethal without glow, stay distinct from collectibles, and represent its existing collision footprint fairly. Retain the actual source/export and compare the same bytes on the phone when judging production acceptance. Report useful results and remaining limitations in that trial's review artifact; no extra approval checkpoint is required to complete already authorized work.
