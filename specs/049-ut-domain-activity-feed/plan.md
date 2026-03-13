# Plan: Unit Tests for `src/domain/activity-feed`

## Phase 1: Extend ActivityFeedService Tests

Enhance the existing `activity.feed.service.spec.ts` with additional test cases:

1. **getActivityFeed - additional branches**
   - Call with no filters (defaults)
   - Call with `myActivity: true` to verify userID propagation
   - Call with `excludeTypes` to verify pass-through
   - Call with `types` filter

2. **getGroupedActivityFeed**
   - Happy path: returns converted activities
   - With `myActivity: true`
   - Retry loop: when converted count < requested, retries with increased limit
   - Hard limit break at 100

3. **filterSpacesOrFail branches**
   - When `spacesExist` returns array of non-existing IDs (warning + filter)
   - When no spaceIdsFilter provided (returns all)

4. **filterSpacesByRoles**
   - Empty roles filter returns all spaces
   - Matching roles filter
   - Non-matching roles filter returns empty

## Phase 2: Create ActivityFeedResolverQueries Tests

New file `activity.feed.resolver.queries.spec.ts`:

1. **activityFeed**
   - Successful query delegates to service
   - Authorization check is called with correct privilege

2. **activityFeedGrouped**
   - Successful query delegates to service
   - Authorization check is called with correct privilege

## Phase 3: Verify

- Run tests with coverage
- Fix any type/lint issues
- Ensure >= 80% coverage
