# Research: `src/domain/activity-feed`

## Source Files Analysis

### `activity.feed.service.ts` (331 lines)
- Injectable NestJS service with 5 constructor dependencies
- 2 public methods: `getActivityFeed`, `getGroupedActivityFeed`
- 4 private methods: `getQualifyingSpaces`, `filterSpacesOrFail`, `getPaginatedActivity`, `getGroupedActivity`
- 1 standalone function: `filterSpacesByRoles`
- Key dependencies: SpaceLookupService, AuthorizationService, ActivityService, ActivityLogService, EntityManager

### `activity.feed.resolver.queries.ts` (69 lines)
- GraphQL resolver with 2 query methods
- Dependencies: AuthorizationService, PlatformAuthorizationPolicyService, ActivityFeedService
- Both methods follow pattern: authorize -> delegate to service

### Existing Test File: `activity.feed.service.spec.ts` (281 lines)
- Tests `getAllAuthorizedCollaborations` via `getActivityFeed` (8 test cases)
- Uses NestJS TestingModule with `defaultMockerFactory`
- Helper functions: `makeSpace`, `makeCredential`
- Does NOT mock `activityService` or `activityLogService` return values (those calls silently return undefined)

## Dependencies to Mock

| Dependency | Token | Mock Strategy |
|-----------|-------|---------------|
| Logger | WINSTON_MODULE_NEST_PROVIDER | MockWinstonProvider |
| SpaceLookupService | class | defaultMockerFactory (createMock) |
| AuthorizationService | class | defaultMockerFactory (createMock) |
| ActivityService | class | defaultMockerFactory (createMock) |
| ActivityLogService | class | defaultMockerFactory (createMock) |
| EntityManager | getEntityManagerToken('default') | defaultMockerFactory (string token) |
| PlatformAuthorizationPolicyService | class | defaultMockerFactory (createMock) |

## Key Behavior Notes

1. `getGroupedActivity` has a retry loop: if converted activities < requested, it re-fetches with increased limit, capped at 100
2. `filterSpacesOrFail` logs a warning when spaces don't exist (returns `string[]` vs `true`)
3. `filterSpacesByRoles` is a pure function - no DI, easy to test in isolation
4. `groupCredentialsByEntity` maps credentials to `CredentialMap` with 'spaces' key containing spaceId -> roles[]
