# Feature Specification: Unit Tests for src/domain/task

**Feature Branch**: `041-subspace-sorting-pinning`
**Created**: 2026-03-12
**Status**: Draft
**Input**: Add unit tests for the `src/domain/task` area achieving >=80% coverage.

## User Scenarios & Testing

### User Story 1 - Task Resolver Field Computation (Priority: P1)

As a developer, I need unit tests for `TaskResolverFields.progress()` so that the computed `progress` field logic is verified, including edge cases like null/undefined `itemsCount`.

**Why this priority**: The `progress` field contains non-trivial division logic with nullable inputs. A bug here silently returns incorrect progress values to the GraphQL API.

**Acceptance Scenarios**:

1. **Given** a task with `itemsCount` and `itemsDone` defined, **When** `progress()` is called, **Then** the ratio `itemsDone / itemsCount` is returned rounded to 2 decimal places.
2. **Given** a task with `itemsCount` equal to `null` or `undefined`, **When** `progress()` is called, **Then** `undefined` is returned.
3. **Given** a task with `itemsDone` undefined but `itemsCount` defined, **When** `progress()` is called, **Then** the fallback value of 1 is used for `itemsDone`.

### User Story 2 - Task Query Resolver Delegation (Priority: P2)

As a developer, I need unit tests for `TaskResolverQueries` so that GraphQL query delegation to `TaskService` is verified.

**Acceptance Scenarios**:

1. **Given** a task ID, **When** `task()` is called, **Then** `TaskService.get()` is invoked with the correct ID.
2. **Given** an optional status filter, **When** `tasks()` is called, **Then** `TaskService.getAll()` is invoked with the provided status.

## Scope

- **In scope**: `task.resolver.fields.ts`, `task.resolver.queries.ts`
- **Out of scope**: Entity files, interface files, module files, enum files, DTO files
