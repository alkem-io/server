# Research: Room Handling During Cross-Space Moves

**Feature**: 084-move-room-handling
**Date**: 2026-03-30
**Status**: Complete (post-implementation documentation)

## Research Questions & Findings

### RQ-1: Room Collection Strategy — How to Gather All Room IDs in a Space Subtree

**Decision**: Three parallel raw TypeORM QueryBuilder queries, one per room type (callout, post, updates), joined through the entity graph. Results deduplicated via `Set<string>`.

**Rationale**: No existing method collects all room IDs for a space subtree. The current `CommunicationService.getRoomIds()` returns only the updates room for a single Communication entity. The entity graph paths are:
- **Callout rooms**: `Room ← Callout.comments ← CalloutsSet ← Collaboration ← Space`
- **Post rooms**: `Room ← Post.comments ← CalloutContribution ← Callout ← CalloutsSet ← Collaboration ← Space`
- **Updates rooms**: `Room ← Communication.updates (via spaceID FK on Communication)`

Raw QueryBuilder avoids loading full entity trees for what is fundamentally an ID collection query. Three parallel queries (via `Promise.all`) are faster than a single query with multiple outer joins, and easier to maintain.

**Alternatives considered**:
- Using Matrix space hierarchy (`getSpace()` to list child rooms): Rejected — would require multiple RPC calls and doesn't guarantee completeness (some rooms might not be in the Matrix space hierarchy).
- Loading full Space entity trees with eager relations: Rejected — too heavy for potentially deep subtrees with hundreds of callouts/posts.
- Adding a `spaceId` FK directly to Room: Rejected — would duplicate the relationship already expressed through the entity graph and require a migration. The room-to-space path is traversed only during moves, not on every request.

---

### RQ-2: Membership Revocation Mechanism

**Decision**: Two-level revocation using existing adapter batch APIs:
1. **Room-level**: `CommunicationAdapter.batchRemoveMember(actorID, roomIds[])` per actor
2. **Space-level**: `CommunicationAdapter.batchRemoveSpaceMember(actorID, contextIds[])` per actor

**Rationale**: The adapter's batch API accepts one actor and multiple rooms/spaces, making per-actor iteration the natural pattern. Call count is O(actors), not O(actors x rooms). For 100 actors and 50 rooms: 100 RPC calls, not 5,000.

The two-level approach is necessary because:
- Room-level removal explicitly removes from each callout/post/updates room
- Space-level removal revokes Matrix space-hierarchy access, which gates implicit access to child rooms

`batchRemoveSpaceMember()` existed in the adapter but was never called from any service before this feature — 084 is the first consumer.

**Alternatives considered**:
- Room-level only (skip space-level): Rejected — Matrix space membership grants implicit room access; leaving it creates a security gap.
- New bulk adapter endpoint (all actors + all rooms in one call): Rejected — requires changes to the Go Matrix Adapter; existing per-actor batch is sufficient within the 10s AMQP RPC timeout.
- Event-driven async removal via RabbitMQ queue: Rejected — adds complexity without clear benefit given fire-and-forget already handles failures gracefully.

---

### RQ-3: Fire-and-Forget Error Handling Pattern

**Decision**: Follow the established `CommunityCommunicationService` pattern — call adapter methods without awaiting, catch errors with structured logging, never throw to the caller.

**Rationale**: The existing pattern in `community.communication.service.ts` uses `.catch()` to swallow errors from communication operations. This is consistent with:
- FR-008: "Membership revocation MUST NOT block or roll back the database move transaction"
- NFR-001: "All communication adapter calls during the move MUST be fire-and-forget"
- The assumption that Matrix operations are best-effort with transport-level reliability (AMQP message durability)

The move service calls room handling after the DB transaction commits. The outer `try/catch` in `handleRoomsDuringMove()` ensures the method never throws, regardless of internal failures.

**Alternatives considered**:
- Await all adapter calls and aggregate errors: Rejected — violates FR-008 non-blocking requirement.
- Outbox pattern (persist commands in DB, process later): Rejected as over-engineering. Transport-level AMQP durability is sufficient; cost of a missed revocation is a stale Matrix membership resolvable operationally.

---

### RQ-4: Updates Room Recreation Strategy

**Decision**: Three-step per-space process: (1) delete old updates room via `RoomService.deleteRoom()`, (2) create new empty room via `RoomService.createRoom()`, (3) update Communication entity's `updates` reference.

**Rationale**: The Communication entity has a `@OneToOne` cascade-delete relationship with the updates Room. However, we cannot rely on cascade because we want to replace (not just delete). The explicit approach handles both DB and Matrix sides:
- `deleteRoom()`: Removes DB entity + calls adapter `deleteRoom()` (Matrix room deletion)
- `createRoom()`: Saves DB entity (gets ID) + calls adapter `createRoom()` (Matrix room creation)

Each space in the subtree is processed independently — failure in one does not prevent others.

**Alternatives considered**:
- Clear message history in-place (keep room, delete messages): Rejected — Matrix does not support bulk message deletion. Individual redaction is prohibitively expensive.
- Mark old room as archived + create new: Rejected — adds complexity (archived state) without benefit.
- Only delete local Room entity, leave Matrix room orphaned: Rejected — orphaned Matrix rooms consume resources and could theoretically be accessed.

---

### RQ-5: Post-Move Re-population of New Community Members

**Decision**: Standard community membership flow handles it automatically. No move-specific re-population logic needed.

**Rationale**: When a user joins a space's community via `RoleSetService.assignActorToRole()`, the existing chain:
1. `CommunityCommunicationService.addMemberToCommunication()`
2. `CommunicationService.addContributorToCommunications()`
3. `CommunicationAdapter.batchAddMember()` — adds to updates room
4. `CommunicationAdapter.batchAddSpaceMember()` — adds to Matrix space hierarchy

Step 4 grants the user Matrix space-hierarchy access, which in turn gives access to all callout/post rooms in that space. This is the same flow used for any space join — no move-specific handling required.

New members can read all pre-move comments because the Matrix rooms are preserved. They can write new comments because they now have membership.

**Alternatives considered**:
- Explicit room-by-room membership addition after move: Rejected — the existing space-hierarchy mechanism already covers it.

---

### RQ-6: Integration Point with 083 Move Service

**Decision**: The 083 move service calls `SpaceMoveRoomsService.handleRoomsDuringMove(spaceId, removedActorIds)` after community memberships have been cleared. The method signature is deliberately simple: two parameters, void return.

**Rationale**: The 083 move flow is:
1. Validate → 2. Update hierarchy (DB transaction) → 3. Clear community memberships → 4. Update auth policies → 5. **Call room handling (084)** → 6. Return

The existing `removeActorFromRole()` removes actors from the updates room but does NOT:
- Remove from callout/post rooms
- Remove from Matrix space hierarchy
- Recreate the updates room

So 084's hook provides the additional room handling that 083's community clearing doesn't cover.

**Alternatives considered**:
- Domain event pattern: Rejected — the move service directly orchestrates; adding an event layer introduces indirection without benefit.
- Interceptor/middleware: Rejected — move is not a standard CRUD action; explicit call is clearer.

---

### RQ-7: Message Count Accuracy After Move (FR-005)

**Decision**: No action needed. The `Room.messagesCount` field is derived from the adapter response at query time, reflecting the live Matrix room state.

**Rationale**: Since callout/post Matrix rooms are preserved (not deleted/recreated), their message count remains accurate. The local `messagesCount` column serves as a cache refreshed on the next query. No manual update required.
