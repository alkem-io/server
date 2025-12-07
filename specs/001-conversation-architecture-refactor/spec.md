# Feature Specification: Conversation Architecture Refactor

**Feature Branch**: `001-conversation-architecture-refactor`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Refactor conversations to use platform-owned conversation set with pivot table for membership instead of user-owned sets"

## Clarifications

### Session 2025-12-05

- Q: Should the system enforce exactly 2 members per conversation, or allow flexible member counts? → A: Enforce exactly 2 members per conversation for this refactor, but design pivot table to support future expansion (no DB constraint against >2 members)
- Q: Does membership in a conversation automatically grant read and send message privileges, or should authorization remain separate from membership? → A: Membership automatically grants read and send message privileges - Authorization policies derive from membership in pivot table
- Q: How should the system handle concurrent conversation creation between the same two agents? → A: Idempotent creation with unique constraint on sorted agent pair - Database enforces uniqueness, concurrent attempts return existing conversation
- Q: Should migration include data transformation or focus on schema changes only? → A: Schema changes only - Data migration (if required) will be handled separately as a distinct effort

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Platform Manages All Conversations (Priority: P1)

The platform centralizes conversation management by owning all conversations in a single conversation set, eliminating per-user conversation sets and enabling more efficient querying and management of conversations regardless of participant type.

**Why this priority**: This is the foundational architectural change that enables all subsequent improvements. Without centralizing conversation ownership, the current fragmented model with duplicated conversations continues to cause data inconsistencies and query complexity.

**Independent Test**: Can be fully tested by verifying that all conversations belong to a single platform-owned conversation set and that user entities no longer have individual conversation sets. Delivers immediate value by simplifying the data model and eliminating duplicate conversation records.

**Acceptance Scenarios**:

1. **Given** a user wants to start a conversation, **When** the conversation is created, **Then** it is added to the single platform conversation set (not a user-specific set)
2. **Given** the platform conversation set exists, **When** querying all conversations, **Then** all conversations are retrievable from this single set regardless of participant types
3. **Given** a user entity, **When** examining its structure, **Then** no conversationSetId field exists on the user entity
4. **Given** multiple conversations between different user pairs, **When** examining the database, **Then** no duplicate conversation records exist for the same logical conversation

---

### User Story 2 - Membership via Pivot Table (Priority: P1)

Conversations track their participants through a many-to-many pivot table linking conversation IDs to agent IDs, replacing the current direct foreign key references (userID, virtualContributorID) and enabling flexible multi-participant support.

**Why this priority**: This is equally foundational as Story 1. The pivot table structure is what enables the elimination of duplicate conversations and provides a clean, normalized data model for tracking conversation membership.

**Independent Test**: Can be fully tested by creating conversations between various agent types and verifying that membership is correctly tracked in the pivot table without any direct foreign key references. Delivers value by normalizing the conversation-participant relationship.

**Acceptance Scenarios**:

1. **Given** a conversation between two users, **When** the conversation is created, **Then** both user agent IDs are recorded in the conversation membership pivot table
2. **Given** a conversation between a user and a virtual contributor, **When** the conversation is created, **Then** both the user agent ID and virtual contributor agent ID are recorded in the pivot table
3. **Given** an existing conversation, **When** querying its members, **Then** all participant agents are retrieved via the pivot table relationship
4. **Given** a conversation entity, **When** examining its fields, **Then** no userID or virtualContributorID columns exist

---

### User Story 3 - Conversation Type Inference (Priority: P2)

The system determines conversation type (user-to-user vs user-to-virtual-contributor) by analyzing the actual agent types of current conversation members, rather than storing the type explicitly in a database field.

**Why this priority**: This removes redundant stored state that can become inconsistent with the actual membership data. It's dependent on Stories 1 and 2 being implemented first but provides important data integrity benefits.

**Independent Test**: Can be tested independently by creating conversations with different agent type combinations and verifying the system correctly infers the conversation type from the membership pivot table. Delivers value by ensuring conversation type is always consistent with actual membership.

**Acceptance Scenarios**:

1. **Given** a conversation with two user agents as members, **When** the conversation type is queried, **Then** it is inferred as USER_USER
2. **Given** a conversation with one user agent and one virtual contributor agent, **When** the conversation type is queried, **Then** it is inferred as USER_VC
3. **Given** a conversation entity, **When** examining stored fields, **Then** no explicit type field exists in the database
4. **Given** conversation member agents change, **When** the conversation type is queried again, **Then** the inferred type reflects the current membership

---

### User Story 4 - Virtual Contributor Metadata Management (Priority: P2)

Well-known virtual contributor identifiers are stored directly on the virtual contributor entity rather than on individual conversation records, eliminating redundant data and ensuring a single source of truth.

**Why this priority**: This cleanup removes redundant denormalization and ensures virtual contributor classification is managed centrally. It's a data quality improvement that depends on the core architecture changes.

**Independent Test**: Can be tested by verifying that well-known virtual contributor properties are stored on the virtual contributor entity and are retrieved through the conversation's member relationship. Delivers value by eliminating redundant data storage and potential inconsistencies.

**Acceptance Scenarios**:

1. **Given** a virtual contributor entity, **When** it is a well-known virtual contributor, **Then** the wellKnownVirtualContributor identifier is stored on the virtual contributor entity
2. **Given** a conversation with a well-known virtual contributor, **When** querying the conversation, **Then** the well-known identifier is retrieved through the virtual contributor member relationship
3. **Given** a conversation entity, **When** examining its fields, **Then** no wellKnownVirtualContributor field exists on the conversation
4. **Given** a virtual contributor's well-known status changes, **When** querying related conversations, **Then** all conversations automatically reflect the updated status without data migration

---

### Edge Cases

- What happens when two users attempt to create a conversation with each other simultaneously? Database unique constraint on sorted agent pair prevents duplicates; concurrent attempts safely return the existing conversation.
- What happens when a conversation has no members (orphaned conversation)? System MUST identify orphaned conversations (membership count = 0 or 1) via automated database query and remove them. Orphaned conversation cleanup will be implemented as part of the migration validation process.
- How does the system handle querying conversations when an agent is deleted? The pivot table entry should be removed via cascade deletion, and conversation membership reflects remaining participants.
- What happens if a conversation has members but agents cannot be resolved? System should handle gracefully with appropriate error logging and potentially mark conversation as invalid.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST store all conversations in a single platform-owned conversation set
- **FR-002**: System MUST remove conversationSetId field from user entities
- **FR-003**: System MUST implement a pivot table (conversationId ↔ agentId) to track conversation membership
- **FR-003a**: System MUST enforce exactly 2 members per conversation during this refactor (application-level validation)
- **FR-003b**: Pivot table design MUST support future expansion to multi-party conversations (no database constraint limiting to 2 members)
- **FR-004**: System MUST remove userID column from conversation entities
- **FR-005**: System MUST remove virtualContributorID column from conversation entities
- **FR-006**: System MUST remove wellKnownVirtualContributor column from conversation entities
- **FR-007**: System MUST store wellKnownVirtualContributor identifier on virtual contributor entities
- **FR-008**: System MUST remove the explicit type column from conversation entities
- **FR-009**: System MUST infer conversation type (USER_USER vs USER_VC) by analyzing the agent types of conversation members
- **FR-010**: System MUST determine agent type (user vs virtual contributor) by examining the actual agent entity relationship
- **FR-011**: System MUST support querying all conversations for a specific user through the pivot table
- **FR-012**: System MUST support querying all conversations for a specific virtual contributor through the pivot table
- **FR-013**: System MUST maintain referential integrity between conversations and agents through appropriate foreign key constraints on the pivot table
- **FR-013a**: System MUST enforce uniqueness constraint on sorted agent pairs to prevent duplicate conversations between the same two agents (concurrent creation attempts return existing conversation)
- **FR-014**: System MUST provide database migration scripts for schema changes (add platform conversation set, create pivot table, add wellKnownVirtualContributor to VirtualContributor). Note: Deprecated column removal (userID, virtualContributorID, type, wellKnownVirtualContributor from Conversation; conversationsSet from User) is IN SCOPE and will occur in this migration after code updates are deployed and validated.
- **FR-015**: System MUST update all conversation query logic to use the pivot table instead of direct foreign key lookups
- **FR-016**: System MUST update all conversation creation logic to populate the pivot table
- **FR-017**: System MUST ensure conversation authorization logic works with the new membership model - membership in pivot table automatically grants read and send message privileges to conversation participants
- **FR-018**: System MUST maintain GraphQL API compatibility for conversation queries (resolvers adapt to new data model)

### Key Entities _(include if feature involves data)_

- **Platform ConversationsSet**: The single conversation set owned by the platform that contains all conversations. Replaces multiple user-owned conversation sets.
- **Conversation**: Represents a communication channel between agents. No longer stores direct participant references (userID, virtualContributorID) or explicit type. Linked to platform conversation set.
- **ConversationMembership (Pivot Table)**: Junction table linking conversations to agent participants. Contains conversationId and agentId foreign keys with appropriate cascading delete behaviors. Current refactor enforces exactly 2 members per conversation at application level, but table design permits future multi-party expansion without schema migration.
- **Agent**: Represents an actor in the system (can be a user's agent or a virtual contributor's agent). Used to identify conversation participants.
- **User**: User entity with conversationSetId relationship removed.
- **VirtualContributor**: Virtual contributor entity with wellKnownVirtualContributor identifier added (if not already present).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All conversations in the system belong to a single platform conversation set (100% of conversations)
- **SC-002**: Conversation queries return results within the same performance threshold as the current implementation (no regression in query performance)
- **SC-003**: All existing conversation features (message retrieval, conversation creation, member identification) continue to function without user-visible changes
- **SC-004**: All conversation-related GraphQL API queries and mutations maintain backward compatibility (no breaking changes to the schema)
- **SC-005**: Code complexity metrics show reduction in conversation-related logic (fewer conditional branches based on conversation type)
