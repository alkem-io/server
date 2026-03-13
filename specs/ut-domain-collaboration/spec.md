# Specification: Unit Tests for `src/domain/collaboration`

## Objective

Achieve >=80% unit test coverage for the `src/domain/collaboration` area by adding spec files for all untested service and authorization service files.

## Scope

### In-Scope (testable files needing new/expanded tests)

| File | Status | Priority |
|------|--------|----------|
| `collaboration.service.license.ts` | No tests | High |
| `collaboration.service.authorization.ts` | No tests | High |
| `callout.service.authorization.ts` | No tests | High |
| `callout-contribution/callout.contribution.service.authorization.ts` | No tests | High |
| `callout-framing/callout.framing.service.authorization.ts` | No tests | Medium |
| `callouts-set/callouts.set.service.authorization.ts` | No tests | Medium |
| `innovation-flow/innovation.flow.service.authorization.ts` | No tests | Medium |
| `innovation-flow-state/innovation.flow.state.service.authorization.ts` | No tests | Medium |
| `link/link.service.authorization.ts` | No tests | Medium |
| `post/post.service.authorization.ts` | No tests | Medium |
| `innovation-flow-state/utils/sortBySortOrder.ts` | No tests | Low |
| `callout-settings/callout.settings.default.ts` | No tests | Low |

### Out-of-Scope

- `*.entity.ts`, `*.interface.ts`, `*.module.ts`, `*.dto.ts`, `*.input.ts`
- `*.enum.ts`, `*.type.ts`, `*.types.ts`, `*.constants.ts`, `index.ts`
- Resolver files (already tested or thin delegation layers)
- Files that already have comprehensive test coverage

## Approach

- Co-locate `.spec.ts` files alongside source files
- Use existing test conventions: Vitest globals, NestJS Test module, `MockWinstonProvider`, `MockCacheManager`, `defaultMockerFactory`, `repositoryProviderMockFactory`
- Focus on business logic branches, error paths, and edge cases
