#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
BUN_VERSION_FILE="$REPOSITORY_ROOT/.bun-version"
GRAPHIFY_VERSION_FILE="$REPOSITORY_ROOT/.graphify-version"
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

printf '\n[Codespaces] Installing Google Antigravity CLI (optional)...\n'
if curl --fail --silent --show-error --location --retry 5 --connect-timeout 10 \
    https://antigravity.google/cli/install.sh | bash; then
  printf '[Codespaces] Google Antigravity CLI installed.\n'
else
  printf '[Codespaces] Warning: Google Antigravity CLI installation failed; project dependencies are ready.\n' >&2
fi

printf '\n[Codespaces] Installing Graphify CLI (optional)...\n'
if [[ ! -f "$GRAPHIFY_VERSION_FILE" ]]; then
  printf '[Codespaces] Warning: Graphify version file not found: %s\n' "$GRAPHIFY_VERSION_FILE" >&2
else
  GRAPHIFY_VERSION="$(<"$GRAPHIFY_VERSION_FILE")"
  GRAPHIFY_VERSION="${GRAPHIFY_VERSION%"${GRAPHIFY_VERSION##*[![:space:]]}"}"

  if [[ -z "$GRAPHIFY_VERSION" ]]; then
    printf '[Codespaces] Warning: Graphify version file is empty: %s\n' "$GRAPHIFY_VERSION_FILE" >&2
  else
    export PATH="$HOME/.local/bin:$PATH"

    if ! command -v uv >/dev/null 2>&1; then
      if curl --fail --silent --show-error --location --retry 5 --connect-timeout 10 \
          https://astral.sh/uv/install.sh | sh; then
        printf '[Codespaces] uv installed for Graphify.\n'
      else
        printf '[Codespaces] Warning: uv installation failed; Graphify was not installed.\n' >&2
      fi
    fi

    export PATH="$HOME/.local/bin:$PATH"

    if command -v uv >/dev/null 2>&1; then
      if uv tool install --upgrade "graphifyy==$GRAPHIFY_VERSION"; then
        printf '[Codespaces] Graphify CLI %s installed.\n' "$GRAPHIFY_VERSION"
      else
        printf '[Codespaces] Warning: Graphify CLI installation failed; project dependencies are ready.\n' >&2
      fi
    fi
  fi
fi

printf '\n[Codespaces] Setup complete.\n'
