#!/usr/bin/env bash
# flake-verify.sh — run one or more vitest spec files repeatedly under
# v8 coverage to surface intermittent failures (flake hunting).
#
# Vitest 4 does not expose a `--repeat=N` CLI flag (per-test `it.repeats`
# exists but does not re-exercise module loading). This script wraps the
# loop in shell so each iteration is a fresh vitest invocation, which is
# what the v8-coverage mock-identity flake (issue #6012) requires.
#
# Usage:
#   .scripts/test/flake-verify.sh <spec-path> [<spec-path>...]
#
# Iteration count:
#   FLAKE_VERIFY_RUNS environment variable (default: 200)
#
# Exits non-zero on the first failing iteration; prints the failed
# iteration's output and the iteration number.
#
# Used by `pnpm test:flake-verify` (see package.json scripts).
# Required by spec 100-fix-flaky-tests (FR-012, SC-001).

set -euo pipefail

RUNS="${FLAKE_VERIFY_RUNS:-200}"

if ! [[ "$RUNS" =~ ^[1-9][0-9]*$ ]]; then
  echo "Error: FLAKE_VERIFY_RUNS must be a positive integer (got: '$RUNS')." >&2
  exit 64
fi

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <spec-path> [<spec-path>...]" >&2
  echo "Set FLAKE_VERIFY_RUNS to override default 200 iterations." >&2
  exit 64
fi

LOG_FILE="$(mktemp -t flake-verify.XXXXXX.log)"
trap 'rm -f "$LOG_FILE"' EXIT

echo "🔁 flake-verify: $RUNS iterations under coverage of:"
for path in "$@"; do
  echo "    - $path"
done

for i in $(seq 1 "$RUNS"); do
  if ! pnpm exec vitest run --coverage "$@" >"$LOG_FILE" 2>&1; then
    echo
    echo "❌ Failed on iteration $i / $RUNS — output below:"
    echo "---"
    cat "$LOG_FILE"
    echo "---"
    exit 1
  fi
  printf "."
  if [ $((i % 50)) -eq 0 ]; then
    echo " $i/$RUNS"
  fi
done

echo
echo "✅ Passed $RUNS / $RUNS iterations"
