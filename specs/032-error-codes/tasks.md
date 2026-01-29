# Tasks: 5-Digit Numeric Error Code System

**Input**: Design documents from `/specs/032-error-codes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md
**Branch**: `001-error-codes`

**Tests**: Test tasks are included where specified (T010-T013, T016-T018, T023-T024, T026-T027).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Repository root structure:

- Source: `src/`
- Tests: `test/`
- Documentation: `docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create foundational error code infrastructure that all user stories depend on

- [x] T001 Create ErrorCategory enum in src/common/enums/error.category.ts
- [x] T002 [P] Create ErrorMetadata interface in src/common/exceptions/error.status.metadata.ts
- [x] T003 [P] Export ErrorCategory from src/common/enums/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Complete error code registry mapping - MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: All 71 AlkemioErrorStatus values must be mapped before user stories can deliver value

- [x] T004 Implement ERROR_CODE_REGISTRY Map in src/common/exceptions/error.status.metadata.ts with all 71 error code mappings from research.md
- [x] T005 Implement computeNumericCode() function and FALLBACK_METADATA in src/common/exceptions/error.status.metadata.ts
- [x] T006 Implement getMetadataForStatus() helper function in src/common/exceptions/error.status.metadata.ts
- [x] T007 Implement validateRegistryCompleteness() validation function in src/common/exceptions/error.status.metadata.ts

**Checkpoint**: Error code registry complete with all mappings - user story implementation can now begin

---

## Phase 3: User Story 1 - Error Code Reference for Support (Priority: P1) 🎯 MVP

**Goal**: Every error response includes a 5-digit numeric code that users can reference when contacting support

**Independent Test**: Trigger any error condition (e.g., access non-existent resource) and verify the GraphQL error response includes both `code` (string) and `numericCode` (5-digit number) in extensions

### Implementation for User Story 1

- [x] T008 [US1] Modify BaseException constructor to call getMetadataForStatus()/computeNumericCode() and add numericCode/userMessage to extensions in src/common/exceptions/base.exception.ts
- [x] T009 [P] [US1] Modify BaseHttpException constructor to add numericCode to extensions in src/common/exceptions/http/base.http.exception.ts
- [x] T010 [US1] Add unit test verifying ENTITY_NOT_FOUND returns numericCode 10101 in src/common/exceptions/error.status.metadata.spec.ts
- [x] T011 [US1] Add unit test verifying FORBIDDEN_POLICY returns numericCode 11104 in src/common/exceptions/error.status.metadata.spec.ts

**Checkpoint**: All errors now return numeric codes in GraphQL responses - users can reference codes for support

---

## Phase 4: User Story 2 - Error Category Identification (Priority: P1)

**Goal**: Support teams can identify error category from first two digits of error code for fast triage

**Independent Test**: Examine multiple error codes across categories (10101, 11104, 12101, 13109, 14101) and verify first two digits match category (10=NotFound, 11=Auth, 12=Validation, 13=Operations, 14=System)

### Implementation for User Story 2

- [x] T012 [P] [US2] Add unit test validating all codes have first two digits matching category in src/common/exceptions/error.status.metadata.spec.ts
- [x] T013 [P] [US2] Add unit test verifying all codes are in valid range 10000-99999 in src/common/exceptions/error.status.metadata.spec.ts
- [x] T014 [P] [US2] Create error code documentation in docs/error-codes.md with category explanations and complete mapping table
- [x] T015 [US2] Add category examples to docs/error-codes.md showing 10xxx=NotFound, 11xxx=Authorization, 12xxx=Validation, 13xxx=Operations, 14xxx=System

**Checkpoint**: Error codes follow consistent categorization scheme - support can triage by first two digits

---

## Phase 5: User Story 3 - Backward Compatible API Response (Priority: P2)

**Goal**: Existing API consumers continue working unchanged while new integrations can adopt numeric codes

**Independent Test**: Verify error responses contain both `code: "ENTITY_NOT_FOUND"` (string) and `numericCode: 10101` (number) in extensions - existing code checking `code === "ENTITY_NOT_FOUND"` still works

### Implementation for User Story 3

- [x] T016 [P] [US3] Add unit test verifying both code and numericCode are present in BaseException extensions in src/common/exceptions/base.exception.spec.ts
- [x] T017 [P] [US3] Add unit test verifying string code unchanged (ENTITY_NOT_FOUND remains "ENTITY_NOT_FOUND") in src/common/exceptions/base.exception.spec.ts
- [x] T018 [US3] Add integration test triggering ENTITY_NOT_FOUND error via REST and verifying both fields present in test/integration/error-handling/error-extensions.spec.ts
- [x] T019 [US3] Document backward compatibility in docs/error-codes.md with before/after JSON examples

**Checkpoint**: Backward compatibility validated - existing error handling code unaffected by new numeric codes

---

## Phase 6: User Story 4 - Fallback for Unmapped Errors (Priority: P3)

**Goal**: Unmapped or unexpected errors return fallback code 99999 with warning log - no errors go unreported

**Independent Test**: Trigger an error with unmapped AlkemioErrorStatus value and verify it returns numericCode 99999 with warning logged

### Implementation for User Story 4

- [x] T020 [P] [US4] Add logger initialization function setErrorCodeLogger() in src/common/exceptions/error.status.metadata.ts
- [x] T021 [P] [US4] Add warning log to getMetadataForStatus() when unmapped status encountered in src/common/exceptions/error.status.metadata.ts
- [x] T022 [US4] Initialize error code logger in src/main.ts using setErrorCodeLogger()
- [x] T023 [US4] Add unit test verifying fallback code 99999 returned for unknown status in src/common/exceptions/error.status.metadata.spec.ts
- [x] T024 [US4] Add unit test verifying warning logged when fallback used in src/common/exceptions/error.status.metadata.spec.ts
- [x] T025 [US4] Document fallback behavior and logging in docs/error-codes.md

**Checkpoint**: All errors traceable - unmapped errors return fallback code with warning for developer awareness

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation, documentation, and quality improvements across all user stories

- [x] T026 [P] Add unit test verifying all 71 AlkemioErrorStatus values are mapped (no gaps) in src/common/exceptions/error.status.metadata.spec.ts
- [x] T027 [P] Add unit test verifying all numeric codes are unique (no duplicates) in src/common/exceptions/error.status.metadata.spec.ts
- [x] T028 [P] Update docs/error-codes.md with suggested resolution steps for each category
- [x] T029 [P] Add examples to docs/error-codes.md showing how frontend can use numeric codes
- [x] T030 Run pnpm lint to verify TypeScript compilation and ESLint rules pass
- [x] T031 Run pnpm test to verify all unit tests pass
- [x] T032 Validate error response format matches quickstart.md examples by triggering sample errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Independent of US1 (validates same registry)
- **User Story 3 (P2)**: Can start after Foundational - Builds on US1 by validating backward compatibility
- **User Story 4 (P3)**: Can start after Foundational - Independent (tests fallback behavior)

### Within Each User Story

- US1: BaseException modification → HTTP exception modification → tests
- US2: Tests can run in parallel → documentation
- US3: Tests can run in parallel → documentation
- US4: Logger setup → warning implementation → tests

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel (different files)
- **Phase 3 (US1)**: T009 and T010 can run in parallel after T008 completes
- **Phase 4 (US2)**: T012, T013, T014 can all run in parallel (different test files/docs)
- **Phase 5 (US3)**: T016, T017, T018 can all run in parallel (different test files)
- **Phase 6 (US4)**: T020, T021 can run in parallel (same file, different functions)
- **Phase 7**: T026, T027, T028, T029 can all run in parallel (different files)
- **User Stories 1-4**: After Foundational completes, all user stories can start in parallel if team capacity allows

---

## Parallel Example: User Story 2

```bash
# Launch all US2 tasks together after Foundational complete:
Task: "Add unit test validating all codes have first two digits matching category"
Task: "Add unit test verifying all codes are in valid range 10000-99999"
Task: "Create error code documentation in docs/error-codes.md with category explanations"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - all 71 codes mapped)
3. Complete Phase 3: User Story 1 (numeric codes in responses)
4. Complete Phase 4: User Story 2 (category validation + docs)
5. **STOP and VALIDATE**: Test errors return numeric codes, verify categorization
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → All codes mapped
2. Add User Story 1 → Test independently → Deploy (MVP - users can reference codes!)
3. Add User Story 2 → Test independently → Deploy (support can triage by category)
4. Add User Story 3 → Test independently → Deploy (backward compatibility confirmed)
5. Add User Story 4 → Test independently → Deploy (fallback safety net)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (critical foundation)
2. Once Foundational done (all codes mapped):
   - Developer A: User Story 1 (BaseException modifications)
   - Developer B: User Story 2 (validation tests + docs)
   - Developer C: User Story 4 (fallback + logging)
3. User Story 3 (backward compat tests) can follow US1
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Phase 2 (Foundational) is critical - all 71 error codes must be mapped before user stories deliver value
- Zero breaking changes required - existing `code` field remains unchanged
- Numeric codes are compile-time constants - no database changes
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total: 32 tasks across 7 phases
