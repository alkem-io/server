#!/usr/bin/env bash
# Checks the local Matrix group-call stack against a running compose stack:
#   - LiveKit and lk-jwt-service are healthy, Synapse runs with its config;
#   - lk-jwt-service is restricted to the local server_name and trusts the
#     Synapse TLS front, which answers for that server_name on :8448;
#   - a real Synapse OpenID token is exchanged for a LiveKit join token and a
#     tampered one is refused;
#   - chat images upload and download, also when Synapse's own copy of the
#     bytes is gone and the file-service media plugin has to fetch them;
#   - Synapse accepts delayed events, caps the delay and rate-limits their
#     management endpoint.
#
# Local development only. Prints one line per check and exits non-zero on the
# first failure. Every check creates its own throwaway user, room and media;
# nothing existing is modified.
#
# Usage: .scripts/calls-stack-check.sh [options]
#   --synapse-url URL       Synapse client API (default http://localhost:8008)
#   --livekit-url URL       LiveKit HTTP endpoint
#                           (default http://localhost:${LIVEKIT_HTTP_PORT:-7880})
#   --lk-jwt-url URL        lk-jwt-service (default http://localhost:${LK_JWT_PORT:-8880})
#   --media-store DIR       Synapse media store on the host
#                           (default .build/synapse/media_store)
#   --as-registration FILE  application-service registration used to create the
#                           throwaway chat user (default .build/synapse/matrix-adapter.yaml)
#   --compose-project NAME  compose project of the stack; enables the container
#                           checks and the TLS-front stop/start check. Without it
#                           the container checks use the developer stack as
#                           started by `pnpm start:services`, and the stop/start
#                           check is skipped.
#   --media-only            only the chat media checks (e.g. after re-creating
#                           Synapse on another release)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SYNAPSE_URL="http://localhost:8008"
LIVEKIT_URL="http://localhost:${LIVEKIT_HTTP_PORT:-7880}"
LK_JWT_URL="http://localhost:${LK_JWT_PORT:-8880}"
MEDIA_STORE="$REPO_DIR/.build/synapse/media_store"
AS_REGISTRATION="$REPO_DIR/.build/synapse/matrix-adapter.yaml"
COMPOSE_PROJECT=""
MEDIA_ONLY=false

usage() {
  sed -n '/^# Usage:/,/^set -euo pipefail/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'
}

need_value() {
  [ $# -ge 2 ] && [ -n "$2" ] || { echo "missing value for $1" >&2; exit 2; }
}

while [ $# -gt 0 ]; do
  case "$1" in
    --synapse-url) need_value "$@"; SYNAPSE_URL="$2"; shift 2 ;;
    --livekit-url) need_value "$@"; LIVEKIT_URL="$2"; shift 2 ;;
    --lk-jwt-url) need_value "$@"; LK_JWT_URL="$2"; shift 2 ;;
    --media-store) need_value "$@"; MEDIA_STORE="$2"; shift 2 ;;
    --as-registration) need_value "$@"; AS_REGISTRATION="$2"; shift 2 ;;
    --compose-project) need_value "$@"; COMPOSE_PROJECT="$2"; shift 2 ;;
    --media-only) MEDIA_ONLY=true; shift ;;
    -h | --help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

SYNAPSE_URL="${SYNAPSE_URL%/}"
LIVEKIT_URL="${LIVEKIT_URL%/}"
LK_JWT_URL="${LK_JWT_URL%/}"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
chmod 700 "$WORK_DIR"
BODY="$WORK_DIR/body"

# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------
pass() { printf 'ok   %s\n' "$1"; }
skip() { printf 'skip %s (%s)\n' "$1" "$2"; }
fail() {
  printf 'FAIL %s\n' "$1"
  if [ -n "${2:-}" ]; then printf '     %s\n' "$2"; fi
  exit 1
}

# check <name> <command...>: runs the command, prints one result line and
# stops the script on the first failure. A command may set FAIL_DETAIL to
# explain what it saw.
FAIL_DETAIL=""
check() {
  local name="$1"
  shift
  FAIL_DETAIL=""
  if "$@"; then
    pass "$name"
  else
    fail "$name" "$FAIL_DETAIL"
  fi
}

# req <method> <url> [curl args...]: response body goes to $BODY, the HTTP
# status is printed ("000" when the endpoint is unreachable).
req() {
  local method="$1" url="$2"
  shift 2
  curl -s -o "$BODY" -w '%{http_code}' -X "$method" "$url" "$@" || true
}

# A header file keeps bearer tokens out of the process list and the output.
write_auth_header() {
  local file="$1" token="$2"
  (umask 077 && printf 'Authorization: Bearer %s\n' "$token" >"$file")
}

uri_encode() { jq -rn --arg v "$1" '$v|@uri'; }

# wait_until <seconds> <command...>: retries the command every 2 s.
wait_until() {
  local deadline=$((SECONDS + $1))
  shift
  until "$@"; do
    [ "$SECONDS" -lt "$deadline" ] || return 1
    sleep 2
  done
}

# ---------------------------------------------------------------------------
# Compose access
# ---------------------------------------------------------------------------
if [ -n "$COMPOSE_PROJECT" ]; then
  COMPOSE_ARGS=(-p "$COMPOSE_PROJECT")
else
  # Same file/env-file set as `pnpm start:services`, so compose resolves the
  # developer stack's project name.
  COMPOSE_ARGS=(-f "$REPO_DIR/quickstart-services.yml" --env-file "$REPO_DIR/.env.docker")
  if [ -f "$REPO_DIR/.env.docker.local" ]; then
    COMPOSE_ARGS+=(--env-file "$REPO_DIR/.env.docker.local")
  fi
fi
dc() { docker compose "${COMPOSE_ARGS[@]}" "$@"; }
container_of() { dc ps -q "$1" 2>/dev/null | head -n 1; }

COMPOSE_REACHABLE=false
if [ -n "$(container_of synapse)" ]; then
  COMPOSE_REACHABLE=true
fi

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
check_tools() {
  local tool missing=""
  for tool in curl jq python3 uuidgen docker; do
    command -v "$tool" >/dev/null 2>&1 || missing="$missing $tool"
  done
  [ -z "$missing" ] || { FAIL_DETAIL="missing:$missing"; return 1; }
}

AS_TOKEN=""
read_as_token() {
  [ -r "$AS_REGISTRATION" ] || { FAIL_DETAIL="cannot read $AS_REGISTRATION"; return 1; }
  AS_TOKEN="$(awk -F': *' '$1 == "as_token" { gsub(/["'\''[:space:]]/, "", $2); print $2; exit }' "$AS_REGISTRATION")"
  [ -n "$AS_TOKEN" ] || { FAIL_DETAIL="no as_token in $AS_REGISTRATION"; return 1; }
  write_auth_header "$WORK_DIR/as.header" "$AS_TOKEN"
}

synapse_health() {
  local code
  code="$(req GET "$SYNAPSE_URL/health")"
  [ "$code" = 200 ] && [ "$(cat "$BODY")" = OK ] || { FAIL_DETAIL="GET /health -> $code"; return 1; }
}

# ---------------------------------------------------------------------------
# Throwaway chat user and room
# ---------------------------------------------------------------------------
USER_ID=""
DEVICE_ID=""
ACCESS_TOKEN=""
ROOM_ID=""

register_user() {
  local localpart code
  localpart="$(uuidgen | command tr 'A-Z' 'a-z')"
  code="$(req POST "$SYNAPSE_URL/_matrix/client/v3/register" \
    -H @"$WORK_DIR/as.header" -H 'Content-Type: application/json' \
    --data "{\"type\":\"m.login.application_service\",\"username\":\"$localpart\"}")"
  [ "$code" = 200 ] || { FAIL_DETAIL="register -> $code $(jq -c '{errcode,error}' "$BODY" 2>/dev/null)"; return 1; }
  USER_ID="$(jq -r '.user_id // empty' "$BODY")"
  DEVICE_ID="$(jq -r '.device_id // empty' "$BODY")"
  ACCESS_TOKEN="$(jq -r '.access_token // empty' "$BODY")"
  [ -n "$USER_ID" ] && [ -n "$DEVICE_ID" ] && [ -n "$ACCESS_TOKEN" ] ||
    { FAIL_DETAIL="register response lacks user_id/device_id/access_token"; return 1; }
  write_auth_header "$WORK_DIR/user.header" "$ACCESS_TOKEN"
}

# The room-control module only lets UUID users create a room after the
# matrix-adapter approves it, while the application-service sender is always
# allowed. So the sender creates the room and invites the check user, who
# then joins it.
create_room() {
  local code payload
  payload="$(jq -cn --arg user "$USER_ID" \
    '{preset: "private_chat", name: "calls stack check", invite: [$user]}')"
  code="$(req POST "$SYNAPSE_URL/_matrix/client/v3/createRoom" \
    -H @"$WORK_DIR/as.header" -H 'Content-Type: application/json' --data "$payload")"
  [ "$code" = 200 ] || { FAIL_DETAIL="createRoom -> $code $(jq -c '{errcode,error}' "$BODY" 2>/dev/null)"; return 1; }
  ROOM_ID="$(jq -r '.room_id // empty' "$BODY")"
  [ -n "$ROOM_ID" ] || { FAIL_DETAIL="createRoom returned no room_id"; return 1; }
  code="$(req POST "$SYNAPSE_URL/_matrix/client/v3/rooms/$(uri_encode "$ROOM_ID")/join" \
    -H @"$WORK_DIR/user.header" -H 'Content-Type: application/json' --data '{}')"
  [ "$code" = 200 ] || { FAIL_DETAIL="join -> $code $(jq -c '{errcode,error}' "$BODY" 2>/dev/null)"; return 1; }
}

# ---------------------------------------------------------------------------
# Media server, token service and TLS front
# ---------------------------------------------------------------------------
livekit_ok() {
  local code
  code="$(req GET "$LIVEKIT_URL/")"
  [ "$code" = 200 ] && [ "$(cat "$BODY")" = OK ] || { FAIL_DETAIL="GET $LIVEKIT_URL/ -> $code"; return 1; }
}

lk_jwt_ok() {
  local code
  code="$(req GET "$LK_JWT_URL/healthz")"
  [ "$code" = 200 ] || { FAIL_DETAIL="GET $LK_JWT_URL/healthz -> $code"; return 1; }
}

service_health() {
  # compose prints either one JSON object per line or a single array.
  dc ps --format json "$1" 2>/dev/null | jq -rs 'flatten | .[0].Health // empty'
}

is_healthy() { [ "$(service_health "$1")" = healthy ]; }

compose_healthy() {
  local service="$1"
  if ! wait_until 60 is_healthy "$service"; then
    FAIL_DETAIL="$service health: $(service_health "$service")"
    return 1
  fi
}

# Synapse exits on a configuration error and compose restarts it, so
# "running, never restarted" is the signal that it accepted its config.
synapse_running_without_restart() {
  local id state
  id="$(container_of synapse)"
  [ -n "$id" ] || { FAIL_DETAIL="no synapse container"; return 1; }
  state="$(docker inspect -f '{{.State.Running}} {{.RestartCount}}' "$id")"
  [ "$state" = "true 0" ] || { FAIL_DETAIL="synapse running/restarts: $state"; return 1; }
}

lk_jwt_trust_settings() {
  local id env
  id="$(container_of lk-jwt-service)"
  [ -n "$id" ] || { FAIL_DETAIL="no lk-jwt-service container"; return 1; }
  # The env also carries the LiveKit secret: only grep it, never print it.
  env="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$id")"
  grep -qx 'LIVEKIT_FULL_ACCESS_HOMESERVERS=alkemio.matrix.host' <<<"$env" &&
    grep -qx 'LIVEKIT_INSECURE_SKIP_VERIFY_TLS=YES_I_KNOW_WHAT_I_AM_DOING' <<<"$env" ||
    { FAIL_DETAIL="lk-jwt-service trust settings missing or different"; return 1; }
}

tls_front_answers() {
  dc exec -T synapse-tls-proxy wget --no-check-certificate -qO- \
    https://alkemio.matrix.host:8448/_matrix/client/versions 2>/dev/null |
    jq -e '.versions | length > 0' >/dev/null ||
    { FAIL_DETAIL="https://alkemio.matrix.host:8448 did not return Synapse versions"; return 1; }
}

# ---------------------------------------------------------------------------
# OpenID token -> LiveKit join token
# ---------------------------------------------------------------------------
OPENID_TOKEN=""
request_openid_token() {
  local code
  code="$(req POST "$SYNAPSE_URL/_matrix/client/v3/user/$(uri_encode "$USER_ID")/openid/request_token" \
    -H @"$WORK_DIR/user.header" -H 'Content-Type: application/json' --data '{}')"
  [ "$code" = 200 ] || { FAIL_DETAIL="openid/request_token -> $code"; return 1; }
  OPENID_TOKEN="$(jq -c . "$BODY")"
  jq -e '.access_token and .matrix_server_name' "$BODY" >/dev/null ||
    { FAIL_DETAIL="openid response lacks access_token/matrix_server_name"; return 1; }
}

# sfu_get <openid token json>: prints the HTTP status of the exchange.
sfu_get() {
  local payload
  payload="$(jq -cn --arg room "$ROOM_ID" --arg device "$DEVICE_ID" --argjson token "$1" \
    '{room: $room, openid_token: $token, device_id: $device}')"
  req POST "$LK_JWT_URL/sfu/get" -H 'Content-Type: application/json' --data "$payload"
}

expected_livekit_ws() {
  local hostport="${LIVEKIT_URL#*://}"
  hostport="${hostport%%/*}"
  printf 'ws://localhost:%s' "${hostport##*:}"
}

token_exchange_succeeds() {
  local code
  code="$(sfu_get "$OPENID_TOKEN")"
  [ "$code" = 200 ] || { FAIL_DETAIL="/sfu/get -> $code $(jq -c . "$BODY" 2>/dev/null)"; return 1; }
  [ "$(jq -r '.url // empty' "$BODY")" = "$(expected_livekit_ws)" ] ||
    { FAIL_DETAIL="url $(jq -r '.url' "$BODY"), expected $(expected_livekit_ws)"; return 1; }
  jq -e '(.jwt // "") | split(".") | length == 3' "$BODY" >/dev/null ||
    { FAIL_DETAIL="no LiveKit JWT in the response"; return 1; }
}

tampered_token_refused() {
  local code tampered
  tampered="$(jq -c '.access_token += "x"' <<<"$OPENID_TOKEN")"
  code="$(sfu_get "$tampered")"
  [ "$code" = 401 ] && [ "$(jq -r '.errcode // empty' "$BODY")" = M_UNAUTHORIZED ] ||
    { FAIL_DETAIL="/sfu/get with a tampered token -> $code $(jq -c . "$BODY" 2>/dev/null)"; return 1; }
}

exchange_is() { [ "$(sfu_get "$OPENID_TOKEN")" = "$1" ]; }

token_exchange_follows_tls_front() {
  dc stop synapse-tls-proxy >/dev/null 2>&1 || { FAIL_DETAIL="could not stop synapse-tls-proxy"; return 1; }
  local down_code
  down_code="$(sfu_get "$OPENID_TOKEN")"
  dc start synapse-tls-proxy >/dev/null 2>&1 || { FAIL_DETAIL="could not start synapse-tls-proxy again"; return 1; }
  [ "$down_code" = 401 ] || { FAIL_DETAIL="exchange with the TLS front stopped -> $down_code, expected 401"; return 1; }
  wait_until 30 exchange_is 200 ||
    { FAIL_DETAIL="exchange did not recover within 30 s of restarting the TLS front"; return 1; }
}

# ---------------------------------------------------------------------------
# Chat media through the file-service plugin
# ---------------------------------------------------------------------------
MEDIA_SERVER=""
MEDIA_ID=""

upload_and_download() {
  local code content_uri
  python3 - "$WORK_DIR/check.png" <<'PY'
import struct, sys, zlib
def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
png = (b"\x89PNG\r\n\x1a\n"
       + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
       + chunk(b"IDAT", zlib.compress(b"\x00\xff\x80\x00"))
       + chunk(b"IEND", b""))
open(sys.argv[1], "wb").write(png)
PY
  code="$(req POST "$SYNAPSE_URL/_matrix/media/v3/upload?filename=check.png" \
    -H @"$WORK_DIR/user.header" -H 'Content-Type: image/png' --data-binary @"$WORK_DIR/check.png")"
  [ "$code" = 200 ] || { FAIL_DETAIL="upload -> $code $(jq -c . "$BODY" 2>/dev/null)"; return 1; }
  content_uri="$(jq -r '.content_uri // empty' "$BODY")"
  case "$content_uri" in
    mxc://*/*) ;;
    *) FAIL_DETAIL="upload returned content_uri '$content_uri'"; return 1 ;;
  esac
  content_uri="${content_uri#mxc://}"
  MEDIA_SERVER="${content_uri%%/*}"
  MEDIA_ID="${content_uri#*/}"
  download_matches
}

download_matches() {
  local code
  code="$(curl -s -o "$WORK_DIR/download.png" -w '%{http_code}' -H @"$WORK_DIR/user.header" \
    "$SYNAPSE_URL/_matrix/client/v1/media/download/$MEDIA_SERVER/$MEDIA_ID" || true)"
  [ "$code" = 200 ] || { FAIL_DETAIL="download -> $code"; return 1; }
  cmp -s "$WORK_DIR/check.png" "$WORK_DIR/download.png" ||
    { FAIL_DETAIL="downloaded bytes differ from the upload"; return 1; }
}

# Removes Synapse's local copy first, so the download can only succeed through
# the plugin's fetch from file-service.
download_after_local_copy_removed() {
  local local_file="$MEDIA_STORE/local_content/${MEDIA_ID:0:2}/${MEDIA_ID:2:2}/${MEDIA_ID:4}"
  [ -f "$local_file" ] || { FAIL_DETAIL="local copy not found at $local_file (wrong --media-store?)"; return 1; }
  rm -f "$local_file"
  [ ! -e "$local_file" ] || { FAIL_DETAIL="could not remove $local_file"; return 1; }
  download_matches
}

media_plugin_config_unchanged() {
  local range='/^media_storage_providers:/,/matrix_media_bucket_id/p' in_container in_repo
  in_container="$(dc exec -T synapse sed -n "$range" /data/homeserver.yaml 2>/dev/null)"
  in_repo="$(sed -n "$range" "$REPO_DIR/.build/synapse/homeserver.yaml")"
  [ -n "$in_container" ] && [ "$in_container" = "$in_repo" ] ||
    { FAIL_DETAIL="media_storage_providers in the container differs from .build/synapse/homeserver.yaml"; return 1; }
}

# ---------------------------------------------------------------------------
# Delayed events
# ---------------------------------------------------------------------------
send_delayed() {
  local txn="$1" delay_ms="$2"
  req PUT "$SYNAPSE_URL/_matrix/client/v3/rooms/$(uri_encode "$ROOM_ID")/send/m.room.message/$txn?org.matrix.msc4140.delay=$delay_ms" \
    -H @"$WORK_DIR/user.header" -H 'Content-Type: application/json' \
    --data "{\"msgtype\":\"m.text\",\"body\":\"delayed $txn\"}"
}

list_delayed_status() {
  req GET "$SYNAPSE_URL/_matrix/client/unstable/org.matrix.msc4140/delayed_events" -H @"$WORK_DIR/user.header"
}

delayed_event_delivered() {
  local txn code delay_id
  txn="check-$(uuidgen | command tr 'A-Z' 'a-z')"
  code="$(send_delayed "$txn" 10000)"
  [ "$code" = 200 ] || { FAIL_DETAIL="delayed send -> $code $(jq -c . "$BODY" 2>/dev/null)"; return 1; }
  delay_id="$(jq -r '.delay_id // empty' "$BODY")"
  [ -n "$delay_id" ] || { FAIL_DETAIL="delayed send returned no delay_id"; return 1; }
  code="$(list_delayed_status)"
  [ "$code" = 200 ] && jq -e --arg id "$delay_id" 'any(.delayed_events[]?; .delay_id == $id)' "$BODY" >/dev/null ||
    { FAIL_DETAIL="delay_id not listed under delayed_events ($code)"; return 1; }
  sleep 12
  code="$(req GET "$SYNAPSE_URL/_matrix/client/v3/rooms/$(uri_encode "$ROOM_ID")/messages?dir=b&limit=5" \
    -H @"$WORK_DIR/user.header")"
  [ "$code" = 200 ] && jq -e --arg body "delayed $txn" 'any(.chunk[]?; .content.body == $body)' "$BODY" >/dev/null ||
    { FAIL_DETAIL="delayed message not delivered to the room after 12 s ($code)"; return 1; }
}

delay_over_maximum_rejected() {
  local code
  code="$(send_delayed "check-$(uuidgen | command tr 'A-Z' 'a-z')" 90000000)"
  # Synapse reports this under the unstable errcode field while delayed
  # events are still an unstable feature, so either field is accepted.
  [ "$code" = 400 ] && jq -e '
      (.errcode == "M_MAX_DELAY_EXCEEDED" or ."org.matrix.msc4140.errcode" == "M_MAX_DELAY_EXCEEDED")
      and ((."org.matrix.msc4140.max_delay" // 86400000) == 86400000)' "$BODY" >/dev/null ||
    { FAIL_DETAIL="25 h delay -> $code $(jq -c . "$BODY" 2>/dev/null)"; return 1; }
}

delayed_management_rate_limited() {
  local i code limited=0
  for i in $(seq 1 15); do
    code="$(list_delayed_status)"
    [ "$code" = 200 ] || { FAIL_DETAIL="list call $i of the first 15 -> $code (burst too small?)"; return 1; }
  done
  for i in $(seq 1 25); do
    code="$(list_delayed_status)"
    [ "$code" = 429 ] && limited=$((limited + 1))
  done
  [ "$limited" -gt 0 ] || { FAIL_DETAIL="no 429 across 40 back-to-back list calls"; return 1; }
}

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
check "prerequisites: curl jq python3 uuidgen docker" check_tools
check "synapse: GET /health answers OK" synapse_health

if ! $MEDIA_ONLY; then
  check "livekit: GET / answers OK" livekit_ok
  check "lk-jwt-service: GET /healthz answers 200" lk_jwt_ok
  if $COMPOSE_REACHABLE; then
    check "livekit: compose health is healthy" compose_healthy livekit
    check "lk-jwt-service: compose health is healthy" compose_healthy lk-jwt-service
    check "synapse: running, never restarted (config accepted)" synapse_running_without_restart
    check "lk-jwt-service: full access only for alkemio.matrix.host, TLS front trusted" lk_jwt_trust_settings
    check "synapse-tls-proxy: https://alkemio.matrix.host:8448 reaches Synapse" tls_front_answers
  else
    skip "container checks" "no compose stack with a synapse service found"
  fi
fi

check "chat user: application-service token readable" read_as_token
check "chat user: registered through the application service" register_user

if ! $MEDIA_ONLY; then
  check "chat room: created" create_room
  check "openid: Synapse issues a token" request_openid_token
  check "lk-jwt-service: OpenID token exchanged for a LiveKit join token" token_exchange_succeeds
  check "lk-jwt-service: tampered OpenID token refused with 401" tampered_token_refused
  if [ -n "$COMPOSE_PROJECT" ] && $COMPOSE_REACHABLE; then
    check "lk-jwt-service: refuses while the TLS front is down, recovers after" token_exchange_follows_tls_front
  else
    skip "lk-jwt-service: TLS front stop/start" "needs --compose-project"
  fi
fi

check "media: upload and download return the same bytes" upload_and_download
check "media: served through file-service after the local copy is removed" download_after_local_copy_removed
if $COMPOSE_REACHABLE; then
  check "media: plugin configuration in the container matches the repo" media_plugin_config_unchanged
else
  skip "media: plugin configuration" "no compose stack with a synapse service found"
fi

if ! $MEDIA_ONLY; then
  check "delayed events: accepted, listed and delivered after 10 s" delayed_event_delivered
  check "delayed events: delay over 24 h rejected" delay_over_maximum_rejected
  check "delayed events: management endpoint rate-limited above its burst" delayed_management_rate_limited
fi

echo "all checks passed"
