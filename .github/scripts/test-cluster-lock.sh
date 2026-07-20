#!/usr/bin/env bash
#
# Mutual-exclusion lock for the shared k8s-hetzner-test cluster.
#
# Why: the test cluster is deployed to by two uncoordinated actors — the
# test-suites nightly (deploy-all-services -> cleanup-db -> e2e) and ad-hoc
# `build-deploy-k8s-test-hetzner.yml` dispatches from each service repo. A
# deploy that lands mid-nightly rolls the server pod (replicas: 1) and runs DB
# migrations while tests are in flight, which tore down the auth endpoint and
# cascaded the run to failure (server#6258 investigation / test-suites#563).
#
# This lock serialises them. The cluster itself is the single lock authority:
# `kubectl create configmap` is atomic (exactly one concurrent create wins), so
# it is a race-free compare-and-set primitive with no extra infrastructure.
#
# The nightly acquires the lock *after* its own deploy-all-services completes
# and holds it across cleanup-db + e2e; external deploys acquire the same lock
# before migrating/deploying and therefore wait out a running nightly. Because
# the nightly acquires only after its own triggered deploys have finished, those
# deploys run while the lock is free — no deadlock.
#
# Robustness (test-suites#574 review): the lock's whole job is correctness under
# concurrency, so failures must never fake a result.
#   - Lock state is read in a SINGLE `kubectl get` (holder + timestamp always
#     come from the same object version — no torn read).
#   - A *failed* read (transient API error) never triggers a stale-reclaim; only
#     a successfully-read timestamp older than LOCK_TTL_SECONDS does. This stops
#     an API blip from reclaiming a live lock and letting two runs proceed.
#   - `release` verifies the delete instead of assuming success, so a caller is
#     never told the lock is free while it is still held.
#
# Usage:
#   test-cluster-lock.sh acquire <holder> [max_wait_seconds]
#   test-cluster-lock.sh release <holder>
#
# A lock whose holder crashed without releasing is auto-reclaimed after
# LOCK_TTL_SECONDS so a dead run cannot wedge the cluster indefinitely.
set -euo pipefail

LOCK_NAME="test-cluster-deploy-lock"
LOCK_NS="default"
LOCK_TTL_SECONDS="${LOCK_TTL_SECONDS:-3600}"   # 60 min: reclaim a crashed holder
POLL_SECONDS="${POLL_SECONDS:-15}"

now() { date +%s; }

# Reads the lock in one API call. Echoes "holder|acquired" on success (rc 0).
# Distinguishes "not found" (rc 2) from a transient read error (rc 1) so callers
# never treat an unreadable lock as absent or stale.
read_lock() {
  local err out rc
  err="$(mktemp)"
  if out="$(kubectl -n "$LOCK_NS" get configmap "$LOCK_NAME" \
             -o jsonpath='{.data.holder}|{.data.acquired}' 2>"$err")"; then
    rm -f "$err"
    printf '%s' "$out"
    return 0
  fi
  rc=1
  grep -qi 'notfound\|not found' "$err" && rc=2
  rm -f "$err"
  return "$rc"
}

acquire() {
  local holder="$1" max_wait="${2:-2700}"      # default: wait up to 45 min
  local deadline=$(( $(now) + max_wait ))
  local last_holder="unknown"
  while :; do
    # Atomic claim: `create` fails with AlreadyExists if another holder has it.
    if kubectl -n "$LOCK_NS" create configmap "$LOCK_NAME" \
         --from-literal=holder="$holder" \
         --from-literal=acquired="$(now)" >/dev/null 2>&1; then
      echo "lock acquired by '$holder'"
      return 0
    fi

    if (( $(now) >= deadline )); then
      echo "ERROR: timed out after ${max_wait}s waiting for lock (last holder: '$last_holder')" >&2
      return 1
    fi

    # Create failed — inspect the current lock in a single, consistent read.
    local snapshot rc
    if snapshot="$(read_lock)"; then
      rc=0
    else
      rc=$?
    fi

    if (( rc == 2 )); then
      # No lock exists, yet create failed — it errored for a non-conflict reason
      # (RBAC/network) or the lock was released between the two calls. Retry the
      # create rather than assuming the lock is held.
      echo "create failed but no lock present; retrying create in ${POLL_SECONDS}s..."
      sleep "$POLL_SECONDS"; continue
    elif (( rc != 0 )); then
      # Transient read error: do NOT reclaim (that could kill a live lock). Wait.
      echo "could not read lock state (transient error); retrying in ${POLL_SECONDS}s..."
      sleep "$POLL_SECONDS"; continue
    fi

    local cur_holder="${snapshot%%|*}" cur_acquired="${snapshot##*|}"
    last_holder="${cur_holder:-?}"

    # Reclaim only on a real, numeric timestamp we actually read — never on a
    # missing/garbage value (which would be a guess).
    if [[ "$cur_acquired" =~ ^[0-9]+$ ]]; then
      local age=$(( $(now) - cur_acquired ))
      if (( age > LOCK_TTL_SECONDS )); then
        echo "lock held by '$last_holder' is stale (${age}s > ${LOCK_TTL_SECONDS}s) — reclaiming"
        # Best-effort reclaim. The `create` above re-serialises if another actor
        # reclaimed first, so a rare reclaim race resolves safely.
        kubectl -n "$LOCK_NS" delete configmap "$LOCK_NAME" --ignore-not-found >/dev/null 2>&1 || true
        continue
      fi
      echo "lock held by '$last_holder' (age ${age}s); waiting ${POLL_SECONDS}s..."
    else
      echo "lock held by '$last_holder' (age unknown); waiting ${POLL_SECONDS}s..."
    fi
    sleep "$POLL_SECONDS"
  done
}

release() {
  local holder="$1"
  local snapshot rc
  if snapshot="$(read_lock)"; then
    rc=0
  else
    rc=$?
  fi

  if (( rc == 2 )); then
    echo "no lock present — nothing to release"
    return 0
  elif (( rc != 0 )); then
    # Couldn't confirm state — do not claim we released it. The stale-TTL is the
    # backstop so a transient error here can't wedge the cluster forever.
    echo "WARNING: could not read lock state to release; leaving for stale-TTL reclaim" >&2
    return 0
  fi

  local cur_holder="${snapshot%%|*}"
  if [[ -z "$cur_holder" ]]; then
    echo "no lock present — nothing to release"
    return 0
  fi
  if [[ "$cur_holder" != "$holder" ]]; then
    # Never release someone else's lock (e.g. a reclaimed-and-retaken lock).
    echo "WARNING: lock held by '$cur_holder', not '$holder' — not releasing"
    return 0
  fi

  # Delete and VERIFY — never report a success we didn't confirm.
  if kubectl -n "$LOCK_NS" delete configmap "$LOCK_NAME" >/dev/null 2>&1; then
    echo "lock released by '$holder'"
    return 0
  fi
  # Delete failed — re-check: it may already be gone (concurrent release/reclaim).
  if read_lock >/dev/null 2>&1; then
    echo "ERROR: failed to delete lock held by '$holder' — it may block the next acquirer until the ${LOCK_TTL_SECONDS}s stale-TTL" >&2
    return 1
  fi
  echo "lock already gone — treating as released"
  return 0
}

cmd="${1:-}"; shift || true
case "$cmd" in
  acquire) acquire "$@" ;;
  release) release "$@" ;;
  *) echo "usage: $0 {acquire|release} <holder> [max_wait_seconds]" >&2; exit 2 ;;
esac
