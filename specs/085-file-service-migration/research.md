# Research: File Service Migration to Go

**Branch**: `085-file-service-migration` | **Date**: 2026-04-08

## Research Findings

### 1. HTTP Client Pattern for FileServiceAdapter

**Decision**: Use `@nestjs/axios` HttpService with RxJS operators, matching the WingbackManager pattern.

**Rationale**: The server already uses `@nestjs/axios` (axios ^1.12.2) in WingbackManager and GeoLocationService. The pattern uses `timeout()`, `retry()`, `catchError()`, `map()`, and `firstValueFrom()` RxJS operators. This is well-tested in the codebase and consistent with NestJS conventions.

**Alternatives considered**:
- Raw `axios` import (used in AvatarCreatorService) -- Rejected. No timeout/retry infrastructure, not injectable/testable.
- AMQP RPC like CommunicationAdapter -- Rejected. The Go file-service exposes HTTP API, not AMQP.
- Built-in `node:http` -- Rejected. No retry/timeout patterns built in, more boilerplate.

### 2. Upload Delegation Strategy

**Decision**: Replace the `uploadFileAsDocumentFromBuffer()` flow. After the server converts the GraphQL upload stream to a Buffer, it sends the buffer as multipart/form-data to `POST /internal/document` on the Go service. The Go service handles file storage, MIME detection, image processing, and document record creation.

**Rationale**: The current flow is: stream -> buffer -> image conversion -> image compression -> storage save -> DB insert. The Go service handles steps 3-6 internally (govips for image processing, content-addressed storage, atomic DB insert). The server only needs to do: stream -> buffer -> HTTP POST to Go service.

**Key change**: The server no longer calls `documentService.uploadFile()` (local storage save) or `documentService.createDocument()` (DB insert). Instead, it calls `fileServiceAdapter.createDocument()` which returns `{id, externalID, mimeType, size}`.

### 3. Authorization Policy and Tagset Lifecycle

**Decision**: Server creates auth policy and tagset BEFORE calling Go service. Passes their IDs in the POST request. On Go service failure, server rolls back by deleting the pre-created entities.

**Rationale**: The Go service needs `authorizationId` and `tagsetId` as foreign keys in the document record. Creating them first is simpler -- rolling back lightweight DB rows on HTTP failure is trivial. The reverse (rolling back a Go-created document via DELETE) is more complex and error-prone.

**Current flow** (document.service.ts:38-52):
1. Create tagset via TagsetService
2. Create AuthorizationPolicy with type DOCUMENT
3. Save document with both references

**New flow**:
1. Create tagset via TagsetService
2. Create AuthorizationPolicy with type DOCUMENT
3. Call Go service POST /internal/document with tagsetId + authorizationId
4. On success: use returned document ID for URL construction
5. On failure: delete tagset and auth policy (rollback)

### 4. Document Deletion Coordination

**Decision**: Server calls Go service DELETE first, then cleans up auth policy and tagset using IDs returned in the response.

**Rationale**: The Go service's `DELETE /internal/document/{id}` response includes `{authorizationId, tagsetId}`. The server needs these to clean up. Order: Go service delete (removes document record + file) -> server delete auth policy -> server delete tagset.

**Current flow** (document.service.ts:54-85):
1. Fetch document with tagset relation
2. (Optionally) remove file from local storage
3. Delete authorization policy
4. Delete tagset
5. Remove document from DB

**New flow**:
1. Call Go service DELETE /internal/document/{id}
2. From response, get authorizationId and tagsetId
3. Delete authorization policy locally
4. Delete tagset locally

### 5. Temporary Document Move

**Decision**: Use Go service's `PATCH /internal/document/{id}` with `{storageBucketId, temporaryLocation: false}`.

**Rationale**: The current `TemporaryStorageService.moveTemporaryDocuments()` directly updates the document entity in DB (sets storageBucket and temporaryLocation). The Go service's PATCH endpoint supports exactly these fields with optimistic locking.

### 6. Image Processing Removal

**Decision**: Remove `ImageConversionService` (heic-convert) and `ImageCompressionService` (sharp) from the server. The Go service handles all image processing via govips.

**Rationale**: The Go service automatically converts HEIC->JPEG, compresses images, strips EXIF, and resizes during `POST /internal/document`. The server passes `allowedMimeTypes` to let the Go service validate. No server-side image processing needed.

**Dependencies to remove**:
- `heic-convert` package (HEIC conversion)
- `sharp` package (image compression/resize)
- `image-size` package (dimension checking) -- may still be needed for visual dimension validation before upload

**Note**: Visual dimension validation (`getImageDimensions()`) may need to stay if the Go service doesn't validate image dimensions against visual type constraints. The Go service validates MIME and file size but not image dimensions per visual type.

### 7. FileIntegrationService Removal

**Decision**: Remove `FileIntegrationService` (RMQ handler on MessagingQueue.FILES). The Go file-service-go handles file serving directly via its public endpoint with JWT auth + h2c auth evaluation.

**Rationale**: The old TypeScript file-service queried the server via RMQ to check authorization before serving files. The new Go service uses the authorization-evaluation-service directly (via h2c HTTP/2). No RMQ intermediary needed.

### 8. Document Re-upload Between Buckets

**Decision**: For cross-bucket document moves, the server fetches content from Go service (`GET /internal/document/{id}/content`), then uploads to new bucket (`POST /internal/document` with new bucket ID), then deletes old document (`DELETE /internal/document/{id}`).

**Rationale**: The Go service doesn't have a "move document between buckets" endpoint. The three-step approach (get content -> create new -> delete old) is explicit and handles all cases including cross-storage scenarios.

**Alternative considered**: Direct PATCH with new storageBucketId -- Works for temp->permanent moves but doesn't create a new document record with a new ID, which is needed when re-uploading to a different bucket with different authorization.

### 9. Configuration

**Decision**: Add `FILE_SERVICE_URL` to alkemio.yml configuration. Default: `http://file-service:4003`. Add timeout and retry settings.

**Configuration keys**:
- `storage.file_service.url` - Go service base URL (default: http://file-service:4003)
- `storage.file_service.timeout` - HTTP timeout in ms (default: 30000 -- file uploads can be large)
- `storage.file_service.retries` - Retry count for transient errors (default: 2)
- `storage.file_service.enabled` - Feature flag for gradual rollout (default: true)
