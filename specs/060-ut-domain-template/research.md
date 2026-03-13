# Research: Unit Tests for src/domain/template

## Existing Test Patterns
All existing tests use:
- NestJS `Test.createTestingModule` with `useMocker(defaultMockerFactory)`
- `repositoryProviderMockFactory(Entity)` for TypeORM repositories
- `MockWinstonProvider` and `MockCacheManager` for infrastructure
- `Mocked<T>` from Vitest for typed mocks
- `vi.spyOn(Entity, 'create')` to avoid DataSource requirements

## Authorization Service Pattern
Authorization services follow a consistent pattern:
1. Load entity with relations
2. Validate required relations exist (throw `RelationshipNotFoundException` if missing)
3. Inherit parent authorization via `authorizationPolicyService.inheritParentAuthorization`
4. Cascade authorization to child entities based on template type (switch statement)
5. Return array of updated `IAuthorizationPolicy` objects

## Resolver Pattern
Resolvers follow two patterns:
- **Fields**: Simple delegation to service methods, sometimes with type checks
- **Mutations**: Authorization check -> validation -> service delegation -> authorization policy update

## Dependencies
- `@test/mocks/winston.provider.mock` - MockWinstonProvider
- `@test/mocks/cache-manager.mock` - MockCacheManager
- `@test/utils/default.mocker.factory` - defaultMockerFactory
- `@test/utils/repository.provider.mock.factory` - repositoryProviderMockFactory
