# Spec: Unit Tests for src/domain/space

## Objective
Achieve >=80% test coverage for `src/domain/space` by adding unit tests for services, helpers, and authorization services that currently lack coverage.

## Scope
### In Scope
- `space.service.ts` (currently 26% covered -- target highest-impact methods)
- `space.service.authorization.ts` (0% covered)
- `space.service.license.ts` (0% covered)
- `space.service.platform.roles.access.ts` (0% covered)
- `space.about.service.authorization.ts` (0% covered)

### Out of Scope
- Entity files (*.entity.ts)
- Interface files (*.interface.ts)
- Module files (*.module.ts)
- DTO / Input / Enum / Type / Constants files
- Resolver files (low risk, thin wrappers)
- Files already at >=80% coverage (space.settings, space.lookup, space.defaults)

## Approach
- Co-locate .spec.ts files alongside source files
- Use NestJS Test module with `defaultMockerFactory`, `MockWinstonProvider`, `MockCacheManager`, `repositoryProviderMockFactory`
- Focus on business logic branches, error paths, and edge cases
- Follow existing test patterns established in the codebase

## Success Criteria
- >=80% statement coverage for `src/domain/space`
- All tests pass (`npx vitest run src/domain/space`)
- No lint errors (`pnpm lint`)
- No type errors (`pnpm exec tsc --noEmit`)
