# Molten spike — M6 hazard art trial

The Game Director selected **variant A** for an in-run test. This is approval of
the trial direction, not approval of the final sprite or the full M6 art style.

- `molten-spike-A-gpt-image.png` is the unmodified source artwork generated with
  the built-in GPT Image Generation tool. No SVG or hand-drawn reconstruction is
  part of this asset.
- `public/assets/m6/molten-spike-trial.png` is the 256 × 256 transparent runtime
  export. Run `python3 assets/source/district-01/hazards/export_molten_spike.py`
  from the repository root to reproduce it. Export needs Python and Pillow.
- The exporter crops the source at alpha > 24, uses nearest-neighbor sampling
  to fit inside 224 × 224, and centers the result on the transparent 256 × 256
  canvas. The game renders this centered image at 72 × 72 logical units over
  a 48 × 48 static collision box. Collision never reads the artwork.

The authored `m6-trial-molten-spike-upper` pattern retains a lower safe coin
route. Compare the spike with the courier, coins and hazards during an actual
landscape phone run before accepting its final size, colors or detail density.
