# Tasks: Enable Memo as Valid Collection Contribution Type

**Input**: Design documents from `/specs/001-memo-collection-contribution/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Integration tests included per constitution requirement (Code Quality with Pragmatic Testing)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US4)
- Include exact file paths in descriptions

## Path Conventions

- Repository root: `/Users/borislavkolev/WebstormProjects/server/`
- Source: `src/`
- Tests: `test/`
- Domain modules: `src/domain/`
- Services: `src/services/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency configuration

- [x] T001 Verify branch `001-memo-collection-contribution` is checked out and up-to-date
- [x] T002 Run `pnpm install` to ensure all dependencies are current
- [x] T003 Run `pnpm build` to verify baseline compiles successfully

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core module dependencies and service wiring that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Import MemoModule in `src/domain/collaboration/callout-contribution/callout.contribution.module.ts`
- [x] T005 Inject MemoService in `src/domain/collaboration/callout-contribution/callout.contribution.service.ts` constructor
- [x] T006 Run `pnpm build` to verify module dependencies resolve without circular dependency errors
- [x] T007 Run `pnpm lint` to verify code style compliance

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 4 - Configure Collection Settings for Memos (Priority: P2) 🎯 PREREQUISITE

**Goal**: Enable users to configure collection callout settings to allow memo contributions

**Why First**: While spec priority is P2, this is a prerequisite for User Story 1 (P1) since collections must enable memo contributions before users can create them. Implementing settings first unblocks creation flow.

**Independent Test**: Create a collection callout with memo in the allowedTypes array, then verify users can create memo contributions. Remove memo from allowedTypes and confirm creation is blocked.

### Implementation for User Story 4

- [x] T008 [US4] Verify `CalloutContributionType.MEMO` exists in `src/common/enums/callout.contribution.type.ts`
- [x] T009 [US4] Verify `CalloutSettingsContribution.allowedTypes` accepts MEMO enum value (no code changes expected)
- [x] T010 [US4] Test memo validation in `validateContributionType()` method in `src/domain/collaboration/callout-contribution/callout.contribution.service.ts` (~line 60)
- [x] T011 [US4] Run existing tests to verify validation logic: `pnpm run test:ci src/domain/collaboration/callout-contribution/`

**Checkpoint**: At this point, User Story 4 should be complete (verification only, no code changes needed per research.md)

---

## Phase 4: User Story 1 - Create Memo Contribution in Collection (Priority: P1) 🎯 MVP

**Goal**: Enable users to create memo contributions in collection callouts where memo type is enabled

**Independent Test**: Create a collection callout that allows memo contributions, successfully create a memo contribution through the GraphQL mutation, and verify the memo appears in the collection's contributions list.

### Implementation for User Story 1

- [x] T012 [US1] Add memo creation logic in `createCalloutContribution()` method in `src/domain/collaboration/callout-contribution/callout.contribution.service.ts` (~line 85, after link creation block)
- [x] T013 [US1] Add memo destructuring to existing `const { post, whiteboard, link } = calloutContributionData;` line
- [x] T014 [US1] Implement memo creation conditional block following post/whiteboard/link pattern
- [x] T015 [US1] Call `this.memoService.createMemo()` with proper parameters (memo input, storageAggregator, userID)
- [x] T016 [US1] Assign returned IMemo to `contribution.memo` property
- [x] T017 [US1] Run `pnpm build` to verify compilation
- [x] T018 [US1] Run `pnpm lint` to verify code style

### Integration Tests for User Story 1

- [ ] T019 [US1] Create integration test file `test/functional/integration/callout-contribution/memo-contribution.it.spec.ts`
- [ ] T020 [US1] Write test case: "should create memo contribution in collection callout with memo enabled"
- [ ] T021 [US1] Write test case: "should reject memo contribution when memo not in allowedTypes"
- [ ] T022 [US1] Write test case: "should persist memo contribution with proper relationships (memo, authorization, profile)"
- [ ] T023 [US1] Run integration tests: `pnpm run test:ci test/functional/integration/callout-contribution/memo-contribution.it.spec.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional - users can create memo contributions

---

## Phase 5: User Story 2 - Query Memo Contributions from Collections (Priority: P2)

**Goal**: Enable users to retrieve and view memos from collection callouts in a unified response

**Independent Test**: Query a collection callout's contributions and verify that memo contributions are returned with complete metadata (title, author, preview, timestamps).

### Implementation for User Story 2

- [x] T024 [P] [US2] Implement `getMemo()` method in `src/domain/collaboration/callout-contribution/callout.contribution.service.ts` following `getWhiteboard()` pattern
- [x] T025 [P] [US2] Use `getCalloutContributionOrFail()` with memo relation eager loading
- [x] T026 [P] [US2] Return `IMemo | null` based on contribution.memo existence
- [x] T027 [US2] Add memo resolver field in `src/domain/collaboration/callout-contribution/callout.contribution.resolver.fields.ts`
- [x] T028 [US2] Import `IMemo` interface from `@domain/common/memo/memo.interface`
- [x] T029 [US2] Add `@ResolveField('memo')` decorator with nullable return type
- [x] T030 [US2] Add `@Profiling.api` decorator for performance tracking
- [x] T031 [US2] Call `this.calloutContributionService.getMemo()` in resolver implementation
- [x] T032 [US2] Run `pnpm build` to verify GraphQL schema generation
- [ ] T033 [US2] Run `pnpm run schema:print && pnpm run schema:sort` to regenerate schema artifacts

### Integration Tests for User Story 2

- [ ] T034 [US2] Add test case to memo-contribution.it.spec.ts: "should query memo contributions with complete metadata"
- [ ] T035 [US2] Add test case: "should filter contributions by MEMO type"
- [ ] T036 [US2] Add test case: "should include memo in mixed contribution type queries (post, whiteboard, memo)"
- [ ] T037 [US2] Verify memo fields resolve correctly: title (from profile), createdBy, updatedAt, content preview
- [ ] T038 [US2] Run integration tests: `pnpm run test:ci test/functional/integration/callout-contribution/memo-contribution.it.spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can create and query memo contributions

---

## Phase 6: User Story 3 - Update and Delete Memo Contributions (Priority: P3)

**Goal**: Enable users to update or delete their memo contributions to maintain accurate content

**Independent Test**: Create a memo contribution, update its content and metadata, verify changes persist. Then delete the memo and confirm it no longer appears in the collection.

### Implementation for User Story 3

- [x] T039 [US3] Verify memo update logic exists in `src/domain/common/memo/memo.service.ts` (updateMemo method)
- [x] T040 [US3] Verify memo deletion cascades properly via CalloutContribution entity relationship (onDelete: SET NULL)
- [x] T041 [US3] Test memo update through existing memo mutation resolvers (no contribution-specific logic needed)
- [x] T042 [US3] Test memo deletion through existing memo deletion resolvers

### Integration Tests for User Story 3

- [ ] T043 [US3] Add test case to memo-contribution.it.spec.ts: "should update memo contribution content and refresh updatedAt timestamp"
- [ ] T044 [US3] Add test case: "should delete memo contribution and remove from collection"
- [ ] T045 [US3] Add test case: "should handle memo contribution deletion with cascade to authorization and profile"
- [ ] T046 [US3] Run integration tests: `pnpm run test:ci test/functional/integration/callout-contribution/memo-contribution.it.spec.ts`

**Checkpoint**: All user stories (1, 2, 3, 4) should now be independently functional

---

## Phase 7: Activity Reporting & Observability

**Purpose**: Wire memo contributions into activity tracking and ensure proper observability

- [ ] T047 Wire memo contribution activity reporting in `src/domain/collaboration/callout/callout.service.ts`
- [ ] T048 Add `processActivityMemoCreated()` method following `processActivityWhiteboardCreated()` pattern (~line 370)
- [ ] T049 Call `ContributionReporterService.memoContribution()` with contribution details and author information
- [ ] T050 Verify ElasticSearch indexing structure in `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts`
- [ ] T051 Test activity feed displays memo contributions correctly (manual verification in running system)

---

## Phase 8: NameID Management & Validation

**Purpose**: Ensure memo contributions have proper nameID handling for URL generation and uniqueness

- [x] T052 Add nameID reservation logic in `src/domain/collaboration/callout/callout.service.ts` createContributionOnCallout method
- [x] T053 Create `setNameIdOnMemoData()` method following `setNameIdOnWhiteboardData()` pattern
- [x] T054 Call setNameIdOnMemoData before memo service creation in CalloutService
- [x] T055 Ensure nameID uniqueness within callout scope (reuse existing NamingService logic)
- [ ] T056 Add test case: "should generate unique nameID for memo contribution"
- [ ] T057 Add test case: "should reject duplicate nameID within same callout"

---

## Phase 9: Schema Validation & Contract Verification

**Purpose**: Ensure no breaking changes to GraphQL schema and validate contract compliance

- [ ] T058 Run `pnpm run schema:print` to generate current schema snapshot
- [ ] T059 Run `pnpm run schema:sort` to normalize schema ordering
- [ ] T060 Copy current schema.graphql to `tmp/prev.schema.graphql` for baseline comparison
- [ ] T061 Run `pnpm run schema:diff` to generate change report
- [ ] T062 Inspect `change-report.json` for BREAKING changes (expect zero)
- [ ] T063 Verify `CalloutContributionType.MEMO` exists in schema baseline
- [ ] T064 Verify `CreateCalloutContributionInput.memo` field exists
- [ ] T065 Verify `CalloutContribution.memo` field exists
- [ ] T066 Run schema contract tests: `pnpm run test:ci contract-tests/`

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, documentation, and validation

- [ ] T067 [P] Update `.github/copilot-instructions.md` with memo contribution context (if not already done)
- [ ] T068 [P] Add inline code comments explaining memo contribution flow in CalloutContributionService
- [ ] T069 [P] Verify logging contexts include memo contribution operations with LogContext.COLLABORATION
- [ ] T070 Run full test suite: `pnpm run test:ci`
- [ ] T071 Run linting: `pnpm lint`
- [ ] T072 Verify build succeeds: `pnpm build`
- [ ] T073 Manual validation using `quickstart.md` verification checklist
- [ ] T074 Test memo contribution creation in local development environment
- [ ] T075 Test memo contribution queries in GraphQL Playground at http://localhost:3000/graphiql
- [ ] T076 Verify authorization policies work correctly for memo contributions
- [ ] T077 Performance check: memo contribution creation <100ms, queries <200ms for 100 items

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 4 (Phase 3)**: Depends on Foundational - MUST complete before US1 (prerequisite configuration)
- **User Story 1 (Phase 4)**: Depends on Foundational + US4 - MVP functionality
- **User Story 2 (Phase 5)**: Depends on Foundational - Can run parallel with US1 but test requires US1
- **User Story 3 (Phase 6)**: Depends on Foundational - Can run parallel with US1/US2 but test requires US1
- **Activity Reporting (Phase 7)**: Depends on US1 completion
- **NameID Management (Phase 8)**: Depends on US1 completion
- **Schema Validation (Phase 9)**: Depends on US1 + US2 completion (schema changes minimal)
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 4 (P2)**: Settings verification - No dependencies, but blocks US1 functionally
- **User Story 1 (P1)**: Creation flow - Depends on US4 settings being correct (validation step)
- **User Story 2 (P2)**: Query flow - Independent of US1 but requires US1 for meaningful testing
- **User Story 3 (P3)**: Update/Delete - Independent of US1/US2 but requires US1 for test setup

### Within Each User Story

- Implementation tasks before test tasks
- Service layer changes before resolver changes
- Core logic before integration wiring
- Build verification before test execution
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: All Setup tasks can run in sequence (quick, <5 min total)
- **Phase 2**: T004-T005 (module imports/injection) must be sequential, T006-T007 (verification) can run together
- **Phase 4 (US1)**: T012-T016 (implementation) sequential, T017-T018 (verification) parallel, T019-T023 (tests) parallel
- **Phase 5 (US2)**: T024-T026 (getMemo) parallel with T027-T031 (resolver), T032-T033 (schema) sequential after, T034-T038 (tests) parallel
- **Phase 6 (US3)**: T039-T042 (verification) parallel, T043-T046 (tests) parallel
- **Phase 7**: T047-T050 (implementation) sequential, T051 (manual test) independent
- **Phase 8**: T052-T055 (implementation) sequential, T056-T057 (tests) parallel
- **Phase 9**: T058-T066 (schema validation) mostly sequential (pipeline steps)
- **Phase 10**: T067-T069 (documentation) parallel, T070-T072 (validation) sequential, T073-T077 (manual testing) parallel

---

## Parallel Example: User Story 1 Implementation

```bash
# Sequential implementation tasks:
T012 → T013 → T014 → T015 → T016  # Memo creation logic (must be in order)

# Parallel verification:
T017 (build) + T018 (lint)  # Can run simultaneously

# Parallel test writing:
T019 (create test file) → T020 + T021 + T022 (write test cases in parallel)
T023 (run all tests)  # After all test cases written
```

---

## Parallel Example: User Story 2 Implementation

```bash
# Parallel implementation tracks:
Track A: T024 → T025 → T026  # getMemo() method
Track B: T027 → T028 → T029 → T030 → T031  # Resolver field

# Sequential schema generation (after both tracks):
T032 → T033  # Schema regeneration

# Parallel test writing:
T034 + T035 + T036 + T037  # Write test cases
T038  # Run all tests
```

---

## Implementation Strategy

### MVP First (User Story 4 + 1 Only)

1. **Complete Phase 1**: Setup (5 min)
2. **Complete Phase 2**: Foundational (15 min) - CRITICAL blocker
3. **Complete Phase 3**: User Story 4 - Settings verification (10 min)
4. **Complete Phase 4**: User Story 1 - Creation flow (2-3 hours)
5. **STOP and VALIDATE**: Test User Story 1 independently with integration tests
6. **Deploy/demo MVP**: Users can create memo contributions in collections ✅

**Total MVP Time**: ~3-4 hours

---

### Incremental Delivery

1. **Foundation** (Setup + Foundational) → ~20 min → Module dependencies ready ✅
2. **+US4** (Settings) → ~30 min → Settings verification complete ✅
3. **+US1** (Creation) → ~3 hours → Test independently → **Deploy/Demo MVP!** 🎯
4. **+US2** (Query) → ~2 hours → Test independently → Deploy/Demo (view memos)
5. **+US3** (Update/Delete) → ~1 hour → Test independently → Deploy/Demo (full lifecycle)
6. **+Activity** (Phase 7) → ~1 hour → Activity feed integration
7. **+NameID** (Phase 8) → ~1 hour → URL management
8. **+Polish** (Phase 9-10) → ~2 hours → Schema validation + docs

**Total Incremental Time**: ~10-11 hours (matches estimate in plan.md)

---

### Parallel Team Strategy

With multiple developers (after Phase 2 complete):

1. **Team completes Setup + Foundational together** (~20 min)
2. **Phase 3-6 (parallel opportunities)**:
   - **Developer A**: US4 (settings) → US1 (creation) → US1 tests
   - **Developer B**: US2 (query) → US2 tests
   - **Developer C**: US3 (update/delete) → US3 tests
3. **Sync point**: All user stories complete
4. **Developer A**: Activity reporting (Phase 7)
5. **Developer B**: NameID management (Phase 8)
6. **Developer C**: Schema validation (Phase 9)
7. **Team**: Polish together (Phase 10)

---

## Notes

- **[P]** tasks = different files, no dependencies, can run in parallel
- **[Story]** label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each logical group (per phase recommended)
- Stop at any checkpoint to validate story independently
- **Constitution compliance**: All tasks follow domain-centric design, modular boundaries, explicit data flow
- **Zero schema changes expected**: All GraphQL types already exist (validated in research.md)
- **Integration tests mandatory**: Per constitution Code Quality gate requirement
- **Performance targets**: Creation <100ms, queries <200ms, authorization <50ms per contribution

---

## Task Summary

- **Total Tasks**: 77
- **Setup & Foundation**: 7 tasks (~20 min)
- **User Story 4** (P2 - Settings): 4 tasks (~30 min)
- **User Story 1** (P1 - Creation): 12 tasks (~3 hours) 🎯 MVP
- **User Story 2** (P2 - Query): 15 tasks (~2 hours)
- **User Story 3** (P3 - Update/Delete): 8 tasks (~1 hour)
- **Activity Reporting**: 5 tasks (~1 hour)
- **NameID Management**: 6 tasks (~1 hour)
- **Schema Validation**: 9 tasks (~1 hour)
- **Polish & Validation**: 11 tasks (~2 hours)

**Suggested MVP Scope**: Phase 1 → Phase 2 → Phase 3 (US4) → Phase 4 (US1) = ~4 hours to basic functionality

**Full Feature Completion**: All phases = ~10-11 hours (matches plan.md estimate)
