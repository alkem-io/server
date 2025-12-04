# Tasks: Refactor Matrix Adapter

**Branch**: `022-refactor-matrix-adapter` | **Spec**: [specs/022-refactor-matrix-adapter/spec.md](specs/022-refactor-matrix-adapter/spec.md) | **Plan**: [specs/022-refactor-matrix-adapter/plan.md](specs/022-refactor-matrix-adapter/plan.md)

## Phase 1: Setup
**Goal**: Prepare the environment and dependencies.

- [x] T001 Verify `@alkem-io/matrix-adapter-go-lib@0.2.0` is installed and available in `package.json` ✅ COMPLETE
- [x] T002 [P] Create `specs/022-refactor-matrix-adapter/tasks.md` (this file) ✅ COMPLETE

## Phase 2: Foundation
**Goal**: Clean up legacy dependencies and introduce unified Actor pattern.

### Architectural Simplification: Unified Actor Pattern
Instead of passing `User` or `VirtualContributor` through services and resolving `communicationID` at the bottom, we:
1. Rename `senderCommunicationsID` → `actorId` in all adapter DTOs
2. Services accept `actorId: string` (which is `contributor.agent.id`)
3. Callers resolve `agent.id` once at the entry point (resolver/controller level)
4. No distinction between User/VC in the communication layer

- [x] T003 Remove `@alkem-io/matrix-adapter-lib` from `package.json` and uninstall ✅ COMPLETE
- [x] T004 Remove legacy `MatrixAdapterEventType` imports in `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE (full adapter rewrite with new lib imports)
- [x] T005 Rename `senderCommunicationsID` → `actorId` in all adapter DTOs under `src/services/adapters/communication-adapter/dto/` ✅ COMPLETE
- [x] T005b Update adapter method signatures to use `actorId: string` instead of `communicationUserID` terminology ✅ COMPLETE (new methods use actorId)

## Phase 3: System Initialization & User Sync (US1)
**Goal**: Establish connection and ensure Users are synced using the new protocol (Simplification: Remove manual registration).

**Key Mapping**: `AlkemioActorID` = `Agent.id` (from `User.agent.id` or `VirtualContributor.agent.id`), NOT the entity's own ID.

- [x] T006 [US1] Implement `syncActor` method in `src/services/adapters/communication-adapter/communication.adapter.ts` using `SyncActorRequest` (expects `agent.id` as `actor_id`) ✅ COMPLETE
- [x] T007 [US1] Update `UserService` to call `syncActor` with `user.agent.id` instead of `tryRegisterNewUser` in `src/domain/community/user/user.service.ts` ✅ COMPLETE
- [x] T007b [US1] Update `VirtualContributorService` to call `syncActor` with `vc.agent.id` ✅ COMPLETE
- [x] T008 [US1] Remove `tryRegisterNewUser` method from `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE
- [x] T009 [US1] Remove `communicationID` field usage from all services: ✅ COMPLETE
  - ✅ `src/domain/community/user/user.service.ts` - COMPLETE (uses agent.id now)
  - ✅ `src/domain/community/virtual-contributor/virtual.contributor.service.ts` - COMPLETE
  - ✅ `src/domain/communication/conversation/conversation.service.ts` - N/A (uses Communication entity ID)
  - ✅ `src/services/room-integration/room.controller.service.ts` - N/A (no contributor communicationID)
  - ✅ `src/services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.invocation.ts` - N/A (no contributor communicationID)
- [x] T009b [US1] Delete `IdentityResolverService` entirely (`src/services/infrastructure/entity-resolver/identity.resolver.service.ts`) and remove from module providers ✅ COMPLETE
- [x] T010 [US1] Verify `CommunicationAdapter` connects to broker on startup ✅ COMPLETE (existing broker connection preserved)

## Phase 4: Room & Space Management (US2)
**Goal**: Implement Room/Space lifecycle using Alkemio UUIDs (Simplification: Unified Room creation, Hierarchy support).

**Key Mappings**:
- `AlkemioRoomID` = `Room.id`
- `AlkemioContextID` = `Authorization.id` (Space's authorization policy ID)
- `AlkemioActorID` = `Agent.id` (for membership operations)

- [x] T011 [US2] Implement `createRoom` method in `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE
  - **InitialMembers usage**:
    - `CONVERSATION_DIRECT` (DMs): YES - pass both sender + receiver as InitialMembers
    - `CONVERSATION` (User-to-VC): YES - pass user as InitialMember
    - `UPDATES` (Space rooms): NO - no members at creation; use `batchAddMember` later
    - Community rooms: NO - creator optionally passed; membership via batch operations
- [x] T011b [US2] Implement `updateRoom` method in `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE
- [x] T011c [US2] Implement `deleteRoom` method in `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE
- [x] T012 [US2] Implement `createSpace` method in `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE
- [x] T012b [US2] Implement `updateSpace` method in `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE
- [x] T012c [US2] Implement `deleteSpace` method in `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE
- [x] T013 [US2] Implement `setParent` method in `src/services/adapters/communication-adapter/communication.adapter.ts` (use for moving existing rooms/spaces) ✅ COMPLETE
- [x] T014 [US2] Implement `batchAddMember` and `batchRemoveMember` in `src/services/adapters/communication-adapter/communication.adapter.ts` (use `agent.id` as `actor_id`) ✅ COMPLETE
- [x] T015 [US2] Update `RoomService` to use `createRoom` with `AlkemioRoomID` (room.id) in `src/domain/communication/room/room.service.ts` ✅ COMPLETE (already uses room.id)
- [x] T016 [US2] Remove `createExternalCommunicationRoom` and `startDirectMessagingToUser` usage in `src/domain/communication/room/room.service.ts` ✅ COMPLETE (createExternalCommunicationRoom is now private helper, startDirectMessagingToUser removed)
- [ ] T017 [US2] Update `CommunicationService` to use `createSpace` for new spaces, `setParent` for moving existing (DEFERRED - requires deeper integration with Space lifecycle, not blocking for MVP)
- [x] T018 [US2] Remove `adminReplicateRoomMembership` and `updateMatrixRoomState` from `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE (all deprecated methods removed)
- [x] T019 [US2] Remove `externalRoomID` usage in `src/domain/communication/room/room.service.ts` (use `room.id`) ✅ COMPLETE - field removed from entity and interface

## Phase 5: Messaging & Reactions (US3)
**Goal**: Enable messaging using the new protocol (Simplification: Remove Identity Resolution).

**Key Mapping**: `sender_actor_id` = `Agent.id` (the sender's agent ID). Adapter returns `AlkemioActorID` in responses, eliminating the need for `IdentityResolverService`.

- [x] T020 [US3] Implement `sendMessage` method in `src/services/adapters/communication-adapter/communication.adapter.ts` using `SendMessageRequest` (use `agent.id` as `sender_actor_id`) ✅ COMPLETE
- [x] T020b [US3] Implement `sendMessageReply` method in `src/services/adapters/communication-adapter/communication.adapter.ts` (threaded replies via `parent_message_id`) ✅ COMPLETE
- [x] T021 [US3] Implement `addReaction` and `removeReaction` in `src/services/adapters/communication-adapter/communication.adapter.ts` (use `agent.id` as `sender_actor_id`) ✅ COMPLETE
- [x] T022 [US3] Implement `deleteMessage` in `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE
- [x] T022b [US3] Implement error handling pattern: log errors with `LogContext.COMMUNICATION` and fail operation (no auto-retry) per spec clarifications ✅ COMPLETE
- [x] T023 [US3] Update `RoomService` to use new messaging methods, passing `agent.id` in `src/domain/communication/room/room.service.ts` ✅ COMPLETE (already uses actorId pattern)
- [x] T023b [US3] Update GraphQL resolvers to resolve `agent.id` at entry point before calling services (FR-012) ✅ COMPLETE (verified: authentication layer populates `agentInfo.agentID` at entry point via `AgentInfoService.populateAgentInfoWithMetadata()`, resolvers pass it directly to services)
- [x] T024 [US3] Remove `IdentityResolverService` usage for message sender resolution in `src/domain/communication/room/room.service.ts` ✅ COMPLETE (uses getMessageSenderActor -> contributorLookupService pattern)
- [x] T025 [US3] Remove `getMessageSender` and `getReactionSender` from `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE (all deprecated methods removed)

## Phase 6: Admin Auditing (US4)
**Goal**: Enable admin visibility.

- [x] T026 [US4] Implement `listRooms` in `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE
- [x] T027 [US4] Implement `listSpaces` in `src/services/adapters/communication-adapter/communication.adapter.ts` ✅ COMPLETE
- [x] T028 [US4] Update `AdminCommunicationService` to use new list methods in `src/platform-admin/domain/communication/admin.communication.service.ts` ✅ COMPLETE (uses listRooms, getRoom, deleteRoom, updateRoom)

## Phase 7: Polish & Cleanup
**Goal**: Finalize code quality and remove deprecated artifacts.

- [x] T029 Run `pnpm lint` and fix any issues in `src/services/adapters/communication-adapter/` ✅ COMPLETE (TypeScript + ESLint pass)
- [x] T030 Run `pnpm build` to ensure type safety across all changes ✅ COMPLETE (tsc --noEmit passes)
- [x] T031 [P] Add TODO comments for pagination where applicable (FR-015) ✅ COMPLETE
  - Added to `getRoom()`: TODO for message pagination
  - Added to `listRooms()`: TODO for room list pagination
  - Added to `listSpaces()`: TODO for space list pagination
- [x] T032 Add structured `LogContext.COMMUNICATION` to all new adapter methods for observability ✅ COMPLETE

## Phase 7b: Code Optimization & Simplification
**Goal**: Reduce boilerplate and eliminate code duplication.

- [x] T042 Extract generic RPC helper `sendCommand<TResponse>()` in CommunicationAdapter to reduce boilerplate ✅ COMPLETE
  - ~193 lines removed from adapter (1061 → 868 lines)
  - Unified error handling with `onError` strategy: 'throw' | 'silent' | 'boolean'
  - `ensureSuccess` option for business logic error checking
- [x] T043 Remove unused `handleTransportError` method from CommunicationAdapter ✅ COMPLETE
- [x] T044 Fix `any` types in logging methods (changed to `unknown`) ✅ COMPLETE
- [x] T045 Remove unused `transform` option from RpcOptions interface ✅ COMPLETE
- [x] T046 Optimize CommunicationService ✅ COMPLETE
  - Removed unused logger injection
  - Added `readonly` modifiers to all dependencies
  - Removed redundant `await` in save() method
  - Optimized `getCommunicationIDsUsed()` query (select only IDs, not full entities)
  - Added synchronous `getRoomIds()` method
  - Removed deprecated async `getRoomsUsed()` method
  - Updated AdminCommunicationService to use `getRoomIds()` instead
- [x] T047 Remove duplicate `getRoomOrFail` from RoomService ✅ COMPLETE
  - RoomService now delegates to RoomLookupService.getRoomOrFail()
  - Single source of truth for room lookups

## Phase 8: Database Migration & Metrics
**Goal**: Clean up deprecated database columns and measure impact.

- [x] T033 Create TypeORM migration to drop `communicationID` column from `user` table ✅ COMPLETE (combined migration)
- [x] T034 Create TypeORM migration to drop `communicationID` column from `virtual_contributor` table ✅ COMPLETE (combined migration)
- [x] T035 Create TypeORM migration to drop `externalRoomID` column from `room` table ✅ COMPLETE (combined migration)
- [x] T036 Measure LOC reduction: ✅ COMPLETE
  - **Overall Change**: 140 files changed, 6,559 insertions(+), 8,606 deletions(-)
  - **Net LOC Reduction**: ~2,047 lines removed
  - **Key Deletions**:
    - `identity.resolver.service.ts`: 43 lines deleted (entire file)
    - `contributor.*.ts` entity files: 9 lines (communicationID field removal)
    - `room.entity.ts` / `room.interface.ts`: externalRoomID field removed
    - Various test mocks: communicationID field removal

## Phase 9: Verification & Unit Tests
**Goal**: Verify contract tests pass and add meaningful unit tests for new adapter methods (no busywork, only value-adding tests).

- [x] T041 Run `pnpm test:ci` to verify all existing contract tests pass (SC-002) ✅ COMPLETE (402 tests pass)
- [x] T037 [P] Add unit tests for `syncActor` in `src/services/adapters/communication-adapter/communication.adapter.spec.ts` ✅ COMPLETE
  - 4 tests: payload construction, success handling, error handling, optional avatarUrl
- [x] T038 [P] Add unit tests for `createRoom`/`createSpace` verifying correct DTO construction ✅ COMPLETE
  - 5 tests: full payload, room type mapping (direct vs community), space payload, verbose logging
- [x] T039 [P] Add unit tests for `sendMessage` verifying `AlkemioActorID` is passed correctly ✅ COMPLETE
  - 4 tests: sender_actor_id in payload, IMessage structure, empty roomID validation, ensureSuccess error handling
- [x] T040 [P] Add unit tests for error handling (verify log + fail pattern) ✅ COMPLETE
  - 10 tests covering all three onError strategies:
    - 'throw': transport error throws CommunicationAdapterException with operation context
    - 'silent': returns empty string, logs error (getMessageSenderActor, getReactionSenderActor)
    - 'boolean': returns false, logs error (deleteRoom, batchAddMember)
  - ensureSuccess option: throws on business logic failure when true, returns value when false
  - Disabled communications: short-circuit behavior (4 tests)

## Dependencies
- Phase 2 (Foundation) must complete before any US phase
- US1 (User Sync) blocks US2 (Membership)
- US2 (Rooms) blocks US3 (Messaging)
- US4 is independent

## Architectural Notes

### Unified Actor Pattern
The refactor introduces a unified "Actor" concept:
- **`actorId`** = `contributor.agent.id` (works for both User and VirtualContributor)
- Services no longer need to know if the actor is a User or VC
- Resolution happens once at the entry point (GraphQL resolver / controller)
- The adapter and all downstream code only deals with `actorId: string`

### ID Mapping Summary
| New Protocol Term | Alkemio Source | Notes |
|-------------------|----------------|-------|
| `AlkemioActorID` | `contributor.agent.id` | Unified for User/VC |
| `AlkemioRoomID` | `room.id` | Direct mapping |
| `AlkemioContextID` | `space.authorization.id` | Space's auth policy ID |

### Deprecated Fields (REMOVED)
- ~~`User.communicationID`~~ - REMOVED, replaced by `agent.id`
- ~~`VirtualContributor.communicationID`~~ - REMOVED, replaced by `agent.id`
- ~~`Organization.communicationID`~~ - REMOVED, replaced by `agent.id`
- ~~`Room.externalRoomID`~~ - REMOVED, replaced by `room.id`

## Implementation Strategy
- **MVP**: Complete Phase 2 (Foundation) + Phase 3 (User Sync) + Phase 4 (Rooms) to restore basic connectivity.
- **Incremental**: Messaging (Phase 5) can be added after Rooms are stable.
- **Simplification Focus**: Remove all "glue code" that resolved Matrix IDs; let Go Adapter handle it.
