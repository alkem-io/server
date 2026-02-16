# Feature Specification: TypeORM to Drizzle ORM Migration

**Feature Branch**: `034-drizzle-migration`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Transition from typeORM to drizzle. Benchmark all tests, more for visibility than for clear go / no-go decision of the framework."

## Clarifications

### Session 2026-02-13

- Q: Which Drizzle query API style should be the primary approach for rewriting repository methods? → A: Dual-API strategy — use the relational query API (`db.query.*.findFirst()` / `db.query.*.findMany()`) for simple reads with relation loading (replaces `repository.find()` and `entityManager.findOne()` with `relations:`); use the SQL-like query builder (`db.select().from().where()`) for complex queries involving joins, aggregations, subqueries, pagination, and raw conditions (replaces `createQueryBuilder()` patterns). The relational API is preferred when it suffices because it provides type-safe relation loading; the SQL-like API is used when more control is needed.
- Q: Which PostgreSQL driver should Drizzle use? → A: postgres.js — newer, faster, native ESM.
- Q: How should TypeORM-specific features with no direct Drizzle equivalent (eager loading, cascading, subscribers, lifecycle hooks) be handled? → A: Replicate via Drizzle hooks/middleware (`$onUpdate`, custom hooks) where available; raw SQL triggers for the rest.
- Q: What migration tooling strategy should replace TypeORM's migration infrastructure? → A: Drizzle Kit — use `drizzle-kit generate` / `drizzle-kit migrate`, introspecting the existing schema as baseline.
- Q: How should Drizzle schema definition files be organized? → A: Co-located with domain modules — each schema file lives next to its corresponding entity/module (e.g., `src/domain/space/space.schema.ts`).
- Q: How should raw SQL queries or query builder patterns that rely on TypeORM internals be handled? → A: Rewrite all raw/query-builder patterns to Drizzle's SQL-like query builder API — no raw SQL escape hatches.
- Q: What if Drizzle Kit produces structurally different schema (e.g., different index/constraint naming)? → A: Accept Drizzle Kit's naming conventions and document all differences.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Migrate Data Access Layer to Drizzle ORM (Priority: P1)

As a development team member, I want the server's data access layer migrated from TypeORM to Drizzle ORM so that the team gains hands-on experience with Drizzle's developer ergonomics, type safety, and query performance characteristics in the context of the Alkemio codebase.

**Why this priority**: The migration itself is the core deliverable. Without it, no benchmarking or evaluation is possible. This story establishes the foundation for all subsequent analysis.

**Independent Test**: Can be validated by confirming the server starts, connects to PostgreSQL, and serves GraphQL queries using Drizzle-backed repositories instead of TypeORM.

**Acceptance Scenarios**:

1. **Given** the existing TypeORM entity definitions, **When** the migration is complete, **Then** equivalent Drizzle schema definitions exist for all entities currently mapped by TypeORM.
2. **Given** the existing repository layer, **When** the migration is complete, **Then** all repository methods use Drizzle query builders instead of TypeORM APIs.
3. **Given** the migrated codebase, **When** the server starts, **Then** it connects to PostgreSQL and responds to GraphQL queries without errors.
4. **Given** the migrated codebase, **When** database migrations are run, **Then** the resulting schema is identical to the TypeORM-generated schema (no data loss, no structural differences).

---

### User Story 2 - Benchmark Test Suite Performance (Priority: P1)

As a technical stakeholder, I want a side-by-side benchmark comparing test suite execution times under TypeORM vs. Drizzle so that the team has visibility into performance differences for future decision-making.

**Why this priority**: Benchmarking is the explicit goal stated by the user. This is a co-equal deliverable with the migration itself, providing the data needed for informed future decisions.

**Independent Test**: Can be validated by reviewing a benchmark report that contains before/after timing data for the full test suite.

**Acceptance Scenarios**:

1. **Given** the existing test suite on the TypeORM branch, **When** the full test suite is executed, **Then** baseline execution times are recorded per test file and in aggregate.
2. **Given** the migrated Drizzle codebase, **When** the same test suite is executed, **Then** execution times are recorded per test file and in aggregate.
3. **Given** both sets of timing data, **When** the benchmark report is generated, **Then** it shows per-file and aggregate comparisons with percentage differences.
4. **Given** the benchmark report, **When** a stakeholder reviews it, **Then** they can understand relative performance characteristics without needing to run the tests themselves.

---

### User Story 3 - Ensure All Existing Tests Pass (Priority: P1)

As a developer, I want all existing unit and integration tests to pass after the Drizzle migration so that we have confidence the migration preserves existing behavior.

**Why this priority**: Passing tests are the primary correctness signal. If tests fail after migration, neither the migration nor the benchmark data can be trusted.

**Independent Test**: Can be validated by running the full test suite (`pnpm test:ci`) and confirming a zero-failure result.

**Acceptance Scenarios**:

1. **Given** the migrated codebase, **When** the full CI test suite runs, **Then** all tests that passed on the TypeORM branch also pass on the Drizzle branch.
2. **Given** any test that requires modification for Drizzle compatibility, **When** the test is updated, **Then** it validates the same business behavior as the original test.
3. **Given** the test results, **When** compared with the TypeORM baseline, **Then** no previously passing test is skipped or deleted without documented justification.

---

### User Story 4 - Produce Migration Effort Summary (Priority: P2)

As a technical lead, I want a summary of the migration effort (files changed, patterns encountered, pain points) so that the team can estimate the cost and risk of a full production migration if pursued later.

**Why this priority**: While not the primary deliverable, this qualitative data complements the benchmark numbers and provides context for future migration decisions.

**Independent Test**: Can be validated by reviewing a summary document that catalogs migration patterns, issues encountered, and effort observations.

**Acceptance Scenarios**:

1. **Given** the completed migration, **When** the effort summary is produced, **Then** it lists the categories of changes made (schema definitions, query patterns, transaction handling, migration tooling, etc.).
2. **Given** the effort summary, **When** reviewed by a team member unfamiliar with Drizzle, **Then** they can understand the scope and nature of changes required for a TypeORM-to-Drizzle migration.

---

### Edge Cases

- **TypeORM features without direct Drizzle equivalents** (eager loading, cascading, subscribers, lifecycle hooks like `@BeforeInsert`/`@AfterLoad`): Replicate using Drizzle's built-in hooks/middleware (`$onUpdate`, custom hooks) where available; use database-level SQL triggers (DDL, managed outside the ORM) for behaviors that cannot be expressed in Drizzle's API. Document each substitution in the migration effort summary.
- **Raw SQL / TypeORM query builder patterns in application code**: Rewrite all application-level query patterns to Drizzle's query builder APIs (relational or SQL-like) — no raw SQL escape hatches (`sql` tagged templates) in service code. **Clarification**: database-level triggers (DDL) for lifecycle behavior are permitted; raw SQL *queries* in application code are not.
- **Schema naming divergence**: Accept Drizzle Kit's naming conventions for indices, constraints, and other generated names. Document all naming differences between TypeORM-generated and Drizzle Kit-generated schemas in the migration effort summary. Functional equivalence (same columns, types, relationships) is required; exact name parity is not.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST define Drizzle schema files that map all existing TypeORM entities, preserving column types, constraints, indices, and relationships.
- **FR-002**: System MUST replace all TypeORM repository and query builder usage with Drizzle's SQL-like query builder API (`db.select()`, `db.insert()`, `db.update()`, `db.delete()`) in service and repository layers.
- **FR-003**: System MUST preserve the existing database schema exactly — no column, index, or constraint changes beyond naming convention differences documented explicitly.
- **FR-004**: System MUST produce a benchmark report containing per-test-file and aggregate execution times for both TypeORM (baseline) and Drizzle (migrated) runs.
- **FR-005**: System MUST pass all existing tests that passed under TypeORM, with any test modifications documented and justified.
- **FR-006**: System MUST maintain all existing NestJS module boundaries and dependency injection patterns — Drizzle integration MUST be injectable via NestJS providers.
- **FR-007**: System MUST handle all existing transaction patterns (including nested transactions if present) using Drizzle's transaction API.
- **FR-008**: System MUST replace TypeORM migration infrastructure with Drizzle Kit (`drizzle-kit generate` / `drizzle-kit migrate`), using introspection of the existing database schema as the baseline.
- **FR-009**: The benchmark report MUST be reproducible — another developer MUST be able to re-run the benchmark using documented steps.

### Key Entities

- **Drizzle Schema Definitions**: Replacements for TypeORM `@Entity()` decorated classes, co-located with their domain modules (e.g., `src/domain/space/space.schema.ts`), defining tables, columns, relations, and indices using Drizzle's `pgTable()` API.
- **Drizzle Client/Connection**: The configured Drizzle instance (using `postgres.js` driver) replacing TypeORM's `DataSource`, managing connection pooling and query execution.
- **Benchmark Report**: A structured document containing timing data, test pass/fail counts, and comparison metrics between the two ORM implementations.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of previously passing tests pass under the Drizzle implementation with zero behavior changes.
- **SC-002**: Benchmark report covers all test files and provides aggregate timing comparison with percentage difference.
- **SC-003**: The migrated server starts and serves GraphQL queries against the database without errors.
- **SC-004**: All entity relationships (one-to-one, one-to-many, many-to-many) are correctly represented in Drizzle schema definitions and return identical query results.
- **SC-005**: A developer unfamiliar with the migration can reproduce the benchmark by following the documented steps within 30 minutes of setup time.
- **SC-006**: Migration effort summary identifies at least the following categories: schema translation patterns, query translation patterns, transaction handling, and migration tooling differences.

## Assumptions

- The existing PostgreSQL 17.5 database and schema remain unchanged; this is an ORM layer replacement, not a database migration.
- Drizzle ORM supports all PostgreSQL features currently used by the codebase (JSON columns, array types, enums, etc.). Any unsupported features will be documented as findings.
- The benchmark comparison is for visibility and team knowledge — it is explicitly not intended as a pass/fail gate for adopting Drizzle.
- Test modifications needed for Drizzle compatibility are acceptable as long as they test the same business behavior and are documented.
- The `drizzle` branch already exists as a working branch for this effort; the feature branch `034-drizzle-migration` is created from it.

## Scope Boundaries

### In Scope

- Replacing TypeORM with Drizzle ORM across the entire data access layer
- Benchmarking the full test suite (unit + integration) before and after migration
- Producing a benchmark report and migration effort summary
- Ensuring all existing tests pass

### Out of Scope

- Production deployment of the Drizzle migration
- Performance optimization beyond what Drizzle provides out of the box
- Adding new features or tests not present in the TypeORM codebase
- Migrating away from NestJS or changing the GraphQL layer
- Making a final go/no-go decision on Drizzle adoption (this is explicitly a visibility exercise)
