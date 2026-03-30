# Research: Room Handling During Cross-Space Moves

**Date**: 2026-03-30 | **Branch**: `084-move-room-handling`

## R-001: Room Collection Strategy — How to Gather All Room IDs in a Space Subtree

**Decision**: Create a new query method that traverses the space subtree and collects room IDs from three sources: callout discussion rooms, post comment rooms, and communication updates rooms.

**Rationale**: No existing method collects all room IDs for a space subtree. The current `CommunicationService.getRoomIds()` returns only the updates room for a single Communication entity. We need to traverse:
- `Space → Collaboration → CalloutsSet → Callout.comments` (RoomType.CALLOUT)
- `Space → Collaboration → CalloutsSet → Callout → Contributions → Post.comments` (RoomType.POST)
- `Space → Community → Communication.updates` (RoomType.UPDATES)

The query should accept a list of space IDs (the moved space + all descendants) and return a flat list of room IDs. Using a single TypeORM query with JOINs is more efficient than loading full entity trees.

**Alternatives considered**:
- Using Matrix space hierarchy (`getSpace()` to list child rooms): Rejected — would require multiple RPC calls and doesn't guarantee completeness.
- Loading full Space entity trees with eager relations: Rejected — too heavy for potentially deep subtrees.

---

## R-002: Membership Revocation Mechanism

**Decision**: Use `CommunicationAdapter.batchRemoveMember(actorID, roomIds[])` per actor, iterating over all actors being removed from the community. Additionally use `CommunicationAdapter.batchRemoveSpaceMember(actorID, contextIds[])` for Matrix space hierarchy removal.

**Rationale**: The adapter's batch API accepts one actor and multiple rooms, matching the per-actor iteration pattern. The existing `CommunityCommunicationService.removeMemberFromCommunication()` only handles the updates room. For the move, we need to remove from ALL rooms in the subtree.

The two-level approach:
1. **Room-level** (`batchRemoveMember`): Explicitly removes from each callout/post/updates room
2. **Space-level** (`batchRemoveSpaceMember`): Removes from Matrix space hierarchy, which revokes implicit access to child rooms

Both `batchRemoveSpaceMember()` and `batchRemoveMember()` exist in the adapter but `batchRemoveSpaceMember` has never been called from any service. This feature is the first consumer.

**Alternatives considered**:
- Room-level only (skip space-level): Rejected — Matrix space membership grants implicit room access; leaving it would create a gap.
- New bulk adapter endpoint (all actors + all rooms in one call): Rejected — requires changes to the Go Matrix Adapter; the existing per-actor batch is sufficient.
- Event-driven async removal via RabbitMQ queue: Rejected for initial implementation — adds complexity without clear benefit given the fire-and-forget pattern already handles failures gracefully. Could be considered if performance issues arise with large communities.

---

## R-003: Fire-and-Forget Error Handling Pattern

**Decision**: Follow the established `CommunityCommunicationService` pattern — call adapter methods without awaiting, catch errors with structured logging, never block the caller.

**Rationale**: The existing pattern in `community.communication.service.ts` (lines 17-31, 33-50) uses `.catch()` to swallow errors from communication operations. This is consistent with:
- FR-008: "Membership revocation MUST NOT block or roll back the database move transaction"
- The assumption that Matrix operations are best-effort and the adapter handles retries at the transport level

The move service will call the room handling service after the DB transaction commits. The room handling service will fire-and-forget all adapter calls with structured error logging.

**Alternatives considered**:
- Await all adapter calls and aggregate errors: Rejected — violates FR-008 non-blocking requirement.
- RabbitMQ-based async job queue with retry: Rejected for initial implementation — over-engineering given the existing pattern works and the adapter has transport-level reliability (heartbeats, reconnection).

---

## R-004: Updates Room Recreation Strategy

**Decision**: For each space in the moved subtree: (1) delete the old updates room via `RoomService.deleteRoom()`, (2) create a new empty updates room via `RoomService.createRoom()`, (3) update the Communication entity's `updates` relation to point to the new room.

**Rationale**: The Communication entity has a `@OneToOne` cascade-delete relationship with the updates Room. However, we cannot rely on cascade because we want to replace (not just delete) the room. The explicit delete-then-create approach:
- Removes the old Matrix room (via adapter `deleteRoom`)
- Creates a fresh Matrix room (via adapter `createRoom`)
- Updates the local DB record

This matches the existing room lifecycle in `RoomService.createRoom()` and `RoomService.deleteRoom()`.

**Alternatives considered**:
- Clear message history in-place (without recreating room): Rejected — Matrix does not support bulk message deletion. Individual message redaction would be prohibitively expensive for rooms with many messages.
- Mark old room as archived and create a new one: Rejected — adds complexity (archived room state) without benefit. The old room's messages are not needed.
- Only delete local Room entity, leave Matrix room orphaned: Rejected — orphaned Matrix rooms consume resources and could theoretically be accessed if room ID is known.

---

## R-005: Integration Point with 083 Move Service

**Decision**: The 083 move service calls a single method on the new `SpaceMoveRoomsService` after community memberships have been cleared but conceptually "after the DB transaction." The call is fire-and-forget.

**Rationale**: The 083 move flow is:
1. Validate move prerequisites
2. Update space hierarchy (parent, levelZeroSpaceID, etc.) — DB transaction
3. Clear community memberships via `RoleSetService.removeAllContributorsFromRoleSet()`
4. Update authorization policies
5. **→ Call `spaceMoveRoomsService.handleRoomsDuringMove(spaceId, removedActorIds)` ← 084 hook**

The existing `removeActorFromRole()` already removes actors from the updates room (line 1082 in `role.set.service.ts`). However, it does NOT:
- Remove from callout/post rooms
- Remove from Matrix space hierarchy
- Recreate the updates room

So 084's hook provides the additional room handling that 083's community clearing doesn't cover.

**Alternatives considered**:
- Domain event: Rejected for initial implementation — the move service directly orchestrates the flow; adding an event layer introduces indirection without clear benefit.
- Interceptor/middleware: Rejected — the move operation is not a standard CRUD action; explicit service call is clearer.

---

## R-006: Callout Room Membership Model — How Users Access Callout Rooms

**Decision**: Users access callout/post rooms through the **Matrix space hierarchy**, not through individual room memberships. The standard community join flow adds users to the Matrix space (via the adapter), which grants implicit access to child rooms.

**Rationale**: Investigation revealed:
- `addContributorToCommunications()` only adds to the updates room (room-level)
- There is NO code that adds users to individual callout/post rooms when they join a community
- `batchAddSpaceMember()` exists in the adapter but is never called from any service
- The Matrix adapter has `createRoom(... parentContextId)` which places rooms inside a Matrix space

This means the Matrix space hierarchy governs access to callout/post rooms. When a user is a member of the Matrix space for an Alkemio space, they can access all child rooms in that Matrix space.

**Implication for 084**:
- Membership revocation at the Matrix space level (`batchRemoveSpaceMember`) is essential — it's the mechanism that actually gates access to callout/post rooms
- Room-level `batchRemoveMember` for the updates room handles the direct membership (since updates room membership is explicitly managed)
- After the move, new members joining through `addContributorToCommunications()` get added to the new updates room. Their access to callout rooms comes from Matrix space hierarchy membership, which is handled by a separate path when they join the community.

**Open question for implementation**: Verify whether the community join flow also calls `batchAddSpaceMember()` or if Matrix space membership is implicit via room creation. If it's NOT called, the standard re-population flow (FR-010–FR-013) may require adding a `batchAddSpaceMember()` call to the community join path.

---

## R-007: Message Count Accuracy After Move (FR-005)

**Decision**: No action needed. The `Room.messagesCount` field is derived from the adapter response when rooms are queried — it reflects the live state of the Matrix room.

**Rationale**: From `room.service.ts` and `communication.adapter.ts`, the message count is computed from the messages array returned by `getRoom()`. Since the Matrix room is preserved (callout/post rooms are not deleted), the message count remains accurate. The local `messagesCount` column serves as a cache and will be refreshed on the next query.

**Alternatives considered**: None needed — the existing mechanism handles this correctly.
