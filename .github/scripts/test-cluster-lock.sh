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

acquire() {
  local holder="$1" max_wait="${2:-2700}"      # default: wait up to 45 min
  local deadline=$(( $(now) + max_wait ))
  while :; do
    # Atomic claim: `create` fails with AlreadyExists if another holder has it.
    if kubectl -n "$LOCK_NS" create configmap "$LOCK_NAME" \
         --from-literal=holder="$holder" \
         --from-literal=acquired="$(now)" >/dev/null 2>&1; then
      echo "lock acquired by '$holder'"
      return 0
    fi

    # Lock is held — inspect the current holder and its age.
    local cur_holder cur_acquired age
    cur_holder="$(kubectl -n "$LOCK_NS" get configmap "$LOCK_NAME" -o jsonpath='{.data.holder}' 2>/dev/null || echo '?')"
    cur_acquired="$(kubectl -n "$LOCK_NS" get configmap "$LOCK_NAME" -o jsonpath='{.data.acquired}' 2>/dev/null || echo 0)"
    age=$(( $(now) - ${cur_acquired:-0} ))

    if (( age > LOCK_TTL_SECONDS )); then
      echo "existing lock held by '$cur_holder' is stale (${age}s > ${LOCK_TTL_SECONDS}s) — reclaiming"
      kubectl -n "$LOCK_NS" delete configmap "$LOCK_NAME" --ignore-not-found >/dev/null 2>&1 || true
      continue
    fi

    if (( $(now) >= deadline )); then
      echo "ERROR: timed out after ${max_wait}s waiting for lock held by '$cur_holder' (age ${age}s)" >&2
      return 1
    fi

    echo "lock held by '$cur_holder' (age ${age}s); waiting ${POLL_SECONDS}s..."
    sleep "$POLL_SECONDS"
  done
}

release() {
  local holder="$1"
  local cur_holder
  cur_holder="$(kubectl -n "$LOCK_NS" get configmap "$LOCK_NAME" -o jsonpath='{.data.holder}' 2>/dev/null || echo '')"
  if [[ -z "$cur_holder" ]]; then
    echo "no lock present — nothing to release"
    return 0
  fi
  if [[ "$cur_holder" != "$holder" ]]; then
    # Never release someone else's lock (e.g. a reclaimed-and-retaken lock).
    echo "WARNING: lock held by '$cur_holder', not '$holder' — not releasing"
    return 0
  fi
  kubectl -n "$LOCK_NS" delete configmap "$LOCK_NAME" --ignore-not-found >/dev/null 2>&1 || true
  echo "lock released by '$holder'"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  acquire) acquire "$@" ;;
  release) release "$@" ;;
  *) echo "usage: $0 {acquire|release} <holder> [max_wait_seconds]" >&2; exit 2 ;;
esac
