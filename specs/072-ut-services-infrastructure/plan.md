# Implementation Plan

## Phase 1: Zero-coverage files (event-bus handlers, publisher, subscriber, cache service)
1. Create `url.generator.service.cache.spec.ts` -- test all 4 public methods
2. Create `invoke.engine.result.handler.spec.ts` -- test delegation to aiServerService
3. Create `ingest.body.of.knowledge.result.handler.spec.ts` -- test all branches (early return, success, error with VECTOR_INSERT)
4. Create `ingest.website.result.handler.spec.ts` -- test all branches (failure, success with/without timestamp, missing personaId)
5. Create `publisher.spec.ts` -- test connect (no-op) and publish with routing key logic
6. Create `subscriber.spec.ts` -- test connect (subscription setup) and bridgeEventsTo

## Phase 2: Low-coverage service files
7. Extend `naming.service.spec.ts` -- add tests for all `getReservedNameIDs*` methods, `isDiscussionDisplayNameAvailableInForum`, `isInnovationHubSubdomainAvailable`
8. Extend `storage.aggregator.resolver.service.spec.ts` -- add tests for `getStorageAggregatorForCollaboration`, `getStorageAggregatorForCalendar`, `getStorageAggregatorForCommunity`, `getStorageAggregatorForCallout`, `getParentOrganizationForStorageAggregator`, `getParentUserForStorageAggregator`, `getStorageAggregatorForForum`
9. Extend `url.generator.service.spec.ts` -- add tests for more `generateUrlForProfile` branches, callout URLs, calendar event URLs, discussion URLs, template URLs

## Approach
- Each test file follows the existing pattern: NestJS TestingModule, mock providers, vi.fn() mocks
- Focus on branch coverage to ensure all conditional paths are tested
- Mock EntityManager.findOne/find/connection.query for database calls
