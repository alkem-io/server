# Tasks: Unit Tests for src/domain/task

**Date**: 2026-03-12

## Task List

### T1: Create TaskResolverFields unit tests
- **File**: `src/domain/task/task.resolver.fields.spec.ts`
- **Tests**:
  - [x] Returns undefined when itemsCount is null
  - [x] Returns undefined when itemsCount is undefined
  - [x] Returns correct ratio for normal values (e.g., 3/10 = 0.3)
  - [x] Uses fallback value of 1 when itemsDone is undefined
  - [x] Handles itemsCount of 0 (division by zero edge case)
  - [x] Rounds result to 2 decimal places
- **Estimate**: ~30 LOC

### T2: Create TaskResolverQueries unit tests
- **File**: `src/domain/task/task.resolver.queries.spec.ts`
- **Tests**:
  - [x] task() delegates to TaskService.get() with correct ID
  - [x] tasks() delegates to TaskService.getAll() with status filter
  - [x] tasks() delegates to TaskService.getAll() without filter
- **Estimate**: ~40 LOC

### T3: Verify coverage and lint
- [x] Run `pnpm vitest run --coverage src/domain/task` -- target >=80%
- [x] Run `pnpm lint` -- must pass
- [x] Run `pnpm exec tsc --noEmit` -- must pass
