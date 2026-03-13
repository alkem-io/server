# Unit Tests for src/services/ai-server

## Objective

Achieve >=80% statement/branch/function coverage for the `src/services/ai-server/` area by adding Vitest unit tests for all service, resolver, adapter, authorization, and transformer files that contain testable logic.

## Scope

### In-Scope (files with testable logic)

| File | Current Coverage | Notes |
|------|-----------------|-------|
| `ai-persona/ai.persona.service.ts` | High (existing tests) | Already well-tested |
| `ai-server/ai.server.service.ts` | High (existing tests) | Already well-tested |
| `ai-persona-engine-adapter/ai.persona.engine.adapter.ts` | 0% | Publishes event via EventBus |
| `ai-persona/ai.persona.service.authorization.ts` | 0% | Authorization policy logic |
| `ai-server/ai.server.service.authorization.ts` | 0% | Authorization policy logic |
| `ai-persona/ai.persona.resolver.fields.ts` | 0% | Resolver with promptGraph/auth/externalConfig logic |
| `ai-persona/ai.persona.resolver.mutations.ts` | 0% | Mutation resolver with auth checks |
| `ai-persona/ai.persona.external.config.resolver.fields.ts` | 0% | Delegates to service |
| `ai-server/ai.server.resolver.fields.ts` | 0% | Delegates to service |
| `ai-server/ai.server.resolver.queries.ts` | 0% | Delegates to service |
| `ai-persona/transformers/prompt.graph.transformer.ts` | 0% | to/from transformation |

### Out-of-Scope (excluded by vitest.config.ts)

- `*.entity.ts`, `*.interface.ts`, `*.module.ts`, `*.dto.ts`, `*.input.ts`
- `*.enum.ts`, `*.type.ts`, `*.types.ts`, `*.constants.ts`, `index.ts`

## Success Criteria

- All new test files pass (`npx vitest run src/services/ai-server`)
- `pnpm lint` passes
- `pnpm exec tsc --noEmit` passes
- >=80% statement coverage for the ai-server area
