# M5 contact-sharing acceptance evidence

Owner: [#331](https://github.com/bongohorse/monster-girl-delivery/issues/331).
Audited runtime baseline: `4a2b4fca292e6a6862d636bf59a9903bbd3780c9`.

The remaining #331 work is acceptance evidence. The production changes already landed through
#342, #343, #344 and the subsequent #332 Zapper work. This closeout adds no runtime cache or new
collision authority.

## Acceptance audit

| Requirement | Implemented owner and evidence |
| --- | --- |
| Reuse hazard identities | `PatternSpawnScheduler` prewarms a `WeakMap` cache for immutable own-data spawn identities. `PatternSpawnScheduler.test.ts` protects stable reuse and excludes mutable/accessor-backed carriers. |
| Avoid repeated lifecycle scans | `TelegraphedHazardSimulation` and `TimedZapperSimulation` publish frozen identity indexes. Stepping, collision adapters and presentation use indexed lookups; legacy/manual states retain the explicit fallback. `TimedLaserSimulation.test.ts` and `TimedZapperSimulation.test.ts` prohibit `.find()`/`.map()` on indexed states, including index misses. |
| Reuse whole-step core contact | `stepPrototypeRun` shares one trajectory and conservative candidate set, then passes Graze's resolved lethal hazards to pickup ordering. `PrototypeCollectibles.test.ts` protects reuse and terminal pickup ordering. |
| Share expensive Zapper geometry | `evaluatePrototypeGrazeStep` uses the paired core/Graze query. `PrototypeZapperCollisionWorkEvidence.test.ts` and `PrototypeZapperGraze.test.ts` protect shared sampling/geometry and gameplay outcomes. |
| Preserve ordering | Whole-step lethal results only eliminate impossible candidates. Each relevant pickup/Graze prefix still asks the existing continuous collision authority whether lethal contact has already happened. |
| Bound retained work/state | Candidate/contact arrays are local to a step; lifecycle indexes contain only that state's retained instances; identity keys are weak. The sharing changes add no per-frame history. |
| Preserve deterministic outcomes | Existing `SystemPartitionEvidence`, `FramePartitionSimulation`, `CollectibleFramePartitionEvidence`, `PrototypeZapperGraze` and timed-hazard tests remain the behavioral evidence. |

The live path is `Foundation.update` → authoritative lifecycle steps/indexes → collision adapters →
`stepPrototypeRun` → Graze → collectible ordering. Presentation reads the indexed lifecycle state;
it does not simulate a second lifecycle.

## Reproducible work comparison

```bash
bun run test tests/systems/PrototypeContactSharingEvidence.test.ts
```

The workload is one 50 ms step, normal 350 px/s scroll and default flight tuning, eight identified
200 px Zappers rotating at 90°/s, and four nearby coins. It uses real Zapper factories and the public
run/trajectory/contact authorities. This is a bounded Director-style stress input, not evidence
that AUTO generation admits eight simultaneous Zappers or that a normal run has this cost.

Both comparisons use identical inputs and current collision algorithms. The comparison side
deliberately omits one sharing mechanism: separate core/outer calls, or the supported standalone
pickup fallback without an upstream lethal set. It is a controlled work comparison, **not** a
historical-build timing benchmark or an independent correctness oracle.

| Work measured in this input | Without the selected sharing | With sharing |
| --- | ---: | ---: |
| Zapper core + outer query calls | 16 | 8 |
| Zapper geometry resolutions | 922 | 568 |
| Run hazard evaluations, keeping paired Zapper queries on both sides | 40 (8 initial + 32 pickup-prefix checks) | 8 |
| Collected coins | 4 | 4 |

Geometry work drops by about 38% in this case. Passing the known-safe whole-step result removes all
32 redundant pickup-prefix hazard queries. These are separate comparisons; their savings must not
be added together or interpreted as frame-time percentages.

The test asserts identical core/outer outcomes, equal complete collectible results, and positive
geometry work with strict reduction. It also asserts the live run uses one Zapper query per hazard.
Coin contact has a simple independent check: `x(t)=350t`, `y(t)=195+800t²`; first horizontal overlap
begins at `(coinX−18−14)/350`. All four contacts lie inside the step and within the vertical pickup
band. Existing collision/order reference tests remain responsible for broader correctness.

## Does the evidence detect lost sharing?

Two temporary faults were executed separately and removed:

| Fault | Observed assertion failure |
| --- | --- |
| Pass `null` instead of Graze's lethal set to pickup evaluation | Live Zapper calls rose from 8 to 40 while the four pickups still matched. |
| Replace paired Zapper evaluation with separate core and outer calls | Paired-query and live-run assertions both observed 16 calls instead of 8. |

These failures were performance assertions, not crashes, timeouts or changed gameplay outcomes.
No fault or temporary logging remains in production/test code.

Local closeout validation: Biome, typecheck, all 116 test files / 834 tests, and production build
passed. This includes the existing partition and terminal-ordering suites. Independent engineering
and spec/runtime reviews found no material issue. Final PR-head CI is recorded in the PR trail.

## Intentionally retained work and limits

- Core and outer checks for non-Zapper hazards use different footprints.
- A terminal prefix query covers a different time interval from the whole-step query. Reusing only
  a whole-step boolean there would lose before/after-death ordering.
- New frozen lifecycle collision carriers need their own initial identity construction; subsequent
  same-object consumers reuse it. Reworking carrier allocation belongs to measured #329 work.
- Presentation's indexed lookup does not justify introducing a second public cache layer.
- Work counters establish fewer collision/geometry operations in the stated workload. They do not
  prove universal no-tunneling, mobile FPS, GC reduction, thermal behavior or subjective game feel.
- Same-device mobile comparisons remain open under #330/#332; allocation/GC evidence remains #329.
  This #331 closeout does not close those issues or the M5 Director gate.
