#!/usr/bin/env bash
# Fails the build when package.json pins any dependency to a non-registry
# specifier — a local file: path or a pkg.pr.new commit preview.
#
# Both are legitimate to use WHILE a feature is in flight, before a sibling
# repo's PR has merged and published a tagged release: neither a registry
# version nor a stable preview URL exists yet. They are never legitimate to
# merge into a protected branch, for two independent reasons this script
# exists to catch even when nobody remembers to check by hand:
#   - a file: dependency resolves to whatever bytes happen to sit at that
#     path, so its "integrity" hash in the lockfile is self-certifying —
#     tampering with the vendored file and regenerating the lockfile
#     produces a self-consistent diff that a human reviewing it as a lockfile
#     change, not a binary payload, is unlikely to catch;
#   - a Docker build stage that copies only package.json/pnpm-lock.yaml
#     (never the working tree) cannot resolve either specifier at all, so
#     the release image build fails wherever this hasn't already been
#     swapped for the real published version.
#
# Wired into CI on pushes and PRs targeting develop/main (see
# .github/workflows/ci-tests.yml) — never on feature branches, where an
# in-flight pin is exactly what the situation calls for.
set -euo pipefail

PACKAGE_JSON="${1:-package.json}"

if [ ! -f "$PACKAGE_JSON" ]; then
  echo "check-vendor-lib-pins: $PACKAGE_JSON not found" >&2
  exit 2
fi

# Packages permitted to carry a non-registry specifier permanently, each
# with a reason a reviewer can check against without re-deriving it:
#   - typeorm: this repo runs a custom fork (pkg.pr.new/antst/typeorm), not
#     the npm package — documented in CLAUDE.md, not an in-flight pin.
ALLOWLIST="typeorm"

violations=$(node -e '
  const path = require("path");
  const pkg = require(path.resolve(process.argv[1]));
  const allowlist = new Set(
    (process.argv[2] || "").split(",").filter(Boolean)
  );
  const sections = ["dependencies", "devDependencies", "optionalDependencies"];
  const bad = [];
  for (const section of sections) {
    const deps = pkg[section] || {};
    for (const [name, specifier] of Object.entries(deps)) {
      if (allowlist.has(name)) continue;
      if (
        typeof specifier === "string" &&
        (specifier.startsWith("file:") || specifier.includes("pkg.pr.new"))
      ) {
        bad.push(`${section}.${name} = "${specifier}"`);
      }
    }
  }
  console.log(bad.join("\n"));
' "$PACKAGE_JSON" "$ALLOWLIST")

if [ -n "$violations" ]; then
  echo "check-vendor-lib-pins: non-registry dependency specifier(s) found in $PACKAGE_JSON:" >&2
  echo "$violations" >&2
  echo "" >&2
  echo "These resolve to an unreviewable local/preview artifact and cannot" >&2
  echo "produce a release Docker image. Pin the exact registry version" >&2
  echo "published by the producing repo's tagged release before merging to" >&2
  echo "a protected branch." >&2
  exit 1
fi

echo "check-vendor-lib-pins: no non-registry dependency specifiers found in $PACKAGE_JSON"
