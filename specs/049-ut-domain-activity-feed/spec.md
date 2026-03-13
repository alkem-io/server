# Specification: Unit Tests for `src/domain/activity-feed`

## Objective

Achieve at least 80% test coverage for the `src/domain/activity-feed` area by adding unit tests for:

1. **ActivityFeedService** (`activity.feed.service.ts`) - Extend existing test suite to cover uncovered branches in `getActivityFeed`, `getGroupedActivityFeed`, `filterSpacesOrFail`, and the standalone `filterSpacesByRoles` function.
2. **ActivityFeedResolverQueries** (`activity.feed.resolver.queries.ts`) - New test file covering both `activityFeed` and `activityFeedGrouped` query resolvers.

## Scope

### In Scope
- Unit tests for `ActivityFeedService` (extend existing `activity.feed.service.spec.ts`)
- Unit tests for `ActivityFeedResolverQueries` (new `activity.feed.resolver.queries.spec.ts`)
- All public methods and meaningful private method branches (via public API)

### Out of Scope
- Entity files, interfaces, DTOs, enums, module definitions, index barrels
- Integration or E2E tests
- Code modifications to source files

## Testable Units

### ActivityFeedService
| Method | Visibility | Current Coverage | Notes |
|--------|-----------|-----------------|-------|
| `getActivityFeed` | public | Partial | Needs: myActivity flag, excludeTypes, no filters |
| `getGroupedActivityFeed` | public | None | Needs: full path including retry loop |
| `getQualifyingSpaces` | private | Partial (via getActivityFeed) | Needs: roles filter path |
| `filterSpacesOrFail` | private | Partial | Needs: non-existent spaces branch, no filter branch |
| `getPaginatedActivity` | private | None (mocked away) | Needs: conversion + filtering |
| `getGroupedActivity` | private | None | Needs: retry loop, hard limit break |
| `getAllAuthorizedCollaborations` | private | Good | Already well-covered |

### ActivityFeedResolverQueries
| Method | Visibility | Current Coverage | Notes |
|--------|-----------|-----------------|-------|
| `activityFeed` | public | None | Auth check + delegation to service |
| `activityFeedGrouped` | public | None | Auth check + delegation to service |

### Standalone Function: `filterSpacesByRoles`
| Function | Current Coverage | Notes |
|----------|-----------------|-------|
| `filterSpacesByRoles` | None | Empty roles filter, matching roles, non-matching roles |

## Success Criteria
- All tests pass with `pnpm vitest run src/domain/activity-feed`
- Coverage >= 80% for the activity-feed area
- No lint or type-check errors
