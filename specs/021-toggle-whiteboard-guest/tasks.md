---
description: 'Task list for implementing whiteboard guest access toggling'
---

# Tasks: Whiteboard Guest Access Toggle

**Input**: Design documents from `/specs/021-toggle-whiteboard-guest/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Automated tests are included when they deliver clear signal for the guest toggle paths per Constitution Principle 6.

**Organization**: Tasks are grouped by user story so each slice can be delivered and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Task can run in parallel (independent files, no ordering dependency)
- **[Story]**: Maps the task to a user story (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align the workspace and contracts before implementation begins.

- [x] T001 Install project dependencies via `pnpm install` to sync workspace tooling (package.json)
- [x] T002 Generate a clean GraphQL baseline via `pnpm run schema:print` for later diffing (schema.graphql)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting elements required before delving into any user story.

- [x] T003 Add the `GLOBAL_GUEST` enum entry and export so credentials can be assigned (src/common/enums/authorization.credential.ts)
- [x] T004 Surface `guestContributionsAllowed` as a computed field on the Whiteboard GraphQL DTO using existing exports (update `src/domain/common/whiteboard/whiteboard.interface.ts` while leaving `src/domain/common/whiteboard/dto/whiteboard.dto.create.ts` and `src/domain/common/whiteboard/dto/whiteboard.dto.update.ts` input shapes untouched)
- [x] T005 Create and register `WhiteboardGuestAccessService` with dependency injection wiring (src/domain/common/whiteboard/whiteboard.guest-access.service.ts)

**Checkpoint**: Domain and schema primitives for guest access exist and are wired through the whiteboard module.

---

## Phase 3: User Story 1 – Enable Guest Access (Priority: P1) 🎯 MVP

**Goal**: PUBLIC_SHARE holders can enable guest collaboration, granting GLOBAL_GUEST permissions and surfacing `guestContributionsAllowed = true` without issuing share tokens.

**Independent Test**: Execute `updateWhiteboardGuestAccess` with `guestAccessEnabled: true` and confirm GLOBAL_GUEST receives READ/WRITE/CONTRIBUTE plus `guestContributionsAllowed` flips to true with no share metadata returned.

### Tests for User Story 1

- [x] T006 [US1] Add unit tests proving enable flow grants GLOBAL_GUEST permissions idempotently (test/unit/domain/common/whiteboard/whiteboard.guest-access.service.spec.ts)
- [x] T007 [P] [US1] Add resolver unit tests ensuring the enable mutation reflects updated access grants (test/unit/domain/common/whiteboard/whiteboard.resolver.mutations.spec.ts)

### Implementation for User Story 1

- [x] T008 [US1] Define input/output DTOs (`UpdateWhiteboardGuestAccessInput`, result union) and export them for schema generation (src/domain/common/whiteboard/dto/whiteboard.dto.guest-access.toggle.ts)
- [x] T009 [US1] Implement enable branch in `WhiteboardGuestAccessService` to validate PUBLIC_SHARE, check `Space.allowGuestContribution`, and grant GLOBAL_GUEST permissions (src/domain/common/whiteboard/whiteboard.guest-access.service.ts)
- [x] T010 [US1] Wire `updateWhiteboardGuestAccess` mutation, map service result to the GraphQL payload, and ensure contract alignment (src/domain/common/whiteboard/whiteboard.resolver.mutations.ts)
- [x] T011 [US1] Sync the GraphQL contract sample with the schema updates for documentation and tooling (specs/021-toggle-whiteboard-guest/contracts/updateWhiteboardGuestAccess.graphql)

**Checkpoint**: Enabling guest access works end-to-end with schema artifacts ready for diffing.

---

## Phase 4: User Story 2 – Disable Guest Access (Priority: P2)

**Goal**: Authorized members can revoke guest collaboration immediately, removing GLOBAL_GUEST permissions and clearing the flag.

**Independent Test**: Run the mutation with `guestAccessEnabled: false` and confirm `guestContributionsAllowed = false`, GLOBAL_GUEST assignments disappear, and guest routes return not found on the next access.

### Tests for User Story 2

- [x] T012 [US2] Extend unit tests to cover disable flow, ensuring permissions are revoked and concurrent toggles settle deterministically (test/unit/domain/common/whiteboard/whiteboard.guest-access.service.spec.ts)
- [x] T013 [P] [US2] Add resolver unit tests validating disabled responses and guest-route invalidation behavior (test/unit/domain/common/whiteboard/whiteboard.resolver.mutations.spec.ts)

### Implementation for User Story 2

- [x] T014 [US2] Implement disable branch logic removing GLOBAL_GUEST assignments and clearing cached access state (src/domain/common/whiteboard/whiteboard.guest-access.service.ts)
- [x] T015 [US2] Ensure resolver payload reflects revoked access grants and updated `guestContributionsAllowed` while keeping mutation idempotent (src/domain/common/whiteboard/whiteboard.resolver.mutations.ts)

**Checkpoint**: Disabling guest access reliably removes permissions and reports the final state.

---

## Phase 5: User Story 3 – Prevent Unauthorized Toggle (Priority: P3)

**Goal**: Reject toggle attempts lacking PUBLIC_SHARE or when the space disallows guest contributions, returning descriptive errors without mutating state.

**Independent Test**: Attempt the mutation with insufficient privileges or against `allowGuestContribution = false` and verify a structured error plus unchanged permissions.

### Tests for User Story 3

- [x] T016 [US3] Add unit coverage for missing PUBLIC_SHARE and disallowed space cases, confirming no changes occur (test/unit/domain/common/whiteboard/whiteboard.guest-access.service.spec.ts)
- [x] T017 [P] [US3] Add resolver unit tests asserting mutation errors include codes/messages and that whiteboard access remains stable (test/unit/domain/common/whiteboard/whiteboard.resolver.mutations.spec.ts)

### Implementation for User Story 3

- [x] T018 [US3] Enforce authorization + space constraints inside the service with domain-specific exceptions (src/domain/common/whiteboard/whiteboard.guest-access.service.ts)
- [x] T019 [US3] Map domain errors to GraphQL error shapes so the mutation returns descriptive failures (src/domain/common/whiteboard/whiteboard.resolver.mutations.ts)

**Checkpoint**: Unauthorized scenarios consistently produce errors and leave state untouched.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Harden telemetry, docs, and regression coverage once all stories pass.

- [x] T020 Refresh quickstart instructions with finalized mutation payload and verification steps (specs/021-toggle-whiteboard-guest/quickstart.md)
- [x] T021 Emit debug-level structured logs for toggle outcomes with correlation IDs (src/domain/common/whiteboard/whiteboard.guest-access.service.ts)
- [x] T022 Regenerate, sort, and diff the GraphQL schema to satisfy the contract gate (schema.graphql)
- [x] T023 Run targeted unit suites for the guest access toggle feature and capture artifacts (test/unit/domain/common/whiteboard/\*.spec.ts)

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

- Resolver unit tests for each user story (T007, T013, T017) reside in separate files and can be developed or executed concurrently after their respective domain logic stabilizes.
- Documentation and telemetry hardening tasks in Phase 6 (T020, T021) can proceed in parallel once stories close.

---

## Parallel Example: User Story 1

```bash
# After implementing the service (T009) and resolver (T010), create tests in parallel:
# Terminal 1
pnpm exec jest test/unit/domain/common/whiteboard/whiteboard.guest-access.service.spec.ts --watch
# Terminal 2
 pnpm exec jest test/unit/domain/common/whiteboard/whiteboard.resolver.mutations.spec.ts --watch
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
- Developer B: Build and evolve resolver unit tests (T007, T013, T017) in parallel as implementations stabilize.
- Developer C: Handle documentation, logging, and schema validation during Phase 6.

---

## Checklist Format Validation

All tasks above follow the `- [ ] T### [P?] [Story] Description (path)` structure, ensuring unambiguous execution by an LLM or developer.

---

## Task Summary & Validation ✅

- Total tasks: **23**
  - Phase 1: 2 tasks (T001–T002)
  - Phase 2: 3 tasks (T003–T005)
  - Phase 3: 6 tasks (T006–T011)
  - Phase 4: 4 tasks (T012–T015)
  - Phase 5: 4 tasks (T016–T019)
  - Phase 6: 4 tasks (T020–T023)
- Independent acceptance tests precede each user story section and describe the validation scenario.
- Spot-checked formatting confirms every task retains `[ID] [P?] [Story] Description (path)` with concrete file references per the template instructions.
