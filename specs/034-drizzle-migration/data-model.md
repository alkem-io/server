# Data Model: TypeORM to Drizzle ORM Migration

**Feature**: 034-drizzle-migration
**Date**: 2026-02-13

## Overview

This migration replaces TypeORM entity class definitions with Drizzle `pgTable()` schema definitions. The **database schema itself does not change** — only the ORM layer representation changes. No new tables, columns, or constraints are added.

## Schema Organization

### File Structure

Each domain module gets a co-located `*.schema.ts` and `*.relations.ts` file:

```text
src/
├── config/drizzle/
│   ├── drizzle.module.ts         # Global NestJS module (replaces TypeOrmModule.forRootAsync)
│   ├── drizzle.constants.ts      # DRIZZLE injection token
│   ├── drizzle.config.ts         # drizzle-kit configuration
│   ├── base.columns.ts           # Shared column definitions (replaces abstract entities)
│   ├── custom-types.ts           # Custom column types (simple-array, compressed text)
│   └── schema.ts                 # Barrel export of all schemas + relations
├── domain/
│   ├── space/space/
│   │   ├── space.entity.ts       # KEPT (for reference during migration, removed after)
│   │   ├── space.schema.ts       # NEW: pgTable() definition
│   │   └── space.relations.ts    # NEW: relations() definition
│   ├── common/profile/
│   │   ├── profile.entity.ts
│   │   ├── profile.schema.ts
│   │   └── profile.relations.ts
│   └── ... (same pattern for all ~80 entities)
└── drizzle/                      # Drizzle Kit output (migrations, metadata)
    ├── meta/
    └── *.sql
```

### Barrel Schema Export

All schemas and relations must be collected into a single barrel export for Drizzle to build the relational query API:

```typescript
// src/config/drizzle/schema.ts
export * from '@domain/space/space/space.schema';
export * from '@domain/space/space/space.relations';
export * from '@domain/space/account/account.schema';
export * from '@domain/space/account/account.relations';
// ... all ~80 entities
```

## Shared Column Definitions

### Base Columns (replaces `BaseAlkemioEntity`)

```typescript
// src/config/drizzle/base.columns.ts
import { uuid, timestamp, integer } from 'drizzle-orm/pg-core';

export const baseColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  createdDate: timestamp('createdDate').defaultNow().notNull(),
  updatedDate: timestamp('updatedDate').defaultNow().notNull().$onUpdate(() => new Date()),
  version: integer('version').default(1).notNull(),
};
```

### Authorizable Columns (replaces `AuthorizableEntity`)

```typescript
import { uuid } from 'drizzle-orm/pg-core';
import { baseColumns } from './base.columns';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';

export const authorizableColumns = {
  ...baseColumns,
  authorizationId: uuid('authorizationId').references(
    () => authorizationPolicies.id,
    { onDelete: 'set null' }
  ),
};
```

### Nameable Columns (replaces `NameableEntity`)

```typescript
import { varchar, uuid } from 'drizzle-orm/pg-core';
import { NAMEID_MAX_LENGTH_SCHEMA } from '@common/constants';
import { authorizableColumns } from './base.columns';
import { profiles } from '@domain/common/profile/profile.schema';

export const nameableColumns = {
  ...authorizableColumns,
  nameID: varchar('nameID', { length: NAMEID_MAX_LENGTH_SCHEMA }).notNull(),
  profileId: uuid('profileId').references(() => profiles.id, { onDelete: 'set null' }),
};
```

### Contributor Columns (replaces `ContributorBase`)

```typescript
import { uuid } from 'drizzle-orm/pg-core';
import { nameableColumns } from './base.columns';
import { agents } from '@domain/agent/agent/agent.schema';

export const contributorColumns = {
  ...nameableColumns,
  agentId: uuid('agentId').references(() => agents.id, { onDelete: 'set null' }),
};
```

## Custom Types

### simple-array (TypeORM Compatibility)

```typescript
// src/config/drizzle/custom-types.ts
import { customType } from 'drizzle-orm/pg-core';

export const simpleArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() { return 'text'; },
  toDriver(value: string[]): string { return value.join(','); },
  fromDriver(value: string): string[] { return value ? value.split(',') : []; },
});
```

Used by: `Tagset.tags`, `Visual.allowedTypes`, `StorageBucket.allowedMimeTypes`, `Invitation.invitedContributors`, `PlatformInvitation.invitedToParent`, `InnovationHub.subdomain`, `Forum.discussionCategories`, `VirtualContributor.searchVisibility`, `TagsetTemplate.allowedValues`

### simple-json (TypeORM Compatibility)

```typescript
export const simpleJson = <T>() => customType<{
  data: T;
  driverData: string;
}>({
  dataType() { return 'text'; },
  toDriver(value: T): string { return JSON.stringify(value); },
  fromDriver(value: string): T { return JSON.parse(value); },
});
```

Used by: `AiPersona.prompt`, `AiPersona.externalConfig`

## Representative Schema Definitions

### Space (Complex Entity — NameableEntity + Many Relations)

```typescript
// src/domain/space/space/space.schema.ts
import { pgTable, varchar, uuid, integer, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { nameableColumns } from '@config/drizzle/base.columns';

export const spaces = pgTable('space', {
  ...nameableColumns,

  // Direct columns
  level: integer('level').notNull(),
  sortOrder: integer('sortOrder').notNull().default(0),
  type: varchar('type', { length: ENUM_LENGTH }).notNull(),
  visibility: varchar('visibility', { length: ENUM_LENGTH }).notNull(),
  settings: jsonb('settings').notNull().$type<ISpaceSettings>(),
  storageAggregatorId: uuid('storageAggregatorId'),

  // FK columns (OneToOne, owned by this table)
  collaborationId: uuid('collaborationId'),
  communityId: uuid('communityId'),
  aboutId: uuid('aboutId'),
  agentId: uuid('agentId'),
  templatesManagerId: uuid('templatesManagerId'),
  licenseId: uuid('licenseId'),
  levelZeroSpaceID: uuid('levelZeroSpaceID'),

  // FK columns (ManyToOne)
  parentSpaceId: uuid('parentSpaceId'),
  accountId: uuid('accountId'),
}, (table) => [
  index('IDX_space_accountId').on(table.accountId),
  index('IDX_space_parentSpaceId').on(table.parentSpaceId),
  index('IDX_space_levelZeroSpaceID').on(table.levelZeroSpaceID),
]);
```

### AuthorizationPolicy (Leaf Entity — BaseAlkemioEntity)

```typescript
// src/domain/common/authorization-policy/authorization.policy.schema.ts
import { pgTable, varchar, text, boolean } from 'drizzle-orm/pg-core';
import { LONG_TEXT_LENGTH, ENUM_LENGTH } from '@common/constants';
import { baseColumns } from '@config/drizzle/base.columns';

export const authorizationPolicies = pgTable('authorization_policy', {
  ...baseColumns,
  credentialRules: text('credentialRules').default(''),
  verifiedCredentialRules: text('verifiedCredentialRules').default(''),
  privilegeRules: text('privilegeRules').default(''),
  type: varchar('type', { length: ENUM_LENGTH }),
  anonymousReadAccess: boolean('anonymousReadAccess').default(false).notNull(),
});
```

### InAppNotification (Complex — Many Subtypes via Discriminator Column)

```typescript
// src/platform/in-app-notification/in.app.notification.schema.ts
import { pgTable, varchar, uuid, boolean, timestamp, text, index } from 'drizzle-orm/pg-core';
import { baseColumns } from '@config/drizzle/base.columns';
import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';

export const inAppNotifications = pgTable('in_app_notification', {
  ...baseColumns,
  type: varchar('type', { length: ENUM_LENGTH }).notNull(),
  state: varchar('state', { length: ENUM_LENGTH }).notNull(),
  category: varchar('category', { length: ENUM_LENGTH }).notNull(),
  receiverID: uuid('receiverID').notNull(),
  triggeredByID: uuid('triggeredByID'),
  // ... discriminator-specific columns (nullable for other subtypes)
  communityID: uuid('communityID'),
  spaceID: uuid('spaceID'),
  calloutID: uuid('calloutID'),
  contributionID: uuid('contributionID'),
  // ... etc
}, (table) => [
  index('IDX_notification_receiverID').on(table.receiverID),
  index('IDX_notification_state').on(table.state),
]);
```

## Relation Definitions

Relations are defined separately from table schemas using Drizzle's `relations()` function:

```typescript
// src/domain/space/space/space.relations.ts
import { relations } from 'drizzle-orm';
import { spaces } from './space.schema';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { communities } from '@domain/community/community/community.schema';
// ... other imports

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  // OneToOne (this table owns the FK)
  collaboration: one(collaborations, {
    fields: [spaces.collaborationId],
    references: [collaborations.id],
  }),
  community: one(communities, {
    fields: [spaces.communityId],
    references: [communities.id],
  }),
  about: one(spaceAbouts, {
    fields: [spaces.aboutId],
    references: [spaceAbouts.id],
  }),
  authorization: one(authorizationPolicies, {
    fields: [spaces.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // ManyToOne (this table owns the FK)
  parentSpace: one(spaces, {
    fields: [spaces.parentSpaceId],
    references: [spaces.id],
    relationName: 'parentChild',
  }),
  account: one(accounts, {
    fields: [spaces.accountId],
    references: [accounts.id],
  }),

  // OneToMany (other table owns the FK)
  subspaces: many(spaces, { relationName: 'parentChild' }),
}));
```

## Entity Inheritance Mapping

| TypeORM Abstract | Drizzle Equivalent | Entities Using It |
|---|---|---|
| `BaseAlkemioEntity` | `...baseColumns` | AuthorizationPolicy, Activity, NVP, Lifecycle, Location, Form, etc. |
| `AuthorizableEntity` | `...authorizableColumns` | Most domain entities (~60) |
| `NameableEntity` | `...nameableColumns` | Space, Collaboration, Callout, InnovationHub, InnovationPack, etc. |
| `ContributorBase` | `...contributorColumns` | User, Organization, VirtualContributor |

## Many-to-Many Join Tables

Explicitly defined as separate `pgTable()` entries:

- `application_questions` (Application ↔ NVP)
- `user_group_members` (UserGroup ↔ User)
- `credential_resource_ids` (Credential ↔ resourceID)

## Enum Strategy

All enums are stored as `varchar` in the existing database (TypeORM's default for string enums). This is preserved:

```typescript
type: varchar('type', { length: ENUM_LENGTH }).notNull().$type<SpaceType>(),
visibility: varchar('visibility', { length: ENUM_LENGTH }).notNull().$type<SpaceVisibility>(),
```

No native PostgreSQL `ENUM` types are introduced — this avoids schema changes.

## Validation Rules

No change — validation remains at the DTO/GraphQL input layer via `class-validator` decorators. The Drizzle schema defines database constraints (NOT NULL, length, FK) that mirror the TypeORM entity definitions.

## State Transitions

No change to state transition logic — it remains in domain services. The ORM layer is purely for persistence, not business rules.
