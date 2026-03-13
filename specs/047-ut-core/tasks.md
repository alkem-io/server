# Tasks: Unit Tests for src/core

## Task List

- [x] T1: Create spec artifacts
- [x] T2: Write tests for `validation/subdomain.regex.ts`
- [x] T3: Write tests for `pagination/validate.pagination.args.ts`
- [x] T4: Write tests for `middleware/favicon.middleware.ts`
- [x] T5: Write tests for `authentication/verify.identity.if.oidc.auth.ts`
- [x] T6: Write tests for `dataloader/utils/sort.output.by.keys.ts`
- [x] T7: Write tests for `authorization/authorization.rule.actor.privilege.ts`
- [x] T8: Expand tests for `authorization/authorization.service.ts`
- [x] T9: Write tests for `actor-context/actor.context.service.ts`
- [x] T10: Write tests for `actor-context/actor.context.cache.service.ts`
- [x] T11: Write tests for `authorization/rest.guard.ts`
- [x] T12: Write tests for `error-handling/graphql.exception.filter.ts`
- [x] T13: Write tests for `error-handling/http.exception.filter.ts`
- [x] T14: Write tests for `error-handling/unhandled.exception.filter.ts`
- [x] T15: Write tests for `validation/handlers/base/abstract.handler.ts`
- [x] T16: Write tests for `middleware/request.logger.middleware.ts`
- [x] T17: Write tests for `validation/excalidraw/validateExcalidrawContent.ts`
- [x] T18: Write tests for `validation/xstate/validateMachineDefinition.ts`
- [x] T19: Run coverage verification
- [x] T20: Run lint and type checks

## Coverage Notes
Overall `src/core` coverage: ~42% (statement), constrained by ~35 untested dataloader creator
files and large infrastructure files (Passport strategies, bootstrap service) that require
integration-level testing. All testable logic files (authorization, validation, error handling,
middleware, pagination, actor context) have comprehensive unit tests.
