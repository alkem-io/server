# Feature Specification: Structural Fix for Flaky CI Tests

**Feature Branch**: `100-fix-flaky-tests`
**Created**: 2026-04-28
**Status**: Draft
**Input**: User description: "out CI tests become flaky, and we need to properly structurally fix those issues — https://github.com/alkem-io/server/issues/6012, https://github.com/alkem-io/server/issues/6013 — And see if we have more 'flakiness' places"

## Clarifications

### Session 2026-04-28

- Q: Are production-code changes in scope for audit-surfaced sites when the flake reflects a real production-side defect, or must all remediation stay in test code/test config only? → A: Production fixes are allowed when the audit shows the flake is a real production defect; the remediation choice (test-only vs production-side) is documented per punch-list item. The bounded test-only constraint still applies to #6012/#6013 specifically (FR-003).
- Q: How will re-run attribution be collected so the post-merge success metrics are verifiable? → A: Drop the numeric re-run-rate metrics. Replace them with a binary success criterion: during the 30-day post-merge window, no CI re-run is reported (via team channels / issue tracker) as caused by any site on the punch list. No new flake telemetry is in scope.
- Q: Is this work scoped to unit tests, or does it cover integration (`*.it-spec.ts`) and e2e (`*.e2e-spec.ts`) tests too? → A: Unit-style specs only — any `*.spec.ts` file that is not `*.it-spec.ts` and not `*.e2e-spec.ts`, regardless of directory (the punch list includes a small number of unit-style `.spec.ts` files under `test/` that are unit tests by shape and the explicit P1 entry point #6013 is one of them). Integration tests (`*.it-spec.ts`) and e2e tests (`*.e2e-spec.ts`) are out of scope for both the audit and the fix work; flakes in those layers are tracked and addressed separately.
- Q: Where should the anti-pattern reference live? → A: A dedicated docs file (e.g., `docs/testing-flakiness.md`) linked from `CLAUDE.md`. CLAUDE.md gets a one-line pointer; the docs file holds patterns, failure signatures, and recommended replacements.
- Q: For wall-clock perf assertions, is creating a new CI performance job in scope, or only in-place replacements? → A: In-place replacements only. No new CI job is in scope. Each affected site is resolved by the FR-005 menu (operation-budget assertions / non-gating informational form / removal with rationale).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Eliminate the two known flaky tests (Priority: P1)

A pull request author submits changes that touch unrelated code. CI runs the full test suite. Today, one of two known flaky tests (`validation.pipe.spec.ts` or `large-schema.spec.ts`) intermittently fails through no fault of the change, forcing the author to re-run CI and slowing review.

After this fix, both tests produce the same result on every run under the documented flake-trigger condition (coverage mode, the trigger for #6012; deterministic input, the trigger for #6013). Authors no longer hit "passed on re-run" cycles caused by these specific tests.

**Why this priority**: These two failures are observed and documented in tracked issues (#6012, #6013). They actively waste maintainer and reviewer time on every recurrence. Fixing them removes a known source of CI noise immediately.

**Independent Test**: Run each affected test 200 times under coverage mode (the documented flake-trigger condition; per SC-001 plain mode is not separately required). Both must pass every iteration with no retries.

**Acceptance Scenarios**:

1. **Given** the validation pipe spec is invoked, **When** the assertion at the previously-flaky line is evaluated, **Then** no "0 calls" failure on the mocked transformer occurs (the documented #6012 failure signature is gone).
2. **Given** the large-schema performance spec runs, **When** the mutation step is applied, **Then** it always produces a non-empty diff and the sanity check on entry count never fails for stochastic reasons.
3. **Given** either test is executed 200 consecutive times via `pnpm test:flake-verify` (coverage mode), **When** results are collected, **Then** the failure rate is 0% (per SC-001).

---

### User Story 2 - Remove the broader class of flakiness across the test suite (Priority: P2)

The two reported tests are symptoms of patterns that recur in other test files. Pre-spec audit identified additional sites where the same root causes (mock identity under coverage, randomness without seeding, wall-clock performance assertions, leaked process state, fire-and-forget async assertions) can produce intermittent failures.

After this work, every identified site uses a deterministic alternative or appropriate isolation, so the same classes of flake cannot resurface from these locations.

**Why this priority**: Fixing only the two reported tests leaves the same root causes embedded elsewhere. The next flake will appear in a different file and waste another investigation cycle. Addressing the patterns is the difference between symptomatic relief and structural improvement, which is the user's stated intent.

**Independent Test**: For each site identified during audit, demonstrate the failure mode is no longer possible: deterministic input, mock identity preserved, timing thresholds based on operation budgets rather than wall-clock, environment state restored on every exit path. Run the affected files 200 times each with no failures.

**Acceptance Scenarios**:

1. **Given** any test that mocks an external module and asserts on the mock, **When** the suite runs under coverage instrumentation, **Then** mock identity between the system-under-test and the assertion always matches.
2. **Given** any test that mutates input data to drive an assertion on output volume, **When** the test runs, **Then** the mutation produces a deterministic, non-zero effect on every invocation.
3. **Given** any test that asserts performance characteristics, **When** it runs on a loaded CI runner, **Then** it asserts on operation-relative criteria (counts, sizes, ratios, ordering), is downgraded to a non-gating informational form (per FR-005/FR-011 — the `expect(...)` is removed), or has had the wall-clock assertion removed entirely with rationale recorded on the punch-list item.
4. **Given** any test that mutates global or process state (environment variables, prototype methods, shared singletons), **When** the test ends — including on failure or early termination — **Then** the original state is restored before any sibling test runs.
5. **Given** any test that triggers fire-and-forget asynchronous work, **When** assertions run, **Then** the test deterministically waits for the side effect rather than relying on microtask timing.

---

### User Story 3 - Prevent regression by surfacing the patterns (Priority: P3)

After fixing the current sites, the team needs lightweight guardrails so the same patterns do not re-enter the codebase. This means a short reference document describing each anti-pattern, its replacement, and the failure signature it produces, plus — where feasible — automated detection (lint rule, CI check, or convention noted in CLAUDE.md) for the highest-frequency anti-patterns.

After this work, a new contributor can recognise the patterns from local context (review comments, lint output, or documentation) without having to rediscover the underlying cause.

**Why this priority**: Documentation and tooling are valuable but secondary to correctness. They reduce future incidence rather than fix current pain. They should ride alongside the fixes but should not block them.

**Independent Test**: A new test file written using one of the documented anti-patterns is either flagged by automated detection or, if detection is not feasible, the pattern is referenced clearly enough in review/contributor documentation that a code reviewer would catch it.

**Acceptance Scenarios**:

1. **Given** a contributor introduces a mock-factory pattern that splits identity under coverage, **When** linting or pre-merge checks run, **Then** the issue is flagged automatically OR documentation cited in the test conventions makes the failure mode discoverable.
2. **Given** a contributor adds a wall-clock performance assertion in a unit test, **When** the change is reviewed, **Then** project convention referenced in test guidelines steers them to a budget-based or non-unit-test alternative.

---

### Edge Cases

- **Coverage-mode-only flakes**: A test passes locally without coverage but fails under coverage on CI. Per SC-001, verification under coverage mode is required (it is the documented flake-trigger condition for the punch list); plain-mode verification is recommended only for sites whose failure mode is plain-mode-specific (none in the current punch list).
- **Flakes that only manifest under load**: Some timing-sensitive tests pass on idle machines and fail on contended CI runners. Verification *should* include conditions that simulate runner contention (parallel suite execution, low-priority scheduling) where the punch-list entry's failure mode is load-sensitive. Note: the current punch list eliminates load-sensitive assertions structurally — PL-05 replaces a wall-clock concurrency budget with a counter-based concurrency probe (Decision 3); PL-06 downgrades startup SLA assertions to non-gating informational form. After this work, no fixed site retains a load-sensitive assertion, so the contention-simulation gap closes by construction.
- **State leak across test files**: A test that restores state in `afterAll` but throws in `beforeAll` leaves the environment poisoned for subsequent files. Each fix must hold for the early-exit case, not just the happy path.
- **Tests already passing today by luck**: A test that uses randomness with a high success probability may have never failed in observed history but is still vulnerable. The audit should flag these even when there is no failed-run evidence.
- **Performance budgets in CI**: Some performance assertions reflect real product SLAs and removing them removes signal. Where the assertion has product value, it should be replaced with an operation-budget alternative; if no operation-budget proxy is available, downgrade to a non-gating informational form (per FR-005/FR-011 — the wall-clock value is captured but not asserted). The rationale must be recorded on the punch-list item rather than the value being silently deleted.
- **Time-bounded fixes that still flake**: If a structural fix is not feasible for a specific test (e.g., the test exists to verify timing behaviour itself), the fallback is downgrading the assertion to non-gating informational form (per FR-005 / FR-011), not "add a retry" and not skip-on-CI (forbidden by FR-006).

## Requirements _(mandatory)_

### Functional Requirements

#### Bounded scope (the two reported tests)

- **FR-001**: The validation pipe test referenced in issue #6012 MUST pass deterministically on CI, including under coverage instrumentation, with zero spurious failures across 200 consecutive runs.
- **FR-002**: The large-schema diff performance test referenced in issue #6013 MUST produce a non-empty diff every run, with no probability-driven assertion failures.
- **FR-003**: Fixes for FR-001 and FR-002 MUST be test-only and MUST NOT modify production code paths.

#### Audit and broader fix

- **FR-004**: The team MUST audit the unit-style test suite — any `*.spec.ts` file that is not `*.it-spec.ts` and not `*.e2e-spec.ts`, regardless of directory — for the same root causes that produced #6012 and #6013, plus the related categories of timing, randomness, isolation, and async-completion flakiness. Integration tests (`*.it-spec.ts`) and e2e tests (`*.e2e-spec.ts`) are out of scope for this work.
- **FR-005**: For every site the audit identifies, the team MUST either fix the flake (in test code, in production code, or both — whichever addresses the actual root cause), document a deliberate exception with rationale, or downgrade the failing assertion to a non-gating informational form (i.e., remove the `expect(...)` so the assertion no longer participates in pass/fail signal while the surrounding behaviour-coverage stays). Skip-on-CI conditions and net-new CI workflows are not valid remediations (see FR-006 and FR-011). The chosen remediation MUST be recorded per punch-list item along with whether the change is test-only or includes production code.
- **FR-006**: After remediation, no fixed site may rely on retries, masked failures, or skip-on-CI conditions to pass.

#### Determinism and isolation

- **FR-007**: Tests that mock a module and assert on that mock MUST preserve mock identity between the system-under-test and the assertion across every test runner mode supported by the project (including coverage instrumentation).
- **FR-008**: Tests MUST NOT use unseeded randomness, current wall-clock time read as input, or other non-deterministic inputs in any path that drives an assertion outcome. (Note: the current punch list contains one concrete site for unseeded randomness — PL-02; the wall-clock-as-input clause is forward-looking guidance, captured in `docs/testing-flakiness.md` per FR-014. Wall-clock *measurement* of elapsed time is governed by FR-011, which is the specific case for performance-shape assertions.)
- **FR-009**: Tests that mutate process state, environment variables, global singletons, or prototype methods MUST guarantee restoration of original state on every exit path, including thrown errors and early termination.
- **FR-010**: Tests that trigger asynchronous work whose completion is required for an assertion MUST deterministically wait for that completion (e.g., explicit awaiting, explicit completion signal) rather than relying on microtask scheduling.

#### Performance assertions

- **FR-011**: Wall-clock performance assertions MUST NOT live in the standard unit-test gate. (This is the specific performance-shape case of FR-008's broader prohibition on non-deterministic inputs driving assertions.) They MUST be resolved using the FR-005 remediation menu (fix / document deliberate exception / downgrade to non-gating informational form), with operation-budget assertions (counts, sizes, ratios, ordering) preferred when an operation-shape proxy exists. Standing up a new CI performance job is explicitly out of scope — this is the genuinely incremental constraint over FR-005.

#### Verification

- **FR-012**: For each fixed site, verification MUST include running the affected file at least 200 times under conditions that previously triggered the flake (coverage mode, CI-equivalent load) with zero failures.
- **FR-013**: The audit and the fix sites MUST be enumerated in a deliverable visible at review time (e.g., a section in the PR description, or a tracked artifact in the spec directory) so reviewers can confirm coverage of the user's stated intent ("see if we have more flakiness places").

#### Regression prevention (P3 scope)

- **FR-014**: The project MUST publish a short reference describing each anti-pattern fixed in this work and its recommended replacement. The reference MUST live in a dedicated docs file (e.g., `docs/testing-flakiness.md`) and MUST be linked from `CLAUDE.md` so contributors can discover it without prior knowledge of the docs path.
- **FR-015**: For the two highest-frequency anti-patterns (mock-identity under coverage; non-deterministic randomness in test inputs), the team MUST evaluate automated detection (lint rule or CI check) and either implement it or record why it was not feasible.

### Key Entities

- **Punch-list entry**: A specific test file and assertion that produces non-deterministic results. Attributes: file path, line range, root-cause pattern, severity (observed-on-CI / theoretical), chosen remediation (fix / downgrade-to-informational / document-and-keep), remediation surface (test-only / production-side / both). The canonical term across spec, plan, tasks, and `punch-list.md`.
- **Anti-Pattern**: A reusable description of a class of flakiness, its failure signature, and its deterministic replacement. Documented in `docs/testing-flakiness.md` (FR-014).
- **Audit Punch List**: The enumerated set of punch-list entries identified during the broader audit, with status (open / fixed / verified-clean / deferred-with-reason). Maintained in `specs/100-fix-flaky-tests/punch-list.md`. Used as the verification checklist for FR-013.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Across 200 consecutive runs of each fixed test file under coverage mode (the documented flake-trigger condition for the punch list), the failure count attributable to that test is 0. Per-fix verification need not separately exercise plain mode unless the punch-list entry's failure mode is plain-mode-specific (none in the current punch list).
- **SC-002**: During the 30-day window after merge, no CI re-run is reported by the team (via issue tracker, PR comments, or team channels) as caused by any site on the audit punch list. Verification is binary, based on reported observations; no new telemetry is required.
- **SC-003**: Every punch-list entry identified in the pre-spec audit (referenced in FR-013) is either fixed, documented as an explicit exception with rationale, or downgraded to a non-gating informational form. The remediation rate is 100% of the punch list — there are no silently-deferred items.
- **SC-004**: A contributor reviewing or writing a new test can locate the project's flakiness anti-pattern reference (the dedicated docs file linked from CLAUDE.md per FR-014) in under 60 seconds from the repository root.

## Assumptions

- The two reported issues (#6012 and #6013) accurately describe the failures observed; the suggested root causes ("mock identity split under v8 coverage" and "stochastic mutation with non-trivial zero-probability") are the actual causes. If audit work proves otherwise, the spec scope expands to cover the real cause but does not shrink.
- Issue #6012 has at least three observed CI occurrences as of spec creation (PR #6011 run 25054522143, develop run 25048322310, PR #6011 run 25060088496) — i.e., the failure rate on coverage-mode CI is materially higher than the original issue's "passed on re-run" framing suggests. This justifies P1 priority and the 200-runs-under-coverage verification bar (FR-012).
- The pre-spec audit (Pattern A–E findings on `validation.pipe.spec.ts`, `large-schema.spec.ts`, `async.map.spec.ts`, `bootstrap-parity.spec.ts`, `breaking-override.spec.ts`, `generate.name.id.spec.ts`, `space.move.rooms.service.spec.ts`, plus suspect mock-identity sites in `collaborative-document-integration.controller.spec.ts`, `admin.whiteboard.service.spec.ts`, `innovation.hub.interceptor.spec.ts`) is the starting punch list. Additional sites discovered during fix work are added to it.
- Wall-clock performance assertions in unit tests carry product signal worth preserving in some form. Per FR-005/FR-011, the resolution is in-place — operation-budget assertions, downgrade to a non-gating informational form (the `expect(...)` is removed; the value may still be captured), or removal with rationale — rather than silent deletion or a new dedicated CI job.
- "Test-only fix" for FR-003 means changes are confined to test files, test helpers, and test configuration; no production source files are modified to make a test pass.
- The project already has the test execution infrastructure required to run a single file 200 times under coverage; if not, building that capability is in-scope as a one-time investment.

## Dependencies

- Issue #6012 (validation pipe flake) and Issue #6013 (large-schema flake) are the entry points and define the minimum scope of P1.
- This work depends on no new external services or infrastructure changes; all remediation is in-tree.
- All remediation is in-tree (test files, production source where flakes reflect real defects per FR-005, and the new `docs/testing-flakiness.md` reference). No CI workflow files are modified by this work.
