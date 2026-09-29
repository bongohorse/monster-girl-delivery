---
name: mgd-acceptance
description: "Validate a specific MGD game change, art/hazard integration, or reviewable build for the Director. Produce criterion-level results with reproducible evidence and an explicit acceptance status; complements development/testing and never supplies Director approval."
---

# MGD Acceptance

Use this skill to assess a concrete change and prepare its evidence for review. [AGENTS.md](../../../AGENTS.md) controls authorization and scope; [TEST_QUALITY.md](../../../docs/TEST_QUALITY.md#permanent-pr-evidence-policy) owns evidence selection and limits. This is neither a general tester role nor a new test platform. Creating this skill does not authorize accepting an existing feature or executing its example game-development tasks.

## Inputs and ownership

Identify the task/PR, comparison base and target revision or artifact, acceptance criteria, changed systems, intended platforms and any supplied evidence. Read relevant product rules in [MASTER_SPEC](../../../MASTER_SPEC.md) and ownership constraints in [ARCHITECTURE](../../../ARCHITECTURE.md), rather than assuming historical milestone evidence applies to the current change. Separate mandatory criteria from later stages and out-of-scope work; a static image pilot is not blocked by later audio/gallery/atlas requirements.

Use existing development/domain skills where their triggers apply. Art, asset integration and hazards provide their domain contracts when installed; their separate introductions are [PR #504](https://github.com/bongohorse/monster-girl-delivery/pull/504), [PR #505](https://github.com/bongohorse/monster-girl-delivery/pull/505) and [PR #506](https://github.com/bongohorse/monster-girl-delivery/pull/506), not presumed merged dependencies. `code-review` checks the actual diff; `diagnosing-bugs` investigates a supported failure; `tdd` applies during an authorized deterministic fix. This skill gathers and assesses evidence, without duplicating those procedures or authorizing fixes, merges, releases or Issue closure.

## Procedure

1. **Define observable success.** Map each in-scope criterion to the relevant runtime entry point and expected result. Choose the smallest evidence that supports that claim using [TEST_QUALITY's selection matrix](../../../docs/TEST_QUALITY.md#evidence-selection-matrix). For deterministic rules, identify an independent expected-result source and meaningful regression seam under that policy. Keep baseline engineering checks separate from proof of integration, visual quality and subjective feel. If a criterion is ambiguous in a way that changes the product outcome, resolve that decision while continuing independent checks.
2. **Identify the tested state before collecting evidence.** Record full Git commit, comparison base, dirty status and relevant local differences/untracked inputs, build type (development, production, Android debug/release or Director-enabled variant), artifact/checksum or URL, and actual platform/device/browser/viewport/render context. A local dirty run is not evidence for clean HEAD alone: retain the relevant diff/input hashes so its state is reproducible, and recheck state after collection. Use the existing [Vite build metadata](../../../vite/buildMetadata.mjs) as supporting identity; its short commit does not encode local dirty changes. For Android read [ANDROID_DISTRIBUTION](../../../docs/ANDROID_DISTRIBUTION.md#canonical-build): `build-info.json` and checksums identify the actual built artifact. Preserve `builtCommit` and `prHeadCommit` separately; a synthetic PR merge commit is not the branch head. Do not attach a screenshot or previous CI run to a different build merely because the version/name matches.
3. **Run or verify applicable existing checks.** Use the commands and baseline obligations in [DEVELOPMENT §3](../../../DEVELOPMENT.md#3-required-verification), checking actual `package.json`/workflow support. Retain command or CI run, exact tested revision and result. Existing matching evidence may be reused only when its scope and identity are verified; a skipped job is not a passed check. Select targeted runtime/browser/device checks for the changed behavior under TEST_QUALITY; do not run coverage, mutation, stability or performance audits by default. Documentation-only work needs its documentation checks. If a required tool, artifact or device is unavailable, mark that criterion **not checked**, state why and supply concrete replay steps; complete independent checks without inventing a substitute result.
4. **Exercise the applicable domain path.** Use the domain-specific checks below, through supported inputs/configuration rather than fabricated private state. Confirm actual scene use and interaction, not only helper tests or exported files. Run UI actions when their behavior is claimed. Record actual observations and the boundaries of each test; source inspection may confirm wiring but does not masquerade as an executed game test.
5. **Report per criterion.** Use **passed**, **failed** or **not checked**, with evidence and limits. Name the method: automated test/CI, agent inspection or manual/device execution, or explicit Director decision. Split a criterion when its technical and manual parts have different results. Visual correctness, mobile behavior or game fun remain unproven by unit tests or headless success. Record required Director acceptance separately with person, decision link and tested scope; absent that decision, it remains pending.
6. **Preserve minimal durable evidence.** Keep enough result/context/reproduction detail in the PR or owning evidence document to permit targeted rechecking without this conversation. For assets follow [#494 §§15.1–15.2](https://github.com/bongohorse/monster-girl-delivery/issues/494): accepted comparison, asset fingerprint/export hash and tested integration/build identity, with ingame evidence when required. Use its implemented canonical documentation/conventions if available. The shared workflow is not implemented on inspected main `97d158bef31ed3a22cbd18fde375973d1cdf7890`; legacy source/exporter/export hashes and actual tool versions must be explicitly identified as legacy evidence, not a generated report. Preserve necessary evidence outside runtime assets; an expiring CI preview alone is insufficient. Do not create accepted screenshots or an empty evidence archive to imply progress.
7. **Handle failures and rechecks.** Return a failure to the appropriate development task with expected versus actual outcome, supported reproduction and affected criterion. Implement a fix only when the current task authorizes it. After correction, identify the new tested state and repeat the affected checks plus applicable baseline obligations; retain unaffected evidence only with a scope/identity justification. Broaden or repeat checks when new changes, failures or a specific unresolved risk warrant it. Report the remaining failed/not-checked criteria and a concrete next check rather than repeatedly rerunning the same suite.

## Domain checks

| Changed area | Evidence to assess |
|---|---|
| Hazard behavior/integration | Supported spawn, effective hitbox/shape, motion/lethal phases, collision adapter and actual damage/death consequence; affected shared-hazard regressions, despawn/restart when touched. Use current gameplay geometry. A sprite or overlap helper alone is insufficient. Observe visible danger versus collision at relevant size/motion/warning states, leaving unavailable manual fairness checks pending. Partition/seed evidence follows the architecture and TEST_QUALITY triggers. |
| Image source/export/integration | Verify current source/effective recipe/profile/toolchain identity and output hashes before using a preview. A source edit makes the prior export/evidence stale. Check accepted/trial reference scope, target-size/alpha/pivot/scale comparison and reachable loader/presentation use of the current export. Candidate preparation does not imply activation, integration or visual acceptance. Never derive gameplay geometry from image metadata. |
| UI/input | Perform the requested action via the supported input path and observe its effect, blocking/propagation and lifecycle behavior where affected. Choose keyboard/pointer/touch and viewport/device cases from the change; a rendered button alone does not prove interaction or real touch ergonomics. |

## Compact report

Use the existing PR/owning report; create a separate document only when durable evidence needs it. Include:

- **Scope:** task/PR, expected change, in-scope criteria and justified stage exclusions.
- **Tested state:** base/commit, dirty-state details, build/artifact identity, platform/context and relevant asset identities.
- **Criterion results:** the table below, using only actual evidence.
- **Reproduction:** starting state/seed/fixture, setup and supported inputs, precise steps, expected versus observed result; for unavailable checks, specify the artifact/device and steps needed.
- **Decision:** technical result and pending criteria, agent/manual inspection result, and explicit Director acceptance or **pending**. All required checks must pass before claiming technical completion; any failed or untested mandatory criterion keeps its relevant outcome unresolved. Passing technical evidence alone is not Director approval.

| Criterion | Expected observable result | Method / tested state / durable evidence | Result | Limit or next check |
|---|---|---|---|---|

Rows are filled only during an actual assessment. Separate evidence by tested state when automated and manual checks used different builds. Provide a minimal screenshot/clip/log only if it supports a criterion; do not fabricate measurements or supply raw sensitive logs. A later evidence-only commit may point to the earlier tested integration commit without claiming that the earlier build includes the new evidence files.

## Dry request walkthroughs

These examples specify decisions, not performed tests or approvals:

| Request | Expected assessment |
|---|---|
| “Accept the new wall-bouncing ball hazard.” | Identify its build and supported spawn, test trajectory/boundaries, effective hitbox, lethal contact and safe case, consequence and affected regressions. Require actual integration and the relevant visual fairness evidence; record pending device/Director criteria. A ball image export cannot pass behavior or consequence criteria. |
| “The image source changed; accept this preview.” | Compare current inputs/fingerprint with the preview/export. A mismatch fails freshness; new appearance/runtime checks are not checked until the available workflow produces current output and it is tested. Preserve prior acceptance as evidence of the old state only. Do not invent `assets:*` commands when #494 is still unimplemented. |
| “CI is green; required Android testing is unavailable.” | Record only the claims supported by the exact CI artifact/revision. Android device criteria remain **not checked**, with the appropriate APK/build identity and concrete installation/run/input steps (or an explicit missing artifact). Director acceptance stays pending; a green Android build is not a device test. |

## Completion

The assessment is complete when every in-scope criterion has an evidence-backed result or explicit unchecked status, tested states are traceable, durable evidence and replay instructions are sufficient, and technical/agent/Director conclusions are distinct. A complete assessment may legitimately report failed or pending acceptance; it does not make the feature complete or authorize merge/release/Issue closure. Skill creation ends with documentation/example validation and its focused PR, without executing future acceptance tasks.
