# Data Model: `src/domain/activity-feed`

## No Data Model Changes

This is a test-only task. No entity, migration, or schema changes are required.

## Key Types Used in Tests

### ActivityFeedFilters
```typescript
type ActivityFeedFilters = {
  types?: Array<ActivityEventType>;
  myActivity?: boolean;
  spaceIds?: Array<string>;
  roles?: Array<ActivityFeedRoles>;
  pagination?: PaginationArgs;
  excludeTypes?: Array<ActivityEventType>;
};
```

### ActivityFeedGroupedFilters
```typescript
type ActivityFeedGroupedFilters = ActivityFeedFilters & {
  limit?: number;
};
```

### ActivityFeed (return type)
```typescript
class ActivityFeed extends Paginate(IActivityLogEntry, 'activityFeed') {}
// Effectively: { total: number; pageInfo: PageInfo; items: IActivityLogEntry[] }
```

### CredentialMap
```typescript
type CredentialMap = Map<EntityCredentialType, Map<string, CredentialRole[]>>;
// EntityCredentialType = 'spaces' | 'organizations' | 'groups'
```

### ActorContext
```typescript
class ActorContext {
  actorID: string = '';
  credentials: ICredentialDefinition[] = [];
  isAnonymous: boolean = false;
  authenticationID?: string;
  guestName?: string;
}
```
