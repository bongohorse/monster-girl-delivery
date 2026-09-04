# Monster Girl Delivery — Master Spec

**Document status:** Living product/game specification  
**Project status:** Pre-Production  
**Current milestone:** M2 — Horizontal Run & First Hazard  
**Human role:** Game Director / Product Owner  
**Coding-agent role:** Implementation / Engineering

> [!IMPORTANT]
> This file owns **durable product and game decisions**. It does not own milestone sequencing, technical architecture, development commands, or AI workflow. See [`docs/README.md`](docs/README.md) for the canonical source-of-truth map.

## 0. Decision states

Use these labels consistently:

- **DECIDED** — approved project decision; do not change without the Game Director.
- **PROTOTYPE** — temporary starting value; subject to playtesting.
- **EXPERIMENT** — intentionally undecided; test before locking.
- **TBD** — not decided yet.
- **FUTURE** — valid direction/possibility outside current scope.
- **OUT OF SCOPE** — explicitly not being built unless the Director reopens it.

Never turn `PROTOTYPE`, `EXPERIMENT`, `TBD`, or `FUTURE` into a permanent rule without an explicit decision.

---

## 1. Project vision

**Working title:** Monster Girl Delivery

**Current core genre:** 2D endless sidescroller / one-button flight arcade game with a future character-collection/gallery meta layer.

**Current core fantasy:** Control a monster-girl courier through an increasingly dangerous cityscape. Hold to thrust upward, release to fall, dodge hazards, eventually graze danger for extra reward/score, survive as long as possible, and use later run rewards to expand collection/gallery systems.

### Design pillars

1. Easy to understand immediately.
2. Responsive, satisfying one-touch movement.
3. Fair but demanding hazards.
4. Short, repeatable runs.
5. Risk/reward through Graze when that later system is introduced.
6. Strong anime/chibi monster-girl identity.
7. Fast iteration for the Game Director.
8. Maintainable, deterministic implementation where practical.

Future delivery-specific modes, finishable deliveries, cargo rules, Companions, HQ systems, and other extensions remain ideas until explicitly promoted from [`docs/BACKLOG.md`](docs/BACKLOG.md).

---

## 2. Platform strategy

### DECIDED

Priority order:

1. **Mobile-first gameplay design and testing**
2. **Web browser as primary development/test distribution**
3. **Android/iOS later**
4. **Steam/Desktop later**

One gameplay codebase should remain the source for all platforms where practical.

### Orientation

- **Landscape — DECIDED** for the current core game.
- Core spatial flow reads **left → right**.
- Landscape was selected after the Director accepted the M1 smartphone/tablet evidence recorded in [`docs/milestones/M1-device-report.md`](docs/milestones/M1-device-report.md).

### FUTURE

- Portrait may return as a separate mode/variant; it is not current core gameplay.
- Android/iOS packaging.
- Desktop/Steam packaging.
- PWA evaluation if it later solves a real distribution/product need.

### OUT OF SCOPE for current development

- platform-specific monetization;
- store-specific content variants;
- store compliance implementation before release preparation.

---

## 3. Engineering stack constraints

### DECIDED

The current project foundation uses:

| Layer | Technology |
|---|---|
| Game framework | Phaser 4 |
| Language | TypeScript |
| Runtime/package manager/scripts | Bun |
| Dev/build | Vite |
| Production bundling | Vite-integrated build pipeline / Rolldown where provided by Vite |
| Code quality | Biome |
| Tests | Vitest |
| Version control | Git |
| CI/CD | GitHub Actions |
| Dependency automation | Renovate |

Actual installed versions are defined by `package.json` / `bun.lock`, not copied into this specification.

Technical ownership and workflow details live in [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DEVELOPMENT.md`](DEVELOPMENT.md).

---

## 4. Core input and gameplay loop

### DECIDED input

The player uses one core action:

- Hold touch / mouse / Space → thrust upward.
- Release → thrust stops and gravity pulls downward.

The same action must flow through the platform-independent input abstraction.

### Current intended core loop

```text
Start Run
  ↓
Fly / Dodge / Collect
  ↓
Survive
  ↓
Crash / End Run
  ↓
Results / Rewards (later complete loop)
  ↓
Restart
```

Graze, scoring, rewards, collection, and Gallery enter only in their approved later milestones.

### Run length

**TBD.** Short repeatable runs are the intent. Do not hardcode a final target duration yet.

---

## 5. Player physics

### PROTOTYPE tuning

```text
gravity          = 1400 px/s²
thrust           = 2200 px/s² upward
maxFallVelocity  = 650 px/s
maxRiseVelocity  = 550 px/s upward
baseScrollSpeed  = 350 px/s
```

These values are prototype tuning and must remain configurable where the current Director tooling supports them.

### DECIDED principles

- Physics is frame-rate independent.
- Time-based movement uses elapsed simulation time.
- `TimeService` supplies the authoritative simulation delta.
- Inactive/background time must not produce physics teleportation.
- Floor and ceiling are currently safe boundaries.
- Hazard collision is the initial lethal condition.

---

## 6. Viewport, scaling, and devices

### DECIDED

The game must adapt to:

- phones;
- tablets;
- foldables;
- desktop browsers;
- later native mobile/desktop builds.

Physical screen size must not directly determine gameplay fairness.

Landscape is the core target orientation, but viewport systems must still handle resize and different Landscape aspect ratios. Selecting Landscape as a product target does not itself require a runtime orientation lock.

### Fairness principle

Additional visible area must not accidentally grant a large reaction-time advantage.

Future generated hazards should be constrained by time-to-impact/reachability/fairness rules rather than relying only on raw screen-edge distance.

### Safe-area principle

UI must account for cutouts, notches, rounded corners, and home indicators. Gameplay world geometry and UI safe area are separate concerns.

---

## 7. Input behavior

### DECIDED

All gameplay input goes through `InputService`.

Supported sources:

- touch/pointer;
- mouse;
- keyboard Space.

Requirements:

- touch/pointer handling tracks active pointer identity where needed;
- cancellation/lifecycle interruption releases held input safely;
- UI/debug interaction can block gameplay input explicitly;
- gameplay entities do not create parallel raw device-input paths.

---

## 8. Mobile/browser lifecycle

### DECIDED

The game must safely handle:

- visibility changes;
- focus loss;
- app/browser backgrounding;
- resume;
- resize/orientation changes.

A paused/inactive application must not accumulate a giant simulation delta.

A future user-visible resume UX may be added, but the exact presentation is **TBD**.

---

## 9. Hazards and fairness

### M2 — CURRENT

M2 introduces:

- one deterministic placeholder hazard type;
- explicit player/hazard collision;
- prototype run-death state;
- restart path;
- Landscape validation.

Randomized/procedural hazard generation is not part of M2.

### FUTURE

Potential hazard families may later include:

- static obstacles;
- dynamic obstacles;
- projectiles/interceptors;
- warning indicators;
- barriers/lanes;
- moving hazards.

### DECIDED fairness principles

Generated hazard content must eventually respect explicit constraints such as:

- minimum reaction time;
- reachable player movement;
- safe corridor dimensions;
- unsafe overlapping combinations;
- warning/lock/impact timing where relevant.

The game must not rely on unconstrained random placement.

---

## 10. Graze

### FUTURE — roadmap M5 scope

Graze is the intended risk/reward near-miss mechanic.

Concept:

```text
Core hitbox       → collision / death
Outer Graze zone  → near miss / reward
```

A hazard/projectile should normally reward a Graze only once per pass.

Exact hitbox dimensions, reward values, and presentation remain non-final until the focused system is implemented and tested.

---

## 11. Procedural generation, seeds, difficulty, and pacing

### FUTURE — generation begins in M3

Gameplay runs should become reproducible through a dedicated seed/state model.

Target concept:

```text
seed
run distance/state
pattern index
PRNG state
```

Target generation flow:

```text
Seed / Run State
      ↓
Pattern Generator
      ↓
Pattern Validator
      ↓
Spawner
```

Gameplay randomness must use the dedicated seeded gameplay PRNG once introduced.

Large randomized test samples are useful evidence but do not mathematically prove every future seed safe.

### FUTURE — difficulty/pacing expands in M4

Difficulty should primarily evolve through deterministic run progression rather than unrelated random adjustments.

An earlier prototype formula remains only an example, not a locked rule:

```text
tier = min(10, floor(distance / 250))
speed = baseSpeed * (1 + 0.04 * tier)
```

Difficulty and pacing must be tuned through playtesting. Pacing should include readable pressure/recovery rather than permanent maximum intensity.

---

## 12. Score, results, and run rewards

### FUTURE — complete arcade loop in M5

Score may eventually reflect:

- distance;
- survival;
- Graze;
- combos/multipliers or other approved skill signals.

Exact formulas and reward values are **TBD**.

The result/restart flow should remain low-friction and support fast replay.

---

## 13. Economy, collection, Gallery, and character ownership

### DECIDED principles

For the initial development/release direction:

- local-first;
- offline-first;
- no real-money mechanics in the approved roadmap;
- economy/content data should be data-driven where practical;
- no final currency names, costs, rates, or gacha rules are locked.

### FUTURE — roadmap M7+

Possible meta concepts include:

- run rewards;
- collection;
- characters/skins;
- Gallery;
- economy framework;
- other explicitly promoted backlog systems.

Whether playable characters have gameplay-affecting abilities or remain cosmetic/sidegrade-based is **TBD**. Architecture must not assume character power systems before that decision exists.

Random paid rewards/gacha are not approved current roadmap requirements.

---

## 14. Persistence

### FUTURE — roadmap M7

Initial persistence target: local storage through a centralized `SaveManager` boundary.

Requirements when implemented:

- versioned schema;
- migration paths;
- development export/import/reset support;
- gameplay systems do not access browser/platform storage directly.

Exact schema remains **TBD**.

---

## 15. Director / developer tooling

### DECIDED development principle

The Game Director should be able to tune and diagnose prototype systems without editing source for every small adjustment.

Director tooling may support, as relevant to implemented systems:

- live prototype tuning;
- FPS/viewport/orientation diagnostics;
- input/lifecycle state;
- hitbox/debug visualization;
- seed/pattern visibility;
- same-seed restart;
- test-state navigation;
- runtime configuration export/import.

Director tooling must remain isolated from production gameplay and use the same authoritative runtime state/configuration rather than maintaining a parallel version.

---

## 16. Asset-production principles

### DECIDED

The intended production asset stages are:

```text
assets/raw
    ↓
assets/source
    ↓
assets/processed
    ↓
public/assets
```

This is a production-flow decision, not a claim that every folder/tool is already implemented.

Principles:

- runtime assets are optimized for target devices;
- use atlases where they provide a real runtime/production benefit;
- choose image formats by transparency, quality, size, and platform/browser support;
- do not lock arbitrary asset dimensions before camera/device-scale testing.

Exact processing/atlas tooling remains **TBD** until the relevant production work is approved.

Detailed future art/pipeline exploration belongs in [`docs/BACKLOG.md`](docs/BACKLOG.md).

---

## 17. Audio

### FUTURE

Audio should eventually be centralized behind an application-level audio boundary/service.

Plan for:

- BGM;
- SFX;
- UI audio;
- volume categories;
- mute;
- browser/mobile user-gesture restrictions.

Exact codecs, mastering, and production workflow remain **TBD**.

---

## 18. UI and accessibility

### DECIDED principles

UI should be:

- responsive;
- safe-area aware;
- touch-friendly;
- readable at mobile sizes;
- independent of authoritative gameplay simulation.

Accessibility is a quality requirement, not permission to introduce a large framework prematurely.

Future considerations may include:

- adequate touch-target sizes;
- readable contrast;
- non-color-only feedback;
- reduced-motion support where useful;
- volume controls.

---

## 19. Localization

### FUTURE / TBD

Do not introduce a full localization framework before text/content needs justify it.

Avoid scattering user-facing strings throughout gameplay-rule code. When text-heavy UI begins, introduce a simple centralized content/text structure first.

---

## 20. Performance

### DECIDED

Mobile performance is first-class.

Targets/principles:

- smooth 60 FPS where target hardware permits;
- frame-rate-independent gameplay;
- controlled particle/object counts;
- avoid unnecessary per-frame allocations;
- use pooling where repeated temporary objects justify it.

Exact minimum supported devices remain **TBD** and should be set from real-device evidence rather than guesses.

---

## 21. Release and online-service boundaries

### DECIDED current direction

- GitHub Pages is the initial web deployment target.
- The project does not currently require Cloudflare or a backend.
- Mobile packaging/release work belongs to the approved later roadmap.
- Desktop/Steam should not block the initial mobile-first release unless explicitly promoted.

### Explicitly not building yet

Unless reopened by the Director:

- online backend;
- accounts/login;
- multiplayer/PvP;
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

---

## 22. Roadmap ownership and current scope

[`docs/ROADMAP.md`](docs/ROADMAP.md) is the **single source of truth for milestone sequencing and milestone-level future scope**.

This specification intentionally does not duplicate the complete M0–M9 roadmap. That avoids the drift previously caused by maintaining two milestone lists.

Current milestone:

- **M2 — Horizontal Run & First Hazard**
- Parent Issue: [#49](https://github.com/bongohorse/monster-girl-delivery/issues/49)

Current focused scope is defined by that parent Issue and its approved child Issues, within the durable product/architecture constraints documented here.

Completed milestone history and evidence live under [`docs/milestones/`](docs/milestones/).

---

## 23. Future ideas and open design questions

[`docs/BACKLOG.md`](docs/BACKLOG.md) is the single preserved store for future gameplay, art, progression, economy, tooling, mode, and content ideas.

An item in the backlog is **not** a product decision or implementation requirement.

The dedicated [`docs/ENDLESS_RUNNER_BLUEPRINT.md`](docs/ENDLESS_RUNNER_BLUEPRINT.md) is reference material, not scope.

Promotion path:

```text
Backlog / reference idea
→ discussion / research / prototype
→ Game Director decision
→ MASTER_SPEC and/or ROADMAP when appropriate
→ focused GitHub Issue
→ implementation
```

---

## 24. Decision log

### 2026-09-03

- Phaser 4 + TypeScript selected for the game foundation.
- Bun selected for runtime/package management/scripts.
- Vite selected for the development/build workflow.
- Biome selected for formatting/linting.
- Vitest selected for deterministic/headless tests.
- GitHub Actions selected for CI/web deployment.
- Renovate selected for dependency automation.
- Mobile-first direction established; browser remains the primary development/test distribution.
- Local/offline-first established.
- No real-money mechanics in the initial approved direction.
- M1 smartphone/tablet evidence in [`docs/milestones/M1-device-report.md`](docs/milestones/M1-device-report.md) accepted as sufficient to continue the mobile-first project.
- Landscape selected as **DECIDED** for the current core game; Portrait retained only as a **FUTURE** separate mode/variant possibility.
- M1 completed and M2 — Horizontal Run & First Hazard became current.
- Replay, telemetry, Cloudflare/backend infrastructure intentionally postponed.

### 2026-09-04 — documentation ownership cleanup

- `docs/ROADMAP.md` is the sole owner of milestone sequencing; the duplicate milestone list was removed from this specification.
- Agent workflow, CI, Codespaces, repository layout, and detailed development procedure are owned by their dedicated documentation instead of being duplicated here.
- Future ideas remain centralized in `docs/BACKLOG.md`.