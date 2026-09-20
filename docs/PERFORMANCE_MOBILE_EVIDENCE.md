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
- browser/user-agent identity;
- canvas backing-buffer size;
- current render scale;
- run seed and run distance;
- active performance-preset identity;
- Director GOD/AUTO/frozen/wireframe state;
- base/effective run speed and current flight-tuning values;
- current FPS limit and Phaser actual FPS;
- rolling average / P95 / P99 / current frame time;
- session worst frame time and slow-frame count;
- authoritative Zapper collision work counters;
- active logical hazard and unconsumed collectible counts;
- retained presentation counts for hazards and collectibles;
- primitive-hazard, Laser, and Zapper presentation-family counts;
- Phaser Scene Display List Game Object count.

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

The current sampler window is 300 valid raw-frame samples. At 60 Hz that represents about five seconds; at higher refresh rates it covers a shorter wall-clock interval. The JSON explicitly records sample count/capacity so this is visible in the evidence. Schema version 3 also records benchmark identity, tuning/runtime state, and bounded workload/presentation counts required to reject mismatched captures.

## Runtime count semantics

Runtime counts are read only on the existing low-frequency Director HUD refresh cadence (250 ms) and on an explicit **CP** export. They do not add a per-frame telemetry pass.

- **active hazards** are the logical generated/retained/manual hazards currently owned by Foundation;
- **active collectibles** are retained logical collectible spawns that have not been consumed;
- **presented hazards / collectibles** are the current entries retained by their presentation owners;
- **primitive / Laser / Zapper** counts describe the hazard presentation families, not renderer draw calls;
- **Scene Game Objects** is the size of Phaser's public Scene Display List returned by `children.getChildren()`.

These counters deliberately do **not** claim renderer batches, GPU draw calls, exact onscreen pixel visibility, JS heap, or GC activity. Those require dedicated trustworthy instrumentation or browser/renderer tooling.

## #332 before/after reference

The instrumented pre-optimization reference point is the Gate 8 sampling baseline:

- commit `5f5b8e0b1832bb2c1c356ce981eeb24130fd5269` / PR #353.

The optimized reference is current `main` after the #332 mechanical gates.

For a trustworthy device comparison, use equivalent evidence instrumentation on both refs. Do not compare a Director-instrumented build against a different production/tooling configuration and attribute the difference to Zapper collision.

## Normal-run benchmark preset

The Director HUD exposes **NP** for the reproducible `normal-run-v1` workload.

NP normalizes the measurement setup in one action:

- enables **GOD** so a representative run is not truncated by a lethal contact;
- enables normal **AUTO** encounter generation;
- resumes the simulation if it was frozen;
- disables collision wireframes;
- resets the bounded frame-time sampler and Zapper work counters;
- discards the first post-setup raw frame so synchronous restart/setup work is not measured;
- restarts the real generated run at distance/time zero with the fixed live-run seed.

Unlike ZP, NP does not inject manual hazards. It uses the normal generated hazard, collectible, lifecycle, collision, Graze, presentation, pruning, and run-motion paths. Current tuning values are intentionally not rewritten; they are recorded in the evidence so captures with mismatched tuning can be rejected rather than silently compared.

A valid normal-run capture should report `performancePresetId: "normal-run-v1"`, AUTO true, GOD true, frozen false, and wireframes false.

## Zapper benchmark preset

The Director HUD exposes **ZP** for the bounded `zapper-heavy-v1` workload.

ZP normalizes the benchmark setup in one action:

- enables **GOD**;
- disables **AUTO** generation;
- resumes the simulation if it was frozen;
- disables collision wireframes;
- resets the bounded frame-time sampler and Zapper work counters;
- restarts the run at distance/time zero with the fixed live-run seed;
- spawns the fixed `zapper-heavy-v1` pattern fully beyond the right edge.

The pattern contains 14 real Zappers spread across a 2,320 px run: static, diagonal, timed, plus clockwise/counterclockwise rotating Zappers at 30/60/90 degrees per second. It intentionally uses the normal hazard, lifecycle, collision, Graze, presentation, pruning, and run-motion paths rather than a benchmark-only simulation.

At the prototype 350 px/s base speed, the authored Zapper span keeps new benchmark hazards arriving for roughly five seconds, matching the 300-sample window closely at 60 Hz.

To capture:

1. start a development build; Director Mode is enabled automatically in DEV;
2. select the FPS limit to compare (start with 60);
3. press **ZP**;
4. do not change tuning, controls, wireframes, or add manual hazards during the capture window;
5. once the 300-sample window is full, press **CP**;
6. preserve the copied JSON with the build commit in the filename.

A valid standard Zapper capture should report `performancePresetId: "zapper-heavy-v1"`, AUTO false, GOD true, frozen false, and wireframes false. The JSON also records tuning values and FPS limit so mismatched runs can be rejected instead of silently compared.

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
