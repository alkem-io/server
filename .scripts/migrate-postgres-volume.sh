#!/usr/bin/env bash
# One-time move of the local Postgres cluster into the named volume.
#
# quickstart used to mount `alkemio_dev_postgres` at /var/lib/postgresql, but the postgres
# image keeps PGDATA in /var/lib/postgresql/data and declares that path as its own VOLUME.
# So the cluster lived in an ANONYMOUS volume and the named one only held an empty `data/`
# mount point. quickstart now mounts the named volume at PGDATA; this script copies the
# existing cluster across so nobody starts on an empty database.
#
# Runs before every `pnpm run start:services*`; a no-op once migrated or on a fresh machine.
#   --from <volume>    migrate from a specific (e.g. dangling) volume instead of the container's
#   --fresh            no data worth keeping: start postgres on an empty cluster
#   --env-file <file>  the env files the following `docker compose` gets (repeatable), so both resolve
#                      the same project and volume. Default: .env.docker [+ .env.docker.local]
# The old anonymous volume is never deleted; the script prints its name for you to remove.
set -Eeuo pipefail

cd "$(dirname "$0")/.."
CONTAINER=${POSTGRES_CONTAINER:-alkemio_dev_postgres}
PGDATA_PATH=/var/lib/postgresql/data
HELPER_IMAGE=alpine:3.20
# Written into the target before the copy and removed after it: a target holding it is a partial copy
MARKER=.pg-volume-copy-incomplete
FROM="" FRESH=false env_files=()
while [ $# -gt 0 ]; do
  case $1 in
    --from) FROM=${2:?--from needs a volume name}; shift 2 ;;
    --fresh) FRESH=true; shift ;;
    --env-file) env_files+=(--env-file "${2:?--env-file needs a path}"); shift 2 ;;
    *) echo "usage: $0 [--from <volume>] [--fresh] [--env-file <file>]..." >&2; exit 2 ;;
  esac
done

say() { echo "[pg-volume] $*"; }
die() { echo "[pg-volume] ERROR: $*" >&2; exit 1; }
# Run a shell snippet in a throwaway container with the given -v mounts
in_vol() { local script=$1; shift; docker run --rm "$@" "$HELPER_IMAGE" sh -c "$script"; }

# The volume compose will mount: same compose file and env files as the command that follows
if [ ${#env_files[@]} -eq 0 ]; then
  env_files=(--env-file .env.docker)
  [ -f .env.docker.local ] && env_files+=(--env-file .env.docker.local)
fi
project=$(docker compose -f quickstart-services.yml "${env_files[@]}" config 2>/dev/null | sed -n 's/^name: //p' | head -1)
[ -n "$project" ] || die "cannot determine the compose project name"
NAMED="${project}_alkemio_dev_postgres"
# container_name is fixed but volumes are per project: a container from another checkout is not ours
# to stop or to copy from
own_container=false
if [ "$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$CONTAINER" 2>/dev/null)" = "$project" ]; then
  own_container=true
fi

# Named volume state: "cluster" (already holds a database), "partial" (an interrupted copy),
# "stub" (only the old empty data/ mount point), "empty"
named_state() {
  docker volume inspect "$NAMED" >/dev/null 2>&1 || { echo empty; return; }
  in_vol 'if [ -f /v/'"$MARKER"' ]; then echo partial;
          elif [ -f /v/PG_VERSION ]; then echo cluster;
          elif [ -z "$(ls -A /v)" ]; then echo empty;
          elif [ "$(ls -A /v)" = data ] && [ -z "$(ls -A /v/data)" ]; then echo stub;
          else echo other; fi' -v "$NAMED":/v:ro
}

state=$(named_state)
[ "$state" = cluster ] && { say "already migrated ($NAMED holds the cluster)"; exit 0; }
[ "$state" = other ] && die "$NAMED holds unexpected files and no PG_VERSION; inspect it before starting postgres"

# Postgres must be stopped cleanly for a consistent file copy. A plain `docker stop` reaches postgres as
# SIGTERM ("smart" shutdown), which waits for every client: on a running stack that hangs until the kill.
# Fast shutdown disconnects clients and checkpoints in seconds. Restart policy is paused so docker
# does not bring it back mid-copy; compose recreates the container (and its policy) right after.
# If the migration fails before compose runs, the trap puts the policy back and restarts it.
restart_policy=""
stop_postgres() {
  $own_container && [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER")" = true ] || return 0
  say "stopping $CONTAINER (fast shutdown, clients are disconnected)"
  restart_policy=$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$CONTAINER")
  trap restore_postgres ERR INT TERM
  docker update --restart=no "$CONTAINER" >/dev/null
  # The exec session dies with the container on success, so judge by the container state, not pg_ctl's exit code
  docker exec -u postgres "$CONTAINER" sh -c 'pg_ctl stop -D "$PGDATA" -m fast -w -t 60' >/dev/null 2>&1 || true
  sleep 1
  [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER")" = true ] && say "fast shutdown did not finish, falling back to docker stop"
  docker stop -t 60 "$CONTAINER" >/dev/null
}
restore_postgres() {
  local rc=$?
  trap - ERR INT TERM
  say "migration failed; restarting $CONTAINER on its old volume (nothing was changed there)"
  docker update --restart="${restart_policy:-no}" "$CONTAINER" >/dev/null 2>&1 || true
  docker start "$CONTAINER" >/dev/null 2>&1 || true
  exit $(( rc ? rc : 1 ))
}

if $FRESH; then
  [ "$state" = empty ] && { say "fresh setup, nothing to migrate"; exit 0; }
  stop_postgres
  in_vol 'find /v -mindepth 1 -delete' -v "$NAMED":/v
  trap - ERR INT TERM
  say "cleared $NAMED; postgres will initialise a fresh cluster"; exit 0
fi

# Source: explicit --from, else whatever the existing container has mounted at PGDATA
src=$FROM
if [ -z "$src" ] && $own_container; then
  src=$(docker inspect -f "{{range .Mounts}}{{if eq .Destination \"$PGDATA_PATH\"}}{{.Name}}{{end}}{{end}}" "$CONTAINER")
fi

if [ -z "$src" ] || [ "$src" = "$NAMED" ]; then
  [ "$state" = empty ] && { say "fresh setup, nothing to migrate"; exit 0; }
  # stub or interrupted copy without a source container: old data, if any, is in a dangling volume
  echo "[pg-volume] $NAMED is in the old layout or holds an interrupted copy, but no container points at the old data." >&2
  echo "[pg-volume] Dangling volumes that contain a Postgres cluster (newest first):" >&2
  for v in $(docker volume ls -q --filter dangling=true); do
    info=$(in_vol '[ -f /d/PG_VERSION ] && [ ! -f /d/'"$MARKER"' ] && echo "pg$(cat /d/PG_VERSION) $(du -sh /d | cut -f1)"' -v "$v":/d:ro 2>/dev/null || true)
    if [ -n "$info" ]; then echo "$(docker volume inspect -f '{{.CreatedAt}}' "$v") $v $info"; fi
  done | sort -r | sed 's/^/    /' >&2
  die "pick one: $0 --from <volume>   or, to start empty: $0 --fresh"
fi

in_vol 'test -f /s/PG_VERSION' -v "$src":/s:ro || die "$src has no PG_VERSION: not a Postgres data directory"
in_vol 'test ! -f /s/'"$MARKER" -v "$src":/s:ro || die "$src holds an interrupted copy itself, not a usable cluster"
# Copying files under a live server gives an inconsistent cluster: only our own $CONTAINER is stopped below
for c in $(docker ps -q --filter volume="$src"); do
  name=$(docker inspect -f '{{.Name}}' "$c"); name=${name#/}
  [ "$name" = "$CONTAINER" ] && $own_container || die "$src is in use by the running container $name; stop it first"
done
src_ver=$(in_vol 'cat /s/PG_VERSION' -v "$src":/s:ro)
say "moving the Postgres $src_ver cluster from volume $src into $NAMED"

stop_postgres
docker volume create "$NAMED" >/dev/null
in_vol 'set -e
  # an interrupted earlier copy: its source is never modified, so the partial target is safe to redo
  # (the marker stays until the copy completes, so an interruption here is still recognised)
  if [ -f /n/'"$MARKER"' ]; then
    echo "[pg-volume] clearing an interrupted copy"
    find /n -mindepth 1 -maxdepth 1 ! -name '"$MARKER"' -exec rm -rf -- {} +
  fi
  [ -d /n/data ] && rmdir /n/data
  [ -z "$(ls -A /n | grep -vxF '"$MARKER"')" ] || { echo "target not empty, refusing" >&2; exit 1; }
  touch /n/'"$MARKER"'
  cp -a /s/. /n/
  [ "$(cat /n/PG_VERSION)" = "$(cat /s/PG_VERSION)" ]
  sync
  rm /n/'"$MARKER"'
  echo "[pg-volume] copied $(du -sh /n | cut -f1)"' -v "$src":/s:ro -v "$NAMED":/n
trap - ERR INT TERM

say "done. The old volume is kept as a backup; once postgres starts fine on the new one, remove it with:"
say "  docker volume rm $src"
