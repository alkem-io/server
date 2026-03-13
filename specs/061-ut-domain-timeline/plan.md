# Plan: Unit Tests for src/domain/timeline

## Approach
Create co-located `.spec.ts` files for all untested service and resolver files, following the established patterns in existing test files.

## Test Infrastructure
- **Framework**: Vitest 4.x with globals
- **Module setup**: NestJS `Test.createTestingModule`
- **Mocking**: `defaultMockerFactory` for auto-mocking, `repositoryProviderMockFactory` for TypeORM repos, `MockWinstonProvider` for logger, `MockCacheManager` for cache
- **Assertion style**: `vi.fn()`, `vi.spyOn()`, standard Vitest `expect`

## Implementation Order
1. Authorization services (pure logic, fewest dependencies)
   - timeline.service.authorization.spec.ts
   - calendar.service.authorization.spec.ts
   - event.service.authorization.spec.ts
2. Resolver field classes
   - timeline.resolver.fields.spec.ts
   - calendar.resolver.fields.spec.ts
   - event.resolver.fields.spec.ts
3. Resolver mutation classes
   - calendar.resolver.mutations.spec.ts
   - event.resolver.mutations.spec.ts (expand existing)

## Risk Mitigation
- Each test file is independently verifiable via `npx vitest run <file>`
- No production code changes required
- Follow existing test patterns exactly to avoid style inconsistencies
