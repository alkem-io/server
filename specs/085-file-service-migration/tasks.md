# Tasks: File Service Migration to Go

**Input**: Design documents from `/specs/085-file-service-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested -- test tasks omitted. Existing tests will be updated as part of implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the FileServiceAdapter infrastructure

- [x] T001 Add `file_service` configuration block to `alkemio.yml` with keys: `url` (default: `http://file-service:4003`), `timeout` (default: 30000), `retries` (default: 2), `enabled` (default: true)
- [x] T002 Add config typing for file service settings in `src/types/alkemio.config.ts`
- [x] T003 Create `FileServiceAdapterException` in `src/services/adapters/file-service-adapter/file.service.adapter.exception.ts` -- structured exceptions mirroring CommunicationAdapterException pattern with error code mapping
- [x] T004 Create `FileServiceAdapter` in `src/services/adapters/file-service-adapter/file.service.adapter.ts` -- HTTP client using `@nestjs/axios` HttpService with RxJS timeout/retry pattern and circuit breaker (use `opossum` or manual state tracking similar to CommunicationAdapter). Methods: `createDocument(file: Buffer, metadata)`, `getDocumentContent(id)`, `updateDocument(id, patch)`, `deleteDocument(id)`. Config-driven url/timeout/retries. Structured logging with LogContext.STORAGE_BUCKET. When circuit is open, throw `StorageServiceUnavailableException` immediately without attempting HTTP call.
- [x] T005 Create `FileServiceAdapterModule` in `src/services/adapters/file-service-adapter/file.service.adapter.module.ts` -- NestJS module exporting FileServiceAdapter, importing HttpModule with config
- [ ] T006 Write unit tests for FileServiceAdapter in `src/services/adapters/file-service-adapter/file.service.adapter.spec.ts` -- mock HttpService, verify correct HTTP calls, error handling, timeout/retry behavior

**Checkpoint**: FileServiceAdapter is ready. All methods callable with correct HTTP requests.

---

## Phase 2: Foundational -- Inject Adapter into Consuming Services

**Purpose**: Wire FileServiceAdapter into the services that will use it. MUST complete before any user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Import `FileServiceAdapterModule` into `StorageBucketModule` in `src/domain/storage/storage-bucket/storage.bucket.module.ts` and inject `FileServiceAdapter` into `StorageBucketService`
- [x] T008 Import `FileServiceAdapterModule` into `DocumentModule` in `src/domain/storage/document/document.module.ts` and inject `FileServiceAdapter` into `DocumentService`
- [x] T009 Import `FileServiceAdapterModule` into `TemporaryStorageModule` and inject `FileServiceAdapter` into `TemporaryStorageService` in `src/services/infrastructure/temporary-storage/`
- [x] T010 Import `FileServiceAdapterModule` into `ProfileDocumentsModule` and inject `FileServiceAdapter` into `ProfileDocumentsService` in `src/domain/profile-documents/`

**Checkpoint**: Adapter injected everywhere. No behavioral changes yet -- existing code paths still active.

---

## Phase 3: User Story 1 -- File Uploads Delegated to Go Service (Priority: P1) MVP

**Goal**: All file upload operations delegate to the Go file-service-go via `POST /internal/document` instead of local storage and direct DB writes.

**Independent Test**: Upload an avatar image via GraphQL. Verify the Go service created the document (check `/internal/document/{id}/meta`). Verify the server did NOT write to local disk or insert into the document table directly.

### Implementation for User Story 1

- [ ] T011 [US1] Modify `StorageBucketService.uploadFileAsDocumentFromBuffer()` in `src/domain/storage/storage-bucket/storage.bucket.service.ts`: replace `documentService.uploadFile()` + `documentService.createDocument()` with pre-creating auth policy + tagset, then calling `fileServiceAdapter.createDocument(buffer, {displayName, storageBucketId, authorizationId, tagsetId, createdBy, temporaryLocation, allowedMimeTypes, maxFileSize})`. On adapter failure, roll back auth policy + tagset with best-effort cleanup (log warning if rollback itself fails, don't throw -- orphaned auth policies are low-impact). Construct document entity from Go service response for return value.
- [ ] T012 [US1] Modify `StorageBucketService.uploadFileAsDocument()` in `src/domain/storage/storage-bucket/storage.bucket.service.ts`: remove `imageConversionService.convertIfNeeded()` and `imageCompressionService.compressIfNeeded()` calls. Convert stream to buffer, then delegate to modified `uploadFileAsDocumentFromBuffer()`.
- [ ] T013 [US1] Modify `VisualService.uploadImageOnVisual()` in `src/domain/common/visual/visual.service.ts`: remove `imageConversionService.convertIfNeeded()` and `imageCompressionService.compressIfNeeded()` calls. Keep dimension validation via `getImageDimensions()`. Delegate upload to `storageBucketService.uploadFileAsDocumentFromBuffer()` with raw buffer (Go service handles image processing).
- [ ] T014 [US1] Verify `uploadFileOnStorageBucket` resolver in `src/domain/storage/storage-bucket/storage.bucket.resolver.mutations.ts` works without changes (it calls `storageBucketService.uploadFileAsDocument()` which is now rewired)
- [ ] T015 [US1] Verify `uploadImageOnVisual` resolver in `src/domain/common/visual/visual.resolver.mutations.ts` works without changes
- [ ] T016 [US1] Verify `uploadFileOnLink` resolver in `src/domain/collaboration/link/link.resolver.mutations.ts` works without changes
- [ ] T017 [US1] Verify `uploadFileOnReference` resolver in `src/domain/common/reference/reference.resolver.mutations.ts` works without changes
- [ ] T018 [US1] Update existing upload-related unit tests in `src/domain/storage/storage-bucket/storage.bucket.service.spec.ts` to mock FileServiceAdapter instead of LocalStorageAdapter and DocumentService.createDocument

**Checkpoint**: All file uploads go through Go service. No local disk writes. No direct document table inserts.

---

## Phase 4: User Story 2 -- File Deletion Delegated to Go Service (Priority: P1)

**Goal**: All document deletions delegate to Go service. Server cleans up auth policy + tagset using IDs from response.

**Independent Test**: Delete a document via GraphQL. Verify Go service returns 404 on `/internal/document/{id}/meta`. Verify server deleted auth policy and tagset.

### Implementation for User Story 2

- [ ] T019 [US2] Modify `DocumentService.deleteDocument()` in `src/domain/storage/document/document.service.ts`: replace `documentRepository.remove()` + `removeFile()` with `fileServiceAdapter.deleteDocument(id)`. Use returned `authorizationId` to delete auth policy and `tagsetId` to delete tagset. Remove the `DELETE_FILE` flag logic.
- [ ] T020 [US2] Modify `StorageBucketService.deleteStorageBucket()` in `src/domain/storage/storage-bucket/storage.bucket.service.ts`: verify cascade deletion of documents goes through the modified `documentService.deleteDocument()` path (not direct repository remove)
- [ ] T021 [US2] Modify `DocumentService.updateDocument()` in `src/domain/storage/document/document.service.ts`: replace direct document entity update + `documentRepository.save()` with `fileServiceAdapter.updateDocument(id, {storageBucketId, temporaryLocation})` for fields the Go service manages. Keep server-side tagset updates (tagset is managed by server). If `updateDocument` GraphQL mutation is unused, mark for removal in US5 cleanup.
- [ ] T022 [US2] Update existing delete-related and update-related unit tests in `src/domain/storage/document/document.service.spec.ts` to mock FileServiceAdapter

**Checkpoint**: All document deletions and updates go through Go service. Auth policies and tagsets cleaned up correctly.

---

## Phase 5: User Story 6 -- File Serving Unchanged for End Users (Priority: P1)

**Goal**: Public file serving works via Go service. No server involvement.

**Independent Test**: Access a document URL in browser. Verify file served correctly with Content-Type, Cache-Control, ETag headers.

### Implementation for User Story 6

- [ ] T023 [US6] Verify Oathkeeper rule in `.build/ory/oathkeeper/access-rules.yml` points to `file-service:4003` (already done in docker stack update)
- [ ] T024 [US6] Verify traefik route for `/api/private/rest/storage` goes through Oathkeeper to Go service (already done in docker stack update)
- [ ] T025 [US6] Verify `DocumentService.getPubliclyAccessibleURL()` in `src/domain/storage/document/document.service.ts` generates correct URLs that the Go service can serve (URL format unchanged)

**Checkpoint**: File serving works end-to-end through Go service.

---

## Phase 6: User Story 3 -- Temporary Document Lifecycle (Priority: P2)

**Goal**: Temporary document moves use Go service PATCH endpoint instead of direct DB updates.

**Independent Test**: Create a post with embedded image. Save the post. Verify document moved from temporary to permanent bucket via Go service.

### Implementation for User Story 3

- [ ] T026 [US3] Modify `TemporaryStorageService.moveTemporaryDocuments()` in `src/services/infrastructure/temporary-storage/temporary.storage.service.ts`: replace direct `document.storageBucket = destination; document.temporaryLocation = false; documentService.save()` with `fileServiceAdapter.updateDocument(docId, {storageBucketId: destination.id, temporaryLocation: false})`
- [ ] T027 [US3] Verify that the document URL parsing in `TemporaryStorageService.getDocumentsFromString()` still works (reads document from DB -- this is read-only access, unchanged)

**Checkpoint**: Temporary documents move to permanent bucket via Go service PATCH.

---

## Phase 7: User Story 4 -- Document Content Re-upload Between Buckets (Priority: P2)

**Goal**: Cross-bucket document moves fetch content from Go service and re-upload to new bucket.

**Independent Test**: Move a document from bucket A to bucket B. Verify old document deleted, new document in target bucket with same content.

### Implementation for User Story 4

- [ ] T028 [US4] Modify `ProfileDocumentsService.reuploadFileOnStorageBucket()` in `src/domain/profile-documents/profile.documents.service.ts`: replace the "different bucket" branch that copies document entity with: fetch content via `fileServiceAdapter.getDocumentContent(docId)`, upload to new bucket via `storageBucketService.uploadFileAsDocumentFromBuffer()` (which now goes through Go service), delete old document via `documentService.deleteDocument()`
- [ ] T029 [US4] Modify `ProfileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket()` in `src/domain/profile-documents/profile.documents.service.ts`: verify it delegates to `reuploadFileOnStorageBucket()` which is now rewired
- [ ] T030 [US4] Verify `StorageBucketService.ensureAvatarUrlIsDocument()` in `src/domain/storage/storage-bucket/storage.bucket.service.ts` works -- it downloads from external URL then uploads locally, which now goes through Go service

**Checkpoint**: Cross-bucket moves work through Go service API.

---

## Phase 8: User Story 5 -- Server Code Cleanup (Priority: P3)

**Goal**: Remove unused services and adapters from the server.

**Independent Test**: Server builds, all tests pass, no local file I/O during document operations.

### Implementation for User Story 5

- [ ] T031 [P] [US5] Remove `LocalStorageAdapter` at `src/services/adapters/storage/local-storage/local.storage.adapter.ts`
- [ ] T032 [P] [US5] Remove `StorageServiceInterface` at `src/services/adapters/storage/storage.service.interface.ts`
- [ ] T033 [P] [US5] Remove `StorageServiceProvider` at `src/services/adapters/storage/storage.service.provider.ts`
- [ ] T034 [P] [US5] Remove `ImageConversionService` at `src/domain/common/visual/image.conversion.service.ts`
- [ ] T035 [P] [US5] Remove `ImageCompressionService` at `src/domain/common/visual/image.compression.service.ts`
- [ ] T036 [P] [US5] Remove `FileIntegrationService` and `FileIntegrationController` at `src/services/file-integration/` (entire directory)
- [ ] T037 [US5] Remove `DocumentService.uploadFile()` and `DocumentService.removeFile()` and `DocumentService.getDocumentContents()` methods from `src/domain/storage/document/document.service.ts`
- [ ] T038 [US5] Remove STORAGE_SERVICE injection token and references from `src/domain/storage/document/document.module.ts` and `src/domain/storage/storage-bucket/storage.bucket.module.ts`
- [ ] T039 [US5] Remove unused imports of `ImageConversionService` and `ImageCompressionService` from `VisualModule` in `src/domain/common/visual/visual.module.ts`
- [ ] T040 [US5] Evaluate removal of `heic-convert`, `sharp`, `image-size` packages from `package.json` -- remove if no longer used elsewhere. Run `pnpm install` after changes.
- [ ] T041 [US5] Update all affected unit tests to remove mocks for LocalStorageAdapter, ImageConversionService, ImageCompressionService, FileIntegrationService

**Checkpoint**: Server builds clean. No local file I/O code. No image processing code. No RMQ file integration.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T042 Run `pnpm lint` and fix any linting errors across all modified files
- [ ] T043 Run `pnpm test:ci:no:coverage` and fix any broken tests
- [ ] T044 Verify `pnpm build` succeeds with no errors
- [ ] T045 Verify FR-006 compliance: grep codebase for `documentRepository.save\|documentRepository.remove\|documentRepository.insert` and confirm zero remaining write paths outside of migrations
- [ ] T046 Manual test: upload avatar via GraphQL, verify served correctly by Go service
- [ ] T047 Manual test: delete document, verify auth policy + tagset cleaned up
- [ ] T048 Manual test: create post with embedded image (temporary doc), save post, verify doc moved to permanent bucket

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies -- start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 -- BLOCKS all user stories
- **Phase 3 (US1 Upload)**: Depends on Phase 2
- **Phase 4 (US2 Delete)**: Depends on Phase 2. Can run in parallel with Phase 3 for direct deletions. Note: cascade deletion testing (deleting a bucket with documents) requires US1 upload path to be rewired first for full integration test.
- **Phase 5 (US6 Serving)**: Depends on Phase 2. Mostly verification -- can run early.
- **Phase 6 (US3 Temp docs)**: Depends on Phase 3 (uses rewired upload path)
- **Phase 7 (US4 Re-upload)**: Depends on Phase 3 + Phase 4 (uses both upload and delete)
- **Phase 8 (US5 Cleanup)**: Depends on ALL previous phases being complete
- **Phase 9 (Polish)**: Depends on Phase 8

### User Story Dependencies

- **US1 (Upload, P1)**: Can start after Phase 2 -- no other story dependencies
- **US2 (Delete, P1)**: Can start after Phase 2 -- independent of US1
- **US6 (Serving, P1)**: Can start after Phase 2 -- mostly verification
- **US3 (Temp docs, P2)**: Depends on US1 (upload path must be rewired first)
- **US4 (Re-upload, P2)**: Depends on US1 + US2 (needs both upload and delete)
- **US5 (Cleanup, P3)**: Depends on all other stories being complete

### Parallel Opportunities

After Phase 2 completes:
- **Stream A**: US1 (Upload rewire) -- T011-T018
- **Stream B**: US2 (Delete rewire) -- T019-T021
- **Stream C**: US6 (Serving verification) -- T022-T024

---

## Implementation Strategy

### MVP First (US1 + US2 + US6)

1. Complete Phase 1: Setup (FileServiceAdapter)
2. Complete Phase 2: Foundational (inject adapter)
3. Complete Phase 3: US1 -- Uploads delegated
4. Complete Phase 4: US2 -- Deletes delegated
5. Complete Phase 5: US6 -- Verify serving works
6. **STOP and VALIDATE**: Uploads, deletes, and serving all work through Go service
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational -> Adapter ready
2. US1 + US2 + US6 -> Core operations work (MVP!)
3. US3 -> Temporary document lifecycle works
4. US4 -> Cross-bucket re-upload works
5. US5 -> Cleanup complete, server is lean
6. Each increment adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Server becomes read-only on `document` table after US1 + US2
- Image processing removed in US1 (upload) and US5 (cleanup)
- FileIntegrationService (RMQ) removed in US5 -- Go service handles serving
- Keep `getImageDimensions()` for visual dimension validation until Go service supports it
- Commit after each task or logical group
