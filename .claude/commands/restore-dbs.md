---
description: Restore databases (alkemio, synapse, optionally kratos) from latest backup set
arguments:
  - name: environment
    description: Environment to restore from (prod/dev/acc/sandbox)
    required: true
  - name: restart_services
    description: Whether to restart services after restore (true/false, default true)
    required: false
  - name: non_interactive
    description: Run without prompts (true/false, default true)
    required: false
  - name: restore_kratos
    description: Whether to also restore kratos database (true/false, default false)
    required: false
---

## Prerequisites

Before running, ensure `.scripts/backups/.env` exists with AWS and PostgreSQL credentials:

```bash
# Check if .env exists
cat .scripts/backups/.env
```

If missing, copy from sample and fill in credentials:
```bash
cp .scripts/backups/.env.sample .scripts/backups/.env
```

Required variables:
- `AWS_ACCESS_KEY_ID` - Scaleway S3 access key
- `AWS_SECRET_ACCESS_KEY` - Scaleway S3 secret key
- `POSTGRES_USER` - PostgreSQL user (typically "synapse")
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_ALKEMIO_DB`, `POSTGRES_KRATOS_DB`, `POSTGRES_SYNAPSE_DB` - Database names

## Execution

> ⚠️ Do **not** just run the script and report its output — it can report success while loading
> nothing. Follow the robust flow in [`docs/DatabaseRestore.md`](../../docs/DatabaseRestore.md) /
> the [`restore-dbs` skill](../skills/restore-dbs.md): preflight → quiesce → restore → verify.

1. Preflight — credentials present AND all DB-name vars set (stale `.env` is the #1 silent-failure cause):
```bash
test -f .scripts/backups/.env \
  && grep -q POSTGRES_ALKEMIO_DB .scripts/backups/.env \
  && grep -q POSTGRES_SYNAPSE_DB .scripts/backups/.env \
  && grep -q POSTGRES_KRATOS_DB .scripts/backups/.env \
  && echo "env OK" || echo "ERROR: copy .scripts/backups/.env.sample → .env and fill AWS keys + POSTGRES_{ALKEMIO,SYNAPSE,KRATOS}_DB"
```

2. Quiesce — bring the stack down to postgres-only so no service blocks `DROP DATABASE`:
```bash
docker compose -f quickstart-services.yml --env-file .env.docker stop
docker compose -f quickstart-services.yml --env-file .env.docker up -d postgres
```

3. Run the restore (parse `$ARGUMENTS`: environment, restart_services, non_interactive, restore_kratos). Pass `false` for restart so you bring the stack up yourself after:
```bash
cd .scripts/backups && bash restore_latest_backup_set.sh <environment> false [non_interactive] [restore_kratos]
cd ../.. && docker compose -f quickstart-services.yml --env-file .env.docker up -d
```

4. **Verify** (mandatory — DB sizes should be hundreds of MB, not ~20–30 MB):
```bash
docker exec alkemio_dev_postgres psql -U synapse -d postgres -tAc \
  "select datname, pg_size_pretty(pg_database_size(datname)) from pg_database where datname in ('alkemio','synapse');"
docker ps --filter name=alkemio_dev_synapse --format '{{.Status}}'   # must be healthy, not Restarting
```
If synapse crash-loops with `not native to <name>`, fix `server_name` to match the data domain — see the runbook.

**Default behavior:**
- Restores `alkemio` and `synapse` databases
- Kratos is NOT restored by default (pass `true` as 4th argument to include it)
- Services are restarted after restore

**Examples:**
- `/restore-dbs prod` - Restore prod databases (no kratos), restart services
- `/restore-dbs dev false` - Restore dev databases, don't restart services
- `/restore-dbs acc true true true` - Restore acc databases INCLUDING kratos

Report the script output to the user. If credentials are missing, guide the user to set them up.
