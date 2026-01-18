# Implementation Plan: Conversation Architecture & Matrix Adapter Refactor

**Branch**: `020-conversation-consolidation`
**Spec**: [spec.md](spec.md)
**Consolidates**: `021`, `022`, `023`, `024`

## Phase 1: Database Schema & Migration

- [x] **Migration**: `ConversationArchitectureRefactor` (consolidated).
  - Create `conversation_membership` table.
  - Add `vcInteractionsByThread` to `room`.
  - Migrate `vc_interaction` data.
  - Drop `vc_interaction` table.
  - Add `conversationsSetId` to `platform`.
  - Migrate conversations to platform set.
  - Drop legacy columns (`userID`, `virtualContributorID`, `type`, `conversationsSetId` on user).

## Phase 2: Domain Model Updates

- [x] **Entities**: Update `Conversation`, `ConversationsSet`, `Platform`, `Room` entities.
- [x] **Membership**: Implement `ConversationMembership` entity.
- [x] **Inheritance**: Implement `ConversationsSetAuthorizationService` inheritance from Platform.
- [x] **Service**: Update `ConversationsSetService` to use platform relationship.

## Phase 3: Matrix Adapter Refactor

- [x] **Library**: Switch to `@alkem-io/matrix-adapter-go-lib`.
- [x] **Adapter**: Rewrite `CommunicationAdapter` to use new library types and methods.
- [x] **RPC**: Implement `CommunicationRpcModule` for AMQP communication.
- [x] **Events**: Implement `CommunicationAdapterEventService` for handling incoming events.
- [x] **Actor Pattern**: Ensure all calls use `agent.id` as `actorId`.

## Phase 4: Message Inbox & Logic

- [x] **Inbox**: Implement `MessageInboxService` to handle incoming messages/reactions.
- [x] **Mentions**: Update mention handling to work with new actor IDs.
- [x] **Direct Messages**: Update DM handling logic.

## Verification

- [x] **Tests**: Verify `communication.adapter.spec.ts` passes.
- [x] **Tests**: Verify `conversations.set.service.authorization.spec.ts` passes.
- [x] **Tests**: Verify `platform.service.authorization.spec.ts` passes.
