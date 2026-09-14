#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
BUN_VERSION_FILE="$REPOSITORY_ROOT/.bun-version"
BUN_BIN="$HOME/.bun/bin/bun"
TOTAL_STEPS=7
CURRENT_STEP=0
SETUP_STARTED=$SECONDS
LOG_DIR="${TMPDIR:-/tmp}/mgd-codespace-setup"
INTERACTIVE=false

if [[ -t 1 && "${TERM:-dumb}" != "dumb" ]]; then
  INTERACTIVE=true
fi

rm -rf "$LOG_DIR"
mkdir -p "$LOG_DIR"

export PATH="$HOME/.bun/bin:$HOME/.local/bin:$PATH"

GRAPHIFY_PATH_EXPORT='export PATH="$HOME/.local/bin:$PATH"'
if ! grep -qxF "$GRAPHIFY_PATH_EXPORT" "$HOME/.bashrc" 2>/dev/null; then
  printf '\n%s\n' "$GRAPHIFY_PATH_EXPORT" >> "$HOME/.bashrc"
fi

if [[ ! -f "$BUN_VERSION_FILE" ]]; then
  printf '✗ Codespaces setup cannot start: Bun version file not found: %s\n' "$BUN_VERSION_FILE" >&2
  exit 1
fi

BUN_VERSION="$(<"$BUN_VERSION_FILE")"
BUN_VERSION="${BUN_VERSION%"${BUN_VERSION##*[![:space:]]}"}"

if [[ -z "$BUN_VERSION" ]]; then
  printf '✗ Codespaces setup cannot start: Bun version file is empty: %s\n' "$BUN_VERSION_FILE" >&2
  exit 1
fi

print_log_excerpt() {
  local log_file="$1"

  if [[ -s "$log_file" ]]; then
    printf '│    Last output:\n' >&2
    tail -n 80 "$log_file" | sed 's/^/│    /' >&2
  else
    printf '│    No command output was captured.\n' >&2
  fi

  printf '│    Full log: %s\n' "$log_file" >&2
}

run_step() {
  local mode="$1"
  local title="$2"
  local success_message="$3"
  local command_name="$4"
  local slug log_file started elapsed status pid frame_index
  local -a spinner=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')

  CURRENT_STEP=$((CURRENT_STEP + 1))
  slug="$(printf '%s' "$title" | tr '[:upper:] ' '[:lower:]-' | tr -cd '[:alnum:]_-')"
  log_file="$LOG_DIR/$(printf '%02d' "$CURRENT_STEP")-$slug.log"
  started=$SECONDS

  printf '├─ [%d/%d] %s\n' "$CURRENT_STEP" "$TOTAL_STEPS" "$title"

  "$command_name" >"$log_file" 2>&1 &
  pid=$!
  frame_index=0

  if $INTERACTIVE; then
    while kill -0 "$pid" 2>/dev/null; do
      printf '\r\033[2K│  %s Working...' "${spinner[$frame_index]}"
      frame_index=$(((frame_index + 1) % ${#spinner[@]}))
      sleep 0.1
    done
    printf '\r\033[2K'
  fi

  set +e
  wait "$pid"
  status=$?
  set -e
  elapsed=$((SECONDS - started))

  if (( status == 0 )); then
    printf '│  ✓ %s (%ss)\n│\n' "$success_message" "$elapsed"
    return 0
  fi

  if [[ "$mode" == "optional" ]]; then
    printf '│  ⚠ %s failed (exit %d, %ss) — continuing.\n' "$title" "$status" "$elapsed" >&2
    print_log_excerpt "$log_file"
    printf '│\n'
    return 0
  fi

  printf '│  ✗ %s failed (exit %d, %ss).\n' "$title" "$status" "$elapsed" >&2
  print_log_excerpt "$log_file"
  printf '╰─ ✗ Codespace setup stopped at step %d/%d.\n' "$CURRENT_STEP" "$TOTAL_STEPS" >&2
  exit "$status"
}

step_python() {
  command -v python3 >/dev/null
  command -v python >/dev/null
  command -v pip3 >/dev/null
  python3 --version
  python --version
  pip3 --version
}

step_bun() {
  if [[ ! -x "$BUN_BIN" ]] || [[ "$($BUN_BIN --version 2>/dev/null || true)" != "$BUN_VERSION" ]]; then
    curl --fail --silent --show-error --location --retry 5 --connect-timeout 10 \
      https://bun.sh/install | bash -s -- "bun-v$BUN_VERSION"
  fi

  "$BUN_BIN" --version
}

step_dependencies() {
  cd "$REPOSITORY_ROOT"
  bun install --frozen-lockfile
}

step_codex() {
  curl --fail --silent --show-error --location --retry 5 --connect-timeout 10 \
    https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh
}

step_antigravity() {
  curl --fail --silent --show-error --location --retry 5 --connect-timeout 10 \
    https://antigravity.google/cli/install.sh | bash
}

step_graphify() {
  if ! command -v uv >/dev/null 2>&1; then
    curl --fail --silent --show-error --location --retry 5 --connect-timeout 10 \
      https://astral.sh/uv/install.sh | sh
  fi

  export PATH="$HOME/.local/bin:$PATH"
  uv tool install --upgrade 'graphifyy@latest'
}

step_build() {
  cd "$REPOSITORY_ROOT"
  bun run build
}

printf '\n╭─ Monster Girl Delivery · Codespace Setup\n│\n'
run_step required "Python environment" "Python is ready" step_python
run_step required "Bun" "Bun $BUN_VERSION is ready" step_bun
run_step required "Project dependencies" "Project dependencies installed" step_dependencies
run_step optional "Codex CLI" "Latest Codex CLI installed" step_codex
run_step optional "Google Antigravity CLI" "Latest Google Antigravity CLI installed" step_antigravity
run_step optional "Graphify CLI" "Latest Graphify CLI installed" step_graphify
run_step required "Production build" "Production build successful" step_build

printf '╰─ ✓ Codespace ready — %ss\n' "$((SECONDS - SETUP_STARTED))"
printf '   Setup logs: %s\n' "$LOG_DIR"
