# Tasks: Store Kratos Identity on Users

**Input**: Design documents from `/specs/014-kratos-authid/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included where the specification calls for independent validation of each story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared fixtures and testing scaffolding needed by all stories.

- [X] T001 [P] Create Kratos identity fixture dataset for automated tests in test/data/identity/kratos.identity.sample.json
- [X] T002 [P] Add reusable Kratos identity mock helper in test/utils/kratos.identity.mock.ts
- [X] T003 [P] Scaffold identity resolution testing app factory in test/utils/identity-resolution.app.factory.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

- [X] T004 Update src/domain/community/user/user.entity.ts to add nullable unique authId column and supporting metadata
- [X] T005 [P] Update src/domain/community/user/user.interface.ts to expose authId and re-export via src/domain/community/user/index.ts
- [X] T006 Create DuplicateAuthIdException in src/common/exceptions/user/duplicate.authid.exception.ts and register it in exception barrels
- [X] T007 [P] Extend src/domain/community/user-lookup/user.lookup.service.ts to support lookups by authId with diagnostic logging
- [X] T008 Add getIdentityById with retry/timeout support to src/services/infrastructure/kratos/kratos.service.ts

**Checkpoint**: Foundation ready – user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Resolve users by Kratos identity (Priority: P1) 🎯 MVP

**Goal**: Provide an internal REST endpoint that resolves or provisions an Alkemio user when given a Kratos identity identifier.

**Independent Test**: Call `POST /rest/internal/identity/resolve` with existing and new Kratos identities; expect lookup to return the correct user ID and provisioning to create a new user ID with audit logs.

### Tests for User Story 1

- [X] T009 [P] [US1] Create identity-resolution integration tests in test/integration/identity-resolution/identity-resolution.e2e-spec.ts covering lookup, provisioning, and Kratos failure/alert flows
- [X] T010 [P] [US1] Add unit tests for identity-resolution service orchestration in src/services/api-rest/identity-resolution/__tests__/identity-resolution.service.spec.ts including retry/backoff paths and metric emission

### Implementation for User Story 1

- [X] T011 [P] [US1] Create request and response DTOs under src/services/api-rest/identity-resolution/dto/ with class-validator rules
- [X] T012 [US1] Implement identity-resolution service in src/services/api-rest/identity-resolution/identity-resolution.service.ts with UserService/KratosService orchestration, retries/backoff around Kratos calls, and graceful error mapping
- [X] T013 [US1] Wire structured logging and Prometheus metrics for identity-resolution outcomes in src/services/api-rest/identity-resolution/identity-resolution.service.ts
- [X] T014 [US1] Implement identity-resolution controller POST handler in src/services/api-rest/identity-resolution/identity-resolution.controller.ts leveraging correlation IDs (guard intentionally omitted per documented exception)
- [X] T015 [US1] Create identity-resolution Nest module and register it in src/app.module.ts (no schema-bootstrap changes)
- [X] T016 [US1] Align specs/014-kratos-authid/contracts/openapi.yaml with network-isolated access (remove bearer security, update success/error examples)

**Checkpoint**: Identity resolution REST endpoint is fully functional and independently testable.

---

## Phase 4: User Story 2 - Preserve identity linkage for existing users (Priority: P2)

**Goal**: Backfill and persist Kratos identity identifiers for all existing users using the defined migration workflow.

**Independent Test**: Run the new migration on a staging snapshot; verify every user receives the correct authId or is listed in the audit report, and ensure migration reverts cleanly.

### Tests for User Story 2

- [X] T017 [P] [US2] Add migration regression test in tests/migration/add-user-authid.migration.spec.ts covering backfill, audit capture, and rollback

### Implementation for User Story 2

- [X] T018 [US2] Implement TypeORM migration in src/migrations/1762700000000-userAuthIdBackfill.ts to add the column, unique index, batched backfill, and audit table writes
- [X] T019 [P] [US2] Create Kratos admin client helper for migrations at src/migrations/utils/kratos.identity.fetcher.ts
- [X] T020 [US2] Update .scripts/migrations/run_validate_migration.sh to capture authId backfill audit artifacts, emit metrics, and surface exceptions
- [X] T021 [US2] Add migration-only assignAuthId helper with structured logging/metrics to src/domain/community/user/user.service.ts for reuse in data fixes

**Checkpoint**: Existing users carry persisted authId values with audit coverage for unresolved identities.

---

## Phase 5: User Story 3 - Capture identity for newly created users (Priority: P3)

**Goal**: Ensure all new user creation flows persist the Kratos identity identifier and reject duplicates.

**Independent Test**: Execute the standard registration flow and confirm the resulting user record stores authId, with duplicates rejected during retries.

### Tests for User Story 3

- [X] T022 [P] [US3] Extend src/domain/community/user/user.service.spec.ts with cases verifying authId persistence and duplicate rejection
- [X] T023 [P] [US3] Create registration flow integration test in test/integration/registration/registration.authid.e2e-spec.ts ensuring authId storage

### Implementation for User Story 3

- [X] T024 [US3] Add authId field to AgentInfo in src/core/authentication.agent.info/agent.info.ts and update related typings
- [X] T025 [US3] Update src/core/authentication/authentication.service.ts to populate AgentInfo.authId from Kratos identities
- [X] T026 [US3] Update src/services/api/registration/registration.service.ts to require and pass authId when provisioning users
- [X] T027 [US3] Update src/domain/community/user/user.service.ts createUserFromAgentInfo to persist authId and block duplicates via new exception

**Checkpoint**: New user onboarding retains authId consistently without duplicate assignments.

---

## Phase 6: User Story 4 - Provide traceability for support investigations (Priority: P4)

**Goal**: Give support specialists quick access to a user’s Kratos identity identifier through admin tooling and exports.

**Independent Test**: Query the new admin endpoint for a user ID and verify the authId is returned; export user data for audits and confirm the authId column is present.

### Implementation for User Story 4

- [X] T028 [P] [US4] Create admin query exposing user authId with authorization checks in src/platform-admin/domain/user/admin.users.resolver.queries.ts
- [X] T029 [US4] Update src/platform-admin/domain/user/admin.users.module.ts to register the new admin users queries resolver
- [X] T030 [US4] Include authId column in user export indexing within src/services/api/search/ingest/search.ingest.service.ts for audit consumption

**Checkpoint**: Support tooling exposes authId for investigations and reporting.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, tooling, and quality follow-ups impacting multiple stories.

- [X] T031 [P] Document authId backfill audit follow-up steps in docs/DataManagement.md
- [X] T032 [P] Update docs/authorization-forest.md with identity resolution logging and admin access notes
- [X] T033 Add identity-resolution test runner script to package.json for targeted CI execution

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → enables Foundational tasks.
- **Foundational (Phase 2)** → BLOCKS all user story phases; complete before Phase 3+.
- **User Stories (Phases 3–6)** → Each depends on Phase 2; US1 precedes others for MVP delivery. US2 and US3 can start after Foundational but US3 reuses migration primitives from US2.
- **Polish (Phase 7)** → Runs after desired user stories are complete.

### User Story Dependencies

| Story | Depends On | Notes |
| ----- | ---------- | ----- |
| US1   | Phase 2    | Establishes REST endpoint MVP |
| US2   | Phase 2    | Uses authId column from Foundational |
| US3   | Phase 2, US2 | Reuses migration-safe duplicate guards |
| US4   | Phase 2, US1 | Reads data written by earlier stories |

### Parallel Opportunities

- T001–T003 can run concurrently.
- T005, T007, and T008 are independent once T004 is staged.
- Within US1: T009 & T010 (tests) and T011 (DTOs) can proceed in parallel.
- Across user stories: US2 migration work (T017–T021) can progress while US1 endpoint wiring (T012–T016) is underway, provided Foundational tasks are complete.

Parallel example for US1:

```bash
# After foundational work:
# Terminal 1 (tests)
pnpm run test -- test/integration/identity-resolution/identity-resolution.e2e-spec.ts

# Terminal 2 (DTOs)
code src/services/api-rest/identity-resolution/dto/

# Terminal 3 (service implementation)
code src/services/api-rest/identity-resolution/identity-resolution.service.ts
```

---

## Implementation Strategy

1. Complete Phases 1–2 to unlock user story work.
2. Deliver **US1** as the MVP endpoint; validate via tests from T009 and T010.
3. Proceed with **US2** to backfill existing data, then **US3** to secure future onboarding.
4. Implement **US4** for support visibility once prior data paths are stable.
5. Finish with Phase 7 polish to update documentation and tooling.

### Suggested MVP Scope

- Phases 1–3 (through T016) provide a working identity resolution endpoint suitable for early integration.

### Total Tasks

- **Total**: 33 tasks
- **Per User Story**:
  - US1: 8 tasks
  - US2: 5 tasks
  - US3: 6 tasks
  - US4: 3 tasks

### Independent Test Criteria Summary

- **US1**: Endpoint integration test exercising lookup/provision/error paths.
- **US2**: Migration regression test validating backfill and rollback with audit output.
- **US3**: Registration and domain tests ensuring authId persistence and duplicate handling.
- **US4**: Admin query retrieval plus export verification including authId column.

All tasks follow the required checklist format with sequential IDs, parallel markers, story labels, and concrete file paths.
