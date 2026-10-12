---
name: resolving-merge-conflicts
description: "Use whenever an MGD merge or rebase has conflicts. Resolve hunks by tracing both sides to their Issue/PR/commit intent, preserve compatible behavior, validate, and finish the operation."
---

# Resolving Merge Conflicts — MGD

Resolve conflicts by intent, not by choosing whichever side is newer, larger, or easier to make compile.

`AGENTS.md`, the current merge/rebase goal, Issues/PRs and owning MGD docs remain authoritative.

Resolve and complete only the assigned local operation. Pushes and PR merges retain their own authorization boundaries in [AGENTS.md](../../../AGENTS.md#17-github--pr-discipline) and the [Git/PR workflow](../../../DEVELOPMENT.md#10-git-and-pr-workflow); this skill grants neither.

## Procedure

1. **Capture and preserve the current state.** Identify whether this is a merge or rebase, the two relevant histories, all conflicting files, and already-resolved/staged, unstaged and untracked user work. Preserve that work; do not reset/restart the operation or overwrite existing resolutions to simplify the conflict.
2. **Trace both intents.** For each conflict, inspect the commits and, where available, the originating PR/Issue and relevant product/architecture source. Map index stages to the actual histories/current replayed commit rather than assuming fixed branch meanings for ours/theirs. Understand what each side was trying to preserve.
3. **Resolve each hunk.** Preserve both intents when compatible. When they are incompatible, select the behavior that matches the current authorized goal and canonical MGD source. Do not invent a third product behavior merely to make the conflict disappear.
4. **Surface consequential conflicts.** If the two sides encode genuinely conflicting current product or architecture decisions and no canonical source resolves them, complete all unambiguous hunks and ask one focused Game Director question rather than silently choosing. Keep dependent hunks and the operation explicitly pending until that decision is available.
5. **Validate the result.** Start with affected tests/typechecking, then run the [repository-required completion checks](../../../DEVELOPMENT.md#3-required-verification) when the merge/rebase changes code/configuration. For failed or unavailable checks, investigate the evidenced cause or use a supported alternative; report remaining limits instead of repeating an unchanged failure or claiming unobserved success.
6. **Finish the authorized operation when resolvable.** Stage only files resolved for this task, preserving other index/worktree contents, and continue the local merge/rebase. If continuation reaches another replay conflict, capture its state and repeat the intent/resolution/validation steps. Verify no unmerged index entries or active merge/rebase state remain before claiming completion.

Report final HEAD/status, checks actually executed and open decisions/limits. Distinguish textual conflict removal, semantic correctness evidence and actual Git-operation completion.

## Review checks

After resolution, specifically check for:

- one side's new behavior accidentally being dropped;
- duplicated logic caused by keeping both textual versions;
- stale tests/docs that describe only one pre-merge state;
- deterministic/runtime invariants lost during conflict resolution;
- conflict markers or temporary resolution comments.

Use `code-review` on the resulting diff when the merge resolution is substantial.

Adapted for MGD from Matt Pocock's `resolving-merge-conflicts` skill (`mattpocock/skills`, MIT).