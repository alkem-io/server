# Implementation Plan: Whiteboard Guest Access Toggle

**Branch**: `001-toggle-whiteboard-guest` | **Date**: 2025-11-17 | **Spec**: [Feature Specification](./spec.md)
**Input**: Feature specification from `/specs/001-toggle-whiteboard-guest/spec.md`

**Note**: This plan is generated via `/speckit.plan` and aligns with `.specify/templates/plan-template.md`.

## Summary

Expose a GraphQL mutation that lets PUBLIC_SHARE privilege holders toggle guest participation. The mutation orchestrates domain services to grant or revoke `GLOBAL_GUEST` permissions, keeps `guestContributionsAllowed` in sync across reads, and ensures guest access relies solely on permission checks (no server-issued share tokens). Implementation touches domain access policies, service-layer resolvers, and authorization checks while maintaining idempotent enable/disable flows.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 20.15.1 (Volta-managed)
**Primary Dependencies**: NestJS 10 (GraphQL + dependency injection), Apollo Server 4, TypeORM 0.3, in-house authorization services (`@domain/common/whiteboard`, `@services/whiteboard-integration`)
**Storage**: MySQL 8 via TypeORM repositories (no schema changes expected)
**Testing**: Jest (unit + integration suites under `test/`), GraphQL contract specs where relevant
**Target Platform**: Containerized Node.js backend (Linux) deployed via existing server pipeline
**Project Type**: Monolithic backend service (NestJS modules under `src/`)
**Performance Goals**: Keep toggle mutation p95 latency < 400 ms while updating permission state and cache layers
**Constraints**: Preserve domain purity (business rules in `src/domain`), avoid server-generated share tokens, ensure concurrency-safe permission updates
**Scale/Scope**: Applies to all whiteboards within collaborative spaces; expect frequent toggles during live sessions across hundreds of rooms

## Constitution Check

- Domain logic will remain in `src/domain/common/whiteboard` and `src/platform-admin/domain/whiteboard`, with resolvers in service layers acting purely as orchestrators (Principle 1).
- Observability will leverage existing structured logging around authorization decisions and mutation outcomes; we will emit debug-level entries when guest access changes and rely on current dashboards without inventing new metrics (Principle 5).
- Automated coverage will include domain unit tests verifying permission state transitions and integration/contract tests ensuring GraphQL responses reflect `guestContributionsAllowed`; omissions will be justified in the PR if any low-risk path remains untested (Principle 6).

## Project Structure

### Documentation (this feature)

```text
specs/001-toggle-whiteboard-guest/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md  (Phase 2 via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── common/
│   │   └── whiteboard/
│   └── ...
├── platform-admin/
│   └── domain/
│       └── whiteboard/
├── services/
│   ├── api-rest/
│   ├── adapters/
│   ├── whiteboard-integration/
│   └── ...
└── common/
    └── authorization/

test/
├── unit/
│   └── domain/
├── integration/
│   └── services/
└── contract/
```

**Structure Decision**: Extend existing whiteboard domain modules (`src/domain/common/whiteboard`, `src/platform-admin/domain/whiteboard`) and accompanying service adapters (`src/services/whiteboard-integration`). GraphQL resolver work will slot into the established API surface under `src/services/api` (or companion module) without introducing new top-level packages.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |

(No constitutional violations anticipated.)
