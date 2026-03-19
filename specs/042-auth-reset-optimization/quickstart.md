# Quickstart: Authorization Reset Performance Optimization

**Feature**: 042-auth-reset-optimization
**Date**: 2026-03-19

## Prerequisites

- Services running: `pnpm run start:services` (PostgreSQL, RabbitMQ, Redis, Kratos)
- Database migrated: `pnpm run migration:run`
- Seed data loaded (for meaningful batch testing)

## Story Implementation Order

Stories can be implemented in any order except Story 5 (requires Story 1):

```
Story 3 (Indexes)     ─── independent
Story 2 (Split Query) ─── independent
Story 4 (saveAll)     ─── independent
Story 1 (Batching)    ─── independent
Story 5 (Bulk UPDATE) ─── requires Story 1
```

**Recommended sequence**: 3 → 4 → 2 → 1 → 5 (low risk to high risk)

## Per-Story Development Notes

### Story 3: Add Missing Database Indexes

**Files to modify**:
- `src/domain/common/visual/visual.entity.ts` — add `@Index('IDX_visual_mediaGalleryId', ['mediaGallery'])`
- `src/domain/storage/document/document.entity.ts` — add `@Index('IDX_document_tagsetId', ['tagset'])`

**Generate migration**:
```bash
pnpm run migration:generate -n AddIndexVisualMediaGalleryIdDocumentTagsetId
```

**Verify**:
```bash
pnpm run migration:run
# Then connect to PostgreSQL and run:
# EXPLAIN ANALYZE SELECT * FROM visual WHERE "mediaGalleryId" = '<uuid>';
# EXPLAIN ANALYZE SELECT * FROM document WHERE "tagsetId" = '<uuid>';
```

### Story 4: Eliminate Redundant saveAll() Cascades

**Files to modify**:
- `src/domain/storage/document/document.service.authorization.ts` — remove `saveAll()` call, return collected policies instead of `[]`
- `src/domain/storage/storage-bucket/storage.bucket.service.authorization.ts` — remove `saveAll()` call, return collected policies instead of `[]`

**Verify**: Run existing unit tests, then trigger auth reset and confirm policy state is identical.

```bash
pnpm test -- src/domain/storage/document/document.service.authorization
pnpm test -- src/domain/storage/storage-bucket/storage.bucket.service.authorization
```

### Story 2: Split Deep Nested Profile Query

**Files to modify**:
- `src/domain/common/profile/profile.service.authorization.ts` — replace single deep-join query with 3 focused queries

**Verify**: Auth reset produces identical policy state. Memory usage should decrease for profiles with many child entities.

```bash
pnpm test -- src/domain/common/profile/profile.service.authorization
```

### Story 1: Batch Authorization Reset Messaging

**Files to modify**:
- `src/services/auth-reset/auth-reset.payload.interface.ts` — add `ids?: string[]`
- `src/services/auth-reset/publisher/auth-reset.service.ts` — batch entity IDs into chunks
- `src/services/auth-reset/subscriber/auth-reset.controller.ts` — handle batch payloads with per-entity error handling
- `alkemio.yml` — add `batch_size` config
- Config type interface — add `batch_size` to authorization config

**Verify**: Trigger full auth reset, check RabbitMQ management UI for message count reduction.

```bash
pnpm test -- src/services/auth-reset
```

### Story 5: Bulk UPDATE for Authorization Policies

**Files to modify**:
- `src/domain/common/authorization-policy/authorization.policy.service.ts` — add `bulkUpdate()` method
- `src/services/auth-reset/subscriber/auth-reset.controller.ts` — use `bulkUpdate()` in batch handler

**Verify**: Auth reset produces identical policy state with fewer DB round-trips.

```bash
pnpm test -- src/domain/common/authorization-policy/authorization.policy.service
```

## Testing Strategy

### Unit Tests

- Batch message construction (chunking logic)
- Split query produces same authorization policy output
- `bulkUpdate()` generates correct SQL
- Consolidated saveAll (services return policies instead of persisting)

### Integration Tests (manual)

1. Start services: `pnpm run start:services`
2. Start server: `pnpm start:dev`
3. Trigger auth reset via GraphQL:
   ```graphql
   mutation {
     authorizationPolicyResetAll
   }
   ```
4. Monitor RabbitMQ management UI (http://localhost:15672) for message count
5. Verify task completion via existing task polling

### Performance Verification

Compare before/after on a seeded database:
- **Message count**: Check RabbitMQ message rate during reset
- **Wall-clock time**: Time from mutation call to task completion
- **DB round-trips**: Enable PostgreSQL query logging and count UPDATE statements
- **Memory**: Monitor Node.js heap during profile auth loading

## Configuration Reference

| Config Key | Env Var | Default | Purpose |
|-----------|---------|---------|---------|
| `authorization.chunk` | `AUTHORIZATION_CHUNK_SIZE` | 1000 | Policies per DB save batch |
| `authorization.batch_size` | `AUTHORIZATION_BATCH_SIZE` | 50 | Entity IDs per RabbitMQ message |
