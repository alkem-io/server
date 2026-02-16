# Implementation Plan: TypeORM to Drizzle ORM Migration

**Branch**: `034-drizzle-migration` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/034-drizzle-migration/spec.md`

## Summary

Migrate the Alkemio Server's data access layer from TypeORM 0.3 to Drizzle ORM with postgres.js driver. The migration replaces ~91 entity definitions, ~102 repository injections, and ~97 module registrations while preserving the existing PostgreSQL schema, all NestJS module boundaries, and passing all existing tests. A benchmark report compares test suite execution times before and after migration. This is an ORM-layer-only replacement — no GraphQL schema, database schema, or API contract changes.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, Drizzle ORM (new), postgres.js (new), Apollo Server 4, GraphQL 16
**Removed Dependencies**: TypeORM 0.3.13, @nestjs/typeorm 10.0.2, pg ^8.13.1
**Storage**: PostgreSQL 17.5 (unchanged)
**Testing**: Vitest 4.x (unchanged)
**Target Platform**: Linux server (Docker containers)
**Project Type**: Single NestJS monolith
**Performance Goals**: Test suite execution parity or improvement vs TypeORM baseline
**Constraints**: Zero database schema changes; zero GraphQL contract changes; all existing tests must pass
**Scale/Scope**: ~91 entity files → ~80 schema files, ~89 services refactored, ~85 test files updated

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|---|---|---|
| 1. Domain-Centric Design First | PASS | Business logic remains in domain services. Only the persistence mechanism changes. |
| 2. Modular NestJS Boundaries | PASS | Module boundaries preserved. `TypeOrmModule.forFeature()` replaced by global `DrizzleModule` — simpler, not more complex. Each module retains its single purpose. |
| 3. GraphQL Schema as Stable Contract | PASS | No GraphQL changes. `schema-baseline.graphql` remains identical. |
| 4. Explicit Data & Event Flow | PASS | Event emission pattern unchanged. Repository abstraction replaced by direct Drizzle query builder calls — data flow becomes more explicit (no hidden eager loads or cascades). |
| 5. Observability & Operational Readiness | PASS | Winston logging unchanged. Drizzle logging integrated via postgres.js `debug` callback. No new metrics or health endpoints required. |
| 6. Code Quality with Pragmatic Testing | PASS | All existing tests preserved. Test mock infrastructure updated to match new DI tokens. |
| 7. API Consistency & Evolution Discipline | PASS | No API surface changes. |
| 8. Secure-by-Design Integration | PASS | No new external inputs or auth surface. Database credentials handling unchanged. |
| 9. Container & Deployment Determinism | PASS | No Dockerfile changes. Dependencies pinned. Build output immutable. |
| 10. Simplicity & Incremental Hardening | JUSTIFIED DEVIATION | Replacing a working ORM is inherently non-simple. Justified because: (a) this is an explicit evaluation exercise, not production migration, (b) Drizzle removes hidden complexity (eager loading, cascades, lifecycle hooks) making data flow more explicit, (c) the user explicitly requested this for framework evaluation. |

**Post-Phase 1 Re-check**: Confirmed — design introduces no new architectural patterns or complexity beyond what's justified above.

## Project Structure

### Documentation (this feature)

```text
specs/034-drizzle-migration/
├── plan.md              # This file
├── research.md          # Phase 0: Codebase analysis + decision records
├── data-model.md        # Phase 1: Drizzle schema design
├── quickstart.md        # Phase 1: Developer setup guide
├── contracts/           # Phase 1: No changes (README only)
│   └── README.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── config/drizzle/                    # NEW: Drizzle infrastructure
│   ├── drizzle.module.ts              # Global NestJS module (replaces TypeOrmModule.forRootAsync)
│   ├── drizzle.constants.ts           # DRIZZLE injection token
│   ├── drizzle.config.ts              # drizzle-kit configuration
│   ├── base.columns.ts                # Shared column definitions (replaces abstract entity hierarchy)
│   ├── custom-types.ts                # simple-array, simple-json, compressed text types
│   ├── schema.ts                      # Barrel export of all schemas + relations
│   └── helpers.ts                     # updateWithVersion(), withAuthorization(), etc.
├── domain/
│   ├── space/space/
│   │   ├── space.schema.ts            # NEW: pgTable() definition
│   │   ├── space.relations.ts         # NEW: relations() definition
│   │   ├── space.entity.ts            # REMOVED after migration
│   │   ├── space.service.ts           # MODIFIED: Drizzle queries replace TypeORM
│   │   ├── space.module.ts            # MODIFIED: Remove TypeOrmModule.forFeature
│   │   └── space.service.spec.ts      # MODIFIED: Mock Drizzle instead of Repository
│   └── ... (same pattern for all ~80 entities)
├── migrations/                        # KEPT as historical record (not run)
└── drizzle/                           # NEW: Drizzle Kit output directory
    ├── meta/
    └── *.sql

test/
├── utils/
│   ├── repository.mock.factory.ts     # REMOVED
│   ├── repository.provider.mock.factory.ts  # REMOVED
│   └── drizzle.mock.factory.ts        # NEW: Mock Drizzle db provider
└── ... (test files updated for new mocks)

drizzle.config.ts                       # NEW: Root-level Drizzle Kit config
```

**Structure Decision**: Single NestJS project. New Drizzle infrastructure under `src/config/drizzle/`. Schema files co-located with domain modules. Existing directory structure preserved — only file contents change.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Removing TypeORM cascade saves (143 usages) requires explicit multi-entity inserts | Drizzle does not support cascade saves — this is fundamental to the ORM's design philosophy | Cannot use Drizzle without this change; wrapping Drizzle in cascade logic would defeat the purpose |
| Removing eager loading (25 relations) requires explicit joins at every query site | Drizzle has no eager loading — all loads are explicit | This is a design feature of Drizzle, not a limitation; it eliminates hidden N+1 queries |
| Global DrizzleModule replaces per-module TypeOrmModule.forFeature pattern | Drizzle's schema is statically imported, not dynamically registered per module | Per-module Drizzle wrappers would add unnecessary abstraction without benefit |
