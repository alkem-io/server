# Implementation Tasks: Actor Transformation

**Feature**: 026-actor-transformation
**Generated**: 2025-12-27
**Status**: ✅ Implemented (commit `a899ef55` + follow-up fixes on `026-actor-transformation-v2`)

## Overview

This document contains implementation tasks organized by user story. Tasks are ordered by dependency - complete earlier tasks before later ones within each phase.

**Priority Legend**:
- **P1**: Critical path - blocks other work
- **P2**: High value - enables key functionality
- **P3**: Important - improves maintainability

---

## Phase 0: Infrastructure Setup ✅ Complete (P1 - Prerequisite)

These foundational tasks must be completed before any user story work begins.

### Task 0.1: Create ActorType Enum

**Description**: Create the TypeScript enum for actor types that will be used throughout the codebase.

**Files to create**:
- `src/common/enums/actor.type.ts`

**Implementation**:
```typescript
export enum ActorType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL_CONTRIBUTOR = 'virtual-contributor',
  SPACE = 'space',
  ACCOUNT = 'account',
}
```

**Acceptance**:
- [ ] Enum file exists with all 5 actor types
- [ ] Values match PostgreSQL ENUM values exactly (lowercase, hyphenated)
- [ ] Exported from common/enums barrel file

---

### Task 0.2: Create Actor Entity Base

**Description**: Create the abstract Actor entity using TypeORM Class Table Inheritance.

**Files to create**:
- `src/domain/actor/actor/actor.entity.ts`
- `src/domain/actor/actor/actor.interface.ts`

**Dependencies**: Task 0.1

**Implementation notes**:
- Use `@TableInheritance({ column: { type: 'varchar', name: 'type', length: ENUM_LENGTH } })`
- Actor extends `AuthorizableEntity`
- Include `profileId` (nullable UUID) and `credentials` OneToMany relationship
- Mark class as `abstract`

**Acceptance**:
- [ ] Actor entity compiles without errors
- [ ] Uses Class Table Inheritance pattern
- [ ] Has type, profileId, credentials fields
- [ ] IActorBase interface defined

---

### Task 0.3: Create Actor Module Structure

**Description**: Create NestJS module structure for Actor domain.

**Files to create**:
- `src/domain/actor/actor/actor.module.ts`
- `src/domain/actor/actor/actor.service.ts`
- `src/domain/actor/actor.module.ts` (barrel module)

**Dependencies**: Task 0.2

**Implementation notes**:
- ActorService will initially be a stub - methods added in later tasks
- Export ActorModule from domain module

**Acceptance**:
- [ ] ActorModule registered in domain module
- [ ] ActorService injectable
- [ ] No circular dependency errors

---

### Task 0.4: Create PostgreSQL ENUM Migration

**Description**: Create database migration to add `actor_type_enum` PostgreSQL type.

**Files to create**:
- `src/migrations/TIMESTAMP-CreateActorTypeEnum.ts`

**Dependencies**: Task 0.1

**Implementation**:
```sql
CREATE TYPE "actor_type_enum" AS ENUM(
  'user',
  'organization',
  'virtual-contributor',
  'space',
  'account'
);
```

**Acceptance**:
- [ ] Migration creates enum type
- [ ] Migration is reversible (DROP TYPE)
- [ ] `pnpm run migration:validate` passes

---

## Phase 1: User Story 5 - Migration of Existing Data ✅ Complete (P1)

**Rationale**: Migration must work before any other functionality can be deployed. This phase creates the Actor table and migrates Agent data.

### Task 1.1: Create Actor Table Migration

**Description**: Create migration to add Actor table with Class Table Inheritance structure.

**Files to create**:
- `src/migrations/TIMESTAMP-CreateActorTable.ts`

**Dependencies**: Task 0.4

**Implementation notes**:
- Actor table with: id, createdDate, updatedDate, version, type (enum), profileId, authorizationId
- Add indexes on type column
- Add FK constraints to profile and authorization_policy tables

**Acceptance**:
- [ ] Actor table created with correct schema
- [ ] FK constraints in place
- [ ] Index on type column exists
- [ ] Migration reversible

---

### Task 1.2: Migrate User Data to Actor

**Description**: Populate Actor table with User entity data.

**Files to create**:
- `src/migrations/TIMESTAMP-MigrateUserToActor.ts`

**Dependencies**: Task 1.1

**Implementation**:
```sql
INSERT INTO actor (id, "createdDate", "updatedDate", version, type, "profileId", "authorizationId")
SELECT u.id, u."createdDate", u."updatedDate", u.version, 'user', u."profileId", u."authorizationId"
FROM "user" u;
```

**Acceptance**:
- [ ] All User rows have corresponding Actor rows
- [ ] Actor.id = User.id for all users
- [ ] Actor.type = 'user' for all migrated users
- [ ] Profile and authorization references preserved

---

### Task 1.3: Migrate Organization Data to Actor

**Description**: Populate Actor table with Organization entity data.

**Files to create**:
- `src/migrations/TIMESTAMP-MigrateOrganizationToActor.ts`

**Dependencies**: Task 1.1

**Implementation**: Same pattern as Task 1.2 for organizations.

**Acceptance**:
- [ ] All Organization rows have corresponding Actor rows
- [ ] Actor.type = 'organization' for all

---

### Task 1.4: Migrate VirtualContributor Data to Actor

**Description**: Populate Actor table with VirtualContributor entity data.

**Files to create**:
- `src/migrations/TIMESTAMP-MigrateVirtualContributorToActor.ts`

**Dependencies**: Task 1.1

**Acceptance**:
- [ ] All VirtualContributor rows have corresponding Actor rows
- [ ] Actor.type = 'virtual-contributor' for all

---

### Task 1.5: Migrate Space Data to Actor

**Description**: Populate Actor table with Space entity data. Note: Space has no profile, so profileId will be null.

**Files to create**:
- `src/migrations/TIMESTAMP-MigrateSpaceToActor.ts`

**Dependencies**: Task 1.1

**Implementation notes**:
- Space uses SpaceAbout instead of Profile, so Actor.profileId = NULL

**Acceptance**:
- [ ] All Space rows have corresponding Actor rows
- [ ] Actor.type = 'space' for all
- [ ] Actor.profileId = NULL for all spaces

---

### Task 1.6: Migrate Account Data to Actor

**Description**: Populate Actor table with Account entity data. Note: Account has no profile.

**Files to create**:
- `src/migrations/TIMESTAMP-MigrateAccountToActor.ts`

**Dependencies**: Task 1.1

**Acceptance**:
- [ ] All Account rows have corresponding Actor rows
- [ ] Actor.type = 'account' for all
- [ ] Actor.profileId = NULL for all accounts

---

### Task 1.7: Update Credential FK from Agent to Actor

**Description**: Migrate credential.agentId to credential.actorId, mapping Agent IDs to Actor IDs.

**Files to create**:
- `src/migrations/TIMESTAMP-MigrateCredentialAgentToActor.ts`

**Dependencies**: Tasks 1.2-1.6

**Implementation notes**:
- For each entity type, map the old agentId to the new actorId (which equals entity ID)
- Requires lookup: JOIN entity table to get the mapping of entity.agentId → entity.id

```sql
-- Example for User credentials
UPDATE credential c
SET "actorId" = u.id
FROM "user" u
JOIN agent a ON u."agentId" = a.id
WHERE c."agentId" = a.id;
```

**Acceptance**:
- [ ] All credentials now have actorId set
- [ ] Credential count before = credential count after
- [ ] No orphaned credentials (all actorIds exist in actor table)

---

### Task 1.8: Update ConversationMembership FK

**Description**: Migrate conversation_membership.agentId to actorId.

**Files to create**:
- `src/migrations/TIMESTAMP-MigrateConversationMembershipToActor.ts`

**Dependencies**: Tasks 1.2-1.6

**Implementation**: Same mapping pattern as Task 1.7.

**Acceptance**:
- [ ] All conversation memberships have actorId set
- [ ] Membership count preserved

---

### Task 1.9: Consolidate InAppNotification Sparse Columns

**Description**: Migrate contributorUserID, contributorOrganizationID, contributorVcID to single contributorActorID.

**Files to create**:
- `src/migrations/TIMESTAMP-ConsolidateNotificationContributorColumns.ts`

**Dependencies**: Tasks 1.2-1.4

**Verification** (FR-022 compliance):
- Confirm sparse columns are mutually exclusive (research.md Section 3.3 analysis)
- Verify no row has more than one of the three columns populated
- Count non-null values before and after consolidation must match

**Implementation**:
```sql
-- Add new column
ALTER TABLE in_app_notification ADD COLUMN "contributorActorId" uuid;

-- Migrate data (only one of the three is ever set)
UPDATE in_app_notification
SET "contributorActorId" = COALESCE("contributorUserID", "contributorOrganizationID", "contributorVcID");

-- Add FK constraint
ALTER TABLE in_app_notification
ADD CONSTRAINT "FK_notification_contributor_actor"
FOREIGN KEY ("contributorActorId") REFERENCES actor(id) ON DELETE SET NULL;

-- Drop old columns
ALTER TABLE in_app_notification DROP COLUMN "contributorUserID";
ALTER TABLE in_app_notification DROP COLUMN "contributorOrganizationID";
ALTER TABLE in_app_notification DROP COLUMN "contributorVcID";
```

**Acceptance**:
- [ ] Single contributorActorId column exists
- [ ] All contributor references preserved
- [ ] Old sparse columns removed
- [ ] FK constraint to actor table

---

### Task 1.10: Remove contributorType from Invitation

**Description**: Drop the redundant contributorType column from Invitation table.

**Files to create**:
- `src/migrations/TIMESTAMP-RemoveInvitationContributorType.ts`

**Dependencies**: Tasks 1.2-1.4

**Implementation**:
```sql
ALTER TABLE invitation DROP COLUMN "contributorType";
```

**Acceptance**:
- [ ] Column dropped
- [ ] No code references contributorType on Invitation

---

### Task 1.11: Strip contributorType from JSON Payloads

**Description**: Remove contributorType field from existing InAppNotification JSON payloads.

**Files to create**:
- `src/migrations/TIMESTAMP-StripContributorTypeFromPayloads.ts`

**Dependencies**: Task 1.9

**Implementation**:
```sql
UPDATE in_app_notification
SET payload = payload - 'contributorType'
WHERE payload ? 'contributorType';
```

**Acceptance**:
- [ ] No payloads contain contributorType field
- [ ] Other payload fields preserved

---

### Task 1.12: Remove Agent Columns from Entity Tables

**Description**: Drop agentId foreign key columns from User, Organization, VirtualContributor, Space, Account tables.

**Files to create**:
- `src/migrations/TIMESTAMP-RemoveAgentColumnsFromEntities.ts`

**Dependencies**: Tasks 1.7, 1.8

**Implementation notes**:
- Drop FK constraints first, then columns
- This is the point of no return for Agent

**Acceptance**:
- [ ] No entity tables have agentId columns
- [ ] All FK constraints to agent table removed

---

### Task 1.13: Drop Agent Table

**Description**: Remove the Agent table entirely.

**Files to create**:
- `src/migrations/TIMESTAMP-DropAgentTable.ts`

**Dependencies**: Task 1.12

**Implementation**:
```sql
DROP TABLE agent;
```

**Acceptance**:
- [ ] Agent table no longer exists
- [ ] No orphaned references

---

### Task 1.14: Migration Validation Script

**Description**: Create validation script to verify migration integrity.

**Files to create**:
- `scripts/migrations/validate-actor-migration.ts`

**Dependencies**: All migration tasks

**Implementation notes**:
- Count actors vs sum of (users + orgs + vcs + spaces + accounts)
- Count credentials before/after
- Verify no orphaned credentials (all actorIds exist in actor table)
- Verify referential integrity for createdBy/issuer columns: non-NULL values must reference valid actors; NULL values are acceptable (creator unknown or deleted)
- Report any invalid references (non-NULL pointing to non-existent actors)

**Acceptance**:
- [ ] Script runs without errors on migrated database
- [ ] Actor count = User + Organization + VirtualContributor + Space + Account counts
- [ ] Credential count unchanged
- [ ] Zero orphaned credentials
- [ ] Zero invalid FK references (non-NULL pointing to missing actors)

---

## Phase 2: User Story 1 - Unified Credential Management ✅ Complete (P1)

**Rationale**: Core value proposition - simplify credential operations to use Actor directly.

### Task 2.1: Move Credential Entity to Actor Domain

**Description**: Relocate Credential entity and update imports.

**Files to move**:
- `src/domain/agent/credential/` → `src/domain/actor/credential/`

**Dependencies**: Phase 1 complete

**Implementation notes**:
- Update all imports across codebase
- Keep Credential entity structure temporarily for migration compatibility

**Acceptance**:
- [ ] Credential files in new location
- [ ] All imports updated
- [ ] Build passes

---

### Task 2.2: Update Credential Entity Relationship

**Description**: Change Credential.agent relationship to Credential.actor.

**Files to modify**:
- `src/domain/actor/credential/credential.entity.ts`

**Dependencies**: Task 2.1

**Implementation**:
```typescript
// Before
@ManyToOne(() => Agent, agent => agent.credentials)
agent?: Agent;

// After
@ManyToOne(() => Actor, actor => actor.credentials)
actor?: Actor;

@Column('uuid', { nullable: true })
actorId?: string;
```

**Acceptance**:
- [ ] Credential references Actor instead of Agent
- [ ] actorId column defined
- [ ] Build passes

---

### Task 2.3: Implement ActorService Credential Methods

**Description**: Add credential management methods to ActorService.

**Files to modify**:
- `src/domain/actor/actor/actor.service.ts`

**Methods to implement**:
- `grantCredentialOrFail(actorId, credentialData): Promise<Credential>`
- `revokeCredential(actorId, credentialData): Promise<boolean>`
- `hasValidCredential(actorId, criteria): Promise<boolean>`
- `findActorsWithMatchingCredentials(criteria): Promise<Actor[]>`

**Dependencies**: Task 2.2

**Implementation notes**:
- Port logic from AgentService
- Update queries to use Actor instead of Agent

**Acceptance**:
- [ ] All 4 methods implemented
- [ ] Unit tests pass
- [ ] Methods use actorId directly (no agent lookup)

---

### Task 2.4: Update CredentialService Queries

**Description**: Update CredentialService to query via Actor instead of Agent.

**Files to modify**:
- `src/domain/actor/credential/credential.service.ts`

**Dependencies**: Task 2.2

**Implementation notes**:
- Change `leftJoinAndSelect('credential.agent', 'agent')` to `leftJoinAndSelect('credential.actor', 'actor')`
- Update all query builders

**Acceptance**:
- [ ] All queries use Actor relationship
- [ ] findMatchingCredentials works correctly
- [ ] Unit tests pass

---

### Task 2.5: Update Authorization Checks

**Description**: Update authorization service to use Actor instead of Agent for credential checks.

**Files to modify**:
- `src/core/authorization/authorization.service.ts`
- Related authorization modules

**Dependencies**: Task 2.3

**Implementation notes**:
- Replace `agent.id` references with `actor.id` (which equals entity.id)
- Simplify lookups since entity.id = actor.id

**Acceptance**:
- [ ] Authorization checks use actorId
- [ ] No references to agentId in authorization code
- [ ] All authorization tests pass

---

## Phase 3: User Story 3 - Profile Association on Actor ✅ Complete (P2)

**Rationale**: Profile moves to Actor, enabling consistent access pattern.

### Task 3.1: Update User Entity to Extend Actor

**Description**: Change User to extend Actor instead of ContributorBase.

**Files to modify**:
- `src/domain/community/user/user.entity.ts`

**Dependencies**: Phase 2 complete

**Implementation**:
```typescript
@ChildEntity(ActorType.USER)
export class User extends Actor implements IUser {
  // Move nameID here from NameableEntity
  @Column('varchar', { length: NAMEID_MAX_LENGTH_SCHEMA, nullable: false, unique: true })
  nameID!: string;

  // Remove agent relationship
  // Profile now inherited from Actor
}
```

**Acceptance**:
- [ ] User extends Actor with @ChildEntity decorator
- [ ] nameID defined on User directly
- [ ] No agent relationship
- [ ] Profile accessible via Actor inheritance
- [ ] Build passes

---

### Task 3.2: Update Organization Entity to Extend Actor

**Description**: Change Organization to extend Actor instead of ContributorBase.

**Files to modify**:
- `src/domain/community/organization/organization.entity.ts`

**Dependencies**: Phase 2 complete

**Implementation**: Same pattern as Task 3.1.

**Acceptance**:
- [ ] Organization extends Actor
- [ ] No agent relationship
- [ ] Build passes

---

### Task 3.3: Update VirtualContributor Entity to Extend Actor

**Description**: Change VirtualContributor to extend Actor.

**Files to modify**:
- `src/domain/community/virtual-contributor/virtual.contributor.entity.ts`

**Dependencies**: Phase 2 complete

**Implementation**: Same pattern as Task 3.1.

**Acceptance**:
- [ ] VirtualContributor extends Actor
- [ ] Account relationship preserved (specific FK, not Actor FK)
- [ ] Build passes

---

### Task 3.4: Update Space Entity to Extend Actor

**Description**: Change Space to extend Actor. Note: profile will be null.

**Files to modify**:
- `src/domain/space/space/space.entity.ts`

**Dependencies**: Phase 2 complete

**Implementation notes**:
- Space uses SpaceAbout instead of Profile
- Actor.profileId will be null for Space entities

**Acceptance**:
- [ ] Space extends Actor
- [ ] SpaceAbout relationship preserved
- [ ] No agent relationship
- [ ] Build passes

---

### Task 3.5: Update Account Entity to Extend Actor

**Description**: Change Account to extend Actor. Note: profile will be null.

**Files to modify**:
- `src/domain/space/account/account.entity.ts`

**Dependencies**: Phase 2 complete

**Acceptance**:
- [ ] Account extends Actor
- [ ] No agent relationship
- [ ] Build passes

---

### Task 3.6: Remove ContributorBase Entity

**Description**: Delete the ContributorBase abstract class.

**Files to delete**:
- `src/domain/community/contributor/contributor.base.entity.ts`
- Related files in contributor directory

**Dependencies**: Tasks 3.1-3.3

**Acceptance**:
- [ ] ContributorBase class deleted
- [ ] No imports reference ContributorBase
- [ ] Build passes

---

## Phase 4: User Story 4 - Unified Actor Operations ✅ Complete (P3)

**Rationale**: Reduce code duplication in entity services.

### Task 4.1: Simplify UserService Creation Flow

**Description**: Remove agent creation from UserService.

**Files to modify**:
- `src/domain/community/user/user.service.ts`

**Dependencies**: Tasks 3.1

**Implementation notes**:
- Remove `agentService.createAgent()` call
- User IS the Actor now, no separate entity creation
- Update communication adapter to use `user.id` instead of `user.agent.id`

**Acceptance**:
- [ ] No agentService calls in UserService
- [ ] User creation simplified
- [ ] Communication adapter uses user.id

---

### Task 4.2: Simplify OrganizationService Creation Flow

**Description**: Remove agent creation from OrganizationService.

**Files to modify**:
- `src/domain/community/organization/organization.service.ts`

**Dependencies**: Task 3.2

**Acceptance**:
- [ ] No agentService calls
- [ ] Organization creation simplified

---

### Task 4.3: Simplify VirtualContributorService Creation Flow

**Description**: Remove agent creation from VirtualContributorService.

**Files to modify**:
- `src/domain/community/virtual-contributor/virtual.contributor.service.ts`

**Dependencies**: Task 3.3

**Acceptance**:
- [ ] No agentService calls
- [ ] VirtualContributor creation simplified

---

### Task 4.4: Simplify SpaceService Creation Flow

**Description**: Remove agent creation from SpaceService.

**Files to modify**:
- `src/domain/space/space/space.service.ts`

**Dependencies**: Task 3.4

**Acceptance**:
- [ ] No agentService calls
- [ ] Space creation simplified

---

### Task 4.5: Simplify AccountService Creation Flow

**Description**: Remove agent creation from AccountService.

**Files to modify**:
- `src/domain/space/account/account.host.service.ts`

**Dependencies**: Task 3.5

**Acceptance**:
- [ ] No agentService calls
- [ ] Account creation simplified

---

### Task 4.6: Update ContributorLoaderCreator

**Description**: Simplify contributor loading to query Actor table directly.

**Files to modify**:
- `src/core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator.ts`

**Dependencies**: Phase 3 complete

**Implementation notes**:
- Replace separate User/Org/VC queries with single Actor query
- Type resolution via Actor.type field

**Acceptance**:
- [ ] Single Actor query replaces 3 separate queries
- [ ] Type resolution works correctly

---

### Task 4.7: Update InAppNotification Entity

**Description**: Replace sparse contributor columns with single contributorActorId.

**Files to modify**:
- `src/platform/in-app-notification/in.app.notification.entity.ts`

**Dependencies**: Task 1.9 (migration), Phase 3

**Implementation**:
```typescript
// Remove these
contributorUserID?: string;
contributorOrganizationID?: string;
contributorVcID?: string;

// Add this
@ManyToOne(() => Actor, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'contributorActorId' })
contributorActor?: Actor;

@Column('uuid', { nullable: true })
contributorActorId?: string;
```

**Acceptance**:
- [ ] Single contributorActorId replaces 3 columns
- [ ] FK relationship defined
- [ ] Build passes

---

### Task 4.8: Update InAppNotificationService

**Description**: Update service to use contributorActorId and remove contributorType from payloads.

**Files to modify**:
- `src/platform/in-app-notification/in.app.notification.service.ts`
- Related payload types

**Dependencies**: Task 4.7

**Implementation notes**:
- Update `extractCoreEntityIds()` to use contributorActorId
- Remove contributorType from payload creation
- Resolve type from Actor.type when needed

**Acceptance**:
- [ ] Service uses contributorActorId
- [ ] No contributorType in new payloads
- [ ] Tests pass

---

### Task 4.9: Update Invitation Entity

**Description**: Remove contributorType column, use Actor.type instead.

**Files to modify**:
- `src/domain/access/invitation/invitation.entity.ts`

**Dependencies**: Task 1.10 (migration)

**Ordering note**: This task modifies `invitation.entity.ts`. Task 6.9 also modifies this file to add createdBy FK. Complete Task 4.9 first (removes contributorType), then Task 6.9 (adds FK constraints). Both changes are independent but should be done in sequence to avoid merge conflicts.

**Implementation**:
- Remove contributorType column definition
- Update invitedContributorID to be FK to Actor

**Acceptance**:
- [ ] No contributorType column
- [ ] invitedContributorID has FK to Actor
- [ ] Build passes

---

### Task 4.10: Update InvitationService

**Description**: Update service to resolve contributor type from Actor.

**Files to modify**:
- `src/domain/access/invitation/invitation.service.ts`

**Dependencies**: Task 4.9

**Implementation notes**:
- Replace `invitation.contributorType` checks with Actor.type lookups
- Join Actor when querying invitations

**Acceptance**:
- [ ] No references to contributorType
- [ ] Type resolution via Actor works

---

## Phase 5: User Story 2 - Actor-Based GraphQL Queries ✅ Complete (P2)

**Rationale**: Expose Actor in GraphQL for polymorphic queries.

**Parallelization note**: Tasks 5.1 and 5.2 only depend on Task 0.1 (ActorType enum). They can run in parallel with Phase 2-4 work to reduce overall implementation time.

### Task 5.1: Add ActorType GraphQL Enum [P]

**Description**: Register ActorType enum in GraphQL schema.

**Files to modify**:
- `src/domain/actor/actor/actor.type.enum.ts` (GraphQL registration)

**Dependencies**: Task 0.1 (can run in parallel with Phase 2-4)

**Implementation**:
```typescript
registerEnumType(ActorType, {
  name: 'ActorType',
  description: 'The type of Actor',
});
```

**Acceptance**:
- [ ] ActorType appears in generated schema
- [ ] Schema generation passes

---

### Task 5.2: Create IActor GraphQL Interface [P]

**Description**: Define IActor interface type for GraphQL.

**Files to create**:
- `src/domain/actor/actor/actor.interface.graphql.ts`

**Dependencies**: Task 5.1 (can run in parallel with Phase 2-4)

**Implementation notes**:
- Interface with id, type, credentials, authorization, profile (nullable)
- Use @InterfaceType decorator

**Acceptance**:
- [ ] IActor interface in schema
- [ ] All required fields defined

---

### Task 5.3: Update User GraphQL Type

**Description**: Add IActor implementation to User GraphQL type.

**Files to modify**:
- `src/domain/community/user/user.resolver.fields.ts`

**Dependencies**: Task 5.2

**Implementation notes**:
- Add `implements IActor`
- Add `type` field resolver returning ActorType.USER
- Ensure credentials field resolver exists

**Acceptance**:
- [ ] User implements IActor in schema
- [ ] type field returns USER
- [ ] credentials field works

---

### Task 5.4: Update Organization GraphQL Type

**Description**: Add IActor implementation to Organization.

**Files to modify**:
- `src/domain/community/organization/organization.resolver.fields.ts`

**Dependencies**: Task 5.2

**Acceptance**:
- [ ] Organization implements IActor
- [ ] type field returns ORGANIZATION

---

### Task 5.5: Update VirtualContributor GraphQL Type

**Description**: Add IActor implementation to VirtualContributor.

**Files to modify**:
- `src/domain/community/virtual-contributor/virtual.contributor.resolver.fields.ts`

**Dependencies**: Task 5.2

**Acceptance**:
- [ ] VirtualContributor implements IActor
- [ ] type field returns VIRTUAL_CONTRIBUTOR

---

### Task 5.6: Update Space GraphQL Type

**Description**: Add IActor implementation to Space.

**Files to modify**:
- `src/domain/space/space/space.resolver.fields.ts`

**Dependencies**: Task 5.2

**Acceptance**:
- [ ] Space implements IActor
- [ ] type field returns SPACE
- [ ] profile field returns null

---

### Task 5.7: Update Account GraphQL Type

**Description**: Add IActor implementation to Account.

**Files to modify**:
- `src/domain/space/account/account.resolver.fields.ts`

**Dependencies**: Task 5.2

**Acceptance**:
- [ ] Account implements IActor
- [ ] type field returns ACCOUNT
- [ ] profile field returns null

---

### Task 5.8: Create Actor Resolver

**Description**: Create resolver for actor queries.

**Files to create**:
- `src/domain/actor/actor/actor.resolver.queries.ts`

**Dependencies**: Tasks 5.3-5.7

**Implementation**:
```typescript
@Resolver()
export class ActorResolverQueries {
  @Query(() => IActor, { nullable: true })
  async actor(@Args('id') id: string): Promise<IActor | null> {
    return this.actorService.getActorOrNull(id);
  }

  @Query(() => [IActor])
  async actorsWithCredential(
    @Args('credentialType') type: CredentialType,
    @Args('resourceID', { nullable: true }) resourceID?: string
  ): Promise<IActor[]> {
    return this.actorService.findActorsWithMatchingCredentials({ type, resourceID });
  }
}
```

**Acceptance**:
- [ ] actor(id) query works
- [ ] actorsWithCredential query works
- [ ] Correct type resolution for all 5 actor types

---

### Task 5.9: Create Actor Mutations

**Description**: Add mutations for credential grant/revoke on actors.

**Files to create**:
- `src/domain/actor/actor/actor.resolver.mutations.ts`

**Dependencies**: Task 2.3, Task 5.8

**Implementation notes**:
- grantCredentialToActor mutation
- revokeCredentialFromActor mutation
- Proper authorization checks

**Acceptance**:
- [ ] grantCredentialToActor works
- [ ] revokeCredentialFromActor works
- [ ] Authorization enforced

---

### Task 5.10: Regenerate and Validate Schema

**Description**: Regenerate GraphQL schema and validate changes.

**Commands**:
```bash
pnpm run schema:print
pnpm run schema:sort
pnpm run schema:diff
```

**Dependencies**: Tasks 5.1-5.9

**Acceptance**:
- [ ] Schema generates without errors
- [ ] IActor interface present
- [ ] All 5 types implement IActor
- [ ] actor and actorsWithCredential queries present
- [ ] Mutations present
- [ ] No unexpected breaking changes

---

## Phase 6: Add FK Constraints to Actor Reference Columns ✅ Partial (P2)
<!-- NOTE: FK for invitation.invitedActorId added (migration 1771000019000). Other createdBy/issuer/triggeredBy FKs listed below were intentionally deferred - adding FK constraints to all reference columns was assessed as too high risk for this transformation. See SC-009 in spec.md. -->

**Rationale**: Enable referential integrity for all createdBy/issuer columns.

### Task 6.1: Add Actor FK to Callout

**Description**: Add FK constraint for createdBy and publishedBy columns.

**Files to modify**:
- `src/domain/collaboration/callout/callout.entity.ts`
- Migration file

**Dependencies**: Phase 1 complete

**Implementation**:
```typescript
@ManyToOne(() => Actor, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'createdBy' })
createdByActor?: Actor;
```

**Acceptance**:
- [ ] FK constraint added
- [ ] Existing data valid
- [ ] Build passes

---

### Task 6.2: Add Actor FK to Post

**Description**: Add FK constraint for createdBy column.

**Files to modify**:
- `src/domain/collaboration/post/post.entity.ts`
- Migration file

**Dependencies**: Phase 1 complete

**Acceptance**:
- [ ] FK constraint added
- [ ] Build passes

---

### Task 6.3: Add Actor FK to CalloutContribution

**Description**: Add FK constraint for createdBy column.

**Files to modify**:
- `src/domain/collaboration/callout-contribution/callout.contribution.entity.ts`
- Migration file

**Dependencies**: Phase 1 complete

**Acceptance**:
- [ ] FK constraint added

---

### Task 6.4: Add Actor FK to Document

**Description**: Add FK constraint for createdBy column. Note: This resolves the commented-out circular dependency issue.

**Files to modify**:
- `src/domain/storage/document/document.entity.ts`
- Migration file

**Dependencies**: Phase 1 complete

**Acceptance**:
- [ ] FK constraint added
- [ ] Circular dependency resolved

---

### Task 6.5: Add Actor FK to Whiteboard

**Description**: Add FK constraint for createdBy column.

**Files to modify**:
- `src/domain/common/whiteboard/whiteboard.entity.ts`
- Migration file

**Dependencies**: Phase 1 complete

**Acceptance**:
- [ ] FK constraint added

---

### Task 6.6: Add Actor FK to Memo

**Description**: Add FK constraint for createdBy column.

**Files to modify**:
- `src/domain/memo/memo.entity.ts`
- Migration file

**Dependencies**: Phase 1 complete

**Acceptance**:
- [ ] FK constraint added

---

### Task 6.7: Add Actor FK to CalendarEvent

**Description**: Add FK constraint for createdBy column. Note: This resolves the commented-out circular dependency issue.

**Files to modify**:
- `src/domain/timeline/calendar/calendar.event.entity.ts`
- Migration file

**Dependencies**: Phase 1 complete

**Acceptance**:
- [ ] FK constraint added
- [ ] Circular dependency resolved

---

### Task 6.8: Add Actor FK to Credential Issuer

**Description**: Add FK constraint for issuer column.

**Files to modify**:
- `src/domain/actor/credential/credential.entity.ts`
- Migration file

**Dependencies**: Task 2.2

**Implementation**:
```typescript
@ManyToOne(() => Actor, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'issuer' })
issuerActor?: Actor;
```

**Acceptance**:
- [ ] FK constraint added
- [ ] issuer column has proper FK

---

### Task 6.9: Add Actor FK to Invitation

**Description**: Add FK constraints for createdBy and invitedContributorID columns.

**Files to modify**:
- `src/domain/access/invitation/invitation.entity.ts`
- Migration file

**Dependencies**: Task 4.9 (must complete first - see ordering note in Task 4.9)

**Acceptance**:
- [ ] Both FK constraints added
- [ ] invitedContributorID references Actor
- [ ] createdBy references Actor

---

### Task 6.10: Add Actor FK to PlatformInvitation

**Description**: Add FK constraint for createdBy column.

**Files to modify**:
- `src/platform/platform-invitation/platform.invitation.entity.ts`
- Migration file

**Dependencies**: Phase 1 complete

**Acceptance**:
- [ ] FK constraint added

---

### Task 6.11: Add Actor FK to Discussion

**Description**: Add FK constraint for createdBy column.

**Files to modify**:
- `src/domain/communication/discussion/discussion.entity.ts`
- Migration file

**Dependencies**: Phase 1 complete

**Acceptance**:
- [ ] FK constraint added

---

### Task 6.12: Add Actor FK to Activity

**Description**: Add FK constraint for triggeredBy column.

**Files to modify**:
- `src/platform/activity/activity.entity.ts`
- Migration file

**Dependencies**: Phase 1 complete

**Acceptance**:
- [ ] FK constraint added

---

### Task 6.13: Add Actor FK to InAppNotification triggeredBy

**Description**: Add FK constraint for triggeredByID column.

**Files to modify**:
- `src/platform/in-app-notification/in.app.notification.entity.ts`
- Migration file

**Dependencies**: Phase 1 complete

**Acceptance**:
- [ ] FK constraint added

---

## Phase 7: Cleanup ✅ Complete (P3)

**Rationale**: Remove deprecated code after all functionality is migrated.

### Task 7.1: Delete Agent Entity and Module

**Description**: Remove all Agent-related code.

**Files to delete**:
- `src/domain/agent/agent/agent.entity.ts`
- `src/domain/agent/agent/agent.service.ts`
- `src/domain/agent/agent/agent.module.ts`
- `src/domain/agent/agent/agent.interface.ts`
- Related resolver files

**Dependencies**: All previous phases complete

**Acceptance**:
- [ ] No agent entity files
- [ ] No imports of Agent
- [ ] Build passes

---

### Task 7.2: Remove IContributor Interface

**Description**: Delete IContributor interface from codebase.

**Files to modify**:
- `src/domain/community/contributor/contributor.interface.ts`
- All files importing IContributor

**Dependencies**: Phase 5 complete

**Acceptance**:
- [ ] IContributor removed
- [ ] All references updated to IActor
- [ ] Build passes

---

### Task 7.3: Remove agent Field from GraphQL Schema

**Description**: Remove deprecated agent fields from User, Organization, VirtualContributor, Space, Account types.

**Files to modify**:
- Relevant resolver files

**Dependencies**: Task 7.1

**Acceptance**:
- [ ] No agent fields in schema
- [ ] Schema regenerates cleanly

---

### Task 7.4: Update All Tests

**Description**: Update test files to use Actor instead of Agent.

**Files to modify**:
- All test files referencing Agent

**Dependencies**: All previous phases

**Acceptance**:
- [ ] All tests pass
- [ ] No agent references in tests
- [ ] Coverage maintained

---

### Task 7.5: Update Documentation

**Description**: Update relevant documentation to reflect Actor model.

**Files to modify**:
- `docs/credential-based-authorization.md`
- `docs/Design.md`
- Other relevant docs

**Dependencies**: All previous phases

**Acceptance**:
- [ ] Documentation reflects Actor model
- [ ] No references to Agent pattern

---

### Task 7.6: Verify Code Reduction (SC-002)

**Description**: Measure and document the code reduction achieved by Actor transformation.

**Dependencies**: All previous phases

**Implementation**:
```bash
# Compare line counts before/after for affected services
# Focus on: UserService, OrganizationService, VirtualContributorService, SpaceService, AccountService
# Count removed: agentService calls, agent joins, agent relationship handling
git diff develop --stat -- src/domain/community src/domain/space src/domain/agent
```

**Acceptance**:
- [ ] Document total lines removed vs added
- [ ] Verify net reduction ≥ 300 lines (per SC-002)
- [ ] If target not met, document reason and actual reduction achieved

---

## Verification Checklist

After all phases complete, verify:

- [ ] All credential operations use actorId (not agentId)
- [ ] GraphQL `actor(id)` query returns correct type
- [ ] `actorsWithCredential` query works across all actor types
- [ ] Profile is null for Space and Account actors
- [ ] All createdBy/issuer columns have FK constraints to Actor
- [ ] Agent table is dropped
- [ ] No test failures
- [ ] Schema diff shows only expected additions
- [ ] Migration validation passes on production-equivalent dataset
- [ ] Communication adapter sync works with actor.id
- [ ] Code reduction ≥ 300 lines verified (SC-002, Task 7.6)

---

## Risk Mitigation

1. **Backup Strategy**: Take full database backup before migration
2. **Rollback Plan**: Keep migration reversion scripts ready
3. **Validation**: Run migration validation script before and after
4. **Staging Test**: Run full migration on staging environment first
5. **Monitoring**: Watch for authorization errors post-deployment
