# Data Model: File Service Migration to Go

**Branch**: `085-file-service-migration` | **Date**: 2026-04-08

## Entity Changes

### No New Database Entities Required

The migration changes the *ownership* of the `document` table, not its schema. The Go file-service-go becomes the writer; the server becomes read-only.

### Ownership Transfer

| Entity | Before | After |
|--------|--------|-------|
| `document` | Server: full CRUD | Server: read-only (SELECT). Go service: full CRUD (INSERT/UPDATE/DELETE) |
| `storage_bucket` | Server: full CRUD | Server: full CRUD (unchanged) |
| `authorization_policy` (for documents) | Server: full CRUD | Server: full CRUD (unchanged -- created before upload, cleaned up after delete) |
| `tagset` (for documents) | Server: full CRUD | Server: full CRUD (unchanged -- created before upload, cleaned up after delete) |

### New Server-Side Component

**FileServiceAdapter** -- HTTP client adapter (not a database entity). Lives in `src/services/adapters/file-service-adapter/`.

| Field | Type | Source |
|-------|------|--------|
| `baseUrl` | string | Config: `storage.file_service.url` |
| `timeout` | number | Config: `storage.file_service.timeout` |
| `retries` | number | Config: `storage.file_service.retries` |
| `enabled` | boolean | Config: `storage.file_service.enabled` |

## Document Table (Reference -- No Schema Changes)

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
  → POST /internal/document (multipart: file + metadata + authorizationId + tagsetId)
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
  → DELETE /internal/document/{id}
  → Go service: deletes document record + file (if not shared)
  → Go service returns {authorizationId, tagsetId}
  → Server: AuthorizationPolicy DELETE → Tagset DELETE
```

### Temporary Document Move Flow

```
Before:
  Server: Document UPDATE (storageBucketId, temporaryLocation = false)

After:
  PATCH /internal/document/{id} with {storageBucketId, temporaryLocation: false}
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
