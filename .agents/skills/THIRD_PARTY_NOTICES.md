# Third-party notices for agent skills

## Matt Pocock skills

The following MGD-adapted skills are derived from [`mattpocock/skills`](https://github.com/mattpocock/skills), pinned for this adaptation to upstream commit `3cca18b368ae95cdbdebbff572ccafa662551015` (2026-09-04):

- `diagnosing-bugs`
- `code-review`
- `tdd`
- `codebase-design`
- `resolving-merge-conflicts`
- `research`
- `writing-for-agents`

The copies in this repository are intentionally adapted to Monster Girl Delivery's existing `AGENTS.md`, documentation ownership, evidence/reachability rules, autonomous-agent workflow, and validation commands. They are not a verbatim installation of Matt Pocock's full workflow pack.

### Upstream license

MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Graphify

The committed MGD [`graphify`](graphify/SKILL.md) skill is based on the public behavior and usage documented by [`Graphify-Labs/graphify`](https://github.com/Graphify-Labs/graphify), originally adapted against upstream version `0.9.56`, commit `67f99bd0059dd1bac9e44382907ef9f10098b39f` (2026-09-07).

MGD does not vendor the Graphify Python package. Graphify is installed on demand from the official PyPI package `graphifyy`, rather than during devcontainer setup; the runtime CLI is not pinned to the skill's original provenance version. The committed skill remains intentionally MGD-specific guidance: it narrows Graphify to code navigation and impact analysis, keeps Graphify output non-authoritative, and does not install upstream hooks, strict mode, or always-on behavior.

Graphify upstream is licensed under the Apache License 2.0. See the upstream [`LICENSE`](https://github.com/Graphify-Labs/graphify/blob/67f99bd0059dd1bac9e44382907ef9f10098b39f/LICENSE) and [`NOTICE`](https://github.com/Graphify-Labs/graphify/blob/67f99bd0059dd1bac9e44382907ef9f10098b39f/NOTICE) for the applicable terms and notices.

## Selected workflow guidance

Selected guidance in [`docs/AI_WORKFLOW.md`](../../docs/AI_WORKFLOW.md) is adapted from `mattpocock/skills` at commit `49dd158d1076134a641b33efb035946536778336`: [`implement`](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/implement/SKILL.md) supplies ticket-reference reading and identification; [`ask-matt`](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/ask-matt/SKILL.md) supplies reading a skill before claiming capabilities or omitting steps; [`to-tickets`](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/to-tickets/SKILL.md) and [`wayfinder`](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/wayfinder/SKILL.md) supply real published cross-reference IDs, separate parent/blocking relationships and the distinction between decision work and implementation readiness. Current-state checks for existing spec/planning/handoff work are MGD-specific refinements.

This adopts those principles only, not the upstream flow, tracker setup/labels, installation or automatic execution. The original skill provenance above remains unchanged. Upstream [`LICENSE`](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/LICENSE) is MIT, Copyright (c) 2026 Matt Pocock; the complete MIT notice above also applies to this adaptation.
