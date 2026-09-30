#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"

# Bind-mounted workspaces can have a different owner from the container user.
# Trust only this workspace, before any repository Git operation is needed.
if ! git config --global --get-all safe.directory | grep -qxF -- "$REPOSITORY_ROOT"; then
  git config --global --add safe.directory "$REPOSITORY_ROOT"
fi

GH_EXPORT='if [ -n "${MGD_GH_TOKEN:-}" ]; then export GH_TOKEN="$MGD_GH_TOKEN"; fi'
BUN_INSTALL_EXPORT='export BUN_INSTALL="$HOME/.bun"'
TOOL_PATH_EXPORT='export PATH="$BUN_INSTALL/bin:$HOME/.local/bin:$PATH"'

for shell_profile in "$HOME/.bashrc" "$HOME/.profile"; do
  # Migrate the previous unconditional export without touching other credentials.
  if [[ -f "$shell_profile" ]]; then
    sed -i '\|^export GH_TOKEN="$MGD_GH_TOKEN"$|d' "$shell_profile"
  fi

  for profile_line in "$GH_EXPORT" "$BUN_INSTALL_EXPORT" "$TOOL_PATH_EXPORT"; do
    if ! grep -qxF "$profile_line" "$shell_profile" 2>/dev/null; then
      printf '\n%s\n' "$profile_line" >> "$shell_profile"
    fi
  done
done
