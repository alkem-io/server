# Plan: Unit Tests for src/domain/community

## Approach

Use the existing test patterns established in the codebase:
- Vitest 4.x with globals
- NestJS Test module for DI
- `defaultMockerFactory` from `@test/utils` for auto-mocking class-based dependencies
- `repositoryProviderMockFactory` for TypeORM repository injection
- `MockWinstonProvider` and `MockCacheManager` for common infrastructure

## Test Strategy

### Resolver Tests
For resolvers (fields, mutations, queries, subscriptions):
1. Verify the resolver class can be instantiated via NestJS Test module
2. Test that each method calls the expected service methods
3. Test authorization checks where applicable
4. Test error paths (e.g., entity not found)

### Service Tests (user-identity)
1. Test `buildKratosDataFromIdentity` with various identity shapes
2. Test `resolveOrCreateUser` for all 3 outcomes: existing, linked, created
3. Test `resolveByAuthenticationId` for found/not-found/null identity
4. Test validation: missing email, unverified email
5. Test organization assignment by domain

## Phases

1. **Phase 1**: Create "should be defined" skeleton tests for all 17 files to ensure module compilation
2. **Phase 2**: Add substantive tests for `user-identity.service` (highest value - complex business logic)
3. **Phase 3**: Add substantive tests for resolver mutations (authorization + service delegation)
4. **Phase 4**: Add substantive tests for resolver fields and queries
5. **Phase 5**: Verify coverage meets >=80% threshold

## Risk Mitigation
- Use `defaultMockerFactory` to avoid brittle manual mocking
- Focus test effort on files with business logic (services) over pass-through resolvers
- Use `createMock` from `@golevelup/ts-vitest` for complex interfaces
