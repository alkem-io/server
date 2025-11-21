# Data Model: Postgres DB Convergence

## Core Entities

### Alkemio Postgres Baseline Schema

- Represents all application tables required for Alkemio runtime on Postgres.
- Derived from TypeORM entities with a dedicated Postgres baseline migration.
- Includes core domains: users, spaces, memberships, content, activity, and related indices/constraints.

### Kratos Postgres Schema

- Identity-related tables as created by official Kratos Postgres migrations.
- Includes identities, credentials, sessions, flows, and related configuration tables.

### Intermediate Data Exports (CSV)

- Logical datasets organized by concern, e.g.:
  - `users.csv`
  - `spaces.csv`
  - `memberships.csv`
  - `content.csv`
  - `identity.csv` (Kratos identities)
- Each CSV has a well-defined column mapping to the target Postgres schema.

### Migration Run Metadata

- Optional tables or files describing migration runs, including:
  - Run identifier
  - Source and target connection details (non-sensitive descriptors)
  - Start/end timestamps
  - Step outcomes and error summaries

## Relationships & Constraints

- User → Spaces: many-to-many via memberships; preserved across MySQL → CSV → Postgres.
- Spaces → Content: one-to-many; foreign keys must be valid in Postgres baseline.
- Kratos identities must map cleanly to Alkemio user records where applicable, with stable identifiers.

## Validation Rules

- No orphaned memberships (every membership references existing user and space).
- No content rows with missing parent space.
- Timestamps and time zones must be preserved consistently between MySQL and Postgres.
- Any row violating target constraints aborts the import with a clear, logged error.
