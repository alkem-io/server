#!/usr/bin/env bash
# Keeps the local Postgres volume usable across compose changes. Runs before every
# `pnpm run start:services*`; a no-op once everything is in place or on a fresh machine.
#
# 1. Layout: quickstart used to mount `alkemio_dev_postgres` at /var/lib/postgresql, but the image
#    keeps PGDATA in /var/lib/postgresql/data and declares that path as its own VOLUME, so the
#    cluster lived in an ANONYMOUS volume. The named volume is now mounted at PGDATA; step 1 copies
#    the existing cluster into it.
# 2. Major version: a cluster is tied to its major version (17 data does not start on 18). When the
#    compose image is newer than the data, step 2 dumps the old cluster and restores it into a fresh
#    one, then checks exact row counts and sequences before handing over.
#
#   --from <volume>    step 1: migrate from a specific (e.g. dangling) volume instead of the container's
#   --fresh            step 1: no data worth keeping, start postgres on an empty cluster
#   --env-file <file>  the env files the following `docker compose` gets (repeatable), so both resolve
#                      the same project and volume. Default: .env.docker [+ .env.docker.local]
# Nothing is deleted: the old anonymous volume (step 1) and a copy of the old-major cluster
# (step 2, `<volume>_pg<N>_backup_<timestamp>`) are kept, and the script prints how to remove them.
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
# Value of KEY from the environment, else the env files (later file wins). Never printed.
env_value() {
  local key=$1 v=${!1:-} i files=()
  if [ -z "$v" ]; then
    for ((i = 1; i < ${#env_files[@]}; i += 2)); do files+=("${env_files[i]}"); done
    v=$(cat "${files[@]}" 2>/dev/null | sed -n "s/^${key}=//p" | tail -1 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  fi
  printf '%s' "$v"
}

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
  [ "$BASHPID" = "$$" ] || exit "$rc" # failures inside $(...) are handled once, by the main shell
  trap - ERR INT TERM
  say "migration failed; restarting $CONTAINER on its old volume (nothing was changed there)"
  docker update --restart="${restart_policy:-no}" "$CONTAINER" >/dev/null 2>&1 || true
  docker start "$CONTAINER" >/dev/null 2>&1 || true
  exit $(( rc ? rc : 1 ))
}

# ── Step 1: layout ──────────────────────────────────────────────────────────────────────────────

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

migrate_layout() {
  state=$(named_state)
  [ "$state" = cluster ] && { say "already migrated ($NAMED holds the cluster)"; return 0; }
  [ "$state" = other ] && die "$NAMED holds unexpected files and no PG_VERSION; inspect it before starting postgres"

  if $FRESH; then
    [ "$state" = empty ] && { say "fresh setup, nothing to migrate"; return 0; }
    stop_postgres
    in_vol 'find /v -mindepth 1 -delete' -v "$NAMED":/v
    trap - ERR INT TERM
    say "cleared $NAMED; postgres will initialise a fresh cluster"; return 0
  fi

  # Source: explicit --from, else whatever the existing container has mounted at PGDATA
  src=$FROM
  if [ -z "$src" ] && $own_container; then
    src=$(docker inspect -f "{{range .Mounts}}{{if eq .Destination \"$PGDATA_PATH\"}}{{.Name}}{{end}}{{end}}" "$CONTAINER")
  fi

  if [ -z "$src" ] || [ "$src" = "$NAMED" ]; then
    [ "$state" = empty ] && { say "fresh setup, nothing to migrate"; return 0; }
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
}

# ── Step 2: major version ───────────────────────────────────────────────────────────────────────

target_image() {
  if [ -n "${POSTGRES_TARGET_IMAGE:-}" ]; then echo "$POSTGRES_TARGET_IMAGE"; return; fi
  docker compose -f quickstart-services.yml "${env_files[@]}" config 2>/dev/null \
    | awk '/^  postgres:$/{f=1; next} f&&/^  [^ ]/{exit} f&&$1=="image:"{print $2; exit}'
}
# "postgres:18.6-trixie@sha256:..." -> 18
image_major() { echo "$1" | sed -E 's/^[^:]*:([0-9]+).*/\1/'; }

OLD_C=pgconv-old-$$ NEW_C=pgconv-new-$$ BACKUP="" CONVERTING=false
# Lives outside PGDATA for the whole time the named volume does not hold a verified cluster, and names the
# backup to recover from: a run killed outright (no trap) is put back to the backup by the next run
STATE="${NAMED}_pgconv_state"
NEW_SUBDIR=pgconv-new
# Old cluster copied back into the named volume; the state volume goes only once that has worked
restore_backup() {
  in_vol 'find /n -mindepth 1 -delete && cp -a /b/. /n/ && [ "$(cat /n/PG_VERSION)" = "$(cat /b/PG_VERSION)" ]' \
    -v "$BACKUP":/b:ro -v "$NAMED":/n && docker volume rm "$STATE" >/dev/null
}
recover_conversion() {
  docker volume inspect "$STATE" >/dev/null 2>&1 || return 0
  BACKUP=$(in_vol 'cat /s/backup' -v "$STATE":/s:ro)
  in_vol 'test -f /b/PG_VERSION' -v "$BACKUP":/b:ro 2>/dev/null \
    || die "an earlier conversion of $NAMED was interrupted and its backup $BACKUP is missing; inspect the volumes before going on"
  say "an earlier conversion of $NAMED was interrupted; restoring the original cluster from $BACKUP"
  stop_postgres
  # A killed run leaves its temporary servers running on these volumes; only ours (by volume) are removed
  local v
  for v in "$NAMED" "$BACKUP"; do
    docker ps -aq --filter name=pgconv- --filter volume="$v" | xargs -r docker rm -f >/dev/null
  done
  trap - ERR INT TERM # a failure here keeps the state volume, so the next run tries again
  restore_backup
  say "restored; converting again"
}
cleanup_temps() { docker rm -f "$OLD_C" "$NEW_C" >/dev/null 2>&1 || true; }
# Any failure after the named volume was wiped: put the untouched old-major copy back
on_error() {
  local rc=$?
  [ "$BASHPID" = "$$" ] || exit "$rc" # failures inside $(...) are handled once, by the main shell
  trap - ERR INT TERM
  cleanup_temps
  local restored=true
  if $CONVERTING && [ -n "$BACKUP" ]; then
    echo "[pg-volume] conversion failed, restoring the original cluster into $NAMED" >&2
    if restore_backup; then
      echo "[pg-volume] restored; your data is unchanged (copy kept in $BACKUP)" >&2
    else
      restored=false
      echo "[pg-volume] ERROR: restore failed, $NAMED is incomplete: do not start postgres. Your data is intact in $BACKUP;" >&2
      echo "[pg-volume] running this script again retries the restore." >&2
    fi
  fi
  # the old container still runs the old major on the restored named volume (never on a half-restored one)
  if $restored && [ -n "$restart_policy" ]; then
    docker update --restart="$restart_policy" "$CONTAINER" >/dev/null 2>&1 || true
    docker start "$CONTAINER" >/dev/null 2>&1 || true
  fi
  # INT/TERM can arrive with a zero status; a zero exit would let `&& docker compose up` run
  exit $(( rc ? rc : 1 ))
}

# The init-time temporary server only listens on the socket, so a TCP pg_isready means the real server is up
wait_ready() {
  local c=$1 i
  for i in $(seq 1 180); do
    docker exec "$c" pg_isready -q -h localhost 2>/dev/null && return 0
    [ "$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null)" = true ] \
      || { docker logs --tail 20 "$c" >&2; echo "[pg-volume] ERROR: $c exited during startup" >&2; return 1; }
    sleep 1
  done
  echo "[pg-volume] ERROR: $c did not become ready" >&2
  return 1 # a return (not die) so the ERR trap restores the original cluster
}

# psql in a temp container over the local socket as the bootstrap superuser; SQL on stdin
psql_c() { docker exec -i -e PGOPTIONS="-c client_min_messages=warning" "$1" psql -X -q -At -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$2"; }

# Exact row counts + sequence values of every database: what must survive the conversion
fingerprint() {
  local c=$1 db
  for db in $(echo "SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY 1" | psql_c "$c" postgres); do
    psql_c "$c" "$db" <<'SQL' | sed "s/^/$db|/"
SELECT format('%I.%I', table_schema, table_name),
       (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text
FROM information_schema.tables
WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema')
UNION ALL
SELECT 'seq:' || format('%I.%I', schemaname, sequencename), coalesce(last_value::text, 'null') FROM pg_sequences
ORDER BY 1;
SQL
  done
}

convert_major() {
  local data_ver target target_ver old_img need free enc lcc lct db fp_old fp_new
  # nothing to convert yet: fresh setup, or postgres will initialise the cluster itself
  docker volume inspect "$NAMED" >/dev/null 2>&1 || return 0
  data_ver=$(in_vol 'cat /v/PG_VERSION 2>/dev/null || true' -v "$NAMED":/v:ro)
  [ -n "$data_ver" ] || return 0
  target=$(target_image)
  [ -n "$target" ] || { say "WARN: cannot read the postgres image from quickstart-services.yml; skipping the version check"; return 0; }
  target_ver=$(image_major "$target")
  [[ "$target_ver" =~ ^[0-9]+$ ]] || { say "WARN: cannot parse a major version from '$target'; skipping the version check"; return 0; }
  [ "$data_ver" = "$target_ver" ] && { say "up to date ($NAMED holds a Postgres $data_ver cluster)"; return 0; }
  [ "$data_ver" -gt "$target_ver" ] && die "$NAMED holds Postgres $data_ver data but compose runs $target_ver: downgrades are not supported"

  PG_USER=$(env_value POSTGRES_USER); export POSTGRES_PASSWORD; POSTGRES_PASSWORD=$(env_value POSTGRES_PASSWORD)
  [ -n "$PG_USER" ] && [ -n "$POSTGRES_PASSWORD" ] || die "POSTGRES_USER / POSTGRES_PASSWORD not found in the env files"
  # Prefer the image the old container already has (no pull); any image of the same major reads the data
  old_img=$(docker inspect -f '{{.Config.Image}}' "$CONTAINER" 2>/dev/null || true)
  [ "$(image_major "${old_img:-x:x}")" = "$data_ver" ] || old_img="postgres:$data_ver"
  # One copy per attempt, so a retry after a failed run never collides with (or overwrites) an earlier copy
  BACKUP="${NAMED}_pg${data_ver}_backup_$(date +%Y%m%d-%H%M%S)"

  say "upgrading the local database from Postgres $data_ver to $target_ver (dump + restore; your data is copied first)"
  need=$(in_vol 'du -sk /v | cut -f1' -v "$NAMED":/v:ro)
  free=$(df -Pk "$(docker info -f '{{.DockerRootDir}}' 2>/dev/null || echo /var/lib/docker)" 2>/dev/null | awk 'NR==2{print $4}' || echo "")
  if [ -n "$free" ] && [ "$free" -lt $((need * 25 / 10)) ]; then
    die "not enough disk: need ~$((need * 25 / 10 / 1024)) MB free for the backup copy + new cluster, have $((free / 1024)) MB"
  fi

  stop_postgres
  trap on_error ERR INT TERM
  docker pull -q "$target" >/dev/null
  docker volume create "$BACKUP" >/dev/null
  in_vol 'cp -a /v/. /b/ && [ "$(cat /b/PG_VERSION)" = "$(cat /v/PG_VERSION)" ]' -v "$NAMED":/v:ro -v "$BACKUP":/b
  say "copied the Postgres $data_ver cluster to $BACKUP"

  # Old major runs on the copy, read-only use; the new major is initialised in the (wiped) named volume
  docker run -d --name "$OLD_C" -e PGDATA="$PGDATA_PATH" -v "$BACKUP":"$PGDATA_PATH" "$old_img" >/dev/null
  wait_ready "$OLD_C"
  # Same encoding, libc locale and, for ICU/builtin, provider + locale (column names differ across majors)
  IFS='|' read -r enc lcc lct prov loc < <(echo "SELECT pg_encoding_to_char(encoding), datcollate, datctype, datlocprovider,
    coalesce(to_jsonb(d) ->> 'datlocale', to_jsonb(d) ->> 'daticulocale', '') FROM pg_database d WHERE datname = 'template1'" | psql_c "$OLD_C" postgres)
  initdb_args="--encoding=$enc --lc-collate=$lcc --lc-ctype=$lct"
  case $prov in
    i) initdb_args+=" --locale-provider=icu --icu-locale=$loc" ;;
    b) initdb_args+=" --locale-provider=builtin --builtin-locale=$loc" ;;
  esac

  docker volume create "$STATE" >/dev/null
  in_vol 'echo "$B" > /s/backup' -e B="$BACKUP" -v "$STATE":/s
  CONVERTING=true
  # The new cluster is built in a subdirectory and moved up only once verified; the marker at the root is
  # written first and removed last, so the root never holds an unverified cluster the entrypoint would start
  in_vol 'find /n -mindepth 1 -delete && touch /n/'"$MARKER" -v "$NAMED":/n
  docker run -d --name "$NEW_C" -e POSTGRES_USER="$PG_USER" -e POSTGRES_PASSWORD -e POSTGRES_DB=postgres \
    -e PGDATA="$PGDATA_PATH/$NEW_SUBDIR" -e POSTGRES_INITDB_ARGS="$initdb_args" \
    -v "$NAMED":"$PGDATA_PATH" "$target" >/dev/null
  wait_ready "$NEW_C"

  # Roles (with their SCRAM hashes); the bootstrap superuser already exists after initdb
  docker exec "$OLD_C" pg_dumpall -U "$PG_USER" --globals-only \
    | grep -vxE "CREATE ROLE \"?${PG_USER}\"?;" | psql_c "$NEW_C" postgres
  for db in $(echo "SELECT datname FROM pg_database WHERE NOT datistemplate AND datname <> 'postgres' ORDER BY 1" | psql_c "$OLD_C" postgres); do
    docker exec "$OLD_C" pg_dump -U "$PG_USER" -Fc -d "$db" \
      | docker exec -i "$NEW_C" pg_restore -U "$PG_USER" --create --exit-on-error -d postgres
    say "  restored $db"
  done
  # Anything users put in the maintenance db itself
  if [ "$(echo "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog','information_schema')" | psql_c "$OLD_C" postgres)" != 0 ]; then
    docker exec "$OLD_C" pg_dump -U "$PG_USER" -Fc -d postgres | docker exec -i "$NEW_C" pg_restore -U "$PG_USER" --exit-on-error -d postgres
    say "  restored postgres"
  fi
  for db in $(echo "SELECT datname FROM pg_database WHERE datallowconn ORDER BY 1" | psql_c "$NEW_C" postgres); do
    echo "SELECT format('ALTER EXTENSION %I UPDATE', extname) FROM pg_extension \gexec" | psql_c "$NEW_C" "$db" >/dev/null
  done
  docker exec "$NEW_C" vacuumdb -U "$PG_USER" --all --analyze-only --quiet

  fp_old=$(fingerprint "$OLD_C"); fp_new=$(fingerprint "$NEW_C")
  if [ "$fp_old" != "$fp_new" ]; then
    diff <(echo "$fp_old") <(echo "$fp_new") | head -20 >&2
    false # -> on_error restores the original cluster
  fi
  say "verified: $(echo "$fp_new" | grep -vc '|seq:' || true) tables and $(echo "$fp_new" | grep -c '|seq:' || true) sequences identical on $data_ver and $target_ver"

  docker stop -t 60 "$NEW_C" "$OLD_C" >/dev/null
  in_vol 'set -e
    find /n/'"$NEW_SUBDIR"' -mindepth 1 -maxdepth 1 -exec mv {} /n/ \;
    rmdir /n/'"$NEW_SUBDIR"'
    test -f /n/PG_VERSION
    sync
    rm /n/'"$MARKER" -v "$NAMED":/n
  cleanup_temps
  CONVERTING=false
  trap - ERR INT TERM
  docker volume rm "$STATE" >/dev/null
  say "done. The Postgres $data_ver copy is kept in $BACKUP; once everything runs fine on $target_ver, remove it with:"
  say "  docker volume rm $BACKUP"
}

recover_conversion
migrate_layout
convert_major
