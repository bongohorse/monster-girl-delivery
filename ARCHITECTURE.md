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

## 5. Time authority

`TimeService` is the shared authority for gameplay simulation time.

Responsibilities:

- accept the frame timing supplied by the Phaser/application loop;
- expose normalized simulation delta in seconds;
- clamp unreasonable simulation steps;
- represent pause/resume state;
- prevent inactive/background time from creating physics jumps.

Rules:

- gameplay movement is time-based, not frame-count based;
- do not duplicate delta clamping in individual gameplay classes;
- lifecycle transitions must keep time state coherent.

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

A larger physical viewport must not accidentally grant a large gameplay reaction-time advantage.

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

The dedicated seeded gameplay PRNG, explicit run-generation state, logical hazard-pattern data model, deterministic pattern selection, pure prototype fairness validation, deterministic logical spawn scheduling, live generated-hazard integration, and development-only same-seed restart tooling are current M3 infrastructure. Focused reproducibility evidence remains planned until its M3 task lands.

Target flow:

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
