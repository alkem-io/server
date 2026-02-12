---
description: Reset the local development database and services (full wipe + re-seed)
---

Run the database reset script with a **10-minute timeout** (the full cycle takes several minutes):

```bash
bash .scripts/reset-db.sh
```

Report each step's outcome to the user. If the script fails, show the failing step and suggest checking `docker ps` or the server log at `/tmp/alkemio-dev-server.log`.

# Database Reset

Quick full reset of the local development database and services.

## When to Use

When asked to reset the database, wipe the DB, start fresh, or clean-slate the local dev environment.

## Procedure

Run the reset script with a **10-minute timeout** (services take time to start):

```bash
bash .scripts/reset-db.sh
```

**Important:** Use a 600 000 ms timeout — the full cycle (compose restart, migrations, server boot, user registration) can take several minutes.

## What It Does

1. Stops all Docker Compose services (`quickstart-services.yml`)
2. Deletes PostgreSQL and Synapse Docker volumes (full data wipe)
3. Restarts Docker Compose services
4. Waits for PostgreSQL and the `alkemio` database to be initialized
5. Runs TypeORM migrations (`pnpm run migration:run`)
6. Starts `pnpm start:dev` in background, waits for Kratos + GraphQL health
7. Registers admin user (`admin@alkem.io`) with password from `.env`

## Output

Step-by-step progress lines prefixed with `==>`. On success it prints the dev server PID and log path (`/tmp/alkemio-dev-server.log`).

Report each step's outcome to the user. If the script fails, show the failing step and suggest checking `docker ps` or the server log.

## Troubleshooting

- **PostgreSQL timeout** — Docker may be slow. Re-run the script.
- **Kratos / GraphQL timeout** — Verify services with `docker ps`.
- **Volume not found** — Safe to ignore; volumes were already removed.
- **Admin registration fails** — Check `/tmp/alkemio-dev-server.log`.
