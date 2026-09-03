#!/usr/bin/env bash
set -euo pipefail

echo "== GitHub CLI authentication =="
gh auth status

echo
echo "== Repository =="
gh repo view --json nameWithOwner,defaultBranchRef,url

echo
echo "== Read tests =="
gh issue list --limit 3 >/dev/null && echo "Issues: OK"
gh pr list --limit 3 >/dev/null && echo "Pull requests: OK"
gh run list --limit 3 >/dev/null && echo "Actions: OK"

echo
echo "Read access checks passed."
echo "Write permissions are exercised only by real project tasks to avoid creating test noise."
