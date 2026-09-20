# Test Quality Gate 2 — Collectibles authority audit

Umbrella: #371

This gate audits three small gameplay-authority rules before the mutation-testing pilot expands scope. Coverage percentages only selected this area for inspection; they do not define the expected results.

## Rule 1 — pickup boundary

The current prototype pickup contract is **positive-area overlap**, not edge contact.

Independent geometry statement:

- player horizontal logical extents: 18 left / 18 right;
- player vertical logical extents: 24 top / 24 bottom;
- collectible pickup half-size: 14;
- therefore horizontal pickup requires center separation strictly less than `18 + 14 = 32`;
- vertical pickup requires center separation strictly less than `24 + 14 = 38`;
- equality at 32 or 38 is zero-area edge touch and does **not** qualify.

The audit tests outside, exact-boundary, and inside cases without deriving those expected distances from production collision helpers.

## Rule 2 — one logical occurrence awards once

The stable collectible identity is:

```text
patternId : patternStartDistance : pathId : pathPointIndex
```

A successful logical pickup is the authoritative transition that:

1. adds that identity to `consumedCollectibleIds`;
2. increments `collectedCount` once;
3. adds its value once to `collectedValue`;
4. adds its value once to `earnedReward`.

That transition is the pickup occurrence/event boundary for current M5. Presentation disappearance is not the event authority and Gate 2 does not introduce a generic event bus.

If the same retained logical identity is presented to later simulation updates, it must not produce a second pickup occurrence or reward increment.

## Rule 3 — pickup versus lethal ordering

For the audit fixture:

- run speed is 100 distance units/s;
- the static lethal hazard occupies horizontal interval `[150,170]`;
- player horizontal extent toward the hazard is 18;
- lethal positive-area overlap begins immediately after player-center distance `150 - 18 = 132`;
- the corresponding first-contact boundary is `t = 1.32 s`.

A collectible at run distance `x` begins positive horizontal overlap immediately after:

```text
x - (playerRight 18 + pickupHalfSize 14) = x - 32
```

The ordering contract is:

- pickup boundary strictly before lethal boundary → pickup is awarded;
- pickup boundary strictly after lethal boundary → pickup is rejected;
- boundaries exactly equal → **pickup wins the tie**, while the enclosing run step still ends in death.

The tie is an explicit gameplay rule, not an accidental floating-point tolerance. Only a lethal positive-area contact that is already present in the prefix through the pickup boundary blocks the pickup.

## Mutation-proof protocol

Each rule must demonstrate this sequence independently:

1. unchanged production code + audit tests: green;
2. apply one narrow temporary fault that violates only the audited rule as directly as practical;
3. run CI and capture the expected failing audit assertion;
4. remove the temporary fault;
5. run CI green again.

Planned faults:

- boundary rule: temporarily expand the collectible pickup half-size by `1e-6`, turning the old exact-touch fixture into positive overlap;
- exactly-once rule: temporarily bypass the consumed-identity guard;
- tie rule: temporarily extend the lethal prefix slightly beyond the exact pickup boundary so equal boundaries are treated as lethal-first.

These mutations are evidence only and must not be present in the final Gate 2 diff.

## Limits

- This gate does not prove every collectible branch correct.
- It does not introduce a new pickup event bus.
- It does not claim numerical sampling is a correctness oracle.
- It does not change collectible tuning or death/pickup semantics.
- Mutation evidence proves that the selected tests detect the selected rule violations; it does not prove the rules themselves beyond the independent contract stated above.

## Executed mutation evidence

All three faults were applied one at a time to the same Gate 2 branch. Each fault was removed before the next one began.

| Rule | Green before | Temporary mutation | Red evidence | Restore / green |
| --- | --- | --- | --- | --- |
| Positive-area pickup boundary | CI #965 on `7b6abbbf487f7125aa0ec057bc36f43def3d2848` — 113 files / 814 tests PASS | `90be1900951fd32f5f05f5398acd9e10a9e6f3aa`: pickup half-size `14 -> 14.000001` | CI #966: Gate 2 exact-touch assertion failed because an exact-boundary pickup produced collectible state instead of `undefined`; two existing boundary/presentation tests also detected the geometry change | `efa86b04c16bd1acedd8846bcf092e41bfa6c5be`; CI #967 PASS |
| Exactly-once logical identity | CI #967 | `c7828324408cf6ace85ea5b914a025910a9d2286`: consumed-ID guard removed | CI #968: Gate 2 test observed `collectedCount: 2` where `1` was required; existing partition/exactly-once tests also failed | `f119feca8391e9d71ebe53b6b18f2e208b651f80`; CI #969 PASS |
| Exact death/pickup tie | CI #969 | `242b3cbde9a333698174eed6fcc880bc6dad5b1b`: lethal prefix extended by `1e-6` beyond pickup boundary | CI #970: exactly one test failed — the Gate 2 tie test expected one collected pickup but the mutated final result contained zero | `bc32b7c1fbdd7f3685c5c2695ca619324919e44a`; CI #971 PASS, 113 files / 814 tests |

After the final restore, the `src/systems/PrototypeCollectibles.ts` blob on the Gate 2 branch is exactly `ac9a59e4d6b727351c82363ca5a25af172f5c2ea`, byte-identical to `main` before Gate 2. The final Gate 2 product diff therefore contains **no gameplay mutation**; only the independent contract documentation and permanent regression tests remain.

### What the evidence establishes

- the boundary test detects a concrete change that turns an exact touch into a pickup;
- the identity test detects repeated count/reward production from the same logical occurrence across updates;
- the ordering test distinguishes the explicit equal-time policy from a death-wins-ties implementation.

The evidence does not claim that these three mutations exhaust all collectible defects. It demonstrates that the selected rules have independent expected results and that the permanent tests react to direct violations for the intended reason.
