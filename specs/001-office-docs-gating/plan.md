# Implementation Plan: Office Documents Feature Gating

**Branch**: `001-office-docs-gating` | **Date**: 2026-04-21 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-office-docs-gating/spec.md`

## Summary

Implement server-side entitlement-based gating for the `SPACE_FLAG_OFFICE_DOCUMENTS` feature flag across all write operations (create, edit, delete, metadata update) on the new `OfficeDocument` entity. Read access is unconditional. The `OfficeDocument` entity, GraphQL API, domain service, and collaborative editing integration service are all new — following the existing `Memo` / `Whiteboard` multi-user gating patterns exactly. Key novelty: write mutations are gated (unlike memo/whiteboard which only gate the collaborative editing session info endpoint).

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1)  
**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork), Apollo Server 4, class-validator, Winston  
**Storage**: PostgreSQL 17.5 — new `office_document` table + FK column on `callout_contribution`  
**Testing**: Vitest 4.x (`pnpm test:ci`)  
**Target Platform**: NestJS server (`src/`)  
**Performance Goals**: Entitlement check traversal must not measurably regress write-operation latency vs. equivalent memo/whiteboard checks (SC-005)  
**Constraints**: No migration for entitlement seeding (PR #5967 handled that); migration required for entity table only. No client UI changes. No changes to memo/whiteboard behavior.  
**Scale/Scope**: ~400 LOC new code across domain module + integration service + resolver + migration. Agentic path.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | ✅ Pass | Business logic (entitlement gate) lives in `OfficeDocumentService`, not in resolvers |
| 2. Modular NestJS Boundaries | ✅ Pass | New `OfficeDocumentModule` with explicit public providers; `OfficeDocumentIntegrationModule` separate |
| 3. GraphQL Schema as Stable Contract | ✅ Pass | Only additive changes; no breaking removals; `@deprecated` not needed |
| 4. Explicit Data & Event Flow | ✅ Pass | Validation → authorization → domain operation; no direct repo calls from resolvers |
| 5. Observability | ✅ Pass | Warning log on entitlement rejection with structured `collaborationId` (no dynamic data in message) |
| 6. Pragmatic Testing | ✅ Pass | Unit tests for `isEntitlementEnabled`, `assertEntitlementOrFail`; integration test for info endpoint; skip trivial pass-throughs |
| 7. API Consistency | ✅ Pass | Mutation naming: `createOfficeDocument`, `updateOfficeDocument`, `deleteOfficeDocument`; inputs end with `Input` |
| 8. Secure-by-Design | ✅ Pass | Entitlement check before mutation execution; authorization check after entitlement; no bypass for admins |
| 9. Container Determinism | ✅ N/A | No new runtime config outside ConfigService |
| 10. Simplicity | ✅ Pass | No architectural escalation; follows established patterns exactly |

**Post-Design Re-check**: No violations introduced by Phase 1 design decisions. Migration is additive-only (new table + nullable FK).

## Project Structure

### Documentation (this feature)

```text
specs/001-office-docs-gating/
├── plan.md              ← This file
├── research.md          ← Phase 0 output ✅
├── data-model.md        ← Phase 1 output ✅
├── quickstart.md        ← Phase 1 output ✅
├── contracts/
│   ├── schema.graphql   ← Phase 1 output ✅
│   └── rest-api.md      ← Phase 1 output ✅
└── tasks.md             ← Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── common/enums/
│   └── license.entitlement.type.ts          # Add SPACE_FLAG_OFFICE_DOCUMENTS
│
├── domain/
│   ├── common/
│   │   └── office-document/                 # NEW domain module
│   │       ├── dto/
│   │       │   ├── office.document.dto.create.ts
│   │       │   ├── office.document.dto.delete.ts
│   │       │   └── office.document.dto.update.ts
│   │       ├── office.document.entity.ts
│   │       ├── office.document.interface.ts
│   │       ├── office.document.module.ts
│   │       ├── office.document.resolver.fields.ts
│   │       ├── office.document.resolver.mutations.ts
│   │       ├── office.document.resolver.ts
│   │       ├── office.document.service.authorization.ts
│   │       └── office.document.service.ts
│   │
│   ├── collaboration/
│   │   └── callout-contribution/
│   │       └── callout.contribution.entity.ts  # Add officeDocument relation
│   │
│   └── template/template-content-space/
│       └── template.content.space.service.ts   # Add SPACE_FLAG_OFFICE_DOCUMENTS seed
│
├── services/
│   ├── infrastructure/entity-resolver/
│   │   └── community.resolver.service.ts      # Add getCollaborationLicenseFromOfficeDocumentOrFail
│   │
│   └── office-document-integration/           # NEW REST integration service
│       ├── inputs/
│       ├── outputs/
│       ├── office.document.integration.controller.ts
│       ├── office.document.integration.module.ts
│       ├── office.document.integration.service.ts
│       └── index.ts
│
└── migrations/
    └── <timestamp>-AddOfficeDocumentEntity.ts  # New migration

alkemio.yml                                    # Add office_documents.max_collaborators_in_room
```

## Phase 0: Research — Complete ✅

All clarifications resolved. See [research.md](research.md) for full decision records.

**Key resolved decisions**:
- Entitlement check: use `enabled` boolean (FLAG type) via `LicenseService.isEntitlementEnabled()` — consistent with all other `SPACE_FLAG_*` entitlements
- `SPACE_FLAG_OFFICE_DOCUMENTS` enum value must be added (not yet present in codebase)
- `OfficeDocument` entity does not exist — must be created from scratch
- Traversal method: add `getCollaborationLicenseFromOfficeDocumentOrFail` to `CommunityResolverService`
- Write gate enforced in domain service (before auth check), not in resolver
- New `OfficeDocumentIntegrationService` (separate from memo service)
- Migration required for entity table + FK

## Phase 1: Design — Complete ✅

See:
- [data-model.md](data-model.md) — Entities, relations, invariants
- [contracts/schema.graphql](contracts/schema.graphql) — GraphQL type additions and mutations
- [contracts/rest-api.md](contracts/rest-api.md) — REST integration endpoints
- [quickstart.md](quickstart.md) — Developer setup guide

## Phase 2: Tasks

Tasks generated by `/speckit.tasks` command. See [tasks.md](tasks.md) once created.

**Planned task groupings** (for `/speckit.tasks` to expand):

1. **Enum & Seed** — Add `SPACE_FLAG_OFFICE_DOCUMENTS` to enum; seed in `template.content.space.service.ts`
2. **Entity & Migration** — Create `OfficeDocument` entity; add FK to `CalloutContribution`; generate & validate migration
3. **License Traversal** — Add `getCollaborationLicenseFromOfficeDocumentOrFail` to `CommunityResolverService`
4. **Domain Service** — Create `OfficeDocumentService` with entitlement check, write guards, CRUD methods
5. **Authorization Service** — Create `OfficeDocumentAuthorizationService`
6. **GraphQL Resolvers** — Create base resolver, field resolver (`isEntitlementEnabled`), mutations resolver
7. **NestJS Module** — Wire `OfficeDocumentModule` and register in `AppModule`
8. **Integration Service** — Create `OfficeDocumentIntegrationService` + controller + module
9. **Config** — Add `collaboration.office_documents.max_collaborators_in_room` to `alkemio.yml` and types
10. **Schema Contract** — Run `schema:print`, `schema:sort`, `schema:diff`; verify no breaking changes
11. **Unit Tests** — `OfficeDocumentService.isEntitlementEnabled`, `assertEntitlementOrFail`, integration service `info()`
12. **CI Validation** — Lint, type-check, full test run

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| TypeORM entity circular-dependency via CalloutContribution | Low | Medium | Follow existing Memo/Whiteboard pattern exactly; run `pnpm run circular-dependencies` after wiring |
| Migration conflicts with PR #5967 entitlement seeding | Medium | Low | Migration only creates entity table; seeding is in TypeScript service; no conflict expected |
| `isEntitlementEnabledOrFail` leaks license ID in message | Low | Low | Use custom throw with static message + structured `details: { collaborationId }` |
| Integration service naming collision | Low | Low | `OfficeDocumentIntegration` is distinct from `CollaborativeDocumentIntegration` |
| Schema diff reports unexpected BREAKING changes | Low | Medium | Only additive fields; verify with `pnpm run schema:diff` before merging |

## Exit Criteria

- [ ] All acceptance scenarios in US1–US5 pass
- [ ] `SC-001` through `SC-007` verifiable via tests
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm test:ci` passes
- [ ] `schema:diff` shows only additive changes, no BREAKING entries
- [ ] Migration validated via `.scripts/migrations/run_validate_migration.sh`
