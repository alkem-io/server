# Implementation Plan: File Service Migration to Go

**Branch**: `085-file-service-migration` | **Date**: 2026-04-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/085-file-service-migration/spec.md`

## Summary

Replace direct document table writes and local file storage in the Alkemio server with HTTP calls to the Go file-service-go internal API. The server becomes read-only on the `document` table. A new `FileServiceAdapter` (HTTP client) delegates all document CRUD to the Go service. Image processing, file deduplication, and public file serving are handled entirely by the Go service. Server still manages authorization policies, tagsets, storage buckets, and database migrations.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, `@nestjs/axios` (axios ^1.12.2), `rxjs`
**Storage**: PostgreSQL 17.5 (document table becomes read-only for server)
**Testing**: Vitest 4.x
**Target Platform**: Linux server (Docker)
**Project Type**: Single NestJS server
**Performance Goals**: File uploads must complete within existing timeout bounds; HTTP adapter timeout 30s for large files
**Constraints**: Go file-service-go must be reachable at configured URL; no fallback to local storage
**Scale/Scope**: ~15 files modified, ~5 files created, ~8 files removed. 0 new GraphQL mutations, 0 new DB entities, 1 new NestJS module (FileServiceAdapterModule).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | PASS | FileServiceAdapter lives in `src/services/adapters/` (not domain). Domain services call the adapter -- business logic stays in domain layer |
| 2. Modular NestJS Boundaries | PASS | New FileServiceAdapterModule with single purpose. No circular dependencies. Replaces LocalStorageAdapter provider |
| 3. GraphQL Schema as Stable Contract | PASS | Zero GraphQL schema changes. All mutations retain signatures |
| 4. Explicit Data & Event Flow | PASS | Upload flow: validation -> authorization -> adapter call -> URL construction. Delete flow: adapter call -> cleanup auth/tagset |
| 5. Observability & Operational Readiness | PASS | Adapter logs input/output payloads with request IDs. Health check via Go service `/health` endpoint |
| 6. Code Quality with Pragmatic Testing | PASS | Unit tests mock adapter. Risk-based: test upload/delete/move flows, skip trivial passthrough |
| 7. API Consistency & Evolution | PASS | No API changes. Internal adapter is not user-facing |
| 8. Secure-by-Design Integration | PASS | HTTP adapter has timeout, retry, and circuit breaker. Internal endpoints (no auth) only on cluster network. Config-driven URL |
| 9. Container & Deployment Determinism | PASS | Go service image pinned to version. URL from config, not hardcoded |
| 10. Simplicity & Incremental Hardening | PASS | Direct HTTP calls, no CQRS or event sourcing. Removes complexity (image processing, local storage) |

**Post-Phase 1 Re-check**: No violations. Design removes complexity from the server by delegating to the Go service.

## Project Structure

### Documentation (this feature)

```text
specs/085-file-service-migration/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research findings
├── data-model.md        # Phase 1: entity/ownership mapping
├── quickstart.md        # Phase 1: implementation guide
├── contracts/           # Phase 1: API contract
│   └── file-service-api.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── services/adapters/file-service-adapter/    # NEW: HTTP client to Go service
│   ├── file.service.adapter.ts                # Adapter implementation
│   ├── file.service.adapter.module.ts         # NestJS module
│   ├── file.service.adapter.exception.ts      # Structured exceptions
│   └── file.service.adapter.spec.ts           # Unit tests
├── domain/storage/document/
│   └── document.service.ts                    # MODIFY: remove DB writes, delegate to adapter
├── domain/storage/storage-bucket/
│   └── storage.bucket.service.ts              # MODIFY: remove local storage + image processing
├── domain/common/visual/
│   ├── visual.service.ts                      # MODIFY: remove image conversion/compression calls
│   ├── image.conversion.service.ts            # REMOVE
│   └── image.compression.service.ts           # REMOVE
├── domain/profile-documents/
│   └── profile.documents.service.ts           # MODIFY: use adapter for cross-bucket moves
├── services/infrastructure/temporary-storage/
│   └── temporary.storage.service.ts           # MODIFY: use adapter PATCH for moves
├── services/file-integration/                 # REMOVE: entire directory
├── services/adapters/storage/                 # REMOVE: LocalStorageAdapter + provider
└── config/                                    # MODIFY: add file_service config block
```

**Structure Decision**: This is a refactoring feature within the existing NestJS server. One new module (FileServiceAdapterModule), several modified services, and cleanup of removed components.

## Implementation Approach

### Phase 1: Create FileServiceAdapter
1. New `FileServiceAdapterModule` in `src/services/adapters/file-service-adapter/`
2. HTTP client using `@nestjs/axios` with RxJS timeout/retry pattern
3. Methods: `createDocument`, `getDocumentContent`, `updateDocument`, `deleteDocument`
4. Structured exception handling via `FileServiceAdapterException`
5. Configuration from `alkemio.yml`: url, timeout, retries, enabled flag

### Phase 2: Rewire Upload Path
6. Modify `StorageBucketService.uploadFileAsDocumentFromBuffer()` to call adapter
7. Pre-create auth policy + tagset, pass IDs to Go service
8. Handle rollback on Go service failure (delete pre-created entities)
9. Construct document URL from Go service response ID
10. Remove image conversion/compression calls from `VisualService.uploadImageOnVisual()`

### Phase 3: Rewire Delete Path
11. Modify `DocumentService.deleteDocument()` to call adapter
12. Clean up auth policy + tagset using IDs from Go service response
13. Remove local file deletion logic

### Phase 4: Rewire Update/Move Paths
14. Modify `TemporaryStorageService.moveTemporaryDocuments()` to call adapter PATCH
15. Modify `ProfileDocumentsService.reuploadFileOnStorageBucket()` to use adapter (get content -> create new -> delete old)

### Phase 5: Cleanup
16. Remove `LocalStorageAdapter` + `StorageServiceProvider` + `StorageServiceInterface`
17. Remove `ImageConversionService` + `ImageCompressionService`
18. Remove `FileIntegrationService` + `FileIntegrationController`
19. Remove unused dependencies (`heic-convert`, `sharp` if no longer used elsewhere)
20. Update `alkemio.yml` with `file_service` config block

## Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| Go file-service-go v0.0.1 | External service | Ready -- deployed in Docker stack |
| authorization-evaluation-service v0.0.2 | External service | Ready -- used by Go service for auth |
| `@nestjs/axios` | Existing package | Already in server (axios ^1.12.2) |
| Go service internal API | Integration contract | Documented in contracts/file-service-api.md |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Go service unavailable during upload | Upload fails | FR-010: fail with error, no fallback. Health check in adapter |
| Rollback on partial failure (auth created, Go service fails) | Orphaned auth policy | Server deletes pre-created auth + tagset on adapter failure |
| Image dimension validation after removing compression | Oversized images accepted | Keep `getImageDimensions()` in VisualService for dimension validation only |
| Performance regression on large file uploads | Slower uploads | Go service processes in-memory like server; HTTP overhead minimal on same network |
