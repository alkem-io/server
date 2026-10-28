#!/usr/bin/env bash
# One-time move of the local Postgres cluster into the named volume.
#
# quickstart used to mount `alkemio_dev_postgres` at /var/lib/postgresql, but the postgres
# image keeps PGDATA in /var/lib/postgresql/data and declares that path as its own VOLUME.
# So the cluster lived in an ANONYMOUS volume and the named one only held an empty `data/`
# mount point. quickstart now mounts the named volume at PGDATA; this script copies the
# existing cluster across so nobody starts on an empty database.
#
# Runs before every `pnpm run start:services`; a no-op once migrated or on a fresh machine.
#   --from <volume>  migrate from a specific (e.g. dangling) volume instead of the container's
#   --fresh          no data worth keeping: just clear the old empty mount point
# The old anonymous volume is never deleted; the script prints its name for you to remove.
set -euo pipefail

cd "$(dirname "$0")/.."
CONTAINER=${POSTGRES_CONTAINER:-alkemio_dev_postgres}
PGDATA_PATH=/var/lib/postgresql/data
HELPER_IMAGE=alpine:3.20
FROM="" FRESH=false
while [ $# -gt 0 ]; do
  case $1 in
    --from) FROM=${2:?--from needs a volume name}; shift 2 ;;
    --fresh) FRESH=true; shift ;;
    *) echo "usage: $0 [--from <volume>] [--fresh]" >&2; exit 2 ;;
  esac
done

say() { echo "[pg-volume] $*"; }
die() { echo "[pg-volume] ERROR: $*" >&2; exit 1; }
# Run a shell snippet in a throwaway container with the given -v mounts
in_vol() { local script=$1; shift; docker run --rm "$@" "$HELPER_IMAGE" sh -c "$script"; }

env_files=(--env-file .env.docker)
[ -f .env.docker.local ] && env_files+=(--env-file .env.docker.local)
if [ -n "${POSTGRES_VOLUME:-}" ]; then
  NAMED=$POSTGRES_VOLUME
else
  project=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$CONTAINER" 2>/dev/null \
    || docker compose -f quickstart-services.yml "${env_files[@]}" config 2>/dev/null | sed -n 's/^name: //p' | head -1)
  [ -n "$project" ] || die "cannot determine the compose project name"
  NAMED="${project}_alkemio_dev_postgres"
fi

# Named volume state: "cluster" (already holds a database), "stub" (only the old empty data/ mount point), "empty"
named_state() {
  docker volume inspect "$NAMED" >/dev/null 2>&1 || { echo empty; return; }
  in_vol 'if [ -f /v/PG_VERSION ]; then echo cluster;
          elif [ -z "$(ls -A /v)" ]; then echo empty;
          elif [ "$(ls -A /v)" = data ] && [ -z "$(ls -A /v/data)" ]; then echo stub;
          else echo other; fi' -v "$NAMED":/v:ro
}

state=$(named_state)
[ "$state" = cluster ] && { say "already migrated ($NAMED holds the cluster)"; exit 0; }
[ "$state" = other ] && die "$NAMED holds unexpected files and no PG_VERSION; inspect it before starting postgres"

# Source: explicit --from, else whatever the existing container has mounted at PGDATA
src=$FROM
if [ -z "$src" ] && docker inspect "$CONTAINER" >/dev/null 2>&1; then
  src=$(docker inspect -f "{{range .Mounts}}{{if eq .Destination \"$PGDATA_PATH\"}}{{.Name}}{{end}}{{end}}" "$CONTAINER")
fi

if [ -z "$src" ] || [ "$src" = "$NAMED" ]; then
  [ "$state" = empty ] && { say "fresh setup, nothing to migrate"; exit 0; }
  # stub without a source container: old data, if any, is in a dangling volume
  if $FRESH; then
    in_vol 'rmdir /v/data' -v "$NAMED":/v
    say "cleared the old empty mount point; postgres will initialise a fresh cluster"; exit 0
  fi
  echo "[pg-volume] $NAMED is in the old layout but no container points at the old data." >&2
  echo "[pg-volume] Dangling volumes that contain a Postgres cluster (newest first):" >&2
  for v in $(docker volume ls -q --filter dangling=true); do
    info=$(in_vol '[ -f /d/PG_VERSION ] && echo "pg$(cat /d/PG_VERSION) $(du -sh /d | cut -f1)"' -v "$v":/d:ro 2>/dev/null || true)
    if [ -n "$info" ]; then echo "$(docker volume inspect -f '{{.CreatedAt}}' "$v") $v $info"; fi
  done | sort -r | sed 's/^/    /' >&2
  die "pick one: $0 --from <volume>   or, to start empty: $0 --fresh"
fi

in_vol 'test -f /s/PG_VERSION' -v "$src":/s:ro || die "$src has no PG_VERSION: not a Postgres data directory"
src_ver=$(in_vol 'cat /s/PG_VERSION' -v "$src":/s:ro)
say "moving the Postgres $src_ver cluster from volume $src into $NAMED"

# Postgres must be stopped for a consistent file copy
if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" = true ]; then
  say "stopping $CONTAINER"
  docker stop -t 120 "$CONTAINER" >/dev/null
fi

docker volume create "$NAMED" >/dev/null
in_vol 'set -e
  [ -d /n/data ] && rmdir /n/data
  [ -z "$(ls -A /n)" ] || { echo "target not empty, refusing" >&2; exit 1; }
  cp -a /s/. /n/
  [ "$(cat /n/PG_VERSION)" = "$(cat /s/PG_VERSION)" ]
  echo "[pg-volume] copied $(du -sh /n | cut -f1)"' -v "$src":/s:ro -v "$NAMED":/n

say "done. The old volume is kept as a backup; once postgres starts fine on the new one, remove it with:"
say "  docker volume rm $src"
