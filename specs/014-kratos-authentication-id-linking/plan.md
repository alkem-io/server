# Implementation Plan: Kratos Authentication ID Linking

**Branch**: `014-kratos-authentication-id-linking` | **Date**: 2025-11-10 | **Spec**: `specs/014-kratos-authentication-id-linking/spec.md`
**Input**: Feature specification from `specs/014-kratos-authentication-id-linking/spec.md`

## Summary

Add a nullable, unique `authenticationID` column to the `user` table, persist the Kratos identity UUID during onboarding, provide a manual platform-admin mutation to backfill existing rows, expose a private REST endpoint that resolves or creates users by Kratos ID, and ensure existing Kratos-removal mutations clear the stored identifier. Implementation reuses the Kratos Admin API, the existing registration flow, and introduces a temporary platform-admin module for the backfill mutation. All link-or-create decisions now flow through a dedicated `UserAuthenticationLinkService` so login, REST, and backfill paths share the same validation and conflict handling.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 20.15.1 (NestJS)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo GraphQL 4, Express, Ory Kratos Admin API client
**Storage**: MySQL 8.0 via TypeORM
**Testing**: Jest (pnpm test:ci), supertest for REST integration, existing e2e harness
**Target Platform**: Containerised Node.js server deployed to Kubernetes
**Project Type**: Backend service (NestJS monolith)
**Performance Goals**: Maintain existing user auth flows at current latency budgets; no explicit backfill performance targets beyond successful completion
**Constraints**: Schema changes require deterministic migration + schema diff; internal REST endpoint must operate without request-level guards while providing detailed audit logs; backfill mutation must be idempotent and safe to rerun; nullable unique column cannot reject multiple NULLs; new DTOs/interfaces added for this feature must reside in their own files (single responsibility)
**Scale/Scope**: Tens of thousands of users; backfill expected to touch <50 k records; single temporary platform-admin GraphQL module

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Domain-Centric Design (Principle 1)**: All business logic for linking/creation lives in `src/domain/community/user` services; REST/controller layers orchestrate only.
- **Modular NestJS Boundaries (Principle 2)**: Introduce a dedicated platform-admin module for the backfill mutation with a single provider list; avoid circular dependencies by consuming existing services via DI.
- **GraphQL Contract Stability (Principle 3)**: Any new mutation/fields require schema regeneration and diff; ensure DTO validation consistent with existing patterns.
- **Explicit Data & Event Flow (Principle 4)**: Persist `authenticationID` through domain service methods and emit existing events if applicable; prohibit direct repository writes from controllers.
- **Observability (Principle 5)**: Add structured logs with `LogContext.AUTH`/`LogContext.COMMUNITY`; log backfill progress and REST access.
- **Testing Expectations (Principle 6)**: Provide unit tests for new service methods and integration tests covering REST endpoint + mutation.
- **Secure-by-Design (Principle 8)**: Although REST endpoint bypasses guards, limit exposure to internal network, validate UUID format, and use admin token for Kratos requests.
- **Migrations (Architecture Standard 3)**: Generate TypeORM migration with rollback path and unique constraint safety checks.

## Project Structure

### Documentation (this feature)

```text
specs/014-kratos-authentication-id-linking/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── graphql/
│   │   └── admin-backfill-authentication-id.graphql
│   └── rest/
│       └── authentication-id-lookup.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── community/
│       └── user/
├── services/
│   └── api/
│       └── registration/
├── services/api-rest/
│   └── identity-resolve/         # new internal REST controller module
├── platform-admin/
│   └── domain/
│       └── user/
│           └── authentication-id-backfill/   # new temporary mutation module
└── services/infrastructure/
        └── kratos/

test/
├── integration/
│   └── identity-resolve/
├── unit/
│   └── domain/
│       └── community/
│           └── user/
└── schema-contract/
```

**Structure Decision**: Reuse existing domain services under `src/domain/community/user`, add a scoped platform-admin module for the backfill mutation, and introduce a dedicated `services/api-rest/identity-resolve` module for the internal REST endpoint to keep concerns isolated. Tests mirror production paths in `test/unit/domain/community/user` and `test/integration/identity-resolve`.

## Complexity Tracking

_(No constitution violations anticipated; table not required.)_

## Phase 0 – Research & Clarifications

- Confirm best practice for adding a nullable unique identifier column in MySQL via TypeORM without disrupting existing data.
- Determine safe chunking/transaction strategy for the backfill mutation when calling the Kratos Admin API.
- Document logging and access expectations when exposing an authorization-free internal REST endpoint.

## Phase 1 – Design & Contracts

- Produce `research.md` capturing the above decisions and alternatives.
- Define updated entity shape and relationships in `data-model.md` (User + supporting services).
- Draft GraphQL mutation contract for the platform-admin backfill module and REST contract for the identity lookup endpoint under `contracts/`.
- Update `quickstart.md` with setup, migration, backfill, and verification steps for operators.
- Run `.specify/scripts/bash/update-agent-context.sh copilot` after documenting new technologies/terminology.

## Phase 2 – Implementation Preview (pre-/speckit.tasks)

- Outline migration + service changes for linking `authenticationID` on create/link paths.
- Plan tests (unit for linking logic, integration for REST endpoint and backfill mutation).
- Identify rollback strategy for migration and operational toggles for the temporary backfill module.
