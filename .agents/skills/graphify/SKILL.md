---
name: graphify
description: Use Graphify as a local code-navigation and impact-analysis aid when an MGD task depends on relationships across multiple modules, call paths, imports, ownership boundaries, or change blast radius. Do not use it for small local edits where direct source inspection is clearer.
---

# Graphify for Monster Girl Delivery

Use Graphify to narrow a cross-module investigation before reading the relevant source. It is a navigation aid, not a source of truth and not an authorization mechanism.

## Use this skill when

Use Graphify when a task materially depends on one or more of these questions:

- what calls, imports, or depends on a system;
- how two gameplay/architecture areas connect;
- which files are likely affected by a proposed change;
- where a cross-module data/control path runs;
- whether a shared service or authority has a wider blast radius than the assigned file suggests;
- which subsystem boundaries should be inspected before a non-trivial refactor or review.

Typical MGD examples include tracing dependencies around `TimeService`, `InputService`, flight/layout ownership, hazard lifecycle/collision, generation, pacing, difficulty, and Director tooling.

## Do not use this skill when

Skip Graphify when:

- the task is confined to one obvious file or a tiny local helper;
- the assigned Issue and direct source inspection already identify the complete call path;
- the question is primarily about product/game rules owned by `MASTER_SPEC.md` or another canonical document;
- running Graphify would add ceremony without reducing uncertainty.

Do not install Git hooks, watch mode, strict/always-on integration, MCP services, databases, or committed graph output unless the assigned task explicitly requires them.

## MGD trust boundary

Graphify output is **supporting evidence only**.

- `EXTRACTED` edges come from structural parsing; `INFERRED` edges are resolved/derived by Graphify. Neither overrides the repository.
- Verify any material conclusion against the current source, tests, assigned Issue/PR, and owning MGD documentation before changing code or reporting a defect.
- Be especially careful with call direction, dynamic/framework-driven behavior, type-only relationships, and runtime behavior that static analysis may not fully represent.
- Never treat a missing graph edge as proof that a runtime relationship does not exist.
- Never let Graphify widen the assigned scope by itself.

The normal precedence in `AGENTS.md` still applies.

## Default MGD workflow

### 1. Prefer the local code-only graph

MGD's default use is structural TypeScript/code analysis only. This avoids semantic processing of docs/assets and does not require an API key.

If `graphify-out/graph.json` is missing or clearly stale for the code under investigation, rebuild the local code graph from the repository root:

```bash
graphify extract . --code-only
```

Generated `graphify-out/` files are local working data and are gitignored.

Do not run a full mixed code/docs/media extraction unless the task actually needs cross-document semantic relationships.

### 2. Ask the narrow graph question

Use the smallest useful query:

```bash
graphify query "What depends on TimeService and how does simulation time reach gameplay systems?"
graphify path "InputService" "Player"
graphify explain "HazardCollision"
```

Use the result to identify likely files, symbols, and relationships. Do not stop at the graph answer.

### 3. Verify in authoritative sources

Read the relevant implementation and tests identified by the graph. Check `ARCHITECTURE.md`, `MASTER_SPEC.md`, or other owning docs when their decision domain is involved.

For bug/review findings, establish the real supported runtime path required by the `AGENTS.md` evidence and realism gate.

### 4. Continue with the task-specific skill

Graphify does not replace other procedures. Compose it with the relevant skill when needed, for example:

```text
cross-module bug
→ graphify
→ diagnosing-bugs
→ tdd when an honest regression seam exists
→ code-review

architecture/refactor question
→ graphify
→ codebase-design
→ code-review
```

## Installation and version

Codespaces install the latest available Graphify CLI through `uv` from the official PyPI package `graphifyy` whenever a new Codespace is created. The runtime CLI is intentionally not version-pinned.

The committed MGD-specific guidance was originally adapted against Graphify upstream version `0.9.56`, commit `67f99bd0059dd1bac9e44382907ef9f10098b39f` (2026-09-07). That provenance describes the origin of this skill, not the version of the Graphify CLI installed in Codespaces. Provenance is recorded in `.agents/skills/THIRD_PARTY_NOTICES.md`.

If Graphify is unavailable, do not block the task. Fall back to normal repository search and direct source inspection, and report the tooling limitation only when it materially affected the investigation.
