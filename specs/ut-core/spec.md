# Specification: Unit Tests for src/core

## Overview
Add comprehensive unit tests for the `src/core` area of Alkemio Server to achieve >= 80% test coverage. The core area contains framework-level infrastructure: authorization, authentication, validation, pagination, error handling, middleware, filtering, dataloader utilities, and microservice helpers.

## Scope

### In-Scope (testable files needing new or expanded tests)
- **authorization/**: `authorization.service.ts` (expand existing), `authorization.rule.actor.privilege.ts`, `graphql.guard.ts`, `rest.guard.ts`
- **authentication/**: `verify.identity.if.oidc.auth.ts`
- **actor-context/**: `actor.context.service.ts`, `actor.context.cache.service.ts`
- **error-handling/**: `graphql.exception.filter.ts`, `http.exception.filter.ts`, `unhandled.exception.filter.ts`
- **middleware/**: `favicon.middleware.ts`, `request.logger.middleware.ts`, `session.extend.middleware.ts`
- **pagination/**: `validate.pagination.args.ts`, `pagination.fn.ts`
- **validation/**: `subdomain.regex.ts`, `validateExcalidrawContent.ts`, `validateMachineDefinition.ts`, `abstract.handler.ts`, `base.handler.ts`
- **filtering/**: `filter.fn.ts`, `filter.fn.where.expression.ts`, `userFilter.ts`, `organizationFilter.ts`
- **dataloader/utils/**: `sort.output.by.keys.ts`
- **interceptors/**: `auth.interceptor.ts`

### Out-of-Scope
- Entity files, interfaces, modules, DTOs, inputs, enums, types, constants, index files
- Integration/E2E tests
- Dataloader creator files (already have tests)
- Bootstrap service (already has tests)
- Files requiring external connections (subscription.factory.ts, client.proxy.factory.ts)

## Success Criteria
- >= 80% statement coverage for `src/core`
- All tests pass via `pnpm vitest run src/core`
- No lint or TypeScript errors
- Tests co-located with source files as `*.spec.ts`
