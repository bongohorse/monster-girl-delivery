# Asset workflow

This document owns MGD's image preparation, candidate identity and managed runtime build contract. Product and Art Gate decisions remain in [MASTER_SPEC](../MASTER_SPEC.md) and [ART_DIRECTION](ART_DIRECTION.md). [#494](https://github.com/bongohorse/monster-girl-delivery/issues/494) owns live acceptance; its latest task plan and Gate B/C matrix distinguish implemented tooling from outstanding integration and visual/device evidence.

## Current scope

Static-image preparation and comparison previews remain isolated. Task 3 adds the complete active-set runtime build, generated registry and automatic entrypoint preparation; the Spike now exercises the real game loader.

| Stage | Status |
|---|---|
| Prepare / validate / preview | Implemented; commands below |
| Full runtime builder, generated registry, build entrypoints and Spike migration | Implemented; Spike uses the generated registry |
| Existing non-pixel Missile migration | Task 4; not implemented |
| CI triggers, preview artifacts, packaged loader and Android/device evidence | Task 5; not implemented |

Gate B/C remain partial. A valid candidate is neither runtime integration nor visual acceptance. The Spike uses managed output; the Missile still loads its legacy `public/assets` image until task 4. No audio, animation, atlas, gallery or new artwork is introduced.

## Prepare and inspect

Run from the repository root after `bun install --frozen-lockfile`. The committed Spike recipe makes this a single useful first run:

```bash
bun run assets:prepare --id molten-spike-trial
bun run assets:validate --id molten-spike-trial
bun run assets:preview --id molten-spike-trial
```

`prepare` processes and checks a candidate, then prints JSON including absolute `preview` (`index.html`) and `report` paths. Open the preview in a browser; it is self-contained and needs no game server. `validate` checks the current input fingerprint and every expected output's hash. `preview` performs the same checks and returns the existing preview; neither repairs stale output. Re-run `prepare` to repair missing/damaged outputs or build a changed recipe.

For a new ID, supply a static PNG, JPEG or WebP, provenance, profile, canvas and logical display size. For example, this is the equivalent initial Spike import if its recipe is absent:

```bash
bun run assets:prepare --id molten-spike-trial \
  --file assets/source/district-01/hazards/molten-spike-A-gpt-image.png \
  --profile static-png --width 256 --height 256 --padding 16 \
  --trim-alpha 24 --sampling nearest --display-width 72 --display-height 72 \
  --provenance 'GPT Image variant A; trial #492'
```

Replacing an existing source requires explicit ID and update intent:

```bash
bun run assets:prepare --id molten-spike-trial --update --file /path/to/replacement.png
```

Existing recipe values carry forward unless supplied. `prepare --id` can also change processing options for the same source. For changing a nullable field such as removing trimming, edit the versioned recipe (`trimAlpha: null`) and prepare again. `--help` lists CLI options. Candidate `validate` and `preview` accept only `--id`; whole-runtime validation uses `assets:validate --runtime`.

Routine processing within an authorized asset task needs no separate approval. A new creative/product decision still belongs to the Director. Provenance records known origin (or explicitly unresolved origin); it does not prove rights or art acceptance.

## Recipe and source ownership

Recipes live at `assets/metadata/<id>.json`; ID is stable, lowercase hyphen-separated words, at most 80 characters, and must match the filename. The parser rejects unknown fields/profiles and missing required values.

```json
{
  "schemaVersion": 1,
  "id": "molten-spike-trial",
  "source": "assets/source/district-01/hazards/molten-spike-A-gpt-image.png",
  "sourceHash": "<64 lowercase hexadecimal SHA-256 characters>",
  "provenance": "GPT Image variant A; trial #492",
  "state": "prepared",
  "profile": "static-png",
  "canvas": { "width": 256, "height": 256, "padding": 16,
    "sampling": "nearest", "trimAlpha": 24 },
  "pivot": { "x": 0.5, "y": 0.5 },
  "display": { "width": 72, "height": 72, "renderScale": 2 }
}
```

The example hash is a placeholder: `prepare` records the real source SHA-256. New imports from outside `assets/source` are archived unchanged as `assets/source/imported/<id>/<sha256>.<extension>`. An existing source inside that tree is reused without a duplicate archive. Import/build never edits source bytes; explicit updates retain previous content-addressed imports and Git history. If artwork preparation changes composition or removes a background, retain the original and use a separately traceable edited source.

Owned paths are relative, case-exact and cannot traverse symlinks or escape their area. A changed source hash is an error until an explicit `--update --file` records the new input. No silent source replacement or activation occurs.

`prepared` and `active` are the only recipe states. New imports are prepared; updates preserve the existing state. Candidate commands inspect either state. To integrate an authorized image, set its recipe to `active`, run the full build and import its named registry export in the owning loader. Deactivation removes that export at the next full build; remaining imports then fail typecheck/build and must be resolved in the same change. Candidate reports alone do not establish runtime freshness.

## Image processing and measurements

`static-png` decodes into oriented sRGB RGBA, optionally crops to pixels with alpha strictly greater than `trimAlpha`, fits the crop inside canvas padding without upscaling, preserves aspect ratio and centers it on a transparent canvas. Nearest sampling is an explicit pixel-style choice; `lanczos3` is the default for non-pixel downsampling. PNG encoding uses compression level 9. No redraw, background removal or mirroring is inferred.

`pass-through` retains original bytes and extension; it requires native dimensions/orientation with no trimming or padding. It is appropriate when an original already meets the intended use, not a workaround for a mismatched recipe.

The input limit is 64 MiB and 32 × 1024 × 1024 pixels; static single-frame PNG/JPEG/WebP only. Sharp decode/resize stages have a 15-second processing timeout. Canvas width/height are integers in 1..4096; padding must leave drawable space. These are processing safety limits, not approved production-art budgets. Logical display dimensions and render factor (1..2) describe the intended demand, not a camera or collision change.

`report.json` records source/output dimensions, encoded bytes, actual alpha distribution and visible bounds; source crop, actual content placement, rounded X/Y scale and transformed source pivot; recipe, toolchain and output hashes. The pivot starts in normalized original-source coordinates and is transformed through crop/scale/padding. It can lie outside the cropped subject; this is diagnostic, not an instruction to silently center the game object.

The preview shows an original-composition overview, candidate on checkerboard/black/white, logical target size and enlarged canvas. Cyan bounds mark visible alpha; pink marks the transformed source pivot. A full alpha channel with only opaque pixels is reported as opaque. RGBA8 estimates are width × height × 4, not measured GPU/device memory. Smaller encoded files do not by themselves reduce decoded texture memory.

Warnings flag opacity, canvas pixel demand below display × render factor, target/canvas aspect-ratio mismatch and active-runtime uncertainty. Game presentation must preserve proportions and use its existing anchor/geometry. Metadata never owns collision, spawn, motion, scoring, touch or hitboxes.

## Identity, isolation and concurrent work

The fingerprint hashes the effective recipe (including source hash) and actual toolchain context: builder code, `bun.lock`, Bun/Node version, platform/architecture and Sharp/native library versions. Each expected candidate file has its own SHA-256. Validation reads current sources and output bytes; the presence of a recorded fingerprint alone is insufficient.

Candidate output is staged and published under `reports/assets/previews/<id>/<fingerprint>/`: `runtime.<extension>`, `source-preview.png`, `index.html` and `report.json`. Source/recipe changes during processing are checked before publication; a failed/interrupted call is not a successful current candidate. Existing valid candidates can be reused only after identity/output verification. Candidate commands never write `assets/processed`, `src/generated/assets.ts`, active `public/assets` files or game loader state.

A static preview records its built identity and cannot detect later edits by itself. Validate/reprepare against current inputs before relying on it. Recipe, source or toolchain changes invalidate that candidate; relevant loader/presentation changes also invalidate prior in-game evidence even when image bytes match.

Candidate commands, full builds and runtime validation acquire one checkout-local writer lock around the complete operation, then re-read current state. The second caller waits up to 30 seconds and fails with an actionable lock path if it cannot proceed. Abort cancels waiting; an executing operation releases ownership after its work settles, never while Sharp is still running.

A confirmed dead owner PID on the same host can be recovered automatically only after any registered finite consumers have confirmed completion. Tool processes start only after their supervisor PID is registered, so killing the wrapper cannot expose their files to a new writer. If a consumer supervisor is itself killed before confirming completion, recovery stays conservative because a tool child may still be alive. A live PID, permission error, foreign host, incomplete owner or recovery guard is treated conservatively; age alone never proves abandonment. For an unknown lock, inspect `reports/assets/.write-lock/owner.json` and any recovery guard and confirm no writer is active before manual cleanup. This is failure recovery, not a routine permission gate. Remaining legacy exporters do not use this lock and must not race writes to their live files.

## Toolchain and evidence

Sharp 0.35.5 is a pinned development dependency. Candidate preparation has been exercised on Linux with Bun 1.4.2; Windows/native installation and device presentation remain pending pilot evidence. Matching input produces reproducible outputs within the recorded toolchain context; no cross-encoder, cross-platform or APK byte-identity promise follows.

A preview proves processing/identity, not subjective style, fair danger, touch behavior or device quality. Keep normal interim reports ignored. When an actual visual acceptance needs durable evidence, preserve a compact accepted comparison and, for integrated assets, representative in-game evidence under `docs/asset-evidence/<id>/<fingerprint>/`, with tested integration/build identity, device/render context, scoped decision and review link. Do not manufacture acceptance records for every candidate. Relevant changes require updated evidence; editorial changes alone do not.

## Managed runtime build

```bash
bun run assets:build
bun run assets:validate --runtime
```

The full builder reads the complete active recipe set, checks source identities and derives immutable output under ignored `assets/processed/mgd/<fingerprint>/`. `src/generated/assets.ts` contains named exports such as `ASSET_MOLTEN_SPIKE_TRIAL` with URL and canvas dimensions. Static Vite `?no-inline` imports own content hashes and base handling; there is no additional runtime URL manifest. Game loaders choose texture keys and presentation retains its own anchors and collision geometry.

All media are processed before the registry is atomically switched. Input drift, failed decoding or interruption leaves the previous published registry intact and reports failure. Validation verifies current inputs, toolchain, registry and every media hash. Repeated unchanged builds reuse verified output. Old-generation cleanup removes only recorded builder files; unknown files are retained. Prepared images, sources, previews and tooling are not imported into the game bundle.

`bun run dev`, `bun run typecheck`, `bun run test` and `bun run build` prepare required output from a fresh checkout. Direct Vite dev/build and direct Vitest runs also prepare through their configs. Finite consumers hold the shared lock through completion and verify afterwards; their child processes inherit verified ownership without a nested lock. Bare upstream `tsc` has no preparation hook: use the repository typecheck command. Tests with a different fixture root acquire their own lock.

A running dev server records its PID/host/token and permits candidate work and unchanged runtime verification. Changed or damaged runtime output requires stopping the server before rebuilding/restarting; textures are not silently hot-replaced. Confirmed dead local dev markers recover automatically. Foreign/unknown/live markers remain conservative, with actionable restart or inspection messages rather than another approval workflow.

The Spike preserves its existing 256 × 256 canvas, visible bounds, 72 × 72 logical display, horizontal flip and 48 × 48 collision box. The Sharp/Pillow comparison permits small sampling differences; matching encoded bytes are not the goal. Its existing approved trial direction is preserved; final art/device acceptance remains separate.

## Remaining pilot work

Task 4 migrates the existing non-pixel Missile through the same loader path without changing gameplay or direction semantics. Task 5 covers CI path filters, bounded preview artifacts, production-subpath packaged loader evidence and Android/update/device evidence. Windows/native installation and physical device checks remain outstanding; missing hardware does not block independent implementation. `assets/raw` remains an optional local inbox.

The native Vite import target refines technical delivery for managed images; it does not change product art decisions or migrate legacy `public` files early. Future audio, animation, atlas, UI/background profiles or storage changes require actual consumers and their own scoped task. For live remaining criteria, use #494's acceptance matrix and task-status comments rather than treating this document as a passed pilot report.
