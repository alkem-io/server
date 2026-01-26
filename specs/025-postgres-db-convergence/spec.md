# Feature Specification: Postgres DB Convergence – Schema-First & CSV Data Path

**Feature Branch**: `025-postgres-db-convergence`
**Created**: 2025-11-20
**Status**: Draft
**Input**: User description: "Create a new spec about Postgres DB convergence, taking into consideration 024-postgres-db-convergence. The outcome and the user stories will largely remain the same, but we need a different, solid approach: rely on TypeORM and Kratos for schema generation (run migrations over Postgres for Kratos, use a new baseline migration for Alkemio on Postgres) and then perform data migration via a commonly supported medium such as CSV imports."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Run Alkemio + Kratos on Postgres-only schemas (Priority: P1)

As a platform operator, I want to deploy Alkemio and Kratos using Postgres-only schemas that are generated directly from their respective schema sources (TypeORM migrations for Alkemio, Kratos migrations for identity) so that I do not need to maintain any MySQL-compatible schema history and can rely on a clearly defined Postgres baseline.

**Why this priority**: This is the foundation for database convergence: without a trustworthy Postgres-native schema for both Alkemio and Kratos, any data migration will be brittle and operationally risky.

**Independent Test**: Provision a fresh environment with Postgres only, apply the documented Kratos migrations to Postgres, apply the documented Alkemio Postgres baseline migration, and then start the stack. Verify that all schema contract tests and a representative subset of application tests pass using this Postgres-only setup.

**Acceptance Scenarios**:

1. **Given** an empty Postgres instance with databases for Alkemio and Kratos, **When** an operator applies the official Kratos migrations to the Kratos database and the Alkemio Postgres baseline migration to the Alkemio database, **Then** all required tables, indexes, and relationships are created successfully without manual editing.
2. **Given** a Postgres-only environment provisioned using these schema steps, **When** the standard deployment procedure for Alkemio and Kratos is executed, **Then** both services start without schema-related errors and basic smoke tests for sign-in and space browsing succeed.

---

### User Story 2 - Migrate existing MySQL data via CSV pipeline (Priority: P2)

As a platform operator running Alkemio and Kratos on MySQL today, I want a supported and well-documented migration procedure that exports data from MySQL, transforms it into CSV (or similarly neutral) files, and loads those into the Postgres schemas generated in User Story 1 so that I can converge to Postgres without hand-crafted SQL for each table.

**Why this priority**: A schema-only convergence is not sufficient for existing installations; a robust data migration path using widely supported formats like CSV reduces tooling risk and vendor lock-in.

**Independent Test**: Take a representative MySQL-based environment, execute the documented export → transform → CSV → import pipeline into a fresh Postgres instance prepared via the new schema baseline, and then run a structured verification checklist to confirm that identities, spaces, and core content behave as before.

**Acceptance Scenarios**:

1. **Given** production-like MySQL databases for Alkemio and Kratos, **When** operators run the documented export-and-transform procedure, **Then** they obtain a set of CSV files (and any required mapping metadata) that can be imported into Postgres without manual editing of each row.
2. **Given** a Postgres instance prepared with the Postgres-native schemas, **When** operators import the generated CSV files using the documented procedure, **Then** user accounts, spaces, memberships, and other critical data are present and pass integrity and spot checks defined in the migration verification checklist.

---

### User Story 3 - Repeatable migration with clear rollback and verification (Priority: P3)

As an operator planning production cut-over, I want the migration procedure (schema preparation + CSV-based data migration) to be repeatable on staging and to come with a clear verification and rollback plan so that I can estimate downtime, rehearse the migration, and confidently execute it in production.

**Why this priority**: The main operational risk is not just the migration algorithm but the ability to rehearse, validate, and roll back if needed. This user story focuses on operational safety.

**Independent Test**: On a staging environment cloned from production, run the full procedure multiple times and confirm that runbooks, verification checklists, and rollback guidance are sufficient for an independent operator to execute without intervention from the core development team.

**Acceptance Scenarios**:

1. **Given** a staging environment cloned from production MySQL, **When** operators follow the documented migration runbook end-to-end, **Then** the migration completes within the expected maintenance window and all items in the verification checklist can be marked as passing.
2. **Given** an in-progress migration that encounters a critical issue, **When** operators follow the rollback guidance, **Then** the system is safely returned to the pre-migration MySQL-backed state with no data loss beyond what is documented as acceptable for the maintenance window.

---

### Edge Cases

- How to handle rows in MySQL that violate constraints in the Postgres schema (for example, invalid encodings, values exceeding column lengths, or broken foreign-key relationships) during CSV export and import.
- What expectations are set for custom extensions or schema changes that individual deployments might have added on top of the standard Alkemio or Kratos schemas.
- How to handle partial or failed CSV imports (for example, interrupted import jobs, disk full situations, or malformed rows) so that operators can either resume safely or roll back.
- How to manage time zones, timestamp precision differences, and default values when data moves from MySQL into Postgres via CSV.

## Clarifications

### Session 2025-11-20

- Q: What level of support should we provide for non-standard/custom schema changes in existing Alkemio and Kratos deployments when running the migration? → A: Support only pristine, vanilla schemas.
- Q: How should we handle rows that violate new Postgres constraints during CSV import (e.g., invalid encodings, length overflows, FK breaks) in the first supported migration path? → A: Strict fail-fast; abort on first error.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: There MUST be a clearly defined Postgres baseline schema for the Alkemio application that can be applied to an empty Postgres database without relying on prior MySQL-focused migration history.
- **FR-002**: Kratos MUST be deployable on Postgres by applying its official migrations directly to a Postgres database, and this path MUST be documented as the supported way to obtain the Kratos schema for converged deployments.
- **FR-003**: The project MUST provide a supported procedure to export data from the existing MySQL Alkemio and Kratos databases into an intermediate, widely supported format (such as CSV files) suitable for import into Postgres.
- **FR-004**: The project MUST define and document how CSV (or equivalent) data is mapped from the MySQL schemas into the Postgres schemas, including any transformations (for example, enum mappings, NULLability changes, or identifier normalization).
- **FR-005**: The migration procedure MUST include guidance and scripts (or steps) to import the intermediate data into Postgres in a way that respects referential integrity and minimizes manual intervention.
- **FR-006**: The business outcomes from 024-postgres-db-convergence (Postgres-only backend for Alkemio + Kratos, safe migration path, and operator-focused runbooks) remain unchanged; this spec only replaces the technical approach (schema-first Postgres + CSV-based movement).
- **FR-007**: The solution MUST include a verification checklist for migrated environments that covers authentication flows, access to spaces, content integrity, and key authorization behaviors.
- **FR-008**: The solution MUST define an operator-facing rollback strategy that describes how to return to the pre-migration MySQL-backed system if a critical issue is discovered during or shortly after migration.

### Key Entities _(include if feature involves data)_

- **Alkemio Postgres Baseline Schema**: The target Postgres schema for the Alkemio application, established via a new baseline migration chain that is validated on Postgres and does not require MySQL compatibility.
- **Kratos Postgres Schema**: The Postgres schema produced by running Kratos migrations directly against Postgres, serving as the target for identity-related data after migration.
- **Intermediate Data Exports (CSV Files)**: The collection of exported tables or logical datasets (for example, users, spaces, memberships, content) in CSV or similar neutral format, along with any metadata needed to map them into Postgres.
- **Migration Runbook & Verification Checklist**: The operator-facing documentation and checklists that define the step-by-step process for export, transformation, import, verification, and rollback.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least two fresh environments are successfully provisioned using only the Postgres baseline for Alkemio and Kratos migrations for identity (no MySQL present), and they pass schema contract tests and a representative subset of functional tests.
- **SC-002**: At least one representative MySQL-based installation is migrated using the CSV-based pipeline into the Postgres-native schemas, and 100% of data points identified as critical in the verification checklist (for example, active user accounts, spaces, memberships, and core content) are confirmed to be present and correct.
- **SC-003**: On a production-sized dataset, a full rehearsal of the migration on staging (including export, transformation, import, verification, and potential rollback) completes within the targeted maintenance window agreed for convergence (for example, 30 minutes of hard downtime for the final cut-over), with clear measurements captured. **Implementation**: Complete migration runbook in `docs/DataManagement.md` includes timing estimates, rollback procedure tested in staging, and rehearsal guidance in `docs/QA.md`.
- **SC-004**: After the convergence approach is documented and adopted, new deployment guides for the converged path reference only Postgres for both Alkemio and Kratos, and operators report (through internal feedback channels) that the procedure is understandable and repeatable without needing bespoke SQL expertise. **Implementation**: Documentation updated in `docs/DataManagement.md`, `docs/Running.md`, and `specs/025-postgres-db-convergence/quickstart.md` with clear step-by-step procedures. Migration scripts include comprehensive README and inline documentation.
- **SC-005**: Validation of the migration pipeline is performed via rehearsed staging runs and operator checklists; no fully automated end-to-end migration validation is required. **Implementation**: Comprehensive 9-phase verification checklist created at `specs/025-postgres-db-convergence/verification-checklist.md` covering data integrity, authentication, authorization, core features, performance, and edge cases. Rehearsal procedure documented in `docs/QA.md` with success criteria and sign-off requirements.
