---
name: mgd-workshop
description: "Maintain the MGD Workshop web shell, catalogue/details, search/navigation, local data, validated import/export, sharelinks and technical study registration. Use for Workshop application work; game UI and open design experiments have separate owners."
---

# MGD Workshop

Deliver the requested Workshop change through the existing application. [AGENTS.md](../../../AGENTS.md) and the assigned task control scope and authorization. A study, local selection or exported handoff does not authorize game integration, publication or changes to decided gameplay rules.

## Choose the owner

- Game HUD, menus, results and game-side Director controls → [mgd-ui](../mgd-ui/SKILL.md).
- An open design question → the planned `mgd-prototype` responsibility in [#540](https://github.com/bongohorse/monster-girl-delivery/issues/540). Check whether that skill exists before invoking it; its absence does not require creating it. Workshop supports only the technical registration/data work needed by the authorized experiment. A fully specified study needs no extra design interview.
- Artwork creation/revision → [mgd-art](../mgd-art/SKILL.md); image-source/export preparation or asset integration → [mgd-asset-integration](../mgd-asset-integration/SKILL.md). Workshop owns catalogue/gallery links, not those asset procedures.
- Separately requested game integration → [mgd-gameplay](../mgd-gameplay/SKILL.md), [mgd-hazards](../mgd-hazards/SKILL.md) or the relevant UI/asset owner, according to the actual change. Workshop configuration remains reference material.
- Requested build delivery or explicitly authorized publication → [mgd-build-release](../mgd-build-release/SKILL.md). Ordinary Workshop checks stay with this task and confer no merge/deploy permission.

Load another skill only for an actual part of the request. For product-rule or architecture decisions, use the owning sources in [docs/README](../../../docs/README.md#source-ownership).

## Follow the existing contract

1. Resolve the affected surface, element/idea/version, supplied configuration and requested outcome from the task and current sources. Record the checked commit and local changes. Treat dated reports and guide examples as evidence for their recorded revision, not current live status; verify material claims in current code/catalogue and at the cited source revision. Keep unknown deployment or review status explicit.
2. Read the relevant [WORKSHOP_GUIDE](../../../docs/WORKSHOP_GUIDE.md) sections below before editing that path. Inspect its real entry point and existing tests; reuse the current catalogue, navigation/search, registry/loader and central store rather than adding parallel systems or a framework.

   | Affected work | Contract to read and apply |
   |---|---|
   | Catalogue/details, sources, media links or technical registration | [Element oder unabhängige Idee hinzufügen](../../../docs/WORKSHOP_GUIDE.md#element-oder-unabhängige-idee-hinzufügen): existing schema and explicit registration, independent study sources, validators/controls and concrete source/support bindings before completion. No game-`src/` imports. |
   | Web shell/styles, shared helpers, local data or historical studies | [Was historisch stabil bleibt](../../../docs/WORKSHOP_GUIDE.md#was-historisch-stabil-bleibt): retain scenes, parameter resolution, defaults and bound render dependencies; evolve only the compatible live data boundary. Behaviour/default changes get a new version, not a silent historical rewrite. |
   | Controls, sharelinks, review or Markdown/JSON handoff | [Konkreten Stand übergeben](../../../docs/WORKSHOP_GUIDE.md#konkreten-stand-übergeben): use actual current configuration and units/revisions, fresh-browser reproduction and configuration-specific published review evidence. Local selection remains a draft. |

3. Implement the smallest coherent change in the real Workshop path. For data work, trace validated import/export and historical-view writes through the current store/compatibility adapter; preserve mixed-version data and the existing rejection/storage-error behaviour. For mounts, navigation or refresh, trace `dispose`, animation loops and listeners, including a late asynchronous mount after the route has changed. Retain root/standalone consistency and historical rendering isolation.

## Verify and finish

- Check the affected outcome: catalogue details/search/backlinks and direct-link/reload/navigation for web-shell work; valid roundtrip and invalid-import state preservation for data work; real control effect, fresh-browser sharelink and matching downloaded handoff values for configuration work. For study integration, verify registration, available bound revisions, historical output/defaults and cleanup on repeated switches. Use existing tests and browser paths appropriate to the claim, not just an isolated new module.
- Follow [DEVELOPMENT required verification](../../../DEVELOPMENT.md#3-required-verification) and the Guide's [registration checks](../../../docs/WORKSHOP_GUIDE.md#element-oder-unabhängige-idee-hinzufügen). When checking composed Pages output, use [Pages bauen und aktualisieren](../../../docs/WORKSHOP_GUIDE.md#pages-bauen-und-aktualisieren-aufgabe-10), including sequential builds and the existing smoke path; a preview artifact is not a live deployment.
- On failure, identify the exact input, path, revision, tool or check involved. Correct a demonstrated cause within scope and rerun the affected check; retry only with changed input or new evidence. If the same cause remains unresolved, stop that path, report the concrete blocker and continue independent authorized work. Do not substitute today's sources for missing historical bindings, relax validation or report stale output as success.
- Finish the authorized change and PR with the checked revision, affected flow and actual results. Separate source/plan findings, executed data/tests/builds, browser observations and Director decisions. Mark unavailable evidence as untested. Completion requires the requested path to be wired and its applicable checks satisfied; a registration or plan alone does not prove running behaviour. Report real remaining gaps, then stop at the assigned boundary.
