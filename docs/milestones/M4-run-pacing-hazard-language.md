# M4 — Run Pacing & Hazard Language — Completion Report

**Status:** COMPLETE

**Completed:** 2026-09-06

**Primary planning issue:** #116

**Purpose:** Turn technically valid generated encounters into sustained runs that remain readable, varied, fair, and interesting over time through deterministic difficulty progression, deliberate pacing and recovery breathers, distinct hazard archetypes, and multi-layer fairness/readability validation.

## 1. Planned goal

M4 was planned as the run-structure and hazard-language milestone following the completed M3 seeded procedural generation pipeline.

The approved goal was to prove whether Monster Girl Delivery could produce sustained procedural runs that create deliberate pressure and recovery, teach hazards clearly, and increase challenge without becoming monotonous or unfair.

The planned core scope defined in parent Issue #116 comprised:

- time-to-impact fairness rather than raw viewport-edge distance;
- physics-aware reachability checks evaluating vertical flight physics;
- deterministic run difficulty progression;
- deterministic pacing/intensity state with deliberate breather/recovery sections;
- typed encounter profiles declaring difficulty/pacing/variety metadata;
- telegraphed hazard lifecycle framework;
- multiple mechanically distinct hazard archetypes;
- sequence-level transition fairness across consecutive encounters;
- deterministic recent-history variety guard;
- deterministic active-hazard readability and concurrency budget;
- integration of difficulty, pacing, variety, concurrency, and archetype eligibility into the live encounter stream;
- expanded Director encounter and fairness diagnostics;
- deterministic long-run encounter trace and soak harness;
- automated and real-gameplay validation;
- factual milestone closeout before advancing to M5.

Final production content volume, final balance values, full economy/meta, production art scaling, Graze, score, and the complete death-to-retry arcade loop were explicitly outside M4 scope.

## 2. What M4 actually delivered

### Time-to-impact fairness

Issue #79 / PR #130 replaced static viewport-edge reaction distance with a logical time-to-impact calculation.

- The look-ahead reaction horizon is computed from authoritative scroll speed and a minimum reaction-time constraint (default `1.5s` **PROTOTYPE**).
- Physical viewport width is decoupled from reaction fairness: devices with different display aspect ratios or pixel dimensions share identical logical reaction timing.
- Speed increases are rejected unless every existing future scheduled hazard preserves the minimum reaction time.
- Decreases apply immediately, keeping the additional reaction cushion.

### Physics-aware reachability validation

Issue #80 / PR #131 added analytical flight-envelope validation to pattern fairness.

- It reuses the authoritative vertical-flight integrator to verify whether continuous-thrust and gravity-fall trajectories can physically navigate from current/representative flight states into candidate safe corridors within the available reaction time.
- Corridor boundaries are reduced by the player's logical collision extents under the positive-area collision rule.
- Unreachable corridors are deterministically rejected with structured failure evidence (`vertical-route-blocked`), preventing impossible vertical demands from reaching the spawn stream.

### Deterministic run difficulty progression

Issue #81 / PR #132 introduced a pure distance-to-snapshot difficulty authority.

- Difficulty scales challenge across multiple parameters rather than relying on speed alone: scroll speed, minimum reaction time, target corridor clearance, reaction spacing, and pattern entry/density eligibility limits.
- Four explicit, capped **PROTOTYPE** tiers are defined: Tier 1 (`0–2,000m`), Tier 2 (`2,000–5,000m`), Tier 3 (`5,000–10,000m`), and Tier 4 (`10,000m+`).
- Difficulty has no input from wall-clock time, frame rate, player failure history, or viewport dimensions.
- Difficulty determines what maximum challenge is permitted at a given run distance; it does not dictate momentary pressure.

### Deterministic pacing and deliberate breathers

Issue #82 / PR #133 added a separate pure distance-to-snapshot pacing authority.

- Pacing controls momentary intensity, repeating a deterministic 7,100m cycle with five structured phases:
  1. Breather (`900m`, zero/low pressure ceiling, recovery window);
  2. Low (`1,400m`, low intensity);
  3. Medium (`1,800m`, moderate intensity);
  4. High (`1,800m`, elevated challenge);
  5. Peak (`1,200m`, maximum momentary pressure).
- Pacing requires an explicit breather phase in every cycle, ensuring sustained recovery windows cannot be skipped by RNG variation.
- Pacing state consumes no PRNG draws and uses whole logical phase lengths so cycle boundaries remain stable regardless of fractional run progress.
- Pacing adapters filter eligible patterns and constrain pattern spans from crossing upcoming phase boundaries.

### Typed encounter profiles

Issue #123 / PR #134 added immutable metadata to each logical hazard pattern.

- Profiles explicitly declare an inclusive difficulty-tier range, allowed pacing intensities, typed behavior tags, a stable variety-family identity, and bounded whole-unit pressure and readability costs.
- The constructor validates and snapshots all fields immutably without importing Phaser or viewport state.
- All prototype catalog fixtures declare explicit profile metadata.

### Telegraphed hazard lifecycle framework

Issue #83 / PR #135 implemented a pure logical lifecycle for telegraphed hazards.

- Structured progression: `Warning` → `Lock` → `Active` → `Expired`.
- `Warning` and `Lock` are completely safe; only `Active` is lethal.
- Target positions sampled during `Warning` freeze permanently at the `Lock` boundary.
- Updates consume simulation delta already normalized by `TimeService`; wall-clock timers and presentation callbacks never own gameplay state.
- Delta steps cross at most one lifecycle boundary per frame, with leftover time carrying forward to protect frame-rate independence while preventing skipped safe phases.

### Distinct hazard archetypes

Issue #89 umbrella and focused Issues #117, #118, and #119 established the hazard-archetype architecture and three concrete **PROTOTYPE** implementations:

1. **Geometric moving prototype (`prototype-vertical-patrol`, #117 / PR #136):**
   - Implements a serializable geometric behavior union attached to pattern entries and spawns.
   - Moves vertically according to a pure triangle wave derived from authoritative run distance relative to the spawn anchor.
   - Pattern validation conservatively tests the full swept vertical extent of the motion.
   - Freezes cleanly when run progress stops, requiring no independent clock or RNG.
2. **Telegraphed timed prototype (`prototype-timed-pulse`, #118 / PR #138):**
   - Non-reactive fixed-anchor timed barrier using the generic telegraphed lifecycle.
   - Progresses through warning, lock, active pulse, and expired cooldown.
   - Enters the shared AABB collision authority only while `Active`.
   - Distinct placeholder presentation reflects phase changes without owning timing.
3. **Reactive target-lock prototype (`prototype-target-lock`, #119 / PR #142):**
   - Samples the player's vertical position within an authored vertical target band during `Warning`.
   - Freezes the target snapshot at the `Lock` boundary.
   - Resolves an immutable lethal strike at the locked vertical position during `Active`.
   - Later player movement cannot alter the locked strike position.
   - Pattern validation conservatively checks the full authored target sweep.

### Sequence-level transition fairness

Issue #124 / PR #147 established a pure transition validation layer above isolated pattern validation.

- It carries a bounded set of correlated representative position and velocity states from the previous encounter's exit envelope.
- It computes the available transition time from logical separation distance and authoritative scroll speed.
- It verifies whether at least one exit state can reach the next candidate's first eligible safe corridor under analytical flight equations.
- Consecutive patterns that are individually fair but mutually impossible (e.g. high-ceiling exit followed immediately by a low floor corridor with insufficient flight transition time) are deterministically rejected with structured evidence (`next-entry-unreachable-from-exit-envelope`).
- Rejections consume exactly one PRNG candidate step and produce no spawns, preventing deadlock while preserving generation order.

### Deterministic recent-history variety guard

Issue #125 / PR #151 introduced an anti-repetition guard for encounter selection.

- Tracks the last two accepted variety-family identities in an immutable, bounded state.
- Suppresses immediate or near-immediate repetition of the same family while fresh alternatives remain in the catalog admitted by difficulty and pacing.
- If fresh candidates are exhausted or fail hard fairness, recent families remain available as a deterministic authored-order fallback, preventing scheduler starvation.
- Consumes zero random values and never records rejected candidates in history.

### Active-hazard readability and concurrency budget

Issue #126 / PR #152 established an active reservation budget over relative simulation-time windows.

- Each pending/active encounter copies its profile costs across explicit relative active, warning, and lethal `[start, end)` intervals.
- Hard **PROTOTYPE** caps:
  - Combined pressure units: `6`;
  - Combined readability units: `6`;
  - Concurrent active warning channels: `2`;
  - Concurrent lethal windows: `2`;
  - Maximum tracked encounters: `32`.
- Pacing and difficulty requests intersect with rather than override these caps (e.g. Breather requests `0` pressure, but Peak cannot exceed `6`).
- Over-budget candidates are deferred with structured metric/time evidence and do not corrupt reservation occupancy.
- Expired reservations release occupancy deterministically through `TimeService`-normalized delta.

### Live encounter-policy integration

Issue #120 / PR #153 unified all M4 authorities into the live procedural stream.

- Coordinates difficulty tiering, pacing requests, variety filtering, concurrency/readability budgets, single-pattern reachability, transition fairness, and archetype lifecycles in `createGeneratedHazardStream` / `advanceGeneratedHazardStream`.
- Defers requested speed and flight-tuning changes until existing accepted encounters clear both their readability reservations and geometric exit distance.
- Leaves recovery space for pending changes, rebasing subsequent generation to the updated reaction horizon.
- Bounded scheduling rejections leave deterministic recovery gaps and remain retryable, preventing generation halts.

### Director encounter and fairness diagnostics

Issue #86 / PR #154 expanded development-only diagnostics to expose authoritative M4 state.

- Displays active run distance, normalized seed, difficulty tier, target speed, reaction time, pacing cycle/phase, remaining phase distance, active pressure/readability budget occupancy, concurrent warning/lethal counts, recent variety families, and transition validation outcome.
- Operates strictly as a development inspection tool without altering gameplay rules or leaking into production builds.

### Deterministic long-run encounter trace and soak harness

Issue #127 / PR #160 added a headless soak harness in `tests/support/LongRunEncounterHarness.ts`.

- Drives the live policy pipeline across thousands of meters without Phaser or browser dependencies.
- Simulates representative multi-thousand-meter runs (up to `50,000m`), validating that:
  - identical seeds reproduce bit-identical event traces and encounter sequences;
  - different seeds diverge while obeying identical policy bounds;
  - policy state (retained spawns, active reservations, variety history, concurrency) remains strictly bounded;
  - no scheduler deadlock or infinite retry loop occurs across prolonged runs.

### Real-gameplay validation and acceptance

Issue #121 / PR #166 collected and documented the automated, browser-tooling, and Game Director evidence in [`docs/milestones/M4-run-pacing-validation.md`](M4-run-pacing-validation.md).

- Automated soak evidence proved policy boundedness and multi-archetype participation across seeds `42`, `100`, `200`, and `300`.
- Tooling fixes in PR #165 resolved Director HUD eye button collapse behavior and added new-random-seed controls.
- The Game Director conducted playtesting on the updated representative build and explicitly accepted the run pacing, hazard language, readability, and variety as a **PASS**.

## 3. Architecture/product decisions established

M4 established the following durable architectural and product constraints:

- **Difficulty vs Pacing separation:** Difficulty controls what challenge is permitted (speed, corridor clearance, spacing, catalog eligibility); pacing controls momentary pressure (breathers, low/medium/high/peak). Neither system overrides the other.
- **Time-to-impact fairness:** Reaction horizons are derived from authoritative scroll speed and minimum reaction seconds (`distance = speed × reaction_seconds`). Physical viewport dimensions must never be a fairness or difficulty authority.
- **Physics-aware reachability:** Safe corridors must be physically reachable by the player entity under analytical flight equations and collision extents.
- **Consecutive-transition fairness:** Consecutive encounters must be traversable from the exit flight envelope of encounter N to the entry corridor of encounter N+1.
- **Pure encounter profiles:** Patterns carry declarative metadata governing difficulty, pacing, variety, and resource costs. Profiles contain no framework or rendering state.
- **Deterministic variety policy:** Bounded 2-family recent history prevents monotonous repetition without consuming RNG state.
- **Telegraphed hazard lifecycle:** `Warning` → `Lock` → `Active` → `Expired`. Only `Active` is lethal; target snapshots lock at the `Lock` boundary. Phase transitions consume normalized simulation delta.
- **Hazard archetype boundary:** Archetypes use serializable data/behavior definitions and per-spawn simulation rather than complex inheritance hierarchies.
- **Active readability and concurrency limits:** Hard caps on concurrent warnings (`2`), lethal windows (`2`), pressure (`6`), and readability (`6`) bound screen clutter and cognitive load.
- **Live policy orchestration:** Speed and tuning changes are deferred until accepted content clears; rejected candidates leave deterministic recovery gaps without terminating generation.
- **Finite sampling as evidence:** Automated soaks and representative seed replays provide engineering evidence of policy boundedness and correctness, not mathematical proof of all possible future seeds or content configurations.
- **Prototype status preserved:** Archetype tuning values, tier boundaries, 7,100m pacing cycle lengths, budget caps, and placeholder visual representations remain **PROTOTYPE** until explicit production balance passes occur.

## 4. Validation evidence

### Automated validation

Automated validation was established through unit tests, live integration tests, and the headless long-run harness:

- **Repository checks:** All four standard checks pass cleanly:
  - `bun run ci:check` — PASS (Biome lint/format, 125 files checked);
  - `bun run typecheck` — PASS (TypeScript compilation, 0 errors);
  - `bun run test` — PASS (Vitest, 56 test files / 393 tests passing);
  - `bun run build` — PASS (Vite production bundle completes cleanly).
- **Long-run soak harness evidence:**
  - Seed `42` (`5,000m`): Two fresh runs produced identical 198-event traces and 5 accepted encounters.
  - Seed `100` (`10,000m`): 10 accepted encounters, starting with `prototype-offset-pair`.
  - Seed `200` (`10,000m`): 11 accepted encounters, starting with `prototype-vertical-patrol`.
  - Seed `300` (`50,000m`): Reached `50,001.93m`, accepted 57 encounters (30 static, 17 vertical-patrol, 4 timed-pulse, 6 target-lock), exercised all 4 difficulty tiers and multiple 7,100m pacing cycles, with bounded retention throughout (maximum 6 retained spawns, 3 active reservations, 2 warnings, 2 lethal windows, 4 pressure cost, 6 readability cost).
- **State preservation:** Pause/resume, background-resume, and viewport resize tests confirm generation order, pacing phase, and telegraphed hazard lifecycles are preserved without corruption.

### Game Director manual evidence

- During initial M4 evaluation, the Game Director identified two tooling defects:
  1. the performance HUD eye control did not completely hide performance metrics;
  2. manual testing required an in-game control to start a run with a new random seed.
- PR #165 corrected both issues.
- The Game Director re-tested the updated build against the M4 manual gameplay matrix (Landscape gameplay, difficulty progression, breathers, promoted archetypes, repetition/readability, same-seed restart, pause/background resume) and reported that the **playtest passed**, accepting the run structure and hazard language.

### Evidence limits

- Seeds `42`, `100`, `200`, and `300` (including the 50,000m soak) represent finite samples of the prototype catalog. They demonstrate that the integrated policy functions without deadlock or unbounded state under current conditions; they do not mathematically prove every seed or future catalog addition safe.
- Device-specific metadata (exact phone/tablet model, OS version, browser build, viewport resolution) was not recorded during the manual playtest and is explicitly omitted rather than fabricated.
- Current tuning, speeds, and costs remain **PROTOTYPE**.

## 5. Main Issues / PRs

| Work | Issue | PR | Result |
|---|---:|---:|---|
| Time-to-impact fairness | #79 | #130 | Decoupled reaction distance from viewport; derived horizon from speed × reaction time |
| Physics-aware reachability | #80 | #131 | Analytical vertical-flight reachability validation for pattern corridors |
| Deterministic difficulty progression | #81 | #132 | Distance-to-snapshot difficulty authority with 4 capped prototype tiers |
| Deterministic pacing & breathers | #82 | #133 | Repeating 7,100m pacing cycle with mandatory recovery breathers |
| Typed encounter profiles | #123 | #134 | Immutable pattern metadata declaring tier, pacing, variety, and resource costs |
| Telegraphed hazard lifecycle | #83 | #135 | Pure Warning → Lock → Active → Expired lifecycle with normalized delta timing |
| Geometric moving archetype | #117 | #136 | Vertical-patrol moving hazard with swept-extent validation |
| Telegraphed timed archetype | #118 | #138 | Timed-pulse hazard with fixed anchor and active-only collision |
| Reactive target-lock archetype | #119 | #142 | Player-tracking warning, locked target snapshot, and lethal strike |
| Hazard archetype umbrella | #89 | — | Coordinated archetype architecture; closed via #117, #118, #119 |
| Consecutive transition fairness | #124 | #147 | Correlated exit-envelope to entry-corridor transition reachability checks |
| Recent-history variety guard | #125 | #151 | Bounded 2-family anti-repetition filter with authored-order fallback |
| Readability & concurrency budget | #126 | #152 | Hard caps on concurrent warnings, lethal windows, pressure, and readability |
| Live encounter-policy integration | #120 | #153 | Unified stream orchestration with deferred speed/tuning transitions |
| Director encounter diagnostics | #86 | #154 | Authoritative difficulty, pacing, budget, and transition HUD telemetry |
| Long-run trace & soak harness | #127 | #160 | Headless test harness verifying policy boundedness up to 50,000m |
| M4 validation & acceptance | #121 | #166 | Documented soak evidence and recorded Game Director playtest acceptance |
| M4 milestone closeout | #122 | *(this PR)* | Factual M4 completion report and transition preparation for M5 |
| M4 parent milestone | #116 | — | Planning umbrella; closed upon merge of this closeout report |

## 6. Supporting maintenance completed during the milestone

Infrastructure and research work completed while M4 was current:

- **Director performance HUD (#106 / PR #137):** Added development HUD displaying frame rate, delta, and P95/P99 frame times.
- **Director HUD & seed controls fix (PR #165):** Fixed HUD eye toggle visibility and added `New random seed` control for playtesting.
- **AI workflow hardening (PR #157, PR #164):** Integrated Jules workflow documentation and research-first capability gates into `AI_WORKFLOW.md` and `JULES_WORKFLOW.md`.
- **Reference game research (commits `04b227e`, `ac982e3`, `b7bf981`, `98eaef0`, `ec0adf7`):** Documented Jetpack Joyride wiki research passes and endless runner engineering lessons in `docs/` as design reference material.

## 7. What deliberately did not deliver

M4 deliberately excluded:

- complete start → run → crash → results → restart arcade loop (#85, M5 scope);
- separate core-hitbox and Graze collision layer (#90, M5 scope);
- deterministic score foundation (#94, M5 scope);
- collectible flight paths and coins (#84, M5 scope);
- Delivery Contracts, themed districts, boss encounters, or meta progression;
- final production art, animation pipelines, or audio/music;
- automatic graphics-quality switching or 3D engine techniques;
- exhaustive mathematical verification of all possible RNG seeds.

## 8. Deferred/open work at exit

- **Parallel Track B tasks:** Open engineering tasks that continue alongside milestones:
  - Issue #102: Improve High-DPI rendering / device-pixel-ratio handling;
  - Issue #140: Harden browser/WebView input lifecycle and gesture cancellation;
  - Issue #141: Establish runtime performance budget and regression tripwires;
  - Issue #143: Validate frame-rate independence and variable-delta resilience.
- **M5 preparation:** Core arcade-loop features (#85, #90, #94, #84) remain in the backlog/future status until formally scheduled under an approved M5 parent plan.
- No blocking M4 defects remain.

## 9. Exit decision

M4 is complete because:

1. All 15 ordered child tasks in parent Issue #116 are complete and merged.
2. Multi-layer fairness (time-to-impact, reachability, transition fairness) and readability bounds (variety guard, concurrency budgets) are fully integrated into the live procedural stream.
3. The 50,000m soak harness proves policy boundedness without scheduler deadlock.
4. Director tooling corrections (PR #165) enabled satisfactory playtesting.
5. The Game Director conducted real-gameplay playtesting and explicitly accepted the run structure, readability, and variety.
6. Required automated validation checks (`ci:check`, `typecheck`, `test`, `build`) pass cleanly.

With all exit criteria satisfied, parent Issue #116 and closeout Issue #122 are closed upon merge of this report.

## 10. What the next milestone inherits

The next milestone (M5 — Complete Arcade Loop & Skill Layer) inherits:

- A fully deterministic procedural runner with multi-tier difficulty progression and structured 7,100m pacing cycles with recovery breathers.
- Multi-layer fairness validation ensuring single-pattern reachability and consecutive-transition traversability based on flight physics and time-to-impact.
- Three distinct hazard archetypes (moving geometric, timed pulse, reactive target-lock) with telegraphed lifecycle management.
- Bounded active-hazard readability and variety enforcement.
- Headless long-run soak harness for regression testing.
- Director diagnostic tools and seed reset controls.
- Clean architectural separation between gameplay logic, physics, procedural generation, and presentation.

M5 does **not** inherit completed scoring, Graze mechanics, result screens, or polished death-to-retry flows. Those constitute the primary scope of M5 and must be planned through an approved M5 parent plan before implementation begins.

---

## Closeout checklist

Before merging this completion report:

- [x] Planned scope and actual delivery are clearly separated.
- [x] Main implementation Issues/PRs are linked (#79–#83, #86, #89, #116–#127, #130–#136, #138, #142, #147, #151–#154, #160, #165, #166).
- [x] Automated validation is recorded accurately (393 tests, 56 test files, 50,000m soak).
- [x] Manual/device evidence is recorded only when actually performed (playtest pass; missing device metadata noted).
- [x] Deferred work is explicit and linked (Track B: #102, #140, #141, #143; M5: #85, #90, #94, #84).
- [x] Supporting maintenance is separated from milestone product scope (#106, PR #137, PR #165, PR #157, PR #164, reference docs).
- [x] Product/architecture decision states are accurate (prototype tuning preserved).
- [x] Exit decision is explicit (all #116 exit criteria satisfied; Game Director acceptance).
- [x] Next-milestone inheritance is explicit (M4 capabilities inherited; M5 core scope unstarted).
- [x] `bun run ci:check` passes.
- [x] `bun run typecheck` passes.
- [x] `bun run test` passes.
- [x] `bun run build` passes.
