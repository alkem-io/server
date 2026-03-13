# Research: Unit Tests for src/domain/space

## Current State
- 13 existing test files, 180 passing tests
- Overall coverage: 32.34% statements, 37.14% branches
- Best covered: space.settings (100%), space.lookup (88%), space.defaults (81%)
- Worst covered: space.service.ts (26%), authorization/license services (0%)

## Test Infrastructure
- **Vitest 4.x** with globals enabled
- **NestJS Test.createTestingModule** for DI
- **@golevelup/ts-vitest** `createMock` for auto-mocking class tokens
- `defaultMockerFactory` handles string/symbol tokens + repository tokens
- `repositoryProviderMockFactory` for TypeORM repository mocking
- `MockWinstonProvider` for logger
- `MockCacheManager` for cache

## Key Patterns from Existing Tests
- Services instantiated via NestJS TestingModule
- Repository methods spied on with `vi.spyOn(repo, 'method').mockResolvedValue(...)`
- Private methods accessed via `service['methodName']` bracket notation
- Mock objects created with `as unknown as Type` casting
- `vi.fn()` for inline mock functions

## File Dependencies
- SpaceService depends on ~20 services + repository
- SpaceAuthorizationService depends on ~11 services
- SpaceLicenseService depends on 5 services
- SpacePlatformRolesAccessService depends on PlatformRolesAccessService only
- SpaceAboutAuthorizationService depends on 4 services
