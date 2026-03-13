# Research: src/domain/task Test Coverage

**Date**: 2026-03-12

## Current State

The `src/domain/task/` directory contains 7 TypeScript files with 0 test files:

| File | Type | Testable | Reason |
|------|------|----------|--------|
| `task.resolver.fields.ts` | Resolver | Yes | Contains `progress()` computation with branching logic |
| `task.resolver.queries.ts` | Resolver | Yes | Contains `task()` and `tasks()` query delegation |
| `task.module.ts` | Module | No | NestJS module declaration only |
| `dto/task.interface.ts` | Interface/DTO | No | GraphQL ObjectType with field decorators only |
| `dto/task.status.enum.ts` | Enum | No | Enum registration |
| `dto/index.ts` | Barrel | No | Re-exports |
| `index.ts` | Barrel | No | Re-exports |

## Key Dependencies

- `TaskService` (from `@services/task/task.service`) -- injected into `TaskResolverQueries`
- `ITask` -- GraphQL ObjectType used as parent in field resolver
- `TaskStatus` -- enum used for filtering

## Complexity Analysis

### TaskResolverFields.progress()
- **Cyclomatic complexity**: 3 (two null checks + division)
- **Edge cases**: null itemsCount, undefined itemsDone (defaults to 1), zero itemsCount (division by zero)
- **Risk**: Medium -- incorrect progress displayed to users

### TaskResolverQueries
- **Cyclomatic complexity**: 1 per method (pass-through delegation)
- **Risk**: Low -- but verifies correct wiring

## Existing Patterns Referenced

- `src/domain/access/application/application.service.spec.ts` -- NestJS TestingModule pattern
- `test/mocks/winston.provider.mock.ts` -- Logger mock
- `test/mocks/cache-manager.mock.ts` -- Cache mock
- `test/utils/default.mocker.factory.ts` -- Auto-mocker for unknown DI tokens
