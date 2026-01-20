# Tasks: Template Content Options

**Feature**: `026-template-content-options`
**Status**: Implementation Complete
**Input**: Design documents from `specs/026-template-content-options/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by implementation phase.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and GraphQL contract changes

- [x] T001 [P] Add `deleteExistingCallouts` field to UpdateCollaborationFromSpaceTemplateInput DTO in `src/domain/template/template-applier/dto/template.applier.dto.update.collaboration.ts`
- [x] T002 [P] Update GraphQL mutation docstring for `updateCollaborationFromSpaceTemplate` in `src/domain/template/template-applier/template.applier.resolver.mutations.ts` with behavior matrix and execution order
- [x] T003 Regenerate GraphQL schema artifacts by running `pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff`
- [x] T004 Verify backward compatibility (verified by design: parameter has default `false`, lint passes, schema validates)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service layer implementation that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Update `updateCollaborationFromTemplateContentSpace()` method signature to accept `deleteExistingCallouts` parameter in `src/domain/template/template-applier/template.applier.service.ts`
- [x] T006 Implement callout deletion loop (BEFORE existing flow update logic) following the pattern from `CalloutsSetService.deleteCalloutsSet()` (lines 140-162) in `src/domain/template/template-applier/template.applier.service.ts`
- [x] T007 Pass `deleteExistingCallouts` from public method to private method in `src/domain/template/template-applier/template.applier.service.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Replace All Posts When Applying Template (Priority: P1) 🎯 MVP

**Goal**: Administrators can completely reset SubSpace content to match a new template by deleting all existing posts and replacing with template posts

**Implementation Complete**: Feature enables `deleteExistingCallouts=true` and `addCallouts=true` combination

- [x] T008 Add verbose logging before deletion loop in `src/domain/template/template-applier/template.applier.service.ts` using `LogContext.TEMPLATES` with callout count
- [x] T009 Add verbose logging after deletion loop in `src/domain/template/template-applier/template.applier.service.ts` confirming deletion complete

**Checkpoint**: User Story 1 (Replace All) is fully functional

---

## Phase 4: User Story 2 - Add Template Posts to Existing Content (Priority: P2)

**Goal**: Verify existing "Add Template Posts" behavior (keep existing + add template posts) works correctly with new parameter combinations

**Implementation Complete**: Backward compatibility verified for `deleteExistingCallouts=false` and `addCallouts=true`

- [x] T010 [P] Verify existing `addCallouts` logic continues to work correctly
- [x] T011 [P] Document behavior in quickstart.md

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Update Flow Only (Priority: P3)

**Goal**: Verify existing "Flow Only" behavior (no callout changes) works correctly with new parameter combinations

**Implementation Complete**: Backward compatibility verified for `deleteExistingCallouts=false` and `addCallouts=false`

- [x] T012 [P] Verify existing flow-only logic continues to work correctly

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Documentation & Validation

**Purpose**: Document feature and verify end-to-end behavior

- [ ] T013 Update `docs/Templates.md` with new `deleteExistingCallouts` parameter documentation and behavior matrix
- [ ] T014 Manual validation of all 4 behavior combinations using quickstart.md scenarios

---

## Implementation Summary

**Completed Phases**: 1-5 (Setup, Foundational, US1, US2, US3)
**Remaining**: Documentation and manual validation

**Phase Dependencies**:

- Setup (Phase 1) → Foundational (Phase 2) → User Stories (Phase 3-5) → Documentation (Phase 6)
- User Stories 1-3 implemented backward compatibility for existing behaviors
- All core functionality complete and schema regenerated

---

## Parallel Execution Example

```bash
# Example: Phase 1 Setup tasks can run in parallel (marked with [P]):
Task T001 [P]: "Add deleteExistingCallouts field to DTO"
Task T002 [P]: "Update GraphQL mutation docstring"

# Example: User Story tasks across phases can also run in parallel:
Task T010 [P]: "Verify existing addCallouts logic continues to work correctly"
Task T011 [P]: "Document behavior in quickstart.md"
Task T012 [P]: "Verify existing flow-only logic continues to work correctly"

# Note: T008-T009 (logging tasks) are sequential within Phase 3 but independent of T010-T012
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
