# Transaction Pattern Audit

**Feature**: 034-drizzle-migration
**Date**: 2026-02-13
**Purpose**: Catalog all transaction usage sites before service migration begins.

## Summary

**Zero explicit transaction patterns** found in application source code (`src/` excluding `migrations/`).

The codebase does NOT use:
- `entityManager.transaction()`
- `manager.transaction()`
- `queryRunner.startTransaction()`
- Nested transactions / savepoints

All `QueryRunner` usage is confined to TypeORM migration files (`src/migrations/`), which are not affected by the Drizzle migration.

## Implicit Multi-Entity Operations

While no explicit transactions exist, the following patterns involve multiple database operations that are **not** wrapped in transactions. These represent the same risk level under both TypeORM and Drizzle.

### Bulk Save Operations (2 services)

| File | Line | Method | Pattern | Scope |
|---|---|---|---|---|
| `src/domain/common/authorization-policy/authorization.policy.service.ts` | 194 | `saveAll()` | `repository.save(items, { chunk: authChunkSize })` | Multi-entity, chunked batches |
| `src/domain/common/license/license.service.ts` | 91 | `saveAll()` | `repository.save(items, { chunk: 100 })` | Multi-entity, chunked batches |

**Drizzle equivalent**: Loop with `db.insert().values(chunk)` or single `db.insert().values(allItems)`. No transaction wrapping needed (matches current behavior).

### Multi-Entity Array Saves (1 instance)

| File | Line | Pattern | Scope |
|---|---|---|---|
| `src/domain/communication/conversation/conversation.service.ts` | 107 | `repository.save([membership1, membership2])` | 2 conversation memberships |

**Drizzle equivalent**: `db.insert(conversationMemberships).values([m1, m2])` — single INSERT statement.

### Complex Multi-Step Delete Operations

| File | Lines | Method | Operations | Scope |
|---|---|---|---|---|
| `src/domain/space/space/space.service.ts` | 364-387 | `deleteSpace()` | 6+ sequential deletes | Multi-entity aggregate |
| `src/domain/collaboration/collaboration/collaboration.service.ts` | 302-320 | `deleteCollaboration()` | 5+ sequential deletes | Multi-entity aggregate |

**Drizzle equivalent**: Same sequential `db.delete()` calls. These rely on database-level `ON DELETE CASCADE`/`SET NULL` for child cleanup. No transaction wrapping needed (matches current behavior).

### EntityManager.getRepository Cross-Aggregate Queries (4 instances)

| File | Line | Pattern | Scope |
|---|---|---|---|
| Multiple service files | Various | `this.entityManager.findOne(Entity, {...})` | Single-entity reads |

**Drizzle equivalent**: `db.query.entities.findFirst({...})` — read-only, no transaction needed.

## Conclusion

**Impact on migration**: NONE. Since the codebase has zero explicit transactions, Phase 4 service migration does not need to translate any transaction patterns. All multi-entity operations are either:
1. Individual sequential saves (same pattern in Drizzle)
2. Bulk array saves (single INSERT in Drizzle)
3. Cascade deletes handled at database level (unchanged)

The `db.transaction()` API is available in Drizzle if future work needs to add transactional guarantees to currently non-transactional operations.
