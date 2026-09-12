# Monster Girl Delivery — Master Spec

**Document status:** Living product/game specification  
**Project status:** Pre-Production  
**Current milestone:** Pre-M5 transition (M4 complete; M5 parent #197 approved; implementation blocked by Pre-M5 exit gate)

**Human role:** Game Director / Product Owner  
**Coding-agent role:** Implementation / Engineering

> [!IMPORTANT]
> This file owns **durable product and game decisions**. It does not own milestone sequencing, technical architecture/tooling, development commands, or AI workflow. See [`docs/README.md`](docs/README.md) for the canonical source-of-truth map.

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
5. Risk/reward through Graze when the approved M5 system is implemented.
6. Failure presentation should be entertaining/readable and lead quickly into another run rather than feeling like a hard interruption.
7. Collectible placement should help teach/guide movement and communicate optional risk where appropriate, not merely scatter rewards randomly.
8. Preserve the small permanent input vocabulary; future temporary modes may reinterpret the same controls rather than accumulating permanent buttons/mechanics.
9. Strong anime/chibi monster-girl identity.
10. Fast iteration for the Game Director.
11. Maintainable, deterministic implementation where practical.

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

Technical stack and architecture decisions are owned by [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 3. Core input and gameplay loop

### DECIDED input

The player uses one core action:

- Hold touch / mouse / Space → thrust upward.
- Release → thrust stops and gravity pulls downward.

The same action must flow through the platform-independent input abstraction.

### Current intended core loop

```text
Start Run
  ↓
Fly / Dodge / Collect / Graze (when M5 systems are implemented)
  ↓
Survive
  ↓
Crash / Authoritative Run End
  ↓
Short readable/entertaining fail-state presentation
  ↓
Results / Basic Run Rewards / Records
  ↓
One-action Restart
```

M5 parent Issue #197 approves completing this arcade loop once its Pre-M5 entry gate is satisfied. Focused implementation work is tracked by #198 (score/result snapshot/basic rewards), #90 (Graze), #84 (collectible paths), and #85 (fail-state/retry).

### DECIDED M5 replay principles

- **Death is entertainment:** failure is part of the arcade experience, not an abrupt static stop.
- **One-action retry:** ordinary death must not require a main-menu round trip before the next run.
- **Failure still feels productive:** the results flow should expose meaningful authoritative run feedback even before the later meta economy exists.
- Presentation-only post-death motion must not silently extend authoritative distance, score, rewards, RNG state, or other gameplay state.

### Run length

**TBD.** Short repeatable runs are the intent. Do not hardcode a final target duration yet.

---

## 4. Player physics

### PROTOTYPE tuning

```text
gravity          = 1600 px/s²
thrust           = 2600 px/s² upward
maxFallVelocity  = 700 px/s
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

## 5. Viewport, scaling, and devices

### DECIDED

The game must adapt to:

- phones;
- tablets;
- foldables;
- desktop browsers;
- later native mobile/desktop builds.

Physical screen size must not directly determine gameplay fairness.

Landscape is the core target orientation, but viewport systems must still handle resize and different Landscape aspect ratios. Selecting Landscape as a product target does not itself require a runtime orientation lock.

### PROTOTYPE — dynamic vertical flight room

The Director selected actual additional flight room on taller windows, keeping the player roughly
the same size rather than enlarging the whole scene. Above the 390-unit authored baseline, every
additional safe CSS pixel extends the flight ceiling upward at 1:1 scale. The floor stays at the
safe bottom edge. Short windows retain the existing fit-down of the baseline corridor. Canvas
backing-store pixel density does not add flight room.

This is a staged layout change: flight tuning and hazard distribution will be adjusted separately.
Existing hazards remain anchored to the authored lower band, so the extra upper space can currently
be used to avoid them, including the target-lock strike's limited target band. Cross-device gameplay
equivalence is not claimed for this prototype. Horizontal reaction-time scheduling remains unchanged.

### Fairness principle

Additional visible area must not accidentally grant a large reaction-time advantage.

Generated hazard approach scheduling uses a typed **PROTOTYPE** reaction-time constraint converted to logical distance from authoritative scroll speed. It does not use physical viewport width as its fairness authority. Individual-pattern and consecutive-transition reachability are pure logical M4 validation layers and likewise do not use physical viewport dimensions.

### Safe-area principle

UI must account for cutouts, notches, rounded corners, and home indicators. Gameplay world geometry and UI safe area are separate concerns.

---

## 6. Input behavior

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

## 7. Mobile/browser lifecycle

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

## 8. Hazards and fairness

### Implemented M2 foundation

M2 delivered:

- one deterministic placeholder hazard type;
- explicit player/hazard collision;
- prototype run-death state;
- restart path;
- Landscape validation.

M3 extended this foundation with deterministic seeded pattern generation, explicit prototype fairness validation, bounded logical spawn scheduling, and a live generated hazard stream. The catalog, geometry, fairness constraints, retry bounds, and stream distances remain **PROTOTYPE**.

M4 adds a reusable logical lifecycle for telegraphed hazards: Warning → Lock → Active → Expired. Warning and Lock are safe, Active is the only lethal phase, and targets sampled during warning freeze at the Lock boundary. Phase timing consumes simulation delta already normalized by `TimeService`; wall-clock timers and presentation callbacks do not own gameplay state. Each update crosses at most one boundary so an unexpectedly large delta cannot skip required safe phases, while unused boundary time carries forward for normal frame-rate independence. The first concrete **PROTOTYPE** use is a non-reactive one-shot timed pulse whose authored anchor remains fixed, whose collision enters the existing logical AABB path only while Active, and whose Phaser warning/lock/active/expired graphics only reflect logical state. Phase durations, warning geometry, and placeholder presentation remain configurable prototype values rather than final content or art.

The second concrete **PROTOTYPE** use is a reactive target-lock strike. During Warning it samples the player's logical vertical position, constrained to an authored target band that preserves a validator-visible escape corridor. At Lock the effective target freezes; later player movement cannot change it. Active resolves a fixed-width strike at the authored run-distance position and locked vertical target, then Expired becomes safe. This is a readable lane-strike prototype, not homing AI or a production missile/interceptor.

M4 also adds a typed geometric hazard behavior boundary and one **PROTOTYPE** persistent moving example. Pattern entries and spawned hazards carry a serializable geometric behavior identity. The vertical-patrol example follows a deterministic triangle wave derived from authoritative logical run distance and its immutable spawn anchor, so pause and same-seed replay remain coherent without a second timer or random source. Its full swept extent must pass the existing pattern-fairness validator, and its resolved position uses the shared logical collision rule. Movement values and placeholder graphics remain **PROTOTYPE** rather than final hazard tuning or art.

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

MGD does not deliberately weaken these guarantees to create a feeling of manufactured unfairness. Procedural play may be unpredictable, demanding, and occasionally brutal, but accepted content must remain consistent with the approved logical fairness/reachability/readability model.

---

## 9. Graze

### DECIDED M5 direction — implementation pending

Graze is the approved M5 risk/reward near-miss mechanic, tracked by Issue #90 and blocked by the relevant Pre-M5 run-event/consequence boundaries.

Concept:

```text
Core hitbox       → collision / death
Outer Graze zone  → near miss / reward
```

A hazard/projectile should normally reward a Graze only once per approved logical pass/contact contract. Exact event semantics must consume the authoritative M5 run-event decision rather than being reconstructed from presentation.

Graze is optional skill/risk. A pattern must not require Graze merely to satisfy survival fairness.

Exact hitbox dimensions, score/reward values, and presentation remain non-final until the focused system is implemented and tested.

Scheduling belongs in [`docs/ROADMAP.md`](docs/ROADMAP.md) and parent Issue #197.

---

## 10. Procedural generation, seeds, difficulty, and pacing

### Implemented M3 foundation

Gameplay runs are reproducible through an explicit seed/state model:

```text
seed
run distance/state
pattern index
PRNG state
```

Implemented generation flow:

```text
Seed / Run State
      ↓
Pattern Generator
      ↓
Pattern Validator
      ↓
Spawner
```

Gameplay generation uses the dedicated seeded gameplay PRNG rather than `Math.random()`. Pattern selection, fairness validation, and spawn scheduling remain separate responsibilities, and only accepted patterns enter the live logical spawn stream.

Large randomized test samples are useful evidence but do not mathematically prove every future seed safe.

The current pattern catalog, fairness constraint values, retry limits, stream-window values, and fixed live seed are **PROTOTYPE**. M3 validation evidence is recorded in [`docs/milestones/M3-seeded-run-validation.md`](docs/milestones/M3-seeded-run-validation.md).

M4 hazard approach scheduling derives its logical look-ahead distance from minimum reaction seconds × authoritative scroll speed. Existing scheduled hazards remain at immutable logical positions when speed changes. A requested increase is rejected unless every scheduled future hazard still meets the minimum reaction time, leaving the current applied speed authoritative; an accepted increase moves only the unscheduled cursor far enough to preserve the new minimum, while a decrease applies immediately and keeps the extra lead. Structured timing and speed-resolution snapshots expose the limiting target and maximum safe speed without making viewport width a gameplay input. The reaction-time value remains **PROTOTYPE**.

The integrated M4 live policy additionally defers speed changes in either direction and flight-tuning changes until accepted content has cleared, leaving recovery space so pending changes can apply. Deferred encounters must preserve the current reaction horizon, and recoverable fairness rejection must not permanently end generation. Live transition checks retain representative trajectories that survive the accepted hazard geometry; the bounded sampling remains **PROTOTYPE** and may conservatively reject playable content. See `ARCHITECTURE.md` for state and timing ownership.

M4 pattern validation also checks whether a geometrically open corridor intersects a conservative vertical-flight envelope within the available reaction time. The envelope uses the existing flight equations, explicit flight tuning and current/representative vertical state, plus the logical player collision extents. Edge contact is safe under the existing positive-area collision rule. Reachability contexts and failure reasons are structured and deterministic; their current values remain **PROTOTYPE**.

Consecutive-encounter validation adds a pure layer above isolated pattern fairness. It carries a bounded set of correlated representative position/velocity states at the previous encounter exit, derives the next encounter's first eligible safe-corridor requirement from conservative swept geometry, and converts logical distance to available transition time with explicit authoritative scroll speed. A candidate transition passes when at least one represented exit state can reach that entry; impossible chains are rejected with evidence distinct from isolated-pattern issues while consuming exactly one seeded generator step and producing no spawns. This is deliberately conservative **PROTOTYPE** sampling rather than exhaustive pathfinding or player-skill prediction. Live ownership of exit envelopes and combined encounter-policy activation landed in #120.

M4 difficulty is derived deterministically from logical run distance and one explicit, capped **PROTOTYPE** tier configuration. Its immutable snapshot centralizes scroll-speed scaling, reaction-time and safe-corridor targets, reaction spacing, and pattern entry/density eligibility limits. Progression increases challenge across multiple parameters rather than only making the world faster. Difficulty has no viewport, FPS, wall-clock, failure-history, or pacing/intensity input. Typed adapters expose the snapshot to run motion, timing, validation, pattern selection, and Director diagnostics; full live encounter-policy integration landed in #120.

M4 pacing now has a separate deterministic logical-distance authority. Its **PROTOTYPE** policy repeats Breather → Low → Medium → High → Peak → Breather, with explicit recovery windows and entry/density ceilings that request sparse content even after difficulty caps. Snapshots expose phase boundaries and intensity for encounter selection and Director diagnostics. Pacing does not consume random draws, depend on physical viewport size, or alter one-button input. Selection adapters narrow eligible patterns and prevent their authored spans from crossing phase boundaries; fairness validation remains mandatory. Live encounter-policy integration landed in #120, applying these pressure and recovery requests to the live stream.

M4 pattern data now includes an immutable typed encounter profile for policy integration. Each profile explicitly declares an inclusive difficulty-tier range, supported pacing intensities, available behavior tags, a stable variety-family identity, and bounded **PROTOTYPE** pressure/readability costs. These fields are deterministic, serializable, and independent of Phaser and physical viewport dimensions. Current prototype fixtures are explicitly profiled; combined live selection landed in #120.

M4 recent-history variety policy retains the last two accepted variety-family identities by default. It consumes no random values, never records rejected candidates, and suppresses immediate or near-immediate family repetition while fresh alternatives remain in the already-eligible catalog. Recent candidates stay available as an authored-order deterministic fallback when content is scarce or fresh candidates fail hard fairness, without restoring anything excluded by pacing or difficulty. Explicit **PROTOTYPE** policy data may allow deliberate family recurrence. History is immutable, serializable, bounded independently of run length, and unaffected by viewport dimensions; live orchestration with the other encounter policies landed in #120.

M4 active readability policy reserves each pending/active encounter's profile pressure and readability costs across explicit relative simulation-time windows, with separate warning-channel and lethal-window concurrency. The default **PROTOTYPE** hard budget allows six combined pressure units, six combined readability units, two simultaneous warnings, two simultaneous lethal windows, and at most 32 tracked encounters. Higher requested pressure cannot raise those caps; a breather may request zero. Over-budget candidates are deferred with structured metric/time evidence and do not change occupancy. Half-open windows permit exact handoffs, expiry releases budget only through TimeService-normalized delta, and zero delta leaves state unchanged. The bounded serializable state has no Phaser, physical viewport, wall-clock, GPU, or audio-mixing input; live interval construction and combined encounter scheduling landed in #120.

### FUTURE

Difficulty and pacing values must be tuned through playtesting. Live encounter integration should realize readable pressure/recovery rather than permanent maximum intensity, keeping pacing separate from the difficulty tier.

Scheduling belongs in [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## 11. Score, results, and run rewards

### DECIDED M5 direction — implementation pending

M5 will provide the smallest score/result/basic-reward model needed for the complete arcade loop. Focused ownership is Issue #198, with #85 consuming its result data for fail/results/retry presentation.

Score may reflect approved authoritative skill signals such as:

- distance;
- Graze;
- collectibles;
- other explicitly approved run-local skill signals.

Exact formulas and reward values remain **TBD / PROTOTYPE** until implemented and playtested.

M5 requirements:

- create one immutable authoritative final result snapshot at run end;
- post-death presentation cannot change final distance, score, collected totals, Graze totals, rewards, or RNG state;
- results should make a failed run visibly consequential using available authoritative feedback such as distance, score, PB/record deltas, collections, and skill totals;
- ordinary retry remains one clear action with no required main-menu round trip;
- a small local-first best-distance/best-score record is allowed if justified for replay feedback, but M5 must not prebuild the M7 persistence/meta architecture;
- presentation is never the authority for gameplay counting.

Final economy, progression, shop, gacha, battle-pass, daily-mission, cloud-profile, and monetization behavior are outside M5.

Scheduling belongs in [`docs/ROADMAP.md`](docs/ROADMAP.md) and parent Issue #197.

---

## 12. Economy, collection, Gallery, and character ownership

### DECIDED principles

For the initial development/release direction:

- local-first;
- offline-first;
- no real-money mechanics in the approved roadmap;
- economy/content data should be data-driven where practical;
- no final currency names, costs, rates, or gacha rules are locked.

### FUTURE

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

## 13. Persistence

### FUTURE

Initial persistence target: local storage through a centralized `SaveManager` boundary.

Requirements when implemented:

- versioned schema;
- migration paths;
- development export/import/reset support;
- gameplay systems do not access browser/platform storage directly.

Exact schema remains **TBD**. Scheduling belongs in [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## 14. Director / developer tooling

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

Director Mode includes a compact, safe-area-aware performance HUD as development-only instrumentation. Phaser `actualFps` is the glanceable FPS headline, while bounded rolling average/P95/P99, current, worst, and slow-frame metrics use unsmoothed `game.loop.rawDelta`. Sampling continues at frame cadence with fixed storage, but percentile calculation and DOM updates are capped to a low refresh rate. Hidden/background/resume intervals are excluded, and profiler values never affect simulation or content decisions.

---

## 15. Asset-production principles

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

Detailed future art/pipeline exploration belongs in [`docs/BACKLOG.md`](docs/BACKLOG.md). Technical pipeline boundaries belong in [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 16. Audio

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

## 17. UI and accessibility

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

## 18. Localization

### FUTURE / TBD

Do not introduce a full localization framework before text/content needs justify it.

Avoid scattering user-facing strings throughout gameplay-rule code. When text-heavy UI begins, introduce a simple centralized content/text structure first.

---

## 19. Performance

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

## 20. Release and online-service boundaries

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

## 21. Roadmap ownership and current scope

[`docs/ROADMAP.md`](docs/ROADMAP.md) is the **single source of truth for milestone sequencing and milestone-level future scope**.

This specification intentionally does not duplicate the complete M0–M9 roadmap.

Current milestone:

- **Pre-M5 transition (M4 complete; M5 parent #197 approved; implementation blocked by Pre-M5 exit gate)**
- Approved M5 parent Issue: [#197](https://github.com/bongohorse/monster-girl-delivery/issues/197)
- Previous parent Issue: [#116](https://github.com/bongohorse/monster-girl-delivery/issues/116) (closed on M4 closeout merge)
- Milestone completion report: [`docs/milestones/M4-run-pacing-hazard-language.md`](docs/milestones/M4-run-pacing-hazard-language.md)

Completed milestone history and evidence live under [`docs/milestones/`](docs/milestones/).

---

## 22. Future ideas and open design questions

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

## 23. Product decision log

### 2026-09-03

- Mobile-first direction established; browser remains the primary development/test distribution.
- Local/offline-first established.
- No real-money mechanics in the initial approved direction.
- M1 smartphone/tablet evidence in [`docs/milestones/M1-device-report.md`](docs/milestones/M1-device-report.md) accepted as sufficient to continue the mobile-first project.
- Landscape selected as **DECIDED** for the current core game; Portrait retained only as a **FUTURE** separate mode/variant possibility.

### 2026-09-10

- M5 focused parent plan approved as Issue #197, while implementation remains blocked until the Pre-M5 exit gate is sufficiently resolved.
- M5 adopts five design rules: death is entertainment; one-action retry; collectible paths teach/guide movement; failure still provides meaningful run feedback; permanent controls remain simple while future temporary modes may reinterpret them.
- M5 focused work promotes #198 (score/result snapshot/basic rewards), #90 (Graze), #84 (collectible paths), and #85 (fail-state/retry) subject to dependency ordering.
- Deliberately manufactured procedural unfairness is rejected as a retention strategy; MGD's logical fairness/reachability/readability authorities remain binding.
- Vehicles, mounts, transformations, Delivery Contracts/missions, prestige, and deep meta systems remain outside M5 implementation scope unless separately promoted later.
