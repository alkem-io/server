# Research: Application-Wide Unit Test Coverage

**Feature**: 034-unit-tests | **Date**: 2026-02-13

## Research Questions & Findings

### RQ-1: What is the current test coverage baseline?

**Decision**: Coverage is at ~20% by file count across all layers. 81 existing `.spec.ts` files cover ~32 of 158 service files.

**Breakdown by layer:**

| Layer | Total Files | With Tests | Coverage |
|-------|------------|------------|----------|
| Domain services (`src/domain/`) | 92 | 13 | 14.1% |
| Common utilities (`src/common/utils/`) | 8 | 1 | 12.5% |
| Library services (`src/library/`) | 3 | 1 | 33.3% |
| Application services (`src/services/`) | 49 | 13 | 26.5% |
| Core services (`src/core/`) | 6 | 4 | 66.7% |
| Platform services (`src/platform/`) | 18 | 5 | 27.8% |
| Platform-admin services (`src/platform-admin/`) | 9 | 0 | 0.0% |

**Rationale**: File-based coverage counting (does a `.spec.ts` exist?) is the primary metric per SC-005. This aligns with the spec's pragmatic approach — we measure whether meaningful behavioral tests exist, not line-level coverage percentages.

### RQ-2: What test patterns and infrastructure exist?

**Decision**: Two established patterns are in use, plus comprehensive mock infrastructure. All new tests should follow these existing patterns.

**Pattern A — Manual Construction (preferred for domain/service logic):**
- Direct `new ServiceUnderTest(...)` with hand-crafted mocks
- `vi.fn()` for mock functions, `vi.spyOn()` for spies
- Best for focused behavioral tests with minimal setup

**Pattern B — NestJS TestingModule (when DI wiring matters):**
- `Test.createTestingModule({ providers: [...] }).useMocker(defaultMockerFactory).compile()`
- Uses `repositoryProviderMockFactory(Entity)` for TypeORM repos
- Uses `MockCacheManager`, `MockWinstonProvider` for common cross-cutting concerns
- `defaultMockerFactory` from `@golevelup/ts-vitest` auto-mocks remaining deps

**Pattern C — Pure Utility (no NestJS, no mocks):**
- Direct import and test of pure functions
- No setup needed, fastest tests

**Pattern D — Parameterized (`it.each`):**
- For functions with many input/output combinations
- Table-driven tests with descriptive interpolation

**Existing mock infrastructure (50+ mocks):**
- `test/mocks/` — Pre-built service mocks (authorization, user, organization, space, community, etc.)
- `test/utils/` — Factories (`defaultMockerFactory`, `repositoryProviderMockFactory`, `eventBusMockFactory`)
- `test/data/` — Entity test data builders (user, organization, space, agent, etc.)

**Rationale**: Reusing established patterns ensures consistency (FR-010) and leverages the significant existing investment in mock infrastructure.

### RQ-3: What is the test runner configuration?

**Decision**: Vitest 4.x with globals enabled, SWC plugin for decorators, v8 coverage.

**Key config points:**
- Globals enabled — `describe`, `it`, `expect`, `beforeEach` available without imports
- `unplugin-swc` for NestJS decorator metadata support
- `vite-tsconfig-paths` resolves `@domain/*`, `@services/*`, etc.
- Pool: `forks` (CJS compatibility)
- Timeout: 90 seconds per test
- Test pattern: `**/?(*.)+(spec).ts`
- Coverage provider: v8, output to `./coverage-ci`

**Rationale**: No changes to test infrastructure needed. The existing setup supports all required test patterns.

### RQ-4: Which domain modules have the largest coverage gaps?

**Decision**: Prioritize by gap size × business impact.

**Critical gaps (0% coverage, high business value):**
- Template module (7 services) — template creation, bundling, defaults
- Timeline module (3 services) — calendar events
- Agent module (2 services) — agent lifecycle
- Storage module (3 services) — document lifecycle, storage aggregator
- Innovation Hub (1 service)

**Large gaps (< 15% coverage, high file count):**
- Collaboration module: 11 services, 1 tested (9%) — callouts, contributions, innovation flows
- Common domain: 20 services, 2 tested (10%) — authorization policies, profiles, forms, visuals
- Space module: 9 services, 2 tested (22%) — account management, space settings, lookups
- Communication: 8 services, 2 tested (25%) — messaging, rooms, discussions
- Community: 16 services, 5 tested (31%) — users, orgs, virtual contributors, invitations

**Rationale**: Domain services are the spec's P1 priority. Modules with 0% coverage get immediate attention; large modules with < 25% coverage follow.

### RQ-5: What common utility files need tests?

**Decision**: 7 of 8 utility files need tests. All are pure functions — ideal for Pattern C.

**Untested utilities:**
1. `email.util.ts` — email validation/normalization
2. `file.util.ts` — file type checking, size validation
3. `image.util.ts` — image format validation
4. `random.id.generator.util.ts` — unique ID generation
5. `random.util.ts` — random value generation
6. `string.util.ts` — string manipulation helpers
7. `stringify.util.ts` — safe JSON stringification

**Additional common files with test-worthy logic:**
- `src/common/exceptions/` — 2 tested (base.exception, error.status.metadata), others may need tests
- `src/common/utils/get-differences/` — 1 tested (get.diff)
- `src/common/utils/has-allowed-allowed-fields/` — 1 tested

**Rationale**: Pure utilities are the easiest to test (no mocks, no DI) and have high reuse across the codebase. A bug in a utility silently affects dozens of call sites.

### RQ-6: How should test files be organized and ordered within describe blocks?

**Decision**: Follow existing conventions per FR-006, FR-007, FR-012, FR-013.

- **File location**: Co-located alongside source (`*.spec.ts` next to `*.service.ts`)
- **Naming**: `should [expected behavior] when [condition]`
- **Structure**: Arrange-Act-Assert pattern
- **Order within describe**: happy path → domain violations → edge cases → error handling
- **One assertion concept per test** (multiple `expect()` OK if same logical assertion)

**Rationale**: Consistency with the 81 existing test files and the test generation guidelines.

### RQ-7: What is the expected scale and CI impact?

**Decision**: ~126 new test files expected. Must complete within 5-minute CI budget (SC-006).

**Estimation:**
- Current 81 spec files run in ~2-3 minutes
- Adding ~126 files roughly doubles the count
- Unit tests with mocks are fast (< 100ms each typically)
- Vitest parallel execution in `forks` pool handles scaling well
- 5-minute budget is achievable if tests remain properly isolated

**Risk mitigation**: Monitor CI time after each batch of test additions. If approaching 4 minutes, investigate slow tests.

**Alternatives considered**: Running tests in parallel pools — rejected as unnecessary given Vitest's built-in parallelism.

### RQ-8: Should existing "should be defined" tests be removed?

**Decision**: Yes, replace trivial tests with meaningful behavioral tests per FR-009 and SC-004.

Several existing tests contain only `should be defined` assertions (e.g., `lifecycle.service.spec.ts`). When writing tests for these services, the trivial test should be replaced with behavioral tests.

**Rationale**: FR-009 explicitly prohibits trivial instantiation checks. SC-004 requires every test to verify meaningful behavior.
