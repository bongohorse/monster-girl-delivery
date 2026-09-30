# MGD Art Direction

This is the canonical register of visual references, scoped acceptance and reusable visual profiles. Product decisions/states remain in [MASTER_SPEC.md](../MASTER_SPEC.md); the production gate is owned by [ROADMAP.md — Art Gate](ROADMAP.md#art-gate--lock-the-minimum-production-visual-direction). The creation/revision procedure lives in [mgd-art](../.agents/skills/mgd-art/SKILL.md).

## Status and decision sources

Status checked on 2026-09-30: [Art Gate #487](https://github.com/bongohorse/monster-girl-delivery/issues/487) remains open. Its working update and Director handoff support a limited gameplay trial, not a final production style. No globally accepted production reference set is recorded here. Historical prototype pixel art and the cartoon/HD candidates in [BACKLOG.md §16](BACKLOG.md#16-art-direction-and-visual-language) are not final requirements.

For each reference, distinguish **accepted** (explicit Director decision, only within its scope), **trial selected** (authorized comparison), **draft** (unaccepted candidate), and **rejected/superseded**. Agent-inspected is evidence, not an acceptance status. Record the decision/evidence link, stable source location or immutable revision, relevant profile and permitted reuse. A new variant gets its own identity; retain the prior reference and history when the Director supersedes it.

## Reference register

| ID / profile | Reference and retrievable source | Status and permitted use |
|---|---|---|
| C1 / courier | [Pose A concept in PR #489](https://github.com/bongohorse/monster-girl-delivery/blob/036dd8d977b3cc7c28669bc1725158380902aed2/public/assets/art-gate/pose-a-concept-preview.png); [Director native-sprite handoff](https://github.com/bongohorse/monster-girl-delivery/issues/487#issuecomment-5859037826) | **Accepted concept identity within the trial brief**, broadly acceptable phone preview; final scale and production sprite unaccepted. Cap, horns, dark/red hair, small open mouth, red tail and square parcel jetpack are identity references. Not a native pixel source to resize/trace automatically. The concept poses are now on main via merged PR #489. [PR #520](https://github.com/bongohorse/monster-girl-delivery/pull/520) fixes their world-relative sizing/anchors and browser resize clipping; phone acceptance and a native production sprite remain open. |
| H1 / hazard | [Molten spike source](../assets/source/district-01/hazards/molten-spike-A-gpt-image.png), [source/export notes](../assets/source/district-01/hazards/README.md); [Director brief](https://github.com/bongohorse/monster-girl-delivery/issues/487#issuecomment-5856109390) | **Trial selected: variant A**, integrated by [PR #492](https://github.com/bongohorse/monster-girl-delivery/pull/492). Dark molten sphere, bright fiery eyes and orange spikes are a promising design reference. Final sprite, size, palette and full M6 art style remain unaccepted. |
| C2 / flight variants | [PR #489](https://github.com/bongohorse/monster-girl-delivery/pull/489), immutable revision `036dd8d977b3cc7c28669bc1725158380902aed2`, `public/assets/art-gate/pose-{b,c}-concept-preview.png` | **Experimental** alternate poses. #487's newer working update supersedes the earlier three-pose starting requirement: steady A is the baseline; frequent pose swaps were distracting. |
| C3 / rejected sprite | [Director handoff](https://github.com/bongohorse/monster-girl-delivery/issues/487#issuecomment-5859037826) records rejection of the procedural 96 × 96 placeholder | **Rejected**; do not revive it as the native pixel source. |
| Environment, UI, gallery | #487 working brief; no accepted image set recorded | **Unresolved**. Wide scene studies were composition references only; no retrievable source is recorded here. Use actual images when a request depends on matching them; an authorized new draft can proceed from the brief without claiming an approved palette/building set. |

## Shared gameplay trial profile

These are scoped working constraints from #487, not a completed Art Gate. Use a current explicit Director decision if it supersedes this register and update the appropriate owner.

| Dimension | Current trial constraint / unresolved choice |
|---|---|
| Shape language | Coarse readable pixel art; compact/chibi, unmistakably adult demon courier with recognizable delivery equipment. Final native grid/proportions require phone evidence. |
| Palette | Hazard uses the H1 dark/fiery contrast; city avoids sandy/historic dominance and neon cyberpunk. Exact shared colors, material proportions and biome palette are unresolved. |
| Contours | Clear silhouette at gameplay scale; native courier trial must avoid blur, soft halo and baked background. No project-wide outline thickness/color is approved. |
| Shading | Hazard must read as lethal without glow. Exact light direction, shadow steps and material treatment remain unresolved; do not promote backlog examples to rules. |
| Perspective/composition | Stable left-side courier, forward look-ahead; modern-fantasy city with restrained near-future accents. Exact environment projection is unresolved; facade fragments must not obscure the flight corridor or danger cues. |
| Detail/readability | Courier and lethal hazards/warnings first, coins/delivery cues next, scenery last. Moderate near-facade detail, slow distant parallax. Confirm detail at actual display size, not only in a large source image. |

## Asset-type profiles

Profiles specialize the shared trial constraints without restating them or approving new features.

| Type | Reference / comparison focus | Still open |
|---|---|---|
| Gameplay character and animation | C1 identity, steady Pose A baseline; inspect face, horns, parcel and silhouette at native pixels and two adjacent mobile display sizes. Compare anchor/apparent size across authorized variants. | Native editable pixel source, scale, minimum hit/death treatment and secondary motion; rising/falling poses remain optional experiments. |
| Hazard | H1 for the molten-spike trial; compare danger silhouette with courier, coins and relevant warning presentation, independently of glow. Use the relevant brief/reference for other hazards; an authorized new draft can proceed without a previously accepted image. | Final sprite/size/palette; artwork does not determine collision geometry or warning timing. |
| Parcel / delivery cue | Preserve visibly square courier parcel identity when applicable; compare cue with coins and dangers using the shared hierarchy. | No accepted standalone parcel artwork or universal icon treatment. |
| Background / environment | Modern-fantasy facades and skyline; compare behind the same gameplay elements and, when available, restrained parallax. | Exact palette, materials, projection and modular assets need the representative environment trial. |
| UI graphics | Compare silhouette/contrast at actual HUD/control size alongside gameplay references; fit an existing vector/icon system where present. | No accepted global UI visual profile; do not invent outline/palette standards from C1 alone. |
| Gallery / larger character variants | Treat gameplay identity as a scoped identity reference only; use the specific Director brief for composition and medium. | Later high-quality non-pixel gallery/tilt art is a separate decision, not current production scope or a reason to replace the gameplay trial. |

## Technical and acceptance boundary

[MASTER_SPEC.md §15](../MASTER_SPEC.md#15-asset-production-principles) owns format/device constraints and avoids premature global dimensions. [ARCHITECTURE.md §13](../ARCHITECTURE.md#13-assets) owns source/runtime stages. [DEVELOPMENT.md §11](../DEVELOPMENT.md#11-asset-commands) identifies planned tooling; [#494](https://github.com/bongohorse/monster-girl-delivery/issues/494) owns the shared asset workflow, which is not present on the inspected main. The spike's local exporter and dimensions in its source notes are asset-specific trial choices, not universal export rules.

A reusable accepted reference needs a durable image/source link and a Director decision with scope and evidence. Record agent comparisons separately, including variant identity, target size/context, native-pixel/alpha findings and any pending live/device checks. Do not mark a final art direction or Art Gate approved from a prompt match, desktop mockup, passing code tests or an authorized in-run trial.
