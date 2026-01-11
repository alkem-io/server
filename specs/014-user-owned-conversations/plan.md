# Implementation Plan: User-Owned Conversations

**Feature ID:** 012-user-owned-conversations
**Status:** Planning
**Created:** 2025-10-28
**Estimated Effort:** 8 days
**Risk Level:** High (significant data migration)

## Phase 0: Design Review & Validation

**Duration:** 1 day
**Blockers:** None

### Tasks

- [x] Create specification document
- [x] Identify all affected files and components
- [ ] Review specification with team
- [ ] Validate migration strategy with data samples
- [ ] Confirm rollback strategy
- [ ] Get approval to proceed

### Deliverables

- Approved specification document
- Migration script prototype
- Test data samples

## Phase 1: Entity Model Updates

**Duration:** 1 day
**Dependencies:** Phase 0 complete
**Risk:** Low

### 1.1 Update User Entity & Interface ✅

**Files:**

- `/src/domain/community/user/user.entity.ts` ✅
- `/src/domain/community/user/user.interface.ts` ✅

**Changes:**

```typescript
// user.entity.ts
@OneToOne(() => ConversationsSet, {
  eager: false,
  cascade: true,
  onDelete: 'SET NULL',
})
@JoinColumn()
conversationsSet?: ConversationsSet;

// user.interface.ts
conversationsSet?: IConversationsSet;
```

**Tests:**

- User entity can be created with conversationsSet
- User can be loaded with conversationsSet eager/lazy
- Cascade delete works correctly

### 1.2 Update Conversation Entity & Interface ✅

**Files:**

- `/src/domain/communication/conversation/conversation.entity.ts` ✅
- `/src/domain/communication/conversation/conversation.interface.ts` ✅

**Changes:**

```typescript
// conversation.entity.ts
// REMOVE: @Column('json', { nullable: false })
// REMOVE: userIDs!: string[];
@Column('char', { length: UUID_LENGTH, nullable: false })
userID!: string;

// conversation.interface.ts
// REMOVE: userIDs!: string[];
userID!: string;
```

**Tests:**

- Conversation entity can be created with userID
- TypeORM schema generation creates char column

### 1.3 Update Platform Entity & Interface

**Files:**

- `/src/platform/platform/platform.entity.ts`
- `/src/platform/platform/platform.interface.ts`

**Changes:**

```typescript
// Remove from both files:
// @OneToOne(() => ConversationsSet)
// @JoinColumn()
// conversationsSet?: ConversationsSet;
```

**Tests:**

- Platform entity loads without conversationsSet
- No breaking changes to other platform functionality

### Completion Criteria

- [x] All entity models updated
- [x] All interfaces updated
- [ ] TypeORM schema changes validated
- [ ] All entity unit tests passing

## Phase 2: DTO & Input Updates

**Duration:** 0.5 days
**Dependencies:** Phase 1 complete
**Risk:** Low

### 2.1 Update Conversation DTOs ✅ (Partial)

**Files:**

- `/src/domain/communication/conversation/dto/conversation.dto.create.ts` ✅
- `/src/domain/communication/conversation/dto/conversation.dto.update.ts`
- `/src/domain/communication/conversations-set/dto/conversations.set.dto.create.conversation.ts`

**Changes:**

```typescript
// CreateConversationInput
@Field(() => UUID, { nullable: false })
userID!: string;  // Changed from userIDs: string[]
```

### 2.2 Update GraphQL Schema

**Files:**

- `/src/schema-bootstrap/schema.ts` (auto-generated)
- `/schema-baseline.graphql` (will be regenerated)

**Validation:**

- Run schema generation
- Compare schema changes
- Update baseline

### Completion Criteria

- [ ] All DTOs updated to use userID
- [ ] GraphQL schema generated successfully
- [ ] Schema validation passes
- [ ] No TypeScript compilation errors

## Phase 3: Service Layer Updates

**Duration:** 2 days
**Dependencies:** Phase 2 complete
**Risk:** Medium-High

### 3.1 Update ConversationService

**File:** `/src/domain/communication/conversation/conversation.service.ts`

**Methods to Update:**

1. **createConversation()** - Lines ~47-68

   ```typescript
   // BEFORE: conversation.userIDs = conversationData.userIDs;
   // AFTER:
   conversation.userID = conversationData.userID;

   // BEFORE: `conversation-${conversation.userIDs.join('-')}`
   // AFTER: `conversation-${conversation.userID}`
   ```

2. **createConversationRoom()** - Lines ~70-95

   ```typescript
   // Update room naming
   // Update contributor loop to single userID
   for (const userID of [conversation.userID]) {
     await this.roomService.addContributorToRoom(roomID, userID);
   }
   ```

3. **validateCreateConversationData()** - Lines ~101-180

   ```typescript
   // USER_USER case:
   // REMOVE: if (conversationData.userIDs.length !== 2)
   // REMOVE: Array sorting and JSON conversion
   // AFTER: Simple query with conversationsSetID + userID + type

   // USER_VC case:
   // REMOVE: if (conversationData.userIDs.length !== 1)
   // AFTER: Query with userID directly
   ```

4. **findExistingConversation()** - If exists
   ```typescript
   // BEFORE: JSON array query
   // AFTER: Simple equality: WHERE userID = :userID
   ```

**Estimated Lines:** ~200 lines of changes

**Tests:**

- Conversation creation with single userID
- Room creation and contributor addition
- Validation logic for different conversation types
- Duplicate conversation prevention

### 3.2 Update ConversationAuthorizationService

**File:** `/src/domain/communication/conversation/conversation.service.authorization.ts`

**Methods to Update:**

1. **createCredentialRuleContributors()** - Lines ~79-90

   ```typescript
   // BEFORE: userIDs: string[]
   // AFTER: userID: string

   private createCredentialRuleContributors(
     userID: string
   ): IAuthorizationPolicyRuleCredential {
     return {
       criterias: [{
         resourceID: userID,
         type: AuthorizationCredential.USER_SELF_MANAGEMENT,
       }],
     };
   }
   ```

2. **applyAuthorizationPolicy()** - Line ~53
   ```typescript
   // BEFORE: this.createCredentialRuleContributors(conversation.userIDs)
   // AFTER: this.createCredentialRuleContributors(conversation.userID)
   ```

**Estimated Lines:** ~20 lines of changes

**Tests:**

- Authorization policy created correctly for single user
- User can access their own conversation
- Other users cannot access conversation

### 3.3 Update ConversationsSetService

**File:** `/src/domain/communication/conversations-set/conversations.set.service.ts`

**Methods to Update:**

1. **createConversationOnConversationsSet()** - Lines ~119-138 ✅

   ```typescript
   // Updated to handle reciprocal conversation logic
   // Check for existing room before creating conversation
   let existingRoom: IRoom | undefined;
   if (conversationData.type === CommunicationConversationType.USER_USER) {
     existingRoom = await this.findExistingRoomForUserConversation(
       conversationData.currentUserID,
       conversationData.userID
     );
   }

   const conversation = await this.conversationService.createConversation(
     conversationData,
     existingRoom
   );

   // Only create reciprocal if no existing room found
   if (
     conversationData.type === CommunicationConversationType.USER_USER &&
     !existingRoom
   ) {
     await this.createReciprocalUserConversation(
       conversation,
       conversationData
     );
   }
   ```

2. **Add: findExistingRoomForUserConversation()** ✅

   ```typescript
   private async findExistingRoomForUserConversation(
     currentUserID: string,
     otherUserID: string
   ): Promise<IRoom | undefined> {
     const existingConversation =
       await this.conversationService.findUserToUserConversation(
         otherUserID,
         currentUserID
       );
     return existingConversation?.room;
   }
   ```

3. **Add: createReciprocalUserConversation()** ✅

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
       this.logger.warn('Other user has no conversationsSet');
       return;
     }

     // Check if reciprocal already exists
     const existing = await this.conversationService.findUserToUserConversation(
       originalConversation.userID!,
       originalConversationData.currentUserID
     );
     if (existing) return;

     // Create reciprocal with same room
     const reciprocalData: CreateConversationInput = {
       type: CommunicationConversationType.USER_USER,
       userID: originalConversationData.currentUserID,
       currentUserID: originalConversation.userID!,
     };

     const reciprocal = await this.conversationService.createConversation(
       reciprocalData,
       originalConversation.room
     );

     reciprocal.conversationsSet = otherUser.conversationsSet;
     await this.conversationService.save(reciprocal);
   }
   ```

4. **Add: getUserConversationsSet()**
   ```typescript
   async getUserConversationsSet(userID: string): Promise<IConversationsSet> {
     const user = await this.userService.getUserOrFail(userID, {
       relations: { conversationsSet: { conversations: true } }
     });
     return user.conversationsSet;
   }
   ```

**Estimated Lines:** ~150 lines of changes

**Tests:**

- Get user's conversationsSet ✅
- Create conversation on user's conversationsSet ✅
- Reciprocal conversation created when first user initiates ✅
- Existing room reused when second user initiates ✅
- No duplicate conversations created ✅
- Both users share same Matrix room ✅

### 3.3 Update ConversationService (Reciprocal Logic)

**File:** `/src/domain/communication/conversation/conversation.service.ts`

**Methods to Update:**

1. **createConversation()** - Updated signature ✅

   ```typescript
   public async createConversation(
     conversationData: CreateConversationInput,
     existingRoom?: IRoom // New optional parameter
   ): Promise<IConversation> {
     await this.validateCreateConversationData(conversationData);

     const conversation: IConversation = Conversation.create();
     // ... set fields ...

     // Use existing room if provided, otherwise create new
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

2. **Add: findUserToUserConversation()** ✅

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

3. **Update: validateCreateConversationData()** ✅
   ```typescript
   // Updated duplicate check to be user-specific
   const existingConversation = await this.findUserToUserConversation(
     conversationData.currentUserID,
     conversationData.userID
   );
   if (existingConversation) {
     throw new ValidationException('Conversation already exists');
   }
   ```

**Estimated Lines:** ~80 lines of changes

**Tests:**

- Create conversation with existing room ✅
- Find existing USER_USER conversation ✅
- Validation prevents duplicate in same ConversationsSet ✅
- Validation allows reciprocal in different ConversationsSet ✅

### 3.4 Update UserService

**File:** `/src/domain/community/user/user.service.ts`

**Methods to Update:**

1. **createUser()** - Lines ~110-225

   ```typescript
   // Add after storageAggregator creation:
   user.conversationsSet =
     await this.conversationsSetService.createConversationsSet();
   ```

2. **createGuidanceConversationForUser()** - Lines ~227-250

   ```typescript
   // BEFORE: userIDs: [userID]
   // AFTER: userID: userID

   await this.conversationsSetService.createConversationOnConversationsSet({
     conversationsSetID: conversationsSet.id,
     type: CommunicationConversationType.USER_VC,
     userID: userID, // Single ID
     wellKnownVirtualContributor: VirtualContributorWellKnown.CHAT_GUIDANCE,
   });
   ```

3. **Add: getConversationsSet()**
   ```typescript
   async getConversationsSet(userID: string): Promise<IConversationsSet> {
     const user = await this.getUserOrFail(userID, {
       relations: { conversationsSet: true }
     });
     if (!user.conversationsSet) {
       throw new RelationshipNotFoundException(
         `User ${userID} does not have a conversationsSet`
       );
     }
     return user.conversationsSet;
   }
   ```

**Estimated Lines:** ~100 lines of changes

**Tests:**

- New users get conversationsSet created
- Guidance conversation created with single userID
- GetConversationsSet returns user's set

### 3.5 Update PlatformService

**File:** `/src/platform/platform/platform.service.ts`

**Methods to Remove:**

1. **getConversationsSetOrFail()** - Lines ~175-190
   ```typescript
   // DELETE entire method
   ```

**Methods to Update:**

1. Any methods that reference `platform.conversationsSet`

**Estimated Lines:** ~30 lines removed/changed

**Tests:**

- Platform loads without conversationsSet
- No calls to removed methods

### 3.6 Update BootstrapService

**File:** `/src/core/bootstrap/bootstrap.service.ts`

**Methods to Update:**

1. **ensureGuidanceChat()** - Remove or update
   ```typescript
   // This method may no longer be needed since each user
   // gets their own guidance conversation on creation
   // Consider removing or converting to validation check
   ```

**Estimated Lines:** ~50 lines removed/changed

### Completion Criteria

- [ ] All service methods updated
- [ ] All authorization logic updated
- [ ] All service unit tests passing
- [ ] Integration tests passing
- [ ] No references to old platform conversationsSet

## Phase 4: Resolver Updates

**Duration:** 1 day
**Dependencies:** Phase 3 complete
**Risk:** Medium

### 4.1 Update MeResolver

**File:** `/src/services/api/me/me.resolver.fields.ts`

**Methods to Update:**

1. **conversations()** field resolver
   ```typescript
   @ResolveField(() => [IConversation])
   async conversations(
     @Parent() user: IUser,
     @CurrentUser() actorContext: AgentInfo
   ): Promise<IConversation[]> {
     const conversationsSet =
       await this.userService.getConversationsSet(user.id);
     return conversationsSet.conversations;
   }
   ```

**Tests:**

- Me query returns user's conversations
- Authorization checks pass
- Empty array for users without conversations

### 4.2 Update UserResolverFields

**File:** `/src/domain/community/user/user.resolver.fields.ts`

**Methods to Add:**

1. **conversationsSet()** field resolver
   ```typescript
   @ResolveField(() => IConversationsSet, { nullable: true })
   async conversationsSet(
     @Parent() user: IUser,
     @CurrentUser() actorContext: AgentInfo
   ): Promise<IConversationsSet | null> {
     // Authorization check
     return await this.userService.getConversationsSet(user.id);
   }
   ```

**Tests:**

- User.conversationsSet returns correct data
- Authorization prevents access to other users' conversations

### 4.3 Update ConversationsSetResolverMutations

**File:** `/src/domain/communication/conversations-set/conversations.set.resolver.mutations.ts`

**Methods to Update:**

1. **createConversationOnConversationsSet()**

   ```typescript
   // Update to use userID instead of userIDs
   // Authorization: verify user owns the conversationsSet
   ```

2. **createChatGuidanceConversation()**
   ```typescript
   // Update to use current user's ID as userID
   ```

**Tests:**

- Mutations accept single userID
- Authorization checks user ownership
- Conversations created correctly

### 4.4 Remove PlatformResolverFields conversationsSet

**File:** `/src/platform/platform/platform.resolver.fields.ts`

**Methods to Remove:**

- Any conversationsSet field resolver

### Completion Criteria

- [ ] All resolvers updated
- [ ] GraphQL queries work with new schema
- [ ] Authorization checks correct
- [ ] All resolver tests passing

## Phase 5: Migration Implementation

**Duration:** 2 days
**Dependencies:** Phases 1-4 complete
**Risk:** High

### 5.1 Create Migration File

**File:** `/src/migrations/[TIMESTAMP]-user-owned-conversations.ts`

**Migration Structure:**

```typescript
export class UserOwnedConversations[TIMESTAMP] implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add conversationsSetId to user table
    // 2. Create conversationsSet for each user
    // 3. Migrate existing conversations (duplicate per user)
    // 4. Drop userIDs column, add userID column
    // 5. Remove conversationsSetId from platform
    // 6. Add foreign key constraints
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse all operations
  }
}
```

### 5.2 Migration Steps Detail

**Note:** ⚠️ Since there are **no existing conversations to migrate**, the migration is simplified to schema changes only.

**Step 1: Add conversationsSet to Users**

```sql
ALTER TABLE `user` ADD `conversationsSetId` char(36) NULL;
CREATE UNIQUE INDEX `REL_user_conversationsSetId` ON `user` (`conversationsSetId`);
```

**Step 2: Update Conversation Schema**

```sql
-- Drop userIDs JSON column
ALTER TABLE `conversation` DROP COLUMN `userIDs`;

-- Add userID scalar column
ALTER TABLE `conversation` ADD `userID` char(36) NOT NULL;

-- Add index
CREATE INDEX `IDX_conversation_userID` ON `conversation` (`userID`);
```

**Step 3: Remove Platform conversationsSet**

```sql
ALTER TABLE `platform` DROP FOREIGN KEY `FK_platform_conversationsSet`;
DROP INDEX `REL_platform_conversationsSet` ON `platform`;
ALTER TABLE `platform` DROP COLUMN `conversationsSetId`;
```

**Step 4: Add Constraints**

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

### 5.3 Migration Testing

**Test Approach:** Since no data to migrate, focus on schema validation

**Test Actions:**

- Create test user → verify can create conversationsSet
- Create conversation with userID → verify stores correctly
- Verify foreign key constraints work
- Test rollback/re-run of migration

**Validation Queries:**

```sql
-- Verify conversation schema
DESCRIBE conversation;
-- Should show userID char(36) NOT NULL, no userIDs column

-- Verify user schema
DESCRIBE user;
-- Should show conversationsSetId char(36) NULL

-- Verify platform schema
DESCRIBE platform;
-- Should NOT show conversationsSetId column
```

### Completion Criteria

- [ ] Migration script created
- [ ] Migration tested on clean database
- [ ] Rollback script tested
- [ ] Schema validation queries pass
- [ ] Performance acceptable (< 1 minute, schema changes only)

````

**Step 3: Remove Platform conversationsSet****Step 5: Remove Platform conversationsSet**
```sql
ALTER TABLE `platform` DROP FOREIGN KEY `FK_platform_conversationsSet`;
DROP INDEX `REL_platform_conversationsSet` ON `platform`;
ALTER TABLE `platform` DROP COLUMN `conversationsSetId`;
````

**Step 6: Add Constraints**

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

### 5.3 Migration Helper Methods

```typescript
private async createConversationsSet(queryRunner: QueryRunner): Promise<string> {
  const id = randomUUID();
  const authId = await this.createAuthorizationPolicy(queryRunner);
  await queryRunner.query(`
    INSERT INTO conversations_set (id, authorizationId, createdDate, updatedDate)
    VALUES ('${id}', '${authId}', NOW(), NOW())
  `);
  return id;
}

private async createAuthorizationPolicy(
  queryRunner: QueryRunner
): Promise<string> {
  const id = randomUUID();
  await queryRunner.query(`
    INSERT INTO authorization_policy (id, createdDate, updatedDate, version)
    VALUES ('${id}', NOW(), NOW(), 1)
  `);
  return id;
}
```

### 5.4 Migration Testing

**Test Data Setup:**

- Create 10 test users
- Create 5 user-VC conversations (different users)
- Create 3 user-user conversations (2 users each)
- Create 1 multi-user conversation (3+ users)

**Validation Queries:**

```sql
-- All users have conversationsSet
SELECT COUNT(*) FROM user WHERE conversationsSetId IS NULL;

-- All conversations have userID
SELECT COUNT(*) FROM conversation WHERE userID IS NULL;

-- Conversation count increased correctly
-- (should be original_count - multi_user_convs + (sum of userIDs in multi_user_convs))

-- Rooms preserved
SELECT COUNT(DISTINCT roomId) FROM conversation;

-- Authorization policies created
SELECT COUNT(*) FROM authorization_policy
WHERE id IN (SELECT authorizationId FROM conversation);
```

### Completion Criteria

- [ ] Migration script created
- [ ] Migration tested on sample data
- [ ] Rollback script tested
- [ ] Data validation queries pass
- [ ] Performance acceptable (< 5 minutes for 100k conversations)

## Phase 6: Testing

**Duration:** 1.5 days
**Dependencies:** Phases 1-5 complete
**Risk:** Medium

### 6.1 Unit Tests

**Coverage Required:** > 80%

**Test Files to Create/Update:**

1. `conversation.service.spec.ts`
   - createConversation with userID
   - room creation
   - validation logic

2. `conversations.set.service.spec.ts`
   - getUserConversationsSet
   - createConversationOnConversationsSet

3. `user.service.spec.ts`
   - conversationsSet creation
   - getConversationsSet
   - guidance conversation creation

4. `conversation.service.authorization.spec.ts`
   - Authorization with single userID
   - Policy rules

### 6.2 Integration Tests

**Test Scenarios:**

1. **User Creation Flow**
   - Create user → verify conversationsSet exists
   - Verify guidance conversation created
   - Verify conversation has userID

2. **Conversation Creation**
   - Create VC conversation → verify appears in user's set
   - Create second conversation → verify both appear
   - Verify authorization

3. **Migration Tests**
   - Run migration on test data
   - Verify data integrity
   - Verify rollback works

### 6.3 E2E Tests

**GraphQL Query Tests:**

```graphql
# Test 1: Get user conversations
query {
  me {
    id
    conversationsSet {
      id
      conversations {
        id
        userID
        type
      }
    }
  }
}

# Test 2: Create conversation
mutation {
  createConversationOnConversationsSet(
    conversationData: {
      conversationsSetID: "..."
      userID: "..."
      type: USER_VC
      wellKnownVirtualContributor: CHAT_GUIDANCE
    }
  ) {
    id
    userID
  }
}
```

### Completion Criteria

- [ ] All unit tests passing (> 80% coverage)
- [ ] All integration tests passing
- [ ] E2E tests passing
- [ ] Migration tests passing
- [ ] Performance tests passing

## Phase 7: Documentation & Deployment

**Duration:** 0.5 days
**Dependencies:** Phase 6 complete
**Risk:** Low

### 7.1 Update Documentation

**Files to Update:**

1. `/docs/DataManagement.md`
   - Document new conversation ownership model
   - Update ER diagrams

2. `/README.md`
   - Update migration notes

3. API Documentation
   - Update GraphQL schema docs
   - Document breaking changes

### 7.2 Deployment Checklist

- [ ] Create deployment plan
- [ ] Schedule maintenance window (2-4 hours)
- [ ] Backup production database
- [ ] Deploy to staging
- [ ] Run migration on staging
- [ ] Validate staging data
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Run migration on production
- [ ] Validate production data
- [ ] Monitor for 24 hours

### 7.3 Rollback Plan

**If Issues Detected:**

1. Stop application
2. Run down migration
3. Restore from backup (if necessary)
4. Restart application
5. Investigate issues
6. Fix and reschedule

### Completion Criteria

- [ ] Documentation updated
- [ ] Deployment successful
- [ ] No critical issues
- [ ] Monitoring shows normal operation

## Risk Management

### High Risk Items

1. **Data Migration Complexity**
   - Risk: Data loss or corruption during migration
   - Mitigation: Extensive testing, backup strategy, rollback plan
   - Contingency: Database backup restore

2. **Migration Duration**
   - Risk: Migration takes too long, extended downtime
   - Mitigation: Test on production-sized dataset, optimize queries
   - Contingency: Split migration into phases

3. **Breaking Changes**
   - Risk: Client applications break due to schema changes
   - Mitigation: Communication, staged rollout, compatibility layer
   - Contingency: Rollback, temporary compatibility endpoints

### Medium Risk Items

1. **Authorization Edge Cases**
   - Risk: Users can access conversations they shouldn't
   - Mitigation: Comprehensive authorization tests
   - Contingency: Hot-fix deployment

2. **Performance Degradation**
   - Risk: New queries slower than expected
   - Mitigation: Index optimization, query profiling
   - Contingency: Additional indexes, query optimization

## Dependencies & Blockers

### External Dependencies

- None

### Internal Dependencies

- Database migration framework (TypeORM)
- GraphQL schema generation
- Test infrastructure

### Known Blockers

- None currently identified

## Timeline Summary

| Phase                     | Duration   | Start | End   | Status             |
| ------------------------- | ---------- | ----- | ----- | ------------------ |
| Phase 0: Design Review    | 1 day      | Day 1 | Day 1 | In Progress        |
| Phase 1: Entity Updates   | 1 day      | Day 2 | Day 2 | Partially Complete |
| Phase 2: DTO Updates      | 0.5 days   | Day 3 | Day 3 | Partially Complete |
| Phase 3: Service Updates  | 2 days     | Day 3 | Day 4 | Not Started        |
| Phase 4: Resolver Updates | 1 day      | Day 5 | Day 5 | Not Started        |
| Phase 5: Migration        | 2 days     | Day 6 | Day 7 | Not Started        |
| Phase 6: Testing          | 1.5 days   | Day 7 | Day 8 | Not Started        |
| Phase 7: Deployment       | 0.5 days   | Day 8 | Day 8 | Not Started        |
| **Total**                 | **8 days** | Day 1 | Day 8 |                    |

## Next Steps

1. **Immediate (Today):**
   - [x] Create specification document
   - [x] Create implementation plan
   - [ ] Review with team
   - [ ] Get approval

2. **Tomorrow:**
   - [ ] Complete entity model updates
   - [ ] Start DTO updates
   - [ ] Begin service layer updates

3. **This Week:**
   - [ ] Complete all code changes
   - [ ] Create migration script
   - [ ] Write tests

4. **Next Week:**
   - [ ] Deploy to staging
   - [ ] Final testing
   - [ ] Production deployment

## Sign-off

- [ ] Technical Lead Approval
- [ ] Product Owner Approval
- [ ] QA Lead Approval
- [ ] DevOps Approval

---

**Last Updated:** 2025-10-28
**Document Version:** 1.0
