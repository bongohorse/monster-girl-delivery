# Monster Girl Delivery — Roadmap

**Status:** APPROVED  
**Approved by:** Game Director / Product Owner  
**Originally approved:** 2026-09-03  
**Roadmap 2.0 revision:** 2026-09-04  
**Current milestone:** M3 — Seeded Generation & Fairness

> [!IMPORTANT]
> This file is the **single source of truth for milestone sequencing and milestone-level future scope**. `MASTER_SPEC.md` owns durable product/game decisions; focused GitHub Issues own live implementation scope.

This roadmap is organized around **proof**, not feature accumulation. Each milestone should answer one important development question before the project spends heavily on the next layer.

A documented future feature is not permission to implement it early. Every milestone still requires focused Issues, explicit dependencies, validation, Game Director review where relevant, and a factual closeout before advancing.

Historical reports in `docs/milestones/` record what actually happened and are not rewritten to match later planning.

---

## How to read this roadmap

Future milestones use five concepts:

- **Purpose** — why the milestone exists.
- **Proof question** — the question the milestone must answer.
- **Entry gate** — what must already be true before implementation begins.
- **Core scope** — the minimum capability needed to answer the proof question.
- **Exit gate** — the evidence/decision required before advancing.

Decision gates between milestones are intentionally not numbered as separate implementation milestones. They exist to prevent expensive production work from starting while a major product question is still unresolved.

---

# Parallel development tracks

These tracks run alongside the numbered milestones where useful. They do **not** authorize unrelated work or bypass milestone scope.

## A. Gameplay proof

Continuously evaluate whether the core runner is becoming:

- responsive;
- readable;
- fair;
- replayable;
- increasingly distinctive as Monster Girl Delivery.

Gameplay proof takes priority over adding breadth. A larger feature set does not compensate for a weak core run.

## B. Device, rendering, and performance

Validate important technical assumptions on representative real devices throughout development rather than postponing all mobile risk until release.

This includes, when promoted into focused work:

- phones and tablets;
- varied Landscape aspect ratios;
- safe areas and lifecycle behavior;
- high-DPI / device-pixel-ratio rendering;
- stable frame pacing and the 60 FPS target where target hardware permits;
- render-quality decisions that remain independent of final art style.

Current open rendering work such as Issue #102 may contribute to this track without becoming a new numbered milestone.

## C. Art pre-production

Before M6, low-cost art exploration is allowed when it reduces future rework.

Possible work includes:

- representative character/style tests;
- environment perspective and readability experiments;
- repeatable/parallax background tests;
- palette and silhouette exploration;
- animation-pipeline experiments;
- asset-format and production-workflow tests.

This track must not become production-scale asset creation before the core game and Art Gate justify it.

## D. Director / QA infrastructure

Developer tooling should grow only as needed to make the current systems observable, tunable, and reproducible.

Examples include:

- live prototype tuning;
- hitbox/debug views;
- seed/pattern visibility;
- difficulty/pacing state;
- restart-same-seed;
- test-state navigation;
- focused device/performance diagnostics.

Director tooling uses authoritative runtime state and must not become a second implementation of gameplay.

---

# Completed foundation

## M0 — Foundation

**Status: COMPLETE**

**Purpose:** establish the technical and workflow foundation before gameplay implementation.

Core scope delivered:

- project scaffold;
- Bun / Vite / TypeScript / Phaser setup;
- code quality, tests, CI and Codespaces foundation;
- core timing, input, lifecycle and viewport services;
- minimal Director diagnostics.

Historical report: [`milestones/M0-foundation.md`](milestones/M0-foundation.md)

---

## M1 — Flight Prototype

**Status: COMPLETE**

**Purpose:** prove the mobile-first one-button flight model and choose the core orientation.

Core scope delivered:

- placeholder player;
- thrust / gravity flight;
- touch, mouse and keyboard input;
- live prototype physics tuning;
- real-device tests;
- Landscape selected for the current core game.

Historical report: [`milestones/M1-flight-prototype.md`](milestones/M1-flight-prototype.md)  
Supporting device evidence: [`milestones/M1-device-report.md`](milestones/M1-device-report.md)

---

# Core-game proof phase

## M2 — Horizontal Run & First Hazard

**Status: COMPLETE**

**Purpose:** turn the vertical flight prototype into the first real left-to-right endless-run foundation.

### Proof question

> Does the proven one-button flight model still work when placed inside a real left-to-right runner with world motion, lethal danger, death, and restart?

### Entry gate

Satisfied by M1 completion, accepted real-device evidence, and the Game Director's Landscape decision.

### Core scope

- deterministic horizontal run progress;
- configurable prototype scroll speed;
- placeholder scrolling-world presentation;
- one deterministic lethal hazard;
- collision, run death and restart;
- focused deterministic tests;
- Landscape device validation.

### Exit gate

M2 may close only when:

- the horizontal run, first hazard, death, and restart form a coherent testable runner foundation;
- required automated validation passes;
- the completed M2 build receives the required Landscape device validation;
- blocking defects are fixed/retested;
- a factual M2 closeout report is merged;
- the M2 parent is closed and M3 is explicitly unblocked.

**Explicitly not part of M2:** production art, Graze, scoring, procedural generation, final difficulty/pacing, or meta systems.

Completed parent: [Issue #49](https://github.com/bongohorse/monster-girl-delivery/issues/49)

Historical report: [`milestones/M2-horizontal-run-first-hazard.md`](milestones/M2-horizontal-run-first-hazard.md)

---

## M3 — Seeded Generation & Fairness

**Status: CURRENT**

**Purpose:** establish deterministic procedural encounter generation that can be reproduced, inspected, tested, and rejected when unsafe.

### Proof question

> Can MGD generate varied hazard sequences reproducibly while ensuring that only patterns passing explicit prototype fairness constraints reach the live run?

### Entry gate

Satisfied by the completed M2 implementation, accepted Landscape validation, factual closeout, and closure of M2 parent Issue #49.

The M3 parent Issue #57 records the detailed focused scope, dependencies, and ordered child work.

### Core scope

- dedicated seeded gameplay PRNG;
- explicit run-generation state;
- data-driven hazard pattern model;
- deterministic pattern generator;
- pure fairness validator;
- deterministic run-distance spawn scheduling;
- live generated-pattern integration;
- seed visibility and restart-same-seed tooling;
- reproducibility/fairness validation.

### Exit gate

M3 may close only when evidence shows that:

- the same representative seed reproduces the same logical generated sequence;
- representative different seeds can diverge where the catalog permits;
- invalid/rejected patterns do not reach the accepted live spawn stream;
- pause/resume and resize do not corrupt generation order/state;
- finite seed sampling is documented honestly as evidence rather than proof of every possible future seed;
- blocking generation/fairness defects are resolved and retested;
- a factual M3 closeout is merged.

**Explicitly not part of M3:** final difficulty curve, pacing system, production art, Graze, score/economy, large content catalogs, or final balancing.

Current parent: [Issue #57](https://github.com/bongohorse/monster-girl-delivery/issues/57)

---

## M4 — Run Pacing & Hazard Language

**Purpose:** turn technically valid generated encounters into runs that remain readable, varied, fair, and interesting over time.

### Proof question

> Can MGD produce sustained runs that create deliberate pressure and recovery, teach hazards clearly, and increase challenge without becoming monotonous or unfair?

### Entry gate

- M3 generation/validation pipeline is complete and reproducible;
- M3 closeout is accepted;
- M4 has a focused parent plan before implementation begins.

### Core scope

Promote the relevant future run-design work in a focused order, including:

- time-to-impact-based fairness rather than raw viewport-edge distance;
- physics-aware reachability where it materially improves validation;
- deterministic run difficulty progression;
- deterministic pacing/intensity state;
- deliberate breather/recovery sections;
- telegraphed hazard lifecycle where appropriate;
- multiple mechanically distinct hazard archetypes;
- encounter/fairness diagnostics sufficient for Director testing.

Difficulty and pacing are separate responsibilities:

- **difficulty** controls what challenge is allowed;
- **pacing** controls how much pressure is applied at a given moment.

### Exit gate

M4 may close only when:

- a generated run can demonstrate intentional difficulty progression without relying only on raw speed;
- pressure and breather phases are observable/reproducible;
- major hazard archetypes communicate their behavior clearly enough for fair reaction;
- representative runs are validated on real gameplay, not only unit tests;
- the Game Director accepts the run structure as sufficiently readable and varied to build the full arcade loop on top of it;
- a factual M4 closeout is merged.

**Explicitly not part of M4:** final production content volume, final balance values, full economy/meta, production art scaling, or release-level content variety.

The existing Jetpack Joyride-derived umbrella Issue #78 and its future child tasks are useful inputs, but they remain unapproved implementation work until deliberately promoted into M4 planning.

---

## M5 — Complete Arcade Loop & Skill Layer

**Purpose:** turn the procedural runner into a coherent arcade game that has a meaningful skill layer and encourages immediate replay before a large meta layer is built.

### Proof question

> Is the core game itself compelling enough that a player would voluntarily start another run even before deep progression, collection, or live-service systems exist?

### Entry gate

- M4 run pacing/hazard language is accepted;
- the core run can sustain representative generated play;
- M5 has a focused parent plan before implementation begins.

### Core scope

- complete start → run → crash → results → restart flow;
- extremely low-friction death-to-retry behavior;
- entertaining/readable fail-state presentation rather than an abrupt dead stop;
- separate lethal core hitbox and Graze layer;
- score foundation;
- collectible paths that support navigation/readability and optional risk/reward;
- basic run rewards sufficient to support results feedback;
- clear result presentation and meaningful run statistics;
- deterministic integration tests for the complete run lifecycle.

### Exit gate

M5 may close only when:

- the entire arcade loop works without requiring developer intervention between runs;
- Graze/score/collectibles produce a visible skill/risk layer rather than arbitrary numbers;
- death → results → retry friction is low enough for repeated playtesting;
- the Game Director accepts the core game as sufficiently replayable/fun to justify production-quality presentation work;
- unresolved product questions that affect M6 are routed through the Product and Art Gates below;
- a factual M5 closeout is merged.

**Explicitly not part of M5:** final economy values, deep long-term progression, production-scale cosmetics/content, Companions/HQ systems, or unapproved alternate game modes.

---

# Pre-production decision gates

## Product Gate A — Define the release core game

**Timing:** after M5 and before expensive M6 production commitments.

### Decision question

> What is the core game structure MGD is actually trying to ship?

Evaluate, without assuming the answer in advance:

- Endless as the primary release mode;
- finishable Delivery Mode as a primary or complementary mode;
- both, if the additional structure is justified by evidence;
- whether delivery flavor remains thematic or becomes a stronger mechanical objective layer.

Possible inputs include lightweight prototypes/research if the decision cannot be made confidently from the M5 arcade loop.

### Gate output

The Game Director records the durable decision in `MASTER_SPEC.md`. Any resulting new gameplay scope must then be scheduled deliberately rather than silently inserted into M6.

If no additional delivery-mode complexity is justified, the project may continue with the proven Endless core.

---

## Art Gate — Lock the minimum production visual direction

**Timing:** after the core arcade game is proven and before M6 production assets are scaled.

### Decision question

> What visual and production approach can make MGD distinctive, readable, scalable, and performant on mobile?

Evaluate through representative tests rather than assumptions:

- pixel art vs. larger HD/cartoon/anime/chibi 2D or another approved direction;
- character proportions and gameplay silhouette scale;
- environment perspective/detail density;
- parallax/background construction;
- palette/outline/light/shadow principles where relevant;
- sprite/transform/secondary animation strategy;
- minimum asset naming/source/processing conventions;
- render sharpness and high-DPI behavior on representative devices.

Pixel art remains a useful prototype style, not an automatic final decision.

Skeletal/bone animation remains a later investigation unless a focused experiment proves that it is worth the production cost for the release direction.

### Gate output

Before M6 production scaling:

- the Game Director approves a production visual direction;
- render quality is suitable for evaluating the chosen style on modern displays;
- the minimum art-production conventions needed for the slice are documented in the appropriate source(s);
- major unresolved art-pipeline risks are identified rather than hidden inside M6 production.

---

# Production proof phase

## M6 — Vertical Slice / Visual Identity

**Purpose:** prove that a small, representative piece of Monster Girl Delivery can look, sound, feel, and perform like a near-finished game before content production scales.

### Proof question

> Can the team produce one coherent release-quality slice of MGD that preserves the proven arcade gameplay while establishing the game's real visual/audio identity on mobile?

### Entry gate

- M5 arcade-loop exit gate passed;
- Product Gate A resolved strongly enough to define the slice;
- Art Gate resolved strongly enough to produce representative assets;
- unresolved rendering/performance blockers that would invalidate visual evaluation are addressed or explicitly bounded.

### Target slice

- one production-quality Monster Girl;
- one representative themed district/environment;
- production-quality environment art for that slice;
- representative production hazards;
- character/world animation using the approved production approach;
- representative VFX;
- SFX and representative music treatment;
- polished HUD/run UI/results presentation;
- the proven arcade loop operating under production presentation;
- representative mobile performance validation.

### Exit gate

M6 may close only when:

- the slice reads clearly and feels coherent as Monster Girl Delivery rather than a dressed-up prototype;
- production art/audio/VFX do not undermine gameplay readability;
- representative real-device performance remains acceptable;
- the core art/animation/content pipeline can produce more content without obvious re-engineering;
- production effort/complexity observations are recorded for the later Content Budget Gate;
- the Game Director accepts the slice as the quality/reference target for content scaling;
- a factual M6 closeout is merged.

M6 proves a **quality bar and production approach**, not the final quantity of release content.

---

## Meta Gate — Define the minimum long-term progression target

**Timing:** after M6 and before M7 builds durable persistence/meta foundations.

### Decision question

> What minimum progression/collection loop actually improves MGD without turning the project into several games at once?

Resolve enough of the following to design M7 safely:

- whether playable characters are mechanically identical, cosmetic-first, or small sidegrades;
- what players primarily earn from completed runs;
- what the minimum release collection target is;
- how important Gallery/character ownership is to the release loop;
- whether one simple currency/framework is sufficient initially;
- which large backlog systems are explicitly **not** needed for the first meta implementation.

### Gate output

Record durable product decisions in `MASTER_SPEC.md`. M7 should implement the smallest complete meta loop justified by those decisions rather than prebuilding Dailies, Battle Pass, Companions, Gacha, HQ, and other long-term systems speculatively.

---

## M7 — Meta Foundation & Persistence

**Purpose:** prove one complete durable progression/collection loop after the arcade game and vertical slice have already proven themselves.

### Proof question

> Can a player earn something through play, persist it safely, unlock/own/view or use it, and return to another run with meaningful long-term progress?

### Entry gate

- M6 quality/production proof accepted;
- Meta Gate resolved sufficiently to define a minimal loop;
- M7 has a focused parent plan before implementation begins.

### Core scope

- centralized `SaveManager` boundary;
- versioned local persistence;
- explicit migrations;
- development export/import/reset;
- minimum economy/reward framework required by the approved loop;
- collection/ownership framework;
- Gallery and/or character/skin ownership where approved by the Meta Gate;
- completed-run reward integration;
- one complete flow such as:

```text
Run
→ earn reward/progress
→ save
→ unlock/own something
→ view/equip/use it
→ persistence survives reload
→ start another run
```

### Exit gate

M7 may close only when:

- the complete approved meta loop works end-to-end;
- persisted ownership/progression survives reload/restart as intended;
- versioning/migration behavior has deterministic coverage appropriate to the implementation;
- development recovery/export/import/reset paths exist;
- the meta layer does not require online accounts/backend infrastructure;
- the Game Director accepts the loop as worth scaling rather than merely technically functional;
- a factual M7 closeout is merged.

**Explicitly not automatically part of M7:** paid/random monetization, Battle Pass, Dailies, Companions, fusion, HQ management, relationship systems, or every idea in `BACKLOG.md`.

The project remains local-first and offline-first for the initial scope. Real-money mechanics are not part of this roadmap.

---

# Content planning gate

## Content Budget Gate — Set an evidence-based release content target

**Timing:** after M6 has produced real production assets and M7 has proven the minimum meta loop, before M8 scales content broadly.

### Decision question

> How much release content can be produced, validated, and polished at the proven quality level without destabilizing the project?

Use real observations from M6/M7 to estimate relative production cost/complexity for items such as:

- one Monster Girl and animation set;
- one environment/district kit;
- one hazard archetype/pattern family;
- one cosmetic tier;
- UI/VFX/audio additions;
- validation/performance cost per content family.

Do not invent large content-count targets before this evidence exists.

### Gate output

The Game Director approves an evidence-based M8 release-content target. The target may be revised later if production measurements change, but M8 should begin with a bounded content plan rather than an unlimited backlog.

---

# Content and release phase

## M8 — Release Content Production

**Purpose:** scale systems, visual language, and meta foundations that were already proven into a bounded release-candidate content set.

### Proof question

> Can MGD scale its proven game without quality collapse, uncontrolled scope growth, or new foundation systems appearing during content production?

### Entry gate

- M6 vertical-slice quality bar accepted;
- M7 minimum meta loop accepted;
- Content Budget Gate produces a bounded release-content target;
- M8 has a focused production plan before broad implementation begins.

### Core scope may include, within the approved budget

- additional Monster Girls/skins;
- additional themed districts;
- larger validated pattern catalog;
- expanded hazard archetypes;
- additional animation, VFX, audio and UI content;
- boss/set-piece encounters only where previously proven/promoted;
- temporary gameplay events only where previously validated/promoted;
- Delivery Contracts or comparable long-term objectives only if reward/meta foundations and product decisions justify them;
- modular production-art scaling;
- content-performance optimization;
- content regression/readability validation.

### Exit gate

M8 may close only when:

- the approved release-content target is substantially complete or explicitly re-scoped by the Game Director;
- new content respects the M6 quality/readability bar;
- the pattern/hazard catalog remains validated rather than becoming uncontrolled content debt;
- content-scale performance remains within the current mobile target envelope;
- remaining work is primarily release polish, compatibility, packaging, compliance, or blocker fixes rather than missing core game systems;
- a factual M8 closeout is merged.

**Rule:** M8 scales a proven game. It should not quietly invent a second core game, deep new meta architecture, or another production pipeline.

---

## M9 — Mobile Release & Polish

**Purpose:** turn the validated release-content build into a mobile release candidate and prepare broader distribution without destabilizing the proven game.

### Proof question

> Is MGD reliable, readable, performant, accessible enough, and correctly packaged on representative target devices to ship?

### Entry gate

- M8 content exit gate passed;
- release-candidate content scope is bounded;
- no known missing foundation system is being deferred into “polish.”

### Core scope

- sustained mobile performance tuning;
- high-DPI/render-scale validation across representative devices;
- safe-area and device-layout polish;
- accessibility pass appropriate to the game;
- mobile device matrix and regression testing;
- lifecycle/suspend/resume validation;
- production packaging path for Android/iOS where appropriate;
- production build and packaging checks;
- store preparation/compliance work required for the chosen targets;
- release-blocker fixes;
- final release-candidate validation.

Desktop/Steam packaging may follow later and should not block the initial mobile-first release unless explicitly promoted.

### Exit gate

M9 completes only when:

- the chosen mobile release build passes the agreed device/regression matrix;
- required packaging/store checks are satisfied for the chosen release targets;
- no known release blocker remains open;
- performance/lifecycle/safe-area behavior is validated on representative real devices;
- the Game Director accepts the build as release-ready;
- the final release closeout records any known non-blocking limitations or post-release backlog.

---

# Development sequence

```text
M0  Foundation                         COMPLETE
 ↓
M1  Flight Prototype                   COMPLETE
 ↓
M2  Horizontal Run & First Hazard      CURRENT
 ↓
M3  Seeded Generation & Fairness
 ↓
M4  Run Pacing & Hazard Language
 ↓
M5  Complete Arcade Loop & Skill Layer
 ↓
PRODUCT GATE A — define release core game
ART GATE       — lock minimum production visual direction
 ↓
M6  Vertical Slice / Visual Identity
 ↓
META GATE      — define minimum progression/collection target
 ↓
M7  Meta Foundation & Persistence
 ↓
CONTENT BUDGET GATE — bound release content from real production evidence
 ↓
M8  Release Content Production
 ↓
M9  Mobile Release & Polish
```

The logic is deliberate:

1. prove movement;
2. prove the endless-run foundation;
3. prove reproducible/fair generation;
4. prove long-run difficulty, pacing and hazard language;
5. prove the core arcade game is worth replaying;
6. decide what game is actually being produced and how it should look;
7. prove one release-quality vertical slice;
8. decide the smallest worthwhile long-term progression model;
9. prove one complete persistent meta loop;
10. set a realistic content budget using real production evidence;
11. scale only proven systems/content;
12. ship and polish on representative mobile targets.

---

# Roadmap rules

- M0–M2 historical scope is not rewritten by later planning changes.
- The current milestone remains the only default implementation focus unless the Game Director explicitly authorizes cross-cutting work.
- A decision gate is not permission to prebuild every possible answer before the decision.
- Every future milestone should have a parent Issue and focused child Issues before implementation begins.
- Parent Issues/milestones are planning containers; focused implementation work should remain independently reviewable where practical.
- Every milestone requires factual closeout evidence before advancing.
- Automated tests, manual/device evidence, and Game Director acceptance serve different purposes; do not substitute one for another.
- `PROTOTYPE`, `EXPERIMENT`, `TBD`, and `FUTURE` decisions remain non-final until explicitly approved.
- Production content should build on the M6 vertical slice rather than precede it at scale.
- Art pre-production may begin earlier when it reduces future rework; production asset scaling belongs after the Art Gate/core gameplay proof.
- Device/rendering/performance risks should be tested incrementally rather than deferred entirely to M9.
- Director/QA tooling grows with the systems that need observation; it is not a separate gameplay product.
- `BACKLOG.md` and `ENDLESS_RUNNER_BLUEPRINT.md` are inputs for promotion/research decisions, not scheduled work by themselves.
- If milestone sequencing changes, update this file rather than maintaining a competing roadmap elsewhere.
- Do not create M4–M9 implementation Issues simply because this roadmap is more detailed. Create detailed Issue plans when the relevant milestone approaches and its entry assumptions can be verified.
