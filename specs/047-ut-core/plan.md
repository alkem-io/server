# Plan: Unit Tests for src/core

## Approach
Write focused unit tests for each testable file, using NestJS Test module where DI is needed, and plain function calls for pure utility functions. Mock all external dependencies.

## Phases

### Phase 1: Pure Functions (no DI needed)
1. `validation/subdomain.regex.ts` - regex pattern tests
2. `validation/excalidraw/validateExcalidrawContent.ts` - JSON schema validation
3. `validation/xstate/validateMachineDefinition.ts` - machine definition validation
4. `validation/handlers/base/abstract.handler.ts` - chain of responsibility base
5. `pagination/validate.pagination.args.ts` - pagination argument validation
6. `middleware/favicon.middleware.ts` - favicon short-circuit
7. `authentication/verify.identity.if.oidc.auth.ts` - OIDC identity verification
8. `dataloader/utils/sort.output.by.keys.ts` - sorting utility
9. `authorization/authorization.rule.actor.privilege.ts` - privilege rule execution

### Phase 2: Injectable Services (NestJS Test module)
1. `authorization/authorization.service.ts` - expand existing tests
2. `actor-context/actor.context.service.ts` - anonymous/guest/user context creation
3. `actor-context/actor.context.cache.service.ts` - cache get/set/delete/update
4. `middleware/request.logger.middleware.ts` - request/response logging
5. `middleware/session.extend.middleware.ts` - session extension logic

### Phase 3: Guards, Interceptors, Filters
1. `authorization/rest.guard.ts` - REST auth guard
2. `error-handling/graphql.exception.filter.ts` - GraphQL error filter
3. `error-handling/http.exception.filter.ts` - HTTP error filter
4. `error-handling/unhandled.exception.filter.ts` - catch-all error filter

## Testing Patterns
- Vitest 4.x with globals
- NestJS `Test.createTestingModule` for injectable services
- `MockWinstonProvider` and `MockCacheManager` from `@test/mocks`
- `defaultMockerFactory` for auto-mocking
- `vi.fn()` and `vi.spyOn()` for mocks
- Co-located `.spec.ts` files alongside source
