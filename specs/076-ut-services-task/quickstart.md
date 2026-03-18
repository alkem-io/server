# Quickstart: Unit Tests for src/services/task

## Run Tests
```bash
# Run task service tests
pnpm vitest run src/services/task/task.service.spec.ts

# Run with coverage
pnpm vitest run --coverage src/services/task

# Type check
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

## File Locations
- Source: `src/services/task/task.service.ts`
- Tests: `src/services/task/task.service.spec.ts`
- Mocks: `test/mocks/cache-manager.mock.ts`, `test/mocks/winston.provider.mock.ts`
