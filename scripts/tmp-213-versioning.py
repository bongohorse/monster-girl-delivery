from pathlib import Path
import json


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


roadmap_path = Path("docs/ROADMAP.md")
roadmap = roadmap_path.read_text()
roadmap = once(
    roadmap,
    "**Roadmap 3.0 revision:** 2026-09-12  \n**Current milestone:** Pre-M5 transition (M4 complete; M5 parent #197 approved; implementation blocked by Pre-M5 exit gate)",
    "**Roadmap 3.1 revision:** 2026-09-13\n**Current milestone:** Pre-M5 transition (M4 complete; M5 parent #197 approved; implementation blocked by Pre-M5 exit gate)\n**Current version:** `0.4` (`package.json`: `0.4.0`); working toward M5 / `0.5`",
    "roadmap header",
)

version_section = """
## Milestone versioning

Each numbered milestone advances the project version by `0.1`. The version represents the **latest completed milestone**, not work merely in progress.

| Milestone | Product version | Package version |
|---|---:|---:|
| M0 — Foundation | `0.0` | `0.0.0` |
| M1 — Flight Prototype | `0.1` | `0.1.0` |
| M2 — Horizontal Run & First Hazard | `0.2` | `0.2.0` |
| M3 — Seeded Generation & Fairness | `0.3` | `0.3.0` |
| M4 — Run Pacing & Hazard Language | `0.4` | `0.4.0` |
| M5 — Complete Arcade Loop & Skill Layer | `0.5` | `0.5.0` |
| M6 — Vertical Slice / Visual Identity | `0.6` | `0.6.0` |
| M7 — Optional / Minimal Meta & Persistence | `0.7` | `0.7.0` |
| M8 — Release Content Production | `0.8` | `0.8.0` |
| M9 — Release Hardening & Release Candidate | `0.9` | `0.9.0` |
| M10 — Release 1.0 | `1.0` | `1.0.0` |

The roadmap uses the short product version (`0.4`, `0.5`, …, `1.0`). `package.json` uses the SemVer-compatible three-component form (`0.4.0`, `0.5.0`, …, `1.0.0`). Intermediate work does not claim the next milestone version before that milestone's exit gate passes.

M10 / `1.0` is the first release milestone. By that point the proven core/game loop must be clean, coherent, stable, and release-ready; M10 is a final release gate rather than a new feature-expansion milestone.

---
"""
roadmap = once(
    roadmap,
    "Decision gates between milestones are intentionally not numbered as separate implementation milestones. They exist to prevent expensive production work from starting while a major product question is still unresolved.\n\n---\n",
    "Decision gates between milestones are intentionally not numbered as separate implementation milestones. They exist to prevent expensive production work from starting while a major product question is still unresolved.\n" + version_section,
    "version section",
)

roadmap = once(
    roadmap,
    "| Milestone | Closeout | Supporting evidence |\n|---|---|---|\n| M0 — Foundation |",
    "| Milestone | Version | Closeout | Supporting evidence |\n|---|---:|---|---|\n| M0 — Foundation | `0.0` |",
    "completed table",
)
for old, new in (
    ("| M1 — Flight Prototype |", "| M1 — Flight Prototype | `0.1` |"),
    ("| M2 — Horizontal Run & First Hazard |", "| M2 — Horizontal Run & First Hazard | `0.2` |"),
    ("| M3 — Seeded Generation & Fairness |", "| M3 — Seeded Generation & Fairness | `0.3` |"),
    ("| M4 — Run Pacing & Hazard Language |", "| M4 — Run Pacing & Hazard Language | `0.4` |"),
    ("## M5 — Complete Arcade Loop & Skill Layer", "## M5 / v0.5 — Complete Arcade Loop & Skill Layer"),
    ("## M6 — Vertical Slice / Visual Identity", "## M6 / v0.6 — Vertical Slice / Visual Identity"),
    ("## M7 — Optional / Minimal Meta & Persistence", "## M7 / v0.7 — Optional / Minimal Meta & Persistence"),
    ("## M8 — Release Content Production", "## M8 / v0.8 — Release Content Production"),
    ("## M9 — Release Hardening & Launch", "## M9 / v0.9 — Release Hardening & Release Candidate"),
):
    roadmap = once(roadmap, old, new, old)

m10_section = """- the Game Director accepts the build as the `1.0` release candidate;
- the M9 closeout records any known non-blocking limitations and confirms that remaining work is final release-gate work rather than missing core systems.

M9 produces the `0.9` release candidate. It does **not** publish or claim version `1.0`.

---

## M10 / v1.0 — Release 1.0

**Purpose:** perform the final release gate and ship the first complete public release without introducing another large feature layer.

### Proof question

> Is the proven game — especially its core start → run → fail/result → retry loop — clean, coherent, stable, performant, and packaged well enough to call it version 1.0 and release it?

### Entry gate

- M9 / `0.9` release-candidate exit gate passed;
- no known release blocker remains open;
- the selected shipping path and release build are reproducible;
- release content is frozen except for release-blocking fixes and explicitly approved final polish.

### Core scope

- final regression pass over the complete core/game loop;
- final representative device/platform validation for the selected release path;
- final release-blocker fixes only;
- final production configuration, version metadata, and release notes;
- reproducible `1.0.0` build/artifact;
- final Game Director release acceptance;
- publish the selected version 1.0 release path.

### Exit gate

M10 / `1.0` completes only when:

- the core game loop works cleanly end-to-end without developer intervention or known release-blocking defects;
- gameplay readability, fairness, input, lifecycle, results, retry, persistence where selected, and presentation are coherent at the agreed release quality bar;
- the chosen release build passes the final regression/device matrix;
- `package.json` and release metadata identify the release as `1.0.0`;
- the selected release artifact is produced and published;
- the Game Director accepts Monster Girl Delivery as version `1.0`;
- non-blocking ideas and improvements are recorded as post-1.0 work rather than silently expanding the release gate.

**Rule:** M10 is a release milestone, not permission to add major new gameplay, meta, art-pipeline, or platform systems. If 1.0 still needs a foundation system, the roadmap must be revisited instead of hiding that work inside release polish.

---

# Development sequence"""
roadmap = once(
    roadmap,
    "- the Game Director accepts the build as release-ready;\n- the final release closeout records any known non-blocking limitations or post-release backlog.\n\n---\n\n# Development sequence",
    m10_section,
    "M10 section",
)
roadmap = once(
    roadmap,
    '  BUDGET --> M8["M8: scale proven content"]\n  M8 --> M9["M9: harden and launch"]',
    '  BUDGET --> M8["M8 / 0.8: scale proven content"]\n  M8 --> M9["M9 / 0.9: release-candidate hardening"]\n  M9 --> M10["M10 / 1.0: release"]',
    "mermaid tail",
)
roadmap = roadmap.replace('M5["M5: outcome → skill → arcade integration"]', 'M5["M5 / 0.5: outcome → skill → arcade integration"]')
roadmap = roadmap.replace('M6["M6: vertical slice"]', 'M6["M6 / 0.6: vertical slice"]')
roadmap = roadmap.replace('M7["M7: approved scope only"]', 'M7["M7 / 0.7: approved scope only"]')
roadmap = once(
    roadmap,
    "- M0–M4 historical scope is not rewritten by later planning changes.\n",
    "- M0–M4 historical scope is not rewritten by later planning changes.\n- Milestone versions advance only when the corresponding milestone closes: M1=`0.1` through M10=`1.0`; in-progress work keeps the latest completed milestone version.\n- M10 / `1.0` is the first release milestone; M9 / `0.9` is the release candidate.\n",
    "roadmap rules",
)
roadmap_path.write_text(roadmap)

hub_path = Path("docs/README.md")
hub = hub_path.read_text()
hub = once(
    hub,
    "- **Current milestone:** Pre-M5 Gameplay Authority Gate (M4 complete; M5 parent #197 approved; implementation blocked)\n",
    "- **Current milestone:** Pre-M5 Gameplay Authority Gate (M4 complete; M5 parent #197 approved; implementation blocked)\n- **Current version:** `0.4` (`package.json`: `0.4.0`), working toward M5 / `0.5`\n",
    "docs version",
)
hub = hub.replace("M0–M9 order and milestone-level future scope", "M0–M10 order, milestone versions, and milestone-level future scope")
hub = hub.replace("the approved M0–M9 sequence;", "the approved M0–M10 sequence and milestone/version mapping;")
hub_path.write_text(hub)

spec_path = Path("MASTER_SPEC.md")
spec = spec_path.read_text()
spec = once(
    spec,
    "**Current milestone:** Pre-M5 transition (M4 complete; M5 parent #197 approved; implementation blocked by Pre-M5 exit gate)\n",
    "**Current milestone:** Pre-M5 transition (M4 complete; M5 parent #197 approved; implementation blocked by Pre-M5 exit gate)\n**Current version:** `0.4` (`package.json`: `0.4.0`), working toward M5 / `0.5`\n",
    "spec version",
)
spec = spec.replace("complete M0–M9 roadmap", "complete M0–M10 roadmap")
release_decision = """
### Release/version model — DECIDED

MGD uses milestone-aligned pre-release versions: M0=`0.0`, M1=`0.1`, continuing in `0.1` steps through M9=`0.9`, with M10=`1.0`. Version `1.0` is the first release milestone.

The visible product version tracks the latest **completed** milestone. Package metadata uses the SemVer-compatible three-component equivalent (`0.4.0`, `0.5.0`, …, `1.0.0`). Work toward a milestone does not claim that milestone's version before its exit gate passes.

By M10 / `1.0`, the core game and core arcade loop must be clean, coherent, stable, and release-ready. M10 is a final release gate, not a new large feature-expansion milestone. Detailed sequencing and milestone scope remain owned by [`docs/ROADMAP.md`](docs/ROADMAP.md).
"""
spec = once(
    spec,
    "Future delivery-specific modes, finishable deliveries, cargo rules, Companions, HQ systems, and other extensions remain ideas until explicitly promoted from [`docs/BACKLOG.md`](docs/BACKLOG.md).\n\n---\n\n## 2. Platform strategy",
    "Future delivery-specific modes, finishable deliveries, cargo rules, Companions, HQ systems, and other extensions remain ideas until explicitly promoted from [`docs/BACKLOG.md`](docs/BACKLOG.md).\n" + release_decision + "\n---\n\n## 2. Platform strategy",
    "spec decision",
)
spec_path.write_text(spec)

package_path = Path("package.json")
package = json.loads(package_path.read_text())
if package.get("version") != "0.0.0":
    raise SystemExit(f"package version expected 0.0.0, found {package.get('version')}")
package["version"] = "0.4.0"
package_path.write_text(json.dumps(package, indent=2) + "\n")
