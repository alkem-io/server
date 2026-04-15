# Internal API Contract: SpaceMoveRoomsService

**Date**: 2026-03-30 | **Branch**: `084-move-room-handling`

## Overview

This feature adds **no new GraphQL mutations or queries**. All room handling is internal to the move operation orchestrated by `083-cross-space-moves`. This document defines the internal service contract that 083's move service calls.

## Service Interface

### SpaceMoveRoomsService

**Module**: `src/domain/communication/space-move-rooms/`
**Injected into**: 083's move orchestration service

```typescript
@Injectable()
export class SpaceMoveRoomsService {
  /**
   * Orchestrates all room-related operations during a cross-L0 space move.
   *
   * Called AFTER the database transaction for the space move has committed
   * and community memberships have been cleared.
   *
   * Operations (all fire-and-forget):
   * 1. Collect all room IDs in the moved subtree
   * 2. Revoke Matrix room memberships for all removed actors
   * 3. Revoke Matrix space memberships for all removed actors
   * 4. Recreate community updates rooms for the moved space and descendants
   *
   * @param movedSpaceId - The ID of the space that was moved
   * @param removedActorIds - Actor IDs of all community members that were removed
   */
  async handleRoomsDuringMove(
    movedSpaceId: string,
    removedActorIds: string[]
  ): Promise<void>;
}
```

### Method Contract

#### `handleRoomsDuringMove(movedSpaceId, removedActorIds)`

**Preconditions** (enforced by caller, not validated here):
- The space move DB transaction has committed
- Community memberships have been cleared via `RoleSetService`
- `removedActorIds` contains ALL actors that were removed from the community (users, orgs, VCs)

**Postconditions** (best-effort, fire-and-forget):
- All `removedActorIds` have been removed from every communication room in the subtree
- All `removedActorIds` have been removed from Matrix space hierarchy membership
- Updates rooms for the moved space and all descendant spaces have been recreated empty
- New updates rooms are linked to their respective Communication entities in the DB

**Error behavior**:
- Matrix adapter failures are logged and swallowed (fire-and-forget)
- DB failures for updates room recreation are logged; the old room is preserved as fallback
- The method never throws — all errors are caught and logged

**Performance characteristics**:
- Room ID collection: Single DB query (QueryBuilder with JOINs)
- Membership revocation: O(actors × 1) adapter calls — each actor's rooms are batched
- Updates room recreation: O(spaces) — one delete + create per space in subtree
- Total adapter calls: `removedActorIds.length × 2` (room batch + space batch) + `spaces.length × 2` (delete + create)

## Adapter Methods Used

All methods are existing, no adapter changes needed.

| Method | Signature | Error Strategy |
|--------|-----------|----------------|
| `batchRemoveMember` | `(actorID: string, roomIds: string[], reason?: string) → boolean` | `boolean` (false on error) |
| `batchRemoveSpaceMember` | `(actorID: string, contextIds: string[], reason?: string) → boolean` | `boolean` (false on error) |
| `deleteRoom` | `(roomId: string, reason?: string) → boolean` | `boolean` (false on error) |
| `createRoom` | `(roomId: string, type: RoomType, name?: string, initialMembers?: string[], parentContextId?: string) → boolean` | `boolean` (false on error) |

## Integration Sequence

```
083 Move Service                    084 SpaceMoveRoomsService
       |                                      |
       |  1. Move space (DB transaction)       |
       |  2. Clear community memberships       |
       |  3. Update authorization policies     |
       |                                       |
       |---handleRoomsDuringMove()------------>|
       |   (fire-and-forget)                   |
       |                                       |  4. Collect room IDs (DB query)
       |                                       |  5. For each actor:
       |                                       |     - batchRemoveMember(actor, rooms)
       |                                       |     - batchRemoveSpaceMember(actor, spaces)
       |                                       |  6. For each space in subtree:
       |                                       |     - Delete old updates room
       |                                       |     - Create new updates room
       |                                       |     - Link to Communication entity
       |                                       |
       |  (continues without waiting)          |
       v                                       v
```

## Dependency Graph

```
SpaceMoveRoomsService
├── SpaceLookupService          (get descendant space IDs)
├── CommunicationAdapter        (batch remove members, delete/create rooms)
├── RoomService                 (create room entity)
├── CommunicationService        (get/update Communication entity)
├── EntityManager / Repository  (room ID collection query, updates room swap)
└── Logger (Winston)            (structured error logging)
```
