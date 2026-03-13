# Specification: Unit Tests for src/library

## Objective
Achieve >=80% test coverage for the `src/library/` area by adding unit tests for untested and under-tested service, resolver, and authorization files.

## Scope

### Files Requiring New/Expanded Tests
| File | Current State | Action |
|------|--------------|--------|
| `innovation.pack.service.ts` | 1 skeleton test ("should be defined") | Expand with tests for all public methods |
| `innovation.pack.service.authorization.ts` | No tests | Create new spec file |
| `innovation.pack.resolver.fields.ts` | No tests | Create new spec file |
| `innovation.pack.resolver.mutations.ts` | No tests | Create new spec file |
| `library.service.authorization.ts` | No tests | Create new spec file |
| `library.resolver.fields.ts` | No tests | Create new spec file |

### Files Already Well-Tested (No Changes)
- `innovation.pack.defaults.service.ts` - 4 tests covering all logic
- `library.service.ts` - 20 tests covering all methods
- `markdown.to.plaintext.ts` - 31 tests covering all scenarios

### Excluded Files (Declarative/No Logic)
- `*.entity.ts`, `*.interface.ts`, `*.module.ts`, `*.dto.*`, `index.ts`

## Test Strategy
- Use NestJS Test module with `defaultMockerFactory` for DI
- Mock repositories with `repositoryProviderMockFactory`
- Use `MockWinstonProvider` and `MockCacheManager` for infrastructure
- Test happy paths + error paths (exception throwing)
- Verify correct delegation to dependencies
- Verify authorization checks in resolvers

## Success Criteria
- All tests pass (`npx vitest run src/library`)
- Lint passes (`pnpm lint`)
- TypeScript compiles (`pnpm exec tsc --noEmit`)
- Coverage >= 80% for `src/library/` area
