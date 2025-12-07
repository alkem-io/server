# Data Model: Conversation Architecture Refactor

**Date**: 2025-12-05
**Feature**: Conversation Architecture Refactor
**Phase**: 1 - Design & Contracts

## Overview

This document describes the data model changes for refactoring conversations to use a platform-owned conversation set with a pivot table for membership tracking. The refactor normalizes the conversation-participant relationship and eliminates redundant stored state.

## Entity Changes

### 1. ConversationMembership (NEW)

**Purpose**: Junction table implementing many-to-many relationship between Conversations and Agents

**Entity Definition**:
```typescript
@Entity()
export class ConversationMembership {
  @PrimaryColumn('uuid')
  conversationId!: string;

  @PrimaryColumn('uuid')
  agentId!: string;

  @ManyToOne(() => Conversation, conversation => conversation.memberships, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE'
  })
  conversation!: Conversation;

  @ManyToOne(() => Agent, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE'
  })
  agent!: Agent;

  @CreateDateColumn()
  createdAt!: Date;
}
```

**Fields**:
- `conversationId` (UUID, PK): Foreign key to Conversation
- `agentId` (UUID, PK): Foreign key to Agent
- `createdAt` (DATETIME): Timestamp when membership was established

**Indexes**:
- Primary Key: `(conversationId, agentId)` - Ensures unique membership
- Index on `agentId` - Optimize queries for "all conversations for an agent"
- Index on `conversationId` - Optimize queries for "all members of a conversation"

**Constraints**:
- Composite primary key prevents duplicate memberships
- CASCADE delete on both foreign keys - removing conversation or agent removes membership
- Application-level validation enforces exactly 2 members per conversation (per clarification)

**Relationships**:
- Many-to-One with Conversation (one membership belongs to one conversation)
- Many-to-One with Agent (one membership belongs to one agent)

---

### 2. Conversation (MODIFIED)

**Changes**:
- **REMOVE**: `userID` column (UUID, nullable)
- **REMOVE**: `virtualContributorID` column (UUID, nullable)
- **REMOVE**: `wellKnownVirtualContributor` column (VARCHAR ENUM, nullable)
- **REMOVE**: `type` column (VARCHAR ENUM, not null)
- **ADD**: `memberships` relationship to ConversationMembership entities

**Updated Entity Definition**:
```typescript
@Entity()
export class Conversation extends AuthorizableEntity implements IConversation {
  // Existing fields remain:
  // - id (UUID, PK)
  // - authorization (AuthorizationPolicy)
  // - createdDate, updatedDate

  @OneToMany(() => ConversationMembership, membership => membership.conversation, {
    eager: false,
    cascade: true
  })
  memberships!: ConversationMembership[];

  @ManyToOne(() => ConversationsSet, set => set.conversations, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE'
  })
  conversationsSet!: ConversationsSet;

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL'
  })
  @JoinColumn()
  room?: Room;
}
```

**Rationale**:
- Removed columns stored redundant data that can be derived from memberships
- `memberships` relationship provides access to participants via pivot table
- Maintains existing relationships with ConversationsSet and Room

---

### 3. User (MODIFIED)

**Changes**:
- **REMOVE**: `conversationsSet` relationship (OneToOne with ConversationsSet)
- **REMOVE**: `conversationsSet` join column

**Updated Entity Definition**:
```typescript
@Entity()
export class User extends ContributorBase implements IUser {
  // Existing fields remain:
  // - id, accountID, rowId
  // - firstName, lastName, email, phone
  // - authenticationID, serviceProfile
  // - agent (OneToOne)
  // - profile (OneToOne)
  // - settings (OneToOne)
  // - storageAggregator (OneToOne)

  // REMOVED: conversationsSet relationship

  // All other relationships unchanged
  @OneToMany(() => Application, application => application.user)
  applications?: Application[];

  // ... other existing relationships
}
```

**Rationale**:
- Users no longer own conversation sets; all conversations belong to platform set
- User's conversations accessed via agent membership queries
- Simplifies User entity and eliminates per-user conversation set overhead

---

### 4. VirtualContributor (MODIFIED)

**Changes**:
- **ADD**: `wellKnownVirtualContributor` column (VARCHAR(255), nullable, ENUM type)

**Updated Entity Definition**:
```typescript
@Entity()
export class VirtualContributor extends ContributorBase implements IVirtualContributor {
  // Existing fields remain:
  // - id, rowId, account
  // - settings, platformSettings
  // - aiPersonaID, bodyOfKnowledgeID
  // - listedInStore, searchVisibility

  @Column('varchar', { length: ENUM_LENGTH, nullable: true })
  wellKnownVirtualContributor?: VirtualContributorWellKnown;

  // All other relationships unchanged
  @OneToOne(() => Agent, { cascade: true })
  @JoinColumn()
  agent!: Agent;

  @OneToOne(() => Profile, { cascade: true })
  @JoinColumn()
  profile!: Profile;

  // ... other existing relationships
}
```

**Rationale**:
- Centralizes well-known VC metadata on VC entity (single source of truth)
- Eliminates duplication of wellKnownVirtualContributor across multiple Conversation records
- Future VC status changes automatically propagate to all conversations without data updates

---

### 5. ConversationsSet (MODIFIED)

**Changes**:
- **Conceptual**: Platform owns a single conversation set (no schema changes to entity itself)
- **Usage**: All conversations link to the same platform-owned conversation set instance

**Entity Definition** (unchanged):
```typescript
@Entity()
export class ConversationsSet extends AuthorizableEntity implements IConversationsSet {
  @OneToMany(() => Conversation, conversation => conversation.conversationsSet, {
    eager: false,
    cascade: true
  })
  conversations!: Conversation[];
}
```

**Initialization**:
- Migration creates a singleton platform conversation set
- All new conversations reference this platform set via `conversationsSet` foreign key

**Rationale**:
- No structural changes needed; entity already supports containing all conversations
- Platform set simplifies queries: "all conversations" = query single set
- Authorization policy on platform set can control platform-wide conversation access rules

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│   Platform          │
│   (Singleton)       │
└──────────┬──────────┘
           │ owns (1:1)
           ↓
┌─────────────────────┐
│ ConversationsSet    │
│ (Platform-owned)    │
└──────────┬──────────┘
           │ contains (1:N)
           ↓
┌─────────────────────┐         ┌──────────────────────┐
│ Conversation        │←────────│ ConversationMembership│
│                     │ 1:N     │ (Pivot Table)        │
│ - id                │         │ - conversationId (PK)│
│ - room              │         │ - agentId (PK)       │
│ - authorization     │         │ - createdAt          │
└─────────────────────┘         └──────────┬───────────┘
                                           │ N:1
                                           ↓
                                ┌──────────────────────┐
                                │ Agent                │
                                │                      │
                                │ - id                 │
                                └──────────┬───────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
                        ↓                                     ↓
              ┌─────────────────┐              ┌─────────────────────┐
              │ User            │              │ VirtualContributor  │
              │                 │              │                     │
              │ - firstName     │              │ - aiPersonaID       │
              │ - lastName      │              │ - wellKnownVC       │
              │ - email         │              │                     │
              └─────────────────┘              └─────────────────────┘
```

**Key Relationships**:
- Platform (conceptual) → ConversationsSet (1:1, singleton)
- ConversationsSet → Conversation (1:N)
- Conversation ↔ Agent (N:N via ConversationMembership pivot table)
- Agent → User (1:1, optional)
- Agent → VirtualContributor (1:1, optional)
- Conversation → Room (1:1, for Matrix chat room)

---

## Data Validation Rules

### ConversationMembership
1. **Cardinality**: Each conversation MUST have exactly 2 memberships (enforced at application level per clarification)
2. **Uniqueness**: `(conversationId, agentId)` pair must be unique (enforced by primary key)
3. **Referential Integrity**: Both `conversationId` and `agentId` must reference existing records
4. **Cascade Delete**: Removing a conversation or agent removes associated memberships

### Conversation
1. **Platform Set Reference**: Every conversation MUST reference the platform conversation set
2. **Member Count**: Validated at creation time (exactly 2 agents)
3. **No Direct Participant Fields**: `userID`, `virtualContributorID`, `type` fields must not exist
4. **Authorization**: Membership in pivot table automatically grants read/send privileges (per clarification)

### User
1. **No Conversation Set**: User entity must not have `conversationsSet` relationship
2. **Agent Relationship**: Every user must have an agent for conversation participation

### VirtualContributor
1. **Well-Known Status**: `wellKnownVirtualContributor` enum value (if set) must be valid VirtualContributorWellKnown enum member
2. **Agent Relationship**: Every VC must have an agent for conversation participation

---

## Query Patterns

### Get All Conversations for a User
```typescript
// Via Agent relationship
const user = await userRepository.findOne({
  where: { id: userId },
  relations: { agent: true }
});

const conversations = await conversationMembershipRepository
  .createQueryBuilder('membership')
  .innerJoinAndSelect('membership.conversation', 'conversation')
  .where('membership.agentId = :agentId', { agentId: user.agent.id })
  .getMany();
```

### Get All Members of a Conversation
```typescript
const memberships = await conversationMembershipRepository.find({
  where: { conversationId },
  relations: { agent: { user: true, virtualContributor: true } }
});

const members = memberships.map(m => m.agent);
```

### Find Existing Conversation Between Two Agents
```typescript
// Query for conversations where both agents are members
const conversations = await conversationMembershipRepository
  .createQueryBuilder('m1')
  .innerJoin('conversation_membership', 'm2',
    'm1.conversationId = m2.conversationId AND m1.agentId != m2.agentId')
  .where('m1.agentId = :agentId1', { agentId1 })
  .andWhere('m2.agentId = :agentId2', { agentId2 })
  .select('m1.conversationId')
  .getRawOne();
```

### Infer Conversation Type
```typescript
// Load memberships with agent relationships
const memberships = await conversationMembershipRepository.find({
  where: { conversationId },
  relations: { agent: { user: true, virtualContributor: true } }
});

// Check agent types
const hasVC = memberships.some(m => m.agent.virtualContributor !== null);
const type = hasVC
  ? CommunicationConversationType.USER_VC
  : CommunicationConversationType.USER_USER;
```

---

## Migration SQL

### Add ConversationMembership Table
```sql
CREATE TABLE conversation_membership (
  conversationId CHAR(36) NOT NULL,
  agentId CHAR(36) NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (conversationId, agentId),

  CONSTRAINT FK_conversation_membership_conversation
    FOREIGN KEY (conversationId)
    REFERENCES conversation(id)
    ON DELETE CASCADE,

  CONSTRAINT FK_conversation_membership_agent
    FOREIGN KEY (agentId)
    REFERENCES agent(id)
    ON DELETE CASCADE,

  INDEX idx_conversation_membership_agent (agentId),
  INDEX idx_conversation_membership_conversation (conversationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Add wellKnownVirtualContributor to VirtualContributor
```sql
ALTER TABLE virtual_contributor
ADD COLUMN wellKnownVirtualContributor VARCHAR(255) NULL;
```

### Create Platform Conversation Set
```sql
-- Insert singleton platform conversation set
INSERT INTO conversations_set (id, authorization, createdDate, updatedDate)
VALUES (
  UUID(),
  '{"anonymousReadAccess": false, "credentialRules": []}',
  NOW(),
  NOW()
);
```

### Remove Deprecated Columns (DEFERRED)
```sql
-- NOTE: These statements are DEFERRED to a future data migration
-- This schema-only refactor does NOT drop these columns yet
-- They remain for backward compatibility during data migration phase

-- ALTER TABLE conversation DROP COLUMN userID;
-- ALTER TABLE conversation DROP COLUMN virtualContributorID;
-- ALTER TABLE conversation DROP COLUMN wellKnownVirtualContributor;
-- ALTER TABLE conversation DROP COLUMN type;
-- ALTER TABLE user DROP FOREIGN KEY FK_user_conversationsSet;
-- ALTER TABLE user DROP COLUMN conversationsSetId;
```

---

## Performance Considerations

### Indexes
- **ConversationMembership.agentId**: Optimizes "all conversations for agent" queries
- **ConversationMembership.conversationId**: Optimizes "all members of conversation" queries
- **Composite PK (conversationId, agentId)**: Enforces uniqueness and supports join queries

### Query Optimization
- Use eager loading selectively to avoid N+1 problems (relationships marked `eager: false`)
- Implement DataLoader pattern in GraphQL resolvers for batching agent/user/VC lookups
- Consider covering indexes if "find conversation between two agents" query becomes hot path

### Expected Performance
- No regression: Membership queries replace simple foreign key lookups; indexed properly, performance equivalent
- Type inference adds join overhead but is lazy (only computed when requested in GraphQL query)
- Authorization checks now require membership query instead of field comparison; indexed pivot table keeps this fast

---

## State Transitions

### Conversation Lifecycle
1. **Creation**:
   - Create Conversation entity linked to platform ConversationsSet
   - Insert 2 ConversationMembership records (one per agent)
   - Create Room entity if applicable
   - Validate exactly 2 members at application level

2. **Active**:
   - Members can read and send messages (authorization derived from membership)
   - Type inferred dynamically based on agent types

3. **Member Removal** (future enhancement):
   - Currently not supported (1:1 conversations don't have member removal)
   - Cascade delete on agent removal handles cleanup

4. **Deletion**:
   - Conversation deletion cascades to ConversationMembership (via ON DELETE CASCADE)
   - Room entity cleanup handled by existing logic

### Orphaned Conversation Handling
- **Detection**: Query for conversations with membership count ≠ 2
- **Cleanup**: Log warning and optionally delete orphaned conversations
- **Prevention**: Application-level validation at creation time

---

## Data Integrity Rules

1. **Exactly 2 Members**: Application enforces this at creation; migration validation script checks existing data
2. **No Duplicate Conversations**: Application checks for existing conversation between agent pair before creation
3. **Agent Existence**: Foreign key constraint ensures agents exist
4. **Cascade Cleanup**: Deleting conversation or agent automatically removes memberships
5. **Platform Set Reference**: All conversations must reference the singleton platform conversation set

---

## Rollback Strategy

### Migration Rollback (Down)
```sql
-- Drop new structures
DROP TABLE conversation_membership;

ALTER TABLE virtual_contributor
DROP COLUMN wellKnownVirtualContributor;

DELETE FROM conversations_set
WHERE id = '[PLATFORM_SET_ID]';

-- Old columns remain intact (not dropped in this schema-only refactor)
```

### Code Rollback
- Old columns still present in database schema (not dropped)
- Revert code changes and redeploy
- System falls back to using old columns
- New ConversationMembership table remains but is unused

---

## Testing Validation

### Unit Tests
- ConversationMembership entity creation and validation
- Type inference logic (USER_USER vs USER_VC)
- Membership cardinality validation (exactly 2 members)

### Integration Tests
- Create conversation and verify membership records
- Query conversations for agent and verify results
- Test concurrent creation attempts (uniqueness constraint)
- Verify cascade delete behavior
- Authorization checks via membership

### Migration Tests
- Run migration on snapshot database
- Verify new table created with correct schema
- Verify indexes present
- Verify foreign key constraints work
- Test rollback migration

---

## Next Steps

1. Generate GraphQL contract changes (`contracts/conversation.graphql`)
2. Create quickstart guide (`quickstart.md`)
3. Update agent context
4. Proceed to Phase 2: Task breakdown (`/speckit.tasks`)
