## Goal

<!-- What does this PR accomplish? Link the Issue. -->

Closes #

## Changes

- 

## Evidence / integration check

- [ ] The changed behavior is reachable through a supported runtime/configuration/lifecycle path, or this task explicitly owns defensive boundary validation.
- [ ] Tests protect realistic behavior or an intentional boundary; they do not manufacture impossible private/internal state to justify production changes.
- [ ] When live integration is required, the implementation is wired into the real runtime path rather than existing only as scaffolding/helpers/tests.

## Validation

- [ ] `bun run ci:check`
- [ ] `bun run typecheck`
- [ ] `bun run test`
- [ ] `bun run build`

<!-- For documentation-only changes that cannot affect runtime/build behavior, explain why code checks are not applicable. -->

## Scope check

- [ ] No unrelated refactors, speculative abstractions, or no-op "future-proofing".
- [ ] No `TBD`/`EXPERIMENT` product decision was silently finalized.
- [ ] Any follow-up Issue has a meaningful independent outcome; minor observations were not turned into Issue spam.
