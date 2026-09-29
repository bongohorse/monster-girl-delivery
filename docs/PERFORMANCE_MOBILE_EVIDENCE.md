# MGD performance investigation and mobile evidence

Issues: #323, #332; reusable investigation audit: #503

This workflow records repeatable real-device evidence without turning browser FPS into gameplay authority.

## Inventory and reuse decision (#503)

The audit at main `97d158bef31ed3a22cbd18fde375973d1cdf7890` found an existing diagnosis skill, bounded live measurements and specialized profiling instructions. **Extend/reuse these; no separate `mgd-performance` skill is needed.** The missing material was general metric selection, comparable experiment identity and texture/restart walkthroughs, added below. This document is the entry point for MGD performance investigation/comparison; specialized sources retain their own procedures and historical evidence.

| Existing source/tool | Ownership and limits |
|---|---|
| [diagnosing-bugs](../.agents/skills/diagnosing-bugs/SKILL.md) | Supported reproduction, ranked hypotheses and targeted diagnosis before a fix. Use for stutters, startup stalls, memory growth or a suspected regression; an A/B measurement request alone does not authorize optimization. |
| [TEST_QUALITY](TEST_QUALITY.md#evidence-selection-matrix) | Evidence selection and acceptance boundaries. A performance claim or assigned cost criterion triggers measurements; an ordinary text/art/UI correction does not require a benchmark campaign. |
| [PerformanceSampler](../src/devtools/PerformanceSampler.ts), [PerformanceEvidence](../src/devtools/PerformanceEvidence.ts), [DirectorPerformanceHud](../src/devtools/DirectorPerformanceHud.ts) | Existing NP/ZP automated windows, CP ad-hoc snapshot and bounded counters. Measurements are game-step wall-clock intervals, not direct CPU/GPU timing. [Foundation](../src/game/scenes/Foundation.ts) connects the actual runtime and export paths. |
| [Allocation evidence](ALLOCATION_CHURN_EVIDENCE.md#mobile-memory-evidence-harness), [MemoryEvidenceSampler](../src/devtools/MemoryEvidenceSampler.ts) | MEM's 60-second active-wall-clock frame/heap trend and the allocation/GC evidence boundary. Browser heap endpoints are not allocation totals, GC events or GPU/process memory. |
| [Paired Android comparison](329_APK_COMPARISON.md), [existing workflow](../.github/workflows/android-memory-comparison.yml) | #329's pinned historical BEFORE with the current AFTER shell, artifact identity and same-device profiling instructions. It is not a general arbitrary A/B pipeline. Do not repurpose it silently for another baseline. |
| [Android distribution](ANDROID_DISTRIBUTION.md#hidden-production-diagnostics), [PWA](PWA_ANDROID.md#hosted-test-build) | Actual Android/Web test contexts, production-diagnostics unlock, export/delivery and build-mode distinctions. DEV Director, a Director-enabled test APK and normal production with diagnostics enabled are distinct conditions. |

[MASTER_SPEC §19](../MASTER_SPEC.md#19-performance) owns product performance principles and open device decisions; [ARCHITECTURE §11](../ARCHITECTURE.md#11-directordeveloper-tools) owns bounded instrumentation and separation from gameplay authority. [DEVELOPMENT](../DEVELOPMENT.md#3-required-verification) owns checks and commands. Use existing budgets or explicit Director decisions only; do not turn a sampler threshold or a historical result into a universal device budget.

## Investigation and comparison procedure

Use for an assigned performance question, relevant optimization comparison or performance-regression diagnosis. Establish the question and observation before changing code. These instructions authorize no builds, benchmark runs or optimization during this documentation audit.

1. **Choose the question and metric.** Define the supported scenario and observable symptom: startup/load latency, steady frame intervals/stall distribution, retained memory after repeated use, asset/package size, or a specific CPU/GPU cost. Distinguish source/compressed file bytes, network transfer, delivered web/APK bytes, decoded texture dimensions/storage and actual runtime residency. A smaller PNG does not establish less decoded/GPU memory or faster gameplay.
2. **Pin comparable conditions.** Record full source commit/ref, tracked/untracked dirty status, actual built artifact identity and mode, device/OS/browser or WebView, diagnostic state, logical/canvas/CSS dimensions, DPR/render scale, refresh/FPS cap, scene/run/seed/tuning/workload and relevant content counts. Fix measurement duration, warm-up and repetitions before running; state cold versus warm cache/startup and device power/thermal conditions. Record the APK shell commit separately when bundles and wrapper differ. Embedded short hashes/branch names do not establish a clean tree or current deployment.
3. **Choose the existing instrument.** For representative run frame pressure use the applicable NP/ZP procedure below; for heap trends follow MEM/allocation guidance. Startup/download/decode questions need an actual supported loading scenario and browser/network/performance trace, not a running-game preset. A focused CPU call-stack or GPU/renderer claim needs suitable profiling beyond frame intervals/counters. Record tools and trace boundaries. Keep intrusive profiling separate from unprofiled baseline captures; compare profiled traces with similarly profiled traces.
4. **Test a falsifiable hypothesis.** Reproduce the symptom at its real entry point, preserve baseline raw evidence and isolate the suspected change. Follow diagnosing-bugs for ambiguous causes. Compare A/B on matched conditions with repeated captures and, when practical, alternating order to reduce warm-up/thermal bias. A current short window may miss a rare stall: choose the relevant duration/repeated scenario rather than presenting one good five-second capture as a long-session result. Reset/setup exclusions in NP/ZP mean they cannot measure restart/startup cost.
5. **Interpret the sample honestly.** Preserve distributions and sample counts/durations: average plus P95/P99/worst/slow-frame evidence where applicable. P99 from a short window depends on very few intervals; report across-capture variation rather than treating one percentile as certainty. Frame intervals include scheduling and display/limit effects; they do not attribute milliseconds to CPU or GPU. Work counters can establish fewer authority evaluations but cannot prove a device speedup. Report mismatched conditions, incomplete/truncated captures, noise and unavailable APIs; an inconclusive comparison is a valid result.
6. **Check repeated-use lifetime when relevant.** For restart/resize/scene-lifecycle or growing-memory symptoms, use supported actions and inspect retained resources/listeners/textures and object ownership. Separate intended caches, temporary churn and GC timing from continuing retention. Follow the restart example below; do not mutate internal state to manufacture a leak or use browser heap as GPU-memory evidence.
7. **Deliver a reproducible finding.** Attach raw JSON/profiles/traces or retrievable source, their filenames/hashes where available, exact conditions/steps, repetitions and summarized A/B results. State what was observed, what remains a hypothesis and the justified next action. Check an authorized optimization against the same original scenario and required correctness checks; reuse code-review for implementation review. Preserve manual/device/Director acceptance separately. No access to the required device or profiler means a precise reproduction request and pending measurement, not invented timing or an asserted improvement.

### When the required measurement is unavailable

Provide the exact source/artifact and retrieval instructions, required device/browser/WebView, mode and diagnostic setting, scene/seed/actions, warm-up/cold-cache policy, duration/repetitions, tool/preset, expected output files and export steps from the linked owning procedure. Name the unavailable capability (for example no target Android device or no remote profiler) and the specific claim still untested. A local static/profile inspection may narrow the hypothesis but does not substitute for the requested device measurement. Preserve exported evidence before any reinstall/clear-data operation; do not erase user data to simplify a comparison.

## Dry request walkthroughs

These are documentation checks for #503, not measured results or implemented optimizations.

| Request | Investigation and evidence expected |
|---|---|
| “A large texture causes stutters.” | Locate its real loading/display path and whether the stall happens on download, first decode/upload, first display or sustained play. Record transfer/cache state, compressed bytes, decoded dimensions/format and rendering scale; label any storage estimate with assumptions rather than claiming GPU residency. Compare the same scenario/device with network/load trace for latency and matched frame/profile evidence for runtime stalls. A running NP/ZP window cannot prove a startup improvement. Use allocation/retention or renderer profiling only for the corresponding hypothesis; no automatic asset resize/pipeline change. |
| “Compare optimization A with B.” | Pin both source/artifact identities and choose a workload matching the changed path. Match mode, device/shell, seed/tuning, viewport/render scale, diagnostic controls, FPS cap, warm-up, duration and repetitions; preserve raw captures and variation, then state improvement, regression or inconclusive evidence. Use NP/ZP/MEM only when they measure the question. #329's hardcoded comparison baseline is not arbitrary A; missing matched tooling is a documented gap. Code inspection or fewer allocations alone cannot establish lower frame time. |
| “Memory grows after restarts.” | Reproduce via the existing run retry/restart or relevant supported scene shutdown/recreation path, explicitly stating which lifetime is tested. Keep the same workload and record counts/heap snapshots or allocation profiles at equivalent quiescent checkpoints before and after a declared number of cycles, with consistent warm-up/wait/GC policy. Trace growing retained objects and retaining references to owners/listeners/scene objects/textures; normal run retry may intentionally reuse resources. MEM measures a long run, not a repeated-restart leak; one rising heap sample or delayed GC is insufficient. Check bounded caches versus persistent growth across cycles and whether scene teardown releases owned resources. Treat GPU textures and Android process memory separately; if the required profiler/device is missing, hand off those exact steps with no leak verdict. |

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
