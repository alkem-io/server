# Implementation Plan: Application-Wide Unit Test Coverage

**Branch**: `034-unit-tests` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/034-unit-tests/spec.md`

## Summary

Add comprehensive unit tests across the entire Alkemio Server codebase. The project currently has ~20% file-level test coverage (81 spec files covering ~32 of 158 service files). The goal is to reach differentiated targets: Domain 90%+, Common/Library 90%+, Application 80%+, Core 90%+. New tests follow the four established patterns (manual construction, NestJS TestingModule, pure utility, parameterized) and leverage the existing mock infrastructure (50+ pre-built mocks, repository factories, default auto-mocker). No changes to production code, schema, data model, or test infrastructure are required.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16
**Storage**: N/A (no data model changes — test-only feature)
**Testing**: Vitest 4.x (`vitest.config.ts`), `@golevelup/ts-vitest` for DI mocking, `unplugin-swc` for decorators, `vite-tsconfig-paths` for alias resolution
**Target Platform**: Linux server (CI), developer workstations
**Project Type**: Single NestJS monolith
**Performance Goals**: Full test suite ≤ 5 minutes (SC-006). Current baseline ~2-3 min with 81 tests.
**Constraints**: No production code changes. No test infrastructure changes. Tests must be deterministic (zero flaky tests per SC-003).
**Scale/Scope**: ~162 new test files across 6 layers, ~158 total service files when complete.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| **1. Domain-Centric Design First** | PASS | Tests verify domain logic in isolation. No business logic in resolvers tested. |
| **2. Modular NestJS Boundaries** | PASS | Tests are co-located within module boundaries. No cross-module test coupling. |
| **3. GraphQL Schema as Stable Contract** | PASS | No schema changes. Resolver tests verify delegation only, not schema parsing. |
| **4. Explicit Data & Event Flow** | PASS | Tests mock event publishers at boundaries, verifying emission without inline side effects. |
| **5. Observability & Operational Readiness** | PASS | No new modules introduced. Existing logging contexts unchanged. |
| **6. Code Quality with Pragmatic Testing** | PASS | Risk-based approach: domain invariants first, skip trivial pass-through. No 100% target. Meaningful behavioral tests only (FR-009). |
| **7. API Consistency & Evolution** | N/A | No API surface changes. |
| **8. Secure-by-Design Integration** | PASS | Authorization/authentication tests verify grant/deny decisions. No dynamic data in exception messages. |
| **9. Container & Deployment Determinism** | N/A | No deployment changes. |
| **10. Simplicity & Incremental Hardening** | PASS | No architectural escalation. Reuses existing patterns and infrastructure. |

**Gate result**: PASS — no violations. All principles satisfied or not applicable.

## Project Structure

### Documentation (this feature)

```text
specs/034-unit-tests/
├── plan.md              # This file
├── research.md          # Phase 0: coverage analysis and pattern research
├── quickstart.md        # Phase 1: test development guide
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (test files — co-located alongside source)

```text
src/
├── domain/              # P1: 92 services, target 90%+ coverage
│   ├── access/          # role-set (2 tested), credentials, delegation
│   ├── activity-feed/   # ✓ 100% covered
│   ├── agent/           # 0% → 2 services need tests
│   ├── collaboration/   # 9% → 10 services need tests (callout, contribution, post, link, tagset)
│   ├── common/          # 10% → 18 services need tests (profile, visual, whiteboard, form, tag, auth-policy)
│   ├── communication/   # 25% → 6 services need tests (messaging, room, discussion)
│   ├── community/       # 31% → 11 services need tests (virtual-contributor, invitation, application)
│   ├── innovation-hub/  # 0% → 1 service needs tests
│   ├── profile-documents/ # ✓ 100% covered
│   ├── space/           # 22% → 7 services need tests (account, settings, about, lookup)
│   ├── storage/         # 0% → 3 services need tests
│   ├── template/        # 0% → 7 services need tests
│   └── timeline/        # 0% → 3 services need tests
│
├── common/utils/        # P2: 25 util files, 3 tested, 22 need tests, target 90%+ coverage
│   ├── compression.util.ts     # ✓ tested
│   ├── get.diff.ts             # ✓ tested
│   ├── has.only.allowed.fields.ts # ✓ tested
│   └── [22 utility files need tests — see tasks.md T083–T104]
│
├── library/             # P2: 5 service files, 1 tested, 2 need tests, 2 excluded
│   ├── innovation-pack/ # 1 tested (innovation.pack.service), 1 needs tests (defaults)
│   │                    # innovation.pack.service.authorization.ts excluded (pass-through per FR-004)
│   └── library/         # 1 needs tests (library.service)
│                        # library.service.authorization.ts excluded (pass-through per FR-004)
│
├── services/            # P3: 49 services, target 80%+ coverage
│   ├── adapters/        # 2 tested, adapters need tests
│   ├── api/             # 6 tested, API services need tests
│   ├── auth-reset/      # 2 tested
│   ├── external/        # 5 tested, remaining external integrations
│   └── infrastructure/  # 4 tested, event-bus/naming/license
│
├── core/                # P4: 6 services, target 90%+ coverage
│   ├── authentication*/ # 2 tested, 1 needs tests (cache service)
│   ├── authorization/   # ✓ tested
│   ├── bootstrap/       # ✓ tested
│   └── microservices/   # 0% → 1 service needs tests (rabbitmq resilience)
│
├── platform/            # P3: 18 services, 5 tested
│   └── [13 services need tests]
│
└── platform-admin/      # P3: 9 services, 0 tested
    └── [9 services need tests]
```

**Structure Decision**: All test files are co-located alongside their source files following the existing `*.spec.ts` convention. No new directories or structural changes required. Test utilities in `test/` remain unchanged.

## Implementation Strategy

### Execution Phases (by priority)

**Phase 3 — Domain Services (P1)**: 80 services across 13 modules
- Start with 0% coverage modules: template, timeline, agent, storage, innovation-hub
- Then address large-gap modules: collaboration, common domain, space, communication, community
- Use Pattern A (manual construction) for focused behavioral tests
- Use Pattern B (TestingModule) when DI wiring matters

**Phase 4 — Common Utilities & Library (P2)**: 22 utilities + 2 library services
- All utilities use Pattern C (pure function tests)
- Library services use Pattern A or B
- Quick wins — these are the easiest tests to write

**Phase 5 — Application & Platform Services (P3)**: 56 application + platform services
- Filter to non-trivial services only (conditional branching or data transformation per FR-004)
- Use Pattern B (TestingModule) with `defaultMockerFactory`
- Platform-admin services included here

**Phase 6 — Core Services (P4)**: 2 remaining services
- `agent.info.cache.service.ts` — caching logic
- `rabbitmq.resilience.service.ts` — resilience patterns
- Use Pattern B with config mocking

### Key Decisions

1. **No production code changes**: Tests test existing behavior as-is
2. **Replace trivial tests**: Existing `should be defined` tests are replaced with behavioral tests
3. **Skip pass-through wrappers**: Services with no conditional logic excluded per FR-009
4. **Co-located files**: `*.spec.ts` next to `*.service.ts` per FR-012
5. **Existing infrastructure reuse**: All 50+ mocks, factories, and data builders leveraged — no new infrastructure

### Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| CI time exceeds 5-min budget | Monitor after each phase. Vitest fork-pool handles parallelism. |
| Flaky tests from async operations | Use deterministic mocks, avoid real timers, mock all I/O |
| Mock infrastructure gaps | Extend existing factories incrementally (new entity builders as needed) |
| Over-testing pass-through code | Apply FR-004 filter: only services with branching/transformation |

## Complexity Tracking

> No constitution violations to justify. All gates pass.

_No entries required._
