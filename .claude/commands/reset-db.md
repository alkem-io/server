---
description: Reset the local development database and services (full wipe + re-seed)
---

Run the database reset script with a **6-minute timeout** (typical run is 2-3 min; script-internal waits cap at ~4 min):

```bash
bash .scripts/reset-db.sh
```

**Important:** Use a 360 000 ms timeout — this covers the script's internal polling budgets (60 s PostgreSQL + 90 s Kratos + 90 s GraphQL) plus compose, migration, and compilation time.

Report each step's outcome to the user. If the script fails, show the failing step and suggest checking `docker ps` or the server log at `/tmp/alkemio-dev-server.log`.

# Database Reset

Quick full reset of the local development database and services.

## When to Use

When asked to reset the database, wipe the DB, start fresh, or clean-slate the local dev environment.

## Procedure

Run the reset script with a **6-minute timeout**:

```bash
bash .scripts/reset-db.sh
```

**Timeout budget (360 000 ms):** The script's internal polling loops cap at ~240 s (60 s PostgreSQL + 90 s Kratos + 90 s GraphQL). Adding compose restart, migrations, TS compilation, and user registration brings the realistic ceiling to ~5.5 min. The 6-minute timeout provides headroom without excessive wait on failure.

## What It Does

1. Stops all Docker Compose services and removes all compose-managed volumes (`down -v` — named + anonymous)
2. Restarts Docker Compose services
3. Waits for PostgreSQL and the `alkemio` database to be initialized
4. Runs TypeORM migrations (`pnpm run migration:run`)
5. Starts `pnpm start:dev` in background, waits for Kratos + GraphQL health
6. Registers admin user (`admin@alkem.io`) with password from `.env`
7. Seeds the platform-role dev accounts (`.scripts/dev-seed-roles.sh`) — non-fatal

## Accounts after a reset

All share `AUTH_ADMIN_PASSWORD` from `.env` (override with `DEV_SEED_PASSWORD`):

| Account | Role | Notes |
|---|---|---|
| `admin@alkem.io` | `global-admin` + `platform-roles-admin` | bootstrap-seeded; full legacy powers for all of Slice A |
| `ops@alkem.io` | `platform-operations-admin` | authorization reset |
| `users-admin@alkem.io` | `platform-users-admin` | |
| `support@alkem.io` | `platform-support` | |
| `content@alkem.io` | `platform-content-full-access` | |

`admin@alkem.io` can still do everything it could before 027 — Slice A is
additive, and `test-suites` runs as this account at 878 sites. The per-role
accounts each hold **exactly one** role, which is what makes separation of
duties observable: use them to check what a role can *and cannot* do.

Each of the 13 roles is genuinely narrow. `platform-roles-admin`, for example,
is assignment-only — on its own it cannot reset authorization, cannot grant
itself a role (rule `self-assignment`), and cannot grant the legacy `global-*`
roles at all. That is the feature working, not a misconfiguration.

Step 7 grants through `assignPlatformRoleToUser`, never SQL, so a regression in
the assignment rule engine surfaces as a seeding failure instead of being
silently bypassed. It refuses to run against any non-loopback endpoint.

## Output

Step-by-step progress lines prefixed with `==>`. On success it prints the dev server PID and log path (`/tmp/alkemio-dev-server.log`).

Report each step's outcome to the user. If the script fails, show the failing step and suggest checking `docker ps` or the server log.

## Troubleshooting

- **PostgreSQL timeout** — Docker may be slow. Re-run the script.
- **Kratos / GraphQL timeout** — Verify services with `docker ps`.
- **Volume not found** — Safe to ignore; volumes were already removed.
- **Admin registration fails** — Check `/tmp/alkemio-dev-server.log`.
- **Role seeding fails (step 7)** — The reset itself succeeded. Re-run `bash .scripts/dev-seed-roles.sh`. A `grant REJECTED (rule: …)` line is a **real finding** in the assignment rule engine, not a script bug — report it rather than working around it.
- **`unable to grant '<privilege>'` as `admin@alkem.io`** — Check the account actually holds `global-admin`: `SELECT type FROM credential c JOIN "user" u ON u.id = c."actorId" WHERE u.email = 'admin@alkem.io';`. If it is missing, the seed regressed and `test-suites` cannot run at all — 83% of its spec files act as this user.
