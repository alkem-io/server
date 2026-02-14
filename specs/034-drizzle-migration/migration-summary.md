# Migration Summary: TypeORM to Drizzle ORM

**Branch**: `034-drizzle-migration` | **Date**: 2026-02-13
**Tasks**: T071, T072 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Table of Contents

1. [Quantitative Statistics](#1-quantitative-statistics)
2. [Schema Translation Patterns](#2-schema-translation-patterns)
3. [Query Translation Patterns](#3-query-translation-patterns)
4. [Transaction Handling](#4-transaction-handling)
5. [Cascade Removal Approach](#5-cascade-removal-approach)
6. [Eager Loading Replacement](#6-eager-loading-replacement)
7. [Lifecycle Hook Replacement](#7-lifecycle-hook-replacement)
8. [Module Registration Changes](#8-module-registration-changes)
9. [DataLoader Migration](#9-dataloader-migration)
10. [Test Mock Changes](#10-test-mock-changes)
11. [Infrastructure Files](#11-infrastructure-files)
12. [Remaining Work](#12-remaining-work)

---

## 1. Quantitative Statistics

### Overall Diff (branch vs master)

| Metric | Count |
|---|---|
| Total files changed (entire repo) | 309 |
| Total insertions | +10,807 |
| Total deletions | -6,580 |
| Net lines added | +4,227 |
| TypeScript files changed in `src/` | 291 |
| Files changed in `src/` | 292 |

### File Categories Changed

| Category | Files Modified |
|---|---|
| Service files (`*.service.ts`) | 118 |
| Module files (`*.module.ts`) | 93 |
| DataLoader files (loader creators + utils) | 43 |
| Resolver files (`*.resolver.*.ts`) | 19 |
| Test/spec files (`*.spec.ts`) | 19 |
| Test utility files (in `test/`) | 2 |
| Root config files (package.json, etc.) | 15 |

### New Files Created

| Category | Count | Details |
|---|---|---|
| Schema files (`*.schema.ts`) | 77 | Drizzle `pgTable()` definitions |
| Relations files (`*.relations.ts`) | 76 | Drizzle `relations()` definitions |
| Drizzle infrastructure (`src/config/drizzle/`) | 6 | Module, constants, base columns, custom types, helpers, barrel export |
| Test mock factory | 1 | `test/utils/drizzle.mock.factory.ts` |
| DataLoader utility | 1 | `src/core/dataloader/utils/tableNameMapping.ts` |
| New source files in `src/` (non-schema) | 5 | Loader creator + spec files |
| **Total new files** | **~166** | Including schema, relations, and infrastructure |

### Entity Files (still present)

| Metric | Count |
|---|---|
| Remaining `*.entity.ts` files | 91 |
| Schema files replacing them | 77 |

> Entity files are retained during the migration period. They serve as the class constructors
> for in-memory object creation (e.g., `Profile.create({...})`). Full removal is planned for
> Phase 8 (entity cleanup) once all services are verified stable on Drizzle.

### Dependency Injection Transition

| Metric | Count |
|---|---|
| `@InjectRepository` removed | 102 |
| `@InjectEntityManager` removed | 83 |
| `@Inject(DRIZZLE)` added | 160 |
| `TypeOrmModule.forFeature(...)` removed | 190 |
| `Repository<T>` type references removed | 120 |
| `EntityManager` references removed | 319 |

### Query API Transition

| Metric | Count |
|---|---|
| `db.query.<table>.findFirst(...)` added | 309 |
| `db.query.<table>.findMany(...)` added | 129 |
| `db.query.<table>.*` (total relational queries) | 489 |
| `db.delete(...)` added | 42 |
| `db.select(...)` added | 5 |
| `db.insert(...)` added | 4 |
| `db.update(...)` added | 2 |
| `.returning()` calls added | 134 |
| `eq()` comparisons added | 643 |
| `with: { ... }` relation loads added | 361 |
| `repository.*` / `entityManager.*` calls removed | 230 |
| `drizzle-orm` import statements added | 126 |

### Schema Files by Domain Area

| Domain Area | Schema Files | Relations Files |
|---|---|---|
| `domain/common/` | 19 | 19 |
| `domain/collaboration/` | 10 | 10 |
| `domain/community/` | 8 | 8 |
| `domain/communication/` | 5 | 5 |
| `domain/access/` | 5 | 5 |
| `domain/template/` | 5 | 5 |
| `domain/timeline/` | 3 | 3 |
| `domain/storage/` | 3 | 3 |
| `domain/space/` | 3 | 3 |
| `domain/agent/` | 2 | 2 |
| `domain/innovation-hub/` | 1 | 1 |
| `platform/` (activity, forum, notifications, licensing) | 8 | 7 |
| `services/ai-server/` | 2 | 2 |
| `library/` (innovation-pack, library) | 2 | 2 |
| **Total** | **77** | **76** |

> The one schema file without a matching relations file is `ory.default.identity.schema.ts`
> (an external schema type definition, not a database table with Drizzle relations).

### Barrel Export Size

The central schema barrel at `src/config/drizzle/schema.ts` contains **182 lines**,
re-exporting all 77 schema definitions and 76 relation definitions organized by domain area.

---

## 2. Schema Translation Patterns

### Entity-to-Schema File Mapping

Each TypeORM entity class (defined in `*.entity.ts`) was translated into two co-located files:

- **`*.schema.ts`** -- Drizzle `pgTable()` definition with column types and constraints
- **`*.relations.ts`** -- Drizzle `relations()` definition describing foreign key relationships

Files are co-located alongside the existing entity files within the same domain module directory.

**Example**: `src/domain/common/profile/`
```
profile.entity.ts          # TypeORM entity (retained)
profile.schema.ts          # NEW: Drizzle pgTable definition
profile.relations.ts       # NEW: Drizzle relations definition
profile.service.ts         # MODIFIED: uses Drizzle queries
profile.module.ts          # MODIFIED: removed TypeOrmModule.forFeature
```

### Base Column Patterns

TypeORM used an abstract class hierarchy for shared columns:

```
BaseAlkemioEntity       → id, createdDate, updatedDate, version
  └── AuthorizableEntity  → + authorizationId FK
        └── NameableEntity  → + nameID, profileId FK
              └── ContributorBase → + agentId FK
```

Drizzle replaces this with composable column spreads defined in
`src/config/drizzle/base.columns.ts`:

```typescript
// baseColumns: id (uuid PK), createdDate, updatedDate, version
export const baseColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  createdDate: timestamp('createdDate', { mode: 'date' }).defaultNow().notNull(),
  updatedDate: timestamp('updatedDate', { mode: 'date' }).defaultNow().notNull()
    .$onUpdate(() => new Date()),
  version: integer('version').default(1).notNull(),
};

// authorizableColumns: baseColumns + authorizationId FK
export const authorizableColumns = {
  ...baseColumns,
  authorizationId: uuid('authorizationId'),
};

// nameableColumns: authorizableColumns + nameID + profileId FK
export const nameableColumns = {
  ...authorizableColumns,
  nameID: varchar('nameID', { length: NAMEID_MAX_LENGTH_SCHEMA }).notNull(),
  profileId: uuid('profileId'),
};

// contributorColumns: nameableColumns + agentId FK
export const contributorColumns = {
  ...nameableColumns,
  agentId: uuid('agentId'),
};
```

Usage in a schema file:
```typescript
// src/domain/common/profile/profile.schema.ts
export const profiles = pgTable('profile', {
  ...authorizableColumns,
  displayName: text('displayName').notNull(),
  tagline: text('tagline'),
  description: text('description'),
  type: varchar('type', { length: ENUM_LENGTH }).notNull(),
  locationId: uuid('locationId'),
  storageBucketId: uuid('storageBucketId'),
});
```

### Custom Column Types

Defined in `src/config/drizzle/custom-types.ts`:

**`simpleArray`** -- Comma-delimited string stored as `text`, mapped to `string[]` in TypeScript.
Replaces TypeORM's `{ type: 'simple-array' }`. Used by 9+ entities:
- `Tagset.tags`, `Visual.allowedTypes`, `StorageBucket.allowedMimeTypes`
- `Invitation.extraRoles`, `TagsetTemplate.allowedValues`
- `Forum.discussionCategories`, `VirtualContributor.searchVisibility`

```typescript
export const simpleArray = customType<{ data: string[]; driverData: string }>({
  dataType() { return 'text'; },
  toDriver(value: string[]): string { return value.join(','); },
  fromDriver(value: string): string[] { return value ? value.split(',') : []; },
});
```

**`simpleJson<T>`** -- JSON stored as `text` (not `jsonb`), mapped to generic `T` in TypeScript.
Replaces TypeORM's `{ type: 'simple-json' }`. Used by `AiPersona.prompt` and `AiPersona.externalConfig`.

```typescript
export const simpleJson = <T>() => customType<{ data: T; driverData: string }>({
  dataType() { return 'text'; },
  toDriver(value: T): string { return JSON.stringify(value); },
  fromDriver(value: string): T { return JSON.parse(value) as T; },
});
```

### Relations Definition Pattern

Relations files use Drizzle's `relations()` function to declare foreign key relationships
that power the relational query API (`db.query.<table>.findFirst({ with: {...} })`):

```typescript
// src/domain/common/profile/profile.relations.ts
export const profilesRelations = relations(profiles, ({ one, many }) => ({
  authorization: one(authorizationPolicies, {
    fields: [profiles.authorizationId],
    references: [authorizationPolicies.id],
  }),
  location: one(locations, {
    fields: [profiles.locationId],
    references: [locations.id],
  }),
  storageBucket: one(storageBuckets, {
    fields: [profiles.storageBucketId],
    references: [storageBuckets.id],
  }),
  references: many(references),
  tagsets: many(tagsets),
  visuals: many(visuals),
}));
```

Key differences from TypeORM:
- `one()` with `fields`/`references` replaces `@OneToOne(() => Entity, { eager: true })`
- `many()` replaces `@OneToMany(() => Entity, entity => entity.parent)`
- No cascade configuration -- cascades are handled explicitly in service layer
- Relations are purely for the query API, not for DDL generation

---

## 3. Query Translation Patterns

### Repository to Drizzle Relational API

The primary migration pattern replaces TypeORM repository calls with Drizzle's relational query API.

**Find one by ID (with error handling):**

```typescript
// BEFORE (TypeORM)
const profile = await this.profileRepository.findOne({
  where: { id: profileID },
  relations: ['references', 'tagsets'],
});
if (!profile) throw new EntityNotFoundException(...);

// AFTER (Drizzle)
const profile = await this.db.query.profiles.findFirst({
  where: eq(profiles.id, profileID),
  with: { references: true, tagsets: true },
});
if (!profile) throw new EntityNotFoundException(...);
```

**Find one or fail (TypeORM had built-in):**

```typescript
// BEFORE (TypeORM)
const entity = await this.repository.findOneOrFail({ where: { id } });

// AFTER (Drizzle) -- manual throw required
const entity = await this.db.query.profiles.findFirst({
  where: eq(profiles.id, id),
});
if (!entity) throw new EntityNotFoundException('Profile not found', LogContext.COMMUNITY);
```

**Find many:**

```typescript
// BEFORE (TypeORM)
const items = await this.repository.find({ where: { parentId: id } });

// AFTER (Drizzle)
const items = await this.db.query.tagsets.findMany({
  where: eq(tagsets.profileId, id),
});
```

### EntityManager to Drizzle

```typescript
// BEFORE (TypeORM)
const results = await this.entityManager.find(Credential, {
  where: { agent: { id: agentId } },
});

// AFTER (Drizzle)
const results = await this.db.query.credentials.findMany({
  where: eq(credentials.agentId, agentId),
});
```

### QueryBuilder to Drizzle SQL-like API

For complex queries not suited to the relational API:

```typescript
// BEFORE (TypeORM)
const result = await this.repository
  .createQueryBuilder('space')
  .where('space.accountId = :accountId', { accountId })
  .getMany();

// AFTER (Drizzle)
const result = await this.db.select()
  .from(spaces)
  .where(eq(spaces.accountId, accountId));
```

### Insert Operations

```typescript
// BEFORE (TypeORM)
const saved = await this.repository.save(newEntity);

// AFTER (Drizzle)
const [saved] = await this.db.insert(profiles).values({
  displayName: data.displayName,
  type: profileType,
  authorizationId: authorization.id,
}).returning();
```

### Update Operations

```typescript
// BEFORE (TypeORM)
entity.displayName = newName;
await this.repository.save(entity);

// AFTER (Drizzle)
const [updated] = await this.db.update(profiles)
  .set({ displayName: newName })
  .where(eq(profiles.id, entityId))
  .returning();
```

### Delete Operations

```typescript
// BEFORE (TypeORM)
await this.repository.remove(entity);

// AFTER (Drizzle)
await this.db.delete(profiles).where(eq(profiles.id, entityId));
```

### Relation Loading with `with:`

Drizzle's `with:` clause replaces TypeORM's `relations:` option:

```typescript
// BEFORE (TypeORM)
const user = await this.repository.findOne({
  where: { id },
  relations: ['profile', 'profile.tagsets', 'agent', 'agent.credentials'],
});

// AFTER (Drizzle)
const user = await this.db.query.users.findFirst({
  where: eq(users.id, id),
  with: {
    profile: { with: { tagsets: true } },
    agent: { with: { credentials: true } },
  },
});
```

---

## 4. Transaction Handling

TypeORM transactions using `EntityManager`:

```typescript
// BEFORE (TypeORM)
await this.entityManager.transaction(async (transactionalEM) => {
  await transactionalEM.save(entityA);
  await transactionalEM.save(entityB);
});
```

Drizzle transactions:

```typescript
// AFTER (Drizzle)
await this.db.transaction(async (tx) => {
  await tx.insert(tableA).values(dataA);
  await tx.insert(tableB).values(dataB);
});
```

The Drizzle transaction callback receives a `tx` object that exposes the same API as the
main `db` instance, making it a drop-in replacement within the callback scope.

### Optimistic Locking

TypeORM's `@VersionColumn()` automatic version checking is replaced by an explicit helper
in `src/config/drizzle/helpers.ts`:

```typescript
export async function updateWithVersion<T extends PgTable<TableConfig>>(
  db: DrizzleDb,
  table: T,
  id: string,
  currentVersion: number,
  data: Partial<InferInsertModel<T>>
): Promise<InferInsertModel<T>> {
  const result = await db
    .update(table)
    .set({ ...data, version: currentVersion + 1 } as any)
    .where(and(eq(idCol, id), eq(versionCol, currentVersion)))
    .returning();

  if (result.length === 0) {
    throw new Error('Optimistic lock failure');
  }
  return result[0];
}
```

---

## 5. Cascade Removal Approach

TypeORM supported cascade operations via `cascade: ['insert', 'update']` on relation decorators.
Drizzle does not support cascade saves -- all multi-entity persistence is explicit.

### Insert Cascades

Where TypeORM would cascade-insert child entities when saving a parent:

```typescript
// BEFORE (TypeORM) -- implicit cascade
parent.profile = newProfile;
parent.authorization = newAuth;
await this.repository.save(parent);  // saves profile + auth automatically

// AFTER (Drizzle) -- explicit multi-step
const [auth] = await this.db.insert(authorizationPolicies).values({...}).returning();
const [profile] = await this.db.insert(profiles).values({
  authorizationId: auth.id, ...
}).returning();
const [parent] = await this.db.insert(parentTable).values({
  profileId: profile.id,
  authorizationId: auth.id, ...
}).returning();
```

### Delete Cascades

Database-level `ON DELETE SET NULL` and `ON DELETE CASCADE` constraints remain in the
PostgreSQL schema (unchanged). These are documented in schema files as comments:

```typescript
// In schema definition
lifecycleId: uuid('lifecycleId'),
// ON DELETE behavior defined at database level, not in Drizzle schema
```

Service-layer deletion methods explicitly delete child entities in the correct order:

```typescript
async deleteProfile(profileID: string): Promise<void> {
  const profile = await this.getProfileOrFail(profileID, {
    relations: { references: true, tagsets: true, visuals: true },
  });
  // Delete children first
  for (const ref of profile.references ?? []) {
    await this.referenceService.deleteReference(ref.id);
  }
  for (const tagset of profile.tagsets ?? []) {
    await this.tagsetService.deleteTagset(tagset.id);
  }
  // Then delete parent
  await this.db.delete(profiles).where(eq(profiles.id, profileID));
}
```

---

## 6. Eager Loading Replacement

TypeORM supported `eager: true` on relation decorators, causing related entities to be
automatically loaded on every query. Drizzle has no implicit eager loading -- all relation
loading must be explicit via the `with:` clause.

### Standard Eager-Load Helpers

Defined in `src/config/drizzle/helpers.ts` as reusable constants:

```typescript
export const withAuthorization = { authorization: true } as const;
export const withProfile = { profile: true } as const;
export const withAgent = { agent: true } as const;
```

### Service-Level Pattern

Services define typed options for callers to request specific relations:

```typescript
type ProfileFindOptions = {
  relations?: {
    references?: boolean;
    tagsets?: boolean;
    authorization?: boolean;
    location?: boolean;
    visuals?: boolean;
    storageBucket?: boolean;
  };
};

async getProfileOrFail(
  profileID: string,
  options?: ProfileFindOptions
): Promise<IProfile> {
  const profile = await this.db.query.profiles.findFirst({
    where: eq(profiles.id, profileID),
    with: options?.relations,
  });
  if (!profile) throw new EntityNotFoundException(...);
  return profile as IProfile;
}
```

This makes data loading explicit and prevents hidden N+1 query problems that TypeORM's
eager loading could cause.

---

## 7. Lifecycle Hook Replacement

TypeORM supported decorator-based lifecycle hooks (`@BeforeInsert`, `@AfterLoad`,
`@BeforeUpdate`) on entity classes. Drizzle does not have entity lifecycle hooks.

### Column-Level Hooks

Drizzle provides `$onUpdate()` for column-level auto-update behavior:

```typescript
// In base.columns.ts
updatedDate: timestamp('updatedDate', { mode: 'date' })
  .defaultNow()
  .notNull()
  .$onUpdate(() => new Date()),
```

### Service-Level Processing

Any complex before/after logic previously in entity hooks is now handled in service methods:

**Whiteboard content compression** (previously `@BeforeInsert`/`@AfterLoad`):

```typescript
// In whiteboard.service.ts
async saveWhiteboard(data: CreateWhiteboardInput): Promise<IWhiteboard> {
  // Pre-processing (replaces @BeforeInsert)
  const compressedContent = compressText(data.content);
  const [saved] = await this.db.insert(whiteboards).values({
    ...data,
    content: compressedContent,
  }).returning();
  return saved;
}

async getWhiteboard(id: string): Promise<IWhiteboard> {
  const wb = await this.db.query.whiteboards.findFirst({
    where: eq(whiteboards.id, id),
  });
  // Post-processing (replaces @AfterLoad)
  if (wb?.content) wb.content = decompressText(wb.content);
  return wb;
}
```

---

## 8. Module Registration Changes

### AppModule Changes (`src/app.module.ts`)

The root database module registration was replaced:

```typescript
// REMOVED: TypeORM root configuration (~40 lines)
TypeOrmModule.forRootAsync({
  name: 'default',
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService) => ({
    type: 'postgres',
    synchronize: false,
    entities: [join(__dirname, '**', '*.entity.{ts,js}')],
    host: dbOptions.host,
    // ... pool config, pgbouncer settings
  }),
}),

// ADDED: Single global Drizzle module
DrizzleModule,
```

### Per-Module Changes (93 modules modified)

Each NestJS module had its `TypeOrmModule.forFeature([...])` import removed:

```typescript
// BEFORE
@Module({
  imports: [
    TypeOrmModule.forFeature([Profile]),
    ReferenceModule,
    TagsetModule,
  ],
  providers: [ProfileService],
})

// AFTER
@Module({
  imports: [
    ReferenceModule,
    TagsetModule,
  ],
  providers: [ProfileService],
})
```

No `DrizzleModule` import is needed per module because it is registered as a `@Global()` module.

### Service Constructor Changes (118 services modified)

```typescript
// BEFORE
constructor(
  @InjectRepository(Profile)
  private profileRepository: Repository<Profile>,
  @InjectEntityManager('default')
  private entityManager: EntityManager,
) {}

// AFTER
constructor(
  @Inject(DRIZZLE)
  private readonly db: DrizzleDb,
) {}
```

### Package Dependencies

```diff
+ "drizzle-orm": "^0.45.1"       # Core ORM
+ "postgres": "^3.4.8"           # postgres.js driver
+ "drizzle-kit": "^0.31.9"       # Dev: schema introspection & migration generation
```

TypeORM and related packages are still present during the migration period (entity files
reference TypeORM decorators). Full removal is planned for Phase 8.

---

## 9. DataLoader Migration

43 dataloader-related files were modified to use Drizzle's relational query API.

### Table Name Mapping

A new mapping file (`src/core/dataloader/utils/tableNameMapping.ts`) bridges TypeORM entity
class names to Drizzle table names for generic DataLoader creators:

```typescript
export const ENTITY_TO_TABLE_NAME: Record<string, string> = {
  User: 'users',
  Organization: 'organizations',
  Profile: 'profiles',
  Space: 'spaces',
  // ... 40+ entity-to-table mappings
};
```

### Loader Creator Pattern

DataLoader creators were updated from TypeORM repository queries to Drizzle:

```typescript
// BEFORE (TypeORM)
const entities = await entityManager.find(Profile, {
  where: { id: In(ids) },
});

// AFTER (Drizzle)
const tableName = getTableName('Profile');
const entities = await db.query[tableName].findMany({
  where: inArray(table.id, ids as string[]),
});
```

### Modified Loader Utilities

- `src/core/dataloader/utils/createTypedRelationLoader.ts`
- `src/core/dataloader/utils/createTypedSimpleLoader.ts`
- `src/core/dataloader/utils/findByBatchIds.ts`
- `src/core/dataloader/utils/findByBatchIdsSimple.ts`
- 39 individual loader creator files across account, collaboration, community, space, and notification domains

---

## 10. Test Mock Changes

### Mock Factory (`test/utils/drizzle.mock.factory.ts`)

A Proxy-based mock replaces the TypeORM repository mock factory:

```typescript
export const createMockDrizzle = () => {
  const mock: any = {
    // Chainable SQL-like API
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    // Transaction support
    transaction: vi.fn(async (fn) => fn(createMockDrizzle())),
    // Dynamic table query mocking via Proxy
    query: new Proxy({}, {
      get: (target, prop) => {
        if (typeof prop === 'string' && !(prop in target)) {
          target[prop] = {
            findFirst: vi.fn().mockResolvedValue(undefined),
            findMany: vi.fn().mockResolvedValue([]),
          };
        }
        return target[prop];
      },
    }),
  };
  return mock;
};
```

The Proxy on `query` dynamically creates mock table accessors on first access,
so tests can reference any table name without explicit setup.

### NestJS Provider

```typescript
export const mockDrizzleProvider = {
  provide: DRIZZLE,
  useFactory: createMockDrizzle,
};
```

### Modified Test Files (19 spec files)

Tests were updated to:
1. Replace `repositoryMockFactory` / `MockEntityManagerProvider` with `mockDrizzleProvider`
2. Replace `getRepositoryToken(Entity)` with `DRIZZLE` symbol for mock retrieval
3. Update mock setup to use `db.query.<table>.findFirst.mockResolvedValue(...)` patterns

---

## 11. Infrastructure Files

### Drizzle Configuration (`src/config/drizzle/`)

| File | Purpose | Lines |
|---|---|---|
| `drizzle.module.ts` | Global NestJS module: creates postgres.js client + Drizzle instance | 68 |
| `drizzle.constants.ts` | `DRIZZLE` injection symbol + `DrizzleDb` type alias | 6 |
| `base.columns.ts` | Shared column spreads (base, authorizable, nameable, contributor) | 41 |
| `custom-types.ts` | `simpleArray` and `simpleJson<T>` custom column types | 47 |
| `helpers.ts` | `updateWithVersion()` optimistic locking + eager-load helpers | 45 |
| `schema.ts` | Barrel export of all 77 schemas + 76 relations | 182 |

### DrizzleModule Architecture

The `DrizzleModule` is registered as `@Global()` in NestJS, providing:

1. **`POSTGRES_CLIENT`** (internal) -- postgres.js connection with pool settings, PgBouncer
   compatibility, and optional query debug logging via Winston
2. **`DRIZZLE`** (exported) -- Drizzle ORM instance built with the full schema barrel,
   enabling the relational query API (`db.query.<table>.findFirst/findMany`)
3. **`onModuleDestroy`** -- Graceful connection pool shutdown

Connection configuration reads from the existing `storage.database` config path,
maintaining parity with the previous TypeORM connection setup.

### Drizzle Kit Config (`drizzle.config.ts`)

Root-level configuration for schema introspection and migration generation via `drizzle-kit`.

---

## 12. Remaining Work

### Completed

- Phase 1: Setup (T001-T003)
- Phase 2: Foundational infrastructure (T004-T011)
- Phase 3: Schema definitions for all ~80 entities (T012-T033)
- Phase 4: Barrel export + schema parity validation (T034-T035)
- Phase 5: Service migration for all domains (T036-T060)
- Phase 6: DataLoader migration (T061-T063)
- Phase 7: Test updates (T064-T070)

### Current (T071-T072)

- T071: Create migration effort summary (this document)
- T072: Review and verify documentation completeness

### Future (not in current scope)

- **Phase 8**: Remove TypeORM entity files (`*.entity.ts`) -- requires verifying no runtime
  references to entity classes remain
- **Phase 9**: Remove TypeORM packages (`typeorm`, `@nestjs/typeorm`, `pg`) from `package.json`
- **Phase 10**: Performance benchmarking -- compare test suite timing and query performance
  against TypeORM baseline
- **Phase 11**: Integration/E2E test validation against a running PostgreSQL instance

---

## Key Design Decisions

1. **Co-location over centralization**: Schema and relations files live alongside entity files
   in domain module directories, not in a central `drizzle/` folder. This preserves the
   existing domain-centric project structure.

2. **Global module over per-module registration**: A single `@Global()` `DrizzleModule`
   replaces 93 individual `TypeOrmModule.forFeature([...])` registrations, reducing
   boilerplate while maintaining the same DI pattern.

3. **Relational query API as primary**: The migration favors Drizzle's relational query API
   (`db.query.<table>.findFirst/findMany`) over the SQL-like API (`db.select().from()`)
   for most queries, as it maps most naturally to the existing TypeORM repository patterns.

4. **Entity files retained temporarily**: TypeORM entity classes are kept because they serve
   as in-memory object constructors (e.g., `Profile.create({...})`). A separate cleanup
   phase will replace these with plain factory functions.

5. **Explicit over implicit**: All relation loading, cascade operations, and lifecycle
   processing are now explicit in service methods, eliminating hidden behavior that TypeORM's
   decorators introduced.
