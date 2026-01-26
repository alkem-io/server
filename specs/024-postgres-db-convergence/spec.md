# Feature Specification: Postgres DB Convergence

**Feature Branch**: `024-postgres-db-convergence`
**Created**: 2025-11-20
**Status**: Draft
**Input**: User description: "I would like db backends to converge - from using mysql and postgres, to only postgres. In order to do that, we need to do a data migration for alkemio and kratos databases to compliant postgres structure and possibly create a new baseline migration after that, targeting postgres, as existing migrations may not work out of the box on postgres (double check that, please)."

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Single Postgres backend for Alkemio (Priority: P1)

Alkemio platform operators want to run the full Alkemio stack (application + identity) on a single Postgres database backend so that they no longer need to provision, maintain, and back up a separate MySQL instance.

**Why this priority**: This removes the operational overhead and risk of maintaining two database technologies and is a prerequisite for future database work (performance tuning, HA, backups) focused on Postgres only.

**Independent Test**: Deploy a fresh Alkemio environment where both the main Alkemio application schema and the Kratos schema are created and managed on Postgres only, with no MySQL server configured or contacted, and all existing automated tests for core flows pass.

**Acceptance Scenarios**:

1. **Given** an environment with only Postgres available, **When** the Alkemio stack (application and Kratos) is deployed using the documented procedure, **Then** all required schemas and tables are created successfully in Postgres and the applications start without database errors.
2. **Given** an operator following the deployment documentation, **When** they provision databases for a new installation, **Then** all instructions only require Postgres and no longer mention MySQL.

---

### User Story 2 - Migrate existing MySQL data to Postgres (Priority: P2)

Platform operators running Alkemio on MySQL today want to migrate their existing Alkemio and Kratos data to a supported Postgres schema so that they can switch to a Postgres-only deployment without losing data or re-onboarding users.

**Why this priority**: Without a supported migration path, existing installations are effectively blocked from converging on Postgres and would need to perform risky manual migrations.

**Independent Test**: Take a representative MySQL-based Alkemio + Kratos installation, run the documented migration procedure against a Postgres target, and verify that core user flows, sign-in flows, and critical content remain intact after the cut-over.

**Acceptance Scenarios**:

1. **Given** a production-like MySQL Alkemio and Kratos database with existing users and spaces, **When** the migration procedure is executed as documented, **Then** the resulting Postgres databases contain all migrated data required for normal operation and data integrity checks pass.
2. **Given** a migrated environment, **When** users log in and interact with key features (authentication, spaces, collaboration), **Then** their data and permissions behave identically to before migration.

---

### User Story 3 - Verified baseline migrations for Postgres (Priority: P3)

Developers and operators want a clear, validated baseline migration story for Postgres so that new environments can be bootstrapped on Postgres from scratch without relying on MySQL-compatible migration history.

**Why this priority**: Existing migrations may assume MySQL-specific behavior; having a Postgres-verified baseline or migration chain reduces surprises and makes environment setup more deterministic.

**Independent Test**: Run the agreed migration chain (or baseline) against an empty Postgres instance and verify that the resulting schema matches the expected application and Kratos requirements, and that contract tests for schema and core behaviors pass.

**Acceptance Scenarios**:

1. **Given** an empty Postgres instance, **When** the baseline or full migration sequence is executed according to the official procedure, **Then** the resulting schema is compatible with Alkemio and Kratos, and integration tests against this schema succeed.
2. **Given** the migration history in version control, **When** developers inspect the scripts and documentation, **Then** it is clear which migrations are considered Postgres-compatible and which are superseded by a new baseline.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- How do we handle installations that already use Postgres for Alkemio but still rely on MySQL for Kratos, including data alignment between the two systems?
- What happens if the migration reveals data that does not satisfy Postgres constraints (for example, invalid encodings, overly long strings, or values that violate new foreign keys)?
- How is rollback handled if a migration from MySQL to Postgres fails partway through, and what guarantees do we provide about partial data in the Postgres target?
- How do we phase out or archive legacy MySQL-specific migration scripts and documentation while still preserving the ability to troubleshoot existing installations?

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: The Alkemio application MUST support running with Postgres as the sole relational database backend in supported deployment topologies (no MySQL dependency).
- **FR-002**: The Kratos identity service used by Alkemio MUST be operable with a Postgres database that is compatible with the chosen Alkemio Postgres version and configuration.
- **FR-003**: There MUST be a documented and repeatable procedure to migrate existing Alkemio application data from MySQL to a Postgres schema that preserves all data required for normal operation.
- **FR-004**: There MUST be a documented and repeatable procedure to migrate existing Kratos data from MySQL to a Postgres schema such that users can continue to authenticate without re-registration.
- **FR-005**: The project MUST validate whether the existing Alkemio and Kratos migration chains are fully Postgres-compatible; any incompatible migrations MUST either be adapted or replaced by a clearly documented Postgres baseline.
- **FR-006**: New or updated migration artifacts MUST be accompanied by verification steps (e.g., contract or integration checks) that confirm they work on Postgres without relying on MySQL-specific behavior.
- **FR-007**: Deployment and operations documentation MUST be updated so that standard installation paths describe Postgres-only setups, with MySQL paths clearly marked as legacy or removed as appropriate.
- **FR-008**: The migration and deployment processes MUST be designed so that, for typical production-sized installations, the total hard downtime does not exceed 30 minutes and a phased or blue-green style cut-over is used to minimise perceived service interruption.

### Key Entities _(include if feature involves data)_

- **Alkemio Application Database Schema**: Represents all tables and relations used by the core Alkemio application (spaces, users, content, configurations) that currently exist in MySQL and must be mapped to an equivalent Postgres schema.
- **Kratos Identity Database Schema**: Represents all tables and relations used by Kratos to manage identities, credentials, sessions, and related metadata, currently stored in MySQL in some deployments and targeted to Postgres.
- **Migration Plan & Artifacts**: Conceptual entity covering the set of scripts, tools, and procedures that move data from MySQL to Postgres and/or establish a new Postgres baseline, including their versioning and validation.

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: New Alkemio + Kratos installations on Postgres can be provisioned and started successfully following the official documentation, with no MySQL services configured or required, in at least two independent test environments.
- **SC-002**: At least one representative existing MySQL-based Alkemio + Kratos environment is migrated to Postgres using the defined procedure, with 100% of critical user and content data (as defined in the migration verification checklist) verified as intact.
- **SC-003**: For a representative production-sized dataset taken from a production snapshot, the end-to-end migration from MySQL to Postgres for both Alkemio and Kratos completes within a target maintenance window (currently 30 minutes) and without irrecoverable data loss. Given current low active usage, this is treated as a target to validate on snapshot-based test runs rather than a hard SLA for this iteration.
- **SC-004**: After documentation and tooling are available, support or operations requests related specifically to "running Alkemio with MySQL" are reduced compared to the previous release cycle, indicating successful adoption of the Postgres-only path.
