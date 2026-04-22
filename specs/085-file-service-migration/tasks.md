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
- [x] T003 Create `FileServiceAdapterException` in `src/services/adapters/file-service-adapter/file.service.adapter.exception.ts` -- structured exceptions mirroring CommunicationAdapterException pattern with error code mapping. `fromTransportError` puts `error.message` in structured details (not the exception message) per project coding guidelines.
- [x] T003a Create reusable HTTP plumbing in `src/common/http/`: `circuit.breaker.ts` (framework-agnostic state machine with `check()` / `onSuccess()` / `onFailure()` and configurable `failureThreshold` / `resetTimeMs`) and `http.client.base.ts` (abstract `HttpClientBase` with `sendRequest<T>` pipeline — timeout + retry-with-backoff on transport/5xx + circuit breaker + pluggable `handleError` / `openCircuitException` hooks). Extracted for reuse by future outbound adapters (V3, V4 review feedback).
- [x] T003b Create per-interface DTO files under `src/services/adapters/file-service-adapter/dto/`: `create.document.metadata.ts`, `create.document.result.ts`, `delete.document.result.ts`, `update.document.input.ts`, `update.document.result.ts`, plus `index.ts` barrel (V2 review feedback — matches Nest convention used by notification-adapter).
- [x] T004 Create `FileServiceAdapter` in `src/services/adapters/file-service-adapter/file.service.adapter.ts` -- `extends HttpClientBase`. Methods: `createDocument(file: Buffer, metadata)`, `getDocumentContent(id)`, `updateDocument(id, patch)`, `deleteDocument(id)`. Config-driven url/timeout/retries. Structured logging with LogContext.STORAGE_BUCKET. Overrides `handleError` to translate Axios errors into `FileServiceAdapterException` / `StorageServiceUnavailableException`, and `openCircuitException` to throw `StorageServiceUnavailableException` when the circuit is open. `getDocumentContent` uses a dedicated `responseType: 'arraybuffer'` path (the generic pipeline assumes JSON).
- [x] T005 Create `FileServiceAdapterModule` in `src/services/adapters/file-service-adapter/file.service.adapter.module.ts` -- NestJS module exporting FileServiceAdapter, importing HttpModule with config
- [x] T005a Create `DocumentWriteGuard` TypeORM `@EventSubscriber` in `src/domain/storage/document/document.write.guard.ts` that listens on the `Document` entity and throws on any `beforeInsert` / `beforeUpdate` / `beforeRemove`. Registered via glob pattern in `app.module.ts` subscribers config. Defense-in-depth: any accidental server-side write path fails loudly at runtime with a message pointing to the correct `FileServiceAdapter` method.
- [x] T006 Write unit tests for FileServiceAdapter in `src/services/adapters/file-service-adapter/file.service.adapter.spec.ts` -- mock HttpService, verify correct HTTP calls, error handling, timeout/retry behavior, circuit breaker opens after threshold, and adapter throws `StorageServiceUnavailableException` when `enabled = false`.

**Checkpoint**: FileServiceAdapter is ready. All methods callable with correct HTTP requests. `DocumentWriteGuard` enforces server read-only access to the file table. Reusable `HttpClientBase` / `CircuitBreaker` available for future adapters.

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

**Goal**: All file upload operations delegate to the Go file-service-go via `POST /internal/file` instead of local storage and direct DB writes.

**Independent Test**: Upload an avatar image via GraphQL. Verify the Go service created the document (check `/internal/file/{id}/meta`). Verify the server did NOT write to local disk or insert into the `file` table directly.

### Implementation for User Story 1

- [x] T011 [US1] Modify `StorageBucketService.uploadFileAsDocumentFromBuffer()` in `src/domain/storage/storage-bucket/storage.bucket.service.ts`: replace `documentService.uploadFile()` + `documentService.createDocument()` with pre-creating auth policy + tagset, then calling `fileServiceAdapter.createDocument(buffer, {displayName, storageBucketId, authorizationId, tagsetId, createdBy, temporaryLocation, allowedMimeTypes, maxFileSize})`. Wrap the full `auth-policy + tagset + Go-create + post-create reload` sequence in a single compensation block; on any failure independently roll back each resource — server-owned auth policy, server-owned tagset, and the Go-side document (`fileServiceAdapter.deleteDocument(result.id)` if the Go create already succeeded). Each rollback is wrapped in its own try/catch so one failure doesn't short-circuit the others (log warning on cleanup failure). Construct document entity from Go service response for return value.
- [x] T012 [US1] Modify `StorageBucketService.uploadFileAsDocument()` in `src/domain/storage/storage-bucket/storage.bucket.service.ts`: remove `imageConversionService.convertIfNeeded()` and `imageCompressionService.compressIfNeeded()` calls. Convert stream to buffer, then delegate to modified `uploadFileAsDocumentFromBuffer()`.
- [x] T013 [US1] Modify `VisualService.uploadImageOnVisual()` in `src/domain/common/visual/visual.service.ts`: remove `imageConversionService.convertIfNeeded()` and `imageCompressionService.compressIfNeeded()` calls. Keep dimension validation via `getImageDimensions()`. Delegate upload to `storageBucketService.uploadFileAsDocumentFromBuffer()` with raw buffer (Go service handles image processing).
- [x] T014 [US1] Verify `uploadFileOnStorageBucket` resolver in `src/domain/storage/storage-bucket/storage.bucket.resolver.mutations.ts` works without changes (it calls `storageBucketService.uploadFileAsDocument()` which is now rewired)
- [x] T015 [US1] Verify `uploadImageOnVisual` resolver in `src/domain/common/visual/visual.resolver.mutations.ts` works without changes
- [x] T016 [US1] Verify `uploadFileOnLink` resolver in `src/domain/collaboration/link/link.resolver.mutations.ts` works without changes
- [x] T017 [US1] Verify `uploadFileOnReference` resolver in `src/domain/common/reference/reference.resolver.mutations.ts` works without changes
- [x] T018 [US1] Update existing upload-related unit tests in `src/domain/storage/storage-bucket/storage.bucket.service.spec.ts` to mock FileServiceAdapter instead of LocalStorageAdapter and DocumentService.createDocument

**Checkpoint**: All file uploads go through Go service. No local disk writes. No direct `file`-table inserts.

---

## Phase 4: User Story 2 -- File Deletion Delegated to Go Service (Priority: P1)

**Goal**: All document deletions delegate to Go service. Server cleans up auth policy + tagset using IDs from response.

**Independent Test**: Delete a document via GraphQL. Verify Go service returns 404 on `/internal/file/{id}/meta`. Verify server deleted auth policy and tagset.

### Implementation for User Story 2

- [x] T019 [US2] Modify `DocumentService.deleteDocument()` in `src/domain/storage/document/document.service.ts`: replace `documentRepository.remove()` + `removeFile()` with `fileServiceAdapter.deleteDocument(id)`. Use returned `authorizationId` to delete auth policy and `tagsetId` to delete tagset. Remove the `DELETE_FILE` flag logic.
- [x] T020 [US2] Modify `StorageBucketService.deleteStorageBucket()` in `src/domain/storage/storage-bucket/storage.bucket.service.ts`: verify cascade deletion of documents goes through the modified `documentService.deleteDocument()` path (not direct repository remove)
- [x] T021 [US2] Modify `DocumentService.updateDocument()` in `src/domain/storage/document/document.service.ts`: replace direct document entity update + `documentRepository.save()` with tagset-only updates (the Go service PATCH endpoint doesn't support `displayName` or other metadata fields, only `storageBucketId` / `temporaryLocation` used internally by the temporary-storage flow). Reject `displayName` in the input with a `ValidationException` — the GraphQL DTO marks `displayName` optional + deprecated for wire compatibility (FR-014).
- [x] T022 [US2] Update existing delete-related and update-related unit tests in `src/domain/storage/document/document.service.spec.ts` to mock FileServiceAdapter

**Checkpoint**: All document deletions and updates go through Go service. Auth policies and tagsets cleaned up correctly.

---

## Phase 5: User Story 6 -- File Serving Unchanged for End Users (Priority: P1)

**Goal**: Public file serving works via Go service. No server involvement.

**Independent Test**: Access a document URL in browser. Verify file served correctly with Content-Type, Cache-Control, ETag headers.

### Implementation for User Story 6

- [x] T023 [US6] Verify Oathkeeper rule in `.build/ory/oathkeeper/access-rules.yml` points to `file-service:4003` (already done in docker stack update)
- [x] T024 [US6] Verify traefik route for `/api/private/rest/storage` goes through Oathkeeper to Go service (already done in docker stack update)
- [x] T025 [US6] Verify `DocumentService.getPubliclyAccessibleURL()` in `src/domain/storage/document/document.service.ts` generates correct URLs that the Go service can serve (URL format unchanged)

**Checkpoint**: File serving works end-to-end through Go service.

---

## Phase 6: User Story 3 -- Temporary Document Lifecycle (Priority: P2)

**Goal**: Temporary document moves use Go service PATCH endpoint instead of direct DB updates.

**Independent Test**: Create a post with embedded image. Save the post. Verify document moved from temporary to permanent bucket via Go service.

### Implementation for User Story 3

- [x] T026 [US3] Modify `TemporaryStorageService.moveTemporaryDocuments()` in `src/services/infrastructure/temporary-storage/temporary.storage.service.ts`: replace direct `document.storageBucket = destination; document.temporaryLocation = false; documentService.save()` with `fileServiceAdapter.updateDocument(docId, {storageBucketId: destination.id, temporaryLocation: false})`
- [x] T027 [US3] Verify that the document URL parsing in `TemporaryStorageService.getDocumentsFromString()` still works (reads document from DB -- this is read-only access, unchanged)

**Checkpoint**: Temporary documents move to permanent bucket via Go service PATCH.

---

## Phase 7: User Story 4 -- Document Content Re-upload Between Buckets (Priority: P2)

**Goal**: Cross-bucket document moves fetch content from Go service and re-upload to new bucket.

**Independent Test**: Move a document from bucket A to bucket B. Verify old document deleted, new document in target bucket with same content.

### Implementation for User Story 4

- [x] T028 [US4] Modify `ProfileDocumentsService.reuploadFileOnStorageBucket()` in `src/domain/profile-documents/profile.documents.service.ts`: replace the "different bucket" branch that copies the document entity with: fetch content via `fileServiceAdapter.getDocumentContent(docId)`, upload to new bucket via `storageBucketService.uploadFileAsDocumentFromBuffer()` (which now goes through Go service), then delete the original document via `documentService.deleteDocument({ ID: docInContent.id })` so the source bucket isn't left with an orphan (FR-015). In the temporary-move branch, after `fileServiceAdapter.updateDocument(...)` also update the in-memory `storageBucket.documents` array so subsequent hits in the same pass find the moved document and don't fall through into the copy branch.
- [x] T029 [US4] Modify `ProfileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket()` in `src/domain/profile-documents/profile.documents.service.ts`: verify it delegates to `reuploadFileOnStorageBucket()` which is now rewired
- [x] T030 [US4] Verify `StorageBucketService.ensureAvatarUrlIsDocument()` in `src/domain/storage/storage-bucket/storage.bucket.service.ts` works -- it downloads from external URL then uploads locally, which now goes through Go service

**Checkpoint**: Cross-bucket moves work through Go service API.

---

## Phase 8: User Story 5 -- Server Code Cleanup (Priority: P3)

**Goal**: Remove unused services and adapters from the server.

**Independent Test**: Server builds, all tests pass, no local file I/O during document operations.

### Implementation for User Story 5

- [x] T031 [P] [US5] Remove `LocalStorageAdapter` at `src/services/adapters/storage/local-storage/local.storage.adapter.ts`
- [x] T032 [P] [US5] Remove `StorageServiceInterface` at `src/services/adapters/storage/storage.service.interface.ts`
- [x] T033 [P] [US5] Remove `StorageServiceProvider` at `src/services/adapters/storage/storage.service.provider.ts`
- [x] T034 [P] [US5] Remove `ImageConversionService` at `src/domain/common/visual/image.conversion.service.ts`
- [x] T035 [P] [US5] Remove `ImageCompressionService` at `src/domain/common/visual/image.compression.service.ts`
- [x] T036 [P] [US5] Remove `FileIntegrationService` and `FileIntegrationController` at `src/services/file-integration/` (entire directory)
- [x] T037 [US5] Remove `DocumentService.uploadFile()` and `DocumentService.removeFile()` and `DocumentService.getDocumentContents()` methods from `src/domain/storage/document/document.service.ts`
- [x] T038 [US5] Remove STORAGE_SERVICE injection token and references from `src/domain/storage/document/document.module.ts` and `src/domain/storage/storage-bucket/storage.bucket.module.ts`
- [x] T039 [US5] Remove unused imports of `ImageConversionService` and `ImageCompressionService` from `VisualModule` in `src/domain/common/visual/visual.module.ts`
- [x] T040 [US5] Evaluate removal of `heic-convert`, `sharp`, `image-size` packages from `package.json` -- remove if no longer used elsewhere. Run `pnpm install` after changes.
- [x] T041 [US5] Update all affected unit tests to remove mocks for LocalStorageAdapter, ImageConversionService, ImageCompressionService, FileIntegrationService

**Checkpoint**: Server builds clean. No local file I/O code. No image processing code. No RMQ file integration.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T042 Run `pnpm lint` and fix any linting errors across all modified files
- [x] T043 Run `pnpm test:ci:no:coverage` and fix any broken tests
- [x] T044 Verify `pnpm build` succeeds with no errors
- [x] T045 Verify FR-006 compliance: grep codebase for `documentRepository.save\|documentRepository.remove\|documentRepository.insert` and confirm zero remaining write paths outside of migrations
- [x] T046 Manual test: upload avatar via GraphQL, verify served correctly by Go service
- [x] T047 Manual test: delete document, verify auth policy + tagset cleaned up
- [x] T048 Manual test: create post with embedded image (temporary doc), save post, verify doc moved to permanent bucket
- [x] T049 Rename the table from `document` to `file` to match Go service terminology: change `@Entity('file')` and `@Index('IDX_file_storageBucketId')` on `Document`, update `DocumentWriteGuard` error messages to reference "file table". Generate a hand-authored migration (`RenameDocumentTableToFile1776778800000`) using `ALTER TABLE "document" RENAME TO "file"` plus `ALTER INDEX` rename — TypeORM's `migration:generate` cannot emit a `RENAME`, so a minimal manual migration is required to preserve data and FK constraints (the FK names are hashed, so they follow the renamed table automatically). Coordinates with the file-service-go change that renames the table on the Go side and switches its internal API paths to `/internal/file/*`.
- [x] T050 Update all FileServiceAdapter internal calls from `/internal/document/*` to `/internal/file/*` (and spec doc references) to match the file-service-go v0.0.7 API. Also update the traefik `file-service-internal` router rule to match `/internal/file` and document why it is exposed on the `web` entrypoint (dev-compose convenience; production K8s keeps the Service cluster-internal).

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
- Server becomes read-only on the `file` table (renamed from `document`) after US1 + US2
- Image processing removed in US1 (upload) and US5 (cleanup)
- FileIntegrationService (RMQ) removed in US5 -- Go service handles serving
- Keep `getImageDimensions()` for visual dimension validation until Go service supports it
- Commit after each task or logical group
