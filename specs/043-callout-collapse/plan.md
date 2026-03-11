# Implementation Plan: Callout Description Display Mode Setting

**Branch**: `043-callout-collapse` | **Date**: 2026-03-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/043-callout-collapse/spec.md`

## Summary

Add a new `layout` sub-object to `SpaceSettings` containing a `calloutDescriptionDisplayMode` enum field (`COLLAPSED` | `EXPANDED`). This follows the established sub-object pattern used by `privacy`, `membership`, and `collaboration`. A migration backfills existing spaces with `EXPANDED` (preserving current behavior); new spaces default to `COLLAPSED`. The setting is exposed via GraphQL both through the guarded `settings` resolver and as a public field resolver (no READ privilege required, matching `sortMode` pattern).

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16
**Storage**: PostgreSQL 17.5 — existing `settings` JSONB column on `space` table
**Testing**: Vitest 4.x
**Target Platform**: Linux server (Docker containers)
**Project Type**: NestJS GraphQL server (monolith)
**Performance Goals**: N/A — single JSONB field addition, negligible impact
**Constraints**: Must not break existing space settings; migration must be reversible
**Scale/Scope**: ~8 files modified/created, ~150 LOC

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
| --- | --- | --- |
| 1. Domain-Centric Design First | PASS | Setting lives in `src/domain/space/space.settings/` domain module |
| 2. Modular NestJS Boundaries | PASS | Extends existing `SpaceSettingsModule`; no new module needed |
| 3. GraphQL Schema as Stable Contract | PASS | Additive change only (new type + field); no breaking changes |
| 4. Explicit Data & Event Flow | PASS | Uses existing `updateSettings` → persist flow; no new side effects |
| 5. Observability & Operational Readiness | PASS | No new module surface; existing logging contexts sufficient |
| 6. Code Quality with Pragmatic Testing | PASS | Unit test for settings merge; integration test for mutation round-trip |
| 7. API Consistency & Evolution | PASS | Follows naming conventions: enum `CalloutDescriptionDisplayMode`, sub-object `SpaceSettingsLayout` |
| 8. Secure-by-Design Integration | PASS | Reuses existing UPDATE privilege check on `updateSpaceSettings` |
| 9. Container & Deployment Determinism | PASS | No new env vars or runtime config changes |
| 10. Simplicity & Incremental Hardening | PASS | Minimal implementation following established pattern |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/043-callout-collapse/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── schema-additions.graphql
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (files to create or modify)

```text
src/
├── common/enums/
│   └── callout.description.display.mode.ts          # NEW: enum definition
├── domain/space/space.settings/
│   ├── space.settings.interface.ts                   # MODIFY: add layout field
│   ├── space.settings.layout.interface.ts            # NEW: ISpaceSettingsLayout
│   ├── dto/
│   │   ├── space.settings.dto.create.ts              # MODIFY: add layout input
│   │   ├── space.settings.dto.update.ts              # MODIFY: add layout input
│   │   ├── space.settings.layout.dto.create.ts       # NEW: CreateSpaceSettingsLayoutInput
│   │   └── space.settings.layout.dto.update.ts       # NEW: UpdateSpaceSettingsLayoutInput
│   └── space.settings.service.ts                     # MODIFY: merge layout in updateSettings()
├── domain/space/space/
│   ├── space.service.ts                              # MODIFY: default layout on creation
│   └── space.resolver.fields.ts                      # MODIFY: add layout field resolver + defaults in settings
└── migrations/
    └── <timestamp>-AddLayoutSettingsToSpace.ts        # NEW: backfill migration
```

**Structure Decision**: All changes fit within the existing `src/domain/space/space.settings/` module. No new NestJS modules required. The `layout` sub-object follows the identical directory and naming pattern as `privacy`, `membership`, and `collaboration`.
