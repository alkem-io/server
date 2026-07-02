#!/usr/bin/env bash
#
# Local KEDA-style autoscaler for the auth-reset worker.
#
# Polls the RabbitMQ management API for the depth of the `alkemio-auth-reset`
# queue and drives `docker compose --scale` up/down:
#   depth > 0            -> scale up to MAX_REPLICAS
#   depth == 0 for N     -> scale down to 0 (after IDLE_ROUNDS empty polls)
#     consecutive polls
#
# This is the local analogue of the prod KEDA ScaledObject (queue length
# trigger, scale-to-zero). Compose has no autoscaler of its own, so we poll.
#
# Usage:
#   scripts/auth-reset-autoscale.sh            # defaults below
#   MAX_REPLICAS=5 INTERVAL=3 scripts/auth-reset-autoscale.sh
#
# Ctrl-C to stop. On exit the worker is left at whatever the last scale was;
# pass STOP_AT_ZERO=1 to force it to 0 on exit.
set -euo pipefail

# --- config (override via env) -------------------------------------------------
COMPOSE_FILE="${COMPOSE_FILE:-quickstart-services.yml}"
ENV_FILE="${ENV_FILE:-.env.docker}"
# Per-developer overrides layered on top of ENV_FILE (later --env-file wins),
# mirroring `start:services`. Loaded only when present, so teammates without one
# are unaffected. Both files live in the repo mounted at /workspace.
ENV_FILE_LOCAL="${ENV_FILE_LOCAL:-.env.docker.local}"
SERVICE="${SERVICE:-auth-reset-worker}"
QUEUE="${QUEUE:-${RABBITMQ_AUTH_RESET_QUEUE:-alkemio-auth-reset}}"
VHOST="${VHOST:-/}"                       # default vhost; url-encoded below
MAX_REPLICAS="${MAX_REPLICAS:-2}"         # the "N" we scale up to
INTERVAL="${INTERVAL:-5}"                 # seconds between polls
IDLE_ROUNDS="${IDLE_ROUNDS:-3}"           # empty polls before scaling to 0

# RabbitMQ management API. Creds + host come from .env.docker's RABBITMQ_*
# (RMQ_* override them if explicitly set, e.g. when running on the host).
# The mgmt API is a separate port from AMQP (RABBITMQ_PORT=5672), so it is not
# in .env.docker — default to the conventional 15672.
RMQ_HOST="${RMQ_HOST:-${RABBITMQ_HOST:-localhost}}"
RMQ_MGMT_PORT="${RMQ_MGMT_PORT:-15672}"
RMQ_MGMT="${RMQ_MGMT:-http://$RMQ_HOST:$RMQ_MGMT_PORT}"
RMQ_USER="${RMQ_USER:-${RABBITMQ_USER:-alkemio-admin}}"
RMQ_PASS="${RMQ_PASS:-${RABBITMQ_PASSWORD:-alkemio!}}"

# --- deps ----------------------------------------------------------------------
command -v curl >/dev/null || { echo "need curl" >&2; exit 1; }
command -v jq   >/dev/null || { echo "need jq" >&2; exit 1; }

# url-encode the vhost ("/" -> "%2F")
vhost_enc=$(printf '%s' "$VHOST" | jq -sRr @uri)

compose() {
  local env_args=(--env-file "$ENV_FILE")
  [[ -f "$ENV_FILE_LOCAL" ]] && env_args+=(--env-file "$ENV_FILE_LOCAL")
  docker compose -f "$COMPOSE_FILE" "${env_args[@]}" "$@"
}

current_replicas() { compose ps -q "$SERVICE" 2>/dev/null | grep -c . || true; }

# Echoes "ready unacked". Distinguishes three mgmt-API outcomes:
#   200 -> real depth
#   404 -> queue not declared yet (no publisher has emitted / no consumer bound)
#          => treat as empty "0 0"; this is the normal at-rest state, NOT an error
#   anything else / no connection -> "-1 -1" (genuinely unreachable: DNS, 401, 5xx)
queue_depth() {
  local resp code body
  # -w appends the status on its own line; no -f so we can inspect 404 vs 200.
  resp=$(curl -s -u "$RMQ_USER:$RMQ_PASS" -w $'\n%{http_code}' \
        "$RMQ_MGMT/api/queues/$vhost_enc/$QUEUE" 2>/dev/null) || { echo "-1 -1"; return; }
  code="${resp##*$'\n'}"
  body="${resp%$'\n'*}"
  case "$code" in
    200) echo "$body" | jq -r '"\(.messages_ready // 0) \(.messages_unacknowledged // 0)"' ;;
    404) echo "0 0" ;;
    *)   echo "-1 -1" ;;
  esac
}

scale_to() {
  local n="$1"
  echo "  -> scaling $SERVICE to $n"
  compose up -d --no-recreate --scale "$SERVICE=$n" >/dev/null 2>&1 || \
    compose up -d --scale "$SERVICE=$n" "$SERVICE" >/dev/null
}

cleanup() {
  if [[ "${STOP_AT_ZERO:-0}" == "1" ]]; then
    echo; echo "exit: scaling $SERVICE to 0"
    scale_to 0 || true
  fi
  exit 0
}
trap cleanup INT TERM

echo "autoscaler: queue=$QUEUE max=$MAX_REPLICAS interval=${INTERVAL}s idle=$IDLE_ROUNDS"
idle=0
while true; do
  read -r ready unacked < <(queue_depth)
  reps=$(current_replicas)

  if [[ "$ready" == "-1" ]]; then
    echo "$(date +%T) RabbitMQ unreachable — holding at $reps replica(s)"
  else
    total=$((ready + unacked))
    echo "$(date +%T) ready=$ready unacked=$unacked replicas=$reps"

    if (( ready > 0 )); then
      # work waiting: ensure we're at MAX. (unacked-only = a worker is busy;
      # don't add more, prefetch=1 means 1 msg per replica anyway.)
      idle=0
      (( reps < MAX_REPLICAS )) && scale_to "$MAX_REPLICAS"
    elif (( total == 0 )); then
      # fully drained (nothing ready, nothing in-flight): count down to 0
      if (( reps > 0 )); then
        idle=$((idle + 1))
        (( idle >= IDLE_ROUNDS )) && { scale_to 0; idle=0; }
      fi
    else
      # ready==0 but unacked>0: a worker is finishing a reset. leave it be.
      idle=0
    fi
  fi

  sleep "$INTERVAL"
done
