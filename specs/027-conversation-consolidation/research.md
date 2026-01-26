# Research: Conversation Architecture & Matrix Adapter Refactor

**Feature**: `027-conversation-consolidation`
**Consolidates**: `021`, `022`, `023`, `024`

## Decisions

### 1. Unified Actor Pattern

- **Decision**: Use `Agent.id` as the single `actorId` for all Matrix operations.
- **Rationale**: Eliminates the need to distinguish between Users and Virtual Contributors in the adapter layer. Simplifies the Go library contract.

### 2. Pivot Table Membership

- **Decision**: Use explicit `conversation_membership` table.
- **Rationale**: Normalizes the data model, supports future multi-party conversations, and removes redundant columns (`userID`, `virtualContributorID`) from the `conversation` table.

### 3. Platform-Owned Conversations

- **Decision**: All conversations belong to a single `ConversationsSet` linked to the `Platform`.
- **Rationale**: Centralizes ownership, simplifies querying, and enables global authorization inheritance from the Platform.

### 4. Authorization Inheritance

- **Decision**: `ConversationsSet` inherits authorization from `Platform`.
- **Rationale**: Ensures global admins have consistent access to all conversations without per-conversation ACL management.

### 5. Legacy Column Removal

- **Decision**: Drop `wellKnownVirtualContributor`, `externalRoomID`, and `communicationID` immediately.
- **Rationale**: These fields are replaced by better mechanisms (Platform lookup service, internal UUIDs, Agent IDs) and keeping them creates confusion.

### 6. Matrix Adapter Architecture

- **Decision**: Use RabbitMQ with Direct Reply-To for RPC.
- **Rationale**: Standard AMQP pattern supported by the new Go library. Decouples the Node.js server from the Matrix homeserver implementation details.
