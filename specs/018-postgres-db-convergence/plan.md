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
**Primary Dependencies**: NestJS, TypeORM, Ory Kratos migrations, Docker + Compose, MySQL 8, PostgreSQL 17.5 (NEEDS CLARIFICATION on exact PG version support range)
**Storage**: MySQL (source), PostgreSQL (target) for Alkemio and Kratos; ntermediate CSV files stored on local disk on the migration runner; S3/object storage not in scope for this feature.
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

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                            | Why Needed | Simpler Alternative Rejected Because |
| ------------------------------------ | ---------- | ------------------------------------ |
| _(none identified at planning time)_ |            |                                      |
