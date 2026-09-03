# M0 — Foundation — Completion Report

**Status:** COMPLETE  
**Completed:** 2026-09-03  
**Primary planning issue:** #1  
**Purpose:** Establish a reliable project foundation before any gameplay implementation.

## 1. Planned goal

M0 was intended to make the repository safe and reproducible for future AI-assisted gameplay development without implementing the player, hazards, scoring, procedural generation, economy, or persistence.

The planned foundation covered:

- Phaser/Vite starter preservation where useful;
- Bun project scripts;
- Biome;
- Vitest;
- strict TypeScript checking;
- authoritative simulation timing;
- platform-independent gameplay input;
- lifecycle handling;
- responsive viewport handling;
- minimal Director diagnostics;
- GitHub Actions CI;
- reproducible GitHub Codespaces setup.

## 2. What M0 actually delivered

### Project/tooling foundation

- Phaser 4 + TypeScript + Vite project structure retained as the runtime foundation.
- Bun became the package manager/runtime used by project scripts.
- Standard repository commands were established for development, production build/preview, Biome, TypeScript, and Vitest.
- Biome formatting/lint checks were integrated.
- Vitest deterministic/headless testing was integrated.
- TypeScript validation uses `tsc --noEmit`.
- GitHub Actions validates install → Biome → typecheck → Vitest → production build.
- Codespaces configuration recreates the development environment and exposes the Vite test port.
- The useful Boot/Preloader/Vite starter flow was retained while unreachable stock demo gameplay scenes/logger were removed.

### Simulation-time authority

`TimeService` was introduced as the application-scoped simulation-time authority.

Implemented behavior includes:

- normalized elapsed time in seconds;
- maximum simulation-delta clamping;
- explicit pause/resume state;
- zero simulation delta while paused;
- discard of the first resumed delta so background/inactive time cannot create a movement jump.

A follow-up fix in #5 / PR #10 removed a scene-local direct pause that could have allowed `TimeService` and `LifecycleService` to disagree after Foundation shutdown/restart.

### Input abstraction

`InputService` became the single high-level gameplay-input source.

Implemented behavior includes:

- touch/pointer identity tracking;
- primary mouse/pointer support through the same action path;
- Space-key support;
- pointer down/up/cancel handling;
- release-all behavior for lifecycle interruptions;
- explicit `setGameplayBlocked(...)` support so UI can prevent accidental gameplay input;
- high-level thrust intent rather than gameplay reading Phaser device state directly.

### Lifecycle coordination

A centralized lifecycle layer coordinates browser/Phaser pause reasons with input and time services.

Implemented behavior includes:

- multiple simultaneous pause reasons;
- input release when the application pauses;
- time pause/resume only when the combined lifecycle state requires it;
- adapter cleanup and idempotent destruction.

Issue #6 / PR #11 added regression coverage for:

- touch cancellation;
- pointer-up-outside routing;
- listener cleanup;
- overlapping Phaser/browser lifecycle events;
- adapter destruction.

### Responsive viewport foundation

M0 established responsive viewport state rather than hardcoding a phone resolution.

The foundation tracks:

- live viewport dimensions;
- orientation as observable state;
- safe-area information for UI placement;
- resize events suitable for later real-device testing.

M0 intentionally did **not** choose Portrait or Landscape.

### Director diagnostics

A minimal development diagnostics panel was added to expose information useful to the Game Director, including:

- FPS;
- viewport dimensions;
- current orientation;
- gameplay input state;
- pause/lifecycle state.

This was diagnostics only; live flight tuning did not arrive until M1.

## 3. Architecture decisions established by M0

M0 established durable constraints used by later milestones:

- `TimeService` is the authoritative gameplay simulation-delta source.
- `InputService` is the platform-independent gameplay-input boundary.
- lifecycle interruption must clear held gameplay input and must not produce giant resume deltas;
- viewport size is runtime state, not a hardcoded gameplay constant;
- gameplay rules should be separable from Phaser presentation where practical;
- Director tooling is isolated from gameplay responsibilities;
- deterministic/headless tests are preferred for rules that do not require rendering.

## 4. Validation evidence

Primary foundation PR #2 passed:

- `bun run ci:check`;
- `bun run typecheck`;
- `bun run test` — 14 tests;
- `bun run build`.

Lifecycle consistency follow-up PR #10 passed the same standard checks with 15 tests.

Adapter regression PR #11 also passed the standard repository validation after adding the lifecycle/input adapter coverage.

These automated checks validated the foundation logic and production build. M0 did not claim the later M1 real-device flight validation.

## 5. Main Issues / PRs

| Work | Issue | PR | Result |
|---|---:|---:|---|
| Establish project foundation | #1 | #2 | Core M0 implementation |
| Fix TimeService/LifecycleService shutdown consistency | #5 | #10 | Follow-up correctness fix |
| Add Phaser input/lifecycle adapter regressions | #6 | #11 | Follow-up regression coverage |
| Mark M0 complete and M1 current | #13 | #23 | Historical status transition after M0 exit |

## 6. What M0 deliberately did not deliver

M0 did not implement:

- player flight physics;
- a player gameplay entity;
- hazards or collision death;
- Graze;
- scoring;
- horizontal world scrolling;
- procedural generation or seeded runs;
- economy/gacha/gallery;
- persistence;
- backend, accounts, analytics, or multiplayer;
- final orientation selection.

These omissions were intentional, not missing M0 acceptance criteria.

## 7. Deferred/open work at M0 exit

At M0 exit, the next important unknowns were gameplay-specific:

- whether the one-button flight model felt good;
- the practical prototype physics values;
- real-device behavior;
- Portrait versus Landscape.

Those became M1 work rather than being solved inside Foundation.

## 8. Exit decision

M0 was considered complete because the repository had a reproducible toolchain, authoritative timing/input/lifecycle/viewport boundaries, diagnostics, deterministic tests, and green CI without prematurely implementing gameplay.

The project could therefore move to **M1 — Flight Prototype** with infrastructure responsibilities already separated from gameplay rules.

## 9. What M1 inherited

M1 could safely assume the existence of:

- `TimeService`;
- `InputService`;
- `LifecycleService` and platform adapters;
- viewport/safe-area state;
- responsive scene foundations;
- Director diagnostics;
- Bun/Vite/Biome/Vitest/TypeScript scripts;
- GitHub Actions validation;
- Codespaces development environment.
