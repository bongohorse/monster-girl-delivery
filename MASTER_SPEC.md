# MONSTER GIRL DELIVERY — MASTER SPEC

**Status:** Pre-Production / Hazards, Graze and Fairness
**Document status:** Living specification
**Current milestone:** M2 — Hazards, Graze and Fairness
**Role of human:** Game Director / Product Owner
**Role of coding agents:** Implementation / Engineering

## 0. Decision States

Use these labels throughout project documentation:

- **DECIDED** — approved project decision; do not change without the Director.
- **PROTOTYPE** — temporary starting value; subject to playtesting.
- **EXPERIMENT** — intentionally undecided; test before locking.
- **TBD** — not decided yet.
- **FUTURE** — valid idea, but outside the current milestone.
- **OUT OF SCOPE** — explicitly not being built unless the Director reopens it.

Never turn a PROTOTYPE, EXPERIMENT, TBD, or FUTURE item into a permanent rule without an explicit decision.

---

## 1. Project Vision

**Working title:** Monster Girl Delivery

**Genre:** 2D endless sidescroller / one-button flight arcade game with a character-collection/gallery meta layer.

**Core fantasy:** Control a monster-girl courier through an increasingly dangerous cityscape. Hold to thrust upward, release to fall, dodge hazards, graze danger for extra score, survive as long as possible, and use run rewards to expand a collection/gallery.

**Design pillars:**

1. Easy to understand immediately.
2. Responsive, satisfying one-touch movement.
3. Fair but demanding hazards.
4. Short, repeatable runs.
5. Risk/reward through Graze.
6. Strong anime/chibi identity.
7. Fast iteration for the Game Director.
8. AI-friendly, maintainable implementation.

---

## 2. Platform Strategy

### DECIDED

Priority order:

1. **Mobile-first gameplay design and testing**
2. **Web browser as primary development/test distribution**
3. **Android/iOS later**
4. **Steam/Desktop later**

One gameplay codebase should remain the source for all platforms where practical.

Current core orientation:

- **Landscape — DECIDED** as the target orientation for the current core game.
- The left-to-right endless-sidescroller flow benefits from landscape's forward view and reaction space.
- The Director based this decision on the accepted smartphone/tablet results in the [M1 real-device report](docs/m1-device-report.md).

### FUTURE

- Portrait may be revisited as a separate mode or variant, but is not part of the current core mode.
- Android/iOS packaging, likely via Capacitor.
- Desktop/Steam packaging, likely via Tauri or another suitable wrapper.
- PWA may be considered later, but is not part of the current architecture.

### OUT OF SCOPE for current development

- Platform-specific monetization.
- Store-specific content variants.
- Store compliance implementation.

These are product/release decisions to revisit close to release.

---

## 3. Technology Stack

### DECIDED

| Layer | Technology | Purpose |
|---|---|---|
| Game | **Phaser 4** | 2D game framework |
| Language | **TypeScript** | Game/application code |
| Runtime / package manager | **Bun** | Runtime, dependencies, scripts |
| Dev/build | **Vite 8** | Dev server and build pipeline |
| Bundler | **Rolldown** | Vite-integrated production bundling |
| Code quality | **Biome** | Formatting and linting |
| Tests | **Vitest** | Unit/headless system tests |
| Version control | **Git** | Source control |
| CI/CD | **GitHub Actions** | Validation and web deployment |
| Dependency updates | **Renovate** | Automated dependency update PRs |
| AI code review/implementation support | **Google Jules** | Repository-aware autonomous tasks/PRs |

Phaser 4 officially provides a CLI with Bun/Vite/TypeScript project options and positions itself as AI-ready. Current Phaser 4 stable release during preparation is 4.2.1. Keep actual installed versions pinned by the project lockfile/package manager. 

---

## 4. Development Model

The project is **AI-first**.

### Human

The Game Director:
- defines product intent;
- decides gameplay and content;
- tests the game;
- accepts/rejects results;
- creates or approves priorities.

The Game Director does not manually write application code.

### AI coding agents

Coding agents implement tasks in small, reviewable units.

Primary agents may include:
- Claude Code
- Gemini CLI
- Google Jules

No agent should assume that an idea mentioned in an old discussion is an approved feature. Check this specification and the current task.

---

## 5. First-Run Requirement

When a coding agent first enters an empty/new repository, it must **understand the project before implementing gameplay**.

First-run order:

1. Read `AGENTS.md`.
2. Read this `MASTER_SPEC.md`.
3. Read `ARCHITECTURE.md`.
4. Read `DEVELOPMENT.md`.
5. Inspect the official Phaser starter that was created in the repository.
6. Identify any conflict between the starter and the project documents.
7. Establish the foundation/tooling.
8. Run validation.
9. Only after the foundation is accepted should gameplay implementation begin.

The first implementation milestone is therefore **foundation**, not gameplay.

---

## 6. Core Gameplay

### DECIDED

The player uses one action:

- Hold touch / mouse / Space → thrust upward.
- Release → thrust stops and gravity pulls downward.

The same gameplay action must work through a platform-independent input abstraction.

### Intended core loop

```text
Start Run
  ↓
Fly / Dodge / Graze / Collect
  ↓
Survive
  ↓
Crash / End Run
  ↓
Results / Rewards
  ↓
Collection / Gallery
  ↓
Start another Run
```

### Run length

**TBD.** Short repeatable runs are the design intent; do not hardcode a final duration.

---

## 7. Player Physics

### PROTOTYPE

Initial tuning values are placeholders only:

```text
gravity          = 1400 px/s²
thrust            = 2200 px/s² upward
maxFallVelocity   = 650 px/s
maxRiseVelocity   = 550 px/s upward
baseScrollSpeed   = 350 px/s
```

These values must be configurable and adjustable in Director Mode.

### DECIDED principles

- Physics is frame-rate independent.
- All time-based movement uses elapsed time.
- A centralized `TimeService` supplies the authoritative simulation delta.
- Large inactive/background deltas must never cause physics teleportation.
- Floor and ceiling are initially safe boundaries.
- Hazard collision is the initial lethal condition.

---

## 8. Viewport, Scaling and Devices

### DECIDED

The game must adapt to:
- phones;
- tablets;
- foldables;
- desktop browsers;
- later native mobile/desktop builds.

The physical screen size must not directly determine gameplay fairness.

Landscape is the target orientation for the current core game. Viewport systems must still handle resizing and different aspect ratios; selecting a target orientation does not itself require runtime orientation locking.

### Fairness principle

Additional visible area must not accidentally give a player a large reaction-time advantage.

Hazard spawning should eventually be based on **time-to-impact and fairness constraints**, not only raw screen-edge distance.

### Safe-area principle

UI must account for device cutouts, notches, rounded corners, and home indicators.

Gameplay world and UI safe area are separate concerns.

---

## 9. Input

### DECIDED

All gameplay input goes through `InputService`.

Supported inputs:
- touch / pointer;
- mouse;
- keyboard Space.

Touch uses an active pointer identity rather than relying on `pointerout` alone.

The input abstraction exposes high-level intent such as:

```text
isThrustHeld()
```

UI can explicitly block gameplay input through:

```text
setGameplayBlocked(true | false)
```

UI interaction must never accidentally trigger flight input.

---

## 10. Mobile Lifecycle

### DECIDED

The game must handle:
- visibility changes;
- focus loss;
- app suspension/backgrounding;
- resume;
- resize/orientation changes.

A paused application must not accumulate a giant simulation delta.

Resume behavior may include a short user-visible resume phase later, but the exact UX is **TBD**.

---

## 11. Hazards and Fairness

### M2 — CURRENT MILESTONE

Hazards may include:
- static obstacles;
- dynamic obstacles;
- fast projectiles/interceptors;
- warning indicators;
- barriers/lanes;
- moving hazards.

The game must never rely on unconstrained random placement.

### Fairness principles

Procedural hazards must be checked against:
- minimum reaction time;
- reachable player movement;
- safe corridor dimensions;
- overlapping hazard combinations;
- warning/lock/impact timing.

### Prototype reaction concept

```text
warning phase
→ lock/target phase
→ projectile travel / reaction window
→ impact
```

Exact timings remain **PROTOTYPE/TBD** until gameplay testing validates them.

---

## 12. Graze

### M2 — CURRENT MILESTONE

Graze is a risk/reward mechanic.

Concept:

```text
Core hitbox       → collision / death
Outer graze zone  → near miss / reward
```

An individual hazard/projectile should normally reward a graze only once per pass.

Initial prototype hitbox dimensions discussed previously are not final and should remain configurable.

---

## 13. Procedural Generation and Seeds

### FUTURE / M3+

Every gameplay run should be reproducible through a seed.

Gameplay randomness must use a dedicated seeded PRNG.

Conceptual run state:

```text
seed
 distance
 difficulty tier
 pattern index
 PRNG state
```

Generation flow:

```text
Seed / Run State
      ↓
Pattern Generator
      ↓
Pattern Validator
      ↓
Spawner
```

The validator checks explicit fairness constraints.

Large randomized test samples are useful evidence, but do not claim that a finite sample mathematically proves all future seeds are safe.

---

## 14. Difficulty

### FUTURE / M3+

Difficulty should primarily be driven by progression through the run.

A deterministic difficulty function is preferred to many unrelated random adjustments.

Earlier prototype formula:

```text
tier = min(10, floor(distance / 250))
speed = baseSpeed * (1 + 0.04 * tier)
```

**PROTOTYPE only.** Re-tune through playtesting.

---

## 15. Score and Rewards

### TBD

The run should produce a score influenced by factors such as:
- distance;
- survival;
- Graze;
- possible combo/multiplier systems.

Exact values are not decided.

---

## 16. Economy / Gacha / Gallery

### DECIDED

For the initial development scope:
- local-first;
- offline-first;
- no real-money mechanics;
- economy must be data-driven;
- no final currency name/cost/rates are locked yet.

### FUTURE

Possible meta loop:

```text
Run
 ↓
Rewards
 ↓
Collection / Gacha
 ↓
Characters / Skins / Gallery
```

Whether characters have gameplay-affecting abilities or are purely cosmetic is **TBD**.

No character abilities should be assumed by the architecture unless explicitly approved.

---

## 17. Persistence

### FUTURE / M5+

Initial target: local browser storage through a centralized `SaveManager`.

Requirements:
- versioned save schema;
- migrations for future versions;
- export/import/reset for development;
- gameplay systems must not access storage directly.

Exact save schema is not finalized yet.

---

## 18. Director / Developer Tools

### DECIDED as a development principle

The Game Director must be able to tune and diagnose the game without editing source files for every tiny change.

Director tools should support, as applicable:

- live tuning of prototype values;
- FPS;
- viewport dimensions;
- orientation;
- input state;
- pause state;
- hitbox visualization;
- God Mode;
- seed visibility;
- restart same seed;
- jump to test state later;
- export configuration.

Director tooling must be isolated from normal production gameplay.

---

## 19. Asset Pipeline

### DECIDED

Assets are separated into stages:

```text
assets/raw
    ↓
assets/source
    ↓
assets/processed
    ↓
public/assets
```

Runtime assets should be optimized for the target platform.

Use texture atlases for sprite-heavy content where appropriate.

Do not impose a single image format on every asset; choose formats by quality, transparency, size, and browser/platform support.

### Planned validation

```text
bun run assets:validate
bun run assets:build
```

Exact tooling for image processing/atlas generation remains **TBD** until the first real asset pipeline is implemented.

---

## 20. Audio

### FUTURE

Centralize audio through an `AudioService`.

Plan for:
- BGM;
- SFX;
- UI sounds;
- volume categories;
- mute;
- mobile/browser user-gesture restrictions.

Exact codecs and mastering workflow remain **TBD**.

---

## 21. UI and Accessibility

### DECIDED principles

UI should be:
- responsive;
- safe-area aware;
- touch-friendly;
- readable at mobile sizes;
- independent of gameplay simulation.

Accessibility is a quality goal, not a reason to add a framework prematurely.

Possible future considerations:
- adequate touch target size;
- readable contrast;
- non-color-only feedback;
- reduced-motion options where useful;
- volume controls.

---

## 22. Localization

### FUTURE / TBD

Do not add a full localization framework during Foundation unless required.

Do not scatter user-facing strings through gameplay logic.

When text-heavy UI begins, introduce a simple centralized text/content structure first.

---

## 23. Performance

### DECIDED

Mobile performance is first-class.

Target:
- smooth 60 FPS where hardware permits;
- frame-rate-independent gameplay;
- controlled particle counts;
- avoid unnecessary per-frame allocations;
- use pooling where repeated temporary objects justify it.

Exact device minimums are **TBD** and should be defined after the first real-device prototype.

---

## 24. Testing Strategy

### DECIDED

Use Vitest for deterministic/headless logic.

High-value test targets:
- physics calculations;
- graze math;
- score calculations;
- difficulty progression;
- procedural generation;
- fairness validation;
- save migrations.

Do not waste effort testing Phaser internals or trivial visual behavior.

---

## 25. CI/CD

### DECIDED

Every pull request should validate:

1. Biome CI check.
2. TypeScript typecheck.
3. Vitest test suite.
4. Production build.

`main` may deploy the validated web build.

GitHub Pages is the initial web deployment target.

---

## 26. Dependency Management

### DECIDED

Renovate is used for dependency updates.

Rules:
- updates arrive as PRs;
- CI must validate updates;
- do not auto-merge dependency updates initially;
- group low-risk updates where practical;
- major updates should remain clearly visible.

The project should keep its Bun lockfile committed so CI can perform reproducible installs.

---

## 27. AI Agents and Repository Automation

### DECIDED

The repository may use multiple AI agents, but they have different roles.

### Interactive coding agents

Examples: Claude Code, Gemini CLI.

They implement tasks directly in the development environment.

### Google Jules

Jules may independently inspect the repository and create plans/changes/PRs. Jules automatically reads root `AGENTS.md`. Use `AGENTS.md` as the shared contract.

Jules should primarily work through focused Issues/PR tasks, not invent broad product scope.

### Renovate

Renovate handles dependency update PRs.

### Human review remains required

No AI-generated PR should be considered automatically approved merely because CI passes.

---

## 28. Codespaces

### DECIDED

GitHub Codespaces is the primary remote development environment.

The repository should include a `.devcontainer/` configuration so a new Codespace gets a predictable development environment.

The dev container should provide or install:
- Bun;
- Git;
- common shell tools;
- the repository dependencies.

Development ports should support Vite browser testing.

Do not place secrets in the repository.

---

## 29. Cloudflare

### CURRENT DECISION: NOT REQUIRED

The project does **not** require Cloudflare at this stage.

Initial web hosting:

```text
GitHub repository
      ↓
GitHub Actions
      ↓
GitHub Pages
```

Cloudflare may be added later for:
- custom domain/DNS;
- edge/network features;
- Workers/API/backend needs;
- additional deployment/preview strategy.

Do not introduce Cloudflare Workers or a backend before a real requirement exists.

---

## 30. Security / Secrets

### DECIDED

- No API keys in source code.
- No secrets in Git.
- Use GitHub/Codespaces secrets when external services eventually require credentials.
- Local-first development should require no secret at startup.

---

## 31. Repository Structure

Target structure:

```text
monster-girl-delivery/
├── .devcontainer/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   └── renovate.json
├── assets/
│   ├── raw/
│   ├── source/
│   ├── processed/
│   └── manifests/
├── docs/
├── public/
│   └── assets/
├── src/
│   ├── config/
│   ├── core/
│   ├── devtools/
│   ├── entities/
│   ├── hazards/
│   ├── input/
│   ├── scenes/
│   ├── systems/
│   └── ui/
├── tests/
├── tools/
├── AGENTS.md
├── ARCHITECTURE.md
├── DEVELOPMENT.md
├── MASTER_SPEC.md
└── package.json
```

The actual Phaser starter may contain additional files. Do not delete useful starter infrastructure without reason.

---

## 32. Milestones

### M0 — Foundation

- project scaffold;
- Bun/Vite/TypeScript/Phaser setup;
- Biome;
- Vitest;
- CI;
- Codespaces;
- responsive viewport foundation;
- lifecycle foundation;
- `TimeService`;
- `InputService`;
- minimal Director diagnostics.

**No gameplay.**

### M1 — Flight Prototype

**Status: COMPLETE — 2026-09-03.** The Director accepted the mobile-first evidence in the [M1 real-device report](docs/m1-device-report.md) and selected Landscape for the current core game.

- placeholder player;
- thrust/gravity;
- floor/ceiling;
- touch/mouse/keyboard;
- live physics tuning;
- real-device tests;
- orientation decision.

### M2 — Hazards, Graze and Fairness

**Status: CURRENT.**

- hazards;
- warning system;
- collision;
- graze;
- score;
- first fairness rules.

### M3 — Procedural Core

- seeded PRNG;
- patterns;
- validator;
- difficulty;
- deterministic tests.

### M4 — Core Run Loop

- start;
- run;
- crash;
- results;
- restart;
- basic reward result.

### M5 — Meta / Persistence

- SaveManager;
- local persistence;
- economy framework;
- collection/gacha framework;
- gallery framework.

Exact economy remains TBD.

### M6 — Presentation

- production art;
- animation;
- audio;
- VFX;
- UI polish;
- performance tuning.

### M7 — Mobile Release Preparation

- Capacitor evaluation/implementation;
- safe-area polish;
- mobile device matrix;
- store preparation;
- compliance review.

### M8 — Steam / Desktop

- desktop wrapper evaluation;
- gamepad;
- desktop UX;
- Steam integration;
- release preparation.

---

## 33. Explicitly Not Building Yet

Unless reopened by the Director:

- online backend;
- accounts/login;
- multiplayer;
- PvP;
- cloud save;
- real-money purchases;
- advertisements;
- live-service infrastructure;
- telemetry/analytics SDK;
- replay/recording system;
- 3D;
- runtime procedural art generation;
- complex ECS/framework layers;
- unnecessary state-management frameworks.

These can be reconsidered later if the actual product requires them.

---

## 34. Preserved Future Ideas

Ideas are not deleted because they are outside the current milestone. They are kept here or converted into GitHub Issues when useful.

Possible future tasks:

- Director jump-to-distance testing.
- Same-seed restart.
- Advanced fairness/property-based tests.
- Save export/import/reset.
- Texture-atlas automation.
- Asset manifest validation.
- PWA evaluation.
- Gamepad support.
- Steam Cloud evaluation.
- Localization.
- Accessibility improvements.
- Platform-specific content strategy.
- Additional characters and collection systems.

These are **not current implementation requirements**.

---

## 35. First-Run Acceptance Criteria

Before gameplay development begins, the repository foundation should satisfy:

- official Phaser starter is preserved and understood;
- Bun scripts work;
- Biome CI check passes;
- TypeScript typecheck passes;
- Vitest runs;
- production build succeeds;
- Codespaces can recreate the environment;
- Vite can be tested from another device on the local network;
- lifecycle state can be observed;
- input diagnostics work;
- Director diagnostics work;
- CI runs on pull requests and `main`.

---

## 36. Decision Log

### 2026-09-03

- Phaser 4 selected as the game framework.
- TypeScript selected.
- Bun selected for runtime/package management/scripts.
- Vite selected for development/build workflow.
- Vite/Rolldown treated as normal build infrastructure, not separately configured.
- Biome selected for formatting/linting.
- Vitest selected for tests.
- GitHub Actions selected for CI.
- Renovate selected for dependency automation.
- Google Jules planned as an additional repository-aware AI agent.
- Mobile-first direction established.
- Browser remains the easiest development/test target.
- Local/offline-first established.
- No real-money mechanics initially.
- Portrait vs. Landscape initially left experimental pending M1 testing.
- M1 smartphone/tablet evidence in the [M1 real-device report](docs/m1-device-report.md) accepted as sufficient to continue the mobile-first project; unrecorded desktop/browser checks remain deferred to #69.
- Landscape selected as the DECIDED target orientation for the current core game because its left-to-right flow benefits from forward view and reaction space.
- Portrait retained only as a FUTURE separate mode or variant possibility.
- M1 completed and M2 started.
- Replay and telemetry intentionally postponed.
- Cloudflare intentionally postponed.
