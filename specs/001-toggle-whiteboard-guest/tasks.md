---
description: 'Task list for implementing whiteboard guest access toggling'
---

# Tasks: Whiteboard Guest Access Toggle

**Input**: Design documents from `/specs/001-toggle-whiteboard-guest/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Automated tests are included when they deliver clear signal for the guest toggle paths per Constitution Principle 6.

**Organization**: Tasks are grouped by user story so each slice can be delivered and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Task can run in parallel (independent files, no ordering dependency)
- **[Story]**: Maps the task to a user story (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align the workspace and contracts before implementation begins.

- [ ] T001 Install project dependencies via `pnpm install` to sync workspace tooling (package.json)
- [ ] T002 Generate a clean GraphQL baseline via `pnpm run schema:print` for later diffing (schema.graphql)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting elements required before delving into any user story.

- [ ] T003 Add the `GLOBAL_GUEST` enum entry and export so credentials can be assigned (src/common/enums/authorization.credential.ts)
- [ ] T004 Surface `guestContributionsAllowed` as a computed field on the Whiteboard GraphQL DTO using existing exports (update `src/domain/common/whiteboard/whiteboard.interface.ts` while leaving `src/domain/common/whiteboard/dto/whiteboard.dto.create.ts` and `src/domain/common/whiteboard/dto/whiteboard.dto.update.ts` input shapes untouched)
- [ ] T005 Create and register `WhiteboardGuestAccessService` with dependency injection wiring (src/domain/common/whiteboard/whiteboard.guest-access.service.ts)

**Checkpoint**: Domain and schema primitives for guest access exist and are wired through the whiteboard module.

---

## Phase 3: User Story 1 - Enable Guest Access (Priority: P1) 🎯 MVP

**Goal**: Allow PUBLIC_SHARE privilege holders to enable guest collaboration by granting GLOBAL_GUEST permissions and reflecting `guestContributionsAllowed = true`.

**Independent Test**: Execute the mutation with `guestAccessEnabled: true` and verify the response includes GLOBAL_GUEST permissions and `guestContributionsAllowed = true` without emitting share tokens.

### Tests for User Story 1

- [ ] T006 [US1] Add domain unit coverage ensuring enabling guest access assigns GLOBAL_GUEST with READ/WRITE/CONTRIBUTE and remains idempotent when toggled on repeatedly (test/unit/domain/common/whiteboard/whiteboard.guest-access.service.spec.ts)
- [ ] T007 [P] [US1] Add GraphQL integration test validating enable mutation response (test/integration/services/whiteboard/updateWhiteboardGuestAccess.enable.spec.ts)

### Implementation for User Story 1

- [ ] T008 [US1] Define `UpdateWhiteboardGuestAccessInput`/result DTOs and export them for GraphQL schema generation (src/domain/common/whiteboard/dto/whiteboard.dto.guest-access.toggle.ts)
- [ ] T009 [US1] Implement enable branch in `WhiteboardGuestAccessService` to enforce PUBLIC_SHARE and grant GLOBAL_GUEST permissions (src/domain/common/whiteboard/whiteboard.guest-access.service.ts)
- [ ] T010 [US1] Expose `updateWhiteboardGuestAccess` mutation and map payload to the updated whiteboard (src/domain/common/whiteboard/whiteboard.resolver.mutations.ts)

**Checkpoint**: Enabling guest access works end-to-end with passing tests and updated GraphQL schema artifacts ready for diffing.

---

## Phase 4: User Story 2 - Disable Guest Access (Priority: P2)

**Goal**: Allow PUBLIC_SHARE privilege holders to revoke guest collaboration instantly by removing GLOBAL_GUEST permissions and clearing the flag.

**Independent Test**: Execute the mutation with `guestAccessEnabled: false` and confirm `guestContributionsAllowed = false` and GLOBAL_GUEST assignments are removed.

### Tests for User Story 2

- [ ] T011 [US2] Extend unit coverage ensuring disable flow removes GLOBAL_GUEST credential assignments and resolves concurrent enable/disable commands deterministically (test/unit/domain/common/whiteboard/whiteboard.guest-access.service.spec.ts)
- [ ] T012 [P] [US2] Add GraphQL integration test confirming disable mutation response, access revocation, and that racing enable/disable requests leave the final state matching the last accepted toggle (test/integration/services/whiteboard/updateWhiteboardGuestAccess.disable.spec.ts)

### Implementation for User Story 2

- [ ] T013 [US2] Implement disable branch in `WhiteboardGuestAccessService` to revoke GLOBAL_GUEST and update persistence (src/domain/common/whiteboard/whiteboard.guest-access.service.ts)
- [ ] T014 [US2] Ensure mutation resolver propagates disabled state and refreshed access grants (src/domain/common/whiteboard/whiteboard.resolver.mutations.ts)

**Checkpoint**: Disabling guest access removes permissions immediately and is reflected in API responses and tests.

---

## Phase 5: User Story 3 - Prevent Unauthorized Toggle (Priority: P3)

**Goal**: Block toggle attempts for members without PUBLIC_SHARE or when `allowGuestContribution` is false, returning descriptive errors without state changes.

**Independent Test**: Attempt the mutation as a member lacking PUBLIC_SHARE or in a space with guest contributions disabled and verify the mutation returns an authorization error with no state changes.

### Tests for User Story 3

- [ ] T015 [US3] Extend unit coverage for missing PUBLIC_SHARE and `allowGuestContribution` false scenarios (test/unit/domain/common/whiteboard/whiteboard.guest-access.service.spec.ts)
- [ ] T016 [P] [US3] Add GraphQL integration test verifying unauthorized toggle errors leave permissions unchanged (test/integration/services/whiteboard/updateWhiteboardGuestAccess.unauthorized.spec.ts)

### Implementation for User Story 3

- [ ] T017 [US3] Add guards in `WhiteboardGuestAccessService` enforcing PUBLIC_SHARE and space configuration with structured error payloads (src/domain/common/whiteboard/whiteboard.guest-access.service.ts)
- [ ] T018 [US3] Map domain errors to GraphQL error results for the mutation (src/domain/common/whiteboard/whiteboard.resolver.mutations.ts)

**Checkpoint**: Unauthorized scenarios produce deterministic errors and preserve existing access state.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Harden telemetry, docs, and regression coverage once all stories pass.

- [ ] T019 Refresh quickstart instructions with finalized mutation payload and verification steps (specs/001-toggle-whiteboard-guest/quickstart.md)
- [ ] T020 Emit debug-level structured logs for toggle outcomes with correlation IDs (src/domain/common/whiteboard/whiteboard.guest-access.service.ts)
- [ ] T021 Regenerate, sort, and diff the GraphQL schema to satisfy the contract gate (schema.graphql)
- [ ] T022 Run targeted unit and integration suites for the guest access toggle feature (test/integration/services/whiteboard/updateWhiteboardGuestAccess.enable.spec.ts)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; must finish before foundational work.
- **Foundational (Phase 2)**: Depends on Setup; unlocks all user story phases by introducing shared primitives.
- **User Stories (Phases 3-5)**: Each depends on Foundational completion; implement in priority order P1 → P2 → P3 for smooth schema evolution.
- **Polish (Phase 6)**: Runs after all targeted user stories are complete and stable.

### User Story Dependencies

- **US1 (Enable)**: First executable slice once foundational tasks finish; establishes mutation contract.
- **US2 (Disable)**: Builds upon US1 service wiring to add the reverse operation.
- **US3 (Unauthorized)**: Leverages US1/US2 logic to ensure guards and error mapping.

### Within Each User Story

1. Implement domain logic
2. Wire GraphQL resolver and DTOs
3. Add/extend automated tests
4. Verify independent acceptance criteria before proceeding

### Parallel Opportunities

- Integration tests for each user story (T007, T012, T016) reside in separate files and can be developed or executed concurrently after their respective domain logic stabilizes.
- Documentation and telemetry hardening tasks in Phase 6 (T019, T020) can proceed in parallel once stories close.

---

## Parallel Example: User Story 1

```bash
# After implementing the service (T009) and resolver (T010), create tests in parallel:
# Terminal 1
pnpm exec jest test/unit/domain/common/whiteboard/whiteboard.guest-access.service.spec.ts --watch
# Terminal 2
pnpm exec jest test/integration/services/whiteboard/updateWhiteboardGuestAccess.enable.spec.ts --watch
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1 and Phase 2 tasks to unlock domain primitives.
2. Deliver Phase 3 (US1) to ship the enabling flow with tests — this is the MVP.
3. Validate schema artifacts and ensure GraphQL mutation works end-to-end.

### Incremental Delivery

1. Deliver US1 (enable) as the first increment.
2. Layer US2 (disable) to make the toggle reversible without impacting US1.
3. Add US3 for hardened authorization and error handling.
4. Finish with Polish tasks for observability and documentation.

### Team Parallelisation

- Developer A: Focus on domain/service logic for US1 and US2.
- Developer B: Build and evolve integration tests (T007, T012, T016) in parallel as implementations stabilize.
- Developer C: Handle documentation, logging, and schema validation during Phase 6.

---

## Checklist Format Validation

All tasks above follow the `- [ ] T### [P?] [Story] Description (path)` structure, ensuring unambiguous execution by an LLM or developer.
