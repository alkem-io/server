# Implementation Plan: HEIC Conversion & Image Compression

**Branch**: `001-heic-jpeg-conversion` | **Date**: 2026-02-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-heic-jpeg-conversion/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

iPhone users uploading HEIC/HEIF images experience failures because the platform does not accept these formats. Additionally, large photos (from any device) consume excessive storage and slow page loads. This plan introduces a two-stage image processing layer in the upload pipeline: (1) detect HEIC/HEIF uploads and convert them to JPEG using `heic-convert`, then (2) compress and/or resize any image (HEIC-converted or otherwise) exceeding 3MB using `sharp`. The processing hooks into `VisualService.uploadImageOnVisual()` — the single entry point for all visual uploads — and into `StorageBucketService` for generic file uploads. Non-HEIC formats under 3MB pass through unchanged.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 22.21.1 (Volta-pinned)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, `graphql-upload` 13, `image-size` 1.1, **new: `heic-convert` ^2.1.0** (ISC license, pure JavaScript/WASM HEIC→JPEG converter), **new: `@types/heic-convert`** (TypeScript declarations), **new: `sharp` ≥0.34** (Apache-2.0, libvips-based image compression/resizing)
**Storage**: Local filesystem via `LocalStorageAdapter` (content-addressed, SHA-hashed filenames)
**Testing**: Vitest (unit), Jest CI (integration)
**Target Platform**: Linux server (Docker Node 22), macOS dev
**Project Type**: Single NestJS server monolith
**Performance Goals**: HEIC→JPEG conversion ≤5s for images up to 10MB; compression/resize ≤2s per image; no regression on non-HEIC uploads under 3MB
**Constraints**: 25MB max HEIC upload size; 3MB compression threshold; strip all EXIF metadata (preserve orientation via auto-orient into pixel data); only primary frame extracted from multi-frame containers
**Scale/Scope**: ~6 visual types + 2 generic upload mutations; ~400 LOC change (services + enum + tests)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
| --- | --- | --- |
| 1. Domain-Centric Design First | ✅ Pass | Processing logic lives in domain services (`ImageConversionService`, `ImageCompressionService`) under `src/domain/common/visual/`. Business rules: "HEIC uploads become JPEG" and "images >3MB are compressed" stay in domain layer. |
| 2. Modular NestJS Boundaries | ✅ Pass | New service injected into existing `VisualModule`. No new module required — conversion is a capability of visual upload, not a standalone domain. |
| 3. GraphQL Schema as Stable Contract | ✅ Pass | No GraphQL schema changes. Existing `uploadImageOnVisual` mutation signature unchanged; HEIC acceptance is a backend behavior change. MIME type enums are internal, not in GraphQL schema. |
| 4. Explicit Data & Event Flow | ✅ Pass | Conversion occurs within the existing upload pipeline (validate → convert → store). No new events needed — existing upload success/failure flows apply. |
| 5. Observability & Operational Readiness | ✅ Pass | Conversion events logged with structured context (source format, target format, file size, conversion time). Uses existing `LogContext` patterns. |
| 6. Code Quality with Pragmatic Testing | ✅ Pass | Unit tests for conversion service (mock heic-convert) and compression service (mock sharp). Integration test for upload pipeline with HEIC fixture and large image fixture. Risk-based: testing actual output, not mocking internals. |
| 7. API Consistency & Evolution | ✅ Pass | No API surface change. |
| 8. Secure-by-Design Integration | ✅ Pass | HEIC input passes through existing centralized validation. 25MB size limit enforced before conversion. Compression operates on in-memory buffers only. |
| 9. Container & Deployment Determinism | ✅ Pass | `heic-convert` is pure JavaScript/WASM. `sharp` ships prebuilt binaries via `@img/sharp-*` platform packages (JPEG/PNG/WebP support; no HEIC in prebuilts). Dockerfile uses explicit Node 22 base. No runtime dynamic install. |
| 10. Simplicity & Incremental Hardening | ✅ Pass | Two-stage pipeline: detect HEIC → convert → compress if >3MB → continue existing pipeline. No caching, queuing, or async processing. |

## Project Structure

### Documentation (this feature)

```text
specs/001-heic-jpeg-conversion/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── heic-conversion.md
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── common/
│   ├── enums/
│   │   ├── mime.file.type.visual.ts       # Add HEIC/HEIF MIME types
│   │   └── mime.file.type.ts              # Re-exports (no change needed if visual enum auto-included)
│   └── utils/
│       └── image.util.ts                  # No change — image-size works on converted JPEG buffer
├── domain/
│   └── common/
│       └── visual/
│           ├── visual.constraints.ts      # Add 'image/heic', 'image/heif' to VISUAL_ALLOWED_TYPES
│           ├── visual.service.ts           # Add HEIC detection + conversion before dimension validation
│           ├── image.conversion.service.ts # NEW: Encapsulates HEIC→JPEG conversion via heic-convert
│           ├── image.compression.service.ts # NEW: Compresses/resizes images >3MB via sharp
│           ├── image.conversion.service.spec.ts # NEW: Unit tests
│           ├── image.compression.service.spec.ts # NEW: Unit tests
│           └── visual.module.ts           # Register ImageConversionService
└── services/
    └── ...                                # No changes needed

test/
├── unit/
│   └── domain/common/visual/
│       └── image-conversion.spec.ts       # Unit tests for conversion service
└── fixtures/
    └── sample.heic                        # HEIC test fixture file
```

**Structure Decision**: Single project structure. New `ImageConversionService` and `ImageCompressionService` co-located with `VisualService` in `src/domain/common/visual/` since both are tightly coupled to visual upload. No new NestJS module — registered as providers in `VisualModule`.

## Complexity Tracking

No constitution violations to justify. All 10 principles pass cleanly.
