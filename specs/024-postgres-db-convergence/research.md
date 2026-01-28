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

## MySQL-Specific Constructs Identified

Analysis of the existing 94 TypeORM migrations revealed several MySQL-specific constructs that need attention for Postgres compatibility:

### Schema-Level Constructs

1. **Engine Specification**: `ENGINE=InnoDB` - Postgres does not use storage engines
2. **Character Sets**: `CHARSET` and collation specifications - Postgres uses different encoding approach
3. **DateTime Functions**: `CURRENT_TIMESTAMP(6)` with precision - Postgres syntax differs
4. **Auto-update Timestamps**: `ON UPDATE CURRENT_TIMESTAMP(6)` - Not directly supported in Postgres

### Data Type Differences

1. **TINYINT**: MySQL's `tinyint` for booleans (e.g., `tinyint NOT NULL`) - Postgres uses `boolean`
2. **DATETIME**: MySQL's `datetime(6)` - Postgres uses `timestamp` or `timestamptz`
3. **LONGTEXT**: MySQL's `longtext` - Postgres uses `text`
4. **CHAR vs VARCHAR**: Fixed-length `char(36)` for UUIDs - Postgres has native `uuid` type

### Index and Constraint Differences

1. **Unique Index Syntax**: `UNIQUE INDEX` declarations differ between databases
2. **Foreign Key Constraints**: Syntax variations in constraint definitions

### Implementation Approach

Given the extensive use of MySQL-specific syntax in the baseline migration (1730713372181-schemaSetup.ts), the recommended approach is:

1. **Keep existing migrations as-is** for MySQL backward compatibility
2. **Create Postgres-compatible versions** of critical migrations or a new baseline
3. **Use TypeORM's database-agnostic APIs** for new migrations going forward
4. **Leverage TypeORM's automatic schema generation** to create Postgres baseline

## Remaining Questions

- Final choice between a single new Postgres baseline vs. a short compatibility chain that adapts key historical migrations.
- Whether to maintain parallel migration chains or consolidate into a single cross-database compatible baseline.
