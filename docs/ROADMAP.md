# Monster Girl Delivery — Roadmap

**Status:** APPROVED ROADMAP AMENDMENT
**Approved by:** Game Director / Product Owner
**Date:** 2026-09-03
**Current milestone:** M2 — Horizontal Run & First Hazard

This document records the approved milestone structure for Monster Girl Delivery going forward.

M0–M2 are intentionally unchanged. The previous forward-looking M3–M7 outline in `MASTER_SPEC.md` is superseded by this roadmap amendment for future milestone planning. Historical closeout reports in `docs/milestones/` remain factual records and must not be rewritten to match later planning.

The roadmap should be treated as a sequencing and scope guide, not permission to implement FUTURE work early. Each milestone still requires focused issues, explicit dependencies, validation, and a factual closeout before advancing.

---

## M0 — Foundation

**Status: COMPLETE**

Purpose: establish the technical and workflow foundation before gameplay implementation.

Core scope:
- project scaffold;
- Bun / Vite / TypeScript / Phaser setup;
- code quality, tests, CI and Codespaces foundation;
- core timing, input, lifecycle and viewport services;
- minimal Director diagnostics.

---

## M1 — Flight Prototype

**Status: COMPLETE**

Purpose: prove the mobile-first one-button flight model and choose the core orientation.

Core scope:
- placeholder player;
- thrust / gravity flight;
- touch, mouse and keyboard input;
- live prototype physics tuning;
- real-device tests;
- Landscape selected for the current core game.

---

## M2 — Horizontal Run & First Hazard

**Status: CURRENT**

Purpose: turn the vertical flight prototype into the first real left-to-right endless-run foundation.

Core scope:
- deterministic horizontal run progress;
- configurable prototype scroll speed;
- placeholder scrolling-world presentation;
- one deterministic lethal hazard;
- collision, run death and restart;
- focused deterministic tests;
- Landscape device validation and milestone closeout.

Production art, Graze, scoring and procedural generation remain outside M2.

---

## M3 — Seeded Generation & Fairness

Purpose: establish deterministic procedural encounter generation that can be reproduced, tested and rejected when unsafe.

Core scope:
- dedicated seeded gameplay PRNG;
- explicit run-generation state;
- data-driven hazard pattern model;
- deterministic pattern generator;
- fairness validator;
- deterministic run-distance spawn scheduling;
- live generated-pattern integration;
- seed visibility and restart-same-seed tooling;
- reproducibility / fairness validation.

This milestone aligns with the existing M3 parent issue `#57 — Seeded Patterns & Fairness` and its child issues.

**Explicitly not part of M3:** final difficulty curve, production art, Graze, score/economy, large content catalogs.

---

## M4 — Run Systems & Difficulty

Purpose: prove that generated runs remain interesting, readable and fair over time rather than merely producing valid obstacle layouts.

Core scope should promote the relevant future backlog in a focused order, including:
- time-to-impact based fairness;
- physics-aware reachability where justified;
- deterministic run difficulty progression;
- deterministic pacing and breather sections;
- telegraphed hazard lifecycle;
- mechanically distinct hazard archetypes;
- expanded Director diagnostics for encounter state and fairness.

Difficulty and pacing are separate concerns: difficulty controls what challenge is allowed; pacing controls how much pressure is applied at a given moment.

Production-scale content and final balancing remain later work.

---

## M5 — Complete Arcade Loop

Purpose: turn the procedural runner into a coherent, replayable arcade game loop before building the larger meta layer.

Core scope:
- start → run → crash → results → restart;
- low-friction death-to-retry flow;
- separate lethal core hitbox and Graze layer;
- score foundation;
- collectible paths / route readability;
- basic run rewards;
- clear result presentation;
- deterministic integration tests for the complete run loop.

Exact economy values, final currencies and long-term progression remain TBD.

---

## M6 — Vertical Slice

Purpose: prove what a near-finished piece of Monster Girl Delivery should look, sound and feel like before scaling content production.

Target slice:
- one production-quality Monster Girl;
- one representative themed district / environment;
- production-quality environment art for that slice;
- representative production hazards;
- character and world animation;
- VFX;
- SFX and representative music treatment;
- polished HUD / run UI / results presentation;
- the M5 arcade loop working with production presentation;
- representative mobile performance validation.

### Art pre-production before M6

Art direction is allowed and encouraged before this milestone. M2–M5 may establish:
- MGD Art Bible;
- character proportions and silhouette rules;
- environment perspective and geometry rules;
- region palette rules;
- modular tile / pattern strategy;
- animation pipeline;
- asset naming, source and processing conventions;
- readability tests using concepts or temporary art.

What remains reserved for M6 is the first coherent **production-quality vertical slice**, not the first time anyone thinks about art.

---

## M7 — Meta & Persistence

Purpose: add durable long-term progression only after the arcade game and vertical slice have proven themselves.

Core scope:
- centralized `SaveManager`;
- versioned local persistence and migrations;
- export / import / reset for development;
- economy framework;
- collection framework;
- gallery framework;
- character / skin ownership data;
- long-term reward integration with completed runs.

The project remains local-first and offline-first for the initial scope. Real-money mechanics are not part of this roadmap.

Whether characters have gameplay-affecting abilities remains an explicit design decision and must not be assumed by the architecture.

---

## M8 — Content & Presentation

Purpose: scale the proven systems and visual language into enough content for a real release candidate.

Core scope may include:
- additional Monster Girls / skins;
- additional themed districts;
- larger validated pattern catalog;
- expanded hazard archetypes;
- additional animation, VFX, audio and UI content;
- boss / set-piece encounters where promoted;
- optional temporary gameplay events where validated;
- Delivery Contracts or comparable long-term objectives after reward foundations exist;
- production-art scaling through the modular asset pipeline;
- content-performance optimization.

This milestone should scale systems already proven in the vertical slice rather than inventing a second game during content production.

---

## M9 — Release / Mobile Polish

Purpose: prepare the validated game for mobile release and broader distribution.

Core scope:
- sustained mobile performance tuning;
- safe-area and device-layout polish;
- accessibility pass appropriate to the game;
- mobile device matrix and regression testing;
- lifecycle / suspend / resume validation;
- Capacitor evaluation / implementation for Android and iOS where appropriate;
- production build and packaging checks;
- store preparation;
- release-blocker fixes;
- final release-candidate validation.

Desktop / Steam packaging may follow later and should not block the initial mobile-first release unless explicitly promoted.

---

## Development sequence

```text
M0  Foundation
 ↓
M1  Flight Prototype
 ↓
M2  Horizontal Run & First Hazard
 ↓
M3  Seeded Generation & Fairness
 ↓
M4  Run Systems & Difficulty
 ↓
M5  Complete Arcade Loop
 ↓
M6  Vertical Slice
 ↓
M7  Meta & Persistence
 ↓
M8  Content & Presentation
 ↓
M9  Release / Mobile Polish
```

The reasoning behind the sequence is deliberate:

1. prove movement;
2. prove the endless-run foundation;
3. prove deterministic and fair generation;
4. prove long-run difficulty, pacing and encounter variety;
5. prove the complete arcade loop;
6. prove the production-quality game experience in one vertical slice;
7. add long-term meta and persistence;
8. scale content;
9. ship and polish.

---

## Roadmap rules

- M0–M2 historical scope is unchanged by this amendment.
- Do not start a later milestone merely because its ideas are documented here.
- Every milestone should have a parent issue and focused child issues before implementation begins.
- Each implementation task should remain small enough for one focused branch / PR where practical.
- Every milestone requires a factual closeout before advancing.
- `PROTOTYPE`, `EXPERIMENT`, `TBD` and `FUTURE` decisions remain non-final until explicitly approved.
- Production content should build on the M6 vertical slice rather than precede it at scale.
- Art pre-production may begin earlier when it reduces future rework, but production asset scaling belongs after the core gameplay proves itself.
- The existing Jetpack Joyride-derived future backlog remains useful input for M4–M8 promotion decisions; documenting an item does not automatically schedule it.

## Follow-up documentation alignment

When the next focused specification-maintenance pass touches `MASTER_SPEC.md`, section `32. Milestones` should be synchronized to this approved M3–M9 structure so the master specification and roadmap remain identical. Until that synchronization lands, this document is the approved amendment for future milestone sequencing.