# Tasks: HEIC Conversion & Image Compression

**Input**: Design documents from `/specs/001-heic-jpeg-conversion/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included for the core conversion and compression services, as they are new services with critical correctness requirements (image quality, metadata preservation, file size targets, error handling).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Install new dependency and register provider

- [X] T001 Install `heic-convert` as a production dependency, `@types/heic-convert` as a dev dependency, and `sharp` as a production dependency via `pnpm add heic-convert sharp && pnpm add -D @types/heic-convert` and verify lockfile updates in `package.json` and `pnpm-lock.yaml`
- [X] T002 [P] Add HEIC and HEIF entries to `MimeTypeVisual` enum in `src/common/enums/mime.file.type.visual.ts` — add `HEIC = 'image/heic'` and `HEIF = 'image/heif'`
- [X] T003 [P] Add `'image/heic'` and `'image/heif'` to `VISUAL_ALLOWED_TYPES` array in `src/domain/common/visual/visual.constraints.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the `ImageConversionService` and `ImageCompressionService` — the core capabilities that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create `ImageConversionService` in `src/domain/common/visual/image.conversion.service.ts` implementing the interface from `contracts/heic-conversion.md`:
  - Define `HEIC_MIME_TYPES` and `HEIC_FILE_EXTENSIONS` constants
  - Implement `isHeicFormat(mimeType: string, fileName: string): boolean` — checks MIME type against `HEIC_MIME_TYPES` and file extension against `HEIC_FILE_EXTENSIONS`
  - Implement `convertIfNeeded(buffer: Buffer, mimeType: string, fileName: string): Promise<ImageConversionResult>` — if HEIC detected, convert via `convert({ buffer, format: 'JPEG', quality: 1 })` using `heic-convert`, update MIME type to `image/jpeg`, change file extension to `.jpg`, return `{ buffer, mimeType, fileName, converted: true }`; otherwise return inputs unchanged with `converted: false`
  - Implement 15MB size validation for HEIC uploads (FR-014) — throw `ValidationException` with static message and file size in `details` payload
  - Wrap heic-convert errors in `ValidationException` with static message pattern ("Failed to convert HEIC image") and original error in `details` per coding standards
  - Inject NestJS `Logger` and log conversion events at verbose level: source MIME, target MIME, original size, converted size, conversion duration (FR-008)
  - Use `@Injectable()` decorator for NestJS DI
- [X] T004b Create `ImageCompressionService` in `src/domain/common/visual/image.compression.service.ts` implementing the interface from `contracts/heic-conversion.md`:
  - Define `COMPRESSION_QUALITY` (82), `MAX_DIMENSION` (4096), `NON_COMPRESSIBLE_MIMES` (['image/svg+xml', 'image/gif', 'image/png', 'image/x-png']) constants
  - Implement `isCompressibleFormat(mimeType: string): boolean` — returns false for SVG, GIF, PNG
  - Implement `compressIfNeeded(buffer: Buffer, mimeType: string, fileName: string): Promise<ImageCompressionResult>` — if format is compressible:
    - For JPEG/WebP: use `sharp(buffer, { autoOrient: true })` (no keepMetadata — all EXIF stripped per FR-005)
    - If longest side >4096px: `.resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })`
    - Compress: `.jpeg({ quality: 82, mozjpeg: true }).toBuffer()`
    - Update MIME type to `image/jpeg`, change extension to `.jpg` if needed
    - Return `{ buffer, mimeType, fileName, compressed: true, originalSize, finalSize }`
  - If non-compressible (PNG, SVG, GIF): return inputs unchanged with `compressed: false`
  - Wrap sharp errors in `ValidationException` with static message ("Failed to compress image") and original error in `details`
  - Inject NestJS `Logger` and log compression events at verbose level: original size, final size, quality used, resize applied, compression duration
  - Use `@Injectable()` decorator for NestJS DI
- [X] T005 Register `ImageConversionService` and `ImageCompressionService` as providers in `src/domain/common/visual/visual.module.ts`
- [X] T006 Create unit tests for `ImageConversionService` in `src/domain/common/visual/__tests__/image.conversion.service.spec.ts`:
  - Test `isHeicFormat()` returns true for `image/heic`, `image/heif` MIME types
  - Test `isHeicFormat()` returns true for `.heic`, `.heif` extensions regardless of MIME type
  - Test `isHeicFormat()` returns false for `image/jpeg`, `image/png`, etc.
  - Test `convertIfNeeded()` passes through non-HEIC buffers unchanged with `converted: false`
  - Test `convertIfNeeded()` rejects HEIC files exceeding 15MB with `ValidationException`
  - Test `convertIfNeeded()` converts HEIC buffer and returns `mimeType: 'image/jpeg'`, `fileName` ending in `.jpg`, `converted: true` (use a real small HEIC fixture or mock heic-convert)
  - Test `convertIfNeeded()` wraps heic-convert errors in `ValidationException` with details payload
- [X] T006b Create unit tests for `ImageCompressionService` in `src/domain/common/visual/__tests__/image.compression.service.spec.ts`:
  - Test `isCompressibleFormat()` returns false for `image/svg+xml`, `image/gif`, `image/png`
  - Test `isCompressibleFormat()` returns true for `image/jpeg`, `image/webp`
  - Test `compressIfNeeded()` optimizes a small (500KB) JPEG buffer (mock sharp) with `compressed: true`
  - Test `compressIfNeeded()` passes through SVG unchanged regardless of size
  - Test `compressIfNeeded()` passes through PNG unchanged regardless of size (preserve transparency)
  - Test `compressIfNeeded()` optimizes a 5MB JPEG buffer (mock sharp)
  - Test `compressIfNeeded()` applies resize when quality reduction alone isn’t enough (mock sharp)
  - Test `compressIfNeeded()` wraps sharp errors in `ValidationException` with details payload
  - Test `compressIfNeeded()` returns correct `originalSize` and `finalSize` values

**Checkpoint**: `ImageConversionService` and `ImageCompressionService` are complete, tested, and registered — ready for integration

---

## Phase 3: User Story 1 — iPhone User Uploads Single Image (Priority: P1) 🎯 MVP

**Goal**: An iPhone user uploads a HEIC image via `uploadImageOnVisual` mutation and it is automatically converted to JPEG, optimized, stored, and served correctly.

**Independent Test**: Upload a HEIC file via `uploadImageOnVisual` GraphQL mutation → verify the response URI returns `Content-Type: image/jpeg`, the file is optimized, and the image displays correctly in a browser.

### Implementation for User Story 1

- [X] T007 [US1] Inject `ImageConversionService` and `ImageCompressionService` into `VisualService` constructor in `src/domain/common/visual/visual.service.ts` — add constructor parameters and private fields
- [X] T008 [US1] Integrate HEIC conversion and compression into `VisualService.uploadImageOnVisual()` in `src/domain/common/visual/visual.service.ts`:
  - After `const buffer = await streamToBuffer(readStream)` and before `const { imageHeight, imageWidth } = await this.getImageDimensions(buffer)`
  - Call `const conversionResult = await this.imageConversionService.convertIfNeeded(buffer, mimetype, fileName)`
  - Call `const compressionResult = await this.imageCompressionService.compressIfNeeded(conversionResult.buffer, conversionResult.mimeType, conversionResult.fileName)`
  - Use `compressionResult.buffer` for downstream dimension validation and storage
  - Pass `compressionResult.mimeType` and `compressionResult.fileName` to `this.storageBucketService.uploadFileAsDocumentFromBuffer()` instead of the originals
- [X] T009 [US1] Update MIME type validation in `VisualService.validateMimeType()` in `src/domain/common/visual/visual.service.ts`:
  - Expand validation to also check against `DEFAULT_VISUAL_CONSTRAINTS[visual.name].allowedTypes` (code-level fix per data-model.md) so that existing Visual entities in the database with stale `allowedTypes` still accept HEIC
  - This avoids a database migration for existing visuals

**Checkpoint**: Single HEIC upload via `uploadImageOnVisual` works end-to-end for all visual types (avatar, banner, card, gallery image). All compressible images are optimized. PNG uploads pass through unchanged.

---

## Phase 4: User Story 2 — Large Image Compression (Priority: P2)

**Goal**: Any uploaded compressible image (JPEG, WebP) is automatically optimized (quality 80–85, max 4096px, EXIF stripped). PNG, SVG, GIF pass through unchanged.

**Independent Test**: Upload a 10MB JPEG photo → verify the stored file is optimized. Upload a 500KB JPEG → verify it is also optimized. Upload a PNG → verify it passes through unchanged.

### Implementation for User Story 2

- [X] T010 [US2] Verify that the optimization pipeline in `VisualService.uploadImageOnVisual()` handles all JPEG/WebP images correctly — since `compressIfNeeded()` runs for all compressible images, every JPEG/WebP should be optimized. Confirm with manual test or write an integration test.
- [X] T010b [US2] Integration test: upload a JPEG of any size via `uploadImageOnVisual` → verify stored file is optimized (quality 80–85, max 4096px). Upload a PNG → verify stored file is unchanged.

**Checkpoint**: Image optimization works for all JPEG, WebP, and converted HEIC uploads. PNG passes through unchanged.

---

## Phase 5: User Story 3 — Bulk Upload with Mixed Formats (Priority: P3)

**Goal**: When multiple images are uploaded (including a mix of HEIC and non-HEIC), HEIC images are converted, and all compressible images are optimized. PNG files pass through unchanged.

**Independent Test**: Upload a batch containing HEIC, JPEG, and PNG files of various sizes → verify HEIC files are converted, all JPEG/WebP files are optimized, and PNG files pass through unchanged.

### Implementation for User Story 3

- [X] T010c [US3] Verify and document that the existing upload pipeline already handles mixed formats correctly — since `convertIfNeeded()` + `compressIfNeeded()` are per-file operations called within `uploadImageOnVisual()`, mixed format batches are handled by design. Confirm that the `uploadFileOnStorageBucket` mutation path also supports both conversion and compression:
  - Inject `ImageConversionService` and `ImageCompressionService` into `StorageBucketService` in `src/domain/storage/storage-bucket/storage.bucket.service.ts`
  - In `uploadFileAsDocument()` (the stream-based entry point), after converting stream to buffer and before `validateMimeTypes()`, call `convertIfNeeded()` then `compressIfNeeded()`
  - Pass converted/compressed buffer, MIME type, and filename downstream
  - Register services in the StorageBucket module imports if needed (via `VisualModule.exports` or direct provider registration in `src/domain/storage/storage-bucket/storage.bucket.module.ts`)

**Checkpoint**: Both `uploadImageOnVisual` and `uploadFileOnStorageBucket` mutations handle HEIC conversion and compression. Mixed-format uploads process correctly.

---

## Phase 6: User Story 4 — Conversion/Compression Failure Handling (Priority: P4)

**Goal**: Corrupted or invalid HEIC files, and images that cannot be compressed, produce clear error feedback without crashing the server or blocking other uploads.

**Independent Test**: Upload a corrupted `.heic` file → verify a meaningful error response is returned and the server remains stable for subsequent uploads.

### Implementation for User Story 4

- [X] T011 [US4] Verify error handling in `ImageConversionService.convertIfNeeded()` in `src/domain/common/visual/image.conversion.service.ts`:
  - Confirm heic-convert errors are caught and wrapped in `ValidationException` with a static message and structured `details` (original error message, file size, MIME type, filename)
  - Confirm the `ValidationException` propagates correctly through `VisualService.uploadImageOnVisual()` try/catch — the existing `StorageUploadFailedException` wrapping in the catch block handles it
  - Ensure error logging at warning level includes the original error stack trace and structured context (LogContext.STORAGE_BUCKET or LogContext.COMMUNITY)
- [X] T011b [US4] Verify error handling in `ImageCompressionService.compressIfNeeded()` in `src/domain/common/visual/image.compression.service.ts`:
  - Confirm sharp errors are caught and wrapped in `ValidationException` with static message ("Failed to compress image") and original error in `details`
  - Confirm that compression failure does not block the upload — if compression fails, log the error and store the uncompressed image as a fallback
- [X] T012 [US4] Add unit tests for error scenarios in `src/domain/common/visual/__tests__/image.conversion.service.spec.ts`:
  - Test: corrupted HEIC buffer (mock heic-convert to throw) → `ValidationException` thrown with correct message and details
  - Test: HEIC file exactly at 15MB boundary → accepted
  - Test: HEIC file at 15MB + 1 byte → rejected with `ValidationException`
  - Test: conversion failure does not affect subsequent conversion calls (service remains stateless)
- [X] T012b [US4] Add unit tests for compression error scenarios in `src/domain/common/visual/__tests__/image.compression.service.spec.ts`:
  - Test: sharp throws on corrupted buffer → `ValidationException` thrown with correct message and details
  - Test: compression failure falls back to storing uncompressed image
  - Test: compression service remains stateless after error

**Checkpoint**: Error paths tested for both conversion and compression. Corrupted files return clear errors; server stability maintained.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and cleanup

- [ ] T013 [P] Verify Docker build succeeds with heic-convert and sharp dependencies — run `docker build -t alkemio-server-heic-test .` and confirm no native compilation errors (sharp ships prebuilt binaries for linux-x64 glibc)
- [X] T014 [P] Run full lint pass `pnpm lint` and fix any issues introduced by the changes
- [X] T015 [P] Run existing test suite `pnpm run test:ci:no:coverage` to confirm no regressions
- [ ] T016 Run quickstart.md validation — follow the steps in `specs/001-heic-jpeg-conversion/quickstart.md` to verify end-to-end operation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001 for heic-convert+sharp, T002-T003 for MIME types) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — core single-file HEIC conversion + compression
- **User Story 2 (Phase 4)**: Depends on Phase 2 — large image compression for non-HEIC formats
- **User Story 3 (Phase 5)**: Depends on Phase 2 — StorageBucketService integration; independent of US1/US2
- **User Story 4 (Phase 6)**: Depends on Phase 2 — error handling verification, can proceed in parallel with US1/US2/US3
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Requires Foundational phase — no dependencies on other stories
- **User Story 2 (P2)**: Requires Foundational phase — validates compression for non-HEIC large images; independent of US1
- **User Story 3 (P3)**: Requires Foundational phase — extends to StorageBucketService upload path; independent of US1/US2
- **User Story 4 (P4)**: Requires Foundational phase — validates error paths in both services; independent of US1/US2/US3

### Within Each User Story

- Service integration before validation logic adjustments
- Verification after implementation
- Story complete before moving to next priority (recommended) or parallel if team capacity allows

### Parallel Opportunities

- T002 and T003 (MIME enum + constraints) run in parallel (different files)
- T013, T014, T015 (Docker build, lint, test suite) run in parallel
- US1, US2, US3, US4 can be worked on in parallel after Foundational phase completes (different files, different service integrations)

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
2. Complete Phase 2: Foundational (T004–T006b) — `ImageConversionService` and `ImageCompressionService` created and tested
3. Complete Phase 3: User Story 1 (T007–T009) — HEIC upload via visuals works + compression
4. **STOP and VALIDATE**: Upload a HEIC image via `uploadImageOnVisual`, verify JPEG output is optimized
5. Deploy/demo if ready — iPhone users can now upload images

### Incremental Delivery

1. Setup + Foundational → Conversion + compression capabilities built
2. User Story 1 → Single HEIC visual uploads work with compression (MVP!)
3. User Story 2 → Large non-HEIC images are compressed too
4. User Story 3 → Generic file uploads also convert HEIC and compress
5. User Story 4 → Error handling verified and hardened
6. Polish → Docker, lint, regression, quickstart validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No database migration needed — code-level fix for existing Visual entity's `allowedTypes`
- No GraphQL schema changes — `schema.graphql` is untouched
- Two-stage pipeline: heic-convert for HEIC decoding, sharp for compression/resizing on standard formats
- Exception messages use static strings; dynamic data (file sizes, MIME types, durations) goes in `details` payload per coding standards
- Logging uses verbose level with structured context per constitution Principle 5
