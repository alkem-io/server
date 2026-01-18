# Tasks: Migrate to Biome for Linting and Formatting

**Input**: Design documents from `/specs/028-migrate-biome-linting/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Tests are NOT explicitly requested in the feature specification. No test tasks are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install Biome and create initial configuration

- [X] T001 Add @biomejs/biome as devDependency in package.json
- [X] T002 Run `npx @biomejs/biome migrate eslint --write --include-inspired` to generate initial biome.json from eslint.config.js
- [X] T003 Run `npx @biomejs/biome migrate prettier --write` to merge Prettier settings into biome.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Complete Biome configuration that MUST be done before any user story validation

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Configure ignore patterns in biome.json files.ignore (merge patterns from eslint.config.js and .prettierignore per research.md)
- [X] T005 [P] Verify and adjust linter rules in biome.json to match current ESLint rules per research.md rule mapping table
- [X] T006 [P] Verify and adjust formatter settings in biome.json to match current Prettier config per research.md formatter mapping table
- [X] T007 Run `npx @biomejs/biome check --write .` to auto-fix all safe violations in codebase
- [X] T008 Manually fix any remaining violations that auto-fix could not resolve

**Checkpoint**: Biome configuration complete - user story validation can now begin

---

## Phase 3: User Story 1 - Developer Runs Code Quality Check (Priority: P1)

**Goal**: Enable developers to run code quality checks that complete almost instantaneously

**Independent Test**: Run `pnpm lint` and verify completion time and output matches expected behavior

### Implementation for User Story 1

- [X] T009 [US1] Update lint script in package.json to use `tsc --noEmit && biome check src/`
- [X] T010 [US1] Update lint:fix script in package.json to use `tsc --noEmit && biome check --write src/`
- [X] T011 [US1] Remove or update lint:prod script in package.json to use `tsc --noEmit && biome ci src/`
- [X] T012 [US1] Verify lint command completes and reports issues with file path, line number, and clear descriptions (FR-004)
- [X] T013 [US1] Verify incremental lint check completes in under 2 seconds (NFR-002)

**Checkpoint**: Developers can run `pnpm lint` and `pnpm lint:fix` with Biome

---

## Phase 4: User Story 2 - Developer Formats Code on Save (Priority: P1)

**Goal**: Enable automatic code formatting in IDE on file save

**Independent Test**: Open a TypeScript file with formatting issues in VS Code, save, and verify instant formatting

### Implementation for User Story 2

- [X] T014 [P] [US2] Update .vscode/settings.json to set editor.defaultFormatter to biomejs.biome
- [X] T015 [P] [US2] Update .vscode/settings.json to enable editor.formatOnSave and editor.codeActionsOnSave for organizeImports
- [X] T016 [P] [US2] Update .vscode/extensions.json to recommend biomejs.biome extension
- [X] T017 [US2] Update format script in package.json to use `biome format --write src/`
- [X] T018 [US2] Add format:check script in package.json to use `biome format src/`
- [X] T019 [US2] Verify format-on-save works without perceptible delay in VS Code (NFR-003)

**Checkpoint**: Developers have IDE integration with format-on-save

---

## Phase 5: User Story 3 - CI Pipeline Validates Code Quality (Priority: P2)

**Goal**: CI pipelines validate code quality using Biome

**Independent Test**: Run `pnpm exec biome ci src/` locally and verify it catches issues with appropriate exit codes

### Implementation for User Story 3

- [X] T020 [US3] Update .lintstagedrc.json to use `biome check --write --no-errors-on-unmatched` per research.md
- [X] T021 [US3] Verify pre-commit hook works with lint-staged and Biome (FR-009)
- [X] T022 [US3] Verify `biome ci` command exits non-zero on lint/format issues for CI integration

**Checkpoint**: CI and pre-commit workflows use Biome

---

## Phase 6: User Story 4 - Team Reviews Performance Benchmarks (Priority: P2)

**Goal**: Document performance benchmarks comparing old and new tooling

**Independent Test**: Review benchmark results and verify they show at least 5x improvement

### Implementation for User Story 4

- [X] T023 [US4] Before removing old tools, run 5 iterations of `eslint src/**/*.ts` and record median time
- [X] T024 [US4] Before removing old tools, run 5 iterations of `prettier --check src/` and record median time
- [X] T025 [US4] After Biome setup, run 5 iterations of `biome check src/` and record median time
- [X] T026 [US4] Document benchmark results comparing old vs new tooling in quickstart.md or dedicated benchmarks section
- [X] T027 [US4] Verify full codebase lint completes at least 5x faster than before (NFR-001, SC-001)

**Checkpoint**: Performance benchmarks documented and reviewed

---

## Phase 7: User Story 5 - Developer Fixes Auto-fixable Issues (Priority: P3)

**Goal**: Enable automatic fixing of safe lint issues

**Independent Test**: Run `pnpm lint:fix` on files with auto-fixable issues and verify fixes applied

### Implementation for User Story 5

- [X] T028 [US5] Verify lint:fix command applies safe auto-fixes matching previous ESLint behavior
- [X] T029 [US5] Document any differences in auto-fix behavior between ESLint and Biome in quickstart.md
- [X] T029a [US5] Validate quickstart.md covers all migration changes: What Changed section, Rule Differences, CLI Commands, Troubleshooting (FR-010)

**Checkpoint**: Auto-fix functionality validated and documented

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and finalization

- [X] T030 [P] Remove eslint.config.js from repository root
- [X] T031 [P] Remove .prettierrc from repository root
- [X] T032 [P] Remove .prettierignore from repository root (patterns now in biome.json)
- [X] T033 Remove ESLint and Prettier dependencies from package.json devDependencies (eslint, @typescript-eslint/*, prettier, eslint-config-prettier, eslint-plugin-prettier, eslint-plugin-import, @eslint/eslintrc, @eslint/js, globals)
- [X] T034 Run pnpm install to update lockfile after dependency changes
- [X] T035 Update CLAUDE.md to reflect Biome tooling instead of ESLint + Prettier
- [X] T036 [P] Run quickstart.md validation - verify all documented commands work
- [X] T037 Final verification: run `pnpm lint` and `pnpm build` to ensure no regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - US1 and US2 (both P1) can proceed in parallel
  - US3 and US4 (both P2) can proceed in parallel after P1 stories
  - US5 (P3) can proceed after P2 stories
- **Polish (Phase 8)**: Depends on all user stories being validated

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independent
- **User Story 4 (P2)**: MUST capture old tool benchmarks BEFORE Phase 8 removes them
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Independent

### Within Each Phase

- Tasks marked [P] within the same phase can run in parallel
- Tasks without [P] must run sequentially in listed order

### Parallel Opportunities

- T005 and T006 can run in parallel (different config sections)
- T014, T015, T016 can run in parallel (different files/settings)
- T030, T031, T032 can run in parallel (independent file deletions)
- US1 and US2 can be worked on in parallel by different developers

---

## Parallel Example: Phase 2 Foundational

```bash
# These can run in parallel (different config concerns):
Task T005: "Verify linter rules in biome.json"
Task T006: "Verify formatter settings in biome.json"
```

## Parallel Example: Phase 4 VS Code Setup

```bash
# These can run in parallel (separate concerns):
Task T014: "Update .vscode/settings.json for defaultFormatter"
Task T015: "Update .vscode/settings.json for formatOnSave"
Task T016: "Update .vscode/extensions.json for recommendations"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (install Biome, migrate config)
2. Complete Phase 2: Foundational (finalize config, auto-fix codebase)
3. Complete Phase 3: User Story 1 (CLI lint commands work)
4. Complete Phase 4: User Story 2 (IDE format-on-save works)
5. **STOP and VALIDATE**: Developers can lint and format with Biome

### Incremental Delivery

1. Setup + Foundational → Biome configured and codebase clean
2. Add US1 + US2 → Core developer experience working (MVP!)
3. Add US3 → CI/pre-commit validated
4. Add US4 → Benchmarks documented
5. Add US5 → Auto-fix validated
6. Polish → Old tools removed, documentation updated

### Critical Path

**T023-T024 (benchmarks) MUST run before T033 (remove old dependencies)** - otherwise old tool performance cannot be measured.

---

## Notes

- [P] tasks = different files/concerns, no dependencies
- [Story] label maps task to specific user story for traceability
- US4 (benchmarks) has a timing dependency - must capture old tool performance before removal
- No test tasks included as tests were not explicitly requested
- Commit after each phase completion for clean git history
- Stop at any checkpoint to validate independently
