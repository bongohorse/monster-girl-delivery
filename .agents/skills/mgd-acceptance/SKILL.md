---
name: mgd-acceptance
description: "Assess a concrete MGD game change or prepare reviewable evidence for the Director. Use for explicit acceptance/review tasks or evidence needing reconciliation; ordinary implementation completion does not automatically require another handoff."
---

# MGD Acceptance

Make it clear what was checked and what remains unknown. [AGENTS](../../../AGENTS.md) owns authorization; [TEST_QUALITY](../../../docs/TEST_QUALITY.md#permanent-pr-evidence-policy) owns evidence selection. This skill adds no role, platform or approval stage. Existing authorization to fix or merge remains valid under its conditions.

## Focus the assessment

Identify the concrete task/change, intended result and in-scope acceptance criteria. Read only relevant product/architecture rules and changed source/tests. Separate this stage's requirements from future work: an image pilot does not need a future audio/gallery pipeline.

Lead with this skill when the request is to assess a change. During implementation, use its guidance only if evidence needs reconciliation; keep the development skill in charge. Consult a domain skill only for a material domain question rather than loading every skill mentioned by the diff.

## Choose the smallest useful evidence

1. Map the changed behavior to observable success through supported inputs/configuration. Use [TEST_QUALITY's matrix](../../../docs/TEST_QUALITY.md#evidence-selection-matrix) for focused rules, boundary, partition, seed, browser or device checks. A simple hand-counted result can supply an independent expectation; ordinary work needs no automatic coverage/mutation/performance campaign.
2. Identify the tested revision and relevant context. Usually the commit (and local changes, if any), command/CI result and browser/viewport or artifact are enough. Retain the specific input/diff/hash details needed to reproduce a dirty or asset-dependent result. Capture expanded build/toolchain metadata only when it can distinguish the artifact being assessed.
3. Run or verify applicable checks under [DEVELOPMENT](../../../DEVELOPMENT.md#3-required-verification). Reuse matching evidence after confirming its scope and state; skipped jobs and screenshots from another build are not passing evidence. Source inspection can establish wiring, but cannot be reported as an executed game test.
4. Exercise the actual domain behavior where needed. A helper test/exported file/rendered button alone does not prove live integration or interaction. After an authorized correction, repeat affected checks and required baseline checks; broaden testing only for a new change, failure or concrete unresolved concern.
5. Record passed, failed or not checked for material criteria. Combine criteria with the same evidence; split technical and manual parts when their outcomes differ. Keep automated results, agent observations and explicit Director decisions distinct. Green CI does not prove game feel or grant product approval.

Missing tools/device access do not stop independent implementation or checks. Mark the specific result **not checked**, explain why and provide precise replay steps. It limits the corresponding acceptance claim. An explicitly required check or approval still conditions the action that requires it; do not invent additional gates or claim that pending evidence passed.

## Domain questions, only when relevant

| Change | Focused check |
|---|---|
| Hazard behavior | Supported spawn, effective shape, lethal phases, real collision/consequence and relevant shared-path regressions. Compare visible danger with geometry when presentation changes; reset/despawn checks apply where affected. |
| Image source/export | Verify the preview/export matches current source and processing inputs. Check relevant alpha/pivot/scale and reachable runtime use; preserve gameplay geometry. Use the existing asset conventions/tools, or describe a supported manual path if automation is absent. |
| UI/input | Perform the action and observe its result through supported input. Check propagation/blocking and lifecycle/viewport behavior where affected. Headless success does not prove real touch ergonomics. |

For Android artifacts, read [ANDROID_DISTRIBUTION](../../../docs/ANDROID_DISTRIBUTION.md#canonical-build) when needed: the built commit may differ from the PR head (for example a synthetic merge). A successful Android build is not an Android device test. For asset identity, use the actual current workflow rather than historical pipeline promises.

## Report in the existing review trail

Use concise prose, a list or a small table in the PR/owning Issue, whichever makes the results easiest to verify. Include the outcome, tested state, actual evidence, limits and short reproduction/playtest instructions. Create a separate report only when the task or durable evidence genuinely needs one. Preserve necessary comparisons/logs where reviewers can use them; an expiring preview is not the sole record of a required durable acceptance claim.

A failed behavior should include expected versus actual result and a supported reproduction. Fix it within existing implementation authorization, or return it as a finding for a review-only task. Do not manufacture follow-up Issues for every untested detail.

## Dry examples

- **Ball hazard:** assess admitted spawn, expected bounce, effective shape, lethal contact/safe case and relevant regression evidence. A ball image alone cannot pass these behavior criteria; manual fairness remains unverified if unavailable.
- **Source changed, old preview supplied:** compare current source/processing identity; reject the preview as evidence of the new image. Regenerate using available tooling when authorized, then assess current output. Old acceptance still describes only the old state.
- **Green CI, required Android device unavailable:** report exact CI/artifact results and the device criterion as not checked; provide installation/input steps. Continue independent work without declaring real-device success.

Assessment is complete when every material in-scope criterion has a supported result or explicit unverified status and a reviewer can repeat the relevant check. That assessment may reveal failed/pending feature acceptance. Report the distinction without adding another mandatory handoff or requesting an already granted merge approval.
