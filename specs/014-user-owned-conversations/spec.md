# Specification: User-Owned Conversations

**Feature ID:** 014-user-owned-conversations
**Status:** Draft
**Created:** 2025-10-28
**Last Updated:** 2025-10-31

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
9. ✅ Reciprocal conversations created correctly for USER_USER type
10. ✅ Room sharing logic prevents duplicate rooms

## Reciprocal Conversation Logic (USER_USER Type)

### Overview

When a user initiates a conversation with another user, the system must ensure both users have conversation entities in their respective ConversationsSet while sharing the same Matrix room to enable bidirectional messaging.

### Architecture Decision: Room Sharing

**Decision:** Rooms are **shared** across user conversation copies. Both users' conversation entities reference the same Room entity with the same `externalRoomID`.

**Rationale:**

- Messages sent by either user are visible to both
- Single source of truth for conversation history
- Efficient use of Matrix resources
- Consistent with Matrix room model

### Implementation Flow

#### Case 1: First User Initiates Conversation

**Scenario:** User A creates a conversation with User B, and User B has no existing conversation with User A.

**Steps:**

1. User A calls `createConversationOnConversationsSet` with `userID = User B`
2. System checks if User B already has a conversation with User A via `findExistingRoomForUserConversation`
3. No existing conversation found
4. System creates:
   - New Room with unique `externalRoomID`
   - Conversation for User A (in User A's ConversationsSet)
     - `userID = User B`
     - `room = newRoom`
   - Reciprocal Conversation for User B (in User B's ConversationsSet)
     - `userID = User A`
     - `room = newRoom` (same room)
5. Both users added to Matrix room

**Result:** Both users can see the conversation and exchange messages.

#### Case 2: Second User Initiates Conversation

**Scenario:** User B already has a conversation with User A (created by User A), and now User B tries to create a conversation with User A.

**Steps:**

1. User B calls `createConversationOnConversationsSet` with `userID = User A`
2. System checks if User A already has a conversation with User B via `findExistingRoomForUserConversation`
3. **Existing conversation found** in User A's ConversationsSet
4. System extracts the existing Room from User A's conversation
5. System creates:
   - Conversation for User B (in User B's ConversationsSet)
     - `userID = User A`
     - `room = existingRoom` (reused)
6. **No reciprocal conversation created** (User A already has one)

**Result:** User B now sees the conversation, and both users share the same Matrix room.

### Service Layer Implementation

#### ConversationsSetService

**Method: `createConversationOnConversationsSet`**

```typescript
public async createConversationOnConversationsSet(
  conversationData: CreateConversationInput,
  conversationsSetID: string
): Promise<IConversation> {
  // ... get conversationsSet ...

  // For USER_USER conversations, check if other user already has a conversation
  let existingRoom: IRoom | undefined;
  if (conversationData.type === CommunicationConversationType.USER_USER) {
    existingRoom = await this.findExistingRoomForUserConversation(
      conversationData.currentUserID,
      conversationData.userID
    );
  }

  // Create conversation with existing room if found
  const conversation = await this.conversationService.createConversation(
    conversationData,
    existingRoom
  );
  conversation.conversationsSet = conversationsSet;

  // Only create reciprocal if no existing room (first user scenario)
  if (
    conversationData.type === CommunicationConversationType.USER_USER &&
    !existingRoom
  ) {
    await this.createReciprocalUserConversation(conversation, conversationData);
  }

  return conversation;
}
```

**Method: `findExistingRoomForUserConversation`**

```typescript
private async findExistingRoomForUserConversation(
  currentUserID: string,
  otherUserID: string
): Promise<IRoom | undefined> {
  // Check if otherUser has a conversation with currentUser
  const existingConversation =
    await this.conversationService.findUserToUserConversation(
      otherUserID,
      currentUserID
    );

  return existingConversation?.room;
}
```

**Method: `createReciprocalUserConversation`**

```typescript
private async createReciprocalUserConversation(
  originalConversation: IConversation,
  originalConversationData: CreateConversationInput
): Promise<void> {
  const otherUser = await this.userLookupService.getUserOrFail(
    originalConversation.userID!,
    { relations: { conversationsSet: true } }
  );

  if (!otherUser.conversationsSet) {
    this.logger.warn('Other user has no conversationsSet, skipping reciprocal');
    return;
  }

  // Check if reciprocal already exists
  const existing = await this.conversationService.findUserToUserConversation(
    originalConversation.userID!,
    originalConversationData.currentUserID
  );

  if (existing) return;

  // Create reciprocal with swapped IDs and same room
  const reciprocalData: CreateConversationInput = {
    type: CommunicationConversationType.USER_USER,
    userID: originalConversationData.currentUserID,
    currentUserID: originalConversation.userID!,
  };

  const reciprocal = await this.conversationService.createConversation(
    reciprocalData,
    originalConversation.room // Same room
  );

  reciprocal.conversationsSet = otherUser.conversationsSet;
  await this.conversationService.save(reciprocal);
}
```

#### ConversationService

**Method: `createConversation` (Updated Signature)**

```typescript
public async createConversation(
  conversationData: CreateConversationInput,
  existingRoom?: IRoom // Optional parameter
): Promise<IConversation> {
  await this.validateCreateConversationData(conversationData);

  const conversation: IConversation = Conversation.create();
  // ... set fields ...

  // Use existing room if provided
  if (existingRoom) {
    conversation.room = existingRoom;
  } else if (!conversationData.wellKnownVirtualContributor) {
    conversation.room = await this.createConversationRoom(
      conversation,
      conversationData.currentUserID
    );
  }

  return await this.conversationRepository.save(conversation);
}
```

**Method: `findUserToUserConversation`**

```typescript
public async findUserToUserConversation(
  conversationsSetOwnerUserID: string,
  otherUserID: string
): Promise<IConversation | null> {
  const ownerUser = await this.userLookupService.getUserOrFail(
    conversationsSetOwnerUserID,
    { relations: { conversationsSet: { conversations: true } } }
  );

  if (!ownerUser.conversationsSet) return null;

  return ownerUser.conversationsSet.conversations.find(
    conv =>
      conv.type === CommunicationConversationType.USER_USER &&
      conv.userID === otherUserID
  ) || null;
}
```

### Validation Changes

**Updated Duplicate Check:**

The duplicate conversation validation now checks within a specific user's ConversationsSet rather than globally:

```typescript
// Before: Global check - would incorrectly flag reciprocal as duplicate
const existing = await this.conversationRepository.find({
  where: { userID: conversationData.userID },
});

// After: User-specific check
const existing = await this.findUserToUserConversation(
  conversationData.currentUserID,
  conversationData.userID
);
```

### Edge Cases & Error Handling

1. **Other User Has No ConversationsSet:**
   - Log warning
   - Skip reciprocal creation
   - First user's conversation still succeeds

2. **Concurrent Creation:**
   - Both users create conversation simultaneously
   - Validation prevents duplicates
   - One succeeds, other reuses room

3. **Room Creation Failure:**
   - Transaction ensures rollback
   - No orphaned conversations

4. **Reciprocal Creation Failure:**
   - Logged but not thrown
   - First user's conversation succeeds
   - Can be retried later

### Testing Requirements

1. **Unit Tests:**
   - `findExistingRoomForUserConversation` returns correct room
   - `createReciprocalUserConversation` creates with same room
   - Duplicate validation works per-user

2. **Integration Tests:**
   - User A → User B: Creates room + reciprocal
   - User B → User A (after above): Reuses room, no reciprocal
   - Both users can send messages
   - Messages visible to both users

3. **Error Scenarios:**
   - Other user missing ConversationsSet
   - Concurrent creation attempts
   - Room creation failure

### Performance Considerations

- **Additional Query:** One extra lookup per USER_USER conversation creation to check for existing room
- **Optimization:** Uses eager loading of conversations to minimize queries
- **Trade-off:** Slight creation overhead vs. correct room sharing

## Conversation Deletion Logic

### Overview

When a user deletes their conversation, the system must handle cleanup of the conversation entity, room entity, and Matrix room resources while respecting reciprocal conversations that may still be active.

### Deletion Principles

1. **User Ownership:** Users can only delete conversations within their own ConversationsSet
2. **Selective Cleanup:** Room entities are always deleted; Matrix rooms are conditionally deleted
3. **Matrix Participation:** User is removed from Matrix room regardless of whether the room is deleted
4. **Reciprocal Preservation:** If the other user still has their conversation, the Matrix room persists

### Implementation Flow

#### Step-by-Step Deletion Process

1. **Load Conversation:**
   - Fetch conversation with `room` and `conversationsSet` relations
   - Validate that room and authorization exist

2. **Find Conversation Owner:**
   - Query User table to find user who owns the conversationsSet
   - This gives us the user's communicationID for Matrix operations

3. **Remove User from Matrix Room:**
   - Call `communicationAdapter.removeUserFromRooms()` with conversation owner's communicationID
   - This happens regardless of whether Matrix room will be deleted
   - Ensures user is removed from Matrix even if room stays active

4. **Check for Reciprocal Conversation:**
   - For USER_USER conversations, check if other user has their conversation
   - Query other user's ConversationsSet for a conversation pointing back
   - Set `shouldDeleteMatrixRoom = false` if reciprocal exists

5. **Delete Room Entity:**
   - Call `roomService.deleteRoom(room, shouldDeleteMatrixRoom)`
   - Room entity is **always deleted** from database
   - Matrix room is **only deleted** if `shouldDeleteMatrixRoom = true`

6. **Clean Up Related Entities:**
   - Delete authorization policy
   - Remove conversation entity from database

### Service Layer Implementation

#### ConversationService.deleteConversation()

```typescript
public async deleteConversation(
  conversationID: string
): Promise<IConversation> {
  // 1. Load conversation with relations
  const conversation = await this.getConversationOrFail(conversationID, {
    relations: { room: true, conversationsSet: true },
  });

  if (!conversation.room || !conversation.authorization) {
    throw new EntityNotInitializedException(
      `Unable to load conversation for deleting: ${conversation.id}`,
      LogContext.COLLABORATION
    );
  }

  if (!conversation.conversationsSet) {
    throw new EntityNotInitializedException(
      `Unable to load conversationsSet for deleting conversation: ${conversation.id}`,
      LogContext.COLLABORATION
    );
  }

  // 2. Find the user who owns this conversation
  const conversationOwner = await this.entityManager.findOne(User, {
    where: {
      conversationsSet: { id: conversation.conversationsSet.id },
    },
  });

  if (!conversationOwner) {
    throw new EntityNotFoundException(
      `Unable to find owner of conversation: ${conversationID}`,
      LogContext.COLLABORATION
    );
  }

  // 3. Remove the conversation owner from the Matrix room
  await this.communicationAdapter.removeUserFromRooms(
    [conversation.room.externalRoomID],
    conversationOwner.communicationID
  );

  // 4. Check for reciprocal conversation (USER_USER only)
  let shouldDeleteMatrixRoom = true;
  if (
    conversation.type === CommunicationConversationType.USER_USER &&
    conversation.userID
  ) {
    const reciprocalExists = await this.hasReciprocalConversation(conversation);
    if (reciprocalExists) {
      shouldDeleteMatrixRoom = false;
    }
  }

  // 5. Delete room entity (always) and optionally Matrix room
  await this.roomService.deleteRoom(conversation.room, shouldDeleteMatrixRoom);

  // 6. Clean up authorization and conversation entity
  await this.authorizationPolicyService.delete(conversation.authorization);
  const result = await this.conversationRepository.remove(
    conversation as Conversation
  );
  result.id = conversationID;

  return result;
}
```

#### ConversationService.hasReciprocalConversation()

```typescript
private async hasReciprocalConversation(
  conversation: IConversation
): Promise<boolean> {
  if (conversation.type !== CommunicationConversationType.USER_USER) {
    return false;
  }

  if (!conversation.userID || !conversation.conversationsSet) {
    return false;
  }

  // Find the user who owns this conversationsSet
  const conversationOwner = await this.entityManager.findOne(User, {
    where: {
      conversationsSet: { id: conversation.conversationsSet.id },
    },
  });

  if (!conversationOwner) {
    return false;
  }

  // Check if the other user has a conversation back to the owner
  const reciprocalConversation = await this.findUserToUserConversation(
    conversation.userID,
    conversationOwner.id
  );

  return reciprocalConversation !== null;
}
```

#### RoomService.deleteRoom() (Updated)

```typescript
async deleteRoom(
  roomInput: IRoom,
  deleteExternalRoom: boolean = true
): Promise<IRoom> {
  const room = await this.getRoomOrFail(roomInput.id, {
    relations: { vcInteractions: true },
  });

  // Clean up VC interactions
  if (room.vcInteractions) {
    for (const interaction of room.vcInteractions) {
      await this.vcInteractionService.removeVcInteraction(interaction.id);
    }
  }

  // Always delete room entity from database
  const result = await this.roomRepository.remove(room as Room);

  // Only delete from external Matrix server if flag is true
  if (deleteExternalRoom) {
    await this.communicationAdapter.removeRoom(room.externalRoomID);
  }

  return result;
}
```

### Deletion Scenarios

#### Scenario 1: User A Deletes, User B Still Has Conversation

**Initial State:**

- User A has conversation with User B (shares Matrix room R1)
- User B has reciprocal conversation with User A (shares Matrix room R1)

**User A Deletes Their Conversation:**

1. User A removed from Matrix room R1
2. Reciprocal check finds User B's conversation exists
3. Room entity deleted from User A's conversation
4. Matrix room R1 **preserved** (User B still needs it)
5. User B can still see conversation and send messages

**Result:**

- User A: No conversation entity
- User B: Conversation entity exists, room accessible
- Matrix room R1: Still exists, only User B is member

#### Scenario 2: User A Deletes, No Reciprocal Exists

**Initial State:**

- User A has conversation with User B (shares Matrix room R1)
- User B **does not have** a reciprocal conversation (maybe deleted earlier)

**User A Deletes Their Conversation:**

1. User A removed from Matrix room R1
2. Reciprocal check finds no conversation from User B
3. Room entity deleted
4. Matrix room R1 **deleted** (no users need it)

**Result:**

- User A: No conversation entity
- User B: No conversation entity (if had one, deleted earlier)
- Matrix room R1: Fully deleted from Matrix server

#### Scenario 3: Both Users Delete (Sequential)

**Initial State:**

- User A has conversation with User B (shares Matrix room R1)
- User B has reciprocal conversation with User A (shares Matrix room R1)

**User A Deletes First:**

1. User A removed from Matrix room R1
2. Reciprocal exists → Matrix room preserved
3. User A's conversation entity deleted

**User B Deletes After:**

1. User B removed from Matrix room R1
2. No reciprocal exists (User A deleted theirs)
3. Matrix room R1 **deleted** (no users need it)

**Result:**

- Complete cleanup of all resources

### Authorization

**Mutation:** `deleteConversation`

**Authorization Check:**

```typescript
@Mutation(() => IConversation)
@UseGuards(GraphqlGuard)
async deleteConversation(
  @CurrentUser() agentInfo: AgentInfo,
  @Args('deleteData') deleteData: DeleteConversationInput
): Promise<IConversation> {
  const conversation = await this.conversationService.getConversationOrFail(
    deleteData.ID,
    { relations: { conversationsSet: true } }
  );

  // Find conversation owner
  const conversationOwner = await this.entityManager.findOne(User, {
    where: { conversationsSet: { id: conversation.conversationsSet.id } },
  });

  // Authorization: User can only delete their own conversations
  if (conversationOwner?.id !== agentInfo.userID) {
    throw new ForbiddenException(
      'User can only delete conversations in their own conversations set'
    );
  }

  this.authorizationService.grantAccessOrFail(
    agentInfo,
    conversation.authorization,
    AuthorizationPrivilege.DELETE,
    `delete conversation: ${conversation.id}`
  );

  return await this.conversationService.deleteConversation(deleteData.ID);
}
```

### Edge Cases & Error Handling

1. **Missing ConversationsSet:**
   - Throw `EntityNotInitializedException`
   - Prevent orphaned room deletion

2. **Missing Conversation Owner:**
   - Throw `EntityNotFoundException`
   - Cannot proceed without owner's communicationID

3. **Matrix Room Removal Failure:**
   - Log error but continue with database cleanup
   - Matrix room may need manual cleanup

4. **Reciprocal Check Failure:**
   - Default to preserving Matrix room (safer)
   - Log warning for investigation

5. **USER_VC Conversations:**
   - No reciprocal check needed
   - Always delete Matrix room

### Testing Requirements

1. **Unit Tests:**
   - `hasReciprocalConversation` returns correct boolean
   - Owner lookup via conversationsSet works
   - Room deletion parameters correct

2. **Integration Tests:**
   - Delete with reciprocal → Matrix room preserved
   - Delete without reciprocal → Matrix room deleted
   - Both users delete → complete cleanup
   - Authorization prevents cross-user deletion

3. **Error Scenarios:**
   - Missing conversationsSet
   - Missing owner
   - Matrix API failures

### Performance Considerations

- **Additional Queries:** 2 extra queries per deletion (owner lookup + reciprocal check)
- **Matrix API Calls:** 1-2 calls (removeUser + conditionally removeRoom)
- **Trade-off:** Slightly slower deletion vs. correct resource management

## Open Questions

1. **Multi-User Conversations:** How should true multi-user conversations (group chats) be handled in the future?
   - Proposed: Separate entity type or maintain multiple conversation entities per user

2. ~~**Room Sharing:** Should rooms be shared across user conversation copies or duplicated?~~
   - **RESOLVED:** Shared rooms with reciprocal conversation logic (documented above)

3. **Backwards Compatibility:** Should we maintain a compatibility layer during transition?
   - Proposed: No, clean break with single deployment

## References

- Current Conversation Implementation: `/src/domain/communication/conversation/`
- Current Platform Implementation: `/src/platform/platform/`
- User Entity: `/src/domain/community/user/`
- GraphQL Schema: `/src/schema-bootstrap/`
- ConversationsSetService: `/src/domain/communication/conversations-set/conversations.set.service.ts`

## Revision History

| Date       | Version | Changes                                                 | Author |
| ---------- | ------- | ------------------------------------------------------- | ------ |
| 2025-10-28 | 0.1     | Initial specification draft                             | System |
| 2025-10-31 | 0.2     | Added reciprocal conversation logic detail              | System |
| 2025-10-31 | 0.3     | Added conversation deletion logic and renumbered to 014 | System |
