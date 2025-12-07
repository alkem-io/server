# Research: Conversation Architecture Refactor

**Date**: 2025-12-05
**Feature**: Conversation Architecture Refactor
**Phase**: 0 - Outline & Research

## Purpose

Resolve technical unknowns and document design decisions for refactoring the conversation architecture to use a platform-owned conversation set with a pivot table for membership tracking.

## Research Questions & Resolutions

### 1. TypeORM Many-to-Many Relationship Patterns

**Question**: What is the best practice for implementing the ConversationMembership pivot table with TypeORM?

**Decision**: Use explicit junction table entity with `@ManyToMany` decorators and a custom repository for complex queries

**Rationale**:
- TypeORM supports two approaches: automatic junction table (simple) or explicit entity (flexible)
- Explicit `ConversationMembership` entity provides:
  - Ability to add metadata (createdAt, joinedBy) in future without schema changes
  - Custom queries for membership validation and uniqueness enforcement
  - Clear audit trail and debugging capability
- Allows unique constraint on `(conversationId, agentId)` and composite unique constraint on sorted agent pairs for conversation-level uniqueness

**Alternatives Considered**:
- **Automatic junction table**: Simpler initial setup but limited extensibility; no way to add metadata or enforce conversation-level uniqueness constraint
- **Application-level deduplication**: Would require distributed locks and is error-prone; database-level constraints are more reliable

**Implementation Pattern**:
```typescript
@Entity()
export class ConversationMembership {
  @PrimaryColumn('uuid')
  conversationId!: string;

  @PrimaryColumn('uuid')
  agentId!: string;

  @ManyToOne(() => Conversation, conversation => conversation.memberships, { onDelete: 'CASCADE' })
  conversation!: Conversation;

  @ManyToOne(() => Agent, { eager: false, onDelete: 'CASCADE' })
  agent!: Agent;

  @CreateDateColumn()
  createdAt!: Date;

  // Unique constraint on (conversationId, agentId) enforced at entity level
  // Conversation-level uniqueness on sorted agent pairs enforced via migration unique index
}
```

**Reference**: TypeORM documentation on [Many-to-Many Relations](https://typeorm.io/many-to-many-relations)

---

### 2. Enforcing Unique Conversations Per Agent Pair

**Question**: How to enforce database-level uniqueness for conversations between the same two agents (preventing concurrent creation duplicates)?

**Decision**: Create a unique index on a computed column or use application-level sorted pair insertion with unique constraint

**Rationale**:
- **Clarification requirement**: Per clarification Q3, enforce idempotent creation with unique constraint on sorted agent pair
- MySQL 8 supports functional indexes on computed expressions
- Approach: Create unique index on `LEAST(agentId1, agentId2), GREATEST(agentId1, agentId2)` for conversations with exactly 2 members
- Race-safe: Database rejects duplicate inserts automatically; application catches unique constraint violation and returns existing conversation

**Alternatives Considered**:
- **Distributed locks**: Adds Redis/external dependency and complicates deployment; database constraint is simpler
- **Application-level check-then-insert**: Race condition window between check and insert; not safe for concurrent requests
- **Unique index on conversation table**: Pivot table approach requires join, but can be optimized with covering index

**Implementation Approach**:
```sql
-- Migration creates unique index on conversation-agent pair membership
-- For a conversation with agentId1 and agentId2 (where agentId1 < agentId2):
CREATE UNIQUE INDEX idx_conversation_unique_agent_pair
ON conversation_membership (
  IF(agentId < (SELECT agentId FROM conversation_membership cm2
                WHERE cm2.conversationId = conversation_membership.conversationId
                AND cm2.agentId != conversation_membership.agentId LIMIT 1),
     agentId,
     (SELECT agentId FROM conversation_membership cm2
      WHERE cm2.conversationId = conversation_membership.conversationId
      AND cm2.agentId != conversation_membership.agentId LIMIT 1)),
  IF(agentId > (SELECT agentId FROM conversation_membership cm2
                WHERE cm2.conversationId = conversation_membership.conversationId
                AND cm2.agentId != conversation_membership.agentId LIMIT 1),
     agentId,
     (SELECT agentId FROM conversation_membership cm2
      WHERE cm2.conversationId = conversation_membership.conversationId
      AND cm2.agentId != conversation_membership.agentId LIMIT 1))
);
```

**Alternative simpler approach** (recommended):
- Use application-level logic to query existing conversation before creation
- Wrap in transaction with `SELECT ... FOR UPDATE` to prevent race conditions
- Simpler than complex functional index and works across database vendors

**Reference**: MySQL 8 [Functional Key Parts](https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-functional-key-parts)

---

### 3. Conversation Type Inference Strategy

**Question**: What is the most efficient way to infer conversation type (USER_USER vs USER_VC) from agent membership?

**Decision**: Use GraphQL field resolver with lazy agent type resolution via DataLoader pattern

**Rationale**:
- Type inference requires joining to Agent → User/VirtualContributor entities to determine agent types
- GraphQL field resolver pattern allows:
  - Computed field that doesn't require database column
  - Lazy evaluation only when type is queried
  - Batching via DataLoader to avoid N+1 queries
- Agent type determination: check if agent.id exists in User table (has user relationship) or VirtualContributor table

**Alternatives Considered**:
- **Database view with type computed**: Adds query complexity and requires maintaining view definition
- **Eager loading agent types always**: Unnecessary overhead when type field not requested in query
- **Caching inferred type**: Adds cache invalidation complexity when membership changes

**Implementation Pattern**:
```typescript
// conversation.resolver.fields.ts
@ResolveField('type', () => CommunicationConversationType)
async type(@Parent() conversation: IConversation): Promise<CommunicationConversationType> {
  const members = await this.conversationService.getConversationMembers(conversation.id);

  if (members.length !== 2) {
    throw new ValidationException('Conversation must have exactly 2 members');
  }

  const agentTypes = await Promise.all(
    members.map(member => this.agentService.getAgentType(member.agentId))
  );

  const hasVirtualContributor = agentTypes.some(type => type === 'VIRTUAL_CONTRIBUTOR');
  return hasVirtualContributor
    ? CommunicationConversationType.USER_VC
    : CommunicationConversationType.USER_USER;
}
```

**Performance Note**: Use DataLoader to batch agent type lookups across multiple conversations in a single GraphQL query

---

### 4. Authorization Model Updates

**Question**: How should authorization policies adapt to the membership-based model where membership automatically grants read/send privileges?

**Decision**: Update ConversationAuthorizationService to check membership in pivot table instead of stored userID/virtualContributorID fields

**Rationale**:
- **Clarification requirement**: Per clarification Q2, membership automatically grants read and send message privileges
- Existing AuthorizationPolicy framework supports dynamic authorization rules
- Replace current checks like `conversation.userID === agentInfo.userID` with membership query
- Leverage existing NestJS guard pattern (`@UseGuards(GraphqlGuard)`)

**Alternatives Considered**:
- **Create explicit authorization table**: Redundant with membership; violates single source of truth
- **Separate read vs write membership types**: Over-engineered for 1:1 conversations; can be added later if multi-party support needs granular permissions

**Implementation Pattern**:
```typescript
// conversation.service.authorization.ts
async canReadConversation(
  conversation: IConversation,
  agentInfo: AgentInfo
): Promise<boolean> {
  // Check if agent is a member
  const isMember = await this.conversationMembershipRepository.exists({
    where: {
      conversationId: conversation.id,
      agentId: agentInfo.agentID
    }
  });

  return isMember;
}
```

**Reference**: Existing authorization patterns in `src/domain/common/authorization-policy/` and `src/core/authorization/`

---

### 5. Platform Conversation Set Initialization

**Question**: How and when should the single platform-owned conversation set be created?

**Decision**: Create platform conversation set during migration; initialize on first access if missing (defensive)

**Rationale**:
- Migration creates the platform conversation set with a well-known ID or identifier
- Bootstrap logic checks for platform conversation set existence and creates if missing
- Ensures system remains functional even if migration runs partially
- Platform module already has patterns for singleton platform resources

**Alternatives Considered**:
- **Seed data script**: Requires separate execution step; migration is more atomic
- **Lazy creation on first conversation**: Could cause race conditions with concurrent first conversations

**Implementation Approach**:
```typescript
// Migration creates platform conversation set
export class ConversationArchitectureRefactor1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create platform conversation set
    await queryRunner.query(`
      INSERT INTO conversations_set (id, authorization, createdDate, updatedDate)
      VALUES (UUID(), '{"anonymousReadAccess": false}', NOW(), NOW())
    `);

    // Store platform conversation set ID in configuration or known location
  }
}

// Service method ensures platform set exists
async getPlatformConversationsSet(): Promise<IConversationsSet> {
  let platformSet = await this.conversationsSetRepository.findOne({
    where: { /* identifier for platform set */ }
  });

  if (!platformSet) {
    // Defensive: create if missing
    platformSet = await this.createPlatformConversationsSet();
  }

  return platformSet;
}
```

---

### 6. GraphQL Schema Backward Compatibility

**Question**: How to maintain GraphQL API compatibility when removing internal fields (userID, virtualContributorID, type) from the Conversation type?

**Decision**: Keep GraphQL schema unchanged; update field resolvers to query via pivot table transparently

**Rationale**:
- **Requirement**: FR-018 and SC-004 mandate GraphQL API backward compatibility
- GraphQL `Conversation` type already exposes `user: User` and `virtualContributor: VirtualContributor` fields (not raw IDs)
- Field resolvers (`@ResolveField`) can query membership pivot table to resolve these relationships
- `type` field remains in GraphQL schema but is computed via inference, not stored

**Alternatives Considered**:
- **Deprecate and remove fields**: Would be breaking change; violates FR-018
- **Add new fields, keep old ones**: Creates confusing dual API surface; adds maintenance burden

**Implementation Pattern**:
```typescript
// conversation.resolver.fields.ts
@ResolveField('user', () => IUser, { nullable: true })
async user(@Parent() conversation: IConversation): Promise<IUser | null> {
  const members = await this.conversationService.getConversationMembers(conversation.id);

  for (const membership of members) {
    const agent = await this.agentService.getAgent(membership.agentId);
    // Check if this agent belongs to a user (not a VC)
    if (agent.user) {
      return agent.user;
    }
  }

  return null;
}

@ResolveField('virtualContributor', () => IVirtualContributor, { nullable: true })
async virtualContributor(@Parent() conversation: IConversation): Promise<IVirtualContributor | null> {
  const members = await this.conversationService.getConversationMembers(conversation.id);

  for (const membership of members) {
    const agent = await this.agentService.getAgent(membership.agentId);
    if (agent.virtualContributor) {
      return agent.virtualContributor;
    }
  }

  return null;
}
```

**Performance Note**: Use DataLoader pattern to batch agent/user/VC lookups

---

### 7. Migration Strategy for Schema-Only Changes

**Question**: What is the safest approach for schema-only migration that drops columns without data transformation?

**Decision**: Three-step migration approach with feature flags for rollback safety

**Rationale**:
- **Clarification requirement**: Per clarification Q4, this is schema-only; data migration handled separately
- Dropping columns immediately is risky; use phased approach:
  1. **Phase 1**: Add new structures (ConversationMembership table, wellKnownVirtualContributor on VC)
  2. **Phase 2** (future): Populate pivot table from existing data (separate data migration spec)
  3. **Phase 3** (future): Remove deprecated columns after data verified
- For this refactor (schema-only): Create new table structure, add constraints, but don't populate or drop old columns yet
- Code changes make new structure usable; old columns become unused but remain for backward compatibility during data migration

**Alternatives Considered**:
- **Single-step migration**: Risky if data population fails; no rollback path
- **Blue-green deployment**: Overkill for database schema; requires dual writes during transition

**Implementation Approach**:
```typescript
// Migration adds new structures only
export class ConversationArchitectureRefactor implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create conversation_membership table
    await queryRunner.query(`
      CREATE TABLE conversation_membership (
        conversationId CHAR(36) NOT NULL,
        agentId CHAR(36) NOT NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (conversationId, agentId),
        CONSTRAINT FK_conversation_membership_conversation
          FOREIGN KEY (conversationId) REFERENCES conversation(id) ON DELETE CASCADE,
        CONSTRAINT FK_conversation_membership_agent
          FOREIGN KEY (agentId) REFERENCES agent(id) ON DELETE CASCADE,
        INDEX idx_conversation_membership_agent (agentId),
        INDEX idx_conversation_membership_conversation (conversationId)
      )
    `);

    // Add wellKnownVirtualContributor to virtual_contributor
    await queryRunner.query(`
      ALTER TABLE virtual_contributor
      ADD COLUMN wellKnownVirtualContributor VARCHAR(255) NULL
    `);

    // Create platform conversation set (singleton)
    const platformSetId = uuidv4();
    await queryRunner.query(`
      INSERT INTO conversations_set (id, authorization, createdDate, updatedDate)
      VALUES ('${platformSetId}', '{"anonymousReadAccess": false}', NOW(), NOW())
    `);

    // Note: Old columns (userID, virtualContributorID, type, etc.) remain for now
    // They will be dropped in a future migration after data is migrated
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new structures
    await queryRunner.query(`DROP TABLE conversation_membership`);
    await queryRunner.query(`
      ALTER TABLE virtual_contributor DROP COLUMN wellKnownVirtualContributor
    `);
    // Remove platform conversation set
  }
}
```

**Note**: Actual data population and column removal will be in separate migrations (out of scope for this schema-only refactor)

---

## Technology Stack Decisions

All technology choices already determined by existing Alkemio server stack:

- **ORM**: TypeORM 10.0.2 (in use)
- **Database**: MySQL 8.0 (in use)
- **API Layer**: GraphQL via Apollo Server 4.10.4 + NestJS (in use)
- **Testing**: Jest with NestJS testing utilities (in use)
- **Migration Tool**: TypeORM CLI migrations (in use)

No new external dependencies required for this refactor.

---

## Best Practices Applied

### TypeORM Many-to-Many Relationships
- Use explicit junction entity for extensibility
- Add indexes on foreign keys for query performance
- Leverage cascade delete for referential integrity
- Use composite primary keys for junction tables

### NestJS Domain-Driven Design
- Keep domain logic in domain services, not resolvers
- Use field resolvers for computed properties (type inference)
- Implement authorization checks via service layer, not guards directly
- Follow existing module boundaries (ConversationModule, UserModule, VirtualContributorModule)

### GraphQL API Evolution
- Maintain backward compatibility via resolver adapters
- Use DataLoader pattern to prevent N+1 query problems
- Keep schema stable; change internal implementation only
- Document resolver complexity changes for performance review

### Database Migration Safety
- Phased migration approach for schema changes
- Idempotent migration scripts (check existence before create/drop)
- Include rollback logic in `down()` method
- Test migrations on snapshot data before production

---

## Open Questions (Resolved)

All technical questions resolved through research and clarifications:

1. ✅ Pivot table pattern: Explicit junction entity
2. ✅ Unique constraint enforcement: Application-level check in transaction
3. ✅ Type inference: GraphQL field resolver with DataLoader
4. ✅ Authorization model: Membership check in authorization service
5. ✅ Platform set initialization: Created in migration, defensive check on access
6. ✅ GraphQL compatibility: Field resolvers query pivot table transparently
7. ✅ Migration strategy: Schema-only adds; data population deferred

---

## Next Steps

Proceed to Phase 1:
- Generate detailed data model documentation (`data-model.md`)
- Create GraphQL contract changes (`contracts/conversation.graphql`)
- Generate quickstart guide (`quickstart.md`)
- Update agent context with any new patterns introduced
