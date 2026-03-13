# Research: Unit Tests for src/services/external

## Existing Test Patterns

### Test Infrastructure
- **Framework**: Vitest 4.x with global imports (describe, it, expect, vi)
- **DI**: `@nestjs/testing` `Test.createTestingModule` for NestJS services
- **Mocks**: `@test/mocks/winston.provider.mock`, `@test/mocks/config.service.mock`, `@test/utils/default.mocker.factory`
- **Assertions**: Standard Vitest matchers; `asyncToThrow` helper at `@test/utils`

### Coverage of Existing Tests (8 spec files)
| File | Coverage Quality |
|------|-----------------|
| `avatar.creator.service.spec.ts` | Good - tests URL generation, file type detection |
| `contribution.reporter.service.spec.ts` | Good - tests document indexing with various actor contexts |
| `geo.location.service.spec.ts` | Good - tests caching, rate limiting, error handling |
| `geoapify.service.spec.ts` | Good - tests geocoding, ISO code resolution, error paths |
| `wingback.webhook.controller.spec.ts` | Adequate - tests contract webhook routing |
| `wingback.webhook.interceptor.spec.ts` | Good - tests secret header validation |
| `wingback.webhook.service.spec.ts` | Minimal - only "should be defined" |
| `get.contract.validation.pipe.spec.ts` | Good - tests validation pass/fail |

### Untested Code Analysis
| File | Complexity | Test Strategy |
|------|-----------|---------------|
| `is.elastic.error.ts` | Low | Direct function calls with various inputs |
| `is.elastic.response.error.ts` | Low | Direct function calls with various inputs |
| `handle.elastic.error.ts` | Medium | Mock `randomUUID`, test all 4 branches |
| `is.limit.exceeded.ts` | Low | Direct function calls |
| `elasticsearch.client.factory.ts` | Medium | Mock fs, ConfigService, test all branches |
| `wingback.exception.ts` | Low | Test `isWingbackException` type guard |
| `wingback.manager.ts` | High | Mock HttpService, test enabled/disabled, success/error paths |

## Dependencies
- `@elastic/elasticsearch` types for `ErrorResponseBase`
- `@nestjs/axios` `HttpService` for WingbackManager
- `rxjs` operators for WingbackManager request pipeline
- `fs` module for elasticsearch client factory
