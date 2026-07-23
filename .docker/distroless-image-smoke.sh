#!/usr/bin/env bash
# workspace#026-distroless-runtime-images — persisted US1 regression.
#
# Mechanically asserts the `server-runtime-image` contract (US1-AS1, US1-AS2):
#   - runs as UID 65532 (nonroot), CMD == ["dist/main.js"]
#   - no shell / package manager / /wait binary reachable
#   - no src/ tree, no ts-node, no pnpm in node_modules
#   - the native sentinel `sharp` loads (glibc-matched, not a musl artifact)
#   - emits IMAGE_DIGEST= / IMAGE_SIZE_BYTES= and enforces the SC-001 ≥40%
#     size-reduction budget against the recorded pre-change baseline.
#
# Usage: .docker/distroless-image-smoke.sh <image[:tag]> [baseline_size_bytes]
#
# Baseline: alkemio/server:latest (amd64), pulled from Docker Hub 2026-07-23 —
# the pinned SHA tag recorded in dev-orchestration's base manifest
# (9b6a81eeb138e93d0d65568b2a4d4fd9f03965f2) was not resolvable from this
# worktree (404 on Docker Hub at verification time; dev-orchestration is a
# separate repo/worktree not in this wave's scope), so `latest` — the most
# recently published pre-distroless image at the same point in history — is
# used as the size baseline instead. Compressed size measured via
# `docker save <image> | wc -c`, which — cross-checked against the Docker Hub
# v2 API's reported compressed layer size for the same tag — tracks registry
# transfer size closely on this Docker Engine version. Re-measure and update
# BASELINE_IMAGE_SIZE_BYTES if the true dev-orchestration-pinned baseline
# becomes available (e.g. during forge-verify).
set -euo pipefail

IMAGE="${1:?usage: distroless-image-smoke.sh <image> [baseline_size_bytes]}"
BASELINE_IMAGE_SIZE_BYTES="${2:-317579664}"
MIN_REDUCTION_PCT=40

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "PASS: $*"
}

run_node() {
  docker run --rm --entrypoint /nodejs/bin/node "$IMAGE" "$@"
}

echo "== distroless-image-smoke: $IMAGE =="

# --- US1-AS1: user, entrypoint, CMD ---------------------------------------
USER_ID="$(docker inspect "$IMAGE" --format '{{.Config.User}}')"
[ "$USER_ID" = "65532" ] || [ "$USER_ID" = "nonroot" ] ||
  fail "expected user 65532/nonroot, got '$USER_ID'"
pass "runs as user '$USER_ID'"

ENTRYPOINT_JSON="$(docker inspect "$IMAGE" --format '{{json .Config.Entrypoint}}')"
echo "$ENTRYPOINT_JSON" | grep -q '/nodejs/bin/node' ||
  fail "expected distroless node entrypoint, got $ENTRYPOINT_JSON"
pass "entrypoint is the distroless node binary"

CMD_JSON="$(docker inspect "$IMAGE" --format '{{json .Config.Cmd}}')"
[ "$CMD_JSON" = '["dist/main.js"]' ] || fail "expected CMD [\"dist/main.js\"], got $CMD_JSON"
pass "CMD is [\"dist/main.js\"]"

# --- US1-AS1: no shell / package manager / /wait ---------------------------
for bin in /bin/sh /bin/bash apk apt pnpm /wait; do
  if docker run --rm --entrypoint "$bin" "$IMAGE" >/tmp/shell-probe.$$ 2>&1; then
    fail "expected '$bin' to be absent/unexecutable, but it ran"
  fi
  rm -f /tmp/shell-probe.$$
done
pass "no shell / package manager / /wait binary is executable"

# --- US1-AS2: no src/, no ts-node, node_modules is prod-only ---------------
HAS_SRC="$(run_node -e "console.log(require('fs').existsSync('/usr/src/app/src'))")"
[ "$HAS_SRC" = "false" ] || fail "expected no src/ tree in the runtime image"
pass "no src/ TypeScript tree"

HAS_TS_NODE="$(run_node -e "console.log(require('fs').existsSync('/usr/src/app/node_modules/ts-node'))")"
[ "$HAS_TS_NODE" = "false" ] || fail "expected no ts-node in node_modules"
pass "no ts-node in node_modules"

HAS_PNPM="$(run_node -e "console.log(require('fs').existsSync('/usr/src/app/node_modules/pnpm') || require('fs').existsSync('/usr/src/app/node_modules/.bin/pnpm'))")"
[ "$HAS_PNPM" = "false" ] || fail "expected no pnpm in node_modules"
pass "no pnpm in node_modules"

# --- US1-AS2: sharp is the native glibc sentinel ---------------------------
SHARP_OUT="$(run_node -e "require('/usr/src/app/node_modules/sharp'); console.log('sharp-ok')")"
[ "$SHARP_OUT" = "sharp-ok" ] || fail "expected sharp to load, got: $SHARP_OUT"
pass "sharp loads (glibc-matched native binary)"

# --- SC-001: size reduction vs baseline ------------------------------------
IMAGE_DIGEST="$(docker inspect "$IMAGE" --format '{{.Id}}')"
IMAGE_SIZE_BYTES="$(docker save "$IMAGE" | wc -c)"
echo "IMAGE_DIGEST=$IMAGE_DIGEST"
echo "IMAGE_SIZE_BYTES=$IMAGE_SIZE_BYTES"
echo "BASELINE_IMAGE_SIZE_BYTES=$BASELINE_IMAGE_SIZE_BYTES"

REDUCTION_PCT="$(awk -v new="$IMAGE_SIZE_BYTES" -v old="$BASELINE_IMAGE_SIZE_BYTES" \
  'BEGIN { printf "%.2f", (1 - (new / old)) * 100 }')"
echo "SIZE_REDUCTION_PCT=$REDUCTION_PCT"

awk -v r="$REDUCTION_PCT" -v min="$MIN_REDUCTION_PCT" 'BEGIN { exit !(r >= min) }' ||
  fail "size reduction ${REDUCTION_PCT}% is below the required ${MIN_REDUCTION_PCT}% (SC-001)"
pass "size reduction ${REDUCTION_PCT}% >= ${MIN_REDUCTION_PCT}% (SC-001)"

echo "== distroless-image-smoke: ALL CHECKS PASSED =="
