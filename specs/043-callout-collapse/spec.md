# Feature Specification: Callout Description Display Mode Setting

**Feature Branch**: `043-callout-collapse`
**Created**: 2026-03-11
**Status**: Draft
**Input**: User description: "Adapt callout collapse/expand layout setting for server - configurable collapsed/expanded callout descriptions per space with persisted state (ref: client #9340)"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Space Admin Configures Callout Display Mode (Priority: P1)

As a space administrator, I want to set a space-level callout description display mode (collapsed or expanded) via the GraphQL API, so that the client can render all callout descriptions in the configured default state for all users of that space.

**Why this priority**: This is the core server-side capability. Without persisting and exposing the display mode setting, the client cannot implement configurable callout collapse/expand behavior.

**Independent Test**: Can be fully tested by calling the `updateSpaceSettings` mutation with a `calloutDescriptionDisplayMode` value and then querying the space settings to confirm the value is persisted and returned correctly.

**Acceptance Scenarios**:

1. **Given** a space admin calls `updateSpaceSettings` with `layout: { calloutDescriptionDisplayMode: COLLAPSED }`, **When** any user queries that space's settings, **Then** the response includes `settings.layout.calloutDescriptionDisplayMode: COLLAPSED`.
2. **Given** a space admin calls `updateSpaceSettings` with `layout: { calloutDescriptionDisplayMode: EXPANDED }`, **When** any user queries that space's settings, **Then** the response includes `settings.layout.calloutDescriptionDisplayMode: EXPANDED`.
3. **Given** a space admin updates the display mode, **When** a subsequent GraphQL query fetches the space settings, **Then** the new value is returned immediately (no caching delay).
4. **Given** a user without the `UPDATE` privilege on the space calls `updateSpaceSettings` with `layout: { calloutDescriptionDisplayMode: COLLAPSED }`, **When** the mutation is executed, **Then** the server rejects the request with an authorization error and `settings.layout.calloutDescriptionDisplayMode` remains unchanged _(traceable to FR-009)_.

---

### User Story 2 - Default Display Mode for New Spaces (Priority: P1)

As a platform operator, I want new spaces to default to "Collapsed" callout description display mode, so that new spaces benefit from a compact layout without requiring manual configuration.

**Why this priority**: Correct defaults are essential for the feature to work out-of-the-box. New spaces must initialize with the collapsed default.

**Independent Test**: Can be fully tested by creating a new space via the `createSpace` mutation and querying its settings to verify `calloutDescriptionDisplayMode` is `COLLAPSED`.

**Acceptance Scenarios**:

1. **Given** a user creates a new space without specifying `calloutDescriptionDisplayMode`, **When** the space settings are queried, **Then** `calloutDescriptionDisplayMode` is `COLLAPSED`.
2. **Given** a user creates a new space and explicitly sets `calloutDescriptionDisplayMode: EXPANDED`, **When** the space settings are queried, **Then** `calloutDescriptionDisplayMode` is `EXPANDED`.
3. **Given** a user creates a new subspace without specifying the display mode, **When** the subspace settings are queried, **Then** `calloutDescriptionDisplayMode` is `COLLAPSED` (independent of parent space setting).

---

### User Story 3 - Backward Compatibility for Existing Spaces (Priority: P1)

As a platform operator, I want all existing spaces to default to "Expanded" display mode after deployment, so that current behavior is preserved and no user-facing regression occurs.

**Why this priority**: Migration safety is critical for a non-breaking rollout. Existing spaces must continue to behave as they do today.

**Independent Test**: Can be fully tested by running the migration against a database with existing spaces and querying their settings to confirm `calloutDescriptionDisplayMode` is `EXPANDED`.

**Acceptance Scenarios**:

1. **Given** an existing space created before this feature is deployed, **When** the migration runs, **Then** the space's `calloutDescriptionDisplayMode` is set to `EXPANDED` in the JSONB settings column.
2. **Given** an existing space whose JSONB settings lack the `calloutDescriptionDisplayMode` field, **When** the settings are queried via GraphQL, **Then** the server returns `EXPANDED` as the default.
3. **Given** the migration has been applied, **When** it is reverted, **Then** the `calloutDescriptionDisplayMode` field is removed from all space settings without affecting other settings data.

---

### User Story 4 - Independent Subspace Configuration (Priority: P2)

As a space administrator with subspaces, I want each space and subspace to have its own independent callout display mode setting, so that I can tailor the reading experience per space without unintended inheritance.

**Why this priority**: Independence between spaces is important for flexibility but is a secondary concern after the core setting and migration work.

**Independent Test**: Can be fully tested by setting different display modes on a parent space and its subspace, then querying both to confirm they return their independent values.

**Acceptance Scenarios**:

1. **Given** a parent space set to `COLLAPSED` and a subspace set to `EXPANDED`, **When** both are queried, **Then** each returns its own configured value.
2. **Given** a parent space updates its display mode, **When** a subspace's settings are queried, **Then** the subspace setting is unchanged.

---

### Edge Cases

- What happens if the `layout` object or `calloutDescriptionDisplayMode` field is missing from the JSONB settings? The server falls back to `EXPANDED` to preserve current behavior.
- What happens if an invalid value is provided for the display mode? The server rejects the mutation with a validation error (enum constraint).
- What happens when a space is created from a template that has a specific display mode? The template's display mode is inherited during space creation, following existing template-based settings behavior.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The `SpaceSettings` GraphQL type MUST include a `layout` field of type `SpaceSettingsLayout`, which is a new sub-object following the same pattern as `privacy`, `membership`, and `collaboration`.
- **FR-002**: The `SpaceSettingsLayout` GraphQL type MUST include a `calloutDescriptionDisplayMode` field of enum type `CalloutDescriptionDisplayMode` with values `COLLAPSED` and `EXPANDED`.
- **FR-003**: The `UpdateSpaceSettingsEntityInput` GraphQL input MUST accept an optional `layout` field of type `UpdateSpaceSettingsLayoutInput`, containing an optional `calloutDescriptionDisplayMode` field.
- **FR-004**: The `ISpaceSettings` JSONB interface MUST include a `layout` property with nested `calloutDescriptionDisplayMode`, persisted in the existing `settings` JSONB column on the `space` table.
- **FR-005**: New spaces MUST default to `layout: { calloutDescriptionDisplayMode: COLLAPSED }` when no explicit value is provided during creation.
- **FR-006**: A database migration MUST backfill all existing spaces with `layout: { calloutDescriptionDisplayMode: EXPANDED }` in their JSONB settings.
- **FR-007**: The GraphQL field resolver MUST return `EXPANDED` as the fallback when the `layout` or `calloutDescriptionDisplayMode` field is absent from the stored JSONB (defensive default).
- **FR-008**: Each space and subspace MUST store its own `layout.calloutDescriptionDisplayMode` independently; no inheritance from parent to child.
- **FR-009**: Updating the layout settings MUST require the same `UPDATE` authorization privilege as other space settings mutations.
- **FR-010**: The migration MUST be reversible (revert removes the `layout` key from JSONB settings without affecting other settings data).
- **FR-011**: Updates to `calloutDescriptionDisplayMode` MUST be immediately reflected in subsequent GraphQL queries without caching delay.
- **FR-012**: The GraphQL API MUST reject any mutation that supplies a value for `calloutDescriptionDisplayMode` that is not a member of the `CalloutDescriptionDisplayMode` enum, and MUST return a validation error to the caller.

### Key Entities

- **Space Settings (JSONB)**: Extended with a `layout` sub-object containing `calloutDescriptionDisplayMode`. Stored in the existing `settings` JSONB column on the `space` table, following the same sub-object pattern as `privacy`, `membership`, and `collaboration`.
- **SpaceSettingsLayout (Sub-object)**: New settings sub-object within `ISpaceSettings`. Initially contains `calloutDescriptionDisplayMode`; designed to accommodate future layout-related properties.
- **CalloutDescriptionDisplayMode (Enum)**: New enum with values `COLLAPSED` and `EXPANDED`. Registered as a GraphQL enum type.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Space administrators can update the callout display mode setting via a single GraphQL mutation call.
- **SC-002**: 100% of existing spaces return `EXPANDED` as their callout display mode after migration, with zero regressions.
- **SC-003**: 100% of newly created spaces default to `COLLAPSED` without requiring explicit configuration.
- **SC-004**: The display mode setting is independently queryable per space/subspace with no cross-space inheritance.
- **SC-005**: The migration is fully reversible without data loss in other settings fields.

## Clarifications

### Session 2026-03-11

- Q: Should this be a new settings sub-object or a top-level field on `ISpaceSettings`? -> A: New `layout` sub-object on `ISpaceSettings`, following the same sub-object pattern as `privacy`, `membership`, and `collaboration`. This allows future layout properties to be grouped under the same namespace.
- Q: What about client-side temporary toggle behavior (per-user, per-session)? -> A: Purely client-side concern. The server only persists and exposes the space-level default; temporary per-user toggle state is not stored on the server.
- Q: Should the layout settings be exposed without READ privilege (like `sortMode`)? -> A: Yes, follow the same pattern as `sortMode` - layout settings are public metadata needed for rendering before full space data loads.

## Assumptions

- The existing `settings` JSONB column on the `space` table can accommodate the new field without schema changes to the column itself.
- The `SpaceSettingsService.updateSettings()` method can be extended to merge the new `layout` sub-object, following the same pattern used for `privacy`, `membership`, and `collaboration`.
- Template-based space creation will inherit the display mode from the template settings, consistent with how other settings are inherited.
- The client is responsible for all visual collapse/expand rendering and temporary per-user toggle state; the server only provides the persisted default.
- Authorization for updating this setting follows the existing `UPDATE` privilege check on `updateSpaceSettings`, requiring no new authorization rules.
