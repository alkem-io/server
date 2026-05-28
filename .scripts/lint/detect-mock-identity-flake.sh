#!/usr/bin/env bash
# detect-mock-identity-flake.sh — heuristic detector for the mock-identity
# anti-pattern documented in docs/testing-flakiness.md §1 (and originally
# observed as issue #6012).
#
# Flags any *.spec.ts file that:
#   (a) contains a `vi.mock(...)` call with `vi.fn()` inside the factory
#       body (not inside a `vi.hoisted` block), AND
#   (b) imports any symbol from the same mocked module path.
#
# Heuristic — false positives are accepted. False positives:
#   - The mocked symbol is imported but never asserted on.
#   - The factory uses `vi.fn()` but the test never references the mock identity.
#
# Exits 0 if no matches; exits non-zero with one warning per offending file.
#
# Usage:
#   .scripts/lint/detect-mock-identity-flake.sh [<path>...]
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

  # (a) factory uses vi.fn() — check both `vi.mock(...,()=>...)` and async-factory shapes.
  # Look for a `vi.mock(...)` call followed within ~30 lines by a bare `vi.fn()`
  # (i.e., not via a hoisted handle).
  if ! grep -q "vi\\.mock(" "$file"; then
    continue
  fi
  # Skip files that already use vi.hoisted — they're safe by construction.
  if grep -q "vi\\.hoisted(" "$file"; then
    continue
  fi
  if ! awk '
    /vi\.mock\(/ { mock_block = 1; depth = 0 }
    mock_block {
      for (i = 1; i <= length($0); i++) {
        c = substr($0, i, 1)
        if (c == "(") depth++
        if (c == ")") depth--
      }
      if (/vi\.fn\(/) { print FILENAME ":" FNR ": vi.fn() inside vi.mock factory"; found = 1 }
      if (depth <= 0) mock_block = 0
    }
    END { exit found ? 0 : 1 }
  ' "$file" >/dev/null 2>&1; then
    continue
  fi

  # (b) extract the mocked module specifier(s) and verify the file imports from any of them.
  hit=0
  mapfile -t MOD_SPECS < <(
    grep -oE "vi\\.mock\\(['\"][^'\"]+['\"]" "$file" | sed -E "s/^vi\\.mock\\(['\"]//; s/['\"]$//"
  )
  for spec in "${MOD_SPECS[@]}"; do
    [ -z "$spec" ] && continue
    # Match `import ... from 'spec'` or `import 'spec'`
    if grep -qE "from ['\"]${spec//\//\\/}['\"]" "$file" \
      || grep -qE "import ['\"]${spec//\//\\/}['\"]" "$file"; then
      hit=1
      echo "⚠️  $SCRIPT_NAME: $file — mocks '$spec' with bare vi.fn() AND imports from it"
      echo "    See docs/testing-flakiness.md §1 (Mock identity under v8 coverage)."
      FOUND=$((FOUND + 1))
      break
    fi
  done
done

if [ "$FOUND" -gt 0 ]; then
  echo
  echo "❌ $FOUND file(s) match the mock-identity anti-pattern."
  echo "   Wrap mock identities in \`vi.hoisted()\` — see docs/testing-flakiness.md §1."
  exit 1
fi

echo "✅ No mock-identity-anti-pattern matches."
