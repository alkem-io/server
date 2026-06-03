# How to use these scripts?

> 📘 **Full runbook (recommended):** [`docs/DatabaseRestore.md`](../../docs/DatabaseRestore.md) —
> single-command + manual steps, verification, and troubleshooting for the silent-failure traps
> below. Or just ask Claude: *"restore the acc db"*.
>
> ⚠️ **Two silent-failure traps** (the script can report success while loading nothing):
> 1. A stale `.env` missing `POSTGRES_*_DB` → empty target name → restore aborts. Re-copy from `.env.sample`.
> 2. `DROP DATABASE` fails if stack services are connected → restore with the stack **down to
>    postgres-only** (`docker compose -f quickstart-services.yml --env-file .env.docker stop && ... up -d postgres`).
>
> **Always verify by DB size afterward** (acc ≈ hundreds of MB; ~20–30 MB means it didn't take):
> ```bash
> docker exec alkemio_dev_postgres psql -U synapse -d postgres -tAc \
>   "select datname, pg_size_pretty(pg_database_size(datname)) from pg_database where datname in ('alkemio','synapse');"
> ```

## Prerequisites

- Create `.env` file in the `backups` folder. Copy the .env.sample and fill in the missing values.
  **Keep all `POSTGRES_*_DB` vars** — the script derives the target DB name from them.
- The `postgres` container needs to be running from `quickstart-services`, or started with `pnpm run start:services`

## The following scripts are added

### Restoring latest set of alkemio + kratos + synapse database from a specified environment

Run `./restore_latest_backup_set.sh`. You can optionally pass an argument for the environment `dev | acc | sandbox | prod`. If no argument is passed, `prod` is selected.
The script will:
- Validate prerequisites
- Invoke `restore_latest_backup.sh` for `alkemio` and `synapse` by default. `kratos` is restored **only** when the 4th argument `restore_kratos=true` (default `false`)
- Update `.env.docker` file with the correct `homeserver` env variables for the specific environment
- Update `homeserver.yaml` with the correct server domain
- Restart the docker-compose (`quickstart-services`) with `pnpm run start:services`
- Run a loop validating whether the `alkemio_dev_postgres` container is started. When it starts, it will start the server as well

### Restoring latest alkemio / kratos / synapse database

Run `./restore_latest_backup.sh`. You can optionally pass an argument for the database `alkemio | kratos | synapse`. If no argument is passed, `alkemio` is selected. You can optionally pass a second argument for the environment `dev | acc | sandbox | prod`. If no argument is passed, `prod` is selected. If you want to pass the second argument, first one needs to be passed as well.
The script will:
- Validate input parameters
- Download the latest backup for the specified database from the `S3` bucket
- Restore the database (drop & create)

### Recreating empty databases

Run `./recreate_databases.sh empty [all|alkemio|kratos|synapse]`. This recreates empty PostgreSQL databases.

### Restoring databases from backup

Run `./recreate_databases.sh restore <environment> [all|alkemio|kratos|synapse]`. This restores the latest backup from S3 for the specified environment.
