# Data Model: Drop `accountUpn` column and sanitize usage

**Feature**: `016-drop-account-upn`
**Date**: 2025-11-18

## Entities

### Account

- **Description**: Represents a user or service account within the platform.
- **Key Attributes** (relevant to this feature):
  - `id`: Stable internal account identifier used for joins and relationships.
  - `externalIdentityIds` (conceptual): Set of identifiers linking the account to external identity providers (e.g., Kratos, OIDC), used where `accountUpn` may previously have been referenced.
- **Relationships**:
  - Linked to authentication identities and related domain entities via stable identifiers (not `accountUpn`).
- **Notes**:
  - `accountUpn` is being removed from the live data model; any logic dependent on it must instead use `id` or existing external identity references.

### Migration Record

- **Description**: Conceptual representation of schema changes and their execution state for this feature.
- **Key Attributes**:
  - `version`: Identifier for the migration that drops `accountUpn`.
  - `appliedAt`: Timestamp when the migration was applied in a given environment.
- **Notes**:
  - Actual implementation will follow existing migration patterns in the repository; this entity serves to document that the schema change is tracked and reversible if needed.
