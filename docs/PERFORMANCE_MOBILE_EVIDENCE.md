# MGD performance investigation and mobile evidence

Issues: #323, #332; reuse audit: #503

## Inventory and reuse decision (#503)

Existing tools cover MGD performance work; extend this guide instead of adding a competing `mgd-performance` skill. Use [diagnosing-bugs](../.agents/skills/diagnosing-bugs/SKILL.md) for ambiguous symptoms and [TEST_QUALITY](TEST_QUALITY.md#evidence-selection-matrix) for evidence selection. Ordinary UI/art/text changes do not trigger a benchmark audit. This inventory is a routing aid, not a task to repeat before every investigation.

| Question | Existing tool/source and limit |
|---|---|
| Representative run frame pressure | [PerformanceSampler](../src/devtools/PerformanceSampler.ts), [PerformanceEvidence](../src/devtools/PerformanceEvidence.ts), [DirectorPerformanceHud](../src/devtools/DirectorPerformanceHud.ts): NP/ZP automatic windows and CP snapshots. These measure game-step wall-clock intervals, not CPU/GPU time. |
| Heap trends/allocation | [Allocation evidence](ALLOCATION_CHURN_EVIDENCE.md#mobile-memory-evidence-harness), [MemoryEvidenceSampler](../src/devtools/MemoryEvidenceSampler.ts): MEM's 60-second active-wall-clock window. Heap endpoints do not measure allocations, GC events or GPU/process memory. |
| Historical Android allocation comparison | [Paired Android comparison](329_APK_COMPARISON.md) and [workflow](../.github/workflows/android-memory-comparison.yml): #329's pinned BEFORE/current AFTER; not an arbitrary A/B pipeline. |
| Android/Web test context | [Android distribution](ANDROID_DISTRIBUTION.md#hidden-production-diagnostics), [PWA](PWA_ANDROID.md#hosted-test-build): build modes, diagnostics and export. DEV Director, Director-enabled APK and normal production are different conditions. |

[MASTER_SPEC §19](../MASTER_SPEC.md#19-performance) owns product performance decisions; [ARCHITECTURE §11](../ARCHITECTURE.md#11-directordeveloper-tools) owns instrumentation boundaries. Existing sampler thresholds and historical results are not new universal device budgets.

## Investigation and comparison procedure

Use for a performance symptom, assigned measurement or relevant optimization comparison. Follow the task's scope: an investigation returns findings; an authorized fix continues through implementation and verification. Choose tools and measurement details autonomously from the question.

1. **Select the question and metric.** Identify the real loading/play/restart path and symptom. Distinguish compressed/network/package bytes, decoded texture storage and runtime residency. A smaller PNG does not by itself establish less GPU memory or faster gameplay.
2. **Establish a comparable baseline.** Record source/artifact and mode, relevant local changes, device/browser, workload/seed and capture settings. Match conditions that affect the chosen metric: frame comparisons need viewport/render scale, FPS limit, diagnostics, warm-up, duration and repeated captures; startup comparisons need cold/warm cache state. Include Android shell identity when bundles differ. Reuse metadata already in reports instead of copying it into a separate form.
3. **Measure with the appropriate existing tool.** NP/ZP answer run-frame questions; MEM answers bounded heap trends. Startup requires loading traces; CPU/GPU attribution requires a suitable profiler. Keep intrusive profiling separate from unprofiled timing baselines. Preserve raw evidence and enough samples/repetitions to reveal noise or rare stalls.
4. **Test and compare.** Isolate the suspected change on the supported path. Compare matched A/B captures, report variation and distributions rather than average FPS alone. Work counters can show fewer evaluations, not a device speedup. A short P99 window, rising heap endpoint or one fast run is insufficient for a broad claim.
5. **Report the finding and finish authorized work.** Link raw captures/traces with reproducible steps, relevant conditions and results. Separate observation from hypothesis and state noise/mismatches. Verify an authorized optimization against the original scenario and normal correctness checks. Additional lifetime/scene-teardown checks apply when the symptom involves repeated use or retention, not to every performance change.

### When the required measurement is unavailable

Continue source investigation and other authorized work. State the specific untested claim and provide the minimum reproduction: source/artifact, target context, scenario/seed/actions, relevant warm-up/duration/repetitions, tool and export steps. Missing target hardware restricts device claims, not artifact delivery or the whole workflow. An inconclusive comparison is valid evidence. Preserve exported evidence before any separately authorized reinstall/clear-data operation.

## Request walkthroughs

These examples describe measurement choices, not results already obtained.

| Request | Focused route |
|---|---|
| Large texture causes stutters | Locate download, decode/upload, first display or sustained-play cost. Use loading traces for startup and matched frame/profiling evidence for runtime. Compressed size differs from decoded memory; estimates need assumptions. No automatic pipeline overhaul. |
| Compare optimization A with B | Match actual sources/modes/device/workload and relevant capture settings; preserve raw captures and variation. Use NP/ZP/MEM only if they measure the question; #329's historical baseline is not arbitrary A. Missing tooling limits the comparison claim. |
| Memory grows after restarts | Reproduce supported retry/restart/scene actions at equivalent checkpoints. Inspect heap/retaining paths over repeated cycles, separating caches and GC timing from persistent retention. Normal retry may reuse resources; MEM alone is not a restart-leak test. Keep GPU textures and process memory separate. |

## Scope

The Director performance HUD owns the existing bounded frame-time sampler and authoritative Zapper work counters.

The **NP** and **ZP** controls run standardized 60 FPS benchmarks and automatically export the first complete bounded sample window. **CP** remains available for ad-hoc manual snapshots. None of these paths adds a second collision pass, a growing telemetry history, or per-frame serialization.

The report records:

- build commit and build mode;
- production-diagnostics enabled state;
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
- current FPS limit and measured game-step FPS derived from the same bounded wall-clock interval window;
- capture trigger (`manual` or `auto-window-full`) and automated target sample count;
- rolling average / P95 / P99 / current frame time;
- session worst frame time and slow-frame count;
- authoritative Zapper collision work counters;
- cumulative run broadphase work: retained/candidate hazard and collectible counts plus exact contact evaluations;
- active logical hazard and unconsumed collectible counts;
- retained presentation counts for hazards and collectibles;
- primitive-hazard, Laser, and Zapper presentation-family counts;
- Phaser Scene Display List Game Object count.

Every exported report is also persisted as the latest performance evidence in browser local storage. The browser path requests a JSON download for automated captures, with preset, commit and timestamp in its filename; clipboard/console fallback is also available. The [Android wrapper](../android/app/src/main/java/com/bongohorse/monstergirldelivery/MainActivity.java) intercepts evidence Blob requests and shares the persisted payload through the existing native export plugin. This implementation path is not proof of successful export on a device. Follow the platform export instructions linked above and preserve the report before uninstalling or clearing data; runtime identity alone does not prove download/share succeeded.

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

The current sampler window is 300 valid game-step wall-clock interval samples. Standard NP/ZP benchmarks force a 60 FPS game-step limit, so a full window represents about five seconds. The JSON explicitly records sample count/capacity and the automated target count. The current schema version 7 adds `diagnosticsEnabled` to the schema-v6 evidence described by the historical matched references below. Schema version 6 records `timingSource: "game-step-wall-clock"`, `trigger`, and `targetSampleCount` in addition to benchmark identity, tuning/runtime state, bounded workload/presentation counts, and cumulative broadphase work required to reject mismatched captures.

Phaser's RAF-level `game.loop.actualFps` and `game.loop.rawDelta` are intentionally not used for capped benchmark evidence. In Phaser 4.2.1 the FPS-limited loop can still update those values on every browser RAF callback even when the actual game callback runs less frequently. Director evidence instead timestamps actual Foundation game-step callbacks and derives both FPS and frame-interval statistics from those timestamps.

## Runtime count semantics

Runtime counts are read only on the existing low-frequency Director HUD refresh cadence (250 ms) and on an explicit **CP** export. They do not add a per-frame telemetry pass.

- **active hazards** are the logical generated/retained/manual hazards currently owned by Foundation;
- **active collectibles** are retained logical collectible spawns that have not been consumed;
- **presented hazards / collectibles** are the current entries retained by their presentation owners;
- **primitive / Laser / Zapper** counts describe the hazard presentation families, not renderer draw calls;
- **Scene Game Objects** is the size of Phaser's public Scene Display List returned by `children.getChildren()`;
- **BP H candidate/retained** accumulates hazards admitted by the shared horizontal broadphase versus hazards presented to it;
- **BP H E** accumulates top-level exact hazard contact-authority evaluations after broadphase;
- **BP C candidate/retained** accumulates collectible candidates selected by the sorted run-distance window versus retained collectibles;
- **BP C E** accumulates exact collectible continuous-overlap evaluations, while **T** counts first-contact time resolutions after an overlap.

Broadphase work counters are additive evidence only. Gameplay never reads them. The Director reset button plus NP/ZP preset setup reset them together with the existing frame/Zapper measurements.

These counters deliberately do **not** claim renderer batches, GPU draw calls, exact onscreen pixel visibility, JS heap, or GC activity. Those require dedicated trustworthy instrumentation or browser/renderer tooling.

## Canonical before/after references

Use these measurement refs for M5 performance evidence. They intentionally share the same schema-v6 timing, stable HUD, automated NP/ZP capture, persistence, and export tooling while preserving the relevant BEFORE behavior:

| Issue | BEFORE branch | BEFORE commit | Benchmark | Preserved baseline behavior |
| --- | --- | --- | --- | --- |
| #329 | `perf/329-mobile-baseline` | `0eb3d9c4d6ec9a0f697389fa8c8d4f444effa0e3` | NP | allocation-heavy pre-optimization live path |
| #330 | `perf/330-mobile-baseline` | `e264d2a5773d2f3b251e26f62de29c1a81368374` | NP | shared run-distance broadphase disabled for evidence |
| #332 | `perf/332-mobile-baseline` | `38888842bbb07af3fd5d526685aa8c4a94d65552` | ZP | Gate-8/pre-optimization Zapper collision algorithm |

The corresponding AFTER reference is `main` at or after `791eef21add4b77c9cdeac3e26854589688f05fc`, provided no later change alters the benchmark workload or performance authority under test. Record the exact AFTER build commit from each exported JSON rather than assuming `main` stayed unchanged.

The historical #332 Gate-8 source point remains `5f5b8e0b1832bb2c1c356ce981eeb24130fd5269` / PR #353, but it is **not** the canonical device-capture ref because it does not contain the final matched schema-v6 automation. For trustworthy before/after comparisons, use the canonical baseline branches above and equivalent current-main instrumentation.

## Automated benchmark capture

The Director HUD uses the existing **NP** and **ZP** controls as one-click benchmark runners. Pressing either control:

- forces the game-step FPS limit to **60**;
- normalizes the benchmark state and resets all bounded frame/work counters;
- starts the selected deterministic workload;
- records samples without allocating percentile snapshots on every game step;
- automatically captures exactly when the sample window first reaches **300/300**;
- marks the HUD status as `BENCH NP 300/300 ✓` or `BENCH ZP 300/300 ✓`;
- persists the exact report and requests a JSON download automatically.

Changing FPS, GOD/AUTO, wireframes, freeze state, hazards, or reset while a benchmark is running cancels the automatic capture so a modified workload cannot be mistaken for standard evidence.

**CP** remains an explicit manual/ad-hoc snapshot and records `trigger: "manual"`. Standard acceptance evidence should use the automatic NP/ZP path.

## Normal-run benchmark preset

The Director HUD exposes **NP** for the reproducible `normal-run-v1` workload.

NP normalizes the measurement setup in one action:

- enables **GOD** so a representative run is not truncated by a lethal contact;
- enables normal **AUTO** encounter generation;
- resumes the simulation if it was frozen;
- disables collision wireframes;
- resets the bounded frame-time sampler, Zapper work counters, and run broadphase work counters;
- discards the first post-setup game step and uses it only to establish a fresh wall-clock timestamp baseline so synchronous restart/setup work is not measured;
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
- resets the bounded frame-time sampler, Zapper work counters, and run broadphase work counters;
- restarts the run at distance/time zero with the fixed live-run seed;
- spawns the fixed `zapper-heavy-v1` pattern fully beyond the right edge.

The pattern contains 14 real Zappers spread across a 2,320 px run: static, diagonal, timed, plus clockwise/counterclockwise rotating Zappers at 30/60/90 degrees per second. It intentionally uses the normal hazard, lifecycle, collision, Graze, presentation, pruning, and run-motion paths rather than a benchmark-only simulation.

At the prototype 350 px/s base speed, the authored Zapper span keeps new benchmark hazards arriving for roughly five seconds, matching the 300-sample window closely at 60 Hz.

To capture:

1. start a development build; Director Mode is enabled automatically in DEV;
2. press **ZP** once;
3. keep the page foregrounded and do not alter Director controls during the run;
4. wait for `BENCH ZP 300/300 ✓`;
5. preserve the automatically exported JSON.

There is no manual sample-window timing or CP click in the standard Zapper benchmark.

A valid standard Zapper capture should report `performancePresetId: "zapper-heavy-v1"`, AUTO false, GOD true, frozen false, and wireframes false. The JSON also records tuning values and FPS limit so mismatched runs can be rejected instead of silently compared.

## #332 closeout

The final open #332 acceptance item requires real-mobile before/after evidence showing that cumulative Zapper optimization materially lowers CPU/frame-time cost in a representative workload.

Useful evidence should include at least:

- average frame time;
- P95;
- P99;
- worst valid frame time;
- slow-frame count;
- measured game-step FPS;
- candidate/evaluated Zapper samples;
- geometry resolutions;
- core/Graze narrowphase checks;
- device/browser/display context from the exported report.

Shared GitHub Actions wall-clock timing is not a substitute for this device evidence.
