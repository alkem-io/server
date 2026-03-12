# Unit Tests for src/services/api - Quickstart

## Run Tests
```bash
# Run all services/api tests
pnpm vitest run src/services/api

# Run with coverage
pnpm vitest run --coverage.enabled --coverage.reporter=text --coverage.include='src/services/api/**' src/services/api

# Run a specific test file
pnpm vitest run src/services/api/search/util/validate.search.parameters.spec.ts

# Run tests in watch mode for development
pnpm vitest src/services/api
```

## Verify Quality
```bash
pnpm lint          # tsc --noEmit + biome check
pnpm exec tsc --noEmit   # type-check only
```

## Test File Convention
Test files are co-located with source files:
- `src/services/api/search/util/validate.search.parameters.ts`
- `src/services/api/search/util/validate.search.parameters.spec.ts`
