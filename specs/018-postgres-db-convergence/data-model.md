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

## CSV Export/Import Mapping

### Data Type Transformations

The following data type conversions are required when moving from MySQL to PostgreSQL via CSV:

#### Boolean Values

- **MySQL**: Stored as `TINYINT(1)` with values 0 or 1
- **CSV Format**: Export as "0" or "1" (string)
- **Postgres Import**: Convert to `true`/`false` or `t`/`f` for BOOLEAN type
- **Examples**:
  - MySQL: `enabled = 1` → CSV: `"1"` → Postgres: `true`
  - MySQL: `verified = 0` → CSV: `"0"` → Postgres: `false`

#### Timestamps

- **MySQL**: DATETIME or TIMESTAMP types (typically stored in UTC)
- **CSV Format**: ISO 8601 format with timezone (e.g., "2024-01-15T10:30:00Z")
- **Postgres Import**: TIMESTAMP WITH TIME ZONE
- **Handling**:
  - Preserve timezone information
  - Convert NULL timestamps to empty strings in CSV
  - MySQL DATETIME without timezone assumed UTC

#### JSON/JSONB Fields

- **MySQL**: JSON type or TEXT fields containing JSON
- **CSV Format**: Escaped JSON string
- **Postgres Import**: JSONB type (preferred) or JSON
- **Handling**:
  - Double-quote escaping: `{"key":"value"}` → `"{""key"":""value""}"`
  - Validate JSON structure before import
  - Empty JSON objects as `{}`, not NULL

#### NULL Values

- **CSV Format**: Empty string (no quotes) or explicit `\N`
- **Handling**: Consistent across all fields
- **Convention**: Use `\N` for NULL to distinguish from empty strings

#### UUID/Primary Keys

- **MySQL**: VARCHAR(36) for UUIDs, INT/BIGINT for auto-increment
- **CSV Format**: Preserve as-is (string representation)
- **Postgres Import**: UUID type or appropriate integer type
- **Handling**:
  - Validate UUID format (8-4-4-4-12 hexadecimal)
  - Preserve exact values for foreign key integrity

### Table Export Order (Dependency-Aware)

Export must follow foreign key dependencies to enable clean import:

**Alkemio Core Tables (Phase 1 - Foundation):**

1. `platform` - Platform configuration (no dependencies)
2. `storage_bucket` - File storage configuration
3. `agent` - Agent entities
4. `profile` - User/Organization/Space profiles
5. `authorization_policy` - Authorization rules
6. `tagset` - Tag collections

**Alkemio User & Organization Tables (Phase 2):** 7. `user` - User accounts (references: profile, agent, authorization_policy) 8. `organization` - Organizations (references: profile, agent, authorization_policy) 9. `user_group` - User groups 10. `organization_verification` - Org verification status

**Alkemio Space Tables (Phase 3):** 11. `space` - Spaces/communities (references: profile, agent, authorization_policy, user, organization) 12. `community` - Community configuration 13. `role_set` - Role definitions 14. `application` - Space applications 15. `invitation` - Space invitations

**Alkemio Content Tables (Phase 4):** 16. `callout` - Callouts (references: space, authorization_policy) 17. `post` - Posts (references: callout) 18. `whiteboard` - Whiteboards (references: callout) 19. `comment` - Comments (references: post) 20. `reference` - References/links 21. `document` - Documents 22. `storage_aggregator` - Storage aggregations

**Alkemio Activity Tables (Phase 5):** 23. `activity_log` - Activity logs 24. `notification` - Notifications 25. `room` - Communication rooms

### Kratos Tables

Export Kratos tables independently (separate database):

1. `identities` - User identities (no dependencies)
2. `identity_credentials` - Credentials (references: identities)
3. `identity_credential_identifiers` - Credential identifiers
4. `identity_verifiable_addresses` - Verified addresses
5. `identity_recovery_addresses` - Recovery addresses
6. `sessions` - User sessions (references: identities)
7. `session_devices` - Session devices

### CSV File Naming Convention

Format: `<table_name>_<timestamp>.csv`

Examples:

- `user_20250121_120000.csv`
- `space_20250121_120000.csv`
- `identities_20250121_120000.csv`

Metadata file: `migration_manifest_<timestamp>.json` containing:

```json
{
  "migrationId": "uuid",
  "sourceDatabase": "mysql",
  "targetDatabase": "postgres",
  "exportTimestamp": "2025-01-21T12:00:00Z",
  "tables": [
    { "name": "user", "rowCount": 1500, "file": "user_20250121_120000.csv" },
    { "name": "space", "rowCount": 450, "file": "space_20250121_120000.csv" }
  ]
}
```

### Column Mapping Examples

**User Table:**

```
MySQL: id, nameID, email, verified (TINYINT), createdDate (DATETIME)
CSV:   "uuid-123","john-doe","john@example.com","1","2024-01-15T10:30:00Z"
Postgres: id (UUID), nameID (VARCHAR), email (VARCHAR), verified (BOOLEAN), createdDate (TIMESTAMPTZ)
```

**Space Table:**

```
MySQL: id, nameID, settings (JSON), visibility (ENUM)
CSV:   "uuid-456","innovation-space","{\"privacy\":\"public\"}","ACTIVE"
Postgres: id (UUID), nameID (VARCHAR), settings (JSONB), visibility (VARCHAR)
```

### Import Process

1. **Pre-Import Validation:**
   - Verify all CSV files present and readable
   - Check CSV format (delimiters, quote characters, line endings)
   - Validate row counts match manifest
   - Verify no duplicate primary keys

2. **Import Execution:**
   - Disable foreign key checks temporarily (Postgres: `SET session_replication_role = 'replica';`)
   - Import in dependency order (phases 1-5 for Alkemio, separate for Kratos)
   - Use Postgres `COPY` command for performance
   - Apply transformations during import (boolean conversion, timestamp parsing)

3. **Post-Import Validation:**
   - Re-enable foreign key checks (`SET session_replication_role = 'origin';`)
   - Update sequences: `SELECT setval('table_id_seq', (SELECT MAX(id) FROM table));`
   - Verify foreign key integrity
   - Compare row counts: source vs target
   - Run constraint checks

4. **Error Handling:**
   - Fail-fast on first constraint violation
   - Log exact row number and error details
   - Rollback transaction on failure
   - Generate error report with affected records

## Relationships & Constraints

- User → Spaces: many-to-many via memberships; preserved across MySQL → CSV → Postgres.
- Spaces → Content: one-to-many; foreign keys must be valid in Postgres baseline.
- Kratos identities must map cleanly to Alkemio user records where applicable, with stable identifiers.

## Validation Rules

- No orphaned memberships (every membership references existing user and space).
- No content rows with missing parent space.
- Timestamps and time zones must be preserved consistently between MySQL and Postgres.
- Any row violating target constraints aborts the import with a clear, logged error.
