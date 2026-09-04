# M2 — Horizontal Run & First Hazard — Completion Report

**Status:** COMPLETE

**Completed:** 2026-09-04

**Primary planning issue:** #49

**Purpose:** Prove that the M1 one-button flight model still works as a repeatable left-to-right runner with world motion, lethal danger, death, and restart.

## 1. Planned goal

M2 was planned as the first horizontal endless-run foundation built on the completed M1 flight prototype.

The intended scope was:

- deterministic horizontal run progress using authoritative simulation time;
- one shared configurable prototype scroll speed;
- live development-only Director tuning for that speed;
- temporary scrolling-world presentation with a stable player screen-space X;
- one deterministic placeholder lethal hazard;
- pure player/hazard collision rules;
- an explicit prototype run-death state and repeatable restart path;
- focused deterministic tests;
- Landscape device validation;
- a factual milestone closeout before M3 begins.

Procedural generation, final fairness/pacing, Graze, scoring, production art, and Portrait core gameplay were explicitly outside M2.

## 2. What M2 actually delivered

### Shared prototype run-motion tuning

Issue #50 / PR #76 added one typed `RunMotionConfig` as the runtime authority for horizontal scroll speed.

- The default `baseScrollSpeed` is the documented **PROTOTYPE** value of `350 px/s`.
- Runtime updates reject negative, non-finite, and invalid values.
- Consumers receive frozen snapshot copies rather than mutable internal state.
- The shared instance is registered through `AppServices` and is not derived from viewport size.

### Deterministic horizontal progress

Issue #51 / PR #77 added a pure `RunMotionState` and headless step function.

- Cumulative logical distance advances from caller-supplied elapsed seconds and the shared run-motion tuning.
- Zero or paused simulation delta produces no movement.
- Invalid elapsed values are rejected.
- The simulation does not consult Phaser, a wall clock, frame counters, viewport dimensions, or randomness.
- Live tuning changes affect subsequent steps without resetting accumulated distance.

### Development-only Director tuning

Issue #67 / PR #91 extended the existing Director panel with a prototype horizontal scroll-speed control using a `25 px/s` adjustment step.

- The control updates the authoritative `RunMotionConfig` immediately and displays its effective value.
- It reuses the existing gameplay-input blocking/release boundary, so Director interaction does not become thrust input.
- It remains behind the existing development-only Director-mode gate.
- The control did not introduce player-facing settings, difficulty scaling, or hazard tuning.

### Placeholder scrolling world

Issue #52 / PR #92 added deterministic wrapping/layout math and temporary Phaser Graphics presentation for a repeating skyline and ground markers.

- Presentation is driven directly from authoritative run distance.
- World geometry moves right-to-left while the player remains near a stable screen-space X, making travel read left-to-right.
- Pause/resume follows `TimeService` behavior.
- Resize redraws coverage from unchanged run state rather than resetting or advancing the simulation.
- The presentation owns no duplicate gameplay clock or progress state.

### Deterministic placeholder hazard and collision

Issue #53 / PR #97 added one immutable prototype barrier in run-distance space plus pure Phaser-independent player/hazard AABB collision rules.

- Hazard screen position is projected from logical run progress rather than an independent movement path.
- Collision requires positive-area overlap; exact shared-edge contact is not a collision.
- Floor and ceiling remain non-lethal.
- The logical collision rule is independent of viewport size and uses no random placement.
- The barrier placement and hitbox dimensions remain prototype content, not a generated pattern system or final tuning.

### Run death and deterministic restart

Issue #54 / PR #98 integrated the hazard presentation into the playable scene and added an explicit `running` / `dead` run-session transition.

- The first valid collision enters the dead state once.
- Flight and run progress are held while dead without misusing the global lifecycle pause state.
- A fresh touch, primary mouse press, or Space press restarts through the existing input boundary.
- Restart resets run distance, derived hazard position, player flight state, and stale input ownership.
- Space auto-repeat is ignored so held death-frame input cannot trigger or stick through restart.

## 3. Architecture/product decisions established

M2 established or confirmed these constraints for later work:

- Landscape remains **DECIDED** for current core gameplay, with left-to-right spatial flow; Portrait remains a **FUTURE** separate mode/variant possibility.
- `RunMotionConfig` is the shared runtime authority for horizontal speed, while its current value and Director adjustment step remain **PROTOTYPE**.
- Logical run distance is authoritative horizontal gameplay state and advances only from elapsed time already normalized by `TimeService`.
- Horizontal gameplay rules remain independent of Phaser presentation and physical viewport dimensions where practical.
- Scrolling-world and hazard presentation derive from authoritative run state rather than owning independent clocks or motion.
- The first hazard and collision rule are deterministic; M2 added no gameplay randomness.
- Run death is explicit gameplay state. Holding the dead run does not replace or corrupt application lifecycle state.
- Gameplay restart continues to use the existing `InputService` boundary for touch, mouse, and Space.

M2 did not make prototype speed, hitbox, hazard placement, or difficulty values final product decisions.

## 4. Validation evidence

### Automated validation

Each core M2 implementation PR recorded successful repository validation:

- `bun run ci:check`;
- `bun run typecheck`;
- `bun run test`;
- `bun run build`.

The recorded suite grew from **17 files / 78 tests** at PR #76 to **24 files / 113 tests** at PR #98. Coverage added during M2 included configuration validation, deterministic distance and timestep behavior, Director-mode/input blocking, wrapping/layout math, hazard projection and collision, run-state transitions, dead-state holding, deterministic restart, pause/resume, resize, and cleanup.

The closeout branch also passed the current required suite on 2026-09-04: Biome checked 64 files, TypeScript completed with no errors, Vitest passed **24 files / 113 tests**, and the production Vite build completed successfully. Automated coverage is engineering evidence; it is not represented as manual device testing.

### Manual/browser/device evidence

Issue #55 contains the manual evidence actually reported by the Game Director:

- current browser/desktop playtest: **PASS**, with no notable gameplay issue reported in the horizontal run / hazard / death / restart loop;
- smartphone in Landscape: **PASS**, reported working with no notable issue;
- tablet in Landscape: **PASS**, reported working with no notable issue;
- Director acceptance: the M2 prototype was considered good enough to close device validation and proceed to milestone closeout.

Two browser console messages were observed: an unrecognized `attribution-reporting` Permissions-Policy feature and an AudioContext autoplay warning before a user gesture. Neither corresponded to a reported functional gameplay defect, so both were accepted as non-blocking for M2.

Evidence limits are explicit: exact device models, browser/version, viewport dimensions, and a separately recorded wide-versus-narrow desktop matrix were not provided. This report does not infer those details or claim the missing cases were performed.

## 5. Main Issues / PRs

| Work | Issue | PR | Result |
|---|---:|---:|---|
| Prototype run-motion configuration | #50 | #76 | Shared validated `350 px/s` prototype runtime authority |
| Deterministic horizontal progress | #51 | #77 | Headless cumulative run-distance simulation |
| Director scroll-speed tuning | #67 | #91 | Development-only live control backed by shared config |
| Placeholder scrolling world | #52 | #92 | Run-state-driven skyline/ground presentation |
| Placeholder hazard and collision | #53 | #97 | Deterministic barrier plus pure logical overlap rules |
| Hazard, death, and restart integration | #54 | #98 | Repeatable playable `running` / `dead` loop |
| Landscape validation | #55 | — | Director-recorded browser, smartphone Landscape, and tablet Landscape PASS evidence |

## 6. Supporting maintenance completed during the milestone

The following work improved project infrastructure or documentation while M2 was current but was not part of M2 gameplay scope:

- milestone-history and factual-closeout standards — #72 / PR #74;
- central documentation hub and clearer human/AI navigation — #100 / PR #101;
- documentation ownership and architecture/current-versus-planned cleanup — PR #104;
- Bun development dependency update from 1.4.0 to 1.4.1 — PR #103;
- roadmap and backlog documentation expansion that preserved future work without promoting it into M2.

This maintenance must not be treated as evidence that M2 delivered extra gameplay features.

## 7. What deliberately did not deliver

M2 did not implement:

- seeded or randomized procedural generation;
- a generator → validator → spawner pipeline;
- final hazard fairness, difficulty, or pacing systems;
- multiple hazard types or a production content catalog;
- Graze;
- scoring, rewards, economy, collection, or Gallery systems;
- production character/environment art;
- Portrait core gameplay or a runtime orientation lock;
- final speed, collision-hitbox, or hazard-placement balance;
- production performance certification.

## 8. Deferred/open work at exit

No reproducible blocking M2 gameplay defect was reported by the accepted validation evidence.

Open or deferred work remains explicit:

- Issue #69 still owns the deferred reproducible desktop/browser compatibility matrix, including separate narrow/wide cases, browser/OS/viewport metadata, manual mouse/Space checks, resize, background/foreground interruption, and stuck-input/resume checks.
- The missing exact device models, browser/version, viewport dimensions, and separate wide-versus-narrow desktop records cannot be reconstructed after the fact.
- The two observed browser console warnings were non-blocking because no functional defect was reported; a future focused issue should be created only if either warning produces a reproducible product problem.
- Scroll speed, collision geometry, and hazard placement remain **PROTOTYPE** and require later gameplay tuning rather than being silently finalized at M2 exit.
- Procedural generation and explicit prototype fairness validation move to approved M3 Issue #57; Graze and scoring remain later roadmap work.

## 9. Exit decision

M2 exits because:

- the vertical flight prototype now operates inside a coherent deterministic left-to-right runner foundation;
- horizontal progress, presentation, one lethal hazard, collision, death, and restart are integrated and headless rules have focused automated coverage;
- all core implementation PRs recorded the required validation suite passing;
- the Game Director reported browser, smartphone Landscape, and tablet Landscape PASS results with no notable gameplay issue;
- no reproducible M2 blocker was reported;
- the Game Director explicitly accepted the prototype as sufficient to close device validation and proceed to milestone closeout.

This closeout makes M2 complete and M3 current when the closeout PR merges and closes M2 parent Issue #49. The evidence does not claim the unrecorded desktop matrix or missing device metadata.

## 10. What M3 inherits

The approved current M3 plan is **#57 — Seeded Patterns & Fairness**.

M3 can safely assume:

- Landscape core orientation and left-to-right spatial flow;
- working one-button flight through `InputService`;
- authoritative normalized simulation delta from `TimeService`;
- deterministic cumulative run distance and shared prototype scroll-speed configuration;
- development-only live scroll-speed tuning;
- scrolling-world presentation derived from run state;
- one deterministic logical hazard and pure collision rules;
- an explicit repeatable run-death/restart state path;
- lifecycle and resize safeguards inherited from M0/M1 and exercised by M2 integration tests;
- a green automated validation foundation plus accepted M2 Landscape playtest evidence.

M3 does **not** inherit Graze, scoring, final difficulty/pacing, production art, final balance values, or the unperformed detailed desktop compatibility matrix as completed/current scope.
