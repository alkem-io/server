# Feature Specification: File Service Migration to Go

**Feature Branch**: `085-file-service-migration`
**Created**: 2026-04-08
**Status**: Draft
**Input**: User description: "Migrate server document/file operations to use the new Go file-service-go internal HTTP API instead of direct database writes and local storage."

## Clarifications

### Session 2026-04-08

- Q: Should the server create authorization_policy/tagset BEFORE or AFTER calling the Go service to create the document? → A: Before. Server creates auth policy + tagset first, then calls Go service with their IDs. If Go service fails, server deletes the auth policy and tagset (simple DB rollback).
- Q: How should the server discover a newly created document's ID after the Go service creates it? → A: Server uses the document ID from the Go service's POST response directly. No need to query the document table after creation. UUIDv7 (new) and UUIDv4 (existing) are both valid UUIDs — no compatibility issue.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - File Uploads Delegated to Go Service (Priority: P1)

When a user uploads a file (avatar, attachment, link file, whiteboard asset) through any GraphQL mutation, the server delegates the actual file storage and document record creation to the Go file-service-go via its internal HTTP API, instead of writing to local disk and the database directly. The upload experience for end users is unchanged.

**Why this priority**: This is the core behavioral change. Every file upload in the platform flows through this path. Without it, the server still owns file storage and the Go service has no data.

**Independent Test**: Upload an avatar image through the GraphQL API. Verify the file is stored by the Go service (check its `/internal/document/{id}/meta` endpoint), the document record is created by the Go service (UUIDv7 ID), and the server's GraphQL response contains the correct document URL.

**Acceptance Scenarios**:

1. **Given** a user uploading an image via `uploadImageOnVisual` mutation, **When** the upload completes, **Then** the server calls `POST /internal/document` on the Go service with the file content, metadata (displayName, storageBucketId, authorizationId), and allowed MIME types. The Go service creates the document record and stores the file. The server receives the new document ID and constructs the public URL.
2. **Given** a user uploading a file via `uploadFileOnStorageBucket` mutation, **When** the upload completes, **Then** the same delegation occurs. The server does not write to local disk or insert into the document table.
3. **Given** a user uploading a HEIC image, **When** the Go service processes it, **Then** the image is automatically converted to JPEG by the Go service (not the server). The server does not perform image conversion or compression.
4. **Given** the Go file-service-go is unavailable, **When** a user attempts to upload, **Then** the upload fails with an appropriate error. The server does not fall back to local storage.

---

### User Story 2 - File Deletion Delegated to Go Service (Priority: P1)

When a document is deleted (directly or via cascade from parent entity deletion), the server calls the Go service to delete the document record and file, instead of deleting from the database and local disk directly.

**Why this priority**: Deletion must be coordinated between the server (which manages authorization policies and tagsets) and the Go service (which manages document records and file storage). Incorrect coordination leads to orphaned files or dangling authorization records.

**Independent Test**: Delete a document via GraphQL mutation. Verify the Go service's `/internal/document/{id}/meta` returns 404 afterward, the file is removed from storage, and the server cleans up the associated authorization policy and tagset using the IDs returned by the Go service.

**Acceptance Scenarios**:

1. **Given** a document that exists in the Go service, **When** a user deletes it via `deleteDocument` mutation, **Then** the server calls `DELETE /internal/document/{id}` on the Go service. The Go service returns the `authorizationId` and `tagsetId`. The server deletes those entities locally.
2. **Given** a storage bucket being deleted (cascade), **When** all documents in the bucket are deleted, **Then** the server calls the Go service for each document deletion.
3. **Given** a document whose file is shared with another document (content-addressed dedup), **When** one document is deleted, **Then** the Go service only removes the document record but keeps the file (because another document references it).

---

### User Story 3 - Temporary Document Lifecycle (Priority: P2)

When a user creates content with embedded files (e.g., markdown with images), the server creates documents marked as temporary. When the parent entity is saved/finalized, the server moves temporary documents to their permanent storage bucket by calling the Go service's update endpoint.

**Why this priority**: Temporary documents are created during entity creation flows (spaces, posts, callouts). The move-to-permanent flow must work correctly to prevent document loss.

**Independent Test**: Create a post with an embedded image. Verify the document starts as temporary (via Go service metadata). Save the post. Verify the document is moved to the permanent bucket (temporaryLocation becomes false, storageBucketId updated).

**Acceptance Scenarios**:

1. **Given** a temporary document created during entity drafting, **When** the parent entity is saved, **Then** the server calls `PATCH /internal/document/{id}` with `{storageBucketId: finalBucketId, temporaryLocation: false}`. The Go service updates the record.
2. **Given** a temporary document that is not finalized within the retention period, **When** the cleanup runs, **Then** the server calls `DELETE /internal/document/{id}` on the Go service.

---

### User Story 4 - Document Content Re-upload Between Buckets (Priority: P2)

When documents need to be moved between storage buckets (e.g., markdown re-upload, profile document migration), the server retrieves file content from the Go service and re-uploads it to a new bucket through the Go service.

**Why this priority**: Profile and markdown documents are re-uploaded when entities change ownership or structure. This must work via the Go service API.

**Independent Test**: Move a document from one storage bucket to another. Verify the old document is deleted and a new document exists in the target bucket with the same content.

**Acceptance Scenarios**:

1. **Given** a document in bucket A that needs to move to bucket B, **When** the re-upload occurs, **Then** the server calls `GET /internal/document/{id}/content` to retrieve the file, then `POST /internal/document` with the new bucket ID, then `DELETE /internal/document/{id}` for the old document.
2. **Given** markdown content with embedded document URLs, **When** the markdown is processed for a new bucket, **Then** each embedded document is re-uploaded to the new bucket and URLs are rewritten.

---

### User Story 5 - Server Code Cleanup (Priority: P3)

After the migration, unused services and adapters are removed from the server: LocalStorageAdapter, ImageConversionService, ImageCompressionService, and FileIntegrationService (RMQ handler). The server no longer contains file I/O or image processing logic.

**Why this priority**: Cleanup reduces maintenance burden and prevents confusion about which code path is active. Lower priority because the system works correctly before cleanup; this is code hygiene.

**Independent Test**: After cleanup, verify the server builds successfully, all tests pass, no file system writes occur during document operations, and the RMQ file integration queue is no longer consumed.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** LocalStorageAdapter, ImageConversionService, ImageCompressionService, and FileIntegrationService are removed, **Then** the server builds and all tests pass.
2. **Given** the server is running, **When** any document operation occurs, **Then** no local file system reads or writes happen in the server process.

---

### User Story 6 - File Serving Unchanged for End Users (Priority: P1)

End users accessing files via the public URL (`/api/private/rest/storage/document/{id}`) experience no change. The Go file-service-go serves the files directly with JWT authentication, ETag caching, and correct MIME types.

**Why this priority**: This is the user-facing surface. Any disruption in file serving breaks images, avatars, and attachments across the entire platform.

**Independent Test**: Access a document URL in a browser. Verify the file is served correctly with proper Content-Type, Cache-Control, and ETag headers. Verify ETag-based 304 responses work. Verify unauthorized access is rejected.

**Acceptance Scenarios**:

1. **Given** a document URL, **When** an authenticated user accesses it, **Then** the Go service serves the file with correct MIME type, Cache-Control headers, and ETag.
2. **Given** a document URL, **When** an unauthenticated user accesses it, **Then** the Go service returns 401.
3. **Given** a previously fetched document with an ETag, **When** the same user requests it with If-None-Match, **Then** the Go service returns 304 Not Modified.

---

### Edge Cases

- What happens when the Go file-service-go is down during a file upload? The server returns an error to the user. No partial state is left in the database.
- What happens when the Go service returns a 409 Conflict during a PATCH? The server retries with a fresh version (optimistic locking).
- What happens when a document is deleted while its file is being served? The Go service handles this atomically -- the serve request either completes with the old data or returns 404.
- What happens when the server's authorization policy or tagset creation fails after the Go service has created the document? The server should call DELETE on the Go service to roll back the document creation.
- What happens when the Go service detects an unsupported MIME type during upload? It returns 415, and the server propagates the error to the user via the GraphQL response.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: All file upload operations MUST delegate to the Go file-service-go via `POST /internal/document` instead of writing to local storage and the database directly.
- **FR-002**: All document deletion operations MUST delegate to the Go file-service-go via `DELETE /internal/document/{id}`. The server MUST use the returned `authorizationId` and `tagsetId` to clean up those entities locally.
- **FR-003**: Temporary document moves MUST delegate to the Go file-service-go via `PATCH /internal/document/{id}` with updated `storageBucketId` and `temporaryLocation` fields.
- **FR-004**: Document content retrieval (for re-upload scenarios) MUST use `GET /internal/document/{id}/content` from the Go service instead of reading from local storage.
- **FR-005**: The server MUST NOT perform image conversion (HEIC to JPEG) or image compression. The Go service handles all image processing.
- **FR-006**: The server MUST NOT write to the `document` table. All document record creation, updates, and deletes go through the Go service API. The server retains read access for resolving URLs, checking existence, and authorization.
- **FR-007**: The server MUST create `authorization_policy` and `tagset` entities BEFORE calling the Go service to create a document. Their IDs are passed in the `POST /internal/document` request. If the Go service call fails, the server rolls back by deleting the pre-created auth policy and tagset.
- **FR-008**: The server MUST continue to own database migrations, including migrations for the `document` table schema.
- **FR-009**: File serving via the public URL (`/rest/storage/document/{id}`) MUST be handled entirely by the Go file-service-go with JWT authentication. The server is not involved in serving files.
- **FR-010**: When the Go file-service-go is unavailable, file operations MUST fail with a `StorageServiceUnavailableException` (mapped to HTTP 503 context in GraphQL error response). The server MUST NOT fall back to local storage. The FileServiceAdapter MUST use a circuit breaker to fail fast when the Go service is unresponsive.
- **FR-011**: The `LocalStorageAdapter`, `ImageConversionService`, `ImageCompressionService`, and `FileIntegrationService` MUST be removed from the server after migration.
- **FR-012**: All existing GraphQL upload mutations (`uploadImageOnVisual`, `uploadFileOnStorageBucket`, `uploadFileOnLink`, `uploadFileOnReference`) MUST continue to work with unchanged GraphQL signatures.
- **FR-013**: The server MUST pass `allowedMimeTypes` and `maxFileSize` constraints from the storage bucket to the Go service during upload, enabling server-side validation at the Go service level.

### Key Entities

- **Document**: A file record with metadata (displayName, mimeType, size, externalID). Owned by the Go file-service-go for writes. Read-only for the server. Linked to a StorageBucket and an AuthorizationPolicy.
- **StorageBucket**: A logical container for documents with upload constraints (allowedMimeTypes, maxFileSize). Managed by the server. Its ID is passed to the Go service during document creation.
- **AuthorizationPolicy**: Access control policy for a document. Created by the server before document upload, its ID passed to the Go service. Cleaned up by the server after document deletion.
- **Tagset**: Optional metadata tags for a document. Created by the server, ID passed to Go service. Cleaned up after deletion.
- **FileServiceAdapter**: New server-side HTTP client adapter for communicating with the Go file-service-go internal API.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All file upload operations complete successfully through the Go service with no direct database writes to the document table from the server.
- **SC-002**: File serving via public URLs continues to work with correct MIME types, caching headers (ETag, Cache-Control), and authentication -- no user-visible changes.
- **SC-003**: Document deletion correctly removes both the Go service record and the server-side authorization policy and tagset, with zero orphaned records after any delete operation.
- **SC-004**: The server codebase no longer contains local file I/O logic, image conversion logic, or image compression logic after cleanup.
- **SC-005**: All existing GraphQL upload mutations continue to work with unchanged request/response signatures for API consumers.
- **SC-006**: Temporary document lifecycle (create temporary, move to permanent bucket) works correctly through the Go service API.
- **SC-007**: When the Go file-service-go is unavailable, upload/delete operations fail cleanly with descriptive errors -- no partial state left in any system.

## Assumptions

- The Go file-service-go is deployed alongside the server in the same cluster/network and accessible via internal HTTP at `http://file-service:4003`.
- The Go service and the server share the same PostgreSQL database. The Go service has read-write access to the `document` table; the server has read-only access.
- The Go service handles all image processing (HEIC to JPEG conversion, JPEG/WebP compression, EXIF stripping) automatically during upload via govips.
- The Go service uses content-addressed storage (SHA3-256 hashing) for deduplication. The server does not need to be aware of the hashing mechanism.
- The Go service's `DELETE /internal/document/{id}` response includes `authorizationId` and `tagsetId` fields, enabling the server to clean up those entities.
- The Go service validates MIME types and file sizes based on parameters passed in the `POST /internal/document` request (`allowedMimeTypes`, `maxFileSize` form fields).
- Authorization policies and tagsets are created by the server before calling the Go service. The Go service stores their IDs as foreign keys but does not manage their lifecycle.
- The public file serving endpoint (`/rest/storage/document/{id}`) is handled by the Go service through Oathkeeper (JWT validation) without server involvement.
- The existing `FileIntegrationService` (RMQ handler for the old TypeScript file-service) is no longer needed and can be removed.
