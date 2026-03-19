# Data Model: Authorization Reset Performance Optimization

**Feature**: 042-auth-reset-optimization
**Date**: 2026-03-19

## Entity Changes

### No new entities

This feature modifies behavior and indexing on existing entities. No new database tables are introduced.

---

## Index Additions

### 1. Visual — `mediaGalleryId` FK Index

**Entity**: `Visual` (`src/domain/common/visual/visual.entity.ts`)
**Table**: `visual`
**Column**: `mediaGalleryId` (auto-generated FK from `@ManyToOne(() => MediaGallery)`)

```sql
CREATE INDEX "IDX_visual_mediaGalleryId" ON "visual" ("mediaGalleryId");
```

**Existing indexes on `visual`**:
- `IDX_visual_profileId` on `profileId` — already present via `@Index('IDX_visual_profileId', ['profile'])`

**Change**: Add `@Index('IDX_visual_mediaGalleryId', ['mediaGallery'])` decorator to entity class.

---

### 2. Document — `tagsetId` FK Index

**Entity**: `Document` (`src/domain/storage/document/document.entity.ts`)
**Table**: `document`
**Column**: `tagsetId` (auto-generated FK from `@OneToOne(() => Tagset)` with `@JoinColumn()`)

```sql
CREATE INDEX "IDX_document_tagsetId" ON "document" ("tagsetId");
```

**Existing indexes on `document`**: None at entity level.

**Change**: Add `@Index('IDX_document_tagsetId', ['tagset'])` decorator to entity class.

---

## Migration

**File**: `src/migrations/<timestamp>-AddIndexVisualMediaGalleryIdDocumentTagsetId.ts`
**Timestamp**: Must follow after `1773750234583` (latest existing migration)

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexVisualMediaGalleryIdDocumentTagsetId<TIMESTAMP>
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_visual_mediaGalleryId" ON "visual" ("mediaGalleryId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_tagsetId" ON "document" ("tagsetId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_document_tagsetId"`);
    await queryRunner.query(`DROP INDEX "IDX_visual_mediaGalleryId"`);
  }
}
```

**Reversibility**: Both indexes can be dropped without data loss.

---

## Interface Changes

### AuthResetEventPayload — Batch Extension

**File**: `src/services/auth-reset/auth-reset.payload.interface.ts`

```typescript
// Current
export interface AuthResetEventPayload {
  type: RESET_EVENT_TYPE;
  id: string;
  task: string;
}

// New (backward-compatible extension)
export interface AuthResetEventPayload {
  type: RESET_EVENT_TYPE;
  id: string;        // Retained for backward compatibility during rolling deploy
  ids?: string[];     // Batch of entity IDs (handler prefers this over `id`)
  task: string;
}
```

**Handler resolution**: `const entityIds = payload.ids ?? [payload.id];`

---

## Configuration Addition

**File**: `alkemio.yml`

```yaml
authorization:
  chunk: ${AUTHORIZATION_CHUNK_SIZE}:1000      # existing
  batch_size: ${AUTHORIZATION_BATCH_SIZE}:50   # new — entities per RabbitMQ message
```

**AlkemioConfig type**: Add `batch_size: number` to the `authorization` config interface.

---

## Service Method Changes (Signatures Only)

### AuthorizationPolicyService — New `bulkUpdate()` Method

```typescript
/**
 * Bulk UPDATE authorization policies using CASE-based SQL.
 * Falls back to chunked save() if the batch is heterogeneous.
 */
async bulkUpdate(
  policies: IAuthorizationPolicy[]
): Promise<void>;
```

### StorageBucketAuthorizationService — Return Pattern Change

```typescript
// Before: saves internally, returns []
async applyAuthorizationPolicy(...): Promise<IAuthorizationPolicy[]>; // returns []

// After: returns collected policies, caller persists
async applyAuthorizationPolicy(...): Promise<IAuthorizationPolicy[]>; // returns policies
```

### DocumentAuthorizationService — Return Pattern Change

```typescript
// Before: saves internally, returns []
async applyAuthorizationPolicy(...): Promise<IAuthorizationPolicy[]>; // returns []

// After: returns collected policies, caller persists
async applyAuthorizationPolicy(...): Promise<IAuthorizationPolicy[]>; // returns policies
```

---

## Validation Rules

| Constraint | Entity/Config | Rule |
|-----------|---------------|------|
| Batch size minimum | `authorization.batch_size` | Must be ≥ 1 |
| Batch size maximum | `authorization.batch_size` | No hard upper limit; default 50 |
| Index names | Migration | Must follow `IDX_<table>_<column>` convention |
| Payload backward compat | `AuthResetEventPayload` | `ids` is optional; `id` always present |
| Idempotency | Batch handlers | Re-processing same entity produces identical output |
