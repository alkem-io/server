# Implementation Plan: Media Gallery Contribution Tracking

**Branch**: `039-media-gallery-contributions` | **Date**: 2026-03-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/039-media-gallery-contributions/spec.md`

## Summary

Add `MEDIA_GALLERY_CONTRIBUTION` event type to the Elasticsearch contribution reporter so that visual uploads to media galleries within callouts are tracked on the Kibana dashboard. This follows the identical pattern established by `WHITEBOARD_CONTRIBUTION` and `MEMO_CONTRIBUTION` — register a new type constant, add a reporter method, and wire the call from the media gallery resolver mutation after a successful visual upload.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, @elastic/elasticsearch
**Storage**: Elasticsearch (contribution index) — no schema change needed, documents are schemaless
**Testing**: Vitest 4.x — unit test for new reporter method
**Target Platform**: Linux server (NestJS GraphQL API)
**Project Type**: Single monolith (NestJS)
**Performance Goals**: Zero added latency to visual upload (fire-and-forget async call)
**Constraints**: Must follow existing contribution reporter patterns exactly
**Scale/Scope**: ~6 files modified, ~130 LOC added (including tests)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
| --------- | ------ | ----- |
| 1. Domain-Centric Design First | PASS | Contribution reporting is an application/infrastructure concern, placed in resolver (consistent with existing pattern) |
| 2. Modular NestJS Boundaries | PASS | `ContributionReporterModule` already exported; `MediaGalleryModule` imports it. `EntityResolverModule` already available for space resolution. No circular dependencies |
| 3. GraphQL Schema as Stable Contract | PASS | No GraphQL schema changes — server-side event reporting only |
| 4. Explicit Data & Event Flow | PASS | Follows fire-and-forget event reporting pattern; side effect (indexing) is decoupled from domain operation |
| 5. Observability & Operational Readiness | PASS | This IS an observability feature — adds a tracked signal that the stack already ingests |
| 6. Code Quality with Pragmatic Testing | PASS | Unit test for the new reporter method; integration coverage via existing Elasticsearch patterns |
| 7. API Consistency & Evolution | PASS | No API surface changes |
| 8. Secure-by-Design Integration | PASS | No new external input surface |
| 9. Container & Deployment Determinism | PASS | No deployment changes |
| 10. Simplicity & Incremental Hardening | PASS | Minimal change following established pattern — no new abstractions |

**Gate result**: ALL PASS. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/039-media-gallery-contributions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (files to modify/create)

```text
src/
├── services/external/elasticsearch/
│   ├── types/
│   │   └── contribution.type.ts              # ADD: MEDIA_GALLERY_CONTRIBUTION constant
│   └── contribution-reporter/
│       ├── contribution.reporter.service.ts  # ADD: mediaGalleryContribution() method
│       └── contribution.reporter.service.spec.ts # ADD: unit test for mediaGalleryContribution()
├── domain/common/media-gallery/
│   ├── media.gallery.resolver.mutations.ts   # MODIFY: wire contribution reporting in addVisualToMediaGallery
│   └── media.gallery.module.ts               # MODIFY: import ContributionReporterModule + EntityResolverModule
└── services/infrastructure/entity-resolver/
    └── community.resolver.service.ts         # ADD: getLevelZeroSpaceIdForMediaGallery() method
```

**Structure Decision**: Existing NestJS monolith structure. All changes are additions to existing files/modules following established patterns. No new modules or directories needed.
