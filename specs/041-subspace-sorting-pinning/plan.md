# Implementation Plan: Subspace Sorting & Pinning API

**Branch**: `041-subspace-sorting-pinning` | **Date**: 2026-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/041-subspace-sorting-pinning/spec.md`

## Summary

Extend the Alkemio server API to support subspace sorting modes and pinning. Add a `sortMode` setting (Alphabetical/Custom) to the space settings JSONB, a `pinned` boolean column to the space table, a new `updateSubspacePinned` mutation, and extend `updateSpaceSettings` to accept sortMode. The existing `updateSubspacesSortOrder` mutation remains unchanged. All changes are additive (non-breaking schema changes).

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16
**Storage**: PostgreSQL 17.5 (space table + JSONB settings column)
**Testing**: Vitest 4.x
**Target Platform**: Linux server (Docker container)
**Project Type**: NestJS monolith server
**Performance Goals**: Standard CRUD operations; no special performance targets
**Constraints**: All schema changes must be additive (non-breaking). Existing `updateSubspacesSortOrder` must remain backward-compatible.
**Scale/Scope**: ~8 files modified, ~3 new files, 1 migration. Estimated ~200 LOC.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
| --------- | ------ | ----- |
| 1. Domain-Centric Design | PASS | All logic in `src/domain/space/` domain module. No resolver-level business logic. |
| 2. Modular NestJS Boundaries | PASS | Changes scoped to existing `SpaceModule` and `SpaceSettingsModule`. No new modules needed. |
| 3. GraphQL Schema as Stable Contract | PASS | All changes additive. New enum, new fields, new mutation. No breaking changes. |
| 4. Explicit Data & Event Flow | PASS | Mutations follow validation -> authorization -> domain operation -> persistence. No new events needed (simple state change). |
| 5. Observability & Operational Readiness | PASS | Uses existing log contexts. No new external surfaces. Exception details pattern followed. |
| 6. Code Quality with Pragmatic Testing | PASS | Unit tests for settings service update logic. Risk-based: skip trivial pass-through coverage. |
| 7. API Consistency & Evolution | PASS | Mutation naming: `updateSubspacePinned` (imperative). Input ends with `Input`. Follows existing patterns. |
| 8. Secure-by-Design Integration | PASS | Authorization checked via `grantAccessOrFail` with `UPDATE` privilege on parent space. |
| 9. Container & Deployment Determinism | PASS | No new env vars. Migration handles data backfill. |
| 10. Simplicity & Incremental Hardening | PASS | Minimal changes. Single field on JSONB, single column, single new mutation. No over-engineering. |

**Post-Phase 1 re-check**: All gates still PASS. No violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/041-subspace-sorting-pinning/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Design decisions and rationale
├── data-model.md        # Phase 1: Entity changes and migration strategy
├── quickstart.md        # Phase 1: API usage examples
├── contracts/
│   └── schema-additions.graphql  # Phase 1: GraphQL schema additions
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── common/enums/
│   └── space.sort.mode.ts                          # NEW: SpaceSortMode enum
├── domain/space/
│   ├── space/
│   │   ├── space.entity.ts                         # MODIFIED: add pinned column
│   │   ├── space.interface.ts                      # MODIFIED: add pinned field
│   │   ├── space.service.ts                        # MODIFIED: add updateSubspacePinned method
│   │   ├── space.resolver.mutations.ts             # MODIFIED: add updateSubspacePinned mutation
│   │   └── dto/
│   │       └── space.dto.update.subspace.pinned.ts # NEW: UpdateSubspacePinnedInput
│   └── space.settings/
│       ├── space.settings.interface.ts             # MODIFIED: add sortMode field
│       ├── space.settings.service.ts               # MODIFIED: handle sortMode in updateSettings
│       ├── space.settings.service.spec.ts          # MODIFIED: add sortMode test cases
│       └── dto/
│           ├── space.settings.dto.update.ts        # MODIFIED: add sortMode to update input
│           └── space.settings.dto.create.ts        # MODIFIED: add sortMode to create input
├── migrations/
│   └── {timestamp}-AddPinnedAndSortModeToSpace.ts  # NEW: migration
```

**Structure Decision**: All changes within existing `src/domain/space/` module hierarchy. One new enum file in `src/common/enums/`. One new DTO file. One new migration. No new modules.

## Complexity Tracking

No violations to justify. All changes follow established patterns with minimal complexity.
