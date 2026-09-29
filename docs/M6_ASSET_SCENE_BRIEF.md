# M6 asset and scene brief — Art Gate working plan

**Status:** Working brief for [Art Gate #487](https://github.com/bongohorse/monster-girl-delivery/issues/487). This plans a small playable comparison; it does not approve production art, a pixel grid, a palette, or an asset pipeline. The Game Director reviews each trial separately.

## Goal and representative scene

Prove that separately made assets form one readable modern-fantasy Monster City run on a landscape phone. Use the existing Endless gameplay and the delivery route from [PR #490](https://github.com/bongohorse/monster-girl-delivery/pull/490). The first comparison uses one stable courier pose, one molten spike hazard, an ordinary coin, a parcel, the existing directional cue, and a small city sample. Show both an ordinary approach and an approaching delivery handoff with the **same exported assets**, rather than painting those elements into a single wide scene.

The first asset trial is **only the spike hazard**. Other elements can remain as current placeholders while its silhouette and production method are judged. Later trials replace one element at a time. The Gallery and tilt artwork belong to a later decision and do not define gameplay pixel resolution.

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
| Spike style proof | One newly drawn dark molten sphere with bright eyes and orange spikes, transparent export and editable source | This brief and a real drawing/export method |
| Courier trial | One adult compact/chibi courier, stable right-facing flight, visible cap/horns/hair/tail and parcel pack; two nearby display sizes | Real editable source method; spike/coin readability context |
| Objective trial | Coin, parcel, carried parcel indication, one recipient/marked handoff and cue treatment | Courier scale and existing delivery state |
| City trial | One seamless distant skyline and a few modular modern-fantasy facade/ground pieces | Accepted gameplay contrast and corridor framing |
| M6 production continuation | Remaining hazard families, hit/crash and handoff effects, HUD/results, SFX and representative music | Art Gate visual method and hierarchy accepted together |

The optional rising/falling poses, detailed residents, extra districts, parcel variants, Gallery art, and a full animation set are outside these first trials. A hit/crash treatment will be chosen for the slice after the stable gameplay figure is established. This supersedes the older #487 comment that listed three flight poses as a starting requirement; the phone playtest found frequent switching distracting.

## Source-to-runtime handoff for every trial

1. Keep an editable original with real layers and native working dimensions. Record author/source, frame dimensions, intended anchor, transparency, and any animation frames. Concepts are references, not source images to enlarge or automatically trace.
2. Export an individual transparent runtime asset with clean edges and no baked sky, soft halo, blur, or glow. Keep a preview at **native 1:1 pixels** and use the exact same export for the in-game size comparisons.
3. Connect the asset to the existing presentation layer. Only drawing and placement change; logical hitboxes, timing, generation, and delivery rewards do not. Avoid a scene-wide filtering/pixel-art setting change until the visual trial shows it is needed.
4. Check the same scene on a representative landscape phone and a larger landscape viewport: silhouette, look-ahead, alpha edges, sharpness, UI safe area, overlap, and ordinary running motion. Record the source/export size and measured runtime cost before considering atlas packing or pipeline automation.

The intended stages from `MASTER_SPEC.md` remain `assets/raw` → `assets/source` → `assets/processed` → `public/assets`. Create the needed files/folders for a **real** asset when that trial begins; do not manufacture an empty pipeline now. Names should identify district, object, state and revision clearly. Final pixel dimensions, atlas layout, format choices, and automated tooling remain open until representative assets survive device review.

Chunky pixel art is the current direction to test, not a license to enlarge a soft illustration into fake pixels. If a genuine editable pixel source cannot be produced cleanly, compare one deliberately drawn alternative 2D treatment in the same run composition and let the Game Director choose the production method before scaling content.

## First execution unit: molten spike hazard

**Design:** a compact dark sphere with unmistakable orange spikes and bright eyes. Its outline should remain threatening when a glow is disabled. Draw it anew as a game asset, not as a crop from a scene concept. It is one hazard family, not a replacement for the current Zapper, Laser, or Missile systems.

**Deliver:** editable layered source, transparent native export, a short note with dimensions/anchor/colors, and an in-run comparison using the real export beside the courier placeholder and current coin. Include a static native-pixel crop and landscape-phone evidence. If the authored hazard has no warning phase, do not invent one solely for the sprite; check it alongside existing warning graphics for separation instead.

**Accept only when:** the outline and spikes read at actual gameplay size; it is distinguishable from a coin, parcel, and decorative city light; alpha is clean at 1:1; neither the image nor its placement hides/misstates the logical collision footprint; forward visibility and frame cost remain acceptable on the phone. An attractive concept image alone does not pass.

After this single unit, report the file/source, in-game view, phone evidence, tradeoffs, and any unresolved production-method issue. Then choose the courier trial or revise the method before drawing more assets. Do not bulk-produce a hazard set from an unverified example.
