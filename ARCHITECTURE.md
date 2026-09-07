# Architecture — Monster Girl Delivery

This document owns the project's **technical stack and architecture boundaries**. Product/game rules belong in [`MASTER_SPEC.md`](MASTER_SPEC.md); milestone sequencing belongs in [`docs/ROADMAP.md`](docs/ROADMAP.md); commands and workflow belong in [`DEVELOPMENT.md`](DEVELOPMENT.md).

## 1. Architecture goals

The codebase is designed for:

- mobile-first runtime behavior;
- deterministic gameplay where practical;
- frame-rate-independent simulation;
- headless testing of game rules;
- small, reviewable changes;
- one shared gameplay codebase across target platforms where practical;
- AI-assisted development without unnecessary abstraction.

Avoid enterprise architecture, parallel implementations of the same responsibility, and speculative framework layers.

## 2. Technical stack

The current foundation uses:

| Layer | Technology |
|---|---|
| Game framework | Phaser 4 |
| Language | TypeScript |
| Runtime / package manager / scripts | Bun |
| Dev/build | Vite |
| Production bundling | Vite-integrated build pipeline / Rolldown where provided by Vite |
| Code quality | Biome |
| Tests | Vitest |
| Version control | Git |
| CI/CD | GitHub Actions |
| Dependency automation | Renovate |

Exact installed versions belong to `package.json` / `bun.lock`, not duplicated here.

Do not replace a foundation technology or add a parallel build/runtime stack without an approved architecture/tooling task and a concrete reason.

## 3. Ownership model

```text
Presentation / Phaser integration
        ↓
Gameplay state and rules
        ↓
Core services / configuration
        ↓
Platform input + lifecycle adapters
```

Developer tools observe/tune these systems but must not become a second gameplay implementation.

General ownership:

```text
Scene / game orchestration → coordinates high-level flow
Entity                   → owns entity-specific state/presentation boundary
System                   → owns reusable gameplay rules/processes
Service                  → owns cross-cutting infrastructure
Input adapter            → converts device events into InputService intent
Developer tool           → observes/tunes development state only
```

Do not hide authoritative gameplay state inside UI/debug objects.

## 4. Current repository structure

Current major runtime directories are:

```text
src/
├── config/       runtime/prototype configuration
├── core/         cross-cutting application/game services and state
├── devtools/     Director/debug tooling
├── entities/     gameplay entity boundaries
├── game/         Phaser game bootstrap, layouts, and scenes
│   └── scenes/
├── generation/   deterministic seeded generation state and rules
├── hazards/      hazard-domain rules/presentation boundaries
├── input/        InputService and device/input adapters
├── systems/      reusable gameplay systems
└── main.ts       application entry point
```

This is a description of the current major structure, not a requirement to create an empty directory for every future concept.

Supporting project areas include tests, Vite configuration, GitHub Actions, Codespaces configuration, and public runtime files.

## 5. Time authority and simulation-step policy

`TimeService` is the sole authority for gameplay simulation time.

Responsibilities:

- accept the frame timing supplied by the Phaser/application loop;
- expose normalized simulation delta in seconds;
- clamp unreasonable simulation steps;
- represent pause/resume state;
- prevent inactive/background time from creating physics jumps.

### Simulation-step policy

The project operates under an explicit **variable-delta simulation policy**:

- **Normalized variable delta**: Authoritative gameplay consumes normalized `TimeService` delta in seconds. Display refresh rate or render update frequency must never define gameplay behavior.
- **No central fixed-step accumulator**: Authoritative simulation advances once per frame using the clamped, normalized delta. The engine does not accumulate elapsed time into fixed quanta or run an inner catch-up step loop.
- **Local resolution of step sensitivity**: Any gameplay system that is mathematically step-sensitive must resolve that sensitivity locally rather than imposing a global fixed timestep. Supported local remedies include:
  - analytical integration (e.g. vertical flight free-motion integration under gravity, thrust, and velocity caps);
  - exact boundary handling (e.g. analytical flight ceiling/floor contact root-solving and post-contact motion; reactive target-lock exact warning-to-lock boundary sampling);
  - continuous / swept logical intersection (e.g. swept hazard collision evaluating continuous player trajectory polynomials and patrol reversals across the step);
  - explicit bounded subdivision only where mathematically necessary and strictly bounded in computational cost.
- **Verification standard**: Any new or modified gameplay authority where frame-partition sensitivity is plausible must pass representative headless frame-partition evidence across 30, 60, 90, 120, and 144 Hz schedules plus deterministic jitter before adoption.
- **Central accumulator threshold**: A central fixed-step accumulator must not be introduced without new, reproducible evidence demonstrating that local analytical or continuous methods cannot preserve correctness for an authoritative system.
- **Single clock invariant**: Do not introduce a second gameplay clock, separate physics timer, or independent accumulator.
- **Framework physics boundary**: If Phaser-owned physics (such as Arcade Physics or Matter.js) is ever adopted, its built-in fixed-step or variable-delta mechanics must be explicitly reconciled with `TimeService` to ensure a single time authority.
- **Profiling isolation**: Profiling telemetry and raw frame intervals (such as `actualFps` or `rawDelta` in the Director performance HUD) are presentation and diagnostic tools only; they must never feed back into `TimeService` or influence gameplay simulation.

## 6. Input boundary

`InputService` converts platform/device input into high-level gameplay intent.

Current input sources include:

- touch/pointer;
- mouse;
- Space key.

Concept:

```text
Device event
   ↓
platform/input adapter
   ↓
InputService
   ↓
high-level intent (for example thrustHeld)
   ↓
gameplay
```

Requirements:

- track active pointer identity where needed;
- handle down/up/cancel/interruption;
- support explicit gameplay blocking;
- prevent UI/debug interaction from leaking into gameplay input;
- release held intent on lifecycle interruption.

Gameplay entities must not create a parallel raw-input path.

## 7. Lifecycle boundary

Browser/Phaser lifecycle events are coordinated through the existing lifecycle infrastructure rather than handled independently by every gameplay object.

The combined lifecycle state must:

- release active gameplay input when appropriate;
- pause simulation time coherently;
- prevent a giant first resume delta;
- support safe cleanup/restart behavior.

## 8. Viewport and scaling

Viewport handling is an application-level concern.

Requirements:

- dynamic resizing;
- no hardcoded physical screen width as a gameplay rule;
- safe-area-aware UI placement;
- fairness across device aspect ratios;
- Landscape as the decided core orientation target while still handling live resize and varied Landscape dimensions.

Gameplay geometry and UI safe areas are related but distinct concerns.

`PrototypeFlightLayout` owns the current dynamic vertical prototype. The authored baseline is 390
logical units with a fixed floor anchor at 362. For safe viewport heights above 390, it extends the
ceiling from 28 upward by the extra height and translates presentation by that same amount. Negative
logical Y is valid. This keeps player/hazard sizes, floor collisions and ground alignment intact
while using the full safe height. Short viewports retain the existing baseline fit-down. Foundation
uses these bounds for stepping and resize clamping without resetting run distance, PRNG or lifecycle
state; a restart initializes the player at the current corridor's center.

This implements the Director's staged viewport decision, not a hazard rebalance. Generation and
reachability still validate the authored baseline, and hazards remain in its lower band. Their
existing validation evidence does not certify the expanded flight domain or cross-device gameplay
equivalence; covering that space belongs to the subsequent hazard/flight work.

A larger physical viewport must not accidentally grant a large gameplay reaction-time advantage.

M4 hazard-approach scheduling converts a typed **PROTOTYPE** minimum reaction time and the authoritative run-speed snapshot into a logical distance horizon. Viewport width is not an input. Accepted hazards keep immutable positions and scheduling-time timing snapshots when speed changes. A deterministic transition boundary rejects a requested speed increase unless every scheduled future hazard still meets the minimum reaction time; the current applied speed remains authoritative when rejected. An accepted larger horizon pushes only the unscheduled cursor far enough to preserve the new minimum, while decreases apply immediately and retain extra lead. The structured decision exposes the limiting target and maximum safe speed for later diagnostics without teleporting existing hazards.

The integrated M4 live policy adds a pending-content constraint to speed changes in either direction and to Director flight-tuning changes. Accepted encounters retain their applied speed and flight tuning until both their readability reservations and geometric exit distance have cleared. Scheduling leaves recovery space while a change waits, then rebases the previous exit through that free space using the old parameters before applying the requested values. The gameplay loop consumes the retained policy flight tuning. Unscheduled encounters always rebase to the current reaction horizon; bounded scheduling or trajectory rejection leaves a deterministic recovery gap and remains retryable. Exit envelopes retain bounded, correlated one-switch flight trajectories checked against every accepted hazard’s swept geometry; this conservative prototype can reject playable content when no sampled trajectory survives.

Live readability limits intersect the candidate phase request with the strictest pacing phase occupied by its actual reservation window, including telegraph lead-in and trailing lifetime. Half-open windows allow an exact phase-end handoff. Foundation resolves parameters before simulation with scheduling disabled, then advances flight and lifecycles, ages existing reservations by the completed delta, and fills the stream. Newly accepted lifecycles initialize at zero elapsed time in that post-step pass, sharing the new reservations’ time origin.

M4 pattern reachability remains a pure logical validation rule. It reuses the authoritative analytical vertical-flight integrator to compute conservative continuous-thrust and released-input position extremes over the available reaction time. Hazard-free vertical corridors are reduced by the player collision extents into safe center-position ranges; inclusive intersection with the reachable envelope passes. The context carries explicit flight state and tuning, defaulting to a **PROTOTYPE** representative state for live generation, and never reads Phaser, FPS, viewport size, or presentation state.

M4 consecutive-encounter fairness adds a pure transition layer above that single-pattern rule. A bounded **PROTOTYPE** envelope retains correlated representative position/velocity states at the previous encounter exit; the validator compares those states with the next pattern's first eligible safe corridors, using conservative swept archetype geometry and logical transition distance ÷ authoritative scroll speed. A transition passes when at least one represented exit state can reach the entry requirement, including exact safe-edge contact. Isolated pattern failures and transition failures remain distinct structured scheduler evidence. The scheduler can apply this context without spawning rejected entries or changing its one-PRNG-step-per-candidate contract; live envelope ownership and encounter-policy activation landed in #120.

M4 difficulty is owned by a pure distance-to-snapshot authority with an explicit capped **PROTOTYPE** tier configuration. The snapshot centralizes speed scale, reaction and corridor targets, spacing, and pattern entry/density eligibility. Consumer adapters translate that snapshot into existing run-motion, timing, validator, and catalog boundaries without bypassing their validation. Difficulty deliberately contains no pacing/intensity state; full live encounter-policy integration landed in #120.

M4 pacing has its own pure distance-to-snapshot authority in `src/pacing/`. An explicit repeating **PROTOTYPE** cycle alternates breather, low, medium, high, and peak pressure. Immutable snapshots expose intensity, cycle/phase indices, distance boundaries, remaining distance, and pressure ceilings for encounter selection and later Director diagnostics. The cycle consumes no PRNG draws and requires an explicit breather in its configuration. Whole logical phase lengths keep cycle boundaries stable; authoritative run distance may be fractional. Pausing progress holds the snapshot, and restarting at zero restores the opening phase.

The pacing adapter requests entry/density limits and a maximum pattern span. For future encounters, callers derive pacing at the proposed pattern start distance so authored spans cannot cross the next phase boundary. Filtering preserves catalog order, may return no matching content, and never falls back to higher pressure. Callers must handle empty selections explicitly, intersect pacing with difficulty eligibility, and retain hard geometry/reachability validation. Full live scheduling and gap handling landed in #120, and Director panel integration landed in #86.

Each logical hazard pattern owns a required immutable encounter profile. This policy-only metadata records an inclusive difficulty-tier range, allowed pacing intensities, typed behavior tags, a stable variety-family identity, and bounded **PROTOTYPE** whole-unit pressure/readability costs. The constructor validates and snapshots every nested field without importing Phaser or viewport state. Current catalog fixtures declare their values explicitly. The generator itself remains unchanged and profiles consume no random state; combined live policy integration landed in #120.

M4 variety selection uses a separate pure policy over the catalog already admitted by difficulty and pacing. Its explicit serializable state retains the two most recently accepted variety-family identities under the default **PROTOTYPE** policy; rejected candidates never enter history. Fresh families remain primary candidates, while recent families are deferred in authored order for deterministic fallback if required content is scarce or primary candidates cannot pass hard fairness. Explicit policy data may exempt deliberately repeatable families. The state is strictly bounded, the selection consumes no random values, and no fallback may reintroduce a candidate excluded by an upstream requirement. Live state ownership and orchestration landed in #120.

M4 active readability uses a separate pure reservation budget over relative simulation-time windows. Each scheduled encounter occurrence copies its profile pressure/readability costs and carries explicit active, warning, and lethal [start, end) intervals; callers derive those intervals from authoritative logical scheduling and lifecycle data. The default **PROTOTYPE** hard caps are six combined pressure units, six combined readability units, two warning channels, two lethal windows, and 32 tracked pending/active encounters. Pacing or difficulty requests are intersected with rather than substituted for these limits, so a breather may request zero pressure while higher difficulty cannot raise a hard cap. Deferred decisions expose stable metric, actual, limit, and time evidence without changing state. TimeService-normalized delta shifts reservations and removes exact expiries; zero delta preserves occupancy. This policy reads no Phaser, wall clock, physical viewport, or GPU/object count. Live reservation construction and orchestration landed in #120.

Telegraphed hazards use a pure logical lifecycle in `src/hazards/`: warning → lock → active → expired. Callers pass simulation delta already normalized by `TimeService`; Phaser clocks, callbacks, and presentation never own phase timing. The warning phase may update a minimal logical target snapshot, while the warning-to-lock boundary freezes that target for every later phase. Only active is lethal. A step crosses at most one phase boundary so an unexpectedly large delta cannot hide required safe phases, while boundary overflow carries forward to preserve normal frame-partition independence. Immutable state, transition data, **PROTOTYPE** phase durations, and target-relative warning geometry are serializable without Phaser.

The first concrete timed archetype is a non-reactive one-shot pulse. Pattern and spawn data carry its deeply snapshotted lifecycle configuration and `timed-pulse` encounter-policy tag. A pure per-spawn simulation keyed by deterministic spawn identity tracks lifecycle state, removes state when a spawn leaves the generated window, and supplies the existing AABB collision authority with the pulse only while Active. The authored hazard center is the fixed lifecycle target, so this prototype does not track the player. Phaser graphics render distinct warning, lock, active, and expired states but cannot decide lethality or advance time. Final content and VFX remain separate future work.

The reactive target-lock strike reuses that per-spawn simulation and generic lifecycle. During Warning, the scene supplies the current logical player run distance and vertical position; the archetype constrains vertical sampling to its authored target band. Lock freezes the effective target snapshot, and Active resolves an immutable collision hitbox at the spawn's fixed horizontal position and locked vertical center. Later player movement cannot alter it. The pattern validator conservatively checks the full authored target sweep, while Phaser only projects the latest/locked marker and active strike. Homing behavior, production interceptor content, and final VFX remain out of scope.

M4 geometric hazards use a small serializable behavior union attached to pattern entries and logical spawns rather than an entity inheritance tree. The first moving prototype is a vertical patrol resolved as a pure triangle wave from authoritative run distance relative to the spawn's immutable leading-edge anchor; it owns no clock and therefore freezes with run progression. Pattern validation conservatively evaluates its full swept vertical extent, then runtime collision continues through the existing logical AABB authority. Phaser presentation only projects the resolved hitbox and gives the moving placeholder a distinct primitive treatment. The historical three-pattern M3 fixture catalog remains stable for replay evidence, while the M4 live catalog appends this prototype for current playtesting.

## 9. Gameplay vs. presentation

Keep deterministic rules independent of Phaser rendering where practical.

Examples of logic that should remain testable without a Canvas when implemented:

```text
flight integration
run-distance progression
collision rules
score rules
Graze rules
difficulty functions
pattern validation
save migrations
```

Phaser scenes/presentation may orchestrate and display these systems, but should not become the only place their rules can be evaluated.

## 10. Randomness and procedural generation

M3 established the dedicated seeded gameplay PRNG, explicit run-generation state, logical hazard-pattern data model, deterministic pattern selection, pure prototype fairness validation, deterministic logical spawn scheduling, live generated-hazard integration, and development-only same-seed restart tooling. The factual result is recorded in [`docs/milestones/M3-seeded-generation-fairness.md`](docs/milestones/M3-seeded-generation-fairness.md), with focused evidence in [`docs/milestones/M3-seeded-run-validation.md`](docs/milestones/M3-seeded-run-validation.md).

Current M3-established flow:

```text
Run generation state
        ↓
seeded gameplay PRNG
        ↓
Pattern Generator
        ↓
Pattern Validator
        ↓
Spawner / presentation
```

Rules:

- gameplay randomness must be reproducible;
- no gameplay `Math.random()`;
- generated hazards/patterns must pass explicit fairness validation;
- generation and validation should remain deterministic/headless-testable where practical.
- hazard approach horizons derive from reaction seconds × authoritative logical scroll speed, not physical viewport width or a screen-edge offset;
- already-scheduled hazards do not move when scroll tuning changes; the authoritative path rejects unsafe increases using a deterministic maximum-safe-speed boundary, while accepted increases adjust only unscheduled content and immutable timing snapshots preserve what was intended when each hazard entered the stream.
- geometrically open pattern corridors must also intersect the conservative vertical-flight envelope for the configured reaction time, player collision extents, flight tuning, and explicit current/representative flight state;
- reachability failures remain structured scheduler rejection data, and only candidates passing both geometry and reachability validation may spawn.
- optional consecutive-encounter validation must compare correlated previous-exit position/velocity samples with the next entry's conservative safe corridors in logical distance/time, distinguish transition failures from isolated pattern failures, and preserve deterministic generator state consumption;
- difficulty snapshots derive only from logical run distance and explicit configuration, remain deterministic and immutable, and never read viewport, frame, wall-clock, or player-failure state;
- difficulty-based eligibility may narrow the candidate catalog but never replaces hard geometry or reachability validation;
- pacing/intensity remains a separate responsibility from difficulty even when both later influence encounter selection.
- pacing pressure ceilings only restrict candidate selection, and explicit recovery windows recur independently of difficulty or random pattern choices; they do not prove sequence-level fairness or active-hazard concurrency limits.
- encounter profiles describe policy eligibility and costs but do not select, weight, validate, or spawn content by themselves.
- recent-history variety state records only accepted family identities, remains explicitly bounded and serializable, consumes no RNG during filtering, and may defer but never override required eligibility or hard fairness;
- active readability reservations use explicit relative simulation-time windows, enforce hard profile-cost and warning/lethal concurrency caps, expire only through normalized simulation delta, and remain bounded independently of render-object counts;
- telegraphed hazard timing consumes only normalized simulation delta, freezes target information at lock, and keeps logical lethality separate from warning presentation.

## 11. Director/developer tools

Director tools are development infrastructure.

They may expose:

- runtime tuning;
- diagnostics;
- hitboxes/debug geometry;
- deterministic run/seed information;
- test-state controls.

They must:

- use the same authoritative runtime state/configuration as gameplay;
- avoid owning a duplicate tuning state;
- stay isolated from production gameplay responsibilities;
- remain easy to exclude/disable in production builds.

The Director performance HUD is read-only instrumentation split between a pure sampler and a lightweight DOM presentation. `PerformanceSampler` records Phaser `game.loop.rawDelta` into a fixed-capacity ring buffer in O(1) work per valid frame; rolling percentiles are computed only on the capped display refresh. `DirectorPerformanceHud` shows Phaser `actualFps` alongside raw frame-time statistics outside the Phaser renderer, suppresses gameplay input around its eye/reset controls, and is created only in Director Mode. Lifecycle-paused frames and the first resume frame are rejected so suspension time cannot contaminate the session. Neither measurement nor presentation feeds values back into `TimeService` or gameplay.

## 12. Persistence

Persistence is **planned architecture** for the approved later roadmap scope.

Target boundary:

```text
Gameplay / meta systems
        ↓
SaveManager
        ↓
Storage adapter
        ↓
local browser storage / later platform storage
```

Rules when implemented:

- gameplay systems do not access `localStorage` directly;
- saves are versioned;
- schema migrations are explicit;
- platform-specific storage stays behind adapters.

## 13. Assets

The production asset pipeline is not fully implemented yet. Do not describe planned folders/tools as if they already exist.

Approved target flow:

```text
assets/raw
    ↓
assets/source
    ↓
assets/processed
    ↓
validation / atlas or processing steps where useful
    ↓
public/assets
```

The exact processing tools, formats, atlas rules, and budgets remain implementation decisions for the relevant art/asset work.

## 14. Platform abstraction

Avoid scattering browser/mobile/desktop checks through gameplay.

When platform-specific behavior is required, put it behind small services/adapters so gameplay rules remain platform-agnostic where practical.

## 15. Architecture change rule

Do not treat a future diagram in this document as current implementation scope.

A major architecture change should be driven by an approved task and should update this document when it changes an established ownership boundary. Historical milestone details belong in [`docs/milestones/`](docs/milestones/), not here.
