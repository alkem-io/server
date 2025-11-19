# Quickstart (Post-Implementation): Drop `accountUpn`

**Feature**: `016-drop-account-upn`
**Audience**: Operators verifying or replaying the change

## Prerequisites

- Working copy checked out at `016-drop-account-upn` (or a branch containing this change)
- Local services running (`pnpm run start:services`) and `.scripts/migrations/.env` configured

## Replay Steps

1. **Install & Build**
	- `pnpm install`
	- `pnpm build` (optional for CI parity)
2. **Apply Migration**
	- `pnpm run migration:run` (applies `1763587200000-removeAccountUpn`)
	- Rollback, if needed: `pnpm run migration:revert` (executes the down script to recreate/backfill `accountUpn`)
3. **Validate Schema & Data Snapshots**
	- `pnpm run schema:print && pnpm run schema:sort`
	- `./.scripts/migrations/export_to_csv.sh`
	- `./.scripts/migrations/run_validate_migration.sh` (ensures live tables match `reference_CSVs` + `db/reference_schema.sql`)
4. **Run Tests**
	- `pnpm test:ci`
5. **Smoke Check**
	- `git grep -n "accountUpn"` → expect no matches outside historical migrations
	- Monitor logs/dashboards for regressions (none observed as of 2025-11-19)

## Notes

- Schema artifacts (`schema.graphql`, `schema-lite.graphql`) are already regenerated; rerun the schema steps only if new changes are introduced.
- Reference CSVs live under `.scripts/migrations/reference_CSVs/`; refresh them after rerunning exports if you intentionally change baseline data.
