# Specification: Unit Tests for `src/domain/innovation-hub`

## Objective

Achieve >= 80% test coverage for the `src/domain/innovation-hub` area by adding unit tests for untested service and resolver files.

## Scope

### Files Requiring Tests

| File | Current Coverage | Target |
|------|-----------------|--------|
| `innovation.hub.service.ts` | High (existing spec) | Maintain |
| `innovation.hub.service.authorization.ts` | 0% | >= 80% |
| `innovation.hub.resolver.fields.ts` | 0% | >= 80% |
| `innovation.hub.resolver.mutations.ts` | 0% | >= 80% |

### Files Excluded (no logic to test)

- `innovation.hub.entity.ts` - TypeORM entity definition
- `innovation.hub.interface.ts` - GraphQL ObjectType definition
- `innovation.hub.module.ts` - NestJS module wiring
- `innovation.hub.type.enum.ts` - Enum declaration
- `types.ts` - Re-exports
- `dto/*.ts` - DTO/Input class definitions

## Test Strategy

- Co-locate `.spec.ts` files alongside source files
- Use Vitest 4.x globals, NestJS Test module
- Use `MockWinstonProvider`, `MockCacheManager`, `defaultMockerFactory`, `repositoryProviderMockFactory`
- Follow AAA pattern (Arrange/Act/Assert)
- Test both happy paths and error/edge cases
