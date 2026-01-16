# Tasks: Template Content Options

**Feature**: `026-template-content-options`
**Input**: Design documents from `specs/026-template-content-options/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: This feature includes unit tests and integration tests as specified in the feature requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and GraphQL contract changes

- [ ] T001 [P] Add `deleteExistingCallouts` field to UpdateCollaborationFromSpaceTemplateInput DTO in `src/services/api/collaboration/dto/collaboration.dto.update.from.template.ts`
- [ ] T002 [P] Update GraphQL mutation docstring for `updateCollaborationFromSpaceTemplate` in `src/services/api/collaboration/collaboration.resolver.mutations.ts` with behavior matrix and execution order
- [ ] T003 Regenerate GraphQL schema artifacts by running `pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff`
- [ ] T004 Verify backward compatibility by checking that default values work without explicit parameters in existing integration tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service layer implementation that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Update `updateCollaborationFromTemplateContentSpace()` method signature to accept `deleteExistingCallouts` parameter in `src/domain/template/template-applier/template.applier.service.ts`
- [ ] T006 Implement callout deletion loop (BEFORE existing flow update logic) following the pattern from `CalloutsSetService.deleteCalloutsSet()` (lines 140-162) in `src/domain/template/template-applier/template.applier.service.ts`
- [ ] T007 Pass `deleteExistingCallouts` from resolver to service method in `src/services/api/collaboration/collaboration.resolver.mutations.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Replace All Posts When Applying Template (Priority: P1) 🎯 MVP

**Goal**: Administrators can completely reset SubSpace content to match a new template by deleting all existing posts and replacing with template posts

**Independent Test**: Select a template with `deleteExistingCallouts=true` and `addCallouts=true` on a SubSpace with existing posts. Verify all original posts are removed and only template posts remain with correct count.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008 [P] [US1] Create unit test file `test/unit/domain/template/template-applier/template.applier.service.spec.ts` if it doesn't exist
- [ ] T009 [P] [US1] Write unit test: "should delete existing callouts and add template callouts when both flags true" verifying `calloutService.deleteCallout` called for each existing callout and new callouts added
- [ ] T010 [P] [US1] Create integration test file `test/functional/integration/collaboration/collaboration.mutations.replace.all.it-spec.ts`
- [ ] T011 [P] [US1] Write integration test: "should delete existing callouts and add template callouts" creating Space with 2 callouts, Template with 3 callouts, executing mutation, verifying exactly 3 callouts exist matching template nameIDs

### Implementation for User Story 1

- [ ] T012 [US1] Add verbose logging before deletion loop in `src/domain/template/template-applier/template.applier.service.ts` using `LogContext.TEMPLATES` with callout count
- [ ] T013 [US1] Add verbose logging after deletion loop in `src/domain/template/template-applier/template.applier.service.ts` confirming deletion complete

**Checkpoint**: At this point, User Story 1 (Replace All) should be fully functional and testable independently

---

## Phase 4: User Story 2 - Add Template Posts to Existing Content (Priority: P2)

**Goal**: Verify existing "Add Template Posts" behavior (keep existing + add template posts) works correctly with new parameter combinations

**Independent Test**: Select a template with `deleteExistingCallouts=false` and `addCallouts=true`. Verify both original and template posts are present (sum of both sets).

### Tests for User Story 2

- [ ] T014 [P] [US2] Write unit test: "should add template callouts without deletion when deleteExistingCallouts=false, addCallouts=true" in `test/unit/domain/template/template-applier/template.applier.service.spec.ts`
- [ ] T015 [P] [US2] Write integration test: "should keep existing callouts and add template callouts" in existing integration test file or new file `test/functional/integration/collaboration/collaboration.mutations.add.posts.it-spec.ts`

### Implementation for User Story 2

- [ ] T016 [US2] Verify existing `addCallouts` logic continues to work correctly (no code changes needed, validation only) in `src/domain/template/template-applier/template.applier.service.ts`
- [ ] T017 [US2] Add test scenario to quickstart.md "Scenario 2: Add Posts (Existing Behavior)" validation steps

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Update Flow Only (Priority: P3)

**Goal**: Verify existing "Flow Only" behavior (no callout changes) works correctly with new parameter combinations

**Independent Test**: Select a template with `deleteExistingCallouts=false` and `addCallouts=false`. Verify all original posts remain unchanged, only flow states update.

### Tests for User Story 3

- [ ] T018 [P] [US3] Write unit test: "should preserve existing callouts when deleteExistingCallouts=false, addCallouts=false" in `test/unit/domain/template/template-applier/template.applier.service.spec.ts`
- [ ] T019 [P] [US3] Write integration test: "should only update innovation flow without changing callouts" in existing integration test file

### Implementation for User Story 3

- [ ] T020 [US3] Verify existing flow-only logic continues to work correctly (no code changes needed, validation only) in `src/domain/template/template-applier/template.applier.service.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T021 Update `docs/Templates.md` with new `deleteExistingCallouts` parameter documentation and behavior matrix
- [ ] T022 Run full quickstart.md validation scenarios manually to verify all 4 behavior combinations work correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Validates existing behavior, no dependencies on US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Validates existing behavior, no dependencies on US1 or US2

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services (N/A for this feature - no new models)
- Services before endpoints (N/A - service changes only, no new endpoints)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup (Phase 1)**: Tasks T001-T002 can run in parallel (different concerns)
- **Foundational (Phase 2)**: Tasks are sequential (same service file)
- **Once Foundational completes**: All 3 user stories can be worked on in parallel by different team members
- **Within User Story 1**: Tasks T008-T011 (all tests) can run in parallel
- **Within User Story 2**: Tasks T014-T015 (all tests) can run in parallel
- **Within User Story 3**: Tasks T018-T019 (all tests) can run in parallel
- **Polish (Phase 6)**: Task T021 documentation can happen anytime after Phase 2

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes, launch all tests for User Story 1 together:
Task T008: "Create unit test file template.applier.service.spec.ts"
Task T009: "Write unit test for delete+add behavior"
Task T010: "Create integration test file collaboration.mutations.replace.all.it-spec.ts"
Task T011: "Write integration test for replace all scenario"

# All 4 test tasks (T008-T011) can execute in parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (GraphQL contract changes) → ~1-2 hours
2. Complete Phase 2: Foundational (core service implementation) → ~2-3 hours ⚠️ CRITICAL
3. Complete Phase 3: User Story 1 (Replace All tests + logging) → ~3-4 hours
4. **STOP and VALIDATE**: Test User Story 1 independently using quickstart.md scenarios
5. Deploy/demo if ready → **MVP COMPLETE** ✨

**Total MVP Estimate**: 6-9 hours

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (~3-5 hours)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!) → +3-4 hours
3. Add User Story 2 → Test independently → Deploy/Demo → +2 hours
4. Add User Story 3 → Test independently → Deploy/Demo → +1 hour
5. Polish phase → Documentation and final validation → +30 minutes

**Total Full Feature Estimate**: 10-12 hours

### Parallel Team Strategy

With multiple developers (after Foundational phase completes):

1. Team completes Setup + Foundational together → ~3-5 hours
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Replace All - most critical)
   - **Developer B**: User Story 2 (Add Posts validation)
   - **Developer C**: User Story 3 (Flow Only validation)
3. Stories complete and integrate independently
4. Merge in priority order: US1 → US2 → US3

**Parallel Team Estimate**: ~6-7 hours total timeline

---

## Notes

- **Authoritative Pattern Reference**: Follow `CalloutsSetService.deleteCalloutsSet()` pattern (lines 140-162 in `src/domain/collaboration/callouts-set/callouts.set.service.ts`) for deletion loop implementation
- **Key Implementation Detail**: Loop through callouts calling `this.calloutService.deleteCallout(callout.id)` - do NOT delete CalloutsSet itself (see data-model.md Implementation Notes)
- **Why Loop, Not Recreate**: Preserves CalloutsSet identity, authorization policy, and TagsetTemplateSet (see research.md Q2)
- **Performance**: Expect ~50-200ms per callout deletion (sequential async operations per research.md Q3)
- **Backward Compatibility**: Default `deleteExistingCallouts=false` preserves all existing client behavior
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `pnpm run test:ci` after implementation to verify no regressions
- Use `pnpm run test:ci:no:coverage` for faster verification during development
