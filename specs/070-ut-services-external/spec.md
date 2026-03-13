# Specification: Unit Tests for src/services/external

## Objective
Achieve >=80% test coverage for `src/services/external/` by adding unit tests for untested services, utilities, and helpers.

## Scope

### In Scope
- `elasticsearch/elasticsearch-client/elasticsearch.client.factory.ts` - Factory function creating Elasticsearch client
- `elasticsearch/utils/handle.elastic.error.ts` - Error handler producing `HandledElasticError`
- `elasticsearch/utils/is.elastic.error.ts` - Type guard for `ErrorResponseBase`
- `elasticsearch/utils/is.elastic.response.error.ts` - Type guard for `ElasticResponseError`
- `geo-location/utils/is.limit.exceeded.ts` - Rate-limit check utility
- `wingback/wingback.manager.ts` - HTTP client for Wingback billing API
- `wingback/exceptions/wingback.exception.ts` - `isWingbackException` type guard

### Out of Scope (already tested)
- `avatar-creator/avatar.creator.service.ts`
- `elasticsearch/contribution-reporter/contribution.reporter.service.ts`
- `geo-location/geo.location.service.ts`
- `geoapify/geoapify.service.ts`
- `wingback-webhooks/` (controller, interceptor, pipe, service)

### Excluded by Convention
- `*.entity.ts`, `*.interface.ts`, `*.module.ts`, `*.dto.ts`, `*.input.ts`, `*.enum.ts`, `*.type.ts`, `*.types.ts`, `*.constants.ts`, `index.ts`

## Success Criteria
- >=80% statement/branch/function coverage for `src/services/external/`
- All tests pass via `pnpm vitest run src/services/external`
- No lint or type-check errors
