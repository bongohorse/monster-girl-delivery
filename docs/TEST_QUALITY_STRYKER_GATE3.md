# Test Quality Gate 3 — bounded Stryker Collectibles pilot

Umbrella: #371

Gate 3 mutation-tests only the Collectibles authority slice that already has independently stated rules. Mutation testing is evidence about test sensitivity; it is not a correctness oracle and there is no target mutation score.

## Scope

The final pilot mutates only selected ranges in `src/systems/PrototypeCollectibles.ts`:

- pickup footprint / hitbox construction;
- horizontal first-contact window construction;
- consumed-identity rejection;
- exact pickup precheck and contact-boundary resolution;
- lethal-before-pickup fallback and its work evidence.

The vertical polynomial/root solver is intentionally excluded. Gate 2 did not establish an independent oracle for that algorithm, so mutating it here would create survivors that Gate 3 could not honestly classify as test gaps. General hazard collision, generation, presentation, Graze, scoring and unrelated lifecycle/broadphase code are also outside this pilot.

The exact ranges are versioned in `stryker.collectibles.config.mjs`.

## Tie semantics

“Pickup wins an exact first-contact tie” means equal **onset boundaries for future positive-area overlap**. It does not turn zero-area edge contact into a pickup.

For the analytical Gate 2 fixture:

- at exactly `t = 1.32 s`, the player/coin and player/hazard AABBs only touch at an edge;
- therefore at that exact endpoint there is neither pickup nor lethal collision;
- a step extending immediately beyond `1.32 s` contains positive-area overlap for both;
- only a lethal onset strictly earlier than the pickup onset blocks pickup;
- equal onset boundaries therefore award pickup while the enclosing step still ends dead.

The permanent authority tests cover the boundary-only and immediately-after-boundary cases separately.

## Toolchain and compatibility findings

Pinned project tooling:

- `@stryker-mutator/core@10.0.0`;
- `vitest@5.0.1`;
- TypeScript `7.0.2`;
- Node `24.21.0` in the mutation workflow.

Two upstream/tool-integration failures were found and are part of the Gate 3 evidence rather than hidden:

1. Stryker 10's TypeScript config rewriter calls `ts.parseConfigFileTextToJson`, which is not available in the installed TypeScript 7 API. The pilot does not need tsconfig path rewriting, so the Stryker config disables that rewrite and guards against future `extends`/`references` until this workaround is reassessed.
2. The initial official Stryker Vitest-runner experiment produced apparently stable survivors for which **zero tests actually ran** under Vitest 5. Those results were rejected. The project does not keep `@stryker-mutator/vitest-runner` as a dependency.

The accepted pilot uses Stryker's built-in command runner. Every mutant starts a fresh Vitest process over the two focused Collectibles suites. The wrapper stores Vitest JSON and an evidence record for each mutant.

The workflow derives the expected assertion count from a fresh baseline report. For every `Killed` or `Survived` mutant it requires:

- the full expected focused test count to have completed;
- no runtime/setup failure;
- `Killed` to correspond to a real focused test failure;
- `Survived` to correspond to all focused tests passing.

This prevents “no tests ran” from being accepted as a survivor again.

## Reproducibility

The accepted final pilot tested PR head:

`0b38c70089d409277be20207c4b0f8654add019e`

GitHub Actions run:

- workflow: **Collectibles mutation audit #14**
- run ID: `35528186967`
- PR merge-ref checkout/report commit: `adbc44c644486f22a674f475133eb1a2170e9299`
- base main at the time: `138ce5b3bd08e32fab19d10058d44b200d20d582`
- focused baseline: **20 assertions**
- pilot 1 runtime reported by Stryker: **43 s**
- pilot 2 runtime reported by Stryker: **42 s**
- workflow total: about **1 min 54 s**
- retained artifact ID: `10610043059`
- artifact digest: `sha256:7ac1b7dd4748e17649cbb46151991fc828d44f40615f3b789f22d4086eed23f5`

Both runs generated the same 71 mutant identities, locations, replacements and terminal verdicts.

| State | Run 1 | Run 2 |
| --- | ---: | ---: |
| Killed by focused test failure | 49 | 49 |
| Survived | 22 | 22 |
| NoCoverage | 0 | 0 |
| Timeout | 0 | 0 |
| CompileError | 0 | 0 |
| RuntimeError | 0 | 0 |
| Ignored by Stryker | 0 | 0 |

Verdict changes between runs: **0**.

No score threshold is used to pass or fail Gate 3.

## Gaps found and closed during the pilot

The pilot was used diagnostically. It found meaningful gaps and those were closed with independently reasoned tests:

- pickup geometry had only been probed on one horizontal and one vertical side; the permanent oracle now covers ahead/behind and above/below exact-touch/inside/outside symmetry;
- first-contact arithmetic needed a translated non-zero run-origin case;
- the standalone lazy lethal-hazard fallback needed its own death-before-pickup case;
- a valid `baseScrollSpeed = 0.5` case exposed that a division-to-multiplication mutation could truncate the horizontal overlap window. An analytical X/Y-overlap test now kills that mutation.

The last item is why the final pilot moved from 48/23 to **49/22**: the meaningful sub-unit-speed survivor is no longer alive.

## Final survivor classification

All 22 final survivors are classified below. A survivor is not called a test gap merely because it survived.

### Equivalent within the valid audited domain — 14

Mutant IDs:

`17, 19, 21, 22, 23, 24, 26, 27, 29, 34, 37, 40, 41, 43`

These mutate the zero-scroll special branch or widen/relax the computed horizontal contact window.

Why they are equivalent for the audited call domain:

- `getFirstCollectibleContactSeconds` is reached only after the exact positive-overlap precheck has already established a real collectible overlap during the step;
- for zero scroll, reaching this helper means the initial run distance is strictly inside the horizontal interval; falling through to the generic division path yields the same effective `[0, elapsed]` window;
- canonical run distance is cumulative/non-negative, so mutant 34 widens rather than advances the valid exit boundary;
- mutant 37 widens the end beyond elapsed time, but the trajectory segments themselves end at the real step endpoint;
- the line-223 guard mutations remove/relax a rejection that cannot fire after the exact precheck has established a non-zero horizontal intersection.

These are documented equivalents, not missing assertions.

### Performance-only in the audited behavior domain — 3

Mutant IDs:

`51, 52, 58`

- 51/52 remove the preliminary exact-pickup miss rejection. The later contact resolver still rejects the audited misses, so gameplay outcome is unchanged, but unnecessary exact contact-resolution work can occur.
- 58 replaces the full-step lethal-hazard filter with the unfiltered hazard list. `hasLethalCollisionBy` still performs the authoritative prefix collision check, so pickup/death results remain unchanged while extra hazards can reach that work.

These belong to work-counter/performance evidence rather than a forced gameplay assertion.

### Work-evidence only — 3

Mutant IDs:

`61, 62, 63`

These alter only `broadphaseWorkCounters.hazardCollisionEvaluationCount` bookkeeping: disable the guarded increment or reverse it. They do not affect gameplay authority.

They are classified as performance/evidence-only survivors. Gate 3 does not invent gameplay expectations merely to kill instrumentation mutations.

### Outside the independently established Gate 3 oracle — 2

Mutant IDs:

`54, 56`

These remove the defensive `contactSeconds === null` rejection after the exact collision precheck.

For them to change gameplay, the exact continuous-collision precheck and the separate first-contact solver must disagree on a valid trajectory. Gate 3 deliberately does not use one implementation as the oracle for the other, and its vertical root-solver correctness is not independently established here. Therefore these mutants are **out of the Gate 3 proof domain**, not silently labeled equivalent.

Independent collision/contact-solver consistency belongs to the later collision/simulation reference expansion gate.

## Permanent execution policy

The mutation audit workflow is **manual-only** through `workflow_dispatch`. It is intentionally not part of normal PR CI.

Bounds remain:

- only the configured Collectibles ranges;
- Stryker concurrency 2;
- workflow timeout 25 minutes;
- per-mutant timeout controls `timeoutFactor: 2`, `timeoutMS: 8000`;
- two identical full mutation passes;
- full baseline, per-mutant Vitest evidence, normalized mutant list, JSON/HTML report and stability summary retained as artifacts.

Normal PR CI remains responsible for formatting/lint, typecheck, the full Vitest suite and production build.

## Gate 3 conclusion and limits

Gate 3 is complete when this evidence lands:

- bounded pilot runs reproducibly;
- every accepted `Killed`/`Survived` verdict has real focused-test execution behind it;
- all relevant survivors are classified;
- meaningful behavioral survivors found by the pilot are closed;
- no mutation-score threshold is used.

Remaining limits are explicit:

- this is not a proof of all Collectibles behavior;
- the vertical root solver is intentionally outside this gate;
- performance/evidence-only survivors are not converted into artificial gameplay tests;
- collision/contact-solver consistency needs an independent oracle before it can be claimed generally;
- the manual workflow should be rerun when the audited Collectibles authority or its focused tests materially change.
