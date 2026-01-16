# Tasks: Conversation Consolidation

**Spec**: [specs/020-conversation-consolidation/spec.md](specs/020-conversation-consolidation/spec.md)
**Plan**: [specs/020-conversation-consolidation/plan.md](specs/020-conversation-consolidation/plan.md)

## Phase 1: Matrix Adapter Refactor (Unified Actor)
**Goal**: Simplify the Matrix Adapter to use the Unified Actor pattern and remove legacy ID resolution.

- [x] T001 [021] Rename `senderCommunicationsID` → `actorId` (Agent ID) in adapter DTOs
- [x] T002 [021] Implement `CommunicationRpcModule` (RabbitMQ Direct Reply-To)
- [x] T003 [021] Implement `CommunicationAdapterEventService` (Handle incoming events)
- [x] T004 [021] Implement `MessageInboxService` (Domain sink for messages/reactions)
- [x] T005 [021] Implement `syncActor` (replacing `tryRegisterNewUser`)
- [x] T006 [021] Remove `communicationID` usage from all services
- [x] T007 [021] Delete `IdentityResolverService` (Legacy internal resolver)
- [x] T008 [021] Implement `createRoom`, `createSpace`, `sendMessage` using `actorId`
- [x] T009 [021] Remove `externalRoomID` usage from `RoomService`

## Phase 2: Core Conversation Architecture
**Goal**: Implement the new `ConversationsSet` and `ConversationMembership` model.

- [x] T010 [022/024] Create `ConversationsSet` entity linked to `Platform` (OneToOne)
- [x] T011 [022] Create `ConversationMembership` pivot entity (Conversation ↔ Agent)
- [x] T012 [022] Implement `inferConversationType` logic
- [x] T013 [022] Implement `getConversationMembers` using pivot table
- [x] T014 [024] Implement authorization inheritance (Set inherits from Platform)

## Phase 3: Schema Cleanup & Migration
**Goal**: Remove legacy columns and enforce the new schema.

- [x] T015 [021/023/024] Create consolidated migration `conversationArchitectureRefactor`
  - Drops `communicationID` from `User`/`VirtualContributor`
  - Drops `externalRoomID` from `Room`
  - Drops `wellKnownVirtualContributor` from `Conversation`
  - Adds `conversationsSetId` to `Platform`
  - Creates `conversation_membership` table

## Phase 4: Verification
**Goal**: Ensure the consolidated conversation system works as expected.

- [x] T016 Verify Matrix Adapter connects and syncs actors using `agentId`
- [x] T017 Verify `ConversationsSet` is created for Platform
- [x] T018 Verify `ConversationMembership` correctly tracks participants
- [x] T019 Verify legacy columns (`communicationID`, `externalRoomID`) are gone
