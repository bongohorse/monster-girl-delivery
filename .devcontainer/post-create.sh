#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
BUN_VERSION_FILE="$REPOSITORY_ROOT/.bun-version"
BUN_BIN="$HOME/.bun/bin/bun"

if [[ ! -f "$BUN_VERSION_FILE" ]]; then
  printf '[Codespaces] Error: Bun version file not found: %s\n' "$BUN_VERSION_FILE" >&2
  exit 1
fi

BUN_VERSION="$(<"$BUN_VERSION_FILE")"
BUN_VERSION="${BUN_VERSION%"${BUN_VERSION##*[![:space:]]}"}"

if [[ -z "$BUN_VERSION" ]]; then
  printf '[Codespaces] Error: Bun version file is empty: %s\n' "$BUN_VERSION_FILE" >&2
  exit 1
fi

printf '\n[Codespaces] Installing Bun %s...\n' "$BUN_VERSION"
if [[ ! -x "$BUN_BIN" ]] || [[ "$($BUN_BIN --version 2>/dev/null || true)" != "$BUN_VERSION" ]]; then
  curl --fail --silent --show-error --location --retry 5 --connect-timeout 10 \
    https://bun.sh/install | bash -s -- "bun-v$BUN_VERSION"
fi

export PATH="$HOME/.bun/bin:$PATH"

printf '\n[Codespaces] Installing project dependencies...\n'
bun install --frozen-lockfile

printf '\n[Codespaces] Installing Codex CLI (optional)...\n'
if curl --fail --silent --show-error --location --retry 5 --connect-timeout 10 \
    https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh; then
  printf '[Codespaces] Codex CLI installed.\n'
else
  printf '[Codespaces] Warning: Codex CLI installation failed; project dependencies are ready.\n' >&2
fi

printf '\n[Codespaces] Setup complete.\n'
