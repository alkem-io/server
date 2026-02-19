# Quickstart: Actor Transformation Implementation

**Feature**: 026-actor-transformation
**Date**: 2025-12-27
**Status**: Phase 1 Design

## Overview

This guide provides step-by-step instructions for implementing the Actor Transformation feature. The transformation replaces the Agent pattern with a unified Actor abstraction where entity ID = actor ID.

---

## Prerequisites

- Node.js 22 LTS
- pnpm 10.17.1
- PostgreSQL 17.5 running
- Current branch: `026-actor-transformation`

---

## Implementation Phases

### Phase A: Create Actor Infrastructure

#### A1. Create ActorType Enum

```bash
# Create file: src/common/enums/actor.type.ts
```

```typescript
export enum ActorType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL_CONTRIBUTOR = 'virtual-contributor',
  SPACE = 'space',
  ACCOUNT = 'account',
}
```

#### A2. Create Actor Entity

```bash
# Create directory structure
mkdir -p src/domain/actor/actor
```

Create `src/domain/actor/actor/actor.entity.ts` following the data-model.md specification.

#### A3. Create Actor Module

```typescript
// src/domain/actor/actor/actor.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Actor } from './actor.entity';
import { ActorService } from './actor.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Actor]),
    AuthorizationModule,
  ],
  providers: [ActorService],
  exports: [ActorService],
})
export class ActorModule {}
```

#### A4. Create ActorService

Port credential operations from AgentService to ActorService:
- `grantCredentialOrFail(actorId, credentialData)`
- `revokeCredential(actorId, credentialData)`
- `hasValidCredential(actorId, credentialCriteria)`
- `findActorsWithMatchingCredentials(credentialCriteria)`

---

### Phase B: Update Credential Entity

#### B1. Move Credential to Actor Domain

```bash
# Move files
mv src/domain/agent/credential src/domain/actor/credential
```

#### B2. Update Credential Entity

Change `agent` relationship to `actor`:

```typescript
// Before
@ManyToOne(() => Agent, agent => agent.credentials)
agent?: Agent;

// After
@ManyToOne(() => Actor, actor => actor.credentials)
actor?: Actor;
```

#### B3. Update CredentialService

Update all queries from Agent to Actor:

```typescript
// Before
.leftJoinAndSelect('credential.agent', 'agent')

// After
.leftJoinAndSelect('credential.actor', 'actor')
```

---

### Phase C: Update Entity Inheritance

#### C1. Update User Entity

```typescript
// Before
export class User extends ContributorBase implements IUser {
  // agent inherited from ContributorBase

// After
@ChildEntity(ActorType.USER)
export class User extends Actor implements IUser {
  // credentials inherited from Actor
  // profile inherited from Actor
```

#### C2. Update Organization Entity

Same pattern as User - extend Actor instead of ContributorBase.

#### C3. Update VirtualContributor Entity

Same pattern as User - extend Actor instead of ContributorBase.

#### C4. Update Space Entity

```typescript
// Before
export class Space extends AuthorizableEntity implements ISpace {
  @OneToOne(() => Agent)
  agent?: Agent;

// After
@ChildEntity(ActorType.SPACE)
export class Space extends Actor implements ISpace {
  // credentials inherited from Actor
  // profile will be null
```

#### C5. Update Account Entity

Same pattern as Space - extend Actor instead of AuthorizableEntity.

---

### Phase D: Database Migration

#### D1. Generate Migration

```bash
pnpm run migration:generate -n ActorTransformation
```

#### D2. Migration Content

The migration should:

1. Create Actor table (Class Table Inheritance)
2. Migrate data from User/Org/VC/Space/Account to Actor
3. Update Credential.agentId → actorId
4. Update ConversationMembership.agentId → actorId
5. Add FK constraints on createdBy/issuer columns
6. Remove agent_id columns from entity tables
7. Drop Agent table

#### D3. Validation

```bash
# Run migration validation
.scripts/migrations/run_validate_migration.sh
```

---

### Phase E: Update Services

#### E1. Services Requiring Updates

| Service | Change Required |
|---------|-----------------|
| UserService | Remove agent creation/deletion |
| OrganizationService | Remove agent creation/deletion |
| VirtualContributorService | Remove agent creation/deletion |
| SpaceService | Remove agent creation/deletion |
| AccountService | Remove agent creation/deletion |
| AuthorizationService | Update agent references to actor |
| ContributorLoaderCreator | Query Actor instead of separate tables |

#### E2. Update Authorization Checks

```typescript
// Before
const agent = await this.agentService.getAgentOrFail(user.agent.id);
const hasCredential = await this.agentService.hasValidCredential(agent.id, criteria);

// After
const hasCredential = await this.actorService.hasValidCredential(user.id, criteria);
```

---

### Phase F: GraphQL Schema Updates

#### F1. Add IActor Interface

Add to appropriate `.graphql` files or decorators:

```typescript
@InterfaceType('IActor')
export abstract class IActor {
  @Field(() => ID)
  id!: string;

  @Field(() => ActorType)
  type!: ActorType;

  @Field(() => [Credential])
  credentials!: Credential[];
}
```

#### F2. Update Type Implementations

Add `implements IActor` to User, Organization, VirtualContributor, Space, Account resolvers.

#### F3. Add Actor Queries

```typescript
@Resolver()
export class ActorResolver {
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

#### F4. Regenerate Schema

```bash
pnpm run schema:print
pnpm run schema:sort
pnpm run schema:diff
```

---

### Phase G: Update Actor Reference Columns

#### G1. Add FK Constraints

For each entity with createdBy/issuer/triggeredBy columns:

```typescript
@ManyToOne(() => Actor, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'createdBy' })
createdByActor?: Actor;
```

#### G2. Entities to Update

- Callout (createdBy, publishedBy)
- Post (createdBy)
- CalloutContribution (createdBy)
- Document (createdBy)
- Whiteboard (createdBy)
- Memo (createdBy)
- CalendarEvent (createdBy)
- Credential (issuer)
- Invitation (createdBy, invitedContributorID)
- PlatformInvitation (createdBy)
- Discussion (createdBy)
- Activity (triggeredBy)
- InAppNotification (triggeredByID)

---

### Phase H: Cleanup

#### H1. Remove Deprecated Code

- Delete `src/domain/agent/agent/` directory
- Delete `src/domain/community/contributor/contributor.base.entity.ts`
- Remove IContributor interface
- Remove agent-related fields from GraphQL schema

#### H2. Update Tests

- Update all tests referencing Agent to use Actor
- Add new tests for ActorService
- Add integration tests for credential operations

---

## Testing Strategy

### Unit Tests

```bash
# Run unit tests for actor module
pnpm run test:ci src/domain/actor
```

### Integration Tests

```bash
# Run full test suite
pnpm run test:ci:no:coverage
```

### Migration Validation

```bash
# Validate migration on test database
pnpm run migration:validate
```

---

## Rollback Strategy

If issues are discovered after deployment:

1. Restore database from pre-migration backup
2. Revert to previous server version
3. Analyze issues and fix migration

Since this is a single production instance with direct cutover, ensure backup is taken immediately before migration.

---

## Success Criteria Verification

After implementation, verify:

- [ ] All credential operations use actorId (not agentId)
- [ ] GraphQL `actor(id)` query returns correct type
- [ ] `actorsWithCredential` query works across all actor types
- [ ] Profile is null for Space and Account actors
- [ ] All createdBy/issuer columns have FK constraints
- [ ] Agent table is dropped
- [ ] No test failures
- [ ] Schema diff shows only expected additions (no breaking changes)
