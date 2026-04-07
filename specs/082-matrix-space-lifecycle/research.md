# Research: Matrix Space Lifecycle Management

**Branch**: `082-matrix-space-lifecycle` | **Date**: 2026-03-25

## Research Findings

### 1. Matrix Adapter API Surface

**Decision**: Use existing `CommunicationAdapter` methods — no new adapter-side RPC topics needed.

**Rationale**: The Go Matrix Adapter already exposes all required operations via AMQP RPC:

| Method | Signature | Error Strategy |
|--------|-----------|----------------|
| `createSpace` | `(contextId, name, parentContextId?)` → `boolean` | throw |
| `updateSpace` | `(contextId, name?, topic?)` → `boolean` | throw |
| `deleteSpace` | `(contextId, reason?)` → `boolean` | boolean (graceful) |
| `setParent` | `(childId, isSpace, parentContextId)` → `boolean` | throw |
| `getSpace` | `(contextId)` → `SpaceInfo \| null` | silent |
| `createRoom` | `(roomId, type, name?, members?, parentContextId?, avatarUrl?)` → `boolean` | throw |
| `updateRoom` | `(roomId, name?, topic?, isPublic?, avatarUrl?)` → `boolean` | throw |

**Key insight**: The adapter uses Alkemio UUIDs as context IDs. The Go adapter internally maps these to Matrix room/space IDs. No Matrix IDs are stored in the Alkemio database.

**Alternatives considered**:
- Store Matrix space IDs in Alkemio DB → Rejected. The Go adapter already handles this mapping. Adding a second source of truth would create sync issues.
- New RPC topics for hierarchy operations → Rejected. `setParent` + `createSpace(parentContextId)` covers all hierarchy needs.

### 2. Matrix Space Identity (Context IDs)

**Decision**: Use `space.id` (the Actor UUID) as the `alkemioContextId` for Matrix space operations. For forum/category Matrix spaces, derive deterministic IDs from existing entity IDs.

**Rationale**:
- Space entities are Actors with stable UUIDs. The `space.id` is the Actor ID.
- The Go adapter maps `alkemioContextId` to internal Matrix space IDs.
- Forum has a DB entity with `forum.id`. Categories are strings (not entities), so we need a deterministic ID: use `${forum.id}:category:${categoryName}` as the context ID.

**Alternatives considered**:
- Create a ForumCategory entity → Rejected. Over-engineering for a string-based category system. Deterministic ID derivation is simpler.
- Use Communication.id as context → Rejected. Communication is per-community, not per-space. Space.id is more natural.

### 3. Hook Points for Lifecycle Events

**Decision**: Add Matrix space operations directly into existing domain service methods rather than implementing an event-driven approach.

**Rationale**: The codebase does not emit domain events for space CRUD. Adding an event system would be scope creep. The adapter already has graceful degradation (returns true when disabled), so direct calls at the right points are safe.

**Hook points identified**:

| Lifecycle Event | Service Method | File |
|----------------|---------------|------|
| Space creation | `SpaceService.createSpace()` | `src/domain/space/space/space.service.ts` |
| Space name update | `SpaceAboutService.updateSpaceAbout()` | `src/domain/space/space.about/space.about.service.ts` |
| Space avatar update | `ProfileService.updateProfile()` or Visual upload handlers | `src/domain/common/profile/` |
| Space deletion | `SpaceService.deleteSpaceOrFail()` | `src/domain/space/space/space.service.ts` |
| Room creation | `RoomService.createRoom()` | `src/domain/communication/room/room.service.ts` |
| Discussion creation | `DiscussionService.createDiscussion()` | `src/platform/forum-discussion/discussion.service.ts` |

**Space relocation**: No `relocateSubspace()` method exists. `addSubspaceToSpace()` sets `subspace.parentSpace` and updates rolesets. Matrix re-anchoring must be added here or in a new relocate method.

**Alternatives considered**:
- Domain events via NestJS EventEmitter → Rejected for this PR. Would require event infrastructure that doesn't exist for space operations. Better suited for a separate refactor.

### 4. Forum Category Hierarchy

**Decision**: Categories are strings, not entities. Use deterministic context IDs for Matrix space mapping.

**Rationale**: The Forum entity stores `discussionCategories: string[]`. Discussions reference their category by string value. No ForumCategory entity exists.

**Context ID scheme**:
- Forum Matrix space: `forum.id` (UUID)
- Category Matrix space: deterministic UUID v5 from `${forum.id}:category:${categoryName}` using `uuid` package (v13, ships own types)
- Discussion room: `room.id` (UUID, already used for Matrix room creation)

### 5. Room Anchoring Strategy

**Decision**: Pass `parentContextId` (the owning space's ID) when creating rooms via `CommunicationAdapter.createRoom()`.

**Rationale**: The `createRoom()` method already accepts an optional `parentContextId` parameter. Currently it's not passed for most room types. We need to:
1. Thread the space ID through to room creation calls
2. For forum discussion rooms, use the category's context ID as parent

**Current room creation flow**:
```
SpaceService.createSpace()
  → CommunityService.createCommunity()
    → CommunicationService.createCommunication()
      → RoomService.createRoom() → CommunicationAdapter.createExternalCommunicationRoom()
```

The space ID is not currently passed down this chain. `Communication.spaceID` exists but is set to empty string.

### 6. Admin Sync Mutation

**Decision**: Add a platform-admin mutation that iterates all spaces and ensures Matrix space hierarchy consistency.

**Rationale**: Spec requires an idempotent admin mutation. The adapter's `getSpace()` method returns null for non-existent spaces, enabling existence checks before creation.

**Approach**:
1. Load all spaces ordered by level (L0 first, then L1, then L2)
2. For each space, call `getSpace()` to check if Matrix space exists
3. If not, call `createSpace()` with parent context ID
4. For each space's rooms, call `setParent()` to anchor
5. For each forum, create forum/category Matrix spaces and anchor discussion rooms

### 7. Avatar & Visibility — Unified via `join_rule`

**Decision**: All visibility control uses `join_rule: JoinRule` exclusively. The `is_public: boolean` field has been removed from the adapter lib entirely. Avatar support (`avatar_url`) is already in all request types.

**Rationale**: The `@alkemio/matrix-adapter-lib` was updated to `0.0.0-develop` (commit 4fc8544). This version:
- Removes `is_public` from `UpdateRoomRequest`
- Uses `join_rule?: JoinRule` consistently on `CreateSpaceRequest`, `UpdateSpaceRequest`, `CreateRoomRequest`, `UpdateRoomRequest`
- Supports `avatar_url` on all space and room request types

**Available `JoinRule` constants**: `JoinRulePublic`, `JoinRuleInvite`, `JoinRuleRestricted`

### 8. Adapter API Changes Summary

**All changes are server-side only.** The lib and Go adapter are ready.

**New parameters to add to server `CommunicationAdapter`:**

| Server Method | Parameter to Add | Lib Field | Needed For |
|--------------|-----------------|-----------|------------|
| `createSpace()` | `avatarUrl?: string` | `avatar_url` | FR-013: Set avatar on creation |
| `createSpace()` | `joinRule?: JoinRule` | `join_rule` | FR-017: Forum/category spaces joinable by all |
| `updateSpace()` | `avatarUrl?: string` | `avatar_url` | FR-014: Update/remove avatar |
| `updateSpace()` | `joinRule?: JoinRule` | `join_rule` | FR-017: Update space visibility |
| `createRoom()` | `joinRule?: JoinRule` | `join_rule` | FR-011: Create forum rooms as public in a single call |

**Breaking change — migrate `updateRoom()`:**

| Server Method | Remove | Replace With |
|--------------|--------|-------------|
| `updateRoom()` | `isPublic?: boolean` → `is_public` | `joinRule?: JoinRule` → `join_rule` |

All existing callers of `updateRoom(isPublic: true/false)` must be migrated to `updateRoom(joinRule: JoinRulePublic/JoinRuleInvite)`.

**No external dependency changes required.** Lib (`0.0.0-develop` @ 4fc8544) and Go adapter are ready.

### 9. Synapse Room Visibility Filtering via Custom State Events

**Decision**: Use a custom Matrix state event `io.alkemio.visibility` with content `{"visible": false}` to hide non-forum rooms from Element users. The existing `AlkemioRoomControl` Synapse module is extended with a SyncHandler monkey-patch to enforce this filtering.

**Rationale**: Non-forum rooms (updates, callout, post, conversation) exist in the Matrix hierarchy for organizational purposes (room anchoring under spaces) but are managed entirely by Alkemio — they should not appear in Element clients. Matrix has no built-in mechanism to hide rooms from `/sync` for joined members. A custom state event checked at the sync level is the most reliable approach.

**Implementation**:
- The `AlkemioRoomControl` module (`.build/synapse/modules/alkemio_room_control.py`) monkey-patches `SyncHandler.get_sync_result_builder`
- For each room in the user's joined set, it checks the `io.alkemio.visibility` state event
- Rooms with `{"visible": false}` are removed from `joined_room_ids` and added to `excluded_room_ids`
- The AppService bot is exempt — it sees all rooms for management purposes
- Compatible with Synapse v1.132.0

**Alternatives considered**:
- Matrix `m.room.history_visibility` → Does not hide rooms from `/sync`, only controls history access
- Removing users from rooms → Would break Alkemio's communication model where users need membership
- Client-side filtering → Unreliable, varies by client, not enforceable

### 10. Synapse Room Directory Publication Control

**Decision**: Configure `room_list_publication_rules` in Synapse `homeserver.yaml` to restrict room directory publication to the AppService bot only.

**Rationale**: Without this, any user could publish rooms to the public directory, creating a cluttered and uncontrolled room list. Only the AppService bot should control which rooms are discoverable via the directory.

**Configuration**:
```yaml
room_list_publication_rules:
  - user_id: "@00000000-0000-0000-0000-000000000000:alkemio.matrix.host"
    action: allow
  - action: deny
```

### 11. Registration Shared Secret and Adapter Environment

**Decision**: Enable `registration_shared_secret` in Synapse config and pass it to the Matrix adapter via `SYNAPSE_SERVER_SHARED_SECRET` environment variable.

**Rationale**: The Go Matrix adapter needs the shared secret to register and manage users via Synapse's admin API. The environment variable was renamed from `SYNAPSE_SHARED_SECRET` to `SYNAPSE_SERVER_SHARED_SECRET` for consistency with the Synapse config key name.

**Changes**:
- `.build/synapse/homeserver.yaml`: `registration_shared_secret` uncommented and set
- `.env.docker`: Renamed `SYNAPSE_SHARED_SECRET` → `SYNAPSE_SERVER_SHARED_SECRET`
- `quickstart-services.yml`: Added `SYNAPSE_SERVER_SHARED_SECRET` to adapter service, bumped adapter image to `latest`
