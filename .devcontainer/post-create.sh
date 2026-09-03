#!/usr/bin/env bash
set -euo pipefail

BUN_VERSION="1.4.0"
BUN_BIN="$HOME/.bun/bin/bun"

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
    https://chatgpt.com/codex/install.sh | sh; then
  printf '[Codespaces] Codex CLI installed.\n'
else
  printf '[Codespaces] Warning: Codex CLI installation failed; project dependencies are ready.\n' >&2
fi

printf '\n[Codespaces] Setup complete.\n'
