# Quickstart: Unit Tests for src/domain/task

**Date**: 2026-03-12

## Running Tests

```bash
# Run only task domain tests
pnpm vitest run src/domain/task

# Run with coverage
pnpm vitest run --coverage src/domain/task

# Run in watch mode during development
pnpm vitest src/domain/task
```

## Test File Locations

Tests are co-located with source files:

```
src/domain/task/
  task.resolver.fields.ts        # Source
  task.resolver.fields.spec.ts   # Test (new)
  task.resolver.queries.ts       # Source
  task.resolver.queries.spec.ts  # Test (new)
```

## Test Patterns Used

### Direct Instantiation (TaskResolverFields)
The field resolver has no constructor dependencies, so it is instantiated directly:
```typescript
const resolver = new TaskResolverFields();
resolver.progress(taskMock);
```

### NestJS TestingModule (TaskResolverQueries)
The query resolver depends on `TaskService`, so it uses the NestJS test module:
```typescript
const module = await Test.createTestingModule({
  providers: [TaskResolverQueries, MockWinstonProvider],
}).useMocker(defaultMockerFactory).compile();
```

## Verification

```bash
pnpm vitest run --coverage src/domain/task  # Target: >=80%
pnpm lint                                    # Must pass
pnpm exec tsc --noEmit                       # Must pass
```
