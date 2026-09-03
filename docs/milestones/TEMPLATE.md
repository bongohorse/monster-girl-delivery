# Mx — <Milestone Name> — Completion Report

**Status:** COMPLETE  
**Completed:** YYYY-MM-DD  
**Primary planning issue:** #N  
**Purpose:** <One sentence describing what this milestone was meant to prove/build.>

## 1. Planned goal

Summarize the approved goal and planned scope at milestone start.

Do not write this section as if every planned item necessarily shipped.

## 2. What actually delivered

Document only work that landed.

Group by meaningful capability/system rather than by commit chronology where practical.

For each major capability, capture:

- what behavior exists now;
- important limits/temporary prototype status;
- the main Issue/PR where it landed.

## 3. Architecture/product decisions established

Record decisions that the next milestones must treat as current constraints.

Examples:

- ownership boundaries;
- platform/orientation decisions;
- authoritative services;
- deterministic rules;
- approved product direction.

Do not promote `PROTOTYPE`, `TBD`, `EXPERIMENT`, or `FUTURE` items unless the Director explicitly did so.

## 4. Validation evidence

Record the evidence that actually exists:

- Biome/typecheck/build status;
- automated test count where useful;
- deterministic/property test evidence;
- manual browser/device evidence;
- performance evidence if performed.

State the limits of the evidence. Automated coverage must not be described as a manual device test.

## 5. Main Issues / PRs

| Work | Issue | PR | Result |
|---|---:|---:|---|
| <capability> | #N | #N | <short result> |

Focus on the milestone implementation trail. Do not dump every repository PR into this table.

## 6. Supporting maintenance completed during the milestone

List meaningful infrastructure/maintenance work that happened while the milestone was current but was not part of its product acceptance criteria.

This keeps history complete without falsely expanding milestone scope.

## 7. What deliberately did not deliver

Record important non-goals and intentionally excluded systems.

This section prevents later agents from assuming an absent system was accidentally forgotten.

## 8. Deferred/open work at exit

Record:

- incomplete planned work;
- accepted deferrals;
- compatibility/performance checks moved later;
- follow-up defects or backlog issues.

Link focused Issues where they exist.

## 9. Exit decision

Explain why the milestone was considered complete enough to move on.

This must be evidence-based and should name any explicit Game Director decision that enabled the transition.

## 10. What the next milestone inherits

List the capabilities and constraints the next milestone may safely assume already exist.

Also state any tempting feature that is **not** inherited/current scope when that distinction matters.

---

## Closeout checklist

Before merging a milestone completion report:

- [ ] Planned scope and actual delivery are clearly separated.
- [ ] Main implementation Issues/PRs are linked.
- [ ] Automated validation is recorded accurately.
- [ ] Manual/device evidence is recorded only when actually performed.
- [ ] Deferred work is explicit and linked where practical.
- [ ] Supporting maintenance is separated from milestone product scope.
- [ ] Product/architecture decision states are accurate.
- [ ] Exit decision is explicit.
- [ ] Next-milestone inheritance is explicit.
- [ ] `bun run ci:check` passes.
- [ ] `bun run typecheck` passes.
- [ ] `bun run test` passes.
- [ ] `bun run build` passes.
