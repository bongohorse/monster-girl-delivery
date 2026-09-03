# M1 — Flight Prototype — Completion Report

**Status:** COMPLETE  
**Completed:** 2026-09-03  
**Primary planning issue:** #12  
**Purpose:** Prove the core one-button flight interaction on real mobile/tablet hardware before building the endless-run systems around it.

## 1. Planned goal

M1 was planned as the smallest playable flight prototype on top of M0.

The intended scope was:

- typed prototype flight tuning;
- deterministic gravity/thrust movement;
- rise/fall velocity caps;
- safe non-lethal floor/ceiling;
- placeholder player presentation;
- integration through existing `TimeService` and `InputService` boundaries;
- live Director tuning;
- resize/orientation experimentation;
- real-device validation;
- a Director decision on Portrait versus Landscape.

Hazards, horizontal world motion, collision death, Graze, score, procedural generation, economy, persistence, and production assets were intentionally excluded.

## 2. What M1 actually delivered

### Runtime flight tuning

Issue #14 / PR #24 added one shared typed `FlightTuningConfig` with the M1 prototype defaults:

- gravity: `1400 px/s²`;
- thrust: `2200 px/s²` upward;
- max fall velocity: `650 px/s`;
- max rise velocity: `550 px/s` upward.

The values remain **PROTOTYPE** tuning rather than final balance. Updates are validated and the running simulation reads the shared runtime configuration rather than duplicating state.

### Deterministic vertical flight simulation

Issue #15 / PR #27 added pure/testable vertical flight rules that:

- consume caller-supplied elapsed seconds;
- apply continuous downward gravity;
- apply upward acceleration while thrust is held;
- enforce configured rise/fall velocity limits;
- handle zero elapsed time without movement;
- use analytical handling around velocity-limit crossings;
- remain independent of Phaser rendering and raw input APIs.

No second clock or frame-counter timing path was introduced.

### Safe floor and ceiling

Issue #16 / PR #28 extended the headless flight model with explicit vertical bounds.

Implemented behavior includes:

- no crossing of supplied floor/ceiling limits;
- boundary contact remains non-lethal;
- velocity pointing farther out of bounds is cleared;
- movement back into the valid region remains immediately possible;
- changed bounds are normalized predictably;
- no bounce, crash, damage, or hazard behavior was added.

### Placeholder player presentation

Issue #17 / PR #30 added a temporary Phaser-graphics player representation.

The presentation:

- is clearly prototype-only;
- accepts position updates from scene orchestration;
- owns no input, clock, tuning, or flight rule;
- has explicit idempotent cleanup;
- requires no production-art or asset-pipeline work.

### Playable flight integration

Issue #18 / PR #31 connected the pure flight simulation to the running Foundation scene.

The playable path:

- obtains simulation delta only from `TimeService`;
- obtains thrust intent only from `InputService`;
- keeps touch, mouse, and Space on the same high-level action path;
- synchronizes the placeholder presentation from authoritative flight state;
- derives vertical flight bounds from the live viewport and an explicit logical player footprint;
- preserves lifecycle pause/resume safeguards from M0;
- keeps scene shutdown/restart cleanup idempotent.

Phaser Arcade/Matter physics and raw gameplay input handlers were not introduced.

### Live Director flight controls

Issue #19 / PR #33 added isolated live controls for:

- gravity;
- thrust;
- max fall velocity;
- max rise velocity.

The Director controls:

- update the shared `FlightTuningConfig` directly;
- show current effective values;
- reject invalid/non-finite values;
- block gameplay input while UI controls are being used;
- release blocking during cleanup;
- keep the values visibly prototype-level rather than permanent balance.

### Resize/orientation-safe prototype

Issue #20 / PR #41 made the running flight prototype safe across live viewport changes.

Implemented behavior includes:

- flight bounds derived from the current safe viewport;
- horizontal player placement derived from the safe viewport rather than a device preset;
- immediate containment of existing flight state after resize without advancing simulation time;
- preservation of valid velocity, clearing only outward velocity at a newly reached boundary;
- responsive Director layout: stacked in portrait/narrow space and side-by-side where landscape space allows;
- preserved runtime tuning across resize/orientation changes;
- no dimension-dependent gravity/thrust/velocity tuning.

This implementation intentionally supported both orientations during testing and did not itself select one.

### Real-device evidence

Issue #21 / PR #71 records the real evidence actually supplied by the Game Director.

Reported result on 2026-09-03:

- smartphone: **PASS** for the general prototype playtest;
- tablet: **PASS** for the general prototype playtest;
- no blocking smartphone/tablet defect was reported;
- the Director explicitly accepted the mobile/tablet result as sufficient to continue the mobile-first project.

The repository does **not** invent missing model, OS/browser, viewport, or individual sub-check details that were not supplied.

Originally requested narrow/wide desktop, mouse/Space, resize, and background/resume manual compatibility evidence was not recorded. That work is transparently deferred to #69 and must not be represented as tested.

### Orientation decision

The Director explicitly selected:

- **Landscape — DECIDED** for the current core game;
- left-to-right spatial flow, Jetpack-Joyride-style;
- **Portrait — FUTURE** as a possible separate mode/variant, not current core gameplay.

Issue #22 / PR #73 records that product decision in project documentation. The orientation decision is a product target; M1 did not add a runtime orientation lock.

## 3. Architecture/product decisions established by M1

M1 established these durable constraints:

- core play is designed around **Landscape**;
- the world should read **left → right**;
- Portrait is not current core scope but may return later as a separate mode/variant;
- vertical flight simulation remains headless/testable and presentation-independent where practical;
- the running scene consumes existing `TimeService` and `InputService` boundaries instead of bypassing them;
- prototype physics tuning is live-configurable and remains non-final;
- safe viewport geometry affects layout/bounds, not the underlying acceleration/velocity tuning;
- Director controls use shared runtime configuration rather than a second tuning state.

## 4. Validation evidence

M1 implementation PRs repeatedly passed the repository-required validation:

- `bun run ci:check`;
- `bun run typecheck`;
- `bun run test`;
- `bun run build`.

Notable test-suite growth during the core M1 implementation:

- PR #24: 28 tests;
- PR #27: 37 tests;
- PR #28: 47 tests;
- PR #30: 50 tests;
- PR #31: 54 tests;
- PR #33: 58 tests.

Subsequent responsive/foundation maintenance expanded coverage further. The final M1 orientation closeout PR #73 ran green CI with **16 test files / 73 tests**, plus successful Biome, TypeScript, and production build validation.

Automated tests and manual device evidence are recorded separately; automated lifecycle/resize/input tests do not replace the deferred manual desktop compatibility pass in #69.

## 5. Main M1 Issues / PRs

| Work | Issue | PR | Result |
|---|---:|---:|---|
| Mark M1 current after Director approval | #13 | #23 | M0 complete / M1 current status |
| Runtime flight tuning config | #14 | #24 | Shared prototype tuning source |
| Deterministic vertical flight | #15 | #27 | Headless thrust/gravity simulation |
| Safe floor/ceiling | #16 | #28 | Non-lethal flight bounds |
| Placeholder player | #17 | #30 | Temporary presentation |
| Playable integration | #18 | #31 | Time/Input/viewport integration |
| Director flight tuning | #19 | #33 | Live runtime physics controls |
| Live resize/orientation experiment support | #20 | #41 | Safe responsive flight prototype |
| Mobile/tablet device evidence | #21 | #71 | Honest M1 device report |
| Landscape product decision | #22 | #73 | Landscape core target; Portrait future |

## 6. Supporting maintenance completed while M1 was current

The following work improved repository reliability during the M1 window but was **not** part of the M1 flight-product acceptance criteria:

- repository/bootstrap cleanup — #25 / PR #26;
- Codespaces dependency-install ordering — #34 / PR #35;
- Codespaces post-create readability/reliability — PR #42;
- Renovate onboarding/dependency updates and stale-branch hardening — PRs #36, #37, #40;
- Biome schema/config cleanup — #43 / PR #44 and #8 / PR #47;
- `.bun-version` as the Codespaces Bun source of truth — #45 / PR #48;
- LF enforcement for shell scripts — #46 / PR #56;
- Director tooling gated to development builds — #9 / PR #66;
- Preloader live-resize handling — #7 / PR #68.

These changes are historically useful, but they must not be confused with the reason M1 was considered a successful flight prototype.

## 7. What M1 deliberately did not deliver

M1 did not implement:

- horizontal run progress/world scrolling;
- lethal hazards;
- player/hazard collision death;
- restart/run-state flow;
- Graze;
- scoring/rewards;
- seeded procedural generation;
- difficulty progression;
- economy/gacha/gallery;
- persistence;
- production character/environment art;
- runtime orientation locking.

## 8. Deferred/open work at M1 exit

### Explicitly deferred compatibility work

Issue #69 preserves the manual desktop/browser checks that were originally part of the broader M1 matrix but were intentionally made non-blocking for the mobile-first project:

- narrow/wide desktop browser;
- mouse and Space manual checks;
- live desktop resize while running;
- background/foreground interruption while thrust is held;
- stuck-input and first-resume-frame checks;
- reproducible desktop browser/OS/viewport records.

### Future orientation possibility

Portrait remains **FUTURE** and may later become a separate mode or variant. It must not complicate the current Landscape core mode unless explicitly promoted by the Director.

## 9. Exit decision

M1 exited because:

- the one-button vertical flight model was playable through the established M0 timing/input/lifecycle boundaries;
- prototype physics values could be tuned live;
- floor/ceiling and resize behavior were safe enough for continued development;
- smartphone and tablet general playtests were reported as working well with no blocking mobile/tablet defect;
- the Director accepted that evidence and explicitly selected Landscape for the current core game.

That evidence was considered sufficient for the mobile-first project to proceed rather than waiting on the deferred desktop compatibility matrix.

## 10. What M2 inherits

The approved current M2 plan is **#49 — Horizontal Run & First Hazard**.

M2 can safely assume:

- Landscape core orientation;
- left-to-right game flow;
- working one-button vertical flight;
- authoritative `TimeService` delta;
- unified `InputService` thrust intent;
- lifecycle/resume safeguards;
- safe-area-aware responsive viewport handling;
- shared runtime flight tuning;
- development-only Director diagnostics/tuning;
- deterministic/headless testing patterns;
- green CI/build foundation.

M2 does **not** inherit Graze or scoring as already-approved current scope. Issue #49 explicitly limits the next milestone to horizontal run/world motion, configurable scroll speed, one deterministic lethal hazard, collision/death/restart, and Landscape validation. Graze and scoring remain later work unless the Director explicitly changes that plan.
