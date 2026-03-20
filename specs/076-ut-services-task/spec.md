# Specification: Unit Tests for src/services/task

## Overview
Add comprehensive unit tests for `TaskService` in `src/services/task/task.service.ts` to achieve >= 80% code coverage.

## Scope
- **In scope**: `TaskService` (the only testable file; all others are interfaces, types, constants, module, or barrel exports)
- **Out of scope**: Entity files, interface files, module files, enum files, type aliases, constants

## Target File
- `src/services/task/task.service.ts` (200 LOC, 10 public/private methods)

## Key Behaviors to Test
1. `getTaskList()` - returns cached list or creates new empty list
2. `getAll(status?)` - filters tasks by status from cache
3. `get(id)` - retrieves a single task from cache
4. `getOrFail(id)` - retrieves task or throws Error
5. `create(itemsCount?)` - creates a new task with UUID, stores in cache and task list
6. `updateTaskResults(id, result, completeItem?)` - appends result, increments itemsDone, may complete task
7. `updateTaskErrors(id, error, completeItem?)` - appends error, increments itemsDone, may complete task
8. `complete(id, status?)` - marks task completed/errored with end timestamp
9. `completeWithError(id, error)` - marks task errored with error message
10. `addTaskToList(task)` (private, tested indirectly via `create`)

## Dependencies
- `Cache` (cache-manager) - mocked via `MockCacheManager`
- `LoggerService` (Winston) - mocked via `MockWinstonProvider`

## Coverage Target
>= 80% statement/branch/function/line coverage
