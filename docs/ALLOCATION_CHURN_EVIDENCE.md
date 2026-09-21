# M5 Allocation Churn Audit and Evidence

Issue: #329

This document records the allocation work that is already merged, the structural before/after
evidence for the representative live-run path, the recurring allocations that intentionally remain,
and the device evidence still required before #329 can close.

The goal is not to make the simulation mutable. MGD keeps immutable authoring, deterministic state
publication, result snapshots and diagnostic boundaries where they provide correctness value. The
target is recurring temporary work whose contents are unchanged or immediately discarded.

## Evidence boundary

The evidence below has two different strengths and they must not be conflated:

1. **Deterministic structural evidence** proves that specific runtime calls no longer materialize
   containers or wrapper snapshots when their authoritative inputs are unchanged. Reference-identity
   tests and full deterministic CI cover this layer.
2. **Runtime GC evidence** requires a real browser/device profile. Structural allocation reduction is
   not itself a claim about mobile FPS, heap size, pause duration or garbage-collection frequency.

The second layer remains open and is required before #329 closes.

## Merged allocation gates

### Gate 1 — stable immutable service snapshots (#340)

Before #340, repeated reads of viewport, flight tuning and run-motion tuning published fresh snapshot
objects even when no owning value had changed.

After #340:

- ViewportService.getSnapshot() returns the same deeply immutable viewport reference until resize;
- flight-tuning reads reuse one frozen snapshot until a real tuning change;
- run-motion reads reuse one frozen snapshot until a real speed change;
- no-op and same-value tuning updates preserve reference identity.

Allocation moved from frame-cadence reads to the actual change boundary.

### Gate 2 — cached Foundation runtime wrappers (#341)

Before #341, stable Foundation.update() frames rebuilt wrapper objects such as flight bounds, the
live generated-hazard context and constant-speed run-motion tuning.

After #341:

- flight bounds are cached by viewport snapshot identity;
- the live hazard context is cached by tuning/domain/observer identity;
- constant-speed run-motion tuning is cached by exact speed;
- resize, Director tuning and vertical-domain replacement invalidate the appropriate cache;
- shutdown clears retained cache references.

The per-segment resolvePlayerTargetAtDelta closure was deliberately retained. Removing it would
require a broader lifecycle API change and has not yet been justified by profiling.

### Gate 3 — generated-hazard spawn-state reuse (#386)

Before #386:

- every freezeState() copied the complete spawns array;
- fill/commit paths eagerly allocated a retention array through filter() even when every spawn was
  still retained;
- motion planning materialized temporary arrays only to compute scalar min/max results.

After #386:

- an already-frozen authoritative spawn array is reused by metadata-only stream publications;
- the retention scan returns the original array when no spawn leaves the retention window;
- a replacement retention array is allocated only after the first real removal;
- a scheduling append array is materialized only when new spawns are actually admitted;
- readability and next-distance-event scans compute scalar min/max values without candidate arrays.

Tests distinguish the two ownership cases explicitly: unchanged membership must retain array identity,
while a real prune must publish a different frozen array.

### Gate 4 — Foundation telegraph-retention fast path (#387)

Before #387, each generated-retention reconciliation built these temporary containers even when the
generated spawn membership was unchanged:

1. currentGenerated.map(...);
2. Set(current identities);
3. retained.map(...);
4. Map(retained by identity);
5. spread of retainedByIdentity.values();
6. filter() result.

The normal running path invokes reconciliation after pre-motion parameter resolution and again after
the end-of-frame scheduling commit. On a stable generated stream this therefore meant **up to 12
temporary containers per rendered frame from this method alone**.

After #387:

- stable generated-array identity takes a no-lookup-container fast path;
- already-retained telegraphs are still checked for authoritative lifecycle expiry;
- if no retained lifecycle expires, the retained array itself is reused;
- the first real expiry allocates the replacement array;
- real generated membership changes still take the full logical-identity reconciliation path;
- that slower path no longer uses the previous map/spread/filter intermediate arrays;
- AUTO-disabled frames do not repeatedly allocate empty retained arrays once retention is empty.

The retention regression proves both sides of the contract: stable active state preserves container
identity, and later lifecycle expiry still publishes a different frozen empty array.

## Representative steady-frame audit

Representative case:

- run phase is running;
- AUTO hazards are enabled;
- viewport and Director tuning are unchanged;
- generated hazard membership is unchanged during the frame;
- no retained telegraph expires during the frame;
- motion stays in one constant-speed segment.

For that case, the work above removes the recurring snapshot/wrapper churn from Gates 1–2, prevents
generated spawns copies from metadata-only publications in Gate 3, and removes the two batches of
retention Set/Map/array materialization described in Gate 4.

This is a structural statement about object/container creation on this path. It does **not** convert
the frame into a zero-allocation frame. Authoritative simulation still publishes values that change
every step.

## Current allocation audit

### Keep: authoritative flight trajectory/state publication

Vertical flight publishes trajectory segments and a final state because continuous collision,
frame-partition correctness and deterministic replay evidence consume that trajectory. These values
change with simulation time and are not stale wrapper copies. They remain intentional until profiling
shows a specific material problem that can be solved without weakening the authority.

### Keep for now: Graze qualification containers

PrototypeGraze currently uses retained/consumed/pending/lethal identity Sets plus a resolved-candidate
Map and result arrays on positive simulation steps. This is the most obvious remaining general
container candidate in the authoritative run step.

It is **not** being rewritten speculatively. Those containers encode:

- occurrence retirement;
- pending-to-consumed qualification;
- same-hazard lethal suppression;
- different-hazard terminal ordering;
- deterministic sorted publication.

That code already carries sensitive frame-partition and terminal-ordering regressions. A replacement
should be driven by allocation profiling and accompanied by equivalent ordering evidence rather than
by a blanket ban on Set/Map.

### Keep for now: motion-planning context publication

Motion planning still publishes bounded plan/segment objects and creates planning context wrappers.
The plan is an actual per-frame authority result rather than a clone of unchanged public state.
Context construction is a remaining candidate for profiling, but caching it requires proving the
policy flight-tuning/observer ownership rules across speed and tuning boundaries.

### Keep: lifecycle state publication when lifecycle changes

Telegraphed-hazard and timed-Zapper simulations publish lifecycle arrays/indexes as authoritative
state. #343 removed repeated linear consumer lookup by publishing bounded identity indexes. Replacing
those state publications with hidden mutation would trade allocation for more difficult state
ownership and replay reasoning; no evidence currently justifies that trade.

### Conditional: collectible Sets

Collectible resolution does not build its consumed Set until the broadphase finds a collectible
candidate for the step. Retained-ID cleanup occurs only after an actual award. This is not the same
unconditional frame-cadence churn as the snapshot and retention cases already removed. Revisit only
if a collectible-heavy profile shows material cost.

### Development-only work

Director debug overlays/diagnostics may build additional Sets, arrays or strings at their own refresh
cadence. Those are not production gameplay authority. #323 owns the broader Performance Lab and must
keep development instrumentation bounded and distinguish Director/dev measurements from
production-style evidence.

## Determinism and regression evidence

The allocation changes above do not introduce a second gameplay authority and do not change PRNG,
collision, Graze, pickup, scheduling or lifecycle rules.

Merged validation includes:

- full project test suites on each gate;
- typecheck and production build;
- existing frame-partition/collision/lifecycle regressions;
- explicit reference-identity tests for stable snapshot, stream and retention ownership;
- Browser runtime smoke on Gate 4.

Performance-only assertions are kept separate from gameplay truth: container identity/counters may
prove work was avoided, but gameplay outcomes remain asserted through the existing authorities.

## Device/browser evidence still required

#329 should remain open until a same-device before/after long-run comparison is recorded.

Use the same device, browser, seed/preset, render scale and run duration for both samples. Record the
existing canonical frame-time statistics (average/P95/P99/worst/slow-frame count) and active content
counts. If the browser exposes trustworthy JS heap/GC information, record it; otherwise use browser
allocation/heap profiling as development evidence and explicitly state that no trustworthy runtime
heap counter was available.

The comparison must answer:

- does the optimized build reduce recurring allocation/GC pressure under a representative long run?
- are slow-frame spikes reduced or at minimum not regressed?
- do retained object/content counts remain bounded?
- do resize, restart and Director tuning still behave correctly after a long run?

Do not fail CI on machine-dependent FPS or heap numbers.

## #329 closeout status

Satisfied structurally:

- stable viewport/config snapshot reads;
- cached Foundation wrappers;
- generated spawn-array/container reuse;
- stable telegraph-retention fast path;
- documented intentional-vs-removable allocation audit;
- deterministic/full-CI correctness on merged gates.

Still required:

- representative browser/device allocation evidence sufficient to judge the remaining Graze/context
  candidates;
- long mobile same-device GC/slow-frame comparison;
- final resize/restart/Director/lifecycle acceptance after that run;
- final #143/full-CI confirmation on the closeout head.

Until those measurements exist, additional invasive allocation refactors are deliberately deferred.
