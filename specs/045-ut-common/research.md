# Research: Unit Tests for src/common

## Current State
- 27 existing test files (25 utils + 2 exceptions)
- 230 passing tests
- Coverage not yet measured for `src/common` as a whole

## Files Needing Tests

### app.id.provider.ts
Simple ValueProvider that generates a UUID. Low complexity, straightforward to test.

### Decorators (4 files)
- `authorizationActorHasPrivilege.ts`: Wraps `SetMetadata` - verify metadata key/value
- `current-actor.decorator.ts`: Uses `createParamDecorator` - handles graphql and http contexts
- `headers.decorator.ts`: Uses `createParamDecorator` - extracts headers from GQL context
- `innovation.hub.decoration.ts`: Uses `createParamDecorator` - extracts innovation hub from context

**Testing approach**: NestJS `createParamDecorator` returns a factory. We need to test the inner factory function logic by mocking `ExecutionContext` and `GqlExecutionContext`.

### profiling.decorator.ts
Deprecated but still in codebase. Uses Proxy to wrap methods and measure execution time. Has sync, async, and function code paths.

### typed.subscription.decorator.ts
Thin wrapper delegating to `@nestjs/graphql Subscription`. Minimal logic.

### innovation.hub.interceptor.ts
Most complex file. NestInterceptor that:
1. Skips non-graphql contexts
2. Extracts host header from request
3. Parses subdomain from URL
4. Checks whitelist
5. Fetches innovation hub by subdomain
6. Handles errors gracefully

### validation.pipe.ts
Custom PipeTransform that:
1. Skips primitive types
2. Converts plain objects to class instances via `plainToInstance`
3. Delegates validation to BaseHandler

## Dependencies to Mock
- `@nestjs/common`: ExecutionContext, createParamDecorator, SetMetadata
- `@nestjs/graphql`: GqlExecutionContext
- `InnovationHubService`: for interceptor test
- `ConfigService`: for interceptor test
- `BaseHandler`: for validation pipe test
- `class-transformer`: plainToInstance
