# Data Model: Conversation Architecture & Matrix Adapter Refactor

**Feature**: `027-conversation-consolidation`
**Consolidates**: `021`, `022`, `023`, `024`

## Entities

### ConversationMembership (New)

- **Table**: `conversation_membership`
- **Fields**:
  - `conversationId` (uuid, PK, FK -> Conversation).
  - `agentId` (uuid, PK, FK -> Agent).
  - `createdAt` (TIMESTAMP, NOT NULL, DEFAULT now()).
- **Constraints**:
  - PK: `("conversationId", "agentId")`.
  - FK: `FK_285a9958dbcd10748d4470054d5` (conversationId) -> `conversation.id` (ON DELETE CASCADE).
  - FK: `FK_d348791d10e1f31c61d7f5bd2a7` (agentId) -> `agent.id` (ON DELETE CASCADE).
- **Indices**:
  - `IDX_285a9958dbcd10748d4470054d` on `conversationId`.
  - `IDX_d348791d10e1f31c61d7f5bd2a` on `agentId`.

### Conversation (Modified)

- **Table**: `conversation`
- **Removed Fields**:
  - `type` (varchar).
  - `userID` (uuid).
  - `virtualContributorID` (uuid).
  - `wellKnownVirtualContributor` (varchar).
- **Relationships**:
  - `memberships` (OneToMany -> ConversationMembership).
  - `conversationsSet` (ManyToOne -> ConversationsSet).

### Room (Modified)

- **Table**: `room`
- **New Field**: `vcInteractionsByThread` (jsonb, NOT NULL, DEFAULT '{}').
  - Stores aggregated interaction data previously in `vc_interaction` table.
  - Structure: Map of threadID -> { virtualContributorActorID, externalThreadId }.

### Platform (Modified)

- **Table**: `platform`
- **New Field**: `conversationsSetId` (uuid).
- **Constraints**:
  - `UQ_dc8bdff7728d61097c8560ae7a9` (UNIQUE).
  - `FK_dc8bdff7728d61097c8560ae7a9` -> `conversations_set.id` (ON DELETE CASCADE).

### User (Modified)

- **Table**: `user`
- **Removed Field**: `conversationsSetId` (uuid).
  - FK constraint dropped.
  - Ownership of `conversations_set` moved to `platform`.

### VC Interaction (Removed)

- **Table**: `vc_interaction`
- **Status**: Dropped. Data migrated to `room.vcInteractionsByThread`.

## Database Schema Changes

### Migration: `ConversationArchitectureRefactor1764897584127`

1.  **Create Table**: `conversation_membership` (with PK, FKs, Indices).
2.  **Drop Columns from `conversation`**: `type`, `userID`, `virtualContributorID`, `wellKnownVirtualContributor`.
3.  **Add Column to `room`**: `vcInteractionsByThread` (jsonb).
4.  **Data Migration**: Migrate `vc_interaction` rows to `room.vcInteractionsByThread`.
5.  **Drop Table**: `vc_interaction`.
6.  **Add Column to `platform`**: `conversationsSetId` (uuid, UNIQUE, FK).
7.  **Data Migration**: Assign existing `conversations_set` to `platform`, move conversations to it, delete orphans.
8.  **Drop Column from `user`**: `conversationsSetId` (and associated FK).

## Matrix Adapter Data Model

- **Actor ID**: Always maps to `Agent.id`.
- **Room ID**: Always maps to `Room.id` (UUID).
- **Context ID**: Always maps to `Space.authorization.id`.
