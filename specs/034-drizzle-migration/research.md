# Research: TypeORM to Drizzle ORM Migration

**Feature**: 034-drizzle-migration
**Date**: 2026-02-13

## 1. Current TypeORM Usage Inventory

### Entity Hierarchy

The codebase uses a 3-level abstract entity inheritance pattern:

| Base Class | Extends | Provides |
|---|---|---|
| `BaseAlkemioEntity` | TypeORM `BaseEntity` | `id` (UUID PK), `createdDate`, `updatedDate`, `version` |
| `AuthorizableEntity` | `BaseAlkemioEntity` | `authorization` (OneToOne, eager, cascade, SET NULL) |
| `NameableEntity` | `AuthorizableEntity` | `nameID` (varchar), `profile` (OneToOne, cascade, SET NULL) |
| `ContributorBase` | `NameableEntity` | `agent` (OneToOne, eager, cascade, SET NULL) |

All concrete entities extend one of these abstract classes. The `@VersionColumn()` in `BaseAlkemioEntity` provides optimistic locking for all entities.

### Concrete Metrics

| Metric | Count |
|---|---|
| Total `.entity.ts` files | 91 |
| Concrete entity files (mapped to tables) | ~80 |
| Abstract base entities | 4 |
| DTO update entities (not separate tables) | 4 |
| TypeORM migrations | 13 |
| NestJS modules total | 191 |
| Modules importing `TypeOrmModule.forFeature()` | 97 |
| `@InjectRepository()` usages | 102 |
| `@InjectEntityManager('default')` usages | 168 |
| Custom repository classes | 0 |
| `createQueryBuilder()` usages | 67 (across 29 files) |
| Relations with `cascade: true` | 112 (across 50 entities) |
| Relations with `eager: true` | 25 (across 23 entities) |
| `onDelete: 'SET NULL'` | 89 (across 44 files) |
| `onDelete: 'CASCADE'` | 40 (across 23 files) |
| `onDelete: 'NO ACTION'` | 2 (across 2 files) |
| Lifecycle hooks (`@BeforeInsert`, etc.) | 2 entities (Whiteboard, CalloutContributionDefaults) |
| Column transformers | 1 (PromptGraphTransformer) |
| `simple-array` columns | 9 entity files |
| `simple-json` columns | 1 entity file (AiPersona) |
| `@ManyToMany` with `@JoinTable` | ~3 entities |
| `@EventSubscriber` | 0 |
| `@ViewEntity` | 0 |

### DataSource Configuration

Located in `src/app.module.ts` (lines 139-179):
- `TypeOrmModule.forRootAsync()` with factory pattern
- Connection name: `'default'`
- Entity auto-discovery: `join(__dirname, '**', '*.entity.{ts,js}')`
- PostgreSQL with connection pooling (max 50, idle timeout 30s, connect timeout 10s)
- PgBouncer compatibility support with statement_timeout
- Query cache enabled (`cache: true`)
- `synchronize: false` (migrations-managed)

### Repository Injection Pattern

All services follow a consistent pattern — no custom repository classes:

```typescript
@Injectable()
export class SpaceService {
  constructor(
    @InjectRepository(Space) private spaceRepository: Repository<Space>,
    @InjectEntityManager('default') private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    // ... other domain service dependencies
  ) {}
}
```

### Query Patterns

1. **Repository methods** (majority): `.find()`, `.findOne()`, `.save()`, `.remove()`, `.delete()`
2. **EntityManager** (168 usages): Complex relation queries with `findOne({relations: {...}})`, cross-entity lookups
3. **QueryBuilder** (67 usages across 29 files): Pagination, complex filters, joins, ordering

### Test Mocking Pattern

- `repositoryMockFactory()`: Mocks all `Repository<T>` methods with `vi.fn()`
- `MockEntityManagerProvider`: Provides mock `EntityManager` with `find: vi.fn()`
- `defaultMockerFactory()`: Auto-mocks using `@golevelup/ts-vitest` `createMock()`
- Token matching: `token.endsWith('EntityRepository')` → `repositoryMockFactory()`

---

## 2. Drizzle ORM NestJS Integration

### Decision: Global Module with DRIZZLE Injection Token

**Rationale**: Replaces TypeORM's per-module `forFeature()` pattern with a single global Drizzle provider. This is simpler since Drizzle doesn't need entity registration per module — all schema is imported statically.

**Pattern**:

```typescript
// src/config/drizzle/drizzle.constants.ts
export const DRIZZLE = Symbol('DRIZZLE');

// src/config/drizzle/drizzle.module.ts
@Global()
@Module({
  providers: [{
    provide: DRIZZLE,
    inject: [ConfigService],
    useFactory: async (configService: ConfigService<AlkemioConfig, true>) => {
      const dbOptions = configService.get('storage.database', { infer: true });
      const client = postgres({
        host: dbOptions.host,
        port: dbOptions.port,
        user: dbOptions.username,
        password: dbOptions.password,
        database: dbOptions.database,
        max: dbOptions.pool?.max ?? 50,
        idle_timeout: (dbOptions.pool?.idle_timeout_ms ?? 30000) / 1000,
        connect_timeout: (dbOptions.pool?.connection_timeout_ms ?? 10000) / 1000,
      });
      return drizzle(client, { schema });
    },
  }],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
```

**Alternatives considered**:
- `drizzle-nestjs` community package: Too new, insufficient production track record
- Per-module Drizzle instances: Unnecessary — Drizzle's schema is statically imported

---

## 3. postgres.js Driver

### Decision: postgres.js with Connection Pooling

**Rationale**: Specified in the feature spec. postgres.js is faster than pg, native ESM, and built-in connection pooling.

**Configuration mapping from TypeORM**:

| TypeORM Config | postgres.js Config |
|---|---|
| `extra.max: 50` | `max: 50` |
| `extra.idleTimeoutMillis: 30000` | `idle_timeout: 30` (seconds) |
| `extra.connectionTimeoutMillis: 10000` | `connect_timeout: 10` (seconds) |
| `extra.statement_timeout` (PgBouncer) | `connection: { statement_timeout: ms }` |
| `logging: boolean` | `debug: (connection, query) => {...}` |

**PgBouncer compatibility**: postgres.js works with PgBouncer in transaction mode. Set `prepare: false` when PgBouncer is enabled to disable prepared statements.

---

## 4. Schema Definition Strategy

### Decision: Co-located `*.schema.ts` Files with Shared Column Definitions

**Rationale**: Matches the spec's requirement for co-location with domain modules. The abstract entity hierarchy is replaced by shared column object spreads.

**Base column pattern** (replaces `BaseAlkemioEntity`):

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

**Authorizable columns** (replaces `AuthorizableEntity`):

```typescript
export const authorizableColumns = {
  ...baseColumns,
  authorizationId: uuid('authorizationId').references(() => authorizationPolicies.id, { onDelete: 'set null' }),
};
```

**Nameable columns** (replaces `NameableEntity`):

```typescript
export const nameableColumns = {
  ...authorizableColumns,
  nameID: varchar('nameID', { length: NAMEID_MAX_LENGTH_SCHEMA }).notNull(),
  profileId: uuid('profileId').references(() => profiles.id, { onDelete: 'set null' }),
};
```

**Alternatives considered**:
- Single giant schema file from `drizzle-kit pull`: Hard to maintain, doesn't match project structure
- Schema classes with decorators: Not supported by Drizzle (functional API only)

---

## 5. Drizzle Kit Migration Tooling

### Decision: `drizzle-kit pull` for Baseline, `drizzle-kit generate` / `drizzle-kit migrate` Going Forward

**Rationale**: Specified in the spec. Introspecting the existing database ensures zero-diff baseline.

**Workflow**:
1. Run `drizzle-kit pull` against the existing TypeORM-managed database → generates raw schema files
2. Refactor generated schema into co-located `*.schema.ts` per domain module
3. Verify: `drizzle-kit generate` produces an empty migration (confirms schema parity)
4. Future migrations: `drizzle-kit generate` → `drizzle-kit migrate`

**Migration table**: Use `migrations_drizzle` (separate from TypeORM's `migrations` table) to allow side-by-side comparison.

---

## 6. Transaction Patterns

### Decision: Pass `tx` Through Service Layer via Union Type

**Rationale**: Matches the existing pattern where services receive `EntityManager` for cross-entity operations. The `tx` object in Drizzle has the same API as the main `db` instance.

**Type definition**:

```typescript
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@config/drizzle/schema';

export type DrizzleDb = PostgresJsDatabase<typeof schema>;
// tx has same shape as db — services accept either
```

**Transaction propagation**: Services that currently receive `EntityManager` will receive `DrizzleDb` (which is the same type for both `db` and `tx`). The calling service wraps operations in `db.transaction(async (tx) => {...})`.

**Nested transactions**: Drizzle supports PostgreSQL savepoints via nested `tx.transaction()` calls.

---

## 7. Lifecycle Hook Replacement

### Decision: Repository-Layer Handling

Only 2 entities use lifecycle hooks (Whiteboard and CalloutContributionDefaults), both for text compression/decompression.

**Strategy**:
- `@BeforeInsert` / `@BeforeUpdate` → Pre-process in service method before `.insert()` / `.update()`
- `@AfterLoad` / `@AfterInsert` / `@AfterUpdate` → Post-process after `.returning()` or `.select()`
- Use `customType()` for synchronous transformers (PromptGraphTransformer)
- Use repository-layer wrapping for async transformers (Whiteboard compression)

---

## 8. Eager Loading Replacement

### Decision: Explicit `with` Clauses via Relational Query API

23 entities have `eager: true` relations. The most impactful is `AuthorizableEntity.authorization` (eager on every entity).

**Strategy**: Create standard `with` configurations:

```typescript
export const withAuthorization = { authorization: true } as const;
export const withProfile = { profile: true } as const;
export const withAgent = { agent: true } as const;
```

Every query that previously relied on eager loading must include the appropriate `with:` clause. This is the second-largest migration effort after cascade removal.

---

## 9. Cascade Replacement

### Decision: Explicit Insert/Update/Delete in Service Layer

112 cascade relationships across 50 entities. This is the **largest migration risk**.

**Strategy**:
- `cascade: ['insert']` → Explicit `tx.insert()` for child entities before/after parent
- `cascade: ['update']` → Explicit `tx.update()` for child entities
- `cascade: ['remove']` → Explicit `tx.delete()` for child entities (respecting FK order) or rely on database-level `ON DELETE CASCADE` where already present
- Wrap multi-entity mutations in transactions

**Mitigation**: Many cascade removes are already backed by `onDelete: 'CASCADE'` or `onDelete: 'SET NULL'` at the database level, so the ORM cascade is redundant for deletes. For inserts, explicit creation is required.

---

## 10. Version Column / Optimistic Locking

### Decision: Manual Implementation in Base Update Helper

**Strategy**: Create a utility that wraps all updates with version checking:

```typescript
async function updateWithVersion<T extends typeof baseColumns>(
  db: DrizzleDb, table: T, id: string, currentVersion: number, data: Partial<InferInsertModel<T>>
) {
  const result = await db.update(table)
    .set({ ...data, version: currentVersion + 1 })
    .where(and(eq(table.id, id), eq(table.version, currentVersion)))
    .returning();
  if (result.length === 0) throw new OptimisticLockError();
  return result[0];
}
```

---

## 11. Query Cache Replacement

### Decision: Rely on Existing Redis CacheManager

TypeORM's built-in query cache (`cache: true`) is replaced by the existing NestJS `CacheModule` (Redis-backed) already configured in `app.module.ts`. Domain services that need caching use `@Cacheable()` or explicit cache manager calls.

---

## 12. Testing Strategy

### Decision: Replace Mock Factories

**Unit tests**: Replace `repositoryMockFactory` and `MockEntityManagerProvider` with a `mockDrizzleProvider`:

```typescript
export const createMockDrizzle = () => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  transaction: vi.fn(async (fn) => fn(createMockDrizzle())),
  query: {/* table-specific mocks */},
});
```

**Integration tests**: Replace TypeORM test database setup with Drizzle + postgres.js test connection.

---

## 13. Known Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Cascade removal requires touching 50 entity service files | High | Systematic per-module migration; test each module in isolation |
| Eager loading removal may miss queries | Medium | Grep for all entity access patterns; integration tests catch missing relations |
| `simple-array` behavior mismatch | Low | Use `customType()` for exact TypeORM-compatible serialization |
| VersionColumn optimistic locking not automatic | Medium | Centralized update helper enforces version checking |
| postgres.js connection behavior differs from pg | Low | Integration tests validate connection pooling under load |
| QueryBuilder patterns (67 usages) need full rewrite | Medium | Map each pattern to Drizzle SQL-like query builder equivalent |
