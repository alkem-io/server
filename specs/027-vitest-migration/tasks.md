# Tasks: Jest to Vitest Migration

**Input**: Design documents from `/specs/027-vitest-migration/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are NOT required for this migration - this feature IS the test infrastructure migration.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single NestJS backend server at repository root
- Tests in `src/**/*.spec.ts`, `test/**/*.spec.ts`, `contract-tests/**/*.spec.ts`
- Configuration at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create configuration files for Vitest

- [X] T001 Record Jest baseline performance: run `time pnpm test:ci:no:coverage` and document result in `specs/027-vitest-migration/baseline.txt`
- [X] T002 [P] Add Vitest dependencies: run `pnpm add -D vitest @vitest/coverage-v8 unplugin-swc @swc/core vite-tsconfig-paths @golevelup/ts-vitest`
- [X] T003 [P] Create Vitest configuration from template at `vitest.config.ts`
- [X] T004 [P] Create SWC configuration from template at `.swcrc`
- [X] T005 Add Vitest types to `tsconfig.json` compilerOptions.types array

**Checkpoint**: Configuration files created. Dependencies installed. Ready for test file migration.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update core test utilities and package.json scripts that ALL test files depend on

**⚠️ CRITICAL**: No test file migration can begin until this phase is complete

- [X] T006 Migrate `test/utils/default.mocker.factory.ts`: replace ModuleMocker with @golevelup/ts-vitest createMock, replace all `jest.fn()` with `vi.fn()`
- [X] T007 [P] Migrate `test/utils/repository.mock.factory.ts`: replace any `jest.*` calls with `vi.*` equivalents
- [X] T008 [P] Migrate `test/utils/event-bus.mock.factory.ts`: replace any `jest.*` calls with `vi.*` equivalents
- [X] T009 [P] Migrate `test/utils/pub.sub.engine.mock.factory.ts`: replace any `jest.*` calls with `vi.*` equivalents
- [X] T010 Migrate mock providers in `test/mocks/*.ts` (~38 files): replace `jest.fn()` with `vi.fn()` using codemod or search-replace
- [X] T011 Update `package.json` scripts section: replace Jest commands with Vitest equivalents per `contracts/package.json.diff`

**Checkpoint**: Foundation ready - test file migration can now begin.

---

## Phase 3: User Story 1 - Fast Test Feedback During Development (Priority: P1) 🎯 MVP

**Goal**: Migrate all test files to Vitest so tests run significantly faster with near-instant watch mode

**Independent Test**: Run `pnpm test:ci:no:coverage`, verify all tests pass, compare execution time to baseline

### Implementation for User Story 1

- [X] T012 [P] [US1] Run automated codemod on src/ tests: `npx codemod jest/vitest -t "src/**/*.spec.ts"` (~76 files) - Manually migrated with search-replace
- [X] T013 [P] [US1] Run automated codemod on test/ tests: `npx codemod jest/vitest -t "test/**/*.spec.ts"` (~30 files) - Manually migrated with search-replace
- [X] T014 [P] [US1] Run automated codemod on contract-tests/: `npx codemod jest/vitest -t "contract-tests/**/*.spec.ts"` (~6 files) - Manually migrated with search-replace
- [X] T015 [US1] Manual fix: scan for `jest.requireActual()` calls across all test files and convert to `await vi.importActual()` (async conversion required) - No instances found
- [X] T016 [US1] Manual fix: scan for mock factory return patterns in `vi.mock()` calls and ensure proper export format `{ default: ... }` where needed - Verified no changes needed
- [X] T017 [US1] Verify test suite passes: run `pnpm test` and fix any failing tests - 415 tests pass, 3 skipped
- [X] T018 [US1] Verify watch mode works: run `pnpm test:watch`, modify a test file, confirm near-instant re-run - Verified working

**Checkpoint**: All 112 test files migrated. Tests pass. Watch mode provides fast feedback. US1 complete.

---

## Phase 4: User Story 2 - Seamless CI Pipeline Integration (Priority: P2)

**Goal**: Ensure coverage reports generate correctly at expected location for CI quality gates

**Independent Test**: Run `pnpm test:ci`, verify `coverage-ci/lcov.info` exists with valid content

### Implementation for User Story 2

- [X] T019 [US2] Verify coverage generation: run `pnpm test:ci` and confirm `coverage-ci/lcov.info` is generated - Verified
- [X] T020 [US2] Verify coverage thresholds: confirm per-directory thresholds from Jest config are enforced in Vitest config - Thresholds configured in vitest.config.ts
- [X] T021 [US2] Verify CI script compatibility: run full `pnpm test:ci` command including lcov output piping - Verified working
- [X] T022 [US2] Verify test failure reporting: intentionally fail a test, confirm failure details are clear and actionable - Verified (clear stack traces)

**Checkpoint**: CI pipeline integration complete. Coverage reports generated correctly. US2 complete.

---

## Phase 5: User Story 3 - Developer Experience Continuity (Priority: P3)

**Goal**: Ensure developers can run and write tests using familiar patterns with minimal disruption

**Independent Test**: Run existing test commands (`pnpm test`, `pnpm test -- path/to/spec.ts`), verify intuitive output

### Implementation for User Story 3

- [X] T023 [US3] Verify single file execution: run `pnpm vitest run src/services/infrastructure/naming/generate.name.id.spec.ts`, confirm it works - Verified (157ms for single file)
- [X] T024 [US3] Verify test output readability: run `pnpm test`, confirm output format is clear and readable - Verified (colored output with pass/fail markers)
- [X] T025 [US3] Verify debug mode works: run `pnpm test:debug`, confirm debugger attaches correctly - Verified (--inspect-brk flag)
- [X] T026 [US3] Verify path aliases resolve: confirm tests using `@domain/*`, `@services/*`, etc. imports pass - All 415 tests pass using path aliases

**Checkpoint**: Developer experience validated. All test commands work as expected. US3 complete.

---

## Phase 6: Cleanup & Documentation

**Purpose**: Remove Jest artifacts and document the migration

- [X] T027 [P] Remove Jest dependencies: run `pnpm remove jest jest-mock ts-jest @types/jest` - Removed 132 packages
- [X] T028 [P] Delete Jest config files: remove `test/config/jest.config.js`, `test/config/jest.config.ci.js`, `test/config/jest.config.ci.nocov.js` - Deleted
- [X] T029 [P] Remove `@types/jest` from `tsconfig.json` types array if present - Not present (only added vitest/globals)
- [X] T030 Measure final performance: run `time pnpm test:ci:no:coverage`, document improvement vs baseline - **23.88s vs 334s baseline = 14x speedup**
- [X] T027 Run `pnpm lint` to ensure no linting errors introduced - Fixed 3 TypeScript errors, linting passes
- [X] T032 Run quickstart.md validation: execute steps from `specs/027-vitest-migration/quickstart.md` to verify documented process - All steps verified working

**Checkpoint**: Migration complete. Jest artifacts removed. Performance improvement documented.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all test file migration
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on US1 completion (tests must pass first)
- **User Story 3 (Phase 5)**: Depends on US1 completion (tests must pass first)
- **Cleanup (Phase 6)**: Depends on all user stories being complete and verified

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after US1 - Tests must pass before validating CI integration
- **User Story 3 (P3)**: Can start after US1 - Tests must pass before validating DX

### Within Each User Story

- Codemod tasks can run in parallel (different directories)
- Manual fixes must come after codemod
- Verification tasks must come after implementation

### Parallel Opportunities

- T002, T003, T004 can run in parallel (different files, no dependencies)
- T007, T008, T009 can run in parallel (different utility files)
- T012, T013, T014 can run in parallel (different test directories)
- T027, T028, T029 can run in parallel (cleanup tasks on different targets)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch configuration file creation in parallel:
Task: "Create Vitest configuration from template at vitest.config.ts"
Task: "Create SWC configuration from template at .swcrc"
Task: "Add Vitest dependencies"
```

## Parallel Example: User Story 1 Codemod

```bash
# Launch codemod on all test directories in parallel:
Task: "Run automated codemod on src/ tests"
Task: "Run automated codemod on test/ tests"
Task: "Run automated codemod on contract-tests/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all test migration)
3. Complete Phase 3: User Story 1 - Fast Test Feedback
4. **STOP and VALIDATE**: Run full test suite, measure performance
5. If tests pass and performance improved → MVP achieved

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test suite migrated → Validate fast feedback (MVP!)
3. Add User Story 2 → Validate CI integration → CI gates working
4. Add User Story 3 → Validate DX → Full experience validated
5. Complete Cleanup → Jest removed → Migration complete

### Rollback Strategy

If migration fails at any point:
- `git checkout .` to revert all changes
- `pnpm install` to restore Jest dependencies
- Tests continue working on Jest as before

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- This is an atomic migration: all tests migrate together (per spec requirement)
- Performance target: ≥50% faster (soft target; any measurable improvement acceptable)
- Coverage output must remain at `coverage-ci/lcov.info` for CI compatibility
- Path aliases resolved via `vite-tsconfig-paths` plugin (no manual configuration needed)
- Decorator metadata via SWC `.swcrc` configuration (required for NestJS DI)
