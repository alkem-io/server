# Feature Specification: Conversation Architecture & Matrix Adapter Refactor

**Feature Branch**: `020-conversation-consolidation`
**Consolidates**: `021-refactor-matrix-adapter`, `022-conversation-architecture-refactor`, `023-drop-wellknown-vc-column`, `024-conversations-set-inheritance`
**Status**: Implemented (Consolidated)

## Overview

This specification consolidates a major refactoring of the conversation domain and communication infrastructure. It unifies conversation management under a single platform-owned set, introduces a flexible membership model via a pivot table, upgrades the Matrix Adapter to use the new Go-based library with a unified "Actor" pattern, and establishes proper authorization inheritance from the Platform.

## User Scenarios & Testing

### User Story 1 - Platform-Owned Conversations (Priority: P0)

**From Spec 022 & 024**: All conversations must belong to a single `ConversationsSet` owned by the `Platform`. This replaces the legacy model of per-user conversation sets. The `ConversationsSet` must inherit authorization policies from the `Platform`, ensuring global admins have appropriate access.

**Acceptance Scenarios**:

1.  **Given** a platform instance, **When** the system starts, **Then** it ensures a `ConversationsSet` exists and is linked to the `Platform`.
2.  **Given** a new conversation, **When** created, **Then** it is assigned to the platform's `ConversationsSet`.
3.  **Given** a global admin, **When** accessing the `ConversationsSet`, **Then** access is granted via inheritance from the Platform policy.

### User Story 2 - Flexible Membership Model (Priority: P0)

**From Spec 022**: Conversation membership is tracked via a `ConversationMembership` pivot table (linking `Conversation` and `Agent`), replacing rigid `userID` and `virtualContributorID` columns. This supports future multi-party conversations and normalizes the data model.

**Acceptance Scenarios**:

1.  **Given** a conversation between User A and User B, **When** created, **Then** two rows are added to `conversation_membership` linking the conversation to their respective Agent IDs.
2.  **Given** a query for conversation members, **When** executed, **Then** it retrieves agents via the pivot table.
3.  **Given** legacy columns (`userID`, `virtualContributorID`), **When** the migration runs, **Then** these columns are dropped.

### User Story 3 - Matrix Adapter Upgrade (Priority: P1)

**From Spec 021**: The `CommunicationAdapter` is refactored to use `@alkemio/matrix-adapter-lib`. It adopts the "Unified Actor Pattern," using `Agent.id` as the `actorId` for all communication operations, eliminating the distinction between Users and Virtual Contributors at the adapter level.

**Acceptance Scenarios**:

1.  **Given** a message send request, **When** processed, **Then** the adapter uses `agent.id` as the `sender_actor_id`.
2.  **Given** a room creation, **When** processed, **Then** it uses `AlkemioRoomID` (UUID) as the identifier.
3.  **Given** a space creation, **When** processed, **Then** it uses `AlkemioContextID` (Authorization ID) as the identifier.

### User Story 4 - Schema Cleanup (Priority: P2)

**From Spec 023**: Remove unused columns and tables to maintain hygiene.

**Acceptance Scenarios**:

1.  **Drop `vc_interaction` table**: Data migrated to `room.vcInteractionsByThread` JSONB column.
2.  **Drop `communicationID`**: Removed from `user`, `virtual_contributor`, `organization`.

## Requirements

### Functional Requirements

- **FR-001**: Implement `ConversationMembership` entity and pivot table.
- **FR-002**: Link `ConversationsSet` to `Platform` (FK: `conversationsSetId`) and implement auth inheritance.
- **FR-003**: Refactor `CommunicationAdapter` to use `@alkemio/matrix-adapter-lib`.
- **FR-004**: Use `Agent.id` as `actorId` in all communication payloads.
- **FR-005**: Migrate `vc_interaction` data to `room.vcInteractionsByThread`.
- **FR-006**: Drop legacy columns: `user.conversationsSetId`, `conversation.userID`, `conversation.virtualContributorID`, `conversation.type`, `room.externalRoomID`.

### Key Entities

- **Platform**: Owns `ConversationsSet`.
- **ConversationsSet**: Contains all conversations.
- **Conversation**: Linked to `ConversationsSet`, has members via `ConversationMembership`.
- **ConversationMembership**: Links `Conversation` <-> `Agent`.
- **CommunicationAdapter**: Interface to Matrix via RabbitMQ.
- **MessageInboxService**: Domain sink for incoming messages and reactions.
- **CommunicationRpcModule**: Handles AMQP RPC communication.

## Success Criteria

- **SC-001**: All conversations are accessible via the platform set.
- **SC-002**: Communication flows (messaging, rooms) work with the new adapter.
- **SC-003**: Database schema is clean (no legacy columns).
- **SC-004**: Authorization inheritance works as expected.
