# Unit Tests for src/services/infrastructure

## Objective
Achieve >=80% test coverage for the `src/services/infrastructure/` area by adding unit tests for files with low or zero coverage.

## Scope

### In Scope
- `naming/naming.service.ts` (currently 17.46% stmts) -- all repository-backed `getReservedNameIDs*` methods, `isDiscussionDisplayNameAvailableInForum`, `isInnovationHubSubdomainAvailable`
- `storage-aggregator-resolver/storage.aggregator.resolver.service.ts` (40.38%) -- `getPlatformStorageAggregator`, parent entity lookups, `getStorageAggregatorForCollaboration`, `getStorageAggregatorForCalendar`, `getStorageAggregatorForCommunity`, `getStorageAggregatorForCallout`
- `url-generator/url.generator.service.ts` (28.88%) -- `generateUrlForProfileNotCached` for all ProfileType branches, callout URL generation, calendar event URL, discussion URL, etc.
- `url-generator/url.generator.service.cache.ts` (0%) -- all 4 methods
- `event-bus/handlers/invoke.engine.result.handler.ts` (0%) -- `handle` method
- `event-bus/handlers/ingest.body.of.knowledge.result.handler.ts` (0%) -- `handle` method with all branches
- `event-bus/handlers/ingest.website.result.handler.ts` (0%) -- `handle` method with all branches
- `event-bus/publisher.ts` (0%) -- `connect` and `publish` methods
- `event-bus/subscriber.ts` (0%) -- `connect` and `bridgeEventsTo` methods

### Out of Scope
- Entity files (*.entity.ts), interfaces, modules, DTOs, enums, types, constants, index files
- Integration and E2E tests
- Files already at >=80% coverage (space-filter, temporary-storage, license-entitlement-usage, entity-resolver services, generate.name.id)

## Constraints
- Tests must use Vitest 4.x globals
- NestJS Test module for DI setup
- MockWinstonProvider, MockCacheManager, defaultMockerFactory, repositoryProviderMockFactory from test utilities
- Tests co-located with source files as `*.spec.ts`
