# Tasks: Group Conversations & Unified Messaging API

**Input**: Design documents from `/specs/040-group-conversations/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — omitted. Risk-based tests can be added per constitution.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Database migration and enum foundation

- [x] T001 Add `CONVERSATION_GROUP` value to RoomType enum in `src/common/enums/room.type.ts`
- [x] T002 Create migration to add `conversation_group` to RoomType database enum in `src/migrations/<timestamp>-AddConversationGroupRoomType.ts`
- [x] T003 [P] Update Matrix adapter `mapRoomType` to map `CONVERSATION_GROUP` → `RoomTypeCommunity` in `src/services/adapters/communication-adapter/communication.adapter.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove redundant `CommunicationConversationType` enum, prepare subscription infrastructure for new events. MUST complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Delete `CommunicationConversationType` enum file `src/common/enums/communication.conversation.type.ts` and remove all imports/re-exports across the codebase (check barrel files in `src/common/enums/`)
- [x] T005 [P] Create `ConversationCreationType` enum (DIRECT, GROUP) for the unified mutation input in `src/common/enums/conversation.creation.type.ts` — register with GraphQL
- [x] T006 [P] Add `MEMBER_ADDED`, `MEMBER_REMOVED`, and `CONVERSATION_DELETED` values to `ConversationEventType` enum in `src/domain/communication/conversation/dto/subscription/conversation.event.subscription.result.ts`
- [x] T007 [P] Create `ConversationMemberAddedEvent`, `ConversationMemberRemovedEvent`, and `ConversationDeletedEvent` GraphQL object types in `src/domain/communication/conversation/dto/subscription/conversation.event.subscription.result.ts`
- [x] T008 Update `ConversationEventSubscriptionPayload` interface: add `memberAdded`, `memberRemoved`, and `conversationDeleted` optional fields in `src/services/subscriptions/subscription-service/dto/conversation.event.subscription.payload.ts`
- [x] T009 Update `ConversationEventSubscriptionResult` GraphQL type: add `memberAdded`, `memberRemoved`, and `conversationDeleted` fields in `src/domain/communication/conversation/dto/subscription/conversation.event.subscription.result.ts`
- [x] T010 Remove `_resolvedUser` and `_resolvedVirtualContributor` fields from `IConversation` interface in `src/domain/communication/conversation/conversation.interface.ts`

**Checkpoint**: Old enum deleted, new enums registered, subscription types extended — user story implementation can begin

---

## Phase 3: User Story 1 — Unified Conversation Members Resolution (Priority: P1) 🎯 MVP

**Goal**: Replace `user`/`virtualContributor` field resolvers with a unified `members` field returning all actors with their types.

**Independent Test**: Query any direct conversation via GraphQL and verify the `members` field returns all participants as actors.

### Implementation for User Story 1

- [x] T011 [US1] Remove `type` field resolver (and `inferConversationType` call) from `src/domain/communication/conversation/conversation.resolver.fields.ts`
- [x] T012 [US1] Remove `user` field resolver from `src/domain/communication/conversation/conversation.resolver.fields.ts`
- [x] T013 [US1] Remove `virtualContributor` field resolver from `src/domain/communication/conversation/conversation.resolver.fields.ts`
- [x] T014 [US1] Add `members` field resolver to `src/domain/communication/conversation/conversation.resolver.fields.ts` — use `ConversationMembershipsLoaderCreator` to batch-load memberships, then `ContributorByAgentIdLoaderCreator` to resolve each actor. Return `[IActor]`.
- [x] T015 [US1] Delete `inferConversationType` method from `src/domain/communication/conversation/conversation.service.ts`
- [x] T016 [US1] Remove all remaining `CommunicationConversationType` references in `src/domain/communication/messaging/messaging.service.ts` — rename `getConversationsForAgent` to `getConversationsForActor`, remove the `typeFilter` parameter entirely (flat listing — client handles categorization). Remove `getConversationsForUser` wrapper (no longer needed). Preserve the base query logic (membership join + room eager-load).

**Checkpoint**: `members` field works for existing direct conversations. Old type/user/vc fields gone.

---

## Phase 4: User Story 2 — Create Group Conversation (Priority: P1)

**Goal**: Users can create group conversations via the unified `createConversation` mutation with explicit DIRECT/GROUP type.

**Independent Test**: Call `createConversation(type: GROUP, memberIDs: [...])` and verify a group conversation with `CONVERSATION_GROUP` room is created.

### Implementation for User Story 2

- [x] T017 [US2] Refactor `CreateConversationInput` DTO in `src/domain/communication/conversation/dto/conversation.dto.create.ts`: replace `userID`, `virtualContributorID`, `wellKnownVirtualContributor` fields with `type: ConversationCreationType` and `memberIDs: UUID[]`. Update internal `CreateConversationData` interface accordingly.
- [x] T018 [US2] Unify `createConversation` + `createGroupConversation` into a single `createConversation(creatorAgentId, memberAgentIds[], roomType)` method in `src/domain/communication/conversation/conversation.service.ts`: deduplicate members, validate ≥2, create entity + room + N membership records. Room creation dispatches by roomType (DIRECT → sender/receiver, GROUP → N members).
- [x] T019 [US2] Unify `createConversationRoom` in `src/domain/communication/conversation/conversation.service.ts` — single private method accepting `(memberActorIDs[], roomType)`, branching internally for DIRECT (sender/receiver pattern) vs GROUP (N member IDs).
- [x] T020 [US2] Unify `createConversation` in `src/domain/communication/messaging/messaging.service.ts` — single public method handles both types: DIRECT gets member count validation + dedup check as early return guard, then shared path creates conversation, assigns to platform messaging, applies auth, publishes event. No separate private methods for direct/group.
- [x] T021 [US2] Update `createConversation` mutation in `src/domain/communication/messaging/messaging.resolver.mutations.ts` — accept new unified input shape, resolve member IDs to agent IDs, delegate to messaging service.
- [x] T022 [US2] Simplify `publishConversationCreatedEvents` in `src/domain/communication/messaging/messaging.service.ts` — single event with all memberAgentIds for both DIRECT and GROUP (no personalized per-member events, no `_resolvedUser`/`_resolvedVirtualContributor`). Called from the unified `createConversation` method.

**Checkpoint**: Group conversations can be created. Direct conversation creation still works.

---

## Phase 5: User Story 3 — Manage Group Membership (Priority: P1)

**Goal**: Members can add/remove others and leave group conversations. Membership changes publish subscription events.

**Independent Test**: Add a member to a group conversation, verify they appear in `members` list. Remove them, verify they disappear.

### Implementation for User Story 3

- [x] T023 [P] [US3] Create `AddConversationMemberInput` DTO in `src/domain/communication/conversation/dto/conversation.dto.add-member.ts` — fields: `conversationID: UUID`, `memberID: UUID`
- [x] T024 [P] [US3] Create `RemoveConversationMemberInput` DTO in `src/domain/communication/conversation/dto/conversation.dto.remove-member.ts` — fields: `conversationID: UUID`, `memberID: UUID`
- [x] T025 [P] [US3] Create `LeaveConversationInput` DTO in `src/domain/communication/conversation/dto/conversation.dto.leave.ts` — fields: `conversationID: UUID`
- [x] T026 [US3] Implement `addMember` method in `src/domain/communication/conversation/conversation.service.ts` — validate conversation is GROUP (check `room.type`), validate member not already present (idempotent), create ConversationMembership record. Return updated conversation.
- [x] T027 [US3] Implement `removeMember` method in `src/domain/communication/conversation/conversation.service.ts` — validate conversation is GROUP, validate member exists, delete ConversationMembership record. If 0 members remain, auto-delete conversation + room. Return updated conversation (or null if deleted). Note: no separate `leaveConversation` service method — `removeMember` is used directly by both mutations.
- [x] T028 [US3] ~~Implement `leaveConversation` method~~ — Eliminated during post-implementation unification. The `leaveConversation` mutation calls `removeMember` directly via the shared `removeMemberAndPublish` resolver helper.
- [x] T029 [US3] Add `addConversationMember` mutation to `src/domain/communication/conversation/conversation.resolver.mutations.ts` — auth check: `CONTRIBUTE` on conversation authorization. Resolve memberID to agent ID, call service, re-apply authorization policy via `ConversationAuthorizationService.applyAuthorizationPolicy()` + save, publish `MEMBER_ADDED` subscription event with all current memberAgentIds.
- [x] T030 [US3] Add `removeConversationMember` and `leaveConversation` mutations to `src/domain/communication/conversation/conversation.resolver.mutations.ts` — both delegate to a shared `removeMemberAndPublish` private helper that handles: auth check (CONTRIBUTE for remove, READ for leave), collecting member IDs before removal, calling `removeMember`, re-applying auth policy, and publishing `MEMBER_REMOVED` event. The only differences are the auth privilege level and which member ID is removed (explicit ID vs `actorContext.actorID`).
- [x] T031 [US3] ~~Separate `leaveConversation` mutation~~ — Merged into T030 via `removeMemberAndPublish` shared helper.

**Checkpoint**: Full group membership lifecycle works — add, remove, leave, auto-delete on empty.

---

## Phase 6: User Story 4 — Group Conversation Lifecycle (Priority: P2)

**Goal**: Group conversations can be explicitly deleted, with all members notified.

**Independent Test**: Delete a group conversation and verify it disappears from all members' listings.

### Implementation for User Story 4

- [x] T032 [US4] Update `deleteConversation` in `src/domain/communication/conversation/conversation.resolver.mutations.ts` — before deletion, collect all memberAgentIds. After deletion, publish a `CONVERSATION_DELETED` subscription event with all memberAgentIds so all members' subscriptions fire.

**Checkpoint**: Group conversation deletion notifies all members.

---

## Phase 7: User Story 5 — Subscription Events for Group Conversations (Priority: P2)

**Goal**: Subscription resolver correctly handles all event types for group conversations with N members.

**Independent Test**: Subscribe to conversation events, send a message in a group with 4 members, verify all 4 receive the event.

### Implementation for User Story 5

- [x] T033 [US5] Update subscription `resolve` function in `src/domain/communication/conversation/conversation.resolver.subscription.ts` — add cases for `MEMBER_ADDED`, `MEMBER_REMOVED`, and `CONVERSATION_DELETED` event types, mapping payload fields to result fields (`memberAdded`, `memberRemoved`, `conversationDeleted`).
- [x] T034 [US5] Verify subscription `filter` function in `src/domain/communication/conversation/conversation.resolver.subscription.ts` works correctly for N memberAgentIds (existing `payload.memberAgentIds.includes(actorContext.actorID)` check — should work as-is, confirm no hardcoded 2-member assumptions).

**Checkpoint**: All subscription event types work for both direct and group conversations.

---

## Phase 8: User Story 6 — Unified Conversation Listing (Priority: P2)

**Goal**: Replace categorized conversation listing with a flat list. Remove `users`, `virtualContributors`, and `virtualContributor(wellKnown:)` fields from `MeConversationsResult`. Client handles all categorization via member actor types and room types.

**Independent Test**: Create a group conversation, query `me.conversations.conversations` and verify both direct and group conversations appear in a single flat list with correct members and room types.

### Implementation for User Story 6

- [x] T035 [US6] Replace `MeConversationsResult` in `src/services/api/me/dto/me.conversations.result.ts` — remove `users`, `virtualContributors` fields and `virtualContributor` method. Add single `conversations: IConversation[]` field.
- [x] T036 [US6] Replace all field resolvers in `src/services/api/me/me.conversations.resolver.fields.ts` — remove `users`, `virtualContributors`, `virtualContributor(wellKnown:)` resolvers. Add single `conversations` resolver that calls `messagingService.getConversationsForActor(actorContext.actorID)` and returns the flat list. Remove `CommunicationConversationType` import.

**Checkpoint**: `me.conversations.conversations` returns all conversations (direct + group) in a flat list. Client can categorize by `room.type` and `members[].type`.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Schema validation, cleanup, regression check

- [x] T037 Regenerate GraphQL schema: `pnpm run schema:print && pnpm run schema:sort`
- [x] T038 Run full test suite `pnpm test:ci:no:coverage` — fix any regressions from removed fields/enum
- [x] T039 [P] Search codebase for any remaining `CommunicationConversationType` or `inferConversationType` references and remove them
- [x] T040 [P] Verify `resetConversationVc` mutation still works correctly — it checks for VC members via ActorType (should be unaffected by enum removal, confirm)
- [x] T041 Update `src/domain/communication/conversation/conversation.module.ts` if new DTOs/providers need registration. Note: register providers incrementally as they are created in Phases 2-5 — do not defer all registrations to this task. This task is a final verification pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — MVP, should be done first
- **US2 (Phase 4)**: Depends on Phase 2. Independent of US1 but benefits from it being complete (members field available).
- **US3 (Phase 5)**: Depends on US2 (group conversations must exist to manage membership)
- **US4 (Phase 6)**: Depends on US2 (group conversations must exist to delete them)
- **US5 (Phase 7)**: Depends on Phase 2 (event types). Can parallel with US3/US4.
- **US6 (Phase 8)**: Depends on US1 (T036 calls `getConversationsForActor` which is renamed by T016 in US1). Independent of US2 — flat listing works for both direct and group conversations.
- **Polish (Phase 9)**: Depends on all story phases complete

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → US1 (Members) → US6 (Listing) ──┐
                                           US2 (Create)  ───────────────────┼→ US3 (Membership) → Polish
                                           US5 (Subs)    ───────────────────┤   US4 (Lifecycle) ↗
```

- **US1**: Independent after Phase 2
- **US2**: Independent after Phase 2 (can parallel with US1)
- **US3**: Requires US2
- **US4**: Requires US2
- **US5**: Independent after Phase 2 (subscription resolver changes)
- **US6**: Requires US1 (T036 calls `getConversationsForActor` renamed by T016)

### Parallel Opportunities

- **Phase 1**: T001 + T003 in parallel (T002 depends on T001)
- **Phase 2**: T005 + T006 + T007 + T010 in parallel after T004
- **Phase 3 + Phase 4**: US1 and US2 can run in parallel after Phase 2
- **Phase 5**: T023 + T024 + T025 in parallel (different DTO files)
- **Phase 7 + Phase 6**: US5 and US4 can run in parallel
- **Phase 8**: Can run after US1 completes (T036 depends on T016's method rename)

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (migration + enum)
2. Complete Phase 2: Foundational (enum cleanup + subscription types)
3. Complete Phase 3: US1 — Unified Members
4. **STOP and VALIDATE**: Query existing direct conversations, verify `members` returns all actors
5. All existing functionality works with new `members` field

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Members) → Existing conversations use new field → **MVP!**
3. US2 (Create Group) → Groups can be created → Demo
4. US3 (Membership) → Full group lifecycle → Demo
5. US4 + US5 + US6 (Lifecycle + Subs + Listing) → Complete feature
6. Polish → Schema validated, tests green

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story is independently testable after completion
- No test tasks generated (not requested) — add if needed during implementation
- The `CommunicationConversationType` removal (T004) is the highest-risk change — all downstream tasks assume it's gone
- Schema regeneration (T037) MUST happen before PR — BREAKING-APPROVED required

## Phase 10: Event-Driven Architecture & Room Properties

**Purpose**: Refactor membership and room property mutations to fire-and-forget pattern. Mutations send RPCs to Matrix only; inbound Matrix events trigger DB persistence, auth policy re-application, and subscription publishing.

- [x] T042 Add `avatarUrl` nullable column to Room entity (`src/domain/communication/room/room.entity.ts`) + migration
- [x] T043 Add `UpdateConversationInput` DTO and `updateConversation` mutation for GROUP conversations (displayName + avatarUrl)
- [x] T044 Make `updateRoomDisplayName` and `updateRoomAvatar` fire-and-forget (RPC only, no local DB write) in `src/domain/communication/room/room.service.ts`
- [x] T045 Implement `handleRoomUpdated` event handler in `src/services/event-handlers/internal/message-inbox/message.inbox.service.ts` — persist displayName/avatarUrl from inbound `room.updated` events and publish `CONVERSATION_UPDATED` subscription
- [x] T046 Add `CONVERSATION_UPDATED` event type and `ConversationUpdatedEvent` GraphQL type to subscription result DTOs
- [x] T047 Fix `isConversationRoom()` in message.inbox.service.ts to include `CONVERSATION_GROUP` (was missing, blocking subscription events for group conversations)
- [x] T048 Refactor `addMember`/`removeMember` in `conversation.service.ts` to send RPC only (no DB writes). Add `persistMemberAdded`/`persistMemberRemoved` methods for event handlers.
- [x] T049 Implement `handleRoomMemberUpdated` event handler — for conversation rooms: persist membership on join/leave, re-apply auth policies, publish MEMBER_ADDED/MEMBER_REMOVED subscription events, auto-delete on 0 remaining members
- [x] T050 Change mutation return types from `Conversation`/`Conversation?` to `Boolean!` for `addConversationMember`, `removeConversationMember`, `leaveConversation`, `updateConversation`
- [x] T051 Remove auth re-application and subscription publishing from mutation resolvers (moved to event handlers)
- [x] T052 Remove redundant `room.member.left` event handler (covered by `room.member.updated` with `membership=leave`)
- [x] T053 Improve adapter event logging with `[queue-name] - Event received:` prefix for all inbound RabbitMQ events
- [x] T054 Update module dependencies: add `ActorModule`, `AuthorizationPolicyModule` to `message.inbox.module.ts`

---

## Post-Implementation Unification Notes

Three rounds of method unification were performed after the initial implementation:

1. **`conversation.service.ts`**: Merged `createConversation(agent1, agent2, createRoom)` + `createGroupConversation(creator, members[])` into a single `createConversation(creatorAgentId, memberAgentIds[], roomType)`. The private `createConversationRoom` was similarly unified to accept `(memberActorIDs[], roomType)` and branch internally for DIRECT (sender/receiver) vs GROUP (N members). Dedup check moved to the messaging layer.

2. **`messaging.service.ts`**: Collapsed four methods (`createConversation` router, `createDirectConversation`, `createGroupConversation`, `createAndPublishConversation`) into a single `createConversation` method. The DIRECT-specific validation (exactly 1 member) and dedup check are an early-return guard at the top; everything else is shared.

3. **`conversation.resolver.mutations.ts`**: Extracted `removeMemberAndPublish` private helper used by both `removeConversationMember` and `leaveConversation` mutations. The `leaveConversation` service method was deleted — `removeMember` is called directly. The only differences between the two mutations are the auth privilege (CONTRIBUTE vs READ) and the member ID (explicit vs `actorContext.actorID`).
