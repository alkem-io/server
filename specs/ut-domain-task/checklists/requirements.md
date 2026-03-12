# Requirements Checklist: Unit Tests for src/domain/task

**Date**: 2026-03-12

## Functional Requirements

- [x] FR-01: Unit tests for `TaskResolverFields.progress()` cover all branches
- [x] FR-02: Unit tests for `TaskResolverQueries.task()` verify delegation
- [x] FR-03: Unit tests for `TaskResolverQueries.tasks()` verify delegation with and without status filter
- [x] FR-04: Tests are co-located with source files (`*.spec.ts`)
- [x] FR-05: Tests use Vitest 4.x globals (`describe`, `it`, `expect`, `vi`)

## Non-Functional Requirements

- [x] NFR-01: Coverage >= 80% for `src/domain/task`
- [x] NFR-02: All tests pass deterministically (no flaky tests)
- [x] NFR-03: Tests run in < 5 seconds
- [x] NFR-04: No production code changes
- [x] NFR-05: Lint passes (`pnpm lint`)
- [x] NFR-06: Type check passes (`pnpm exec tsc --noEmit`)

## Test Infrastructure

- [x] TI-01: Uses `MockWinstonProvider` for logger mocking
- [x] TI-02: Uses `defaultMockerFactory` for auto-mocking unknown DI tokens
- [x] TI-03: Follows existing test patterns from `specs/034-unit-tests`
