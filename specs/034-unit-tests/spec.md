# Feature Specification: Application-Wide Unit Test Coverage

**Feature Branch**: `034-unit-tests`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "add unit tests for the whole application following .specify/memory/test-generation-guidelines.md"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Domain Service Logic Verification (Priority: P1)

As a developer, I need unit tests covering the domain service layer so that business logic correctness is verified in isolation, regressions are caught early, and I can refactor domain code with confidence.

**Why this priority**: Domain services are the heart of the application's business logic. With 93 services and only 31 tested (~33%), this is the highest-value coverage gap. Domain services orchestrate entities, enforce invariants, and coordinate business rules -- errors here directly impact platform correctness.

**Independent Test**: Can be fully verified by running the test suite. Each domain module's tests can be run independently and deliver immediate regression protection for that module.

**Acceptance Scenarios**:

1. **Given** a domain service with business logic (validation, orchestration, state transitions), **When** unit tests are written, **Then** all happy-path flows and domain rule violations are verified through behavioral assertions.
2. **Given** a domain service with external dependencies (repositories, other services), **When** unit tests are written, **Then** dependencies are mocked at boundaries and the service's orchestration logic is verified independently.
3. **Given** a domain service that throws custom exceptions on invalid input, **When** unit tests cover error paths, **Then** the correct exception type is thrown for each error scenario without leaking dynamic data in messages.

---

### User Story 2 - Common Utility & Library Verification (Priority: P2)

As a developer, I need unit tests for shared utility functions and library modules so that foundational code used across the application is proven correct, preventing cascading failures.

**Why this priority**: Common utilities (25 files, 3 already tested) and library modules are reused across the entire application. A bug in a utility function can silently affect dozens of call sites. These are also the easiest to test -- pure functions with no DI dependencies.

**Independent Test**: Utility tests are fully self-contained with no mocks required. Each utility can be tested in isolation with input/output verification.

**Acceptance Scenarios**:

1. **Given** a pure utility function (compression, hashing, string manipulation, array operations), **When** unit tests are written, **Then** the function's behavior is verified across typical inputs, boundary values, and edge cases.
2. **Given** an async utility function (async map, filter, reduce), **When** unit tests are written, **Then** correct behavior is verified for empty arrays, single items, multiple items, and error propagation.
3. **Given** a library service with business logic, **When** unit tests are written, **Then** service methods are tested with mocked dependencies following the same patterns as domain services.

---

### User Story 3 - Application & Infrastructure Service Verification (Priority: P3)

As a developer, I need unit tests for application-layer services (API resolvers' delegation logic, adapters, infrastructure services) so that the orchestration between domain and external systems is verified.

**Why this priority**: Application-layer services bridge domain logic to external interfaces. While lower priority than domain logic, these services handle argument mapping, authorization delegation, and event publishing -- areas where subtle bugs cause hard-to-diagnose production issues.

**Independent Test**: Each service layer test can be run independently. Resolver tests verify argument mapping and delegation without requiring GraphQL schema parsing.

**Acceptance Scenarios**:

1. **Given** a resolver with argument mapping and service delegation, **When** unit tests are written, **Then** correct argument passing to underlying services is verified.
2. **Given** an adapter service that bridges to external systems, **When** unit tests are written, **Then** the adapter's transformation and delegation logic is verified with mocked external dependencies.
3. **Given** an infrastructure service (event bus, naming, license usage), **When** unit tests are written, **Then** orchestration logic and error handling paths are verified.

---

### User Story 4 - Core Framework Service Verification (Priority: P4)

As a developer, I need unit tests for core framework services (authentication, authorization, bootstrap, microservice resilience) so that cross-cutting security and infrastructure concerns are verified.

**Why this priority**: Core services handle authentication, authorization, and framework bootstrap. While they have fewer files, correctness here is critical for security. Only 5 of ~120 core source files have tests.

**Independent Test**: Each core module's tests can be run independently. Authorization logic tests verify privilege decisions without requiring a running auth stack.

**Acceptance Scenarios**:

1. **Given** an authorization service with privilege-checking logic, **When** unit tests are written, **Then** grant/deny decisions are verified for each credential type and edge case.
2. **Given** a core service with configuration-dependent behavior, **When** unit tests are written, **Then** behavior under different configuration values is verified.

---

### Edge Cases

- What happens when a service method receives undefined/null for required parameters?
- How do services behave when optional relations are not loaded (undefined)?
- What happens when repository mocks return empty results vs. null vs. undefined?
- How does the system handle domain events that fail to publish during a state transition?
- What happens when concurrent operations attempt to modify the same aggregate?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: All domain services with business logic (validation, orchestration, state transitions, domain rule enforcement) MUST have unit tests covering happy-path and error-path scenarios.
- **FR-002**: All common utility functions MUST have unit tests verifying correct behavior for typical inputs, boundary values, and edge cases.
- **FR-003**: All library services with business logic MUST have unit tests following the same patterns as domain services.
- **FR-004**: Application-layer services (resolvers, adapters, infrastructure) with non-trivial logic MUST have unit tests covering argument mapping, delegation, and error handling. Non-trivial is defined as: any conditional branching (if/switch/ternary) or data transformation beyond simple pass-through delegation.
- **FR-005**: Core framework services with authorization, authentication, or security logic MUST have unit tests verifying grant/deny decisions and security boundaries.
- **FR-006**: Tests MUST follow behavioral naming: `should [expected behavior] when [condition]`.
- **FR-007**: Tests MUST use the Arrange-Act-Assert pattern with one assertion concept per test.
- **FR-008**: Tests MUST mock at boundaries only (repositories, external services, event publishers) -- never mock domain entities when testing use cases.
- **FR-009**: Tests MUST NOT include trivial tests (instantiation checks, getter/setter tests, framework behavior tests, decorator tests).
- **FR-010**: Tests MUST use the existing test infrastructure (mock factories, repository mocks, default mocker factory) to maintain consistency.
- **FR-011**: Error path tests MUST verify correct exception types are thrown without dynamic data in messages.
- **FR-012**: Test files MUST be co-located alongside source files following the `*.spec.ts` naming convention.
- **FR-013**: Tests MUST be ordered by importance within each describe block: happy path, domain violations, edge cases, error handling.

### Key Entities

- **Domain Service**: Core business logic class (~93 total across 14 modules) -- the primary target for unit testing.
- **Common Utility**: Shared pure function (25 files, 3 already tested) -- high reuse, easy to test, high impact when broken.
- **Library Module**: Isolated reusable service (~24 files) -- independent business logic outside main DI container.
- **Application Service**: Resolver/adapter/infrastructure service (~350 files) -- bridges domain to external interfaces.
- **Test Infrastructure**: Existing mock factories, providers, and helpers (~60 files) -- foundation for all new tests.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every domain service file with business logic has a corresponding test file with behavioral test cases covering at minimum the primary happy path and one error path.
- **SC-002**: Every common utility function has test cases covering typical inputs, at least one boundary value, and at least one edge case.
- **SC-003**: All new tests pass consistently when the test suite is run (zero flaky tests introduced).
- **SC-004**: No trivial "should be defined" tests are added -- every test verifies meaningful behavior.
- **SC-005**: File coverage targets by layer (measured by percentage of service/utility files with corresponding spec files): Domain services 90%+, Common utilities/Library modules 90%+, Application services 80%+, Core services 90%+.
- **SC-006**: The full test suite completes within 5 minutes maximum (including all new tests), maintaining fast CI feedback.
- **SC-007**: All tests follow the project's established test patterns and use existing test infrastructure consistently.

## Clarifications

### Session 2026-02-13

- Q: What file coverage targets should apply to non-domain layers? → A: Differentiated targets: Domain 90%+, Common/Library 90%+, Application 80%+, Core 90%.
- Q: What constitutes "non-trivial logic" for application-layer services? → A: Any conditional branching (if/switch/ternary) or data transformation beyond simple pass-through delegation.
- Q: What is the maximum acceptable CI test suite execution time? → A: 5 minutes maximum.

## Assumptions

- The existing test infrastructure (mock factories, repository mocks, default mocker factory, Winston mock, cache mock) is sufficient for new tests and does not need significant extension.
- Services that are pure pass-through wrappers with no conditional logic, validation, or transformation are excluded from testing requirements (per FR-009 -- no trivial tests).
- Repository implementations are excluded from unit testing scope -- they are covered by integration tests.
- GraphQL schema parsing and end-to-end resolver chains are excluded -- those belong in integration/e2e test suites.
- The test generation follows the priority order defined in the guidelines: domain layer (highest) > application layer > infrastructure layer (lowest for unit tests).
- New test data builders/factories may need to be created for domain objects that lack them, extending existing patterns in the test utilities.
- Dataloader creators are excluded from unit testing scope -- 36/37 creators are pure factory wrappers delegating to shared utility functions with no conditional logic. The one non-trivial creator (SpaceBySpaceAboutIdLoaderCreator) already has comprehensive tests.

## Scope Boundaries

### In Scope
- Unit tests for domain services, common utilities, library modules, application services, and core services
- Extension of existing test infrastructure (new mock factories, test builders) as needed
- Co-located test files alongside source code

### Out of Scope
- Integration tests (`*.it-spec.ts`)
- End-to-end tests (`*.e2e-spec.ts`)
- Repository implementation tests
- GraphQL schema/contract tests
- Performance or load testing
- Test coverage tooling or CI pipeline changes
