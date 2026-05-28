#!/usr/bin/env bash
# detect-wallclock-perf.sh — heuristic detector for wall-clock performance
# assertions in unit tests, documented in docs/testing-flakiness.md §3.
#
# Flags any *.spec.ts file that contains BOTH:
#   (a) `expect(...).toBeLessThan(N)` or `toBeLessThanOrEqual(N)` where N is a
#       numeric literal ≥ 100 (i.e., a millisecond-scale budget), AND
#   (b) a reference to `Date.now()` or `performance.now()` in the same file.
#
# Heuristic — false positives accepted:
#   - The toBeLessThan is asserting on something unrelated to Date.now()
#     (e.g., array length, ratio, count).
#   - The assertion is intentional and lives in a controlled environment.
#
# Exits 0 if no matches; exits non-zero with one warning per offending file.
#
# Usage:
#   .scripts/lint/detect-wallclock-perf.sh [<path>...]
#
# Defaults to scanning `src/**/*.spec.ts` and `test/**/*.spec.ts`. Pass explicit
# paths to scan a subset (e.g., for a pre-commit hook running on staged files).
#
# Reference: spec 100-fix-flaky-tests, FR-015 (Decision 7).

set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
FOUND=0

if [ "$#" -eq 0 ]; then
  mapfile -t FILES < <(
    find src test -type f -name '*.spec.ts' \
      -not -name '*.it-spec.ts' \
      -not -name '*.e2e-spec.ts' 2>/dev/null | sort
  )
else
  FILES=("$@")
fi

for file in "${FILES[@]}"; do
  [ -f "$file" ] || continue
  case "$file" in
    *.spec.ts) ;;
    *) continue ;;
  esac
  case "$file" in
    *.it-spec.ts|*.e2e-spec.ts) continue ;;
  esac

  # (a) toBeLessThan / toBeLessThanOrEqual with numeric literal ≥ 100.
  hits=$(grep -nE "\.toBeLessThan(OrEqual)?\(\s*[0-9]{3,}" "$file" || true)
  if [ -z "$hits" ]; then
    continue
  fi

  # (b) references to Date.now() or performance.now() in the same file.
  if ! grep -qE "Date\\.now\(|performance\\.now\(" "$file"; then
    continue
  fi

  echo "⚠️  $SCRIPT_NAME: $file"
  echo "$hits" | while IFS= read -r line; do
    echo "    $line"
  done
  echo "    + this file also references Date.now() / performance.now()."
  echo "    See docs/testing-flakiness.md §3 (Wall-clock performance assertions)."
  FOUND=$((FOUND + 1))
done

if [ "$FOUND" -gt 0 ]; then
  echo
  echo "❌ $FOUND file(s) match the wall-clock-perf-assertion anti-pattern."
  echo "   Replace with an operation-budget assertion or downgrade to task.meta —"
  echo "   see docs/testing-flakiness.md §3."
  exit 1
fi

echo "✅ No wall-clock-perf-assertion anti-pattern matches."
