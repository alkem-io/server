# Service Contract: SpaceMoveRoomsService

**Feature**: 084-move-room-handling
**Module**: `src/domain/communication/space-move-rooms/`
**Type**: Internal domain service (no GraphQL surface)

## Overview

`SpaceMoveRoomsService` orchestrates all communication room operations during a cross-L0 space move. It is called by the move orchestrator (083's `ConversionService`) after community memberships have been cleared. It is **not** exposed via GraphQL — it has no resolver.

## Module Definition

```typescript
@Module({
  imports: [
    SpaceLookupModule,           // getAllDescendantSpaceIDs()
    CommunicationAdapterModule,  // AMQP RPC to Matrix adapter
    RoomModule,                  // Room CRUD (DB + Matrix)
    CommunicationModule,         // Communication entity access
  ],
  providers: [SpaceMoveRoomsService],
  exports: [SpaceMoveRoomsService],
})
export class SpaceMoveRoomsModule {}
```

## Public API

### `handleRoomsDuringMove(movedSpaceId, removedActorIds)`

**Entry point** for the 083 move service. Orchestrates the full room handling flow.

```typescript
async handleRoomsDuringMove(
  movedSpaceId: string,       // UUID of the L1 space being moved
  removedActorIds: string[]   // UUIDs of actors whose community memberships were cleared
): Promise<void>
```

**Behavior**:
1. Resolves the full subtree: `[movedSpaceId, ...descendantSpaceIds]`
2. Collects all room IDs (callout, post, updates) in the subtree
3. Revokes Matrix room memberships for all removed actors (fire-and-forget)
4. Revokes Matrix space-hierarchy memberships for all removed actors (fire-and-forget)
5. Recreates updates rooms for each Communication in the subtree

**Error handling**: Never throws. Outer `try/catch` logs and swallows all errors. The move operation is not blocked by room handling failures.

**Caller**: `ConversionService` (083-cross-space-moves), after DB transaction and community clearing.

---

### `collectAllRoomIdsInSubtree(spaceIds)`

Collects all room IDs (callout, post, updates) for the given spaces.

```typescript
async collectAllRoomIdsInSubtree(
  spaceIds: string[]          // UUIDs of spaces in the subtree
): Promise<string[]>          // Deduplicated room UUIDs
```

**Behavior**: Three parallel raw QueryBuilder queries, joined through the entity graph. Results deduplicated via `Set<string>`.

**Edge case**: Returns `[]` for empty `spaceIds` (no DB query issued).

---

### `revokeRoomMembershipsForActors(actorIds, roomIds)`

Revokes Matrix room-level memberships for the given actors.

```typescript
revokeRoomMembershipsForActors(
  actorIds: string[],         // Actor UUIDs to revoke
  roomIds: string[]           // Room UUIDs to revoke from
): void                       // Fire-and-forget (no Promise returned)
```

**Behavior**: Iterates per actor, calling `communicationAdapter.batchRemoveMember(actorId, roomIds, 'cross-L0-move')`. Errors caught per-actor with structured logging.

**Complexity**: O(actors) adapter calls.

---

### `revokeSpaceMembershipsForActors(actorIds, spaceIds)`

Revokes Matrix space-hierarchy memberships for the given actors.

```typescript
revokeSpaceMembershipsForActors(
  actorIds: string[],         // Actor UUIDs to revoke
  spaceIds: string[]          // Space UUIDs (Matrix context IDs) to revoke from
): void                       // Fire-and-forget (no Promise returned)
```

**Behavior**: Iterates per actor, calling `communicationAdapter.batchRemoveSpaceMember(actorId, spaceIds, 'cross-L0-move')`. Errors caught per-actor with structured logging.

**Complexity**: O(actors) adapter calls.

---

### `recreateUpdatesRooms(communications)`

Recreates the community updates room for each Communication entity.

```typescript
async recreateUpdatesRooms(
  communications: CommunicationWithUpdatesRoom[]
): Promise<void>
```

**`CommunicationWithUpdatesRoom` interface**:
```typescript
interface CommunicationWithUpdatesRoom {
  communicationId: string;    // Communication entity UUID
  updatesRoomId: string;      // Old updates Room UUID (to delete)
  spaceId: string;            // Space UUID
  displayName: string;        // Communication display name (for new room naming)
}
```

**Behavior per communication**:
1. Delete old room: `roomService.deleteRoom({ roomID: comm.updatesRoomId })`
2. Create new room: `roomService.createRoom({ displayName: 'updates-{name}', type: RoomType.UPDATES })`
3. Update entity: `communication.updates = newRoom; communicationService.save(communication)`

**Error handling**: Each communication is processed independently. Failure in one is logged and skipped; others continue.

## Dependencies

| Dependency | Method Used | Purpose |
|-----------|-------------|---------|
| `SpaceLookupService` | `getAllDescendantSpaceIDs(spaceId)` | Resolve subtree |
| `CommunicationAdapter` | `batchRemoveMember()`, `batchRemoveSpaceMember()` | Matrix membership revocation |
| `RoomService` | `createRoom()`, `deleteRoom()` | Room entity + Matrix room lifecycle |
| `CommunicationService` | `getCommunicationOrFail()`, `save()` | Communication entity access |
| `EntityManager` | `createQueryBuilder()` | Raw room ID collection queries |

## Non-Functional Characteristics

| Property | Value |
|----------|-------|
| Thread safety | Stateless service, safe for concurrent calls |
| Transaction scope | Operates post-commit; no own transaction |
| Blocking behavior | Never blocks caller (fire-and-forget adapter calls) |
| Error propagation | Never throws from `handleRoomsDuringMove()` |
| Adapter call count | O(actors) for revocation, O(spaces) for recreation |
| AMQP timeout | Must stay within 10s per adapter call |
