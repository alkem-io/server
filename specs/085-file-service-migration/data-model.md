# Data Model: File Service Migration to Go

**Branch**: `085-file-service-migration` | **Date**: 2026-04-08

## Entity Changes

### Rename `document` → `file`

The migration changes the *ownership* of the table and *renames* it from `document` to `file` (matching the terminology used by the Go file-service-go). Schema is otherwise unchanged. The Go file-service-go becomes the writer; the server becomes read-only.

The rename is performed by a non-destructive `ALTER TABLE "document" RENAME TO "file"` migration (`RenameDocumentTableToFile1776778800000`); all existing rows and foreign key constraints (which use hashed names, not the table name) are preserved automatically.

The server's TypeORM entity class remains `Document` for API continuity; only its `@Entity('file')` decorator changes, together with the `IDX_file_storageBucketId` index name.

### Ownership Transfer

| Entity | Before | After |
|--------|--------|-------|
| `file` (renamed from `document`) | Server: full CRUD | Server: read-only (SELECT). Go service: full CRUD (INSERT/UPDATE/DELETE) |
| `storage_bucket` | Server: full CRUD | Server: full CRUD (unchanged) |
| `authorization_policy` (for documents) | Server: full CRUD | Server: full CRUD (unchanged -- created before upload, cleaned up after delete) |
| `tagset` (for documents) | Server: full CRUD | Server: full CRUD (unchanged -- created before upload, cleaned up after delete) |

### New Server-Side Component

**FileServiceAdapter** -- HTTP client adapter (not a database entity). Lives in `src/services/adapters/file-service-adapter/`. Extends the reusable `HttpClientBase` (`src/common/http/http.client.base.ts`), which provides the `sendRequest` pipeline (timeout + retry + circuit breaker + pluggable error translation). The circuit breaker is a separate framework-agnostic state machine in `src/common/http/circuit.breaker.ts` so future outbound adapters can reuse it.

| Field | Type | Source |
|-------|------|--------|
| `baseUrl` | string | Config: `storage.file_service.url` (consumed by `HttpClientBase`) |
| `timeout` | number | Config: `storage.file_service.timeout` (consumed by `HttpClientBase`) |
| `retries` | number | Config: `storage.file_service.retries` (consumed by `HttpClientBase`) |
| `enabled` | boolean | Config: `storage.file_service.enabled` (adapter-local) |
| circuit breaker config | `{ failureThreshold, resetTimeMs }` | Hard-coded: `{ 5, 30_000 }` in `FileServiceAdapter` constructor |

Request/response DTOs live in `src/services/adapters/file-service-adapter/dto/`, one interface per file (`CreateDocumentMetadata`, `CreateDocumentResult`, `DeleteDocumentResult`, `UpdateDocumentInput`, `UpdateDocumentResult`), re-exported via `dto/index.ts`.

### Server-Side Write Guard

`DocumentWriteGuard` (`src/domain/storage/document/document.write.guard.ts`) — a TypeORM `@EventSubscriber` that listens on the `Document` entity and throws on any `beforeInsert` / `beforeUpdate` / `beforeRemove` event. This provides defense-in-depth: any accidental write path from server code fails loudly at runtime with a message pointing to the correct `FileServiceAdapter` method.

## File Table (Reference -- Renamed from `document`, Schema Unchanged)

| Column | Type | Owner (Write) | Server Access |
|--------|------|---------------|---------------|
| `id` | UUID (PK) | Go service (UUIDv7) | Read |
| `externalID` | string | Go service (SHA3-256 hash) | Read |
| `mimeType` | string | Go service | Read |
| `size` | int | Go service | Read |
| `displayName` | string | Go service | Read |
| `createdBy` | UUID (nullable) | Go service (passed from server) | Read |
| `temporaryLocation` | bool | Go service | Read |
| `storageBucketId` | UUID (FK) | Go service (passed from server) | Read |
| `authorizationId` | UUID (FK) | Go service (passed from server) | Read (+ create/delete the referenced entity) |
| `tagsetId` | UUID (FK, nullable) | Go service (passed from server) | Read (+ create/delete the referenced entity) |
| `createdDate` | timestamp | Go service | Read |
| `updatedDate` | timestamp | Go service | Read |
| `version` | int | Go service (optimistic locking) | Read |

## Operation Flow Changes

### Upload Flow

```
Before:
  GraphQL mutation → stream → buffer → ImageConversion → ImageCompression
  → LocalStorage.save() → Document INSERT → return URL

After:
  GraphQL mutation → stream → buffer
  → Server creates AuthorizationPolicy + Tagset
  → POST /internal/file (multipart: file + metadata + authorizationId + tagsetId)
  → Go service: stores file, processes images, inserts document
  → Server receives {id, externalID, mimeType, size}
  → Server constructs URL from document ID
  → return URL
```

### Delete Flow

```
Before:
  GraphQL mutation → Document SELECT → LocalStorage.delete()
  → AuthorizationPolicy DELETE → Tagset DELETE → Document DELETE

After:
  GraphQL mutation
  → DELETE /internal/file/{id}
  → Go service: deletes document record + file (if not shared)
  → Go service returns {authorizationId, tagsetId}
  → Server: AuthorizationPolicy DELETE → Tagset DELETE
```

### Temporary Document Move Flow

```
Before:
  Server: Document UPDATE (storageBucketId, temporaryLocation = false)

After:
  PATCH /internal/file/{id} with {storageBucketId, temporaryLocation: false}
  → Go service: updates document record (optimistic locking)
```

## Removed Components

| Component | Location | Reason |
|-----------|----------|--------|
| LocalStorageAdapter | `src/services/adapters/storage/local-storage/` | Go service handles file storage |
| StorageServiceInterface | `src/services/adapters/storage/storage.service.interface.ts` | No longer needed |
| StorageServiceProvider | `src/services/adapters/storage/storage.service.provider.ts` | No longer needed |
| ImageConversionService | `src/domain/common/visual/image.conversion.service.ts` | Go service handles via govips |
| ImageCompressionService | `src/domain/common/visual/image.compression.service.ts` | Go service handles via govips |
| FileIntegrationService | `src/services/file-integration/` | Go service serves files directly |
| FileIntegrationController | `src/services/file-integration/` | Go service serves files directly |
