# Data Model: Postgres DB Convergence

## Entities

### Alkemio Application Database Schema

- **Description**: Logical grouping of all tables used by the core Alkemio application (spaces, users, content, configuration, events).
- **Key Considerations**:
  - Ensure all table definitions and constraints are Postgres-compatible.
  - Map MySQL-specific types (e.g., `TINYINT(1)`, `DATETIME`) to appropriate Postgres types (e.g., `BOOLEAN`, `TIMESTAMPTZ`).
  - Validate foreign keys and indexes for performance under Postgres.

### Kratos Identity Database Schema

- **Description**: Tables and relations managed by Ory Kratos for identities, credentials, sessions, and flows.
- **Key Considerations**:
  - Use upstream Kratos Postgres schema and migrations as the source of truth.
  - Maintain separate database or schema from Alkemio application tables.

### Migration Plan & Artifacts

- **Description**: Scripts, tools, configuration, and documentation for moving data from MySQL to Postgres and/or bootstrapping fresh Postgres environments.
- **Key Considerations**:
  - Idempotent migrations and clear versioning.
  - Ability to validate schemas and data integrity post-migration.

## Relationships

- Alkemio Application Schema and Kratos Schema live in the same Postgres 17.5 cluster but remain logically separated (different databases or schemas).
- Migration artifacts operate across both MySQL and Postgres instances, but runtime application access is only to Postgres after cut-over.

## Validation Rules

- All primary and foreign key constraints must be valid under Postgres and enforce referential integrity.
- String lengths and encodings must be compatible with Postgres defaults (e.g., UTF-8).
- Any new constraints introduced for Postgres (e.g., tighter NOT NULL or unique indexes) must be explicitly validated against existing MySQL data before migration.
