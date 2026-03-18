# Unit Tests for src/services/api - Plan

## Approach
Incremental test creation, co-located with source files, following existing patterns.

## Phase 1: Pure Utility Functions (highest ROI)
- `search/util/validate.search.parameters.ts` - validation logic with multiple error paths
- `search/util/calculate.search.cursor.ts` - cursor calculation
- `search/util/try.parse.search.cursor.ts` - cursor parsing with error handling
- `search/extract/build.search.query.ts` - Elasticsearch query building
- `search/extract/build.multi.search.request.items.ts` - multi-search request builder
- `search/ingest/get.index.pattern.ts` - config-based index pattern
- `url-resolver/url.resolver.utils.ts` - URL path parsing utilities
- `roles/util/group.credentials.by.entity.ts` - credential grouping logic

## Phase 2: Resolver Classes (medium ROI - delegation tests)
- `conversion/conversion.resolver.mutations.ts`
- `activity-log/activity.log.resolver.queries.ts`
- `search/search.resolver.queries.ts`
- `me/me.resolver.queries.ts`
- `me/me.resolver.fields.ts`
- `me/me.conversations.resolver.fields.ts`
- `notification-recipients/notification.recipients.resolver.queries.ts`
- `notification-recipients/notification.recipients.resolver.fields.ts`
- `registration/registration.resolver.mutations.ts`
- `roles/roles.resolver.fields.ts`
- `lookup/lookup.resolver.queries.ts`
- `lookup/lookup.resolver.fields.ts`
- `lookup-by-name/lookup.by.name.resolver.queries.ts`
- `lookup-by-name/lookup.by.name.resolver.fields.ts`
- `input-creator/input.creator.resolver.queries.ts`
- `input-creator/input.creator.resolver.fields.ts`

## Phase 3: Verify
Run vitest with coverage, lint, and type-check.

## Testing Conventions
- Vitest 4.x with globals
- NestJS Test.createTestingModule
- MockWinstonProvider for logger
- MockCacheManager for cache
- defaultMockerFactory for auto-mocking
- Co-located `.spec.ts` files
