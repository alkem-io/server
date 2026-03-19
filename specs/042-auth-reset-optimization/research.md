# Research: Authorization Reset Performance Optimization

**Feature**: 042-auth-reset-optimization
**Date**: 2026-03-19

## 1. Batch Message Payload Design

**Decision**: Extend `AuthResetEventPayload` to support an `ids: string[]` array field alongside the existing `id: string` field.

**Rationale**: The current payload (`{ id, type, task }`) emits one message per entity. Adding an `ids` array enables grouping up to 50 entity IDs per message. Keeping the `id` field allows backward compatibility during rolling deployments (handler checks `ids` first, falls back to `[id]`). RabbitMQ message size is not a concern — 50 UUIDs ≈ 1.8 KB payload, well within the default 128 MB frame size.

**Alternatives considered**:
- *New event types (e.g., `BATCH_AUTHORIZATION_RESET_ACCOUNT`)*: Rejected — doubles the number of event patterns and handlers without benefit. A single handler can detect batch vs. single from the payload.
- *Separate batch queue*: Rejected — adds operational complexity. The existing `alkemio-auth-reset` queue handles both patterns with the same consumer.

## 2. Split Profile Query Strategy

**Decision**: Replace the single deep LEFT JOIN in `ProfileAuthorizationService.applyAuthorizationPolicy()` with 3 focused queries:
1. Profile + `authorization` (the profile's own auth policy)
2. `references` + `tagsets` + `visuals` with their `authorization` relations (shallow one-level joins, no cartesian product risk since these are independent branches)
3. `storageBucket` + `documents` + `documents.tagset` with all `authorization` relations (two-level depth, but on a single branch — no cross-branch explosion)

**Rationale**: The current query joins 6+ relation branches in a single SQL statement. When a profile has N references, M tagsets, K visuals, and D documents, the intermediate result set is N×M×K×D rows (cartesian product across independent branches). Splitting into independent queries reduces this to N+M+K+D rows total. TypeORM generates separate SQL statements per `findOne()` call, so the split is achieved by making 3 calls with different `relations` configs.

**Alternatives considered**:
- *One query per relation type (6 queries)*: Rejected — excessive round-trips. Grouping by depth (shallow children vs. deep children) balances round-trips against cartesian risk.
- *QueryBuilder with subqueries*: Rejected — adds complexity over TypeORM's `relations` API without clear benefit, since the performance gain comes from eliminating cross-branch joins, not from query builder features.
- *Lazy loading*: Rejected — NestJS/TypeORM lazy loading triggers N+1 per access, worse than the current approach.

## 3. Missing Database Indexes

**Decision**: Add two indexes via a single migration:
- `IDX_visual_mediaGalleryId` on `visual.mediaGalleryId`
- `IDX_document_tagsetId` on `document.tagsetId`

**Rationale**: Both are FK columns used in JOIN conditions during profile authorization loading. `visual.profileId` is already indexed (`IDX_visual_profileId`), but `visual.mediaGalleryId` (ManyToOne to MediaGallery) has no index. `document.tagsetId` (OneToOne JoinColumn to Tagset) has no index. Without indexes, PostgreSQL falls back to sequential scans on these columns during the auth reset cascade. Insert/update frequency on these tables is low relative to the auth reset read load, so index maintenance overhead is negligible.

**Alternatives considered**:
- *Composite indexes*: Rejected — the FK columns are used in simple equality joins, not multi-column WHERE clauses. Single-column indexes are sufficient.
- *Partial indexes*: Rejected — no filtering predicate applies; all rows need indexing.

## 4. Consolidating saveAll() Cascades

**Decision**: Remove `saveAll()` calls from `DocumentAuthorizationService` and `StorageBucketAuthorizationService`. Both services will return their collected `IAuthorizationPolicy[]` arrays to the caller instead of persisting internally and returning `[]`.

**Rationale**: Currently, `DocumentAuthorizationService.applyAuthorizationPolicy()` calls `saveAll()` and returns `[]`. `StorageBucketAuthorizationService` does the same after aggregating document results. The top-level handler (`AuthResetController`) then calls `saveAll()` on whatever is returned. This creates 2-3 separate database transactions per entity cascade. By deferring persistence to the single top-level `saveAll()`, all authorization policies for an entity tree are persisted in one batch, reducing DB round-trips by ≥50%.

**Alternatives considered**:
- *Keep intermediate saves but skip top-level*: Rejected — the current pattern already works this way (leaf services return `[]`), but the intermediate saves are still unnecessary round-trips.
- *Transaction wrapper at top level*: Rejected — TypeORM `save()` with `chunk` already handles transactional batching. Adding an explicit transaction adds complexity without benefit since auth reset is idempotent.

## 5. Bulk UPDATE for Authorization Policies

**Decision**: Add a `bulkUpdate()` method to `AuthorizationPolicyService` that uses TypeORM QueryBuilder to issue `UPDATE authorization_policy SET credentialRules = CASE id WHEN ... END, privilegeRules = CASE id WHEN ... END WHERE id IN (...)` statements for batch persistence.

**Rationale**: TypeORM's `save()` issues one `SELECT` + one `UPDATE` per entity (to detect changes). For a batch of 50 users, each with ~10 authorization policies, that's ~500 individual UPDATE statements. A bulk UPDATE using CASE expressions reduces this to a single statement per batch. PostgreSQL handles JSONB column updates efficiently in bulk.

**Alternatives considered**:
- *Raw SQL via QueryRunner*: Considered viable but rejected for maintainability — QueryBuilder provides type safety and parameterization. The CASE-based bulk UPDATE is expressible via QueryBuilder.
- *TypeORM `save()` with larger chunk size*: Rejected — `save()` still issues per-entity UPSERTs regardless of chunk size. The chunk parameter controls how many entities are sent per database call, but each entity still gets its own SQL statement within the call.
- *PostgreSQL `unnest()` + `UPDATE FROM`*: Rejected — requires raw SQL and is PostgreSQL-specific. The CASE-based approach works with TypeORM's QueryBuilder abstraction.

## 6. Batch Size Configuration

**Decision**: Single global batch size (default: 50) configured via `alkemio.yml` at path `authorization.batch_size`, backed by environment variable `AUTHORIZATION_BATCH_SIZE`.

**Rationale**: Per the spec clarification, a single global value applied uniformly to all entity types. Placed alongside the existing `authorization.chunk` config (default: 1000) for discoverability. The batch size controls RabbitMQ message grouping (how many entity IDs per message), while chunk size controls DB persistence batching (how many policies per `save()` call) — these are orthogonal concerns.

**Alternatives considered**:
- *Per-entity-type batch size*: Rejected per spec clarification — adds configuration complexity without demonstrated need.
- *Dynamic batch sizing based on entity count*: Rejected — adds implementation complexity. Fixed batch size is predictable and debuggable.

## 7. Error Handling in Batch Handlers

**Decision**: On individual entity failure within a batch, the handler catches the error, logs it, retries the failing entity in-process (up to 5 retries), and ACKs the RabbitMQ message. Persistent failures are logged via `TaskService.updateTaskErrors()`. The remaining entities in the batch continue processing unaffected.

**Rationale**: Per spec clarification, the handler ACKs the message regardless. Failed entities are retried internally (in-process retry loop), not via RabbitMQ redelivery. This prevents a single bad entity from blocking an entire batch of 50. The existing retry header pattern (`x-retry-count`) applies to whole-message failures (e.g., handler crash); within-batch failures use a simpler in-process retry.

**Alternatives considered**:
- *NACK and requeue the entire message*: Rejected — would reprocess all 50 entities when only 1 failed.
- *Dead letter queue for failed entities*: Rejected per spec — adds infrastructure complexity. In-process retry with logging is sufficient for an admin background operation.
