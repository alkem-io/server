---
description: 'Task list for GQL validation & fix pipeline'
---

# Tasks: GQL Validation & Fix Pipeline

**Input**: Design documents from `/specs/080-gql-pipeline/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: No separate test tasks — pipeline output is self-validating (each query produces a pass/fail JSON result).

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Task can run in parallel (different files, no dependency overlap)
- **[Story]**: User story label (US1, US2, US3, US4, US5, US6)
- Include exact file paths in every description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pipeline directory structure, configuration, authentication, and shared utilities.

- [x] T001 Create pipeline directory structure and `.gitignore` entries for `.claude/pipeline/` runtime state (results, live-results, fixes, reviews, signals, benchmarks, .session-token)
- [x] T002 Create `.claude/pipeline/.env` with configuration variables (KRATOS_PUBLIC_URL, PIPELINE_USER, PIPELINE_PASSWORD, GRAPHQL_NON_INTERACTIVE_ENDPOINT, repo paths)
- [x] T003 Create `.claude/hooks/setup-pipeline.sh` to initialize pipeline directories on demand
- [x] T004 Create `.claude/settings.local.json` with Agent Teams feature flag and permission overrides

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared library, authentication, and fragment resolution that all validation modes depend on.

**⚠️ CRITICAL**: No validation or benchmarking can work until this phase is complete.

- [x] T005 Implement shared utilities library in `.scripts/gql-validate/gql-runner-lib.mjs` — env file loader, sleep, GraphQL file discovery, operation parsing, fragment map building, operation classification, discovery queries, context population, percentile calculation
- [x] T006 Implement fragment resolver in `.scripts/gql-validate/resolve-fragments.mjs` — recursive fragment resolution with transitive dependency support and cycle detection
- [x] T007 Implement repo sync script in `.scripts/gql-validate/sync-repos.sh` — pulls latest `develop` for test-suites and client-web repos before validation
- [x] T008 Create non-interactive login script (`.scripts/non-interactive-login.sh`) using Kratos native API flow, storing session token to `.claude/pipeline/.session-token`

**Checkpoint**: Shared library available, repos can be synced, and authentication works.

---

## Phase 3: User Story 1 — AST Schema Validation (Priority: P1) 🎯 MVP

**Goal**: Validate all GraphQL operations from test-suites and client-web against `schema.graphql` using offline AST analysis.

**Independent Test**: Run `node .scripts/gql-validate/validator.mjs --source test-suites` and verify JSON results appear in `.claude/pipeline/results/test-suites/`.

### Implementation for User Story 1

- [x] T009 [US1] Implement AST validation engine in `.scripts/gql-validate/validator.mjs` — parse schema, discover operations per source, validate with isolated fragment namespaces, classify errors (SCHEMA_MISMATCH, TYPE_ERROR, VARIABLE_ERROR, FRAGMENT_ERROR, DEPRECATED), write per-query JSON results to `.claude/pipeline/results/<source>/<QueryName>.json`
- [x] T010 [US1] Create validation entry point `.scripts/gql-validate/validate-queries.sh` — syncs repos then runs validator for both sources
- [x] T011 [US1] Create gql-runner agent definition in `.claude/agents/gql-runner.md` with steps for authentication, AST validation, live validation, and result review

**Checkpoint**: AST validation detects all schema mismatches with categorized errors and per-query results.

---

## Phase 4: User Story 2 — Live Execution Validation (Priority: P2)

**Goal**: Execute queries against a running server in three phases to catch runtime errors.

**Independent Test**: Start the server, run `bash .scripts/gql-validate/live-validate.sh`, and verify results in `.claude/pipeline/live-results/` with per-phase directories and `_summary.json`.

### Implementation for User Story 2

- [x] T012 [US2] Implement live execution runner in `.scripts/gql-validate/live-runner.mjs` — three-phase execution (Phase 0: discovery for context population, Phase 1: variable-free queries, Phase 2: parameterized queries with resolved variables), per-query JSON results with HTTP status, response time, GQL errors, and data keys
- [x] T013 [US2] Implement live validation orchestrator in `.scripts/gql-validate/live-validate.sh` — server reachability check, auth token management, source selection, summary reporting
- [x] T014 [US2] Add comment stripping to live-runner to prevent GraphQL comment syntax from causing false validation errors

**Checkpoint**: Live validation catches resolver crashes, auth failures, and timeout issues that AST validation cannot detect.

---

## Phase 5: User Story 3 — Automated Fix Pipeline (Priority: P3)

**Goal**: Automatically create fix branches and PRs in the correct repo for broken queries.

**Independent Test**: Given error results in `.claude/pipeline/results/`, run the fixer agent and verify it creates branches, edits `.graphql` files, and opens PRs.

### Implementation for User Story 3

- [x] T015 [US3] Create gql-fixer agent definition in `.claude/agents/gql-fixer.md` — tri-repo fix strategy (test-suites primary, client-web secondary, server tertiary), branch naming (`fix/gql-{QueryName}`), re-validation after fix, PR creation with error context, fix record JSON, max 2 retry attempts, `.processed` tracking

**Checkpoint**: Broken queries get fix PRs in the correct repo automatically.

---

## Phase 6: User Story 4 — Automated PR Review (Priority: P4)

**Goal**: Review fix PRs with strict quality gates and merge or reject with feedback.

**Independent Test**: Given pending fix PRs, run the reviewer agent and verify merge/reject decisions are correct and recorded.

### Implementation for User Story 4

- [x] T016 [US4] Create gql-reviewer agent definition in `.claude/agents/gql-reviewer.md` — strict review criteria (only GQL files, minimal changes, no field removals without replacement, type checks pass for server PRs, ≤5 files changed, non-empty description), squash merge for approvals, feedback comments for rejections, review record JSON

**Checkpoint**: Fix PRs pass quality gates before merging; bad fixes are rejected with actionable feedback.

---

## Phase 7: User Story 5 — Performance Benchmarking (Priority: P5)

**Goal**: Benchmark query response times and compare against a stored baseline to detect regressions.

**Independent Test**: Run `bash .scripts/gql-validate/bench-validate.sh both --save-baseline`, then run again without the flag and verify comparison report.

### Implementation for User Story 5

- [x] T017 [P] [US5] Implement benchmark engine in `.scripts/gql-validate/bench-runner.mjs` — reuses shared library for discovery/classification/execution, records per-query response times, baseline save/load, comparison with configurable thresholds (multiplier and absolute delta), regression detection, report generation
- [x] T018 [P] [US5] Implement benchmark entry point in `.scripts/gql-validate/bench-validate.sh` — auth management, server check, argument parsing (source, --save-baseline, --threshold-multiplier, --threshold-absolute), summary reporting with jq
- [x] T019 [US5] Create benchmark command in `.claude/commands/gql-performance-benchmark.md` — standalone invocation with mode and options arguments
- [x] T020 [US5] Create benchmark skill in `.claude/skills/gql-performance-benchmark.md` — conventions, schemas, severity classification, tips

**Checkpoint**: Performance regressions are detected before they reach production.

---

## Phase 8: User Story 6 — Pipeline Orchestration (Priority: P6)

**Goal**: Orchestrate the full validation → fix → review cycle as a dependency-chained agent team.

**Independent Test**: Launch `/gql-pipeline` and verify it creates 3 dependency-chained tasks, spawns agents with correct models, and quality gates enforce phase ordering.

### Implementation for User Story 6

- [x] T021 [US6] Create pipeline command in `.claude/commands/gql-pipeline.md` — team configuration with 3 dependency-chained tasks (runner → fixer → reviewer), agent model assignments (haiku/sonnet/opus), delegate mode, cycle restart after reviewer completes
- [x] T022 [US6] Create pipeline skill in `.claude/skills/gql-pipeline.md` — directory layout, result schemas (AST, live, fix, review), error categories, tri-repo strategy, query discovery paths, branch conventions, fragment isolation documentation
- [x] T023 [P] [US6] Create quality gate hooks in `.claude/hooks/on-task-completed.sh` — validates runner produced results, fixer has fix records for all errors, reviewer processed all PRs
- [x] T024 [P] [US6] Create teammate idle hook in `.claude/hooks/on-teammate-idle.sh` — detects idle agents and restarts work
- [x] T025 [P] [US6] Create stop hook in `.claude/hooks/on-stop.sh` — cleanup on pipeline stop
- [x] T026 [US6] Create pipeline launcher script in `.scripts/gql-validate/launch-pipeline.sh`
- [x] T027 [US6] Create validation loop skill in `.claude/skills/validation-loop.md`
- [x] T028 [US6] Document full architecture in `gql-pipeline-agent-teams.md` (root-level reference doc)

**Checkpoint**: Full pipeline runs autonomously with dependency ordering and quality gates.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, gitignore, and cross-references.

- [x] T029 [P] Update `.gitignore` to exclude pipeline runtime state (results, live-results, fixes, reviews, benchmarks, session tokens, signals)
- [x] T030 [P] Add benchmark directory to pipeline skill layout in `.claude/skills/gql-pipeline.md`
- [x] T031 Add cross-reference from `gql-pipeline.md` command to `/gql-performance-benchmark`
- [x] T032 Add frontmatter (name, description, tools, model, memory, skills) to `.claude/agents/gql-runner.md` for consistency with fixer and reviewer agents

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Phase 1 (Setup)**: No dependencies — creates directory structure and config.
2. **Phase 2 (Foundational)**: Depends on Phase 1 — shared library and auth block everything.
3. **Phase 3 (US1 — AST Validation)**: Depends on Phase 2 — uses shared library and fragment resolver.
4. **Phase 4 (US2 — Live Validation)**: Depends on Phase 2 — uses shared library and auth.
5. **Phase 5 (US3 — Fixer)**: Depends on Phase 3 — consumes AST validation results.
6. **Phase 6 (US4 — Reviewer)**: Depends on Phase 5 — processes fix PRs.
7. **Phase 7 (US5 — Benchmark)**: Depends on Phase 2 — uses shared library independently from US1-US4.
8. **Phase 8 (US6 — Orchestration)**: Depends on Phases 3-7 — coordinates all agents.
9. **Phase 9 (Polish)**: Depends on all prior phases.

### User Story Dependencies

- **US1 (AST Validation)**: Independent after foundational.
- **US2 (Live Validation)**: Independent after foundational. Can run in parallel with US1.
- **US3 (Fixer)**: Depends on US1 results.
- **US4 (Reviewer)**: Depends on US3 fix PRs.
- **US5 (Benchmark)**: Independent after foundational. Can run in parallel with US1-US4.
- **US6 (Orchestration)**: Depends on all agents being defined (US1-US4).

### Parallel Opportunities

- T017, T018 (benchmark scripts) can run in parallel.
- T023, T024, T025 (hooks) can run in parallel.
- T029, T030 (polish) can run in parallel.
- US5 (Benchmark) can be developed entirely in parallel with US1-US4.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phases 1 & 2 for shared infrastructure.
2. Deliver Phase 3 (AST validation) — detects all schema breakages.
3. Validate by running against both source repos.

### Incremental Delivery

1. MVP (US1) — AST validation detects breakages.
2. Add US2 — Live validation catches runtime issues.
3. Add US3+US4 — Automated fix and review closes the loop.
4. Add US5 — Performance benchmarking adds regression detection.
5. Add US6 — Full orchestration enables continuous operation.
