# Data Model: Actor Transformation

**Feature**: 026-actor-transformation
**Date**: 2025-12-27
**Status**: Implemented (commit a899ef55 + follow-up fixes on 026-actor-transformation-v2)

## Overview

This document defines the Actor entity structure and its relationships, replacing the current Agent pattern with a unified identity model.

---

## 1. Actor Entity

### 1.1 TypeORM Entity Definition

```typescript
// src/domain/actor/actor/actor.entity.ts

import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  TableInheritance,
} from 'typeorm';
import { IActor } from './actor.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Credential } from '@domain/actor/credential/credential.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { ActorType } from '@common/enums/actor.type';
import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type', length: ENUM_LENGTH } })
export class Actor extends AuthorizableEntity implements IActor {
  // Type discriminator - populated automatically by TypeORM
  @Column('varchar', { length: ENUM_LENGTH })
  type!: ActorType;

  // Optional profile reference (null for Space, Account)
  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'profileId' })
  profile?: Profile;

  @Column('uuid', { nullable: true })
  profileId?: string;

  // Credentials owned by this actor
  @OneToMany(() => Credential, credential => credential.actor, {
    eager: true,
    cascade: true,
  })
  credentials?: Credential[];
}
```

### 1.2 ActorType Enum

```typescript
// src/common/enums/actor.type.ts

export enum ActorType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL = 'virtual',       // NOTE: shortened from VIRTUAL_CONTRIBUTOR for brevity
  SPACE = 'space',
  ACCOUNT = 'account',
}
```

**PostgreSQL ENUM** (for performance and data integrity):

```sql
CREATE TYPE "actor_type_enum" AS ENUM(
  'user',
  'organization',
  'virtual',
  'space',
  'account'
);
```

Benefits: 4-byte storage (vs 5-20 byte VARCHAR), integer comparison speed, DB-level validation.

### 1.3 Actor Interfaces

Two complementary interfaces are defined in `actor.interface.ts`:

```typescript
// src/domain/actor/actor/actor.interface.ts

/**
 * IActor - Base interface + lightweight GraphQL ObjectType ('Actor').
 * For display contexts: attribution on cards, activity feed "triggered by",
 * member list displays. No nameID, no credentials exposed.
 */
@ObjectType('Actor', { description: 'Lightweight actor data for display contexts.' })
export abstract class IActor extends IAuthorizable {
  @Field(() => ActorType)
  type!: ActorType;

  @Field(() => IProfile, { nullable: true })
  profile?: IProfile;

  // Not exposed in GraphQL - internal reference
  profileId?: string;

  // Credentials available internally but NOT in lightweight GraphQL type
  credentials?: ICredential[];
}

/**
 * IActorFull - Polymorphic GraphQL InterfaceType ('ActorFull').
 * For full actor data with type resolution to User / Organization /
 * VirtualContributor / Space / Account.
 */
@InterfaceType('ActorFull', { resolveType(actor) { /* discriminator switch on actor.type */ } })
export abstract class IActorFull {
  id!: string;
  type!: ActorType;
  nameID!: string;
  authorization?: IAuthorizationPolicy;
  credentials?: ICredential[];
  profile?: IProfile;
  createdDate!: Date;
  updatedDate!: Date;
}
```

---

## 2. Updated Credential Entity

```typescript
// src/domain/actor/credential/credential.entity.ts

import {
  Column,
  Entity,
  ManyToOne,
} from 'typeorm';
import { ICredential } from './credential.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';

@Entity()
export class Credential extends BaseAlkemioEntity implements ICredential {
  @Column('varchar', { length: UUID_LENGTH, nullable: false })
  resourceID!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: string;

  // Updated: Reference to Actor instead of Agent
  @ManyToOne(() => Actor, actor => actor.credentials, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'actorId' })      // DB column: actorId (preserved for migration safety)
  actor?: Actor;

  @Column('uuid', { nullable: true, name: 'actorId' })  // TS property: actorID; DB column: actorId
  actorID?: string;

  // Issuer is also an Actor (generic reference)
  @Column('uuid', { nullable: true })
  issuer?: string;

  @Column({ type: 'timestamp', nullable: true })
  expires?: Date;
}
```

---

## 3. Updated Entity Inheritance

### 3.1 User Entity (extends Actor)

```typescript
// src/domain/community/user/user.entity.ts

import { ChildEntity, Column, OneToOne, JoinColumn } from 'typeorm';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ActorType } from '@common/enums/actor.type';
import { IUser } from './user.interface';
// ... other imports

@ChildEntity(ActorType.USER)
export class User extends Actor implements IUser {
  // nameID moves here from NameableEntity pattern
  @Column('varchar', {
    length: NAMEID_MAX_LENGTH_SCHEMA,
    nullable: false,
    unique: true,
  })
  nameID!: string;

  @Column('varchar', { length: TINY_TEXT_LENGTH, nullable: true })
  firstName!: string;

  @Column('varchar', { length: TINY_TEXT_LENGTH, nullable: true })
  lastName!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  email!: string;

  // ... other User-specific fields

  // Note: profile is inherited from Actor
  // Note: authorization is inherited from AuthorizableEntity via Actor
  // Note: agent relationship is REMOVED
}
```

### 3.2 Organization Entity (extends Actor)

```typescript
// src/domain/community/organization/organization.entity.ts

import { ChildEntity, Column } from 'typeorm';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ActorType } from '@common/enums/actor.type';
import { IOrganization } from './organization.interface';
// ... other imports

@ChildEntity(ActorType.ORGANIZATION)
export class Organization extends Actor implements IOrganization {
  @Column('varchar', {
    length: NAMEID_MAX_LENGTH_SCHEMA,
    nullable: false,
    unique: true,
  })
  nameID!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  legalEntityName?: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  domain?: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  website?: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  contactEmail?: string;

  // ... other Organization-specific fields

  // Note: profile is inherited from Actor
  // Note: agent relationship is REMOVED
}
```

### 3.3 VirtualContributor Entity (extends Actor)

```typescript
// src/domain/community/virtual-contributor/virtual.contributor.entity.ts

import { ChildEntity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ActorType } from '@common/enums/actor.type';
import { IVirtualContributor } from './virtual.contributor.interface';
import { Account } from '@domain/space/account/account.entity';
// ... other imports

@ChildEntity(ActorType.VIRTUAL)
export class VirtualContributor extends Actor implements IVirtualContributor {
  @Column('varchar', {
    length: NAMEID_MAX_LENGTH_SCHEMA,
    nullable: false,
    unique: true,
  })
  nameID!: string;

  // Specific FK to Account (not generic Actor FK)
  @ManyToOne(() => Account, account => account.virtualContributors)
  @JoinColumn({ name: 'accountId' })
  account!: Account;

  @Column('uuid', { nullable: true })
  accountId?: string;

  // ... other VirtualContributor-specific fields

  // Note: profile is inherited from Actor
  // Note: agent relationship is REMOVED
}
```

### 3.4 Space Entity (extends Actor)

```typescript
// src/domain/space/space/space.entity.ts

import { ChildEntity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ActorType } from '@common/enums/actor.type';
import { ISpace } from './space.interface';
import { Account } from '@domain/space/account/account.entity';
// ... other imports

@ChildEntity(ActorType.SPACE)
export class Space extends Actor implements ISpace {
  @Column('varchar', {
    length: NAMEID_MAX_LENGTH_SCHEMA,
    nullable: false,
  })
  nameID!: string;

  // Specific FK to Account (not generic Actor FK)
  @ManyToOne(() => Account, account => account.spaces)
  @JoinColumn({ name: 'accountId' })
  account!: Account;

  @Column('uuid', { nullable: true })
  accountId?: string;

  // Parent/child hierarchy
  @ManyToOne(() => Space, space => space.subspaces, { nullable: true })
  parentSpace?: Space;

  @OneToMany(() => Space, space => space.parentSpace)
  subspaces?: Space[];

  // ... other Space-specific fields

  // Note: profile is inherited from Actor but will be null for Space
  // Note: Space uses SpaceAbout for profile-like information
  // Note: agent relationship is REMOVED
}
```

### 3.5 Account Entity (extends Actor)

```typescript
// src/domain/space/account/account.entity.ts

import { ChildEntity, Column, OneToMany } from 'typeorm';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ActorType } from '@common/enums/actor.type';
import { IAccount } from './account.interface';
import { Space } from '@domain/space/space/space.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
// ... other imports

@ChildEntity(ActorType.ACCOUNT)
export class Account extends Actor implements IAccount {
  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  accountType!: AccountType;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  externalSubscriptionID?: string;

  // Owned entities
  @OneToMany(() => Space, space => space.account)
  spaces?: Space[];

  @OneToMany(() => VirtualContributor, vc => vc.account)
  virtualContributors?: VirtualContributor[];

  // ... other Account-specific fields

  // Note: profile is inherited from Actor but will be null for Account
  // Note: agent relationship is REMOVED
}
```

---

## 4. Updated Reference Columns

### 4.1 Generic Actor References (add FK to Actor)

Example update for Callout entity:

```typescript
// src/domain/collaboration/callout/callout.entity.ts

import { ManyToOne, JoinColumn } from 'typeorm';
import { Actor } from '@domain/actor/actor/actor.entity';

@Entity()
export class Callout extends BaseAlkemioEntity implements ICallout {
  // Before: @Column('uuid', { nullable: true })
  // After:
  @ManyToOne(() => Actor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  createdByActor?: Actor;

  @Column('uuid', { nullable: true })
  createdBy?: string;

  @ManyToOne(() => Actor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'publishedBy' })
  publishedByActor?: Actor;

  @Column('uuid', { nullable: true })
  publishedBy?: string;

  // ... rest of entity
}
```

### 4.2 Columns Requiring FK Update

| Entity | Column | New Relationship |
|--------|--------|------------------|
| Callout | createdBy, publishedBy | ManyToOne → Actor |
| Post | createdBy | ManyToOne → Actor |
| CalloutContribution | createdBy | ManyToOne → Actor |
| Document | createdBy | ManyToOne → Actor |
| Whiteboard | createdBy | ManyToOne → Actor |
| Memo | createdBy | ManyToOne → Actor |
| CalendarEvent | createdBy | ManyToOne → Actor |
| Credential | issuer | ManyToOne → Actor (nullable) |
| Invitation | createdBy | ManyToOne → Actor |
| Invitation | invitedContributorID | ManyToOne → Actor |
| Invitation | contributorType | **REMOVE** - redundant, use Actor.type instead |
| InAppNotification | payload.contributorType (JSON) | **REMOVE** from JSON - resolve from Actor.type, migration strips from existing payloads |
| PlatformInvitation | createdBy | ManyToOne → Actor |
| Discussion | createdBy | ManyToOne → Actor |
| Activity | triggeredBy | ManyToOne → Actor |
| InAppNotification | triggeredByID | ManyToOne → Actor |
| InAppNotification | contributorUserID, contributorOrganizationID, contributorVcID | **Consolidate** → single `contributorActorID` (ManyToOne → Actor) |
| ConversationMembership | agentId → actorId | ManyToOne → Actor |

---

## 5. Database Schema Changes

### 5.1 New Actor Table

```sql
-- Create PostgreSQL ENUM type first
CREATE TYPE "actor_type_enum" AS ENUM(
  'user',
  'organization',
  'virtual',
  'space',
  'account'
);

CREATE TABLE "actor" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
  "version" integer NOT NULL,
  "type" "actor_type_enum" NOT NULL,
  "profileId" uuid,
  "authorizationId" uuid,
  CONSTRAINT "PK_actor" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_actor_profileId" UNIQUE ("profileId"),
  CONSTRAINT "UQ_actor_authorizationId" UNIQUE ("authorizationId"),
  CONSTRAINT "FK_actor_profile" FOREIGN KEY ("profileId")
    REFERENCES "profile"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_actor_authorization" FOREIGN KEY ("authorizationId")
    REFERENCES "authorization_policy"("id") ON DELETE SET NULL
);

CREATE INDEX "IDX_actor_type" ON "actor" ("type");
```

### 5.2 Credential Table Update

```sql
-- Rename agentId to actorId and update FK
ALTER TABLE "credential" RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "credential" DROP CONSTRAINT "FK_credential_agent";
ALTER TABLE "credential" ADD CONSTRAINT "FK_credential_actor"
  FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE CASCADE;

-- Add FK for issuer column
ALTER TABLE "credential" ADD CONSTRAINT "FK_credential_issuer"
  FOREIGN KEY ("issuer") REFERENCES "actor"("id") ON DELETE SET NULL;
```

### 5.3 ConversationMembership Update

```sql
-- Rename agentId to actorId and update FK
ALTER TABLE "conversation_membership" RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "conversation_membership" DROP CONSTRAINT "FK_conversation_membership_agent";
ALTER TABLE "conversation_membership" ADD CONSTRAINT "FK_conversation_membership_actor"
  FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE CASCADE;
```

---

## 6. Migration Strategy

### 6.1 Data Migration Steps

1. **Create Actor table** with Class Table Inheritance structure
2. **Migrate existing entities** to Actor table:
   - For each User: INSERT INTO actor (id, type, profileId, authorizationId) SELECT id, 'user', profileId, authorizationId FROM user
   - Repeat for Organization, VirtualContributor, Space, Account
3. **Update Credential.agentId → actorId**:
   - Map old agentId to new actorId via entity lookup
4. **Update ConversationMembership.agentId → actorId**
5. **Add FK constraints** on createdBy/issuer columns
6. **Remove agent columns** from User, Organization, VirtualContributor, Space, Account
7. **Drop Agent table**

### 6.2 Validation Queries

```sql
-- Before migration: count credentials by agent
SELECT COUNT(*) FROM credential WHERE "agentId" IS NOT NULL;

-- After migration: count credentials by actor (should match)
SELECT COUNT(*) FROM credential WHERE "actorId" IS NOT NULL;

-- Verify no orphaned credentials
SELECT c.id FROM credential c
LEFT JOIN actor a ON c."actorId" = a.id
WHERE c."actorId" IS NOT NULL AND a.id IS NULL;
```

---

## 7. Removed Entities

### 7.1 Agent Entity (DEPRECATED)

The Agent entity will be removed after migration. All functionality moves to Actor.

### 7.2 ContributorBase Entity (REMOVED)

The ContributorBase abstract class is no longer needed. Its responsibilities are absorbed by:
- **Actor**: Inherits authorization and credentials
- **Individual entities**: nameID and other contributor-specific fields

### 7.3 IContributor Interface (REMOVED)

Replaced by IActor interface in GraphQL schema.
