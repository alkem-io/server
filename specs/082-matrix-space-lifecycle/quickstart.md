# Quickstart: Matrix Space Lifecycle Management

**Branch**: `082-matrix-space-lifecycle` | **Date**: 2026-03-25

## Implementation Overview

This feature wires existing `CommunicationAdapter` Matrix space methods into Alkemio space lifecycle operations. The adapter methods (`createSpace`, `updateSpace`, `deleteSpace`, `setParent`) already exist but are not called from domain logic.

## Key Integration Points

### 1. Space Creation → Matrix Space Creation
**Where**: `SpaceService.createSpace()` in `src/domain/space/space/space.service.ts`
**What**: After space entity is saved, call `communicationAdapter.createSpace(space.id, displayName, parentSpace?.id)`
**Note**: Must happen AFTER the space is persisted (needs stable ID) but BEFORE subspace creation (parent must exist first)

### 2. Room Creation → Room Anchoring
**Where**: `RoomService.createRoom()` or `CommunicationService.createCommunication()` in `src/domain/communication/`
**What**: Pass `parentContextId` (the owning space's ID) to `communicationAdapter.createRoom()`. Currently `parentContextId` is not passed.
**Challenge**: The space ID is not threaded through to room creation. `Communication.spaceID` exists but is set to empty string. Fix: populate `Communication.spaceID` properly and use it when creating external rooms.

### 3. Space Name Update → Matrix Space Update
**Where**: `SpaceAboutService.updateSpaceAbout()` in `src/domain/space/space.about/space.about.service.ts`
**What**: After profile update, call `communicationAdapter.updateSpace(spaceId, newDisplayName)`
**Challenge**: SpaceAboutService doesn't have direct access to `space.id`. Need to thread it through or look it up.

### 4. Space Avatar Update → Matrix Space Update
**Where**: Visual upload/update handlers for space profiles
**What**: Call `communicationAdapter.updateSpace(spaceId, undefined, undefined, avatarUrl)`
**Dependency**: Requires extending `updateSpace()` to accept `avatarUrl` parameter

### 5. Space Deletion → Matrix Space Deletion
**Where**: `SpaceService.deleteSpaceOrFail()` in `src/domain/space/space/space.service.ts`
**What**: Call `communicationAdapter.deleteSpace(space.id)` BEFORE deleting the space entity
**Note**: Adapter uses `onError: 'boolean'` — won't block if Matrix space doesn't exist

### 6. Space Relocation → Matrix Re-anchoring
**Where**: `SpaceService.addSubspaceToSpace()` or new relocation method
**What**: Call `communicationAdapter.setParent(subspace.id, true, newParent.id)` after reparenting

### 7. Forum Discussion → Hierarchy + Public Visibility
**Where**: `ForumService.createDiscussion()` or `DiscussionService.createDiscussion()` in `src/platform/`
**What**:
  1. Ensure forum Matrix space exists: `createSpace(forum.id, forumName, space.id)`
  2. Ensure category Matrix space exists: `createSpace(v5('${forum.id}:category:${categoryName}', NAMESPACE), categoryName, forum.id)`
  3. Anchor discussion room: `setParent(room.id, false, categoryContextId)`
  4. Set room public: `updateRoom(room.id, isPublic: true)`

### 8. Admin Sync Mutation
**Where**: New resolver in `src/platform-admin/` or `src/services/api/`
**What**: New `adminCommunicationSyncSpaceHierarchy` mutation that iterates all spaces and ensures consistency

## Adapter Extensions Needed

The `@alkemio/matrix-adapter-lib` (`0.0.0-develop` @ 4fc8544) uses `join_rule: JoinRule` exclusively — `is_public` has been removed. All request types already support `avatar_url` and `join_rule`. Extend the server's `CommunicationAdapter`:

```typescript
// In communication.adapter.ts — ADD avatarUrl + joinRule parameters
async createSpace(
  alkemioContextId: AlkemioContextID,
  name: string,
  parentContextId?: AlkemioContextID,
  avatarUrl?: string,      // NEW — maps to avatar_url
  joinRule?: JoinRule        // NEW — maps to join_rule
): Promise<boolean>

async updateSpace(
  alkemioContextId: AlkemioContextID,
  name?: string,
  topic?: string,
  avatarUrl?: string,      // NEW — maps to avatar_url
  joinRule?: JoinRule        // NEW — maps to join_rule
): Promise<boolean>

async createRoom(
  alkemioRoomId: AlkemioRoomID,
  roomType: AlkemioRoomType,
  name?: string,
  initialMembers?: AlkemioActorID[],
  parentContextId?: AlkemioContextID,
  avatarUrl?: string,
  joinRule?: JoinRule        // NEW — maps to join_rule
): Promise<boolean>

// BREAKING MIGRATION — replace isPublic with joinRule
async updateRoom(
  alkemioRoomId: AlkemioRoomID,
  name?: string,
  topic?: string,
  joinRule?: JoinRule,      // CHANGED — was isPublic?: boolean → is_public
  avatarUrl?: string
): Promise<boolean>
```

**JoinRule constants**: `JoinRulePublic`, `JoinRuleInvite`, `JoinRuleRestricted` (from `@alkemio/matrix-adapter-lib`)

**No external dependency changes required.** Lib and Go adapter are ready.

## 9. Synapse Infrastructure — Room Visibility & Configuration

### Room Visibility Filtering (Synapse Module)
**Where**: `.build/synapse/modules/alkemio_room_control.py`
**What**: The `AlkemioRoomControl` module is extended to monkey-patch `SyncHandler.get_sync_result_builder`. Rooms with a custom state event `io.alkemio.visibility` containing `{"visible": false}` are excluded from `/sync` responses for all users except the AppService bot.
**Why**: Non-forum rooms (updates, callout, post, conversation) are in the Matrix hierarchy for organization but should not appear in Element clients. Matrix has no built-in mechanism to hide joined rooms from `/sync`.

### Room Directory Publication Control
**Where**: `.build/synapse/homeserver.yaml`
**What**: Added `room_list_publication_rules` to restrict room directory publication to the AppService bot only.

### Registration Shared Secret
**Where**: `.build/synapse/homeserver.yaml`, `.env.docker`, `quickstart-services.yml`
**What**: Enabled `registration_shared_secret` for the adapter to register/manage users. Renamed env var from `SYNAPSE_SHARED_SECRET` → `SYNAPSE_SERVER_SHARED_SECRET` for consistency. Bumped adapter image to `latest`.

### Module Logging
**Where**: `.build/synapse/alkemio.matrix.host.log.config`
**What**: Added `alkemio_room_control` logger at DEBUG level for development observability.

## Testing Strategy

- Unit tests for new service methods (matrix space creation/update/delete calls)
- Mock `CommunicationAdapter` in tests (existing pattern in codebase)
- Integration test: create space → verify adapter called with correct params
- Idempotency test for admin sync mutation
- Synapse module: verify `/sync` filtering by checking room presence for regular vs bot users
