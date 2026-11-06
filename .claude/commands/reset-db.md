---
description: Reset the local development database and services (full wipe + re-seed)
---

Run the database reset script with a **7-minute timeout** (typical run is 2-3 min; script-internal waits cap at ~5.5 min):

```bash
bash .scripts/reset-db.sh
```

**Important:** Use a 420 000 ms timeout — this covers the script's internal polling budgets (60 s PostgreSQL + 90 s Kratos + 90 s GraphQL + 90 s dev-seed-roles) plus compose, migration, and compilation time.

Report each step's outcome to the user. If the script fails, show the failing step and suggest checking `docker ps` or the server log at `/tmp/alkemio-dev-server.log`.

# Database Reset

Quick full reset of the local development database and services.

## When to Use

When asked to reset the database, wipe the DB, start fresh, or clean-slate the local dev environment.

## Procedure

Run the reset script with a **7-minute timeout**:

```bash
bash .scripts/reset-db.sh
```

**Timeout budget (420 000 ms):** The script's internal polling loops cap at ~330 s (60 s PostgreSQL + 90 s Kratos + 90 s GraphQL + 90 s dev-seed-roles). Adding compose restart, migrations and TS compilation brings the realistic ceiling to ~6.5 min. The 7-minute timeout provides headroom without excessive wait on failure.

## What It Does

1. Stops all Docker Compose services and removes all compose-managed volumes (`down -v` — named + anonymous)
2. Restarts Docker Compose services
3. Waits for PostgreSQL and the `alkemio` database to be initialized
4. Runs TypeORM migrations (`pnpm run migration:run`)
5. Starts `pnpm start:dev` in background, waits for Kratos + GraphQL health
6. Waits for the `dev-seed-roles` compose container, which registers `admin@alkem.io` and the platform-role dev accounts (`.scripts/dev-seed-roles.sh`) — non-fatal

## Accounts after a reset

All share `AUTH_ADMIN_PASSWORD` from `.env` (override with `DEV_SEED_PASSWORD`):

| Account | Role | Notes |
|---|---|---|
| `admin@alkem.io` | `platform-roles-admin` + `platform-operations-admin` + `platform-users-admin` + `platform-settings-admin` | bootstrap-seeded (`users.json`) |
| `ops@alkem.io` | `platform-operations-admin` | authorization reset |
| `users-admin@alkem.io` | `platform-users-admin` | |
| `support@alkem.io` | `platform-support` | |
| `content@alkem.io` | `platform-content-full-access` | |

There is no `global-admin` any more — Slice B (#6582) removed the legacy
`global-*` roles (migration `DropLegacyPlatformRoles`). `admin@alkem.io` is
not a god account: it holds the four admin roles above and nothing else. The
per-role accounts each hold **exactly one** role, which is what makes
separation of duties observable: use them to check what a role can *and
cannot* do.

Each of the 13 roles is genuinely narrow. `platform-roles-admin`, for example,
is assignment-only — on its own it cannot reset authorization, cannot grant
itself a role (rule `self-assignment`). That is the feature working, not a
misconfiguration.

Step 6 grants through `assignPlatformRoleToUser`, never SQL, so a regression in
the assignment rule engine surfaces as a seeding failure instead of being
silently bypassed. It refuses to run against any non-loopback endpoint.

## Output

Step-by-step progress lines prefixed with `==>`. On success it prints the dev server PID and log path (`/tmp/alkemio-dev-server.log`).

Report each step's outcome to the user. If the script fails, show the failing step and suggest checking `docker ps` or the server log.

## Troubleshooting

- **PostgreSQL timeout** — Docker may be slow. Re-run the script.
- **Kratos / GraphQL timeout** — Verify services with `docker ps`.
- **Volume not found** — Safe to ignore; volumes were already removed.
- **Admin registration fails** — Check `docker logs alkemio_dev_seed_roles` and `/tmp/alkemio-dev-server.log`.
- **Role seeding fails (step 6)** — The reset itself succeeded, but the script stops its dev server on exit. Start `pnpm start:dev` (if not already running), wait for it to come up, then re-run `pnpm run dev:seed-roles`. A `grant REJECTED (rule: …)` line is a **real finding** in the assignment rule engine, not a script bug — report it rather than working around it.
- **`grant REJECTED (rule: assigner-capability)` / `unable to grant '<privilege>'` as `admin@alkem.io`** — Check the account holds `platform-roles-admin`: `SELECT type FROM credential c JOIN "user" u ON u.id = c."actorId" WHERE u.email = 'admin@alkem.io';`. If it only has `account-admin` / `global-registered` / `user-self`, bootstrap never ran on the fresh DB (also: `SELECT count(*) FROM organization` returns 0). Restart the dev server so bootstrap runs — its credential grant loop runs on every start — then re-run `pnpm run dev:seed-roles`.
- **Port 4000 already taken before the reset** — Check `ss -ltnp | grep :4000` first. A pre-existing `pnpm start:dev` watcher keeps serving, the script's own server fails to bind, and the step-5 health checks pass against the stale server — so bootstrap never runs on the new DB and step 6 fails as above. Stop it before resetting.
