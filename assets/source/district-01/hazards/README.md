# Molten spike — M6 hazard art trial

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
