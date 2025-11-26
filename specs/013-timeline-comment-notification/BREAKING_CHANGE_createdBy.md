# Breaking Change: Removal of createdBy Field from Calendar Event CREATED Payload

**Date**: 2025-11-05
**Type**: Field Removal
**Severity**: BREAKING
**Affected Type**: `InAppNotificationPayloadSpaceCommunityCalendarEvent`

---

## Change Summary

**Removed Field**: `createdBy: UUID!` from `InAppNotificationPayloadSpaceCommunityCalendarEvent`

**Schema Diff**:

```diff
type InAppNotificationPayloadSpaceCommunityCalendarEvent implements InAppNotificationPayload {
  """The CalendarEvent that was created."""
  calendarEvent: CalendarEvent
  """ID of the calendar event."""
  calendarEventID: UUID!
- """ID of the user who created the event."""
- createdBy: UUID!
  """The space details."""
  space: Space
  """The payload type."""
  type: NotificationEventPayload!
}
```

---

## Rationale

1. **Redundancy**: The `createdBy` field was duplicating data already available through the `calendarEvent` field resolver
2. **Consistency**: Other notification payloads follow this pattern (accessing entity fields via resolvers rather than duplicating them)
3. **Simplification**: Reduces payload complexity and maintenance burden

---

## Impact Assessment

### Who Is Affected?

**Client Applications** querying calendar event CREATED notifications with direct `createdBy` field access.

**Affected Query Pattern**:

```graphql
query {
  myNotifications {
    ... on InAppNotificationPayloadSpaceCommunityCalendarEvent {
      createdBy # ❌ This will fail
      calendarEventID
    }
  }
}
```

### What Will Break?

- GraphQL queries requesting `createdBy` directly on `InAppNotificationPayloadSpaceCommunityCalendarEvent` will return an error: `Cannot query field "createdBy" on type "InAppNotificationPayloadSpaceCommunityCalendarEvent"`
- Clients using typed GraphQL codegen may have TypeScript compilation errors

---

## Migration Path

### Option 1: Update Query to Use Nested Field (Recommended)

```graphql
query {
  myNotifications {
    ... on InAppNotificationPayloadSpaceCommunityCalendarEvent {
      calendarEvent {
        createdBy # ✅ Access via CalendarEvent entity
      }
      calendarEventID
    }
  }
}
```

**Benefits**:

- No data loss - all information remains accessible
- Consistent with best practices for GraphQL field resolution
- Future-proof against similar optimizations

### Option 2: Remove createdBy Usage (If Not Needed)

If the creator ID is not actually used in the UI, simply remove the field from the query.

```graphql
query {
  myNotifications {
    ... on InAppNotificationPayloadSpaceCommunityCalendarEvent {
      calendarEventID
      # Removed createdBy - not needed
    }
  }
}
```

---

## Timeline

**Recommended Schedule**:

1. **T-0 (PR Merge)**: Breaking change introduced in schema
2. **T+0 to T+1 sprint**: Client teams update queries
3. **T+1 sprint**: Deploy client updates
4. **T+2 sprint**: Verify no legacy queries remain

**Minimum Notice**: 1 sprint before deploying server changes

---

## Code Changes Required

### Example: React/TypeScript Client with GraphQL Codegen

**Before**:

```typescript
// Generated type includes createdBy
interface CalendarEventCreatedNotification {
  __typename: 'InAppNotificationPayloadSpaceCommunityCalendarEvent';
  createdBy: string;
  calendarEventID: string;
}

// Usage
const { createdBy } = notification;
```

**After**:

```typescript
// Updated query generates different type
interface CalendarEventCreatedNotification {
  __typename: 'InAppNotificationPayloadSpaceCommunityCalendarEvent';
  calendarEvent: {
    createdBy: string;
  };
  calendarEventID: string;
}

// Updated usage
const {
  calendarEvent: { createdBy },
} = notification;
```

---

## Rollback Plan

If this breaking change causes critical issues:

### Option A: Restore Field (Quickest)

Add the field back to the DTO:

```typescript
@ObjectType('InAppNotificationPayloadSpaceCommunityCalendarEvent', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityCalendarEvent extends InAppNotificationPayloadSpace {
  @Field(() => UUID, {
    description: 'ID of the calendar event.',
  })
  calendarEventID!: string;

  @Field(() => UUID, {
    description: 'ID of the user who created the event.',
    deprecationReason:
      'Use calendarEvent.createdBy instead. Will be removed in v2.0.',
  })
  createdBy!: string; // RESTORED
}
```

Update the adapter to populate it:

```typescript
const inAppPayload: InAppNotificationPayloadSpaceCommunityCalendarEvent = {
  type: NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT,
  spaceID: space.id,
  calendarEventID: eventData.calendarEvent.id,
  createdBy: eventData.calendarEvent.createdBy, // RESTORED
};
```

### Option B: Feature Flag

If more time is needed for client migration, introduce a feature flag to control field presence.

---

## Validation Checklist

Before deploying this change:

- [ ] All client teams notified of breaking change
- [ ] Migration guide shared with affected teams
- [ ] Client teams confirm migration timeline
- [ ] Client queries updated or migration PRs created
- [ ] Staging environment tested with updated clients
- [ ] Rollback plan documented and ready
- [ ] CODEOWNER approval obtained with `BREAKING-APPROVED` comment

---

## Lessons Learned

**For Future Schema Changes**:

1. **Deprecation First**: Mark fields as deprecated 1+ releases before removal
2. **Longer Notice**: Provide 2+ sprint notice for breaking changes
3. **Client Survey**: Check actual usage in production queries before removing fields
4. **Gradual Migration**: Consider a deprecation period with warnings

---

## Communication Template

**Subject**: [BREAKING CHANGE] Calendar Event Notification Schema Update

**Body**:

```
Hi Team,

We're introducing a breaking change to the GraphQL schema in the upcoming release:

**What's Changing?**
The `createdBy` field is being removed from `InAppNotificationPayloadSpaceCommunityCalendarEvent`.

**Why?**
The field duplicates data available via `calendarEvent.createdBy`, and we're standardizing our notification payloads.

**What Do You Need to Do?**
Update your queries to access `calendarEvent { createdBy }` instead of the direct `createdBy` field.

**Timeline**:
- Notification: [Date]
- Server Deploy: [Date + 1 sprint]
- Client Deploy Deadline: [Date + 1 sprint]

**Migration Guide**: [Link to this document]

Please confirm receipt and estimated completion date for your client updates.

Thanks!
```

---

## Approval

**Required Approvals**:

- [ ] CODEOWNER approval with `BREAKING-APPROVED` comment
- [ ] Client team acknowledgment of migration timeline
- [ ] QA sign-off on migration testing

**Approval Comment Template**:

```
BREAKING-APPROVED

Migration Path Documented: ✅
Client Teams Notified: ✅
Rollback Plan Ready: ✅
Timeline: 1 sprint notice provided

Justification: Field removal reduces payload redundancy while preserving all data via nested field access. Low-impact change with clear migration path.
```
