# Database Restoration

Restore a real environment's data (prod/dev/**acc**/sandbox) into the local Docker
`alkemio_dev_postgres` container — Alkemio + Synapse, optionally Kratos.

Full runbook + troubleshooting: [`docs/DatabaseRestore.md`](../../docs/DatabaseRestore.md).
Invoke this when asked to "restore the acc db", "get acc data locally", etc.

## Critical: this restore silently fails in two ways — always run the robust flow + verify

A naive `bash restore_latest_backup_set.sh acc` can report success while loading **nothing**.
Two traps (both cost real debugging time on 2026-06-02):

1. **Stale `.env`** missing `POSTGRES_*_DB` → target db name is empty → `DROP DATABASE ;` errors
   under `set -e` → restore aborts, stale seed data left behind.
2. **Live connections** — stack services reconnect faster than the script's terminate→drop, so
   `DROP DATABASE` fails. Restore must run with the stack **down to postgres-only**.

So do NOT just run the script and report its output. Follow the procedure below and **verify by
DB size** at the end.

## Procedure (default target: acc)

### 1. Preflight

```bash
# .env present AND has the DB-name vars (re-copy from sample if missing — stale .env is the #1 silent-failure cause)
test -f .scripts/backups/.env && grep -q POSTGRES_ALKEMIO_DB .scripts/backups/.env \
  && echo "env OK" || echo "FIX: cp .scripts/backups/.env.sample .scripts/backups/.env and fill AWS keys"
docker ps --filter name=alkemio_dev_postgres --format '{{.Names}}' | grep -q . || echo "start postgres first"
```
If `.env` is missing entirely, copy from `.env.sample` and ask the user for the AWS keys.

### 2. Quiesce — stack down to postgres-only (prevents the DROP-DATABASE connection race)

```bash
docker compose -f quickstart-services.yml --env-file .env.docker stop
docker compose -f quickstart-services.yml --env-file .env.docker up -d postgres
```

### 3. Restore (no auto-restart). Use a 10-min timeout — downloads are ~0.8–1.3 GB.

```bash
cd .scripts/backups && bash restore_latest_backup_set.sh <env> false
```
- `<env>` = `acc` (default ask), `dev`, `sandbox`, `prod`.
- Add `true true true` (`restart non_interactive restore_kratos`) only if kratos is needed; default skips it.
- This also sets synapse `server_name` per env in `homeserver.yaml` + `.env.docker`.

### 4. Bring the full stack back up

```bash
cd ../.. && docker compose -f quickstart-services.yml --env-file .env.docker up -d
```

### 5. VERIFY (mandatory — this is what catches the silent failure)

```bash
# Sizes: acc ≈ hundreds of MB. ~20–30 MB = restore did NOT take → investigate before reporting success.
docker exec alkemio_dev_postgres psql -U synapse -d postgres -tAc \
  "select datname, pg_size_pretty(pg_database_size(datname)) from pg_database where datname in ('alkemio','synapse');"
docker exec alkemio_dev_postgres psql -U synapse -d alkemio -tAc \
  "select (select count(*) from \"user\") users, (select count(*) from space) spaces;"
# Synapse must be healthy and free of domain errors:
docker ps --filter name=alkemio_dev_synapse --format '{{.Status}}'
docker logs --since 60s alkemio_dev_synapse 2>&1 | grep -i "not native" && echo "server_name MISMATCH" || echo "server_name OK"
```
Reference (acc 2026-06-02): alkemio ≈ 620 MB / 402 users / 1543 spaces; synapse ≈ 868 MB / 732 users / 10336 rooms.

## If synapse crash-loops (`Found users in database not native to <name>`)

`server_name` must match the restored data's user domain (acc=`matrix-acc.alkem.io`,
dev=`matrix-dev.alkem.io`, prod=`matrix.alkem.io`, seed=`alkemio.matrix.host`). Check the actual
domain and fix:
```bash
docker exec alkemio_dev_postgres psql -U synapse -d synapse -tAc "select distinct split_part(name,':',2) from users limit 5;"
# Set server_name to match in .build/synapse/homeserver.yaml + SYNAPSE_SERVER_NAME/SYNAPSE_HOMESERVER_NAME in .env.docker, then:
docker compose -f quickstart-services.yml --env-file .env.docker up -d --force-recreate synapse matrix-adapter
```

## Apple Silicon note

`quickstart-services.yml` must keep `platform: linux/amd64` on the `notification` service (only
amd64-only image in the stack); without it `pnpm run start:services` aborts with
`no matching manifest for linux/arm64/v8`.

## Environment → bucket

| Env | Bucket | Region | server_name |
|-----|--------|--------|-------------|
| prod | alkemio-s3-backups-prod-paris | fr-par | matrix.alkem.io |
| dev / acc / sandbox | alkemio-s3-backups-dev | nl-ams | matrix-{dev,acc,sandbox}.alkem.io |

## Single-DB restore

```bash
cd .scripts/backups && bash restore_latest_backup.sh <alkemio|synapse|kratos> <env> true
```
