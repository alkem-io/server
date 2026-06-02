# Restoring an environment database locally (acc / dev / sandbox / prod)

This runbook restores a real environment's PostgreSQL data (Alkemio + Synapse, optionally
Kratos) from the Scaleway S3 backups into your local Docker `alkemio_dev_postgres` container.

Two ways to do it:

- **Ask Claude** (single command): *"restore the acc db"* → runs the [`restore-dbs`](../.claude/skills/restore-dbs.md)
  skill, which performs the robust flow below and verifies the result.
- **Manually**: follow [Manual procedure](#manual-procedure).

> Most-common target is **acc**. Substitute `dev` / `sandbox` / `prod` as needed.

---

## TL;DR

```bash
# 1. Credentials present? (copy from sample and fill AWS keys if missing)
test -f .scripts/backups/.env || cp .scripts/backups/.env.sample .scripts/backups/.env

# 2. Restore acc (alkemio + synapse). Run with the stack DOWN to postgres-only — see why below.
cd .scripts/backups && bash restore_latest_backup_set.sh acc

# 3. Verify it actually loaded (sizes should be hundreds of MB, not tens)
docker exec alkemio_dev_postgres psql -U synapse -d postgres -tAc \
  "select datname, pg_size_pretty(pg_database_size(datname)) from pg_database where datname in ('alkemio','synapse');"
```

If a restore "succeeds" but the DB is only ~20–30 MB, it **silently failed** — see
[Troubleshooting](#troubleshooting).

---

## Prerequisites

1. **Credentials file** `.scripts/backups/.env` — copy from `.env.sample` and fill the AWS keys:

   ```bash
   cp .scripts/backups/.env.sample .scripts/backups/.env
   ```

   Required variables (the sample already lists them all — **do not delete any**):

   | Variable | Value |
   |----------|-------|
   | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Scaleway S3 keys |
   | `POSTGRES_USER` / `POSTGRES_PASSWORD` | `synapse` / (local pw) |
   | `POSTGRES_ALKEMIO_DB` | `alkemio` |
   | `POSTGRES_SYNAPSE_DB` | `synapse` |
   | `POSTGRES_KRATOS_DB` | `kratos` |

   > ⚠️ **If your `.env` predates 2026-06 it may be missing `POSTGRES_*_DB`.** The restore
   > script derives the target DB name from these; if they're empty the restore runs
   > `DROP DATABASE IF EXISTS ;` (empty name), errors under `set -e`, and **aborts without
   > touching your data** — leaving stale seed data behind. Re-copy from `.env.sample`.

2. **Postgres running:** `docker ps | grep alkemio_dev_postgres` (else `pnpm run start:services`).

3. **Apple Silicon only:** `quickstart-services.yml` pins `platform: linux/amd64` on the
   `notification` service — it's the one stack image published amd64-only (no arm64 manifest),
   and without the pin `pnpm run start:services` aborts the whole `up`. Keep that line.

---

## Manual procedure

The packaged `restore_latest_backup_set.sh acc` works **only if nothing is connected to the
target DB when it runs `DROP DATABASE`** (see [Troubleshooting](#troubleshooting)). The reliable
sequence is: restore against postgres-only, then bring the stack up.

```bash
cd /path/to/server

# 1. Bring the stack down to postgres-only so no service holds a DB connection
docker compose -f quickstart-services.yml --env-file .env.docker stop
docker compose -f quickstart-services.yml --env-file .env.docker up -d postgres

# 2. Restore (downloads latest acc dumps from S3, drops+creates+loads)
cd .scripts/backups && bash restore_latest_backup_set.sh acc false   # false = don't auto-restart

# 3. Make synapse server_name match the restored data (see note below), then bring everything up
cd ../..
docker compose -f quickstart-services.yml --env-file .env.docker up -d
```

### Synapse `server_name` must match the restored data

Synapse refuses to start if its configured `server_name` doesn't match the user domain in its
DB (`Found users in database not native to <name>`). The domain differs by source:

| Data source | User domain / `server_name` |
|-------------|------------------------------|
| Local **seed** | `alkemio.matrix.host` |
| **acc** backup | `matrix-acc.alkem.io` |
| **dev** backup | `matrix-dev.alkem.io` |
| **prod** backup | `matrix.alkem.io` |

`restore_latest_backup_set.sh` sets this automatically per environment (in
`.build/synapse/homeserver.yaml` + `SYNAPSE_SERVER_NAME` / `SYNAPSE_HOMESERVER_NAME` in
`.env.docker`). If synapse crash-loops, confirm the config matches the actual data:

```bash
# What domain does the restored data actually use?
docker exec alkemio_dev_postgres psql -U synapse -d synapse -tAc \
  "select distinct split_part(name,':',2) from users limit 5;"
# Then set server_name to match in homeserver.yaml + .env.docker and recreate:
docker compose -f quickstart-services.yml --env-file .env.docker up -d --force-recreate synapse matrix-adapter
```

---

## Verification (always do this)

A restore can report success while having loaded nothing. Confirm:

```bash
# DB sizes — acc is hundreds of MB; ~20–30 MB means the restore did NOT take
docker exec alkemio_dev_postgres psql -U synapse -d postgres -tAc \
  "select datname, pg_size_pretty(pg_database_size(datname)) from pg_database where datname in ('alkemio','synapse');"

# Row sanity (acc ≈ hundreds of users / thousands of spaces / thousands of rooms)
docker exec alkemio_dev_postgres psql -U synapse -d alkemio -tAc \
  "select (select count(*) from \"user\") users, (select count(*) from space) spaces;"
docker exec alkemio_dev_postgres psql -U synapse -d synapse -tAc \
  "select (select count(*) from users) users, (select count(*) from rooms) rooms;"

# Synapse healthy + no domain errors
docker ps --filter name=alkemio_dev_synapse --format '{{.Status}}'
docker logs --since 60s alkemio_dev_synapse 2>&1 | grep -i "not native" || echo "server_name OK"
```

Reference (acc, 2026-06-02 backup): alkemio ≈ 620 MB / 402 users / 1543 spaces;
synapse ≈ 868 MB / 732 users / 10336 rooms.

---

## Environment → bucket mapping

| Env | S3 bucket | Region | Matrix `server_name` |
|-----|-----------|--------|----------------------|
| prod | `alkemio-s3-backups-prod-paris` | `fr-par` | `matrix.alkem.io` |
| dev | `alkemio-s3-backups-dev` | `nl-ams` | `matrix-dev.alkem.io` |
| acc | `alkemio-s3-backups-dev` | `nl-ams` | `matrix-acc.alkem.io` |
| sandbox | `alkemio-s3-backups-dev` | `nl-ams` | `matrix-sandbox.alkem.io` |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Restore "completes" but DB is ~20–30 MB / data unchanged | `.env` missing `POSTGRES_*_DB` → empty db name → `DROP DATABASE ;` errors under `set -e` and aborts | Re-copy `.env` from `.env.sample`; ensure `POSTGRES_ALKEMIO_DB`/`SYNAPSE_DB`/`KRATOS_DB` are set |
| `DROP DATABASE ... is being accessed by other users` / restore aborts | Stack services (authorization-evaluation, file-service, oidc-service → alkemio; synapse → synapse) reconnect faster than the script's terminate→drop | Restore with stack **down to postgres-only** (see Manual procedure), then `up -d` |
| Synapse crash-loops: `Found users in database not native to <name>` | `server_name` ≠ the user domain in the restored data | Set `server_name` to match the data's domain (see [table](#synapse-server_name-must-match-the-restored-data)), recreate synapse + matrix-adapter |
| matrix-adapter logs 400/403 with old-domain user IDs | Adapter started before `SYNAPSE_SERVER_NAME` was corrected | `up -d --force-recreate matrix-adapter` |
| `pnpm run start:services` fails: `no matching manifest for linux/arm64/v8` (notification) | amd64-only image on Apple Silicon | Keep `platform: linux/amd64` on the `notification` service in `quickstart-services.yml` |
| `No backup files found` | Wrong env/bucket or AWS auth | `source .scripts/backups/.env && aws s3 ls s3://<bucket>/storage/postgres/backups/<env>/alkemio/` |

---

## Related

- Skill (agent path): [`.claude/skills/restore-dbs.md`](../.claude/skills/restore-dbs.md)
- Slash command: `/restore-dbs <env>`
- Scripts + low-level reference: [`.scripts/backups/README.md`](../.scripts/backups/README.md)
- Full local wipe + re-seed (NOT environment data): `/reset-db`
