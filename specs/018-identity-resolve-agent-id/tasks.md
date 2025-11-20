# Tasks: Identity Resolve Agent ID

**Input**: Design documents from `/specs/018-identity-resolve-agent-id/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included where they provide meaningful signal for this internal API change, in line with Constitution Principle 6.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure local environment and tooling are ready to work on the feature within the existing NestJS server.

- [X] T001 Confirm dependencies installed and workspace compiles with `pnpm build`
- [X] T002 [P] Verify `/rest/internal/identity/resolve` current behaviour via existing tests or local call (no code changes)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core understanding and alignment that MUST be complete before any story implementation.

- [X] T003 Review existing identity resolve implementation and related services in `src/` to identify extension points
- [X] T004 [P] Identify all current internal consumers of `/rest/internal/identity/resolve` (via docs/tests/code search) to validate backward-compatibility assumptions

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Resolve identity returns user and agent IDs (Priority: P1) 🎯 MVP

**Goal**: Internal callers receive both `userId` and `agentId` in a single call when an agent exists for the user.

**Independent Test**: Call `/rest/internal/identity/resolve` for a user with an associated agent and verify both identifiers are returned and consistent.

### Implementation for User Story 1

- [X] T005 [P] [US1] Update identity resolution domain/service logic to also resolve `agentId` from existing mappings in the relevant `src/domain` or `src/services` module
- [X] T006 [US1] Extend `/rest/internal/identity/resolve` REST handler/DTO to include `agentId` in the JSON response while preserving existing fields
- [X] T007 [US1] Update or add tests for `/rest/internal/identity/resolve` to cover the case where both `userId` and `agentId` are returned for a user with an agent (in `test/`)

**Checkpoint**: User Story 1 fully functional and testable independently.

---

## Phase 4: User Story 2 - Behaviour when agent is missing (Priority: P2)

**Goal**: Ensure callers receive a clear error when no agent exists for a valid user that requires `agentId`.

**Independent Test**: Call `/rest/internal/identity/resolve` for a user without an agent and verify the endpoint responds with a well-defined error indicating that no agent mapping exists and does not return identity identifiers.

### Implementation for User Story 2

- [X] T008 [P] [US2] Implement agent lookup in identity resolution logic and raise a clear error when no agent is associated with the resolved user
- [X] T009 [US2] Ensure `/rest/internal/identity/resolve` uses a consistent non-success status code and error message for the "no agent associated" scenario
- [X] T010 [US2] Add or update tests to cover the "no agent associated" scenario, asserting that the endpoint returns the defined error and does not include `userId` or `agentId` in the payload

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements and validation across stories.

- [X] T011 [P] Update docs (e.g., internal API documentation and `quickstart.md`) to reflect the `agentId` field in `/rest/internal/identity/resolve`
- [X] T012 [P] Run full relevant test suites (e.g., targeted Jest specs and any contract tests touching identity resolve)
- [X] T013 Address minor refactors, logging improvements, or comments discovered during implementation and testing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - blocks user story work.
- **User Stories (Phases 3-4)**: Depend on Foundational completion.
- **Polish (Phase 5)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2; no dependencies on other stories.
- **User Story 2 (P2)**: Can start after Phase 2; relies on the shape defined by User Story 1 but remains independently testable.

### Parallel Opportunities

- Tasks marked [P] within a phase can run in parallel when working on different files.
- After Phase 2, work on User Stories 1–2 can proceed in parallel by different contributors, provided they coordinate on shared types and contracts.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate `/rest/internal/identity/resolve` returns both `userId` and `agentId` for users with agents.

### Incremental Delivery

1. Deliver User Story 1 as MVP (P1).
2. Add User Story 2 to cover users without agents.

Each story is independently testable and can be validated before moving to the next.
