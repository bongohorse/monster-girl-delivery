# Mobile performance evidence workflow

Issues: #323, #332

This workflow records repeatable real-device evidence without turning browser FPS into gameplay authority.

## Scope

The Director performance HUD owns the existing bounded frame-time sampler and authoritative Zapper work counters.

The **CP** control exports one JSON snapshot only when pressed. It does not add a second collision pass, a growing telemetry history, or per-frame serialization.

The report records:

- build commit and build mode;
- capture timestamp;
- logical viewport size;
- device pixel ratio;
- canvas backing-buffer size;
- current render scale;
- run seed and run distance;
- Director GOD/AUTO state;
- current FPS limit and Phaser actual FPS;
- rolling average / P95 / P99 / current frame time;
- session worst frame time and slow-frame count;
- authoritative Zapper collision work counters.

If the Clipboard API is unavailable, the same JSON is written to the browser console.

## Measurement rules

For before/after comparisons:

1. use the **same physical device**, browser, orientation, viewport, display refresh mode, and power/thermal state as closely as practical;
2. use the same FPS limit;
3. close unrelated heavy browser tabs/apps where practical;
4. do not use Spector.js or another invasive WebGL capture during the baseline;
5. allow the page/device to warm up before recording;
6. compare multiple captures, not one lucky frame window;
7. preserve the raw JSON evidence rather than transcribing only the headline FPS;
8. treat development/Director results as development evidence, not as a production-build certification.

The current sampler window is 300 valid raw-frame samples. At 60 Hz that represents about five seconds; at higher refresh rates it covers a shorter wall-clock interval. The JSON explicitly records sample count/capacity so this is visible in the evidence.

## #332 before/after reference

The instrumented pre-optimization reference point is the Gate 8 sampling baseline:

- commit `5f5b8e0b1832bb2c1c356ce981eeb24130fd5269` / PR #353.

The optimized reference is current `main` after the #332 mechanical gates.

For a trustworthy device comparison, use equivalent evidence instrumentation on both refs. Do not compare a Director-instrumented build against a different production/tooling configuration and attribute the difference to Zapper collision.

## Initial Zapper workload

Until #323 owns a dedicated one-click benchmark preset, use the existing real Director controls:

1. start a development build; Director Mode is enabled automatically in DEV;
2. set the FPS limit to the chosen comparison value (start with 60);
3. enable **GOD**;
4. disable **AUTO**;
5. press **CLR**;
6. press **↻** to reset frame statistics and Zapper counters;
7. exercise the same documented Zapper spawn sequence on both refs;
8. after the rolling window is full and the same workload phase is active, press **CP**;
9. save the copied JSON with the build commit in the filename.

This manual sequence is a temporary bridge. #323 should replace it with bounded deterministic benchmark presets so workload setup itself becomes one-click and reproducible.

## #332 closeout

The final open #332 acceptance item requires real-mobile before/after evidence showing that cumulative Zapper optimization materially lowers CPU/frame-time cost in a representative workload.

Useful evidence should include at least:

- average frame time;
- P95;
- P99;
- worst valid frame time;
- slow-frame count;
- actual FPS;
- candidate/evaluated Zapper samples;
- geometry resolutions;
- core/Graze narrowphase checks;
- device/browser/display context from the exported report.

Shared GitHub Actions wall-clock timing is not a substitute for this device evidence.
