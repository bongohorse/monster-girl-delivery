---
name: resolving-merge-conflicts
description: "Use whenever an MGD merge or rebase has conflicts. Resolve hunks by tracing both sides to their Issue/PR/commit intent, preserve compatible behavior, validate, and finish the operation."
---

# Resolving Merge Conflicts — MGD

Resolve conflicts by intent, not by choosing whichever side is newer, larger, or easier to make compile.

`AGENTS.md`, the current merge/rebase goal, Issues/PRs and owning MGD docs remain authoritative.

## Procedure

1. **Capture the current state.** Identify whether this is a merge or rebase, the two relevant histories, all conflicting files, and any already-resolved/staged work.
2. **Trace both intents.** For each conflict, inspect the commits and, where available, the originating PR/Issue and relevant product/architecture source. Understand what each side was trying to preserve.
3. **Resolve each hunk.** Preserve both intents when compatible. When they are incompatible, select the behavior that matches the current authorized goal and canonical MGD source. Do not invent a third product behavior merely to make the conflict disappear.
4. **Surface consequential conflicts.** If the two sides encode genuinely conflicting current product or architecture decisions and no canonical source resolves them, complete all unambiguous hunks and ask one focused Game Director question rather than silently choosing.
5. **Validate the result.** Start with affected tests/typechecking, then run the repository-required completion checks from `AGENTS.md` / `DEVELOPMENT.md` when the merge/rebase changes code/configuration.
6. **Finish the operation.** Stage the resolved files and continue until the merge/rebase is actually complete. Do not leave conflict markers, an interrupted rebase state, or a half-finished merge while claiming success.

## Review checks

After resolution, specifically check for:

- one side's new behavior accidentally being dropped;
- duplicated logic caused by keeping both textual versions;
- stale tests/docs that describe only one pre-merge state;
- deterministic/runtime invariants lost during conflict resolution;
- conflict markers or temporary resolution comments.

Use `code-review` on the resulting diff when the merge resolution is substantial.

Adapted for MGD from Matt Pocock's `resolving-merge-conflicts` skill (`mattpocock/skills`, MIT).