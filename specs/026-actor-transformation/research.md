# Research: Actor Transformation

**Feature**: 026-actor-transformation
**Date**: 2025-12-27
**Status**: Phase 0 Complete

## Executive Summary

This research documents the current state of the Agent-based credential system and maps the path to Actor-based architecture. The transformation will unify 5 credential-holding entity types (User, Organization, VirtualContributor, Space, Account) under a single Actor abstraction, eliminating the Agent indirection layer and enabling proper FK constraints for actor references throughout the codebase.

---

## 1. Current Architecture Analysis

### 1.1 Entity Inheritance Hierarchy

```
BaseAlkemioEntity (Abstract)
├── id: UUID (PK)
├── createdDate: TIMESTAMP
├── updatedDate: TIMESTAMP
├── version: INTEGER

AuthorizableEntity extends BaseAlkemioEntity (Abstract)
├── authorization: OneToOne(AuthorizationPolicy, CASCADE)

NameableEntity extends AuthorizableEntity (Abstract)
├── nameID: VARCHAR(36, UNIQUE)
├── profile: OneToOne(Profile, CASCADE, SET NULL)

ContributorBase extends NameableEntity (Abstract)
├── agent: OneToOne(Agent, CASCADE, SET NULL)
    ├── User
    ├── Organization
    └── VirtualContributor
```

### 1.2 Agent Entity Structure

**Location**: `src/domain/agent/agent/agent.entity.ts`

```typescript
@Entity()
export class Agent extends AuthorizableEntity implements IAgent {
  @OneToMany(() => Credential, credential => credential.agent, {
    eager: true,
    cascade: true,
  })
  credentials?: Credential[];

  @Column('varchar', { length: ENUM_LENGTH, nullable: true })
  type!: AgentType;
}
```

**Database Schema**:
```sql
CREATE TABLE "agent" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
  "version" integer NOT NULL,
  "type" character varying(128),
  "authorizationId" uuid,
  CONSTRAINT "PK_1000e989398c5d4ed585cf9a46f" PRIMARY KEY ("id"),
  CONSTRAINT "REL_8ed9d1af584fa62f1ad3405b33" UNIQUE ("authorizationId")
);
```

### 1.3 Credential Entity Structure

**Location**: `src/domain/agent/credential/credential.entity.ts`

```typescript
@Entity()
export class Credential extends BaseAlkemioEntity implements ICredential {
  @Column('varchar', { length: UUID_LENGTH, nullable: false })
  resourceID!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: string;

  @ManyToOne(() => Agent, agent => agent.credentials, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  agent?: Agent;

  @Column('uuid', { nullable: true })
  issuer!: string;

  @Column({ type: 'timestamp', nullable: true })
  expires?: Date;
}
```

---

## 2. Credential-Holding Entity Types

### 2.1 ContributorBase Entities (with Profile)

| Entity | File | Has Agent | Has Profile | Additional Fields |
|--------|------|-----------|-------------|-------------------|
| **User** | `src/domain/community/user/user.entity.ts` | ✅ OneToOne | ✅ via NameableEntity | accountID, firstName, lastName, email, phone, authenticationID, settings, storageAggregator |
| **Organization** | `src/domain/community/organization/organization.entity.ts` | ✅ OneToOne | ✅ via NameableEntity | accountID, legalEntityName, domain, website, contactEmail, verification, roleSet |
| **VirtualContributor** | `src/domain/community/virtual-contributor/virtual.contributor.entity.ts` | ✅ OneToOne | ✅ via NameableEntity | account (FK), aiPersonaID, knowledgeBase, searchVisibility, dataAccessMode |

### 2.2 Non-ContributorBase Entities (no Profile)

| Entity | File | Has Agent | Has Profile | Purpose |
|--------|------|-----------|-------------|---------|
| **Space** | `src/domain/space/space/space.entity.ts` | ✅ OneToOne | ❌ (uses SpaceAbout) | License credentials |
| **Account** | `src/domain/space/account/account.entity.ts` | ✅ OneToOne | ❌ | License credentials, subscription management |

---

## 3. Actor Reference Columns Inventory

### 3.1 Generic Actor References (should become FK to Actor)

| Entity | Column | Current FK | Status |
|--------|--------|------------|--------|
| Callout | `createdBy` | None | Plain UUID |
| Callout | `publishedBy` | None | Plain UUID |
| Post | `createdBy` | None | Plain UUID |
| CalloutContribution | `createdBy` | None | Plain UUID |
| Document | `createdBy` | **Commented out** | Circular dependency issue |
| Whiteboard | `createdBy` | None | Plain UUID |
| Memo | `createdBy` | None | Plain UUID |
| CalendarEvent | `createdBy` | **Commented out** | Circular dependency issue |
| Credential | `issuer` | None | Plain UUID |
| Invitation | `createdBy` | None | Plain UUID |
| Invitation | `invitedContributorID` | None | Plain UUID (generic contributor) |
| PlatformInvitation | `createdBy` | None | Plain UUID |
| Discussion | `createdBy` | None | Plain UUID |
| Activity | `triggeredBy` | None | Plain UUID |
| InAppNotification | `triggeredByID` | None | Plain UUID |
| ConversationMembership | `agentId` | **FK to Agent** | Will become actorId |

### 3.2 Specific Entity References (remain as-is)

| Entity | Column | Current FK | Reason |
|--------|--------|------------|--------|
| Space | `accountId` | Account | Specific relationship |
| VirtualContributor | `account` | Account | Specific relationship |
| User | `accountID` | Account | Specific relationship |
| Organization | `accountID` | Account | Specific relationship |
| InnovationPack | `accountId` | Account | Specific relationship |
| InnovationHub | `accountId` | Account | Specific relationship |

### 3.3 Notification Table Analysis

**InAppNotification** (`src/platform/in-app-notification/in.app.notification.entity.ts`):

| Column | Current State | Classification |
|--------|---------------|----------------|
| `triggeredByID` | No FK constraint | Generic actor → **Add Actor FK** |
| `receiverID` | FK to User only | **Review needed** - should it be generic Actor? |
| `contributorUserID` | FK to User | **Consolidate** → single `contributorActorID` |
| `contributorOrganizationID` | FK to Organization | **Consolidate** → single `contributorActorID` |
| `contributorVcID` | FK to VirtualContributor | **Consolidate** → single `contributorActorID` |

**Finding**: `contributorUserID`, `contributorOrganizationID`, `contributorVcID` are **mutually exclusive sparse columns**. Analysis of `extractCoreEntityIds()` in `in.app.notification.service.ts` confirms only one is ever set at a time, based on `RoleSetContributorType` discriminator. These can be consolidated into a single `contributorActorID` FK to Actor table.

---

## 4. Services Analysis

### 4.1 AgentService Methods

**Location**: `src/domain/agent/agent/agent.service.ts`

| Method | Purpose | Migration Impact |
|--------|---------|------------------|
| `createAgent(inputData)` | Creates agent with empty credentials | Replace with Actor creation |
| `getAgentOrFail(agentID)` | Retrieves agent by ID | Replace with getActorOrFail |
| `deleteAgent(agentID)` | Cascades deletion | Replace with Actor deletion |
| `findAgentsWithMatchingCredentials(criteria)` | Query agents by credential | Move to ActorService |
| `grantCredentialOrFail(data)` | Adds credential | Move to ActorService |
| `revokeCredential(data)` | Removes credential | Move to ActorService |
| `hasValidCredential(agentID, criteria)` | Checks credential | Move to ActorService |

### 4.2 CredentialService Methods

**Location**: `src/domain/agent/credential/credential.service.ts`

| Method | Purpose | Migration Impact |
|--------|---------|------------------|
| `createCredential(input)` | Creates credential | Update FK reference |
| `findMatchingCredentials(criteria)` | Query with agent join | Update to Actor join |
| `countMatchingCredentials(criteria)` | Counts credentials | Update to Actor join |

---

## 5. ContributorLoaderCreator Pattern

**Location**: `src/core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator.ts`

Current pattern for resolving generic contributor IDs:
1. Query User table by ID
2. If not found, query Organization table by ID
3. If not found, query VirtualContributor table by ID
4. Return matching contributor or null

**After Actor transformation**: Single query to Actor table with type resolution.

---

## 6. Key Findings

### 6.1 ID Uniqueness Confirmed
Each of the 5 credential-holding entity types uses UUID PKs. No collisions exist between User.id, Organization.id, etc., enabling Actor.id = Entity.id.

### 6.2 Circular Dependency Issues
Document.createdBy and CalendarEvent.createdBy have commented-out FK definitions due to circular dependency problems. Actor table provides a solution.

### 6.3 Profile Association Pattern
- User/Organization/VirtualContributor have profiles via NameableEntity
- Space uses SpaceAbout (separate pattern)
- Account has no profile-like entity

Actor.profile_id (nullable) cleanly handles this: non-null for User/Org/VC, null for Space/Account.

### 6.4 Authorization Policy Inheritance
Agent.authorizationId exists; Actor will inherit this pattern. Each Actor has its own AuthorizationPolicy for credential-specific permissions.

---

## 7. Migration Complexity Assessment

### 7.1 High Impact Changes
1. Create Actor table with Class Table Inheritance pattern
2. Migrate all Agent data to Actor (preserving entity IDs as actor IDs)
3. Update Credential.agentId → Credential.actorId
4. Update ConversationMembership.agentId → actorId
5. Remove agent_id columns from User, Organization, VirtualContributor, Space, Account
6. Drop Agent table

### 7.2 Medium Impact Changes
1. Add FK constraints to all `createdBy`/`issuer`/`triggeredBy` columns
2. Update ContributorLoaderCreator to use Actor queries
3. Update GraphQL resolvers for actor field resolution

### 7.3 Low Impact Changes
1. Remove IContributor interface
2. Remove ContributorBase entity class
3. Update authorization checks from Agent to Actor

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration data loss | Low | High | Transaction-wrapped migration with validation |
| FK constraint failures | Medium | Medium | Pre-migration data validation script |
| Service disruption | Low | High | Single-instance deployment (no phased rollout needed) |
| Authorization regression | Medium | High | Comprehensive test coverage before migration |

---

## 9. Entity Creation Flow Analysis

### 9.1 Current Flow (User Creation Example)

```typescript
// user.service.ts - Current pattern
async createUser(userData, actorContext): Promise<IUser> {
  // 1. Create User entity
  let user = User.create({ ...userData });
  user.authorization = new AuthorizationPolicy(AuthorizationPolicyType.USER);

  // 2. Create Profile
  user.profile = await this.profileService.createProfile(...);

  // 3. Create Agent (SEPARATE entity with its own ID)
  user.agent = await this.agentService.createAgent({
    type: AgentType.USER,
  });

  // 4. Save User (cascades Agent)
  user = await this.save(user);

  // 5. Sync to communication adapter using AGENT ID
  await this.communicationAdapter.syncActor(user.agent.id, displayName);
}
```

**Same pattern repeated in 5 services:**
- `user.service.ts:156`
- `organization.service.ts:150`
- `virtual.contributor.service.ts:176`
- `space.service.ts:221`
- `account.host.service.ts:50`

### 9.2 New Flow with Actor (User extends Actor)

```typescript
// user.service.ts - New pattern with Actor
async createUser(userData, actorContext): Promise<IUser> {
  // 1. Create User entity (which IS an Actor - Class Table Inheritance)
  let user = User.create({ ...userData });
  user.authorization = new AuthorizationPolicy(AuthorizationPolicyType.USER);

  // 2. Create Profile (referenced via Actor.profileId)
  user.profile = await this.profileService.createProfile(...);

  // 3. NO AGENT CREATION NEEDED - User IS the Actor

  // 4. Save User (Actor + User tables via CTI)
  user = await this.save(user);

  // 5. Sync to communication adapter using USER ID (= Actor ID)
  await this.communicationAdapter.syncActor(user.id, displayName);
}
```

### 9.3 Simplification Summary

| Aspect | Current | With Actor |
|--------|---------|------------|
| Entity creation | User + Agent (2 entities) | User only (extends Actor) |
| IDs | user.id ≠ agent.id | user.id = actor.id |
| Service calls | `agentService.createAgent()` needed | Not needed |
| Authorization | User has auth + Agent has auth | Actor has auth (single) |
| Credentials | Via `user.agent.credentials` | Via `user.credentials` (inherited) |
| Communication sync | Uses `agent.id` | Uses `user.id` directly |
| Queries | `leftJoin('user.agent', 'agent')` | No join needed |

**Estimated code reduction**: ~50-100 lines across entity creation services.

---

## 10. Recommendations

1. **Create Actor entity first** with type discriminator and all five types supported
2. **Migrate in transaction** with before/after credential count validation
3. **Add FK constraints incrementally** after Actor table is populated
4. **Remove Agent table last** after all references are updated
5. **Update GraphQL schema** to expose IActor interface with proper type resolution
