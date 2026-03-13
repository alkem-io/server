# Research: Unit Tests for src/core

## Current State
- 9 existing test files in `src/core/`
- Tests exist for: bootstrap.service, authorization.service (basic), authentication.service, rabbitmq.resilience.service, and 5 dataloader creators
- Existing tests use Vitest 4.x globals, NestJS Test module, MockWinstonProvider, MockCacheManager, defaultMockerFactory

## File Analysis

### High-Value Targets (complex logic, high impact)
| File | Lines | Complexity | Priority |
|------|-------|------------|----------|
| authorization.service.ts | 216 | High (credential matching, privilege rules) | P0 |
| validate.pagination.args.ts | 47 | Medium (validation rules) | P0 |
| actor.context.service.ts | 130 | Medium (context creation) | P0 |
| actor.context.cache.service.ts | 83 | Medium (cache operations) | P0 |
| authorization.rule.actor.privilege.ts | 61 | Medium (privilege execution) | P1 |
| rest.guard.ts | 47 | Low (error passthrough) | P1 |
| verify.identity.if.oidc.auth.ts | 21 | Low (OIDC check) | P1 |
| subdomain.regex.ts | 4 | Low (regex patterns) | P1 |

### Error Handling Filters
| File | Lines | Notes |
|------|-------|-------|
| graphql.exception.filter.ts | 43 | Production vs dev mode |
| http.exception.filter.ts | 72 | HTTP context filtering |
| unhandled.exception.filter.ts | 77 | Catch-all with context detection |

### Middleware
| File | Lines | Notes |
|------|-------|-------|
| favicon.middleware.ts | 14 | Simple route check |
| request.logger.middleware.ts | 79 | Config-driven logging |
| session.extend.middleware.ts | 113 | Session extension with Kratos |

### Pure Utility Functions
| File | Lines | Notes |
|------|-------|-------|
| sort.output.by.keys.ts | 16 | Simple sorting |
| validateExcalidrawContent.ts | 27 | AJV schema validation |
| validateMachineDefinition.ts | 27 | AJV schema validation |
| abstract.handler.ts | 23 | Chain of responsibility |

## Dependencies
- `@golevelup/ts-vitest` for createMock
- `@nestjs/testing` for Test.createTestingModule
- `@test/mocks/winston.provider.mock` for logger
- `@test/mocks/cache-manager.mock` for cache
- `@test/utils/default.mocker.factory` for auto-mocking
