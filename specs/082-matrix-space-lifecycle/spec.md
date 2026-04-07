# Feature Specification: Matrix Space Lifecycle Management

**Feature Branch**: `082-matrix-space-lifecycle`
**Created**: 2026-03-25
**Status**: Draft
**Input**: User description: "Add space lifecycle management in the matrix - maintain hierarchy of matrix spaces mirroring Alkemio spaces, anchor rooms to corresponding matrix spaces, handle create/update/delete/relocate lifecycle events, and manage forum discussion hierarchy (forum->category->room)."

## Clarifications

### Session 2026-03-25

- Q: Should the system backfill Matrix spaces for existing Alkemio spaces? → A: No automatic backfill. Provide an idempotent admin GQL mutation to synchronize existing spaces into Matrix hierarchy on demand. Must be safe to run multiple times.
- Q: What does "publicly readable/writable" mean for forum rooms? → A: Any authenticated user on the Alkemio Synapse server can read and write (joinable without invitation). Targeted at users accessing Matrix via Element. Not open to anonymous/guest or federated users.
- Q: Should Matrix spaces (containers) also be visible to all Synapse users? → A: Only forum and category Matrix spaces are visible/joinable by all Synapse users. Alkemio space containers require invitation (membership management deferred to a future PR).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Space Creation Mirrors to Matrix (Priority: P1)

When a platform administrator or space host creates a new top-level space or subspace in Alkemio, a corresponding Matrix space is automatically created and anchored to the correct parent in the Matrix hierarchy.

**Why this priority**: This is the foundational capability. Without creating Matrix spaces, no hierarchy can exist, and rooms cannot be organized.

**Independent Test**: Create a top-level space in Alkemio and verify a corresponding Matrix space is created. Create a subspace and verify it is created and anchored under the parent Matrix space.

**Acceptance Scenarios**:

1. **Given** no existing Matrix space for a new Alkemio space, **When** a top-level space is created in Alkemio, **Then** a corresponding Matrix space is created with the space's display name.
2. **Given** a parent Alkemio space with a corresponding Matrix space, **When** a subspace is created under that parent, **Then** a Matrix space is created for the subspace AND it is anchored as a child of the parent's Matrix space.
3. **Given** a deeply nested subspace hierarchy (e.g., Space > Subspace > Sub-subspace), **When** the deepest subspace is created, **Then** the Matrix hierarchy correctly reflects the full nesting chain.

---

### User Story 2 - Room Anchoring to Matrix Spaces (Priority: P1)

When any room (updates, callout comments, posts, conversations) is created under an Alkemio space or subspace, that room is automatically anchored to the corresponding Matrix space in the hierarchy.

**Why this priority**: Rooms are the primary communication artifacts. Anchoring them to Matrix spaces is essential for the hierarchy to have practical value.

**Independent Test**: Create a room (e.g., updates room) under a space that has a corresponding Matrix space, and verify the room is anchored as a child of that Matrix space.

**Acceptance Scenarios**:

1. **Given** a space with a corresponding Matrix space, **When** an updates room is created for that space, **Then** the room is anchored as a child of the Matrix space.
2. **Given** a subspace with a corresponding Matrix space, **When** a callout room is created under that subspace, **Then** the room is anchored to the subspace's Matrix space (not the parent space's).
3. **Given** a space whose Matrix space does not yet exist (e.g., created before this feature), **When** a room is created under that space, **Then** the system handles the missing Matrix space gracefully (creates it on-demand or skips anchoring without error).

---

### User Story 3 - Forum Discussion Hierarchy in Matrix (Priority: P2)

When forum discussions are created under a space, the system maintains a Matrix space hierarchy of forum (Matrix space) -> category (Matrix space) -> room, mirroring the Alkemio forum structure.

**Why this priority**: Forums have a richer hierarchical structure than simple rooms. This extends the hierarchy concept to cover the full communication model.

**Independent Test**: Create a forum discussion under a category in a space's forum, and verify the Matrix hierarchy shows: Space (Matrix space) > Forum (Matrix space) > Category (Matrix space) > Discussion Room.

**Acceptance Scenarios**:

1. **Given** a space with a Matrix space, **When** a forum discussion is created, **Then** Matrix spaces for the forum and category are created (if not already existing) and the discussion room is anchored under the category Matrix space.
2. **Given** an existing forum Matrix space hierarchy, **When** a new discussion is added to an existing category, **Then** only the discussion room is created and anchored; the forum and category Matrix spaces are reused.
3. **Given** a new category is created in an existing forum, **When** a discussion is created under it, **Then** a new category Matrix space is created under the forum Matrix space, and the discussion room is anchored under it.

---

### User Story 4 - Space Display Name and Avatar Sync to Matrix (Priority: P2)

When the display name or avatar of an Alkemio space or subspace is updated, the corresponding Matrix space name and avatar are also updated. When a space is first created with an avatar, the Matrix space receives that avatar.

**Why this priority**: Keeps naming and visual identity consistent across systems, important for usability but not blocking for the core hierarchy.

**Independent Test**: Update the display name of a space in Alkemio and verify the Matrix space name is updated. Upload or change a space avatar and verify the Matrix space avatar is updated accordingly.

**Acceptance Scenarios**:

1. **Given** a space with a corresponding Matrix space, **When** the space's display name is changed, **Then** the Matrix space name is updated to match.
2. **Given** a subspace with a corresponding Matrix space, **When** the subspace's display name is changed, **Then** the Matrix space name is updated.
3. **Given** a space with a corresponding Matrix space, **When** the space's avatar is uploaded or changed, **Then** the Matrix space avatar is updated to match.
4. **Given** a space with an avatar is created, **When** the corresponding Matrix space is created, **Then** the Matrix space is initialized with the space's avatar.
5. **Given** a space with a corresponding Matrix space, **When** the space's avatar is removed, **Then** the Matrix space avatar is also removed.
6. **Given** the Matrix adapter is unavailable, **When** a space display name or avatar is updated, **Then** the Alkemio update succeeds and the Matrix update failure is logged without blocking the operation.

---

### User Story 5 - Space Deletion Cascades to Matrix (Priority: P2)

When a space or subspace is deleted in Alkemio, the corresponding Matrix space and all rooms beneath it in the Matrix hierarchy are also deleted.

**Why this priority**: Prevents orphaned Matrix spaces and rooms from accumulating. Important for hygiene but less frequent than creation.

**Independent Test**: Delete a space that has a corresponding Matrix space with child rooms, and verify the Matrix space and its children are removed.

**Acceptance Scenarios**:

1. **Given** a space with a corresponding Matrix space and child rooms, **When** the space is deleted, **Then** the Matrix space and all its child rooms/spaces are deleted.
2. **Given** a parent space with subspaces, **When** the parent space is deleted, **Then** the entire Matrix subtree (parent space, subspaces, and all rooms) is removed.
3. **Given** a space whose Matrix space has already been deleted externally, **When** the space is deleted in Alkemio, **Then** the operation completes without error.

---

### User Story 6 - Space Relocation Updates Matrix Hierarchy (Priority: P3)

When a space is relocated to a different parent in Alkemio, its corresponding Matrix space is re-anchored under the new parent's Matrix space.

**Why this priority**: Relocation is an infrequent administrative operation. The hierarchy should stay consistent, but this is lower priority than create/delete.

**Independent Test**: Move a subspace from one parent to another and verify the Matrix space is re-anchored under the new parent's Matrix space.

**Acceptance Scenarios**:

1. **Given** a subspace under Parent A with corresponding Matrix spaces, **When** the subspace is moved to Parent B, **Then** the subspace's Matrix space is removed from Parent A's children and added to Parent B's children.
2. **Given** a subspace being promoted to a top-level space, **When** the relocation occurs, **Then** the Matrix space is detached from its former parent and becomes a top-level Matrix space.
3. **Given** a top-level space being demoted to a subspace, **When** the relocation occurs, **Then** the Matrix space is anchored under the new parent's Matrix space.

---

### User Story 7 - Forum Rooms Are Publicly Accessible (Priority: P1)

All rooms that fall under the forum hierarchy (forum > category > discussion room) must be readable and writable by any authenticated user on the Alkemio Synapse server, without requiring an explicit invitation. This enables Element users to browse and participate in forum discussions directly.

**Why this priority**: Forums are designed for open community discussion. If rooms are not publicly accessible, the forum hierarchy loses its purpose as a transparent, community-wide communication channel.

**Independent Test**: Create a forum discussion room under a space's forum hierarchy and verify that the Matrix room is configured as publicly readable and writable (world-readable history, open join policy, guest-writable).

**Acceptance Scenarios**:

1. **Given** a forum discussion room is being created in the Matrix hierarchy, **When** the room is created, **Then** it is configured as readable and writable by any authenticated user on the Alkemio Synapse server without an explicit invitation.
2. **Given** an existing forum discussion room that was created before this feature, **When** the forum hierarchy is established, **Then** the room's visibility settings are updated to be publicly accessible.
3. **Given** a new category is created under a forum, **When** discussion rooms are added to that category, **Then** all new rooms inherit the public read/write configuration.
4. **Given** a room that exists outside the forum hierarchy (e.g., updates room, callout room), **When** it is anchored to a space's Matrix space, **Then** its visibility settings are NOT changed to public (only forum rooms get public access).

---

### User Story 8 - Admin Sync Mutation for Existing Spaces (Priority: P2)

Platform administrators can trigger an idempotent GQL mutation to synchronize existing Alkemio spaces into the Matrix hierarchy. This covers spaces created before this feature was deployed. Running the mutation multiple times produces the same result without creating duplicates or breaking existing hierarchy.

**Why this priority**: Needed for deployment completeness but not for ongoing operation. Once existing spaces are synced, this mutation serves as a consistency repair tool.

**Independent Test**: Run the sync mutation on a system with existing spaces that lack Matrix spaces, verify Matrix spaces are created. Run it again and verify no duplicates or errors occur.

**Acceptance Scenarios**:

1. **Given** existing Alkemio spaces without corresponding Matrix spaces, **When** the admin sync mutation is called, **Then** Matrix spaces are created for all spaces and anchored in the correct hierarchy.
2. **Given** some spaces already have Matrix spaces and some do not, **When** the sync mutation is called, **Then** only missing Matrix spaces are created; existing ones are left unchanged.
3. **Given** all spaces already have corresponding Matrix spaces, **When** the sync mutation is called, **Then** no changes are made and the operation completes successfully.
4. **Given** rooms exist under spaces that now have Matrix spaces, **When** the sync mutation runs, **Then** those rooms are anchored to their owning space's Matrix space.
5. **Given** forum hierarchies exist, **When** the sync mutation runs, **Then** forum and category Matrix spaces are created and discussion rooms are anchored with public read/write visibility.

---

### User Story 9 - Room Visibility Control in Element (Priority: P1)

All rooms and spaces are hidden from Element clients by default, except conversation rooms (`CONVERSATION`, `CONVERSATION_DIRECT`, `CONVERSATION_GROUP`) which are the primary user-to-user communication channels. This includes forum discussion rooms (which remain publicly joinable via their join rule but are not surfaced in `/sync`), updates rooms, callout rooms, post rooms, and all Matrix spaces in the hierarchy.

**Why this priority**: Without this, Element users would see a cluttered list of internal rooms (updates, callout comments, forum discussions managed by Alkemio) that are not intended for direct Matrix interaction. Only DMs and group chats should appear naturally in Element. This directly complements FR-012 by enforcing visibility at the Synapse level.

**Independent Test**: Join a user to several rooms (conversations, forum, updates). Verify that `/sync` responses for that user include only direct and group conversation rooms. Verify the AppService bot still sees all rooms.

**Acceptance Scenarios**:

1. **Given** a user is joined to direct conversations, group conversations, forum rooms, and updates rooms, **When** the user syncs via Element, **Then** only direct and group conversation rooms appear in their room list; all other rooms are filtered out.
2. **Given** a room has a custom state event `io.alkemio.visibility` with `{"visible": false}`, **When** the Synapse `/sync` endpoint is called, **Then** the room is excluded from the response for regular users.
3. **Given** the AppService bot user, **When** it performs `/sync`, **Then** all rooms are included regardless of visibility state (the bot needs full access for management).
4. **Given** the room directory, **When** a regular user browses it, **Then** only rooms published by the AppService bot are listed; regular users cannot publish rooms to the directory.
5. **Given** a forum discussion room with `JoinRulePublic` and `io.alkemio.visibility: {visible: false}`, **When** a user explicitly joins via room ID or directory link, **Then** the join succeeds (public join rule) but the room does not appear in their `/sync` until the visibility state is changed.

---

### User Story 10 - Synapse Infrastructure for Matrix Lifecycle (Priority: P1)

The Synapse homeserver configuration and development Docker Compose stack must be updated to support the Matrix space lifecycle features, including the shared secret for adapter registration, correct environment variable naming, and the latest adapter image.

**Why this priority**: These are prerequisites for the lifecycle features to function in the development environment.

**Independent Test**: Start the development stack with `pnpm run start:services`. Verify the Matrix adapter can communicate with Synapse using the shared secret. Verify the `alkemio_room_control` module initializes with sync filtering enabled.

**Acceptance Scenarios**:

1. **Given** the development Docker Compose stack, **When** services are started, **Then** the Matrix adapter receives the `SYNAPSE_SERVER_SHARED_SECRET` environment variable and can register users via Synapse's admin API.
2. **Given** the Synapse homeserver configuration, **When** Synapse starts, **Then** the `alkemio_room_control` module initializes with sync filtering enabled and logs its status.
3. **Given** the `room_list_publication_rules` in Synapse config, **When** a regular user attempts to publish a room to the directory, **Then** the action is denied; only the AppService bot can publish rooms.

---

### Edge Cases

- What happens when the Matrix adapter is unavailable during a lifecycle event? The Alkemio operation should succeed; the Matrix sync failure should be logged as a warning and not block the primary operation.
- What happens when a Matrix space already exists for a space being created? The system should detect the existing Matrix space and reuse it rather than creating a duplicate.
- What happens when spaces are created in rapid succession (e.g., bulk import)? Each space creation should independently trigger Matrix space creation; ordering should not matter as long as parent spaces are created before children.
- What happens when a deeply nested hierarchy is deleted? The deletion should cascade from leaves to root in the Matrix hierarchy to avoid orphaned references.
- What happens when forum categories or discussions are deleted? The corresponding Matrix spaces/rooms should be cleaned up, following the same cascade pattern as space deletion.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST create a Matrix space when an Alkemio space or subspace is created.
- **FR-002**: System MUST anchor a newly created Matrix space under the parent's Matrix space when the Alkemio entity is a subspace.
- **FR-003**: System MUST update the Matrix space display name when the corresponding Alkemio space display name is changed.
- **FR-013**: System MUST set the Matrix space avatar when creating a Matrix space for an Alkemio space that has an avatar.
- **FR-014**: System MUST update the Matrix space avatar when the corresponding Alkemio space avatar is changed or removed.
- **FR-004**: System MUST delete the Matrix space (and all child rooms/spaces beneath it) when the corresponding Alkemio space is deleted.
- **FR-005**: System MUST re-anchor a Matrix space under a new parent when the corresponding Alkemio space is relocated.
- **FR-006**: System MUST anchor any newly created room to its owning space's Matrix space in the hierarchy.
- **FR-007**: System MUST create and maintain a Matrix space hierarchy for forums: forum (Matrix space) -> category (Matrix space) -> discussion room.
- **FR-011**: System MUST create all rooms within the forum hierarchy (forum > category > discussion room) as readable and writable by any authenticated user on the Alkemio Synapse server (joinable without invitation, not open to anonymous or federated users).
- **FR-012**: System MUST NOT apply public visibility settings to non-forum rooms (updates, callout, conversation rooms) when anchoring them to Matrix spaces.
- **FR-017**: Forum and category Matrix spaces MUST be visible and joinable by all authenticated Synapse server users.
- **FR-018**: Alkemio space container Matrix spaces MUST require invitation to join (membership management is out of scope for this feature and deferred to a future PR).
- **FR-015**: System MUST provide an admin-only GQL mutation to synchronize existing Alkemio spaces into the Matrix hierarchy.
- **FR-016**: The admin sync mutation MUST be idempotent - running it multiple times produces the same result without creating duplicate Matrix spaces or breaking existing hierarchy.
- **FR-008**: System MUST handle Matrix adapter unavailability gracefully, logging warnings without blocking primary Alkemio operations.
- **FR-009**: System MUST use stable Alkemio entity IDs as context identifiers for all Matrix space operations, enabling the Go adapter to maintain its own internal mapping for subsequent lifecycle operations (update, delete, relocate, anchor).
- **FR-010**: System MUST handle idempotent creation - if a Matrix space already exists for a given Alkemio space, it should be reused rather than duplicated.
- **FR-019**: All rooms EXCEPT conversation rooms (`CONVERSATION`, `CONVERSATION_DIRECT`, `CONVERSATION_GROUP`) MUST be hidden from Element users' `/sync` responses via a custom `io.alkemio.visibility` state event with `{"visible": false}`. This includes updates, callout, post, forum discussion, and calendar event rooms. Conversation rooms remain visible because they are the primary user-to-user communication channels in Element. The Synapse module filters hidden rooms at the sync level so they do not appear in Element clients.
- **FR-020**: The AppService bot MUST be exempt from room visibility filtering — it needs full access to all rooms for management operations.
- **FR-021**: Only the AppService bot MUST be allowed to publish rooms to the Synapse public room directory. Regular users MUST be denied room list publication via `room_list_publication_rules` in Synapse configuration.
- **FR-022**: The Synapse homeserver MUST expose a `registration_shared_secret` to allow the Matrix adapter to register and manage users via Synapse's admin API.
- **FR-023**: The development Docker Compose stack MUST pass `SYNAPSE_SERVER_SHARED_SECRET` to the Matrix adapter service and use the latest adapter image compatible with this feature.

### Key Entities

- **Space**: An Alkemio collaborative space that can be nested (subspaces). Each space may have a corresponding Matrix space identifier.
- **Matrix Space**: A Matrix protocol construct for hierarchically organizing rooms. Has a parent-child relationship with other Matrix spaces and rooms.
- **Room**: A Matrix room used for communication (updates, discussions, callouts, conversations). Belongs to a space's communication context.
- **Forum**: A discussion forum belonging to a space, containing categories which contain discussion rooms.
- **Forum Category**: A grouping within a forum, represented as a Matrix space in the hierarchy.
- **Room Visibility State Event**: A custom Matrix state event (`io.alkemio.visibility`) that controls whether a room appears in Element clients. Set by the AppService bot to hide non-forum rooms from regular users.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every newly created Alkemio space/subspace has a corresponding Matrix space within the same operation cycle.
- **SC-002**: The Matrix space hierarchy accurately mirrors the Alkemio space hierarchy at all times (parent-child relationships are consistent).
- **SC-003**: All rooms created under a space are discoverable within that space's Matrix space hierarchy.
- **SC-004**: Space display name and avatar changes are reflected in Matrix within the same operation cycle.
- **SC-005**: Deleting a space removes 100% of its associated Matrix spaces and room anchoring.
- **SC-006**: Space relocation correctly updates the Matrix hierarchy with zero orphaned references.
- **SC-007**: Matrix adapter failures do not cause any Alkemio space operations to fail or degrade for end users.
- **SC-008**: Forum discussions are organized in a three-level Matrix hierarchy (forum > category > room) matching the Alkemio forum structure.
- **SC-009**: 100% of rooms within the forum hierarchy are readable and writable by any authenticated Synapse server user without invitation; non-forum rooms retain their existing visibility settings.
- **SC-010**: Non-forum rooms are invisible in Element clients — they do not appear in `/sync` responses for regular users, only for the AppService bot.
- **SC-011**: The Synapse public room directory only contains rooms published by the AppService bot; regular users cannot publish rooms.

## Assumptions

- The Matrix adapter (Go service) already supports `createSpace`, `updateSpace`, `deleteSpace`, and `setParent` operations via RPC. These existing adapter methods are sufficient for this feature.
- The Matrix adapter handles its own internal mapping between Alkemio UUIDs and Matrix room/space IDs.
- Space lifecycle events (creation, deletion, relocation, rename) are already emitted or can be hooked into at the domain service level.
- The communication adapter's graceful degradation pattern (returning success when adapter is disabled) applies to all new Matrix space operations.
- Forum and forum category entities already exist in the domain model with stable identifiers that can serve as keys for Matrix space mapping.
- Cascade deletion in Matrix is handled by the Matrix adapter when a parent space is deleted (i.e., the server only needs to request deletion of the top-level space).
