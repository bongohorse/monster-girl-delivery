# Hazard image sources — M6 trials

## Molten spike

The Game Director selected **variant A** for an in-run test. This is approval of
the trial direction, not approval of the final sprite or the full M6 art style.

- `molten-spike-A-gpt-image.png` is the unmodified source artwork generated with
  the built-in GPT Image Generation tool. No SVG or hand-drawn reconstruction is
  part of this asset.
- `assets/metadata/molten-spike-trial.json` is the active, versioned recipe.
  Run `bun run assets:prepare --id molten-spike-trial` to inspect an isolated
  candidate and `bun run assets:build` to regenerate the complete active runtime
  set. See [the shared workflow](../../../../docs/ASSET_WORKFLOW.md) for identity,
  preview and build rules. Supported game/test/build entrypoints prepare the
  runtime set automatically; generated files are ignored.
- The shared processor crops the source at alpha > 24, uses nearest-neighbor
  sampling to fit inside 224 × 224, and centers the result on the transparent
  256 × 256 canvas. Vite imports the generated runtime image through
  `src/generated/assets.ts`; `Preloader` retains the `molten-spike-trial` texture
  key. The game still renders the image at 72 × 72 logical units over a 48 × 48
  static collision box, with the existing horizontal flip. Collision never
  reads the artwork or recipe.

Sharp and the former Pillow export do not promise identical encoded bytes or
sampling pixels. The managed candidate retains the same canvas, crop threshold,
visible bounds, centering and logical presentation dimensions; compare its
actual appearance rather than treating encoder byte equality as art acceptance.

The authored `m6-trial-molten-spike-upper` pattern retains a lower safe coin
route. Compare the spike with the courier, coins and hazards during an actual
landscape phone run before accepting its final size, colors or detail density.


## Red monster Missile

`red-monster-missile-gpt-image.png` retains the exact Director-approved upload
from #493: transparent 1526 × 1031 PNG, facing left. The active recipe is
`assets/metadata/red-monster-missile.json`; use `assets:prepare --id red-monster-missile`
for an isolated comparison, or `assets:build` for the complete runtime set.

The shared processor trims only fully transparent margins (alpha > 0), crops
`(14,56,1512,975)` and fits without stretching into a transparent 512 × 330 canvas
using Lanczos3. It does not mirror the image. `Preloader` imports the generated
URL under the existing `red-monster-missile` key. The former manually maintained
`public/assets/m6/red-monster-missile.png` is removed.

The owning presentation retains its existing 112 × 60 display over a 64 × 48
logical collision box: 1.75× width and 1.25× height. These authored game display
factors intentionally differ from the texture ratio; the candidate warning
reports that existing relationship rather than changing the trial's geometry.
Canvas origin remains centered. The recipe's transformed source pivot is a
processing diagnostic, not a new game anchor. Warning/Lock graphics remain
unchanged; only Active shows the image, flipped for launches from the left.

The managed export and previous export have small Lanczos/alpha differences,
with the same direction, target footprint and transparent composition. Browser
comparison and in-run loading do not substitute for final art/device acceptance;
phone/Pad-6 motion and danger-readability remain part of the pilot evidence.
