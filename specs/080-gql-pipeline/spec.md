# Feature Specification: GQL Validation & Fix Pipeline

**Feature Branch**: `feat/graphql-validate-fix-pipeline`
**Created**: 2026-03-18
**Status**: Complete
**Input**: User description: "Automated multi-agent pipeline that validates GraphQL operations from test-suites and client-web against the server schema, auto-fixes errors, reviews/merges fixes, and benchmarks performance"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Schema validation catches breaking changes automatically (Priority: P1)

After merging schema changes to the server, a developer needs to know which GraphQL operations in `test-suites` and `client-web` are now broken — without manually inspecting each query file across three repositories.

**Why this priority**: Broken queries in downstream repos cause CI failures, block QA, and waste developer time debugging mismatches. Automated detection is the foundational capability all other stories build on.

**Independent Test**: Run the AST validator against both source repos after a schema change and verify it produces per-query JSON result files identifying all broken operations with error categories.

**Acceptance Scenarios**:

1. **Given** the server schema has changed (field removed/renamed), **When** the AST validator runs against test-suites and client-web, **Then** it produces JSON result files for each operation with status `error` and category `SCHEMA_MISMATCH`.
2. **Given** the schema has not changed, **When** the validator runs, **Then** all previously-passing operations still report `success`.
3. **Given** fragments overlap between test-suites and client-web (18 known overlaps), **When** validation runs, **Then** each source gets isolated fragment namespaces preventing false errors.

---

### User Story 2 - Live execution validates runtime behavior (Priority: P2)

Beyond static schema checks, a developer needs to verify that queries actually execute correctly against a running server — catching resolver crashes, auth failures, and missing service dependencies that AST validation cannot detect.

**Why this priority**: Some errors only manifest at runtime (N+1 queries, lazy-loading failures, auth misconfigurations). Live validation catches what static analysis misses.

**Independent Test**: Start the server, run live validation, and verify it produces per-query JSON results with HTTP status, response times, and GQL error details across three execution phases.

**Acceptance Scenarios**:

1. **Given** a running server with a valid session token, **When** live validation runs, **Then** it executes discovery queries (Phase 0), variable-free queries (Phase 1), and parameterized queries (Phase 2) with results saved per-phase.
2. **Given** a query that requires entity IDs as variables, **When** Phase 0 discovery has populated the context, **Then** Phase 2 resolves variables from the context and executes the query.
3. **Given** mutations, subscriptions, or queries with complex Input types, **When** classification runs, **Then** they are marked as `skipped` with a reason.

---

### User Story 3 - Automated fixes for broken queries (Priority: P3)

When validation detects errors, a developer needs fixes to be proposed automatically — with the right fix applied in the right repo — so they don't have to manually trace each schema change and update query files.

**Why this priority**: Manual cross-repo fix work is error-prone and slow. Automated fixes with PRs accelerate the feedback loop from days to minutes.

**Independent Test**: Given validation results with errors, run the fixer and verify it creates branches, edits `.graphql` files, re-validates, and opens PRs in the correct repository.

**Acceptance Scenarios**:

1. **Given** a `SCHEMA_MISMATCH` error in a test-suites operation and the schema change was intentional, **When** the fixer processes it, **Then** it creates a `fix/gql-{QueryName}` branch in test-suites, edits the `.graphql` file, and opens a PR targeting `develop`.
2. **Given** an error in a client-web operation, **When** the fixer processes it, **Then** the fix PR is opened in the client-web repo.
3. **Given** the schema itself appears to have a regression, **When** the fixer diagnoses the root cause, **Then** it fixes the server schema instead.
4. **Given** a query has been fixed and rejected twice, **When** the fixer encounters it again, **Then** it writes a `{QueryName}-retry-exhausted` file and moves on.

---

### User Story 4 - Automated PR review and merge (Priority: P4)

Fix PRs need quality gates before merging — verifying that only `.graphql` files changed, the fix is minimal, and type checks pass — without requiring human review for routine schema alignment changes.

**Why this priority**: Without automated review, fix PRs pile up and create merge bottlenecks. Automated review with strict criteria maintains quality while keeping velocity.

**Independent Test**: Given pending fix PRs, run the reviewer and verify it merges PRs meeting all criteria and rejects those that don't, with feedback.

**Acceptance Scenarios**:

1. **Given** a fix PR that only changes `.graphql` files and addresses the specific error, **When** the reviewer processes it, **Then** it squash-merges the PR and records the decision.
2. **Given** a fix PR that changes non-GQL files, **When** the reviewer processes it, **Then** it rejects the PR with feedback explaining the rejection.
3. **Given** a fix PR with more than 5 files changed, **When** the reviewer processes it, **Then** it auto-rejects.

---

### User Story 5 - Performance benchmarking detects regressions (Priority: P5)

After schema or resolver changes, a developer needs to know if any queries have become significantly slower — before the change reaches production.

**Why this priority**: Performance regressions in GraphQL resolvers can cascade to user-facing latency. Early detection prevents production incidents.

**Independent Test**: Run the benchmark with `--save-baseline`, make no changes, run again, and verify no regressions are flagged. Then artificially slow a resolver and verify the regression is detected.

**Acceptance Scenarios**:

1. **Given** no baseline exists, **When** the benchmark runs, **Then** it saves current timings as baseline with aggregate stats (avg, p50, p90, p95, p99).
2. **Given** a baseline exists, **When** a query's response time exceeds 2x baseline or +500ms absolute, **Then** it is flagged as a `REGRESSION` in the report.
3. **Given** a query that was not in the baseline, **When** comparison runs, **Then** it is marked `NO_BASELINE` (not flagged as regression).

---

### User Story 6 - Pipeline orchestration as agent team (Priority: P6)

The validation → fix → review cycle needs to run as a coordinated pipeline with dependency ordering, quality gates between phases, and the ability to restart cycles continuously.

**Why this priority**: Without orchestration, each phase must be triggered manually. The agent team pattern automates the full loop.

**Independent Test**: Launch `/gql-pipeline` and verify it creates dependency-chained tasks, spawns agents with correct models, and restarts after the reviewer completes.

**Acceptance Scenarios**:

1. **Given** the pipeline is launched, **When** the runner completes, **Then** the fixer starts automatically (blocked until runner finishes).
2. **Given** the fixer has opened PRs, **When** it completes, **Then** the reviewer starts automatically.
3. **Given** the reviewer has processed all PRs, **When** it completes, **Then** a new runner task is created to restart the cycle.

---

### Edge Cases

- Fragment names overlap between test-suites and client-web (18 known cases) — must use isolated namespaces.
- Session token expires mid-run — scripts must detect 401 and fail with clear message.
- Server is not running when live validation or benchmarking is attempted — must fail fast with actionable error.
- Multiple merges land quickly — concurrent validation runs must not corrupt shared pipeline state files.
- A query times out (15s) — must be recorded as an error, not hang the pipeline.
- Discovery queries return no entities — Phase 2 queries should be skipped gracefully, not fail.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST validate GraphQL operations from test-suites and client-web against the server's `schema.graphql` using AST analysis (offline, no server required).
- **FR-002**: System MUST execute GraphQL queries against a running server in three phases (discovery, variable-free, parameterized) and record response status and timing.
- **FR-003**: System MUST isolate fragment namespaces per source repo to prevent cross-contamination from overlapping fragment names.
- **FR-004**: System MUST produce structured JSON results per operation with status, error category, and file path.
- **FR-005**: System MUST automatically create fix branches and PRs in the correct repository (test-suites, client-web, or server) based on error diagnosis.
- **FR-006**: System MUST re-validate fixes before committing and limit to 2 fix attempts per query.
- **FR-007**: System MUST review fix PRs against strict criteria (only GQL files, minimal changes, type checks pass) and merge or reject with feedback.
- **FR-008**: System MUST benchmark query response times and compare against a stored baseline using configurable thresholds.
- **FR-009**: System MUST authenticate via Kratos non-interactive login and manage session tokens for API access.
- **FR-010**: System MUST orchestrate the validation → fix → review cycle as a dependency-chained agent team with automatic restarts.

### Key Entities

- **Validation Result**: Per-operation JSON with source, query name, file path, status (success/error/partial/skipped), errors with categories, fragments used, and timestamp.
- **Live Execution Result**: Per-operation JSON with HTTP status, GQL errors, response time, variables used, data keys, and phase.
- **Fix Record**: Per-query JSON with error category, fix repo, branch, PR URL, files changed, and description.
- **Review Record**: Per-PR JSON with decision (merged/rejected), reason, feedback, and timestamp.
- **Benchmark Baseline**: Per-query timings with aggregate stats (avg, p50, p90, p95, p99).
- **Benchmark Report**: Comparison results with regressions, per-query status, and threshold configuration.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: AST validation of both source repos completes in under 30 seconds.
- **SC-002**: Live validation executes all eligible queries (both phases) in under 10 minutes.
- **SC-003**: 100% of schema-breaking changes in `.graphql` files are detected by AST validation before reaching CI.
- **SC-004**: Fix PRs are opened within 5 minutes of error detection for straightforward `SCHEMA_MISMATCH` errors.
- **SC-005**: Automated review correctly rejects fix PRs that modify non-GQL files (zero false merges).
- **SC-006**: Performance benchmark comparison completes in under 10 minutes for both source repos.
- **SC-007**: Pipeline can run continuously without human intervention for routine schema alignment changes.
