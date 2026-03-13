# Implementation Plan: Unit Tests for src/domain/actor

**Created**: 2026-03-12
**Status**: Complete

## Approach

Use NestJS `Test.createTestingModule` with mocked repositories and services. Each service gets a co-located `.spec.ts` file. Mock external dependencies (TypeORM repositories, cache manager, EntityManager, logger) while testing actual business logic.

## Files to Create

| Test File | Source File | Priority |
|-----------|------------|----------|
| `actor.service.spec.ts` | `actor.service.ts` | P0 - Most business logic |
| `actor.lookup.service.spec.ts` | `actor.lookup.service.ts` | P0 - Complex lookup + caching |
| `actor.lookup.service.cache.spec.ts` | `actor.lookup.service.cache.ts` | P1 - Cache layer |
| `credential.service.spec.ts` | `credential.service.ts` | P0 - CRUD operations |
| `actor.service.authorization.spec.ts` | `actor.service.authorization.ts` | P1 - Simple delegation |
| `credential.resolver.fields.spec.ts` | `credential.resolver.fields.ts` | P2 - Simple resolver |
| `actor.resolver.fields.spec.ts` | `actor.resolver.fields.ts` | P2 - Dataloader delegation |
| `actor.full.resolver.fields.spec.ts` | `actor.full.resolver.fields.ts` | P2 - Dataloader delegation |
| `actor.resolver.mutations.spec.ts` | `actor.resolver.mutations.ts` | P1 - Auth + delegation |
| `actor.resolver.queries.spec.ts` | `actor.resolver.queries.ts` | P1 - Auth + delegation |

## Files NOT Tested (excluded by convention)

- `*.entity.ts` - Declarative TypeORM decorators
- `*.interface.ts` - Type declarations
- `*.module.ts` - NestJS module wiring
- `*.dto.*.ts` / `*.input.ts` - Declarative GraphQL/class-validator decorators
- `index.ts` - Re-exports
- `actor.defaults.ts` - Static data object (trivial)
- `credential.definition.ts` - Simple class implementing interface

## Mocking Strategy

- **Repository**: Use `repositoryProviderMockFactory` for `@InjectRepository` tokens
- **Cache**: Use `MockCacheManager` for `CACHE_MANAGER` token
- **Logger**: Use `MockWinstonProvider` for `WINSTON_MODULE_NEST_PROVIDER`
- **EntityManager**: Manual mock with vi.fn() for `findOne`, `find`, `count`
- **ConfigService**: Mock `get()` to return test TTL values
- **Service dependencies**: Use `defaultMockerFactory` or manual mocks

## Execution Order

1. Create all test files
2. Run tests: `pnpm vitest run src/domain/actor`
3. Run coverage: `pnpm vitest run --coverage src/domain/actor`
4. Fix any failures
5. Verify lint and typecheck pass
