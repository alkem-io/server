# Unit Tests for src/services/api - Research

## Existing Test Patterns

### Pattern 1: Full NestJS Module (roles.service.spec.ts)
Uses `Test.createTestingModule` with explicit mock providers. Best for services with complex dependency graphs where specific mock behavior is needed.

### Pattern 2: defaultMockerFactory (roles.resolver.queries.spec.ts)
Uses `Test.createTestingModule` with `.useMocker(defaultMockerFactory)`. Ideal for resolvers where we just need instantiation + basic delegation tests. Requires MockCacheManager and MockWinstonProvider.

### Pattern 3: Pure Function Tests
No NestJS setup needed. Direct import and test. Best for utility functions like URL parsing, cursor calculation, etc.

## Mock Infrastructure
- `@test/mocks/winston.provider.mock` - MockWinstonProvider
- `@test/mocks/cache-manager.mock` - MockCacheManager
- `@test/utils/default.mocker.factory` - defaultMockerFactory (auto-mocks class tokens via @golevelup/ts-vitest createMock)
- `@test/utils/repository.provider.mock.factory` - for TypeORM repositories

## Coverage Gaps Identified
Current: 32.54% statements. Most resolvers and utility functions have 0% coverage.
Target files contribute roughly 67% of uncovered lines.

## Key Dependencies
- `@elastic/elasticsearch` types for search tests
- `path-to-regexp` for URL resolver utils
- `class-validator` (isUUID) for cursor parsing
- `lodash` (groupBy) for multi-search request builder
