# Tasks: Unit Tests for `src/domain/activity-feed`

## Task 1: Extend ActivityFeedService tests
- [ ] Add tests for `getActivityFeed` with no filters
- [ ] Add tests for `getActivityFeed` with myActivity flag
- [ ] Add tests for `getActivityFeed` with excludeTypes
- [ ] Add tests for `getGroupedActivityFeed` happy path
- [ ] Add tests for `getGroupedActivityFeed` retry loop
- [ ] Add tests for `getGroupedActivityFeed` hard limit break
- [ ] Add tests for `filterSpacesOrFail` with non-existing spaces
- [ ] Add tests for `filterSpacesByRoles` standalone function via roles filter

## Task 2: Create ActivityFeedResolverQueries tests
- [ ] Create `activity.feed.resolver.queries.spec.ts`
- [ ] Add test for `activityFeed` query - authorization + delegation
- [ ] Add test for `activityFeedGrouped` query - authorization + delegation

## Task 3: Verify
- [ ] Run `pnpm vitest run --coverage src/domain/activity-feed`
- [ ] Run `pnpm lint`
- [ ] Run `pnpm exec tsc --noEmit`
- [ ] Confirm >= 80% coverage
