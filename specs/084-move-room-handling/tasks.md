# Tasks: Room Handling During Cross-Space Moves

**Input**: Design documents from `/specs/084-move-room-handling/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/internal-api.md

**Tests**: Unit tests included — plan.md explicitly calls for unit tests on the orchestration service.

**Organization**: Tasks grouped by user story. US1 and US2 are co-P1; US3 is P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the new NestJS module skeleton and wire it into the communication module.

- [x] T001 Create NestJS module file `src/domain/communication/space-move-rooms/space.move.rooms.module.ts` with imports for CommunicationModule dependencies (SpaceLookupService, CommunicationAdapter, RoomService, CommunicationService) and export SpaceMoveRoomsService
- [x] T002 Create service skeleton `src/domain/communication/space-move-rooms/space.move.rooms.service.ts` with constructor injecting SpaceLookupService, CommunicationAdapter, RoomService, CommunicationService, EntityManager, and Winston logger. Stub `handleRoomsDuringMove(movedSpaceId: string, removedActorIds: string[]): Promise<void>`
- [x] T003 Register SpaceMoveRoomsModule in the parent communication module so it is available for injection by 083's move service. Identify the correct parent module barrel file and add the import/export

---

## Phase 2: Foundational (Room Collection Infrastructure)

**Purpose**: Data collection methods that MUST be complete before any user story can be implemented. These queries power both membership revocation (US2) and updates room recreation (US3).

- [x] T004 [P] Implement `collectAllRoomIdsInSubtree(spaceIds: string[]): Promise<string[]>` in `src/domain/communication/space-move-rooms/space.move.rooms.service.ts` — TypeORM QueryBuilder with UNION of three queries: (1) callout rooms via `room JOIN callout JOIN callouts_set JOIN collaboration JOIN space`, (2) post rooms via `room JOIN post JOIN callout_contribution JOIN callout JOIN callouts_set JOIN collaboration JOIN space`, (3) updates rooms via `room JOIN communication WHERE spaceID IN spaceIds`. Return flat deduplicated array of room UUIDs. See data-model.md "Room ID Collection Query" for exact JOIN paths.
- [x] T005 [P] Implement `getCommunicationsWithUpdatesRooms(spaceIds: string[]): Promise<{ communicationId: string; updatesRoomId: string; spaceId: string; displayName: string }[]>` in `src/domain/communication/space-move-rooms/space.move.rooms.service.ts` — TypeORM QueryBuilder joining communication with its updates room, filtered by spaceID IN spaceIds. Returns the info needed to delete old and create new updates rooms.

- [x] T005b [P] Verify post-move re-population path (FR-010–FR-013): grep for `batchAddSpaceMember` callers in the community join flow (`CommunityCommunicationService`, `RoleSetService`). If the standard join path does NOT add users to the Matrix space hierarchy, add `batchAddSpaceMember` to `addContributorToCommunications()`. If it does, document the finding as a code comment in `handleRoomsDuringMove()`. See research.md R-006.

**Checkpoint**: Room collection infrastructure ready — user story implementation can begin.

---

## Phase 3: User Story 2 — Revoke Room Memberships After Move (Priority: P1) :dart: MVP

**Goal**: When community memberships are cleared during a cross-L0 move, revoke all user memberships from every communication room in the moved subtree. Former members cannot post or receive updates.

**Independent Test**: Move an L1 subspace with community members. Verify former members cannot post to any room (callout discussion, post comments, updates) in the moved space.

### Implementation for User Story 2

- [x] T006 [US2] Implement `revokeRoomMembershipsForActors(actorIds: string[], roomIds: string[]): void` in `src/domain/communication/space-move-rooms/space.move.rooms.service.ts` — For each actorId, call `communicationAdapter.batchRemoveMember(actorId, roomIds, 'cross-L0-move')` using fire-and-forget pattern (no await, `.catch()` with structured error logging using `LogContext.COMMUNICATION`). Match the pattern from `src/domain/community/community-communication/community.communication.service.ts`.
- [x] T007 [US2] Implement `revokeSpaceMembershipsForActors(actorIds: string[], spaceIds: string[]): void` in `src/domain/communication/space-move-rooms/space.move.rooms.service.ts` — For each actorId, call `communicationAdapter.batchRemoveSpaceMember(actorId, spaceIds, 'cross-L0-move')` using fire-and-forget pattern. This is the first consumer of `batchRemoveSpaceMember` in the codebase — it revokes Matrix space hierarchy access that gates callout/post room visibility (see research.md R-006).
- [x] T008 [US2] Wire revocation into `handleRoomsDuringMove()` orchestrator: (1) call `spaceLookupService.getAllDescendantSpaceIDs(movedSpaceId)` to get full subtree, (2) prepend movedSpaceId to get all spaceIds, (3) call `collectAllRoomIdsInSubtree(spaceIds)`, (4) call `revokeRoomMembershipsForActors(removedActorIds, roomIds)`, (5) call `revokeSpaceMembershipsForActors(removedActorIds, spaceIds)`. Wrap entire method in try/catch that logs and swallows — method must never throw.
- [x] T009 [US2] Unit test for membership revocation in `src/domain/communication/space-move-rooms/space.move.rooms.service.spec.ts` — Test: (a) `batchRemoveMember` called once per actor with all room IDs, (b) `batchRemoveSpaceMember` called once per actor with all space IDs, (c) adapter errors do not propagate (fire-and-forget), (d) empty removedActorIds skips revocation, (e) empty room IDs skips adapter calls, (f) verify batch call count is O(actors) not O(actors × rooms) — each actor gets one batched call, keeping within 10s AMQP RPC timeout for large membership lists

**Checkpoint**: Membership revocation is functional. Former community members lose access to all rooms in the moved subtree.

---

## Phase 4: User Story 1 — Preserve Discussion Comments After Move (Priority: P1)

**Goal**: All callout discussion rooms and post comment rooms retain their full message history after the move. Comments remain attributed to original authors. Room entities and their Matrix rooms are untouched.

**Independent Test**: Create an L1 subspace with 10+ comments from different users in a callout. Move the L1. Verify all comments are visible, correctly attributed, in original order.

### Implementation for User Story 1

- [x] T010 [US1] Verify preservation by design — review `handleRoomsDuringMove()` and confirm that: (a) `collectAllRoomIdsInSubtree()` is read-only (no DELETE/UPDATE on room table), (b) revocation methods only call `batchRemoveMember`/`batchRemoveSpaceMember` (membership operations), not `deleteRoom`, (c) only updates rooms are deleted (in US3), not callout/post rooms, (d) message count (FR-005) is preserved because `Room.messagesCount` is adapter-derived at query time, not a stale cache — verify in `room.service.ts`. Document this verification as a code comment in `handleRoomsDuringMove()`.
- [x] T011 [US1] Unit test for preservation in `src/domain/communication/space-move-rooms/space.move.rooms.service.spec.ts` — Test: (a) `communicationAdapter.deleteRoom` is NOT called for any callout or post room ID, (b) Room entity repository has no save/update/delete calls for callout/post rooms, (c) `handleRoomsDuringMove()` with zero removedActorIds still succeeds (rooms preserved, no revocation needed)

**Checkpoint**: Comment preservation verified. Callout/post rooms survive untouched.

---

## Phase 5: User Story 3 — Recreate Community Updates Room (Priority: P2)

**Goal**: The community updates room for the moved space (and all descendant spaces) is recreated empty after the move. Old announcements are discarded.

**Independent Test**: Create an L1 subspace, post several community updates. Move it. Verify the updates room is empty and new updates can be posted.

### Implementation for User Story 3

- [x] T012 [US3] Implement `recreateUpdatesRooms(communications: { communicationId: string; updatesRoomId: string; spaceId: string; displayName: string }[]): Promise<void>` in `src/domain/communication/space-move-rooms/space.move.rooms.service.ts` — For each communication: (1) delete old updates room via `roomService.deleteRoom({ roomID: updatesRoomId })` (this removes both DB entity and Matrix room), (2) create new empty room via `roomService.createRoom({ displayName: 'updates-<displayName>', type: RoomType.UPDATES })`, (3) update Communication entity's `updates` relation to point to the new room via repository save. Wrap each iteration in try/catch — if one space fails, continue with the rest. Log errors with structured details. Within each iteration, if `deleteRoom` succeeds but `createRoom` fails, log a CRITICAL-level error with the affected spaceId/communicationId — the space is left without an updates room until manual re-creation.
- [x] T013 [US3] Wire updates room recreation into `handleRoomsDuringMove()`: after revocation steps, call `getCommunicationsWithUpdatesRooms(spaceIds)` then `recreateUpdatesRooms(communications)`. This ensures old announcements are discarded and the updates channel is fresh for the new community context.
- [x] T014 [US3] Unit test for updates room recreation in `src/domain/communication/space-move-rooms/space.move.rooms.service.spec.ts` — Test: (a) `roomService.deleteRoom` called once per communication, (b) `roomService.createRoom` called once per communication with type UPDATES, (c) Communication entity updated with new room reference, (d) failure in one space's recreation does not prevent others, (e) empty communications list is a no-op

**Checkpoint**: Updates rooms recreated empty across the entire subtree. All three user stories are functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalization, edge cases, and module integration.

- [x] T015 Ensure all structured log messages in `space.move.rooms.service.ts` use `LogContext.COMMUNICATION` and include `{ movedSpaceId, actorCount: removedActorIds.length, roomCount: roomIds.length }` in details payload — never interpolate IDs into the message string (Constitution Principle 5, exception handling rule)
- [x] T016 Verify `SpaceMoveRoomsModule` is exported correctly and can be injected by a consumer module. Add a barrel export `index.ts` in `src/domain/communication/space-move-rooms/` if the project convention requires it. Check existing module patterns (e.g., `src/domain/communication/communication/`) for reference.
- [x] T017 Run full lint check (`pnpm lint`) and fix any issues in new files
- [x] T018 Run unit tests (`pnpm test -- src/domain/communication/space-move-rooms/`) and verify all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on T001-T003 (module skeleton must exist)
- **US2 (Phase 3)**: Depends on T004 (room collection) — the core MVP
- **US1 (Phase 4)**: Depends on T008 (orchestrator wired) — verification of preservation
- **US3 (Phase 5)**: Depends on T005 (communication lookup) and T008 (orchestrator exists)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US2 (P1)**: Can start after Phase 2 — no dependency on US1 or US3
- **US1 (P1)**: Depends on US2 being implemented (verification of what US2 does NOT do)
- **US3 (P2)**: Can start after Phase 2 — no dependency on US1 or US2. Can run in parallel with US2.

### Within Each User Story

- Implementation tasks before unit tests
- Core logic before orchestrator wiring
- All tasks in same service file — parallelism is method-level, not file-level

### Parallel Opportunities

- T004 and T005 (foundational queries) — different query methods, independent
- T006 and T007 (revocation methods) — different adapter calls, independent
- US2 and US3 implementation can proceed in parallel after foundational phase
- T009, T011, T014 (unit tests) can be written in parallel once their corresponding implementation is complete

---

## Parallel Example: Foundational Phase

```
# Launch both collection queries in parallel:
Task T004: "Implement collectAllRoomIdsInSubtree() in space.move.rooms.service.ts"
Task T005: "Implement getCommunicationsWithUpdatesRooms() in space.move.rooms.service.ts"
```

## Parallel Example: US2 + US3

```
# After foundational phase, launch both stories:
Stream A (US2): T006 → T007 → T008 → T009
Stream B (US3): T012 → T013 → T014
# US1 (T010 → T011) follows after US2 completes
```

---

## Implementation Strategy

### MVP First (US2 — Revoke Memberships)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005)
3. Complete Phase 3: US2 — Revoke Memberships (T006-T009)
4. **STOP and VALIDATE**: `handleRoomsDuringMove()` correctly revokes all memberships
5. This delivers the security-critical functionality first

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US2 (Revoke Memberships) → Security requirement met (MVP)
3. Add US1 (Preserve Comments) → Verified comments survive (co-P1)
4. Add US3 (Recreate Updates Room) → Clean slate for announcements (P2)
5. Polish → Production ready

### Single Developer Flow

All work is in one service file + one test file. Sequential execution:
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018

---

## Notes

- All implementation is in a single service file (`space.move.rooms.service.ts`) — ~200-300 LOC estimated
- No new GraphQL mutations, no migrations, no entity changes
- The `batchRemoveSpaceMember()` adapter method exists but has zero callers — US2 is the first consumer
- Fire-and-forget pattern: match `CommunityCommunicationService` (`.catch()` with structured logging)
- Room entities for callout/post survive automatically via FK cascade — US1 is verification, not implementation
- Integration with 083's move service is a single `handleRoomsDuringMove()` call — documented in contracts/internal-api.md
