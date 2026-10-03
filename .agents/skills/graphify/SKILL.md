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

Follow [MGD source precedence](../../../AGENTS.md#3-instruction-and-source-precedence) and the [canonical documentation map](../../../docs/README.md) for the decision being made.

## Default MGD workflow

### 1. Prefer the local code-only graph

MGD's default use is structural TypeScript/code analysis only. This avoids semantic processing of docs/assets and does not require an API key.

For an existing graph, check its source root, relevant file coverage and any recorded revision/fingerprints against the current sources. A timestamp alone does not establish freshness; missing identity information leaves freshness uncertain. Even a current graph can have incorrect or missing edges.

When CLI use would help, check availability and the installed version/help before relying on command examples. These examples match the upstream version recorded below, not necessarily the installed CLI. If the graph is missing or stale, rebuild from the repository root only when a compatible CLI is available and extraction serves the assigned investigation; otherwise use the source-search fallback:

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

For dynamic paths, follow registration, dispatch and loading in current source even when the graph omits them. Report graph hints, source-verified relationships and actually executed CLI/runtime checks separately, with material limits; inspecting a saved graph is not an executed Graphify command.

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

Graphify is optional and is not installed by devcontainer setup. Installation or upgrade is tool setup, not a prerequisite for completing an investigation. When tool setup is within the assigned scope, the [official upstream installation guidance](https://github.com/Graphify-Labs/graphify/blob/67f99bd0059dd1bac9e44382907ef9f10098b39f/README.md#install) uses an available `uv`:

```bash
uv tool install graphifyy
```

If `uv` is unavailable, use its [official installation instructions](https://docs.astral.sh/uv/getting-started/installation/) only for assigned tool setup; otherwise use the search fallback below. Do not automatically install or upgrade tools for a documentation/review task. The runtime CLI is intentionally not version-pinned.

The committed MGD-specific guidance was originally adapted against Graphify upstream version `0.9.56`, commit `67f99bd0059dd1bac9e44382907ef9f10098b39f` (2026-09-07). That provenance describes the origin of this skill, not the version of the Graphify CLI installed on demand. Provenance is recorded in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md#graphify).

If Graphify is unavailable or a command fails, do not block the task. Inspect the specific failure and retry only when new evidence justifies a changed attempt; otherwise continue with `rg` and direct source inspection. Report the tooling limitation only when it materially affected the investigation.
