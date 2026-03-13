# Tasks

## Task 1: url.generator.service.cache.spec.ts
- [x] Create test file with NestJS TestingModule
- [x] Test getUrlIdCacheKey returns correct key format
- [x] Test setUrlCache calls cacheManager.set
- [x] Test revokeUrlCache calls cacheManager.del
- [x] Test getUrlFromCache returns cached URL when present
- [x] Test getUrlFromCache returns undefined when cache miss

## Task 2: invoke.engine.result.handler.spec.ts
- [x] Create test file
- [x] Test handle delegates to aiServerService.handleInvokeEngineResult

## Task 3: ingest.body.of.knowledge.result.handler.spec.ts
- [x] Create test file
- [x] Test early return when personaId is missing
- [x] Test early return when timestamp is missing
- [x] Test early return when purpose is CONTEXT
- [x] Test success path calls updatePersonaBoKLastUpdated with Date
- [x] Test failure with VECTOR_INSERT error calls updatePersonaBoKLastUpdated with null

## Task 4: ingest.website.result.handler.spec.ts
- [x] Create test file
- [x] Test failure result returns early
- [x] Test success with missing personaId returns early
- [x] Test success with timestamp calls updatePersonaBoKLastUpdated
- [x] Test success without timestamp uses current Date

## Task 5: publisher.spec.ts
- [x] Create test file
- [x] Test connect is a no-op
- [x] Test publish sends correct routing key and payload
- [x] Test publish uses engine name for InvokeEngine events

## Task 6: subscriber.spec.ts
- [x] Create test file
- [x] Test connect creates subscriptions for each event
- [x] Test bridgeEventsTo sets the bridge subject

## Task 7: Extend naming.service.spec.ts
- [x] Test getReservedNameIDsInLevelZeroSpace
- [x] Test getReservedNameIDsLevelZeroSpaces
- [x] Test getReservedNameIDsInForum
- [x] Test getReservedNameIDsInCalloutsSet
- [x] Test getReservedNameIDsInTemplatesSet
- [x] Test getReservedNameIDsInCalendar
- [x] Test getReservedNameIDsInInnovationPacks
- [x] Test getReservedNameIDsInHubs
- [x] Test getReservedNameIDsInUsers
- [x] Test getReservedNameIDsInVirtualContributors
- [x] Test getReservedNameIDsInOrganizations
- [x] Test getReservedNameIDsInCalloutContributions
- [x] Test isDiscussionDisplayNameAvailableInForum
- [x] Test isInnovationHubSubdomainAvailable

## Task 8: Extend storage.aggregator.resolver.service.spec.ts
- [x] Test getParentOrganizationForStorageAggregator (found, not found)
- [x] Test getParentUserForStorageAggregator (found, not found)
- [x] Test getPlatformStorageAggregator
- [x] Test getStorageAggregatorForCollaboration (space found, template found, not found)
- [x] Test getStorageAggregatorForCalendar
- [x] Test getStorageAggregatorForCommunity (found, not found)
- [x] Test getStorageAggregatorForCallout (various paths)
- [x] Test getStorageAggregatorForForum

## Task 9: Extend url.generator.service.spec.ts
- [x] Add tests for generateUrlForProfile with various ProfileTypes
- [x] Add tests for callout URL generation paths
- [x] Add tests for calendar event URL
- [x] Add tests for discussion URL
- [x] Add tests for template URL generation

## Task 10: Verify coverage >= 80%
- [x] Run vitest with coverage
- [x] Verify all new tests pass
- [x] Run lint and type checks
