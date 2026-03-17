# Implementation Plan: Unit Tests for src/domain/task

**Branch**: `041-subspace-sorting-pinning` | **Date**: 2026-03-12 | **Spec**: [spec.md](spec.md)

## Summary

Add unit tests for the two resolver files in `src/domain/task/`: `TaskResolverFields` (computed progress field) and `TaskResolverQueries` (query delegation). The area has 7 source files, 0 test files. Only 2 files contain testable logic. Target: >=80% coverage.

## Technical Context

**Testing Framework**: Vitest 4.x with `@golevelup/ts-vitest` for DI mocking
**Mock Infrastructure**: `MockWinstonProvider`, `MockCacheManager`, `defaultMockerFactory`
**Pattern**: NestJS `Test.createTestingModule` with `.useMocker(defaultMockerFactory)`

## Files to Create

| File | Tests | Description |
|------|-------|-------------|
| `src/domain/task/task.resolver.fields.spec.ts` | 5 | Progress computation: null itemsCount, zero division, normal ratio, undefined itemsDone, boundary values |
| `src/domain/task/task.resolver.queries.spec.ts` | 3 | Query delegation: task by ID, tasks with status filter, tasks without filter |

## Approach

1. **TaskResolverFields**: Direct instantiation (no DI needed) -- pure method testing on `progress()`.
2. **TaskResolverQueries**: NestJS TestingModule with mocked `TaskService` -- verify delegation calls.

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Domain-Centric Design First | PASS | Tests verify domain resolver logic |
| Modular NestJS Boundaries | PASS | Tests co-located with source |
| Code Quality with Pragmatic Testing | PASS | Risk-based: testing computed fields and delegation |
