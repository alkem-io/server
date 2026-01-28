# Feature Specification: Migrate to Biome for Linting and Formatting

**Feature Branch**: `028-migrate-biome-linting`
**Created**: 2026-01-18
**Status**: Draft
**Input**: User description: "Migrate lint and prettier to biome enabling almost instantaneous feedback. Keep parity with existing functionality where possible. Benchmark performance boost."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer Runs Code Quality Check (Priority: P1)

As a developer working on the Alkemio server codebase, I want to run code quality checks that complete almost instantaneously so that I can get immediate feedback on my code changes without waiting.

**Why this priority**: This is the core value proposition - drastically reducing the time developers spend waiting for lint and format checks enables faster iteration cycles and improved developer experience.

**Independent Test**: Can be fully tested by running the lint command on the codebase and measuring completion time. Delivers value by providing sub-second feedback on code quality.

**Acceptance Scenarios**:

1. **Given** a developer has made code changes, **When** they run the lint command, **Then** they receive feedback within 2 seconds for incremental checks
2. **Given** the full codebase (~3000 TypeScript files), **When** a developer runs the full lint check, **Then** it completes significantly faster than the current tooling
3. **Given** a developer runs code quality checks, **When** the checks complete, **Then** they see the same categories of issues (formatting, lint errors, type issues) as before migration

---

### User Story 2 - Developer Formats Code on Save (Priority: P1)

As a developer, I want my code to be automatically formatted when I save a file so that I maintain consistent code style without manual intervention.

**Why this priority**: Auto-format on save is a core developer workflow that happens hundreds of times per day. Fast formatting is essential for a seamless experience.

**Independent Test**: Can be tested by saving a file with formatting issues in an IDE and verifying it formats correctly and instantly.

**Acceptance Scenarios**:

1. **Given** a file with inconsistent formatting, **When** the developer saves the file, **Then** the file is formatted according to project standards
2. **Given** IDE integration is configured, **When** the developer edits and saves any TypeScript file, **Then** formatting occurs without perceptible delay

---

### User Story 3 - CI Pipeline Validates Code Quality (Priority: P2)

As a maintainer, I want CI pipelines to validate code quality using the new tooling so that merge requests are checked consistently with local development.

**Why this priority**: CI validation ensures code quality gates are enforced, but comes after local developer experience as developers interact with linting more frequently.

**Independent Test**: Can be tested by running the CI lint command in a pipeline and verifying it catches the same issues as local checks.

**Acceptance Scenarios**:

1. **Given** a pull request with code quality issues, **When** the CI pipeline runs, **Then** it fails with clear error messages indicating the issues
2. **Given** a pull request with clean code, **When** the CI pipeline runs, **Then** the lint check passes
3. **Given** the CI lint command, **When** it runs on the full codebase, **Then** it completes faster than the previous tooling

---

### User Story 4 - Team Reviews Performance Benchmarks (Priority: P2)

As a technical lead, I want to see documented performance benchmarks comparing old and new tooling so that I can validate the migration delivers the promised speed improvements.

**Why this priority**: Benchmarks provide evidence that the migration achieved its goals and help justify the change to stakeholders.

**Independent Test**: Can be tested by running both old and new tools and comparing documented results.

**Acceptance Scenarios**:

1. **Given** benchmark documentation exists, **When** a team member reviews it, **Then** they can see before/after timing comparisons for full lint runs
2. **Given** the benchmark results, **When** compared to previous tooling, **Then** the new tooling shows measurable improvement (target: at least 5x faster)

---

### User Story 5 - Developer Fixes Auto-fixable Issues (Priority: P3)

As a developer, I want to automatically fix lint issues that have safe auto-fixes so that I can quickly resolve common issues without manual editing.

**Why this priority**: Auto-fix is a productivity enhancement but not essential for the core value of fast feedback.

**Independent Test**: Can be tested by running the fix command on files with auto-fixable issues and verifying they are corrected.

**Acceptance Scenarios**:

1. **Given** files with auto-fixable lint issues, **When** the developer runs the fix command, **Then** safe fixes are applied automatically
2. **Given** the fix command is run, **When** fixes are applied, **Then** the changes match what the previous tooling would have fixed

---

### Edge Cases

- **Syntax errors**: Files with syntax errors that prevent parsing will be reported as parse errors by Biome; these must be fixed before other lint rules can be evaluated
- **Excluded files**: Generated files and vendor code will be excluded via Biome's ignore configuration, matching existing `.eslintignore` and `.prettierignore` patterns
- **Configuration conflicts**: Biome's unified configuration handles formatting and linting together, eliminating conflicts between separate tools
- **Legacy violations**: Pre-existing violations will be auto-fixed where safe; remaining violations (syntax errors, unsafe transformations flagged by Biome, or changes requiring semantic judgment) will be manually fixed in the migration PR (no suppression/ignore approach). If manual fixes exceed 50 files, the scope should be reassessed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a command to run all code quality checks (linting and formatting validation)
- **FR-002**: System MUST provide a command to automatically format code files
- **FR-003**: System MUST provide a command to automatically fix safe lint issues
- **FR-004**: System MUST report lint errors with file path, line number, and clear error descriptions
- **FR-005**: System MUST respect existing ignore patterns for files that should be excluded from checks
- **FR-006**: System MUST enforce consistent formatting rules matching current project standards (indentation, quotes, semicolons, line length)
- **FR-007**: System MUST validate code patterns currently enforced (unused variables, explicit function return types, etc.)
- **FR-008**: System MUST integrate with common IDEs for real-time feedback and format-on-save
- **FR-009**: System MUST work with the existing pre-commit workflow
- **FR-010**: System MUST provide documentation for the migration including any rule changes
- **FR-011**: System MUST include performance benchmark results comparing old and new tooling (methodology: 5 local iterations, report median time for both tools)

### Non-Functional Requirements

- **NFR-001**: Full codebase lint check MUST complete at least 5x faster than current tooling
- **NFR-002**: Incremental lint checks MUST complete in under 2 seconds
- **NFR-003**: Format-on-save in IDE MUST have no perceptible delay (under 100ms for single files)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Full codebase lint check completes at least 5x faster than before migration (documented with benchmarks)
- **SC-002**: Developers receive lint feedback in under 2 seconds for incremental changes
- **SC-003**: Zero regression in code quality rules - all previously caught issues are still caught
- **SC-004**: IDE integration provides format-on-save in under 100ms for single files
- **SC-005**: CI pipeline lint step completes faster than before migration
- **SC-006**: Migration documentation and benchmarks are reviewed and approved by team

## Assumptions

- The codebase currently uses ESLint for linting and Prettier for formatting
- Developers use VS Code or similar IDEs that support language server integration
- The existing lint rules will be mapped to equivalent Biome rules using a best-effort approach; unmappable rules will be documented and Biome's closest equivalent will be used
- The project's type checking configuration remains unchanged
- Performance improvements are the primary driver; exact rule parity is desired but minor rule differences are acceptable if documented
- Migration will be a hard cutover in a single PR (no parallel tooling period)

## Clarifications

### Session 2026-01-18

- Q: When Biome cannot map an existing ESLint rule to an equivalent, what is the acceptable approach? → A: Best-effort: document unmapped rules, use Biome's closest equivalent
- Q: What is the migration transition strategy? → A: Hard cutover: replace ESLint+Prettier with Biome in a single PR
- Q: How should pre-existing lint violations in the codebase be handled? → A: Auto-fix what's safe, manually fix remainder in migration PR
- Q: What benchmark methodology should be used for the performance comparison? → A: Local average: run 5 iterations locally, report median time

## Out of Scope

- Changing the actual coding standards or rules (only tooling changes)
- Migrating type checking (type checker remains unchanged)
- IDE configuration for all possible editors (VS Code is the primary target)
- Automated migration of custom lint plugins or rules (will be documented as manual steps if needed)
