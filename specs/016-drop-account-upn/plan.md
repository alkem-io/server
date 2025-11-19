# Implementation Plan: Drop `accountUpn` column and sanitize usage

**Branch**: `016-drop-account-upn` | **Date**: 2025-11-18 | **Spec**: `specs/016-drop-account-upn/spec.md`
**Input**: Feature specification from `specs/016-drop-account-upn/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Remove the unused `accountUpn` column from the live database schema and sanitize all usages of `accountUpn` in the codebase. Before dropping the column, confirm whether it is actually used anywhere (code, configuration, migrations, scripts) and, where required, introduce alternative logic based on existing stable account identifiers so that no user flows or integrations break.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 (NestJS server)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, GraphQL/Apollo Server, MySQL 8
**Storage**: MySQL 8 via TypeORM entities and migrations
**Testing**: Jest test suites via `pnpm test:ci` and related scripts
**Target Platform**: Linux containers and local development on macOS
**Project Type**: Backend web API server (single service)
**Performance Goals**: No material change to latency or throughput; migrations must run within existing maintenance windows
**Constraints**: No new external dependencies; schema changes must respect existing GraphQL contracts and migration validation tooling
**Scale/Scope**: Narrow, focused change in account-related tables/entities and associated code paths

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Changes will be limited to existing domain entities/repositories under `src/domain` (for any true business rules) and to application/service layers for orchestration and API exposure, preserving Principle 1 (Domain-Centric Design First).
- Observability will rely on existing structured logs and error monitoring; we will not introduce new metrics or dashboards solely for this change, in line with Principle 5 (Observability & Operational Readiness).
- We will add or update automated tests where `accountUpn` references currently exist (or where new behavior is introduced), and verify that the full CI test suite passes, satisfying Principle 6 (Code Quality with Pragmatic Testing). If any area is deemed truly low-risk and left untested, this will be explicitly justified in the PR checklist.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/           # core domain logic & repositories (account entities live here)
├── services/         # API and application services
├── common/           # cross-cutting helpers and utilities
├── core/             # core application flows (auth, error handling, etc.)
└── platform*/        # platform-scoped modules (not directly affected by this feature)

test/
├── unit/
├── integration/
└── functional/
```

**Structure Decision**: Single NestJS backend service using the existing `src/domain`, `src/services`, `src/common`, and `src/core` layout with tests under `test/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
