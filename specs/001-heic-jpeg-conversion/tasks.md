# Tasks: HEIC to JPEG Image Conversion

**Input**: Design documents from `/specs/001-heic-jpeg-conversion/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included for the core conversion service, as it is a new service with critical correctness requirements (image quality, metadata preservation, error handling).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Install new dependency and register provider

- [ ] T001 Install `heic-convert` as a production dependency and `@types/heic-convert` as a dev dependency via `pnpm add heic-convert && pnpm add -D @types/heic-convert` and verify lockfile updates in `package.json` and `pnpm-lock.yaml`
- [ ] T002 [P] Add HEIC and HEIF entries to `MimeTypeVisual` enum in `src/common/enums/mime.file.type.visual.ts` — add `HEIC = 'image/heic'` and `HEIF = 'image/heif'`
- [ ] T003 [P] Add `'image/heic'` and `'image/heif'` to `VISUAL_ALLOWED_TYPES` array in `src/domain/common/visual/visual.constraints.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the `ImageConversionService` — the core conversion capability that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create `ImageConversionService` in `src/domain/common/visual/image.conversion.service.ts` implementing the interface from `contracts/heic-conversion.md`:
  - Define `HEIC_MIME_TYPES` and `HEIC_FILE_EXTENSIONS` constants
  - Implement `isHeicFormat(mimeType: string, fileName: string): boolean` — checks MIME type against `HEIC_MIME_TYPES` and file extension against `HEIC_FILE_EXTENSIONS`
  - Implement `convertIfNeeded(buffer: Buffer, mimeType: string, fileName: string): Promise<ImageConversionResult>` — if HEIC detected, convert via `convert({ buffer, format: 'JPEG', quality: 1 })` using `heic-convert`, update MIME type to `image/jpeg`, change file extension to `.jpg`, return `{ buffer, mimeType, fileName, converted: true }`; otherwise return inputs unchanged with `converted: false`
  - Implement 25MB size validation for HEIC uploads (FR-014) — throw `ValidationException` with static message and file size in `details` payload
  - Wrap heic-convert errors in `ValidationException` with static message pattern ("Failed to convert HEIC image") and original error in `details` per coding standards
  - Inject NestJS `Logger` and log conversion events at verbose level: source MIME, target MIME, original size, converted size, conversion duration (FR-008)
  - Use `@Injectable()` decorator for NestJS DI
- [ ] T005 Register `ImageConversionService` as a provider in `src/domain/common/visual/visual.module.ts`
- [ ] T006 Create unit tests for `ImageConversionService` in `src/domain/common/visual/__tests__/image.conversion.service.spec.ts`:
  - Test `isHeicFormat()` returns true for `image/heic`, `image/heif` MIME types
  - Test `isHeicFormat()` returns true for `.heic`, `.heif` extensions regardless of MIME type
  - Test `isHeicFormat()` returns false for `image/jpeg`, `image/png`, etc.
  - Test `convertIfNeeded()` passes through non-HEIC buffers unchanged with `converted: false`
  - Test `convertIfNeeded()` rejects HEIC files exceeding 25MB with `ValidationException`
  - Test `convertIfNeeded()` converts HEIC buffer and returns `mimeType: 'image/jpeg'`, `fileName` ending in `.jpg`, `converted: true` (use a real small HEIC fixture or mock heic-convert)
  - Test `convertIfNeeded()` wraps heic-convert errors in `ValidationException` with details payload

**Checkpoint**: `ImageConversionService` is complete, tested, and registered — ready for integration

---

## Phase 3: User Story 1 — iPhone User Uploads Single Image (Priority: P1) 🎯 MVP

**Goal**: An iPhone user uploads a HEIC image via `uploadImageOnVisual` mutation and it is automatically converted to JPEG, stored, and served correctly.

**Independent Test**: Upload a HEIC file via `uploadImageOnVisual` GraphQL mutation → verify the response URI returns `Content-Type: image/jpeg` and the image displays correctly in a browser.

### Implementation for User Story 1

- [ ] T007 [US1] Inject `ImageConversionService` into `VisualService` constructor in `src/domain/common/visual/visual.service.ts` — add constructor parameter and private field
- [ ] T008 [US1] Integrate HEIC conversion into `VisualService.uploadImageOnVisual()` in `src/domain/common/visual/visual.service.ts`:
  - After `const buffer = await streamToBuffer(readStream)` and before `const { imageHeight, imageWidth } = await this.getImageDimensions(buffer)`
  - Call `const conversionResult = await this.imageConversionService.convertIfNeeded(buffer, mimetype, fileName)`
  - Use `conversionResult.buffer` for downstream dimension validation and storage
  - Pass `conversionResult.mimeType` and `conversionResult.fileName` to `this.storageBucketService.uploadFileAsDocumentFromBuffer()` instead of the originals
- [ ] T009 [US1] Update MIME type validation in `VisualService.validateMimeType()` in `src/domain/common/visual/visual.service.ts`:
  - Expand validation to also check against `DEFAULT_VISUAL_CONSTRAINTS[visual.name].allowedTypes` (code-level fix per data-model.md) so that existing Visual entities in the database with stale `allowedTypes` still accept HEIC
  - This avoids a database migration for existing visuals

**Checkpoint**: Single HEIC upload via `uploadImageOnVisual` works end-to-end for all visual types (avatar, banner, card, gallery image). Existing JPEG/PNG uploads continue unchanged.

---

## Phase 4: User Story 2 — Bulk Upload with Mixed Formats (Priority: P2)

**Goal**: When multiple images are uploaded (including a mix of HEIC and non-HEIC), only HEIC images are converted while others pass through unchanged.

**Independent Test**: Upload a batch containing HEIC, JPEG, and PNG files → verify HEIC files are stored as JPEG, others are stored in their original format with their original MIME types.

### Implementation for User Story 2

- [ ] T010 [US2] Verify and document that the existing upload pipeline already handles mixed formats correctly in `src/domain/common/visual/visual.service.ts` — since `convertIfNeeded()` is a per-file operation called within `uploadImageOnVisual()` which is invoked per-file by the resolver, mixed format batches are handled by design. Confirm that the `uploadFileOnStorageBucket` mutation path in `src/domain/storage/storage-bucket/storage.bucket.resolver.mutations.ts` also supports HEIC by integrating `ImageConversionService`:
  - Inject `ImageConversionService` into `StorageBucketService` in `src/domain/storage/storage-bucket/storage.bucket.service.ts`
  - In `uploadFileAsDocument()` (the stream-based entry point), after converting stream to buffer and before `validateMimeTypes()`, call `convertIfNeeded()` for HEIC files
  - Pass converted buffer, MIME type, and filename downstream
  - Register `ImageConversionService` in the StorageBucket module imports if needed (via `VisualModule.exports` or direct provider registration in `src/domain/storage/storage-bucket/storage.bucket.module.ts`)

**Checkpoint**: Both `uploadImageOnVisual` and `uploadFileOnStorageBucket` mutations handle HEIC conversion. Mixed-format uploads process correctly.

---

## Phase 5: User Story 3 — Conversion Failure Handling (Priority: P3)

**Goal**: Corrupted or invalid HEIC files produce clear error feedback without crashing the server or blocking other uploads.

**Independent Test**: Upload a corrupted `.heic` file → verify a meaningful error response is returned and the server remains stable for subsequent uploads.

### Implementation for User Story 3

- [ ] T011 [US3] Verify error handling in `ImageConversionService.convertIfNeeded()` in `src/domain/common/visual/image.conversion.service.ts`:
  - Confirm sharp errors (e.g., `Input buffer contains unsupported image format`) are caught and wrapped in `ValidationException` with a static message and structured `details` (original error message, file size, MIME type, filename)
  - Confirm the `ValidationException` propagates correctly through `VisualService.uploadImageOnVisual()` try/catch — the existing `StorageUploadFailedException` wrapping in the catch block handles it
  - Ensure error logging at warning level includes the original error stack trace and structured context (LogContext.STORAGE_BUCKET or LogContext.COMMUNITY)
- [ ] T012 [US3] Add unit tests for error scenarios in `src/domain/common/visual/__tests__/image.conversion.service.spec.ts`:
  - Test: corrupted HEIC buffer (mock heic-convert to throw) → `ValidationException` thrown with correct message and details
  - Test: HEIC file exactly at 25MB boundary → accepted
  - Test: HEIC file at 25MB + 1 byte → rejected with `ValidationException`
  - Test: conversion failure does not affect subsequent conversion calls (service remains stateless)

**Checkpoint**: Error paths tested. Corrupted files return clear errors; server stability maintained.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and cleanup

- [ ] T013 [P] Verify Docker build succeeds with heic-convert dependency — run `docker build -t alkemio-server-heic-test .` and confirm no native compilation errors (heic-convert is pure JS/WASM, no native deps expected)
- [ ] T014 [P] Run full lint pass `pnpm lint` and fix any issues introduced by the changes
- [ ] T015 [P] Run existing test suite `pnpm run test:ci:no:coverage` to confirm no regressions
- [ ] T016 Run quickstart.md validation — follow the steps in `specs/001-heic-jpeg-conversion/quickstart.md` to verify end-to-end operation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001 for sharp, T002-T003 for MIME types) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — core single-file HEIC conversion
- **User Story 2 (Phase 4)**: Depends on Phase 2 — can proceed in parallel with US1 (different files: StorageBucketService vs VisualService)
- **User Story 3 (Phase 5)**: Depends on Phase 2 — error handling verification, can proceed in parallel with US1/US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Requires Foundational phase — no dependencies on other stories
- **User Story 2 (P2)**: Requires Foundational phase — extends to StorageBucketService upload path; independent of US1
- **User Story 3 (P3)**: Requires Foundational phase — validates error paths in conversion service; independent of US1/US2

### Within Each User Story

- Service integration before validation logic adjustments
- Verification after implementation
- Story complete before moving to next priority (recommended) or parallel if team capacity allows

### Parallel Opportunities

- T002 and T003 (MIME enum + constraints) run in parallel (different files)
- T013, T014, T015 (Docker build, lint, test suite) run in parallel
- US1, US2, US3 can be worked on in parallel after Foundational phase completes (different files, different service integrations)

---

## Parallel Example: Setup Phase

```bash
# These can run simultaneously (different files):
Task T002: "Add HEIC/HEIF to MimeTypeVisual enum in src/common/enums/mime.file.type.visual.ts"
Task T003: "Add HEIC/HEIF to VISUAL_ALLOWED_TYPES in src/domain/common/visual/visual.constraints.ts"
```

## Parallel Example: Polish Phase

```bash
# These can run simultaneously (independent validation):
Task T013: "Docker build verification"
Task T014: "Lint pass"
Task T015: "Existing test suite regression check"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T006) — `ImageConversionService` created and tested
3. Complete Phase 3: User Story 1 (T007–T009) — HEIC upload via visuals works
4. **STOP and VALIDATE**: Upload a HEIC image via `uploadImageOnVisual`, verify JPEG output
5. Deploy/demo if ready — iPhone users can now upload images

### Incremental Delivery

1. Setup + Foundational → Conversion capability built
2. User Story 1 → Single HEIC visual uploads work (MVP!)
3. User Story 2 → Generic file uploads also convert HEIC
4. User Story 3 → Error handling verified and hardened
5. Polish → Docker, lint, regression, quickstart validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No database migration needed — code-level fix for existing Visual entity's `allowedTypes`
- No GraphQL schema changes — `schema.graphql` is untouched
- sharp is a drop-in: buffer-in / buffer-out pattern matches the existing upload pipeline perfectly
- Exception messages use static strings; dynamic data (file sizes, MIME types, durations) goes in `details` payload per coding standards
- Logging uses verbose level with structured context per constitution Principle 5
