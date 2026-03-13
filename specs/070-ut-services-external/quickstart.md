# Quickstart: Unit Tests for src/services/external

## Run Tests
```bash
# Run all external service tests
pnpm vitest run src/services/external

# Run with coverage
pnpm vitest run --coverage src/services/external

# Run a specific test file
pnpm vitest run src/services/external/elasticsearch/utils/handle.elastic.error.spec.ts
```

## Verify Quality
```bash
# Type check
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

## Test File Locations
All test files are co-located with their source files:
- `src/services/external/elasticsearch/utils/is.elastic.error.spec.ts`
- `src/services/external/elasticsearch/utils/is.elastic.response.error.spec.ts`
- `src/services/external/elasticsearch/utils/handle.elastic.error.spec.ts`
- `src/services/external/elasticsearch/elasticsearch-client/elasticsearch.client.factory.spec.ts`
- `src/services/external/geo-location/utils/is.limit.exceeded.spec.ts`
- `src/services/external/wingback/exceptions/wingback.exception.spec.ts`
- `src/services/external/wingback/wingback.manager.spec.ts`
