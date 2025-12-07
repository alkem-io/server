# Feature Specification: Drop wellKnownVirtualContributor Column

**Feature Branch**: `023-drop-wellknown-vc-column`
**Created**: 2025-12-07
**Status**: ✅ Complete
**Migration**: `1765130613747-dropWellKnownVirtualContributorColumn.ts`

## Problem Statement

The `wellKnownVirtualContributor` column exists on the `virtual_contributor` database table but is completely unused:

1. **Not in TypeORM entity**: The column is not defined in `virtual.contributor.entity.ts` - TypeORM is unaware of it
2. **No data stored**: All existing records have `NULL` values in this column
3. **GraphQL field is computed differently**: The `wellKnownVirtualContributor` GraphQL field is resolved at runtime via reverse lookup against `platform.wellKnownVirtualContributors` JSON column
4. **Dead schema artifact**: The column was added in migration `1764897584127-conversationArchitectureRefactor.ts` but the implementation took a different approach (platform-level mapping)

This creates technical debt and confusion for developers who see the column in the database but find no corresponding application code.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Database Schema Cleanup (Priority: P1)

As a **database administrator** or **developer**, I want unused columns removed from the schema so that the database structure accurately reflects the application's data model and reduces confusion.

**Why this priority**: Dead columns create maintenance overhead and confusion. Removing them ensures schema-code alignment and prevents future developers from incorrectly assuming the column has a purpose.

**Independent Test**: After migration runs, querying `information_schema.columns` confirms the column no longer exists on `virtual_contributor` table.

**Acceptance Scenarios**:

1. **Given** a database with the `wellKnownVirtualContributor` column on `virtual_contributor`, **When** the migration runs, **Then** the column is removed from the table
2. **Given** the migration has been applied, **When** querying the table structure, **Then** no `wellKnownVirtualContributor` column exists
3. **Given** the application starts after migration, **When** virtual contributor operations are performed, **Then** all functionality works identically (no regression)

---

### User Story 2 - Migration Reversibility (Priority: P2)

As a **DevOps engineer**, I want the migration to be reversible so that I can safely roll back if issues are discovered during deployment.

**Why this priority**: Safe rollback capability is essential for production deployments. Since the column contains only NULL values, reverting simply re-adds an empty column.

**Independent Test**: Running migration revert recreates the column with the same definition.

**Acceptance Scenarios**:

1. **Given** the forward migration has been applied, **When** the migration is reverted, **Then** the `wellKnownVirtualContributor` column is recreated with its original definition
2. **Given** the column is re-added via revert, **When** the application starts, **Then** no errors occur and functionality remains intact

---

### Edge Cases

- What happens if a deployment has custom data in the column? (Assumption: No production data exists; column is always NULL based on analysis)
- How does the migration handle partial application? (Standard migration transaction handling applies)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST remove the `wellKnownVirtualContributor` column from the `virtual_contributor` database table
- **FR-002**: Migration MUST be reversible, re-adding the column with identical definition (`VARCHAR(128)`, nullable)
- **FR-003**: Migration MUST NOT affect any other columns or tables
- **FR-004**: All existing Virtual Contributor functionality MUST continue to work after migration (no regression)
- **FR-005**: The `wellKnownVirtualContributor` GraphQL field on `VirtualContributor` type MUST continue to resolve correctly (it uses platform-level mapping, not this column)

### Non-Functional Requirements

- **NFR-001**: Migration execution time should be minimal (column drop is a metadata-only operation)
- **NFR-002**: No application code changes required beyond the migration file

### Key Entities

- **virtual_contributor table**: Database table storing Virtual Contributor records. The `wellKnownVirtualContributor` column will be removed.
- **platform table**: Contains `wellKnownVirtualContributors` JSON column that stores the actual well-known VC mappings (unchanged by this feature)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- ✅ **SC-001**: The `wellKnownVirtualContributor` column does not exist on `virtual_contributor` table after migration
- ✅ **SC-002**: All existing Virtual Contributor GraphQL queries and mutations return identical results before and after migration
- ✅ **SC-003**: Migration revert successfully restores the column definition
- ✅ **SC-004**: Zero runtime errors related to Virtual Contributor operations after deployment

## Assumptions

- The column contains only NULL values across all environments (verified via database query on development environment)
- No external systems or reports depend on this column directly
- Standard migration patterns are sufficient for this change
- The platform-level `wellKnownVirtualContributors` JSON mapping is the canonical source for well-known VC resolution

## Out of Scope

- Changes to the `platform.wellKnownVirtualContributors` mapping mechanism
- Any modifications to the GraphQL schema or resolvers (they already work correctly)
- Dropping columns from any other tables
