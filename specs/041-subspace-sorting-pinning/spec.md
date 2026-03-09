# Feature Specification: Subspace Sorting & Pinning API

**Feature Branch**: `041-subspace-sorting-pinning`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "Extend the subspace sorting and pinning API to support the client-web feature spec. Backend needs: sortMode setting (Alphabetical/Custom), pinned boolean for subspaces, GraphQL mutations, and query support for client-side sorting."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Configure Subspace Sort Mode (Priority: P1)

A space administrator sets the sort mode for a space's subspaces via the API. The sort mode determines how the client should order subspaces: either "Alphabetical" (A-Z by name, the default) or "Custom" (manual sort order). The server persists this setting at the space level and returns it when querying the space, so any client rendering subspaces can respect the chosen mode.

**Why this priority**: The sort mode is the foundational setting that governs how subspaces are displayed. All other sorting and pinning behavior depends on it.

**Independent Test**: Can be tested by calling the mutation to update sort mode and verifying the space query returns the updated value.

**Acceptance Scenarios**:

1. **Given** a space exists with no sort mode explicitly set, **When** a client queries the space settings, **Then** the sort mode defaults to "Alphabetical".
2. **Given** a space administrator calls the update sort mode mutation with "Custom", **When** a client queries the space settings, **Then** the sort mode is "Custom".
3. **Given** a non-admin user attempts to change the sort mode, **When** the mutation is called, **Then** the server returns an authorization error.

---

### User Story 2 - Pin and Unpin Subspaces (Priority: P1)

A space administrator pins or unpins individual subspaces via the API. When a subspace is pinned, it is marked with a `pinned: true` flag. The client uses this flag, combined with the `sortOrder` field, to display pinned subspaces at the top of the list. When a subspace is unpinned, the flag is removed and the subspace returns to its natural position based on the active sort mode.

**Why this priority**: Pinning is the core new capability that enhances the existing sorting system. Without it, the feature delivers no new user value.

**Independent Test**: Can be tested by calling `updateSubspacePinned(pinnedData: { spaceID, subspaceID, pinned: true|false })` and verifying the subspace query returns the updated pinned status.

**Acceptance Scenarios**:

1. **Given** a space administrator calls `updateSubspacePinned` with `pinned: true` for a subspace, **When** a client queries the subspaces, **Then** the targeted subspace has `pinned: true`.
2. **Given** a pinned subspace exists, **When** the administrator calls `updateSubspacePinned` with `pinned: false`, **Then** the subspace has `pinned: false`.
3. **Given** multiple subspaces are pinned, **When** querying subspaces, **Then** each pinned subspace returns its `pinned` status and `sortOrder`, enabling the client to sort pinned items first by sort order.
4. **Given** a non-admin user attempts to call `updateSubspacePinned`, **Then** the server returns an authorization error.

---

### User Story 3 - Query Subspaces with Sorting and Pinning Data (Priority: P1)

When a client queries subspaces of a space, the API returns the `pinned` status and `sortOrder` for each subspace, along with the parent space's `sortMode`. This enables the client to implement the correct display order: pinned subspaces first (ordered by `sortOrder`), then non-pinned subspaces ordered by either `sortOrder` (Custom mode) or name (Alphabetical mode).

**Why this priority**: Without returning this data in queries, the client cannot render the correct order. This is essential for the feature to function end-to-end.

**Independent Test**: Can be tested by creating subspaces with various pinned states and sort orders, then querying and verifying the returned data.

**Acceptance Scenarios**:

1. **Given** a space has subspaces with mixed pinned states, **When** querying subspaces, **Then** each subspace includes `pinned` (boolean) and `sortOrder` (number) in the response.
2. **Given** a space has a sort mode set, **When** querying the space settings, **Then** the `sortMode` field is included in the response.
3. **Given** the existing `updateSubspacesSortOrder` mutation is called, **When** the mutation succeeds, **Then** the sort order values are updated and subsequent queries reflect the new order (backward compatibility preserved).

---

### User Story 4 - Update Sort Order with Pinning Context (Priority: P2)

The existing `updateSubspacesSortOrder` mutation continues to work as before, accepting an ordered list of subspace IDs and updating their sort order values. When combined with the new pinning feature, administrators can reorder pinned subspaces among themselves (in Alphabetical mode) or reorder all subspaces freely (in Custom mode). The server does not enforce sort-mode-specific reordering rules; the client is responsible for presenting the appropriate drag-and-drop behavior.

**Why this priority**: This builds on existing functionality and ensures backward compatibility. The server-side work is minimal since the existing mutation already handles sort order updates.

**Independent Test**: Can be tested by calling `updateSubspacesSortOrder` with various orderings and verifying the sort order values are correctly persisted.

**Acceptance Scenarios**:

1. **Given** the sort mode is "Custom" and subspaces have mixed pinned states, **When** `updateSubspacesSortOrder` is called with a new order, **Then** all subspaces receive updated sort order values reflecting the new positions.
2. **Given** the sort mode is "Alphabetical" and only pinned subspaces are reordered, **When** `updateSubspacesSortOrder` is called with the new pinned order, **Then** the pinned subspaces' sort orders are updated while non-pinned subspaces remain unchanged.

---

### Edge Cases

- What happens when a subspace that does not exist is targeted by pin/unpin? The server returns a "not found" error.
- What happens when an already-pinned subspace is pinned again? The operation is idempotent; the subspace remains pinned with no error.
- What happens when an already-unpinned subspace is unpinned? The operation is idempotent; no error is returned.
- What happens when a subspace is deleted while pinned? The subspace and its pinned state are removed; no orphaned pin data remains.
- What happens when a new subspace is created? It defaults to `pinned: false` with a sort order placing it at the end of the list.
- What happens when the sort mode is updated from Custom to Alphabetical? The persisted sort orders remain unchanged, but the client renders non-pinned subspaces alphabetically. Pinned subspaces continue to appear first, ordered by their sort order.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a `sortMode` setting on spaces with two valid values: "Alphabetical" and "Custom".
- **FR-002**: System MUST default the `sortMode` to "Alphabetical" for all spaces, including existing ones that have no value set.
- **FR-003**: System MUST provide a mutation to update the `sortMode` of a space, restricted to space administrators.
- **FR-004**: System MUST provide a `pinned` boolean field on subspaces, defaulting to `false`.
- **FR-005**: System MUST provide an `updateSubspacePinned` mutation to pin or unpin individual subspaces (via `pinned: true|false`), restricted to space administrators.
- **FR-006**: Pin and unpin operations MUST be idempotent (pinning an already-pinned subspace or unpinning a non-pinned subspace succeeds without error).
- **FR-007**: System MUST return the `pinned` status and `sortOrder` for each subspace in query responses.
- **FR-008**: System MUST return the `sortMode` setting when querying space settings.
- **FR-009**: The existing `updateSubspacesSortOrder` mutation MUST continue to function unchanged, updating sort order values for the provided subspace IDs.
- **FR-010**: When a new subspace is created, it MUST default to `pinned: false`.
- **FR-011**: When a subspace is deleted, its pinned state MUST be removed with no orphaned data.
- **FR-012**: The server MUST NOT enforce client-side sorting logic (e.g., which subspaces can be reordered in which mode); it only persists and returns sortMode, pinned, and sortOrder data.

### Key Entities

- **Space Settings (sortMode)**: A space-level configuration storing the active sort mode ("Alphabetical" or "Custom"). Defaults to "Alphabetical".
- **Subspace (pinned)**: Extended with a `pinned` boolean field (default: `false`). Combined with the existing `sortOrder` field, this enables clients to render subspaces in the correct order: pinned first (by sortOrder), then non-pinned by sortOrder (Custom) or name (Alphabetical).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Space administrators can set and retrieve the sort mode for any space they manage, with changes reflected immediately in subsequent queries.
- **SC-002**: Space administrators can pin and unpin subspaces, with the pinned status correctly returned in all subspace queries.
- **SC-003**: The `sortOrder` and `pinned` fields are available on every subspace query response, providing sufficient data for the client to render the correct display order.
- **SC-004**: The existing `updateSubspacesSortOrder` mutation continues to work without breaking changes, maintaining backward compatibility.
- **SC-005**: Default sort mode is "Alphabetical" for all spaces, including pre-existing spaces with no explicit setting.
- **SC-006**: All new mutations enforce authorization, allowing only space administrators to modify sort mode and pinning state.

## Assumptions

- The client-web application is responsible for implementing the visual sorting logic (pinned first, then by mode). The server only persists and returns the data.
- The existing `sortOrder` numeric field on subspaces will continue to be used for ordering; pinning adds a boolean flag on top of it.
- Only users with space admin (or equivalent) permissions can change the sort mode, pin/unpin subspaces, or reorder them.
- The `pinned` field will be added to the subspace entity (likely via a database migration adding a boolean column).
- The `sortMode` setting will be stored as part of the space's settings entity.
- The GraphQL schema will be extended with new mutations and fields; existing queries/mutations remain backward-compatible.
