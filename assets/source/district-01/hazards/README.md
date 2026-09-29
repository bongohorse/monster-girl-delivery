# Molten spike — one M6 art trial

- `molten-spike-trial.svg` is the editable, grouped vector source: spikes, shell, fissures, and face. It is an **alternative 2D treatment**, not native pixel art and not an accepted production style.
- `public/assets/m6/molten-spike-trial.png` is the transparent 256 × 256 runtime export. Re-export with `inkscape assets/source/district-01/hazards/molten-spike-trial.svg --export-filename=public/assets/m6/molten-spike-trial.png --export-width=256 --export-height=256`.
- Source anchor: (64, 64) in its 128 × 128 SVG viewBox; runtime image anchor: center. The trial renders at 72 × 72 logical units for a centered 48 × 48 static collision box. Visible spikes project outside the inner box; the collision rules do not read the image.
- Core colors: charcoal/indigo shell (`#181c2d`), orange lava (`#f67b30`), pale hot eyes (`#ffe187`), dark outline (`#171928`). These are trial colors only.
- No external glow, background, or baked shadow. Smooth antialiasing at the contour is intentional for this vector alternative; do not describe the output as a pixel sprite.

The authored trial pattern is `m6-trial-molten-spike-upper`, appended to the existing M5 AUTO catalog. It retains a lower safe coin route. Test in a normal landscape run beside the placeholder courier and ordinary coins, and compare legibility and apparent collision extent on a phone before accepting or scaling this style.
