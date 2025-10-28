# Specification: User-Owned Conversations

**Feature ID:** 012-user-owned-conversations
**Status:** Draft
**Created:** 2025-10-28
**Last Updated:** 2025-10-28

## Overview

Refactor the conversation architecture from platform-centric to user-centric by moving conversation ownership from the Platform entity to individual User entities, and simplifying conversation participation from multi-user arrays to single-user entities.

## Problem Statement

### Current Architecture Issues

1. **Platform-Centric Design**: ConversationsSet is attached to the Platform entity, creating a single global conversation collection rather than user-specific collections
2. **Multi-User Array Complexity**: Each Conversation entity has a `userIDs` JSON array field, making it complex to query and manage per-user conversations
3. **Unclear Ownership**: Conversations are shared entities rather than owned by specific users
4. **Query Complexity**: Finding all conversations for a specific user requires JSON array queries

### Impact

- Difficult to implement user-specific conversation queries
- Complex authorization logic for conversation access
- Inefficient database queries for user conversations
- Unclear data ownership model

## Goals

### Primary Goals

1. Move ConversationsSet from Platform to User entity (one-to-one relationship)
2. Change Conversation from multi-user (array) to single-user (scalar) model
3. Enable efficient per-user conversation queries
4. Simplify authorization model (user owns their conversations)

### Non-Goals

- Changing the Room entity structure
- Modifying VirtualContributor conversation behavior
- Altering message storage or delivery mechanisms

## Proposed Solution

### Architecture Changes

#### 1. Entity Relationship Changes

**Before:**

```
Platform (1) ----> (1) ConversationsSet (1) ----> (N) Conversation
                                                      └─ userIDs: string[]
```

**After:**

```
User (1) ----> (1) ConversationsSet (1) ----> (N) Conversation
                                                  └─ userID: string
```

#### 2. Data Model Changes

**User Entity Changes:**

```typescript
@Entity()
export class User extends ContributorBase {
  // ... existing fields ...

  @OneToOne(() => ConversationsSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  conversationsSet?: ConversationsSet;
}
```

**Conversation Entity Changes:**

```typescript
@Entity()
export class Conversation extends AuthorizableEntity {
  // BEFORE: @Column('json', { nullable: false })
  // BEFORE: userIDs!: string[];

  @Column('char', { length: UUID_LENGTH, nullable: false })
  userID!: string;

  // ... other fields unchanged ...
}
```

**Platform Entity Changes:**

```typescript
@Entity()
export class Platform extends AuthorizableEntity {
  // REMOVE:
  // @OneToOne(() => ConversationsSet)
  // @JoinColumn()
  // conversationsSet?: ConversationsSet;
}
```

### GraphQL Schema Changes

#### Type Changes

**Conversation Type:**

```graphql
type Conversation {
  id: UUID!
  type: CommunicationConversationType!
  userID: UUID! # Changed from userIDs: [UUID!]!
  virtualContributorID: UUID
  wellKnownVirtualContributor: VirtualContributorWellKnown
  room: Room
  authorization: Authorization
}
```

**User Type:**

```graphql
type User implements Contributor {
  # ... existing fields ...
  conversationsSet: ConversationsSet # New field
}
```

**Platform Type:**

```graphql
type Platform {
  # ... existing fields ...
  # REMOVED: conversationsSet: ConversationsSet!
}
```

#### Input Changes

**CreateConversationInput:**

```graphql
input CreateConversationInput {
  userID: UUID! # Changed from userIDs: [UUID!]!
  type: CommunicationConversationType!
  virtualContributorID: UUID
  wellKnownVirtualContributor: VirtualContributorWellKnown
}
```

### Service Layer Changes

#### ConversationService Changes

**Methods to Update:**

1. `createConversation()`: Accept single userID instead of array
2. `createConversationRoom()`: Update room naming from joined userIDs
3. `validateCreateConversationData()`: Remove multi-user validation logic
4. `findExistingConversation()`: Change from JSON array query to simple userID equality
5. `getConversationsForUser()`: Simplify query logic

**Authorization Changes:**

- `createCredentialRuleContributors()`: Accept single userID instead of array
- Simplified policy: user owns their conversations

#### ConversationsSetService Changes

**Methods to Update:**

1. `createConversationOnConversationsSet()`: Pass through single userID
2. `getConversationsForUser()`: Simplified - return conversations from user's conversationsSet
3. Remove platform-level conversation queries

#### UserService Changes

**User Creation Flow:**

```typescript
async createUser(userData: CreateUserInput): Promise<IUser> {
  // ... existing user creation ...

  // Create ConversationsSet for new user
  user.conversationsSet = await this.conversationsSetService.createConversationsSet();

  // Create guidance conversation with single userID
  await this.conversationsSetService.createConversationOnConversationsSet({
    conversationsSetID: user.conversationsSet.id,
    type: CommunicationConversationType.USER_VC,
    userID: user.id,  // Single ID instead of array
    wellKnownVirtualContributor: VirtualContributorWellKnown.CHAT_GUIDANCE,
  });

  return user;
}
```

#### PlatformService Changes

**Methods to Remove:**

- `getConversationsSetOrFail()`: No longer needed
- Platform no longer manages conversations

### Resolver Changes

#### MeResolver

**Update conversations query:**

```typescript
@ResolveField(() => [IConversation])
async conversations(@Parent() user: IUser): Promise<IConversation[]> {
  const conversationsSet = await this.userService.getConversationsSet(user.id);
  return conversationsSet.conversations;
}
```

#### ConversationsSetResolver

**Update mutations:**

```typescript
@Mutation(() => IConversation)
async createConversationOnConversationsSet(
  @Args('conversationData') conversationData: CreateConversationOnConversationsSetInput
): Promise<IConversation> {
  // Validate single userID instead of array
  // Authorization: user must own the conversationsSet
  return this.conversationsSetService.createConversationOnConversationsSet(conversationData);
}
```

### Migration Strategy

#### Migration Overview

**Migration Name:** `ConversationsRefactoring`

**Note:** ⚠️ Since there are **no existing conversations to migrate**, this is a straightforward schema change migration with no data transformation required.

**Operations:**

1. **Add conversationsSetId to User table**

   ```sql
   ALTER TABLE `user` ADD `conversationsSetId` char(36) NULL;
   CREATE UNIQUE INDEX `REL_user_conversationsSetId` ON `user` (`conversationsSetId`);
   ```

2. **Create ConversationsSet for each User**

   ```typescript
   // For each user, create a ConversationsSet
   const users = await queryRunner.query('SELECT id FROM user');
   for (const user of users) {
     const conversationsSetId = await createConversationsSet(queryRunner);
     await queryRunner.query(
       `UPDATE user SET conversationsSetId = '${conversationsSetId}' WHERE id = '${user.id}'`
     );
   }
   ```

3. **Migrate existing Conversations**

   ```typescript
   // For each conversation with userIDs array:
   const conversations = await queryRunner.query(
     'SELECT id, userIDs, virtualContributorID, wellKnownVirtualContributor, roomId, type FROM conversation'
   );

   for (const conv of conversations) {
     const userIDs = JSON.parse(conv.userIDs);

     // Create a separate conversation entity for each user
     for (const userID of userIDs) {
       const newConvId = randomUUID();
       const authId = await createAuthorizationPolicy(queryRunner);

       // Create new conversation for this user
       await queryRunner.query(`
         INSERT INTO conversation
         (id, userID, virtualContributorID, wellKnownVirtualContributor,
          roomId, type, authorizationId, conversationsSetId)
         VALUES (
           '${newConvId}',
           '${userID}',
           ${conv.virtualContributorID ? `'${conv.virtualContributorID}'` : 'NULL'},
           ${conv.wellKnownVirtualContributor ? `'${conv.wellKnownVirtualContributor}'` : 'NULL'},
           '${conv.roomId}',
           '${conv.type}',
           '${authId}',
           (SELECT conversationsSetId FROM user WHERE id = '${userID}')
         )
       `);
     }

     // Delete original conversation
     await queryRunner.query(
       `DELETE FROM conversation WHERE id = '${conv.id}'`
     );
   }
   ```

4. **Change Conversation.userIDs column**

   ```sql
   -- Drop JSON column
   ALTER TABLE `conversation` DROP COLUMN `userIDs`;

   -- Add scalar userID column
   ALTER TABLE `conversation` ADD `userID` char(36) NOT NULL;
   CREATE INDEX `IDX_conversation_userID` ON `conversation` (`userID`);
   ```

5. **Remove conversationsSetId from Platform**

   ```sql
   ALTER TABLE `platform` DROP FOREIGN KEY `FK_platform_conversationsSet`;
   DROP INDEX `REL_platform_conversationsSet` ON `platform`;
   ALTER TABLE `platform` DROP COLUMN `conversationsSetId`;
   ```

6. **Add foreign key constraints**

   ```sql
   ALTER TABLE `user`
     ADD CONSTRAINT `FK_user_conversationsSet`
     FOREIGN KEY (`conversationsSetId`)
     REFERENCES `conversations_set`(`id`)
     ON DELETE SET NULL;

   ALTER TABLE `conversation`
     ADD CONSTRAINT `FK_conversation_user`
     FOREIGN KEY (`userID`)
     REFERENCES `user`(`id`)
     ON DELETE CASCADE;
   ```

#### Rollback Strategy

**Down Migration:**

1. Recreate conversationsSet on Platform
2. Convert userID back to userIDs array
3. Remove conversationsSet from Users
4. Restore platform relationship

**Note:** Since no data needs to be migrated, rollback is straightforward schema reversal.

### Authorization Updates

#### Policy Changes

**Before:** Credential checks against userIDs array

```typescript
createCredentialRuleContributors(conversation.userIDs);
```

**After:** Simple ownership check

```typescript
createCredentialRuleUserOwner(conversation.userID);
```

**Simplified Rules:**

- User can read/update/delete their own conversations
- Platform admins can manage all conversations
- VirtualContributors can access conversations where they are participants

### Testing Strategy

#### Unit Tests

**ConversationService:**

- Test createConversation with single userID
- Test room creation with single userID naming
- Test validation accepts single userID

**ConversationsSetService:**

- Test conversation creation on user's conversationsSet
- Test querying user's conversations

**UserService:**

- Test conversationsSet creation on user creation
- Test guidance conversation creation with single userID

#### Integration Tests

**Migration Tests:**

- Test migration with no existing conversations (clean state)
- Verify platform conversationsSet removed
- Verify user conversationsSet creation on new users
- Test rollback scenario

**Query Tests:**

- Test fetching conversations for specific user
- Test authorization policies
- Test GraphQL queries return correct data

#### E2E Tests

**User Flow:**

1. Create new user → verify conversationsSet exists
2. Create conversation → verify appears in user's conversations
3. Send message → verify room creation
4. Query conversations → verify filtering works

### Breaking Changes

#### API Changes

1. **GraphQL Schema Breaking Changes:**
   - `Conversation.userIDs` removed (replaced with `userID`)
   - `Platform.conversationsSet` removed
   - `CreateConversationInput.userIDs` removed (replaced with `userID`)
   - `User.conversationsSet` added (new field)

2. **Behavioral Changes:**
   - User-to-user conversations now create separate conversation entities per user
   - Each user sees their own copy of conversations
   - Room entities are shared across conversation copies

#### Migration Impact

- **Downtime Required:** Minimal (schema changes only, no data migration)
- **Data Migration:** None (no existing conversations to migrate)
- **Query Performance:** Improved (no JSON array queries)

### Performance Considerations

#### Improvements

1. **Faster Queries:** Direct userID equality instead of JSON array contains
2. **Better Indexes:** Can index userID column efficiently
3. **Simplified Joins:** No JSON parsing required

#### Trade-offs

1. **Storage:** Minimal impact (no duplication needed as no existing data)
2. **Migration Time:** Fast (schema changes only)

### Dependencies

**Internal:**

- Domain: User, ConversationsSet, Conversation entities
- Services: UserService, ConversationService, ConversationsSetService
- Platform: PlatformService (remove conversationsSet methods)

**External:**

- Database: TypeORM migration framework
- GraphQL: Schema updates

### Rollout Plan

#### Phase 1: Preparation (Days 1-2)

- [ ] Update entity models (User, Conversation, Platform)
- [ ] Update interfaces (IUser, IConversation, IPlatform)
- [ ] Update DTOs (CreateConversationInput, etc.)
- [ ] Create migration script

#### Phase 2: Service Layer (Days 3-4)

- [ ] Update ConversationService methods
- [ ] Update ConversationsSetService methods
- [ ] Update UserService (create conversationsSet on user creation)
- [ ] Update PlatformService (remove conversationsSet methods)
- [ ] Update authorization services

#### Phase 3: Resolvers (Day 5)

- [ ] Update ConversationsSetResolver mutations
- [ ] Update MeResolver conversations field
- [ ] Update UserResolver (add conversationsSet field)
- [ ] Remove platform conversationsSet resolver

### Monitoring & Validation

#### Post-Migration Checks

```sql
-- Verify all users have conversationsSet
SELECT COUNT(*) FROM user WHERE conversationsSetId IS NULL;
-- Should return 0

-- Verify all conversations have single userID
SELECT COUNT(*) FROM conversation WHERE userID IS NULL;
-- Should return 0

-- Verify conversation counts match (should be >= original count)
SELECT COUNT(*) FROM conversation;
-- Compare with pre-migration count

-- Verify rooms are preserved
SELECT COUNT(*) FROM room;
-- Should match pre-migration count
```

#### Metrics to Monitor

- Query performance for user conversations
- Storage usage (expect slight increase)
- Error rates on conversation creation
- User conversation load times

## Success Criteria

1. ✅ All users have their own ConversationsSet
2. ✅ All conversations have single userID (no arrays)
3. ✅ Platform entity no longer has conversationsSet
4. ✅ Conversation queries use indexed userID column
5. ✅ All existing conversations migrated successfully
6. ✅ All tests passing
7. ✅ No data loss
8. ✅ Query performance improved or maintained

## Open Questions

1. **Multi-User Conversations:** How should true multi-user conversations (group chats) be handled in the future?
   - Proposed: Separate entity type or maintain multiple conversation entities per user

2. **Room Sharing:** Should rooms be shared across user conversation copies or duplicated?
   - Current: Shared (messages visible to all users in same room)
   - Alternative: Duplicate rooms (separate message histories)

3. **Backwards Compatibility:** Should we maintain a compatibility layer during transition?
   - Proposed: No, clean break with single deployment

## References

- Current Conversation Implementation: `/src/domain/communication/conversation/`
- Current Platform Implementation: `/src/platform/platform/`
- User Entity: `/src/domain/community/user/`
- GraphQL Schema: `/src/schema-bootstrap/`

## Revision History

| Date       | Version | Changes                     | Author |
| ---------- | ------- | --------------------------- | ------ |
| 2025-10-28 | 0.1     | Initial specification draft | System |
