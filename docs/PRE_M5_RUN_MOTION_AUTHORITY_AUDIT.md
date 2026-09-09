# Pre-M5 run-motion, logical-distance, and difficulty authority audit

Issue: #181  
Specialist: Gameplay Engineer (`gameplay-core`)  
Decision: **DEFER**

This audit compares MGD's current prototype run-motion ownership with the recovered Jetpack reference structure. It evaluates authority, progression shape, fairness coupling, reset semantics, and future temporary-speed ownership without copying reference tuning or changing production behavior.

## Executive conclusion

MGD already has the right **core ownership shape**: one logical run-distance state, one base run-speed configuration, one deterministic distance-derived difficulty authority, and one live hazard/fairness application gate that decides when a requested speed may become the applied simulation speed. That structure should be preserved.

The unresolved question is **balance policy**, not correctness. MGD currently changes several difficulty dimensions at the same distance-tier boundaries: speed rises while reaction time, reaction spacing, and corridor requirements tighten and pattern entry/density allowances expand. The shipped reference instead demonstrates a continuous, distance-driven, capped start-to-end base-speed progression with temporary modifiers composed separately. That is useful evidence that speed progression can be owned independently, but it does not prove MGD should adopt that curve.

Because #181 explicitly requires a manual playtest to distinguish interesting late-run encounter pressure from pressure caused merely by faster scrolling, this audit does not autonomously retune or restructure the prototype. The current model remains viable through Pre-M5, while the eventual balance decision should be informed by playtest evidence.

## MGD authority map

```text
RunMotionConfig.baseScrollSpeed
        |
        v
calculateDifficulty(logical run distance)
        |
        v
scaleRunMotionForDifficulty(...scrollSpeedMultiplier)
        |
        v
requested RunMotionValues.baseScrollSpeed
        |
        v
GeneratedHazardStream.resolveHazardSafeSpeedChange(...)
        |
        |  apply immediately when safe / no pending policy content
        |  otherwise retain prior schedulingWindow.scrollSpeed
        v
hazardStream.schedulingWindow.scrollSpeed  <-- final applied live speed
        |
        +--> PrototypeRunSimulation / stepRunMotion
        |       |
        |       v
        |   RunMotionState.distance
        |       |
        |       +--> difficulty / pacing / generation snapshots
        |
        +--> hazard approach / reaction-time scheduling
        +--> live encounter policy and transition safety
        +--> presentation projection through Foundation
```

### Single logical-distance authority

`RunMotionState.distance` is cumulative forward logical distance. `stepRunMotion` advances it as:

```text
nextDistance = currentDistance + appliedLiveScrollSpeed * elapsedSeconds
```

`elapsedSeconds` is already normalized by `TimeService`. Viewport size and Phaser presentation are not inputs. Difficulty is then derived from this logical distance rather than maintaining an independent progression clock.

### Base, requested, and applied speed authority

`RunMotionConfig` owns the live base scroll-speed tuning. The current prototype default is `350` logical pixels per second. Difficulty does not mutate that configuration; `scaleRunMotionForDifficulty` derives an immutable **requested** run-motion snapshot from the base value and the current tier multiplier.

That requested value is not always the final live simulation speed. `GeneratedHazardStream.resolveHazardSafeSpeedChange` resolves it against already accepted future content. In policy mode, if a requested speed differs while accepted policy content is still pending, the transition is deferred and the prior `state.schedulingWindow.scrollSpeed` is retained. Unsafe increases are likewise deferred when they would violate an already promised reaction window. Once the blocking content has cleared, a later resolution may apply the then-current requested speed.

The live authority chain is therefore:

```text
RunMotionConfig snapshot
× DifficultySnapshot.scrollSpeedMultiplier
= requested scroll speed

requested scroll speed
→ GeneratedHazardStream safety/policy transition gate
→ hazardStream.schedulingWindow.scrollSpeed
= final applied live speed for that simulation step
```

`Foundation` uses the resolved hazard-stream scheduling window for movement, so the authoritative applied speed and the speed used for hazard fairness remain the same value. There is no second gameplay clock or presentation-owned horizontal movement authority.

### Current progression shape

The M4 prototype difficulty table is distance-driven, stepped, and capped:

| Tier | Start distance | Speed multiplier | Minimum reaction time | Minimum reaction spacing | Minimum corridor | Max entries | Max hazards / 1000 |
|---|---:|---:|---:|---:|---:|---:|---:|
| tier-0 | 0 | 1.00 | 2.0 s | 96 | 96 | 3 | 5 |
| tier-1 | 2,500 | 1.08 | 1.9 s | 88 | 90 | 4 | 6 |
| tier-2 | 6,000 | 1.16 | 1.8 s | 80 | 84 | 5 | 7 |
| tier-3 | 10,000 | 1.24 | 1.7 s | 72 | 78 | 6 | 8 |

The final tier is capped because `calculateDifficulty` remains on tier-3 after 10,000 logical distance.

## Representative MGD speed / reaction table

For the current base speed of `350` and a fixed logical approach distance of `800`, the tier policy requests:

| Run distance | Tier | Base speed | Requested tier speed | Minimum reaction time | TTI for 800 if applied | Minimum reaction horizon if applied |
|---:|---|---:|---:|---:|---:|---:|
| 0 | tier-0 | 350 | 350 | 2.0 s | 2.286 s | 700.0 |
| 2,500 | tier-1 | 350 | 378 | 1.9 s | 2.116 s | 718.2 |
| 6,000 | tier-2 | 350 | 406 | 1.8 s | 1.970 s | 730.8 |
| 10,000 | tier-3 | 350 | 434 | 1.7 s | 1.843 s | 737.8 |

These rows describe the **requested** difficulty progression. At a tier boundary with pending accepted policy content, the applied speed can temporarily remain the previous `schedulingWindow.scrollSpeed`; during that retention interval, live distance advancement and hazard timing continue to use that retained applied value rather than the newly requested tier value. After the gate can safely apply the request, the live scheduling window moves to the current requested speed.

The same 800-unit lead therefore becomes progressively shorter in wall-clock reaction time when a higher requested speed is actually applied. The fairness authority derives the required logical reaction horizon from the **applied scheduling-window speed × current minimum reaction time**; accepted speed changes are constrained by already scheduled content rather than blindly invalidating prior guarantees.

This matters because the speed multiplier is not an isolated cosmetic lever: when applied, increasing it changes time-to-impact, transition duration, flight opportunity, scheduling horizon, and the rate at which logical distance itself advances through subsequent difficulty and pacing regions.

## Reference comparison

The recovered reference has the following confirmed structure:

```text
START_VELOCITY / END_VELOCITY / VELOCITY_STOP_DISTANCE
        |
        v
continuous distance-derived normalized progress, clamped [0, 1]
        |
        v
CURRENT_LEVEL_VELOCITY
        |
        +--> movement / hazards / player consumers
        |
        v
normalized RunStats distance
```

Key structural differences:

| Concern | MGD prototype | Recovered reference | Audit assessment |
|---|---|---|---|
| Logical distance | Continuous logical distance from applied live speed × normalized delta | Normalized logical run distance derived from Level/world-X | Both have one shared gameplay distance authority. |
| Base speed | `RunMotionConfig.baseScrollSpeed` | Start/end velocity configuration | Both centralize base run speed. |
| Normal progression | Distance-tier multiplier produces a requested speed; live hazard/fairness gating may defer when that requested speed becomes applied | Continuous distance-derived start→end interpolation | Different shape/application semantics; reference does not prove MGD's steps are wrong. |
| Final applied speed | `GeneratedHazardStream` resolves the request and `schedulingWindow.scrollSpeed` is the live simulation/fairness value | `CURRENT_LEVEL_VELOCITY` is the recovered shared current level velocity | Both expose one effective live value to gameplay consumers, though MGD explicitly protects accepted encounter guarantees during transitions. |
| Cap | Final difficulty tier at 1.24× requested multiplier | Progress clamped to `[0,1]` toward configured end speed | Both are explicitly capped. |
| Difficulty coupling | Same tier changes requested speed, reaction/corridor constraints and content eligibility | Recovered base speed progression is a separate authority from temporary mode modifiers | MGD coupling is the main design question to validate, not an architecture defect. |
| Temporary modifiers | No current production vehicle/boost override system | Vehicles, boost/slowdown, conveyor and local offsets compose separately | MGD should preserve a distinct composition boundary when a real mode requires it; do not build it speculatively now. |
| Hazard consumption | Scheduling/fairness and movement consume the resolved `schedulingWindow.scrollSpeed`; individual hazards may own threat-relative behavior | Missile/world-speed paths consume current level speed and compose hazard-specific motion | Same useful principle: hazards may own threat-relative behavior but not a second base-run authority. |
| Presentation | Foundation projects authoritative logical run state; rendering does not own run distance | Level movement is driven from effective logical velocity × runtime time; per-layer parallax remains separate | Both keep gameplay motion authoritative while allowing cosmetic render factors. |

No recovered reference constant is adopted as an MGD tuning target.

## Speed progression versus pacing and pattern complexity

MGD intentionally keeps **pacing** separate from difficulty. Pacing owns a repeating distance cycle of breather/pressure phases and consumes no PRNG draws. Difficulty separately owns requested speed scale, fairness targets, spacing, and pattern entry/density eligibility.

That separation is architecturally sound, but the current difficulty tier still bundles several escalation dimensions. At each threshold the player requests a simultaneous change toward:

- faster horizontal progression;
- lower minimum reaction-time target;
- narrower minimum corridor requirement;
- smaller reaction spacing;
- higher pattern entry allowance;
- higher hazard-density allowance.

The live stream may phase the speed transition relative to accepted encounter content, but the policy still creates compound escalation. It may be desirable, but the code alone cannot establish that the resulting late-run pressure is better than keeping speed flatter while encounter grammar becomes more demanding.

The correct next evidence is the manual comparison requested by #181, not an autonomous curve rewrite.

## Fairness / reaction-time consumers

The current architecture already treats applied speed as consequential gameplay state:

- `scaleRunMotionForDifficulty` derives the requested speed from the difficulty snapshot;
- `resolveHazardSafeSpeedChange` decides whether that request can become the applied speed without breaking already accepted reaction guarantees;
- in live policy mode, pending accepted content retains the prior applied speed for either-direction parameter changes until it clears;
- `advanceGeneratedHazardStream` stores the applied value in `schedulingWindow.scrollSpeed` and derives the reaction window from it;
- `Foundation` advances run motion using that resolved applied speed;
- transition reachability and live encounter evaluation consume the scheduling-window speed;
- run distance and therefore future difficulty/pacing progression advance from the same applied value.

Accordingly, any later speed-progression adjustment must rerun fairness, transition/reachability, pacing, and deterministic long-run evidence. A speed curve must never be introduced only in presentation.

## Determinism and frame partitioning

For a given explicit run state, difficulty/base-speed request, hazard-stream state, and normalized elapsed-time sequence, the requested-to-applied speed transition and resulting run distance are deterministic. `stepRunMotion` has no PRNG or Phaser dependency and performs only deterministic arithmetic; the live caller supplies the already resolved `schedulingWindow.scrollSpeed`.

The architecture requires gameplay time to come from `TimeService`, and run motion consumes seconds already normalized there. Difficulty itself is a pure function of run distance. The hazard-stream speed gate depends on explicit stream/policy state and accepted content, not display FPS. There is no frame-rate-specific branch, fixed-step accumulator, or separate speed timer in this authority.

Existing frame-partition expectations therefore remain unchanged: equivalent normalized simulation histories and equivalent hazard-stream states produce equivalent applied-speed transitions and distance subject only to normal floating-point tolerance. Exact tier-boundary timing is governed by logical distance; whether a newly requested tier speed can apply immediately is governed by the deterministic accepted-content safety state, not display FPS.

## Reset and lifecycle semantics

### New run / restart

A fresh run initializes logical run motion at distance `0`. Difficulty therefore deterministically resolves to tier-0 and requests the current base speed × 1.0. The newly created hazard stream initializes its scheduling window from that request, so requested and applied speed begin aligned. A restart creates fresh run and stream state rather than carrying prior run distance or a deferred speed transition forward.

### Death

The prototype run authority transitions from `running` to `dead`; dead authoritative gameplay remains frozen until a fresh run state replaces it. Run distance and hazard-stream parameter progression do not continue as presentation-side clocks after death.

### Pause / zero delta

`TimeService` owns pause/resume and normalized delta. A zero gameplay delta produces zero run-distance advancement. Background/inactive time cannot independently advance this system. Parameter resolution remains state-based; zero elapsed time does not fabricate progression through pending accepted content.

### Temporary modes

There is no approved production vehicle/boost mode that currently owns horizontal run speed, so adding a generic modifier stack now would be speculative. The architectural extension contract should remain:

```text
base run speed
→ ordinary distance progression policy
→ explicit temporary mode modifier/override when a real mode owns one
→ requested run speed
→ existing safety/policy application gate
→ one applied run speed consumed by simulation/fairness/presentation
```

Restoration must be explicit from the owning mode state rather than by reverse-mutating difficulty or asking individual hazards/presentation layers to remember old speed. Any temporary-mode restoration request must still pass through the same application gate so accepted encounter guarantees are not invalidated. This is a future compatibility requirement, not a request to implement that layer in #181.

## Specific questions

### Is speed a useful independent difficulty dimension?

Potentially yes. The current fairness architecture is already capable of consuming changing requested speed safely by controlling when it becomes the applied live speed. The audit finds no structural reason to remove speed progression.

### Is `scrollSpeedMultiplier` too tightly coupled to difficulty tiers?

It is **policy-coupled**, not technically duplicated. One difficulty snapshot owns the multiplier alongside multiple other escalation variables. That is coherent, but it prevents independently shaping speed versus encounter-complexity escalation without changing the difficulty configuration model.

This is not sufficient evidence for a refactor by itself.

### Is it redundant with pacing/pattern complexity?

Not mathematically: applied speed changes time-to-impact and distance traversal rate, whereas pacing changes encounter intensity and pattern eligibility. But the player's felt pressure can overlap. Manual evidence is required to decide whether the combination is desirable.

### Is it too coarse or aggressive?

The current progression requests four discrete multipliers from 1.00 to 1.24. The safety gate can delay a tier-speed transition while accepted content drains, but code/evidence alone still cannot establish whether the steps are perceptually too coarse or whether 24% total escalation is too aggressive. This is exactly the subjective balance question that must not be guessed by an autonomous worker.

### Is a cap/curve/ownership contract missing?

- **Cap:** present; the final tier is terminal.
- **Requested-speed ownership:** present in `RunMotionConfig × DifficultySnapshot`.
- **Applied-speed ownership:** present in `GeneratedHazardStream.schedulingWindow.scrollSpeed` after `resolveHazardSafeSpeedChange`.
- **Continuous curve:** absent, but not proven necessary.
- **Temporary-mode composition:** not implemented because no current mode requires it; the future ownership direction is documented above.

## Manual evidence still required

A focused Director playtest should compare at least early-, mid-, and late-tier runs and record whether increasing pressure is primarily attributable to:

1. faster applied scrolling / shorter time-to-impact;
2. richer pattern eligibility and density;
3. pacing phase intensity;
4. the compound interaction of those dimensions.

The key decision question is whether late-run play becomes more interesting or merely more hurried. No automated test or reference-game reconstruction can answer that subjective balance question.

## Decision: DEFER

**DEFER** changing run-speed progression.

Keep the current single-chain run-motion architecture and current capped tier-based prototype through the Pre-M5 audit. Preserve the existing distinction between requested difficulty-scaled speed and the final hazard-safe applied speed. Do not copy the reference's continuous curve and do not create a speculative temporary-speed framework.

Revisit the speed-shape policy only after the requested gameplay evidence exists. If that evidence shows compound tier escalation is too coarse or speed dominates encounter complexity, create a focused follow-up that adjusts the smallest owning configuration/contract and reruns the affected fairness, reachability, pacing, and deterministic validation.

No production code or configuration changes are made by this audit.