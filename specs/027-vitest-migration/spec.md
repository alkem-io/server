# Feature Specification: Jest to Vitest Migration

**Feature Branch**: `027-vitest-migration`
**Created**: 2026-01-18
**Status**: Draft
**Input**: User description: "replace jest with vitest for modern software development and fast feedback loops"

## Scope

### In Scope
- Replace Jest test runner with Vitest
- Rewrite tests to use Vitest idioms where beneficial
- Test directory restructuring and organization improvements
- Modernization of test patterns and utilities
- Configuration updates (vitest.config.ts, tsconfig adjustments)
- CI pipeline script updates for Vitest commands

### Out of Scope
- Adding new tests for previously untested code (unless required for migration validation)
- Changes to application source code (only test infrastructure)
- Database or external service test fixtures changes (unless blocking migration)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast Test Feedback During Development (Priority: P1)

As a developer, I want my tests to run significantly faster so that I can iterate quickly on code changes and maintain a tight feedback loop during development.

**Why this priority**: Fast feedback is the core driver for this migration. Slow test execution breaks developer flow and reduces productivity. This is the primary value proposition of migrating to Vitest.

**Independent Test**: Can be fully tested by running the test suite before and after migration, comparing execution times, and validating that developers experience noticeably faster test runs in their daily workflow.

**Acceptance Scenarios**:

1. **Given** a developer has made changes to a module, **When** they run tests for that module, **Then** the tests complete in under 30 seconds (or ≥50% faster than Jest baseline for that module)
2. **Given** a developer is working on a feature, **When** they run the full test suite, **Then** the suite completes ≥50% faster than the Jest baseline (soft target; any measurable improvement documented)
3. **Given** a developer saves a file in watch mode, **When** tests re-run for affected files, **Then** the re-execution completes in under 3 seconds for the affected test file

---

### User Story 2 - Seamless CI Pipeline Integration (Priority: P2)

As a CI/CD system, I want the test suite to execute reliably and produce coverage reports so that automated quality gates continue to function without interruption.

**Why this priority**: CI integration is essential for maintaining code quality gates. Without this, the migration cannot be deployed to the team.

**Independent Test**: Can be fully tested by running the CI test commands (`pnpm test:ci`) and verifying coverage reports are generated correctly at `coverage-ci/lcov.info`.

**Acceptance Scenarios**:

1. **Given** the CI pipeline runs, **When** tests are executed with coverage, **Then** coverage reports are generated in the expected format and location
2. **Given** a test fails, **When** the CI pipeline reports results, **Then** failure details are clear and actionable
3. **Given** the test suite completes, **When** coverage thresholds are evaluated, **Then** existing coverage requirements are enforced

---

### User Story 3 - Developer Experience Continuity (Priority: P3)

As a developer familiar with the existing test patterns, I want minimal disruption to my testing workflow so that I can continue writing and running tests using familiar patterns.

**Why this priority**: Reducing friction ensures team adoption. If the migration introduces too many changes to how developers write tests, it will slow down the team.

**Independent Test**: Can be fully tested by having developers run existing test commands and write new tests using documented patterns, validating that the experience is intuitive.

**Acceptance Scenarios**:

1. **Given** a developer runs `pnpm test`, **When** tests execute, **Then** the output format is clear and easy to read
2. **Given** a developer wants to run a specific test file, **When** they use the existing command pattern, **Then** the file executes as expected
3. **Given** a developer needs to debug a test, **When** they use standard debugging approaches, **Then** debugging works as expected

---

### Edge Cases

- **Jest-specific syntax**: Tests will be rewritten to use Vitest idioms (`vi.mock()`, `vi.useFakeTimers()`, etc.) rather than maintaining Jest compatibility shims
- **Fake timers / module mocking**: Migrate to Vitest equivalents (`vi.useFakeTimers()`, `vi.mock()`); rewrite test logic if Vitest approach differs
- **TypeScript path aliases**: Must be configured in Vitest config to match `tsconfig.json` aliases
- **Snapshot testing**: No snapshot tests currently exist. Vitest snapshot support is available for future use; format differs from Jest snapshots.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST run all existing unit tests (`*.spec.ts`) without modification to test logic where possible
- **FR-002**: System MUST support running integration tests (`*.it-spec.ts`) with the same behavior when such tests exist (currently none in codebase)
- **FR-003**: System MUST support running E2E tests (`*.e2e-spec.ts`) with the same behavior when such tests exist (currently none in codebase)
- **FR-004**: System MUST generate coverage reports compatible with existing CI tooling (lcov format at `coverage-ci/lcov.info`)
- **FR-005**: System MUST support TypeScript path aliases (`@domain/*`, `@services/*`, etc.) as configured in `tsconfig.json`
- **FR-006**: System MUST support running individual test files via command line (`pnpm test -- path/to/spec.ts`)
- **FR-007**: System MUST support watch mode for rapid development iteration
- **FR-008**: System MUST maintain compatibility with existing mocking patterns used across the codebase
- **FR-009**: System MUST support snapshot testing functionality for future tests (no snapshot tests currently exist in codebase)
- **FR-010**: System MUST integrate with existing npm scripts without changing command names (`pnpm test:ci`, `pnpm test:ci:no:coverage`)

### Key Entities

- **Test Configuration**: Defines how tests are discovered, executed, and reported. Key attributes include test patterns, coverage settings, and path aliases.
- **Test Files**: Existing test files across unit, integration, and E2E categories that must continue to function.
- **Coverage Reports**: Output artifacts that CI systems consume for quality gates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing tests pass after migration without changes to test assertions or logic
- **SC-002**: Test suite execution time is ≥50% faster than the Jest baseline (soft target; any measurable improvement acceptable with documented results)
- **SC-003**: Coverage reports continue to be generated in the correct format and location
- **SC-004**: Watch mode provides near-instant feedback when a file changes
- **SC-005**: Developers can run and write tests without learning a significantly different API
- **SC-006**: CI pipeline passes without modification to workflow commands

## Clarifications

### Session 2026-01-18

- Q: What measurable performance threshold defines migration success? → A: ≥50% faster than Jest baseline
- Q: What migration strategy - parallel period or single cutover? → A: Single cutover in one PR; all tests migrate together
- Q: How to handle incompatible Jest-specific syntax? → A: Allow test rewrites; prioritize Vitest idioms over Jest compatibility
- Q: Should scope include test infrastructure improvements beyond runner swap? → A: Yes, include test directory restructuring and modernization
- Q: What if migration falls short of 50% performance target? → A: Soft target; accept if measurable improvement achieved, document actual results

## Assumptions

- Migration will be a single atomic cutover (one PR) rather than gradual; rollback is via git revert if needed
- Vitest's Jest-compatible mode will handle the majority of existing test syntax without modification
- The existing test suite does not rely on Jest features that are fundamentally incompatible with Vitest
- Performance improvements from Vitest's native ESM support and parallel execution will provide measurable benefits
- Snapshot files will be migrated or regenerated as part of the migration process
- Test rewrites to Vitest idioms are acceptable; Jest compatibility is not a constraint
