# Quickstart: File Service Migration to Go

**Branch**: `085-file-service-migration` | **Date**: 2026-04-08

## Overview

Replace direct document DB writes and local file storage with HTTP calls to the Go file-service-go. The server becomes a read-only consumer of the `document` table. All file operations delegate to `http://file-service:4003/internal/document/*`.

## Key Integration Points

### 1. FileServiceAdapter (New)
**Where**: `src/services/adapters/file-service-adapter/`
**What**: HTTP client calling Go service internal API. Uses `@nestjs/axios` with RxJS timeout/retry pattern (matching WingbackManager).
**Methods**:
- `createDocument(file, metadata)` -> `POST /internal/document` (multipart)
- `getDocumentContent(id)` -> `GET /internal/document/{id}/content`
- `updateDocument(id, patch)` -> `PATCH /internal/document/{id}`
- `deleteDocument(id)` -> `DELETE /internal/document/{id}`

### 2. StorageBucketService Upload Rewire
**Where**: `src/domain/storage/storage-bucket/storage.bucket.service.ts`
**What**: Replace `uploadFileAsDocumentFromBuffer()` internals:
- Remove: `documentService.uploadFile()` (local storage save)
- Remove: `documentService.createDocument()` (DB insert)
- Remove: image conversion/compression calls
- Add: `fileServiceAdapter.createDocument()` with file buffer + metadata
- Keep: MIME/size validation (also validated by Go service as defense-in-depth)
- Keep: Deduplication check via DB read (document with same externalID in bucket)

### 3. DocumentService Delete Rewire
**Where**: `src/domain/storage/document/document.service.ts`
**What**: Replace `deleteDocument()` internals:
- Remove: `documentRepository.remove()` (DB delete)
- Remove: `removeFile()` (local storage delete)
- Add: `fileServiceAdapter.deleteDocument()` -> returns `{authorizationId, tagsetId}`
- Keep: Auth policy delete + tagset delete (using IDs from Go service response)

### 4. TemporaryStorageService Rewire
**Where**: `src/services/infrastructure/temporary-storage/temporary.storage.service.ts`
**What**: Replace direct document entity updates:
- Remove: `document.storageBucket = destination; document.temporaryLocation = false; documentService.save()`
- Add: `fileServiceAdapter.updateDocument(docId, {storageBucketId, temporaryLocation: false})`

### 5. VisualService Upload Simplification
**Where**: `src/domain/common/visual/visual.service.ts`
**What**: Remove image processing, delegate to Go service:
- Remove: `imageConversionService.convertIfNeeded()` call
- Remove: `imageCompressionService.compressIfNeeded()` call
- Keep: stream -> buffer conversion
- Keep: dimension validation (Go service doesn't validate visual type constraints)
- Change: Upload buffer directly via `storageBucketService.uploadFileAsDocumentFromBuffer()` (which now delegates to Go service)

### 6. ProfileDocumentsService Rewire
**Where**: `src/domain/profile-documents/profile.documents.service.ts`
**What**: Replace cross-bucket document copy:
- Remove: Direct document entity copy with same externalID
- Add: Fetch content from Go service -> upload to new bucket via Go service -> delete old

### 7. FileIntegrationService Removal
**Where**: `src/services/file-integration/`
**What**: Delete entirely. The Go file-service-go serves files directly using the authorization-evaluation-service for auth checks. No RMQ intermediary needed.

### 8. LocalStorageAdapter Removal
**Where**: `src/services/adapters/storage/`
**What**: Delete `local-storage/`, `storage.service.interface.ts`, `storage.service.provider.ts`. No local file I/O in the server.

### 9. Image Processing Services Removal
**Where**: `src/domain/common/visual/image.conversion.service.ts`, `src/domain/common/visual/image.compression.service.ts`
**What**: Delete both. Go service handles HEIC->JPEG + compression via govips.

## Testing Strategy

- Unit tests: Mock FileServiceAdapter, verify correct HTTP calls are made
- Integration test: Upload file via GraphQL -> verify Go service received it
- Delete test: Delete document -> verify Go service deleted + server cleaned up auth/tagset
- Temporary document test: Create temp -> move to permanent -> verify PATCH called
- Failure test: Go service down -> verify clean error, no partial state
