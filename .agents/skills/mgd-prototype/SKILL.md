---
name: mgd-prototype
description: "Answer an open MGD design question through a bounded, comparable experiment using existing studies where suitable. Use for exploratory variants and evidence synthesis; specified game implementation and technical Workshop maintenance have separate owners."
---

# MGD Prototype

Produce an experiment report that makes one open design question, its evidence and the next decision traceable. [AGENTS.md](../../../AGENTS.md) and the assigned task control scope; [MASTER_SPEC decision states](../../../MASTER_SPEC.md#0-decision-states) retain their meaning. An experiment, favourite or handoff does not authorize game integration, changes to decided rules, publication or deployment.

## Choose the owner

- Technical Workshop maintenance, catalogue/data work or study registration → `mgd-workshop` ([reviewed skill at #557's exact head](https://github.com/bongohorse/monster-girl-delivery/blob/df6aeafae52ff9c053cabc65c1e98048409723d2/.agents/skills/mgd-workshop/SKILL.md)). Use the installed `.agents/skills/mgd-workshop/SKILL.md` when available; until then follow the [WORKSHOP_GUIDE](../../../docs/WORKSHOP_GUIDE.md). Its absence does not require creating a skill. A fully specified Workshop task needs no extra design experiment or interview.
- Decided game implementation → [mgd-gameplay](../mgd-gameplay/SKILL.md), [mgd-hazards](../mgd-hazards/SKILL.md) or [mgd-ui](../mgd-ui/SKILL.md), according to the affected system. Follow an already authorized implementation directly; a proposed experiment cannot reopen decided rules.
- Artwork creation/revision → [mgd-art](../mgd-art/SKILL.md); image preparation/integration → [mgd-asset-integration](../mgd-asset-integration/SKILL.md). Use these procedures only for an actual authorized part of the experiment.

Other canonical ownership is mapped in [docs/README](../../../docs/README.md#source-ownership). Load supporting procedures only for needed work; prototype owns the design question and synthesis, not those implementations.

## Bound and compare

1. Resolve the question and existing decision state from the task and current sources. Record the checked revision, starting study/configuration and relevant context. Choose what observation could distinguish the options and what result would inform the next decision. If the request already specifies implementation, route it directly to its owner.
2. Reuse a suitable existing executable study and its controls before proposing new work. Choose a small set of relevant variants, the variable being compared, fixed effective values/units and conditions, observation criteria and a finite trial budget. Choose routine comparison details autonomously; ask only if an unresolved choice materially changes the design question or authorized scope. State necessary assumptions. Add a study/version only when existing capabilities cannot answer the question and the task authorizes that work.
3. Follow the Workshop contracts where used: [concrete configuration, sharelink and handoff](../../../docs/WORKSHOP_GUIDE.md#konkreten-stand-übergeben), [registration](../../../docs/WORKSHOP_GUIDE.md#element-oder-unabhängige-idee-hinzufügen) and [historical stability](../../../docs/WORKSHOP_GUIDE.md#was-historisch-stabil-bleibt). Keep technical work with its owner. Capture actual values, version/source bindings, environment, presentation timing and order needed to reproduce the comparison; defaults or screenshots alone do not establish equal conditions.
4. Execute only the authorized, feasible trials. Record observations per variant separately from configuration, source deductions and hypotheses. Compare under the declared conditions; identify changed conditions, missing values or conflicting reports before drawing conclusions. Label plans, stored observation fixtures and actually executed trials separately, including who observed what. Code/tests can establish configuration or behaviour, not subjective recognizability or game feel.
5. Report what the evidence supports and where it stops. A recommendation may be scoped to the observed conditions; insufficient or contradictory evidence may leave the question open. Do not invent a winner or treat missing data as a default measurement. Name the concrete remaining uncertainty and the smallest bounded next trial that could reduce it. At the trial budget or an unresolved failure, stop that path and record the exact missing input/tool/evidence; continue independent authorized work without expanding the experiment.

## Finish

Save the question, starting state/revision, variants and effective configurations, criteria, actual observations with evidence links, limits and next decision in the owning Issue/PR or its linked experiment artifact. Keep Director decisions distinct from recommendations and local Workshop selections. Follow [DEVELOPMENT verification](../../../DEVELOPMENT.md#3-required-verification) for any changes actually made.

Completion means the authorized comparison/report is reproducible from its recorded inputs and evidence, with either a supported answer or an explicit unresolved question and smallest next trial. A plan-only task ends with the plan; unavailable trials stay untested. Report any concrete blocker and stop at the assigned boundary; integration or further experiments require their own authorized scope.

Adapted principles from Matt Pocock's `prototype` skill; see [provenance and MIT license](../THIRD_PARTY_NOTICES.md#mgd-prototype).
