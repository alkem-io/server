# Specification: Unit Tests for src/common

## Objective
Achieve >=80% test coverage for `src/common` by adding unit tests for untested services, decorators, interceptors, pipes, and utility files.

## Scope

### In-Scope (needs new tests)
- `src/common/app.id.provider.ts` - UUID-based app ID provider
- `src/common/decorators/authorizationActorHasPrivilege.ts` - SetMetadata decorator
- `src/common/decorators/current-actor.decorator.ts` - Parameter decorator for actor context
- `src/common/decorators/headers.decorator.ts` - Parameter decorator for request headers
- `src/common/decorators/innovation.hub.decoration.ts` - Parameter decorator for innovation hub
- `src/common/decorators/profiling.decorator.ts` - Method profiling decorator (deprecated)
- `src/common/decorators/typed.subscription/typed.subscription.decorator.ts` - Typed subscription wrapper
- `src/common/interceptors/innovation.hub.interceptor.ts` - NestInterceptor for innovation hub injection
- `src/common/pipes/validation.pipe.ts` - Custom validation pipe

### Out-of-Scope (excluded from coverage)
- `src/common/exceptions/**` - Already excluded in vitest config
- `src/common/constants/**` - Already excluded in vitest config
- `src/common/enums/**` - Already excluded in vitest config
- `*.entity.ts`, `*.interface.ts`, `*.module.ts`, `*.dto.ts`, `*.input.ts`, `*.enum.ts`, `*.type.ts`, `*.types.ts`, `*.constants.ts`, `index.ts` - Declarative files excluded from coverage
- `src/common/decorators/typed.subscription/subscription.resolve.context.ts` - Interface only
- `src/common/decorators/typed.subscription/typed.subscription.options.ts` - Type only

### Already Tested (25 util spec files)
All files under `src/common/utils/` already have comprehensive tests.

## Approach
- Co-locate `.spec.ts` files alongside source files
- Use Vitest 4.x with globals enabled
- Mock NestJS decorators, GqlExecutionContext, and external dependencies
- Test actual business logic, not framework internals
