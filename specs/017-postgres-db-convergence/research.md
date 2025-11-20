# Research: Postgres DB Convergence

## Overview

This document consolidates decisions and findings required to converge Alkemio and Kratos database backends to Postgres.

## Decisions

### D-001: Target Postgres Version and Compatibility

- **Decision**: Target Postgres 17.5 as the baseline for both Alkemio and Kratos, aligned with the version currently used in `quickstart-services.yml` and development stacks.
- **Rationale**: Postgres 17.5 is the version already provisioned in local/dev Compose (`postgres:17.5`), ensuring consistency between planning, tooling, and runtime environments.
- **Alternatives considered**: Earlier Postgres LTS versions (12–16) for broader managed support; rejected as they diverge from the stack already in use and would introduce unnecessary heterogeneity.

### D-002: Migration Strategy from MySQL to Postgres

- **Decision**: Use an offline, snapshot-based migration approach per environment: take consistent MySQL backups, transform data to Postgres-compatible format (types, encodings, constraints), load into Postgres, then cut over application and Kratos to Postgres with a verified maintenance window.
- **Rationale**: Simplifies reasoning about data consistency, avoids dual-write complexity, and matches the need for a bounded downtime window.
- **Alternatives considered**: Online replication or dual-write strategies (higher complexity and operational risk for this scope).

### D-003: Handling MySQL-Specific Schema and Types

- **Decision**: Identify MySQL-specific constructs in existing migrations (e.g., `AUTO_INCREMENT`, engine/charset options, `TINYINT(1)` booleans) and either adapt them for Postgres or replace them with equivalent Postgres patterns in a new baseline chain.
- **Rationale**: Directly replaying all historical MySQL migrations on Postgres is likely to fail or produce suboptimal schemas; a curated baseline avoids surprises.
- **Alternatives considered**: Attempting to make all existing migrations cross-DB-compatible; rejected due to complexity and low long-term value once MySQL is deprecated.

### D-004: Kratos Database Alignment

- **Decision**: Align Kratos with its official Postgres support matrix and reuse its recommended migrations and configuration for Postgres, treating Alkemio and Kratos DBs as separate Postgres databases (or schemas) managed under a common Postgres cluster.
- **Rationale**: Reduces divergence from upstream Kratos guidance and simplifies upgrades.
- **Alternatives considered**: Customizing Kratos schema or co-locating tables in a single schema; rejected to avoid unsupported configurations.

### D-005: Verification and Rollback

- **Decision**: Define a concrete verification checklist (core user flows, content integrity checks, basic reporting) to run after migration, and keep the original MySQL instance in read-only or standby mode until Postgres is verified, with a documented rollback procedure.
- **Rationale**: Aligns with Constitution Principle 5 (operational readiness) and ensures operators have a safe fallback.
- **Alternatives considered**: Immediate decommission of MySQL after migration without verification; rejected as too risky.

## Remaining Questions

- Exact inventory of MySQL-specific migrations that are incompatible with Postgres (to be discovered by running migration validation against Postgres).
- Final choice between a single new Postgres baseline vs. a short compatibility chain that adapts key historical migrations.
