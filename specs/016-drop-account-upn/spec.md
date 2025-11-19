# Feature Specification: Drop `accountUpn` column and sanitize usage

**Feature Branch**: `016-drop-account-upn`
**Created**: 2025-11-18
**Status**: Implemented (2025-11-19)
**Outcome**: Dropped the `accountUpn` column (migration `1763587200000-removeAccountUpn`), removed every remaining reference, regenerated the schema, refreshed migration-validation assets, and re-ran `pnpm test:ci` plus `./.scripts/migrations/run_validate_migration.sh` to prove parity.

## User Scenarios & Testing

### User Story 1 - Safely remove unused account identifier (Priority: P1)

Platform operators want to remove the `accountUpn` column from the database and associated code paths without breaking any existing user flows or integrations.

**Why this priority**: The field is believed to be unused, but if this assumption is wrong, silent breakage could impact authentication, account linking, or reporting. We need a controlled removal with explicit verification.

**Independent Test**: Apply the migration and run the automated suite on representative data; ensure no `accountUpn` errors appear and all sign-in/account flows still pass.

**Acceptance Scenarios**:

1. **Given** a system where `accountUpn` has been removed from the schema, **When** all standard user authentication and account management flows are executed, **Then** no runtime errors or failed flows occur due to the missing column.
2. **Given** existing application logs and monitoring dashboards, **When** the feature is deployed, **Then** no new error spikes related to `accountUpn` appear.

---

### User Story 2 - Confirm actual usage of `accountUpn` (Priority: P2)

Developers and maintainers need a clear understanding of whether `accountUpn` is actually used anywhere in the codebase or data flows before and after removal.

**Why this priority**: Accurate knowledge of current usage reduces the risk of regressions and avoids reintroducing the field later due to missed dependencies.

**Independent Test**: Search code/config for `accountUpn`, review database samples, and document every usage before removal.

**Acceptance Scenarios**:

1. **Given** the current codebase and relevant scripts/configurations, **When** a search for `accountUpn` is performed, **Then** all occurrences are either removed or updated to alternative identifiers prior to migration.

---

### User Story 3 - Provide alternative logic where needed (Priority: P3)

Where `accountUpn` is discovered to be in use, maintainers need replacement logic (for example, using other stable account identifiers) so that behavior remains correct after the column is removed.

**Why this priority**: Any genuine usage must be preserved to avoid user-facing issues or data integrity problems.

**Independent Test**: For each former `accountUpn` flow, verify it now uses the documented replacement identifier and produces the same outcome.

**Acceptance Scenarios**:

1. **Given** a feature or script that previously referenced `accountUpn`, **When** it runs after the migration, **Then** it uses the agreed replacement identifier and produces equivalent functional outcomes.

---

### Edge Cases

- Backups and exports may continue to store historical `accountUpn` data; those archives remain untouched by this feature.
- Rollbacks must recreate the column and backfill from `email` to preserve compatibility.
- External tools or ad-hoc queries referencing `accountUpn` require communication or documentation updates once the field is removed.

## Requirements

### Functional Requirements

- **FR-001**: System MUST remove the `accountUpn` column from the database schema in a controlled manner without breaking existing supported user flows.
- **FR-002**: System MUST include a documented analysis of all current `accountUpn` usages in code, configuration, and database-related scripts before the column is dropped.
- **FR-003**: For every confirmed usage of `accountUpn`, the system MUST replace it with a clearly defined alternative identifier (for example, an internal account ID) or remove the dependency entirely.
- **FR-004**: System MUST ensure that any automated tests referencing `accountUpn` are updated or removed so that the test suite passes after the column is dropped.
- **FR-005**: System MUST provide a migration strategy that can be applied and, if necessary, safely rolled back in non-production and production environments.
- **FR-006**: System MUST ensure that operational dashboards, monitoring alerts, and log queries do not depend on the `accountUpn` column after the change.

Backups and long-term retention for `accountUpn` are explicitly out of scope; the feature covers only live code and schema.

### Key Entities _(include if feature involves data)_

- **Account**: Represents a user or service account; key attributes include stable identifiers (such as internal account ID or external identity IDs) that will be used instead of `accountUpn`.
- **Migration Record**: Represents the state of schema changes and any transitional handling required when removing `accountUpn`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: ✅ `pnpm test:ci` passes with the column removed.
- **SC-002**: ⚠️ Monitoring in progress (no incidents detected as of 2025-11-19).
- **SC-003**: ✅ Repository search returns zero `accountUpn` hits post-change.
- **SC-004**: ✅ `specs/016-drop-account-upn/tasks.md` checklist complete and validated against migration output.

## Post-Implementation Notes

- Data migration performed via `pnpm run migration:run` and validated with `./.scripts/migrations/run_validate_migration.sh` (tables match reference snapshots).
- Schema artifacts (`schema.graphql`, `schema-lite.graphql`) regenerated and lint/tests re-run; no follow-up tasks remain.
- Rollback guidance: apply the down portion of `1763587200000-removeAccountUpn` to restore the column and repopulate from `email` if required.
