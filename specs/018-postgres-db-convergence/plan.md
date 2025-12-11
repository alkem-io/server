# Implementation Plan: Postgres DB Convergence – Schema-First & CSV Data Path

**Branch**: `018-postgres-db-convergence` | **Date**: 2025-11-20 | **Spec**: `specs/018-postgres-db-convergence/spec.md`
**Input**: Feature specification from `/specs/018-postgres-db-convergence/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Establish a Postgres-native baseline schema for Alkemio using TypeORM migrations, rely on official Kratos migrations for a Postgres identity schema, and provide a repeatable CSV-based pipeline to migrate data from existing MySQL deployments into these Postgres schemas with verification and rollback guidance.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x on Node.js 20 (NestJS server)
**Primary Dependencies**: NestJS, TypeORM, Ory Kratos migrations, Docker + Compose, MySQL 8, PostgreSQL 17.5 (minimum supported: PostgreSQL 14.x)
**Storage**: MySQL (source), PostgreSQL (target) for Alkemio and Kratos; intermediate CSV files stored on local disk on the migration runner; S3/object storage not in scope for this feature.
**Testing**: Jest test suites (`pnpm test:ci`), schema contract tests under `contract-tests/`, migration validation scripts under `scripts/migrations/`. This migration is one-off; primary validation happens via manual rehearsals and runbooks on staging environments. Automated tests are limited to high-signal helpers (e.g., CSV transforms), not full end-to-end migration.
**Target Platform**: Linux server deployments via Docker/Kubernetes (Hetzner clusters) running Postgres-backed Alkemio + Kratos
**Project Type**: Single NestJS backend service with external Kratos, plus migration/runbook tooling
**Performance Goals**: Hard maintenance window target: ≤30 minutes downtime for final cut-over on a production-sized dataset, normal runtime performance must be at least on par with current MySQL-backed setups
**Constraints**: Zero tolerance for silent data loss, strict fail-fast on constraint violations during CSV import, support only pristine vanilla schemas (no custom DB extensions), migrations must be idempotent and automatable via CI/CD
**Scale/Scope**: Existing production-scale deployments (potentially millions of rows across core tables, thousands of users/spaces); limited to core Alkemio + Kratos data domains for this convergence wave

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Domain boundaries: All new convergence logic that encodes migration invariants (e.g., how entities map between MySQL and Postgres schemas, required integrity checks) must live in dedicated domain services under `src/domain` (e.g., migration/convergence domain) with application services and scripts acting only as orchestrators. No direct repository calls or business rules in controllers, CLI entrypoints, or scripts.
- Observability: Reuse existing logging infrastructure (Winston + Elastic APM) with structured log contexts for migration runs (correlation ID for each run, source/target database identifiers, step name, and outcome). Rely on logs and existing infrastructure alerts for failure visibility; do not introduce new metrics/dashboards unless we explicitly wire them into the current observability stack.
- Testing: Add or extend automated tests to cover schema-baseline assumptions (e.g., migration validation scripts against Postgres), core data-mapping rules (unit/integration tests around CSV export/import transformations), and smoke tests for a Postgres-only deployment path. For lower-risk operator documentation (runbooks/checklists), testing is primarily via rehearsed staging runs documented in the spec/PR, not unit tests.

## Project Structure

- The migration scripts and CSV mapping are treated as infrastructure/utility tooling specific to the one-off MySQL→Postgres convergence. They live under .scripts/migrations/_ and supporting helpers under src/library/_ or src/common/\*, and DO NOT define or change general business invariants for the live application domain.

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── domain/
│   ├── [existing aggregates & repositories]
│   └── [potential migration/convergence domain services for schema & data mapping]
├── services/
│   ├── api-*/
│   └── [potential CLI or admin-facing orchestrators for migration flows]
├── core/
│   └── [shared error handling, configuration, and database connection abstractions]
├── common/
│   └── [cross-cutting utilities reused by migration tooling]
└── library/
  └── [pure helpers for CSV handling and data transformation, if needed]

scripts/
├── migrations/
│   ├── [existing MySQL migrations]
│   └── [new Postgres baseline migration generation & validation scripts]
└── schema/
  └── [schema diffing & contract tooling reused for convergence validation]

specs/018-postgres-db-convergence/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

**Structure Decision**: Reuse the existing NestJS backend layout under `src/` with additions focused on a migration/convergence domain and scripting under `scripts/migrations/`. No new top-level projects are introduced; this feature is scoped to backend + operational tooling only.

## Postgres Baseline Migration Strategy

### Alkemio Schema Baseline

The existing TypeORM migrations in `src/migrations/` already support both MySQL and PostgreSQL through the dual-database configuration in `src/config/typeorm.cli.config.run.ts`. The convergence strategy leverages this existing capability:

**Current State:**

- Migration files in `src/migrations/` are database-agnostic TypeORM migrations
- The `typeormCliConfig` in `typeorm.cli.config.run.ts` supports both 'mysql' and 'postgres' database types
- Database type is determined by `DATABASE_TYPE` environment variable (defaults to 'postgres')
- All existing migrations can be applied to a fresh Postgres database to establish the baseline schema

**Baseline Generation Approach:**

1. **Use Existing Migrations**: The current migration files (`1730713372181-schemaSetup.ts` and subsequent) serve as the Postgres baseline
2. **Clean Slate Application**: Apply all existing migrations to a fresh Postgres database using `pnpm run migration:run`
3. **Validation**: Use TypeORM's migration:show and schema contract tests to verify completeness
4. **No New Baseline Migration Needed**: Since migrations are already database-agnostic, no separate "Postgres baseline" migration file is required

**Migration Execution:**

```bash
# Set Postgres as target database
export DATABASE_TYPE=postgres
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
export DATABASE_USERNAME=alkemio
export DATABASE_PASSWORD=alkemio
export DATABASE_NAME=alkemio

# Apply all migrations to fresh Postgres database
pnpm run migration:run
```

**Validation Steps:**

1. Verify all migrations applied: `pnpm run migration:show`
2. Run schema contract tests: Located in `contract-tests/`
3. Compare schema with baseline: Use `pnpm run schema:print` and `pnpm run schema:diff`
4. Run migration validation script: `.scripts/migrations/run_validate_migration.sh`

### Kratos Schema Baseline

**Official Ory Kratos Migrations:**

- Kratos provides official SQL migrations for PostgreSQL
- Migrations are applied using Kratos CLI or Docker initialization
- Documentation: https://www.ory.sh/docs/kratos/manage-identities/migrations

**Application Steps:**

1. Use Kratos container with auto-migration on startup:

   ```yaml
   command:
     - serve
     - --config
     - /etc/config/kratos/kratos.yml
     - migrate
     - sql
     - -e
     - --yes
   ```

2. Or run migrations manually:
   ```bash
   kratos migrate sql -e --yes --config /path/to/kratos.yml
   ```

**Verification:**

- Check migrations table: `SELECT * FROM _kratos_migrations;`
- Verify core tables exist: `identities`, `identity_credentials`, `sessions`, etc.
- Run Kratos health check: `curl http://kratos:4433/health/ready`

### Schema Compatibility Notes

**TypeORM Postgres Specifics:**

- Uses `SERIAL` for auto-increment instead of MySQL's `AUTO_INCREMENT`
- Boolean types are native `BOOLEAN` instead of `TINYINT(1)`
- Timestamp precision matches or exceeds MySQL capabilities
- JSON/JSONB types are first-class citizens
- Case-sensitive string comparisons by default (use LOWER() for case-insensitive)

**Migration Script Adjustments:**

- CSV export scripts must handle type differences (boolean representation, timestamps)
- Import scripts must set correct Postgres sequence values after bulk insert
- Transformation helpers in `src/library/postgres-convergence/` handle these conversions

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                            | Why Needed | Simpler Alternative Rejected Because |
| ------------------------------------ | ---------- | ------------------------------------ |
| _(none identified at planning time)_ |            |                                      |
