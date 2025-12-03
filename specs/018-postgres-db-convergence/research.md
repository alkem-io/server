# Research: Postgres DB Convergence – Schema-First & CSV Data Path

## Clarified Unknowns

### Postgres Version Support Range

- Decision: Target PostgreSQL 17.5 as the officially supported range, while keeping scripts compatible with the minimum version used in current Hetzner clusters.
- Rationale: Aligns with maintained Postgres versions and cloud offerings; avoids older unsupported versions.
- Alternatives considered: Supporting a wider range down to Postgres 12 (adds complexity and testing burden) or locking to a single exact minor version.

### Storage Location for CSV Exports

- Decision: Treat local filesystem paths (mounted volumes) as the primary supported CSV storage, with explicit guidance for operators who want to sync those files to object storage (e.g., S3-compatible) as an optional, out-of-scope step.
- Rationale: Keeps the migration pipeline simple and portable; avoids baking cloud-specific APIs into the core server.
- Alternatives considered: First-class S3 integration (adds credentials, retries, and failure modes), database BLOB storage (complicates schema and performance).

### Staging Validation Tooling

- Decision: Reuse existing schema contract tests, migration validation scripts under `scripts/migrations/`, and targeted Jest integration tests for critical data mapping; avoid introducing a separate dedicated validation service.
- Rationale: Builds on tooling already in this repo, reduces maintenance overhead, and fits the constitution’s preference for pragmatic testing.
- Alternatives considered: Custom validation microservice (too heavy), manual SQL-only verification (error-prone and not repeatable).

### Maintenance Window SLO

- Decision: Use a working assumption of ≤30 minutes hard downtime for the final cut-over window, to be confirmed per deployment via rehearsal runs and updated in runbooks.
- Rationale: Matches typical expectations for major DB migrations while leaving room for optimization.
- Alternatives considered: Strictly lower downtime (e.g., near-zero) via live dual-write or replication strategies, which are out of scope for this CSV-based batch migration.

## Technology Best Practices

### TypeORM & Postgres Baseline

- Decision: Generate a dedicated Postgres baseline migration for Alkemio, validated against an empty Postgres database, and keep it separate from legacy MySQL history.
- Rationale: Avoids MySQL compatibility constraints, ensures a clean starting point for converged deployments.
- Alternatives considered: Reusing MySQL-oriented migrations (risk of subtle incompatibilities), manual SQL schema.

### Kratos Migrations on Postgres

- Decision: Treat the official Kratos migrations as the single source of truth for the identity schema on Postgres and document the exact commands/versions used.
- Rationale: Reduces divergence risk and leverages Ory’s own schema evolution process.
- Alternatives considered: Forking or modifying Kratos DB schema (too risky, hard to maintain).

### CSV Export/Import Pipeline

- Decision: Implement an explicit export → transform → CSV → import pipeline that is deterministic and idempotent, failing fast on the first constraint violation.
- Rationale: CSV is widely supported, easy to inspect, and works across databases; fail-fast behavior prevents silent corruption.
- Alternatives considered: Direct cross-DB replication tools (e.g., Debezium, DMS) or ad-hoc SQL scripts per table.

## Decisions Snapshot

- Postgres is the single converged target for both Alkemio and Kratos.
- Alkemio schema is defined via a Postgres-first TypeORM baseline migration.
- Kratos schema is produced exclusively via its official Postgres migrations.
- Data moves from MySQL to Postgres via a CSV pipeline using local filesystem storage.
- Validation leverages existing contract tests and migration tooling, plus targeted data integrity checks.
- Operational runbooks will assume a ≤30-minute cut-over window, to be verified in staging rehearsals.
