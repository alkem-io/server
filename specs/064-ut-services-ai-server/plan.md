# Plan: Unit Tests for src/services/ai-server

## Approach

Use the existing test patterns from `ai.persona.service.spec.ts` and `ai.server.service.spec.ts` as templates. Each new test file will:

1. Use NestJS `Test.createTestingModule` for DI wiring
2. Use `MockWinstonProvider` for logger
3. Use `repositoryProviderMockFactory` for TypeORM repositories
4. Use `defaultMockerFactory` for remaining dependencies
5. Be co-located next to the source file (`.spec.ts` suffix)

## Files to Create

1. `ai-persona-engine-adapter/ai.persona.engine.adapter.spec.ts`
2. `ai-persona/ai.persona.service.authorization.spec.ts`
3. `ai-server/ai.server.service.authorization.spec.ts`
4. `ai-persona/ai.persona.resolver.fields.spec.ts`
5. `ai-persona/ai.persona.resolver.mutations.spec.ts`
6. `ai-persona/ai.persona.external.config.resolver.fields.spec.ts`
7. `ai-server/ai.server.resolver.fields.spec.ts`
8. `ai-server/ai.server.resolver.queries.spec.ts`
9. `ai-persona/transformers/prompt.graph.transformer.spec.ts`

## Test Strategy

- **Adapter**: Verify event bus publish is called with correct InvokeEngine event
- **Authorization services**: Test policy reset, credential rule append, error paths
- **Resolvers**: Mock service dependencies, verify auth checks, verify delegation
- **Transformer**: Pure function tests for to/from
