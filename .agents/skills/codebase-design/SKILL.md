---
name: codebase-design
description: "Use when a task introduces or reshapes modules/interfaces, adds an abstraction, moves an architecture seam, improves testability, or risks spreading one concept across many callers. Favor deep modules and existing MGD ownership boundaries."
---

# Codebase Design — MGD

Use this skill when design structure is genuinely part of the task. Do not invoke it to turn every small implementation into an architecture exercise.

MGD's established vocabulary and architecture (`TimeService`, `InputService`, gameplay systems, scenes, etc.) remain authoritative. The concepts below help reason about design; they do not authorize renaming established project concepts or introducing new layers.

Start from the current task's outcome and authorization (design/review or implementation), the affected owner, existing public contracts and actual caller paths. Read the relevant [architecture ownership](../../../ARCHITECTURE.md#3-ownership-model) and [change rule](../../../ARCHITECTURE.md#15-architecture-change-rule); inspect current source/tests before proposing a seam. A design/review request alone does not authorize implementation.

## Core concepts

- **Module** — a cohesive unit with an interface and implementation. In MGD this may already be called a service, system, manager, scene, helper or module; keep established names when they are clear.
- **Interface** — everything callers must know to use the module correctly: types, invariants, ordering, errors, performance expectations and lifecycle rules.
- **Seam** — a location where behavior can vary or be exercised without editing callers.
- **Adapter** — a concrete implementation that fills a real seam.
- **Depth** — how much useful behavior is hidden behind how little interface callers must understand.
- **Locality** — how strongly knowledge, change and verification stay concentrated instead of leaking across callers.

A good MGD module tends to have a small, stable interface and owns enough behavior that callers do not need to reconstruct its rules.

## Design tests

Before adding an abstraction or changing a seam, ask:

### 1. Existing-owner test

Does an existing MGD system already own this responsibility? Prefer extending the correct owner over creating a parallel helper/system. Before proposing custom code, apply the [existing-capability reuse criteria](../../../AGENTS.md#7-implementation-quality) to suitable built-ins, Phaser/Web APIs and approved dependencies.

### 2. Deletion test

Imagine deleting the proposed module. If almost no complexity reappears and callers simply call the next thing directly, the module may be a shallow pass-through. If rules/knowledge would spill into many callers, the module is earning its place.

### 3. Variation test

A new interface/seam needs a current reason: multiple real implementations, an external boundary, deterministic testing need, platform separation, or another concrete variation already in scope. Do not create speculative extension points for hypothetical future use.

### 4. Locality test

A future change to the concept should ideally happen in one obvious owner. If one rule requires scattered edits across scenes, systems and tests, look for a better owner/seam.

### 5. Runtime-cost test

For gameplay hot paths, depth must not hide accidental per-frame allocation, expensive indirection or repeated work. A clean interface is not enough if its implementation harms frame-time behavior.

## Designing for testability

Prefer interfaces that let tests observe behavior at the same seam production callers use.

Useful patterns:

- inject true external/time/random dependencies where variation is real;
- keep deterministic gameplay rules separate from rendering side effects when the existing architecture supports that ownership;
- return meaningful results/snapshots rather than requiring tests to inspect private state;
- keep the public surface smaller than the behavior it protects.

Do not distort production architecture solely to make a shallow unit test easy. If a behavior is naturally verified through an integration seam, test it there.

## Design-it-twice for consequential changes

When a task requires a meaningful new seam or module shape and multiple designs are plausible, compare at least two materially different approaches before editing. When subagents are available, independent alternatives can be explored in parallel.

Compare alternatives on:

- fit with architecture ownership and actual callers' contracts;
- interface size and depth;
- locality of future changes;
- deterministic testability;
- runtime/per-frame cost;
- migration complexity, including each affected caller and removal of replaced paths;
- amount of speculative machinery.

Choose the smallest design that satisfies the current task and leaves ownership clearer than before.

## Completion

A design/review task is complete with a justified recommendation (including no structural change when appropriate), relevant alternatives, a concrete caller/migration/verification plan where a seam changes, and unresolved assumptions. Implementation remains subject to the actual task authorization.

For an authorized implementation, a design change is complete only when the real callers use the intended seam, obsolete parallel paths are removed when safely in scope, tests exercise meaningful behavior, and the architecture is not more complicated than the task requires. Select proportionate checks from the [test-evidence policy](../../../docs/TEST_QUALITY.md#evidence-selection-matrix).

Report source/design reasoning separately from executed integration checks and measurements. A cost estimate is not a measured improvement; performance claims use the [existing measurement workflow](../../../docs/PERFORMANCE_MOBILE_EVIDENCE.md#investigation-and-comparison-procedure). Identify missing contracts, unavailable checks and failed checks with their affected claim; use supported alternative evidence where useful without declaring the untested claim complete. After an authorized correction, repeat the affected check; stop that path when the same unresolved cause yields no new evidence, and report what remains open.

Adapted for MGD from Matt Pocock's `codebase-design` skill (`mattpocock/skills`, MIT).