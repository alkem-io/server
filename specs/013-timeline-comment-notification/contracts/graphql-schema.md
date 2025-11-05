# GraphQL Schema Contract: Timeline Event Comment Notification

**Feature**: 013-timeline-comment-notification
**Date**: 2025-11-05
**Impact**: Non-breaking additions to existing types

## Schema Changes

### 1. NotificationEvent Enum Extension

**File**: `schema.graphql` (auto-generated from TypeScript enums)

```graphql
enum NotificationEvent {
  # ... existing values
  SPACE_COMMUNITY_CALENDAR_EVENT_CREATED
  SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT # NEW
  # ... other existing values
}
```

**Impact**: Non-breaking (enum addition)

---

### 2. New In-App Notification Payload Type

**File**: `schema.graphql` (auto-generated from ObjectType decorators)

```graphql
type InAppNotificationPayloadSpaceCommunityCalendarEventComment implements InAppNotificationPayload {
  """
  The unique identifier for this notification payload type
  """
  type: NotificationEventPayload!

  """
  The Space where the calendar event exists
  """
  space: Space

  """
  Preview text of the comment (first 200 characters)
  """
  commentText: String!
}
```

**Impact**: Non-breaking (new type implementation of existing interface)

---

### 3. NotificationEventPayload Enum Extension

**File**: `schema.graphql` (auto-generated from TypeScript enums)

```graphql
enum NotificationEventPayload {
  # ... existing values
  SPACE_COMMUNITY_CALENDAR_EVENT
  SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT # NEW
  # ... other existing values
}
```

**Impact**: Non-breaking (enum addition)

---

### 4. InAppNotificationPayload Union Extension

**File**: `schema.graphql` (auto-generated via @InterfaceType resolveType)

```graphql
interface InAppNotificationPayload {
  type: NotificationEventPayload!
}

# Implementation list automatically includes new type:
# - InAppNotificationPayloadSpaceCommunityCalendarEventComment
```

**Impact**: Non-breaking (union member addition via interface implementation)

---

### 5. Breaking Change: Field Removal from Calendar Event CREATED Payload

**File**: `schema.graphql`

**Type**: `InAppNotificationPayloadSpaceCommunityCalendarEvent` (existing type)

**Removed Field**:

```graphql
"""ID of the user who created the event."""
createdBy: UUID!
```

**Rationale**:

- Field was redundant as creator information is accessible via the `calendarEvent` field resolver
- CalendarEvent entity already exposes `createdBy` field
- Simplifies payload structure by removing duplicated data

**Impact**: ⚠️ **BREAKING** - Clients querying `createdBy` directly will receive GraphQL errors

**Migration Path**:

```graphql
# BEFORE (will fail)
query {
  myNotifications {
    ... on InAppNotificationPayloadSpaceCommunityCalendarEvent {
      createdBy # ❌ Field no longer exists
    }
  }
}

# AFTER (correct approach)
query {
  myNotifications {
    ... on InAppNotificationPayloadSpaceCommunityCalendarEvent {
      calendarEvent {
        createdBy # ✅ Access via nested field
      }
    }
  }
}
```

---

## Breaking Change Analysis

### Schema Contract Gate Checklist

- [x] ⚠️ **One field removal** - `createdBy` from `InAppNotificationPayloadSpaceCommunityCalendarEvent`
- [x] No field type changes
- [x] No required argument additions to existing fields
- [x] All new non-nullable fields have migration to populate existing data
- [x] All enum additions (no removals)
- [x] All union/interface implementations (no removals)

**Result**: ⚠️ **BREAKING CHANGE DETECTED** - Field removal requires client migration

### Breaking Change Justification

**Why This Change Is Acceptable**:

1. **Low Impact**: Calendar event CREATED notifications are view-only in clients
2. **Data Preservation**: Information remains accessible via `calendarEvent { createdBy }`
3. **Consistency**: Aligns payload structure with other entity notification patterns
4. **No Data Loss**: Historical notifications still contain the data (database not affected)

**Required Actions**:

1. Update client GraphQL queries to use nested field access
2. Communicate breaking change to client teams before deployment
3. Provide migration timeline (e.g., 1 sprint notice)

## Migration Coordination

### GraphQL Schema Update Sequence

1. **Before Deployment**:
   - ⚠️ **Notify client teams** about `createdBy` field removal from calendar event CREATED payload
   - Provide migration timeline (recommended: 1 sprint notice)
   - Schema baseline updated automatically post-merge to `develop`

2. **During Deployment**:
   - New code deployed with enum values and types
   - **BREAKING**: Queries accessing `createdBy` on `InAppNotificationPayloadSpaceCommunityCalendarEvent` will fail
   - Existing clients can ignore new enum values (graceful degradation)
   - New notification types appear in subscriptions

3. **After Deployment**:
   - In-app notifications of new type deliverable
   - Schema diff reports additions and breaking changes
   - Client teams deploy query migrations to use `calendarEvent { createdBy }`

## Client Compatibility

### Existing Clients - BREAKING CHANGE

- **Calendar Event CREATED Notifications**:
  - ⚠️ **BREAKING**: Direct `createdBy` field access will fail
  - **Migration Required**: Update queries to use `calendarEvent { createdBy }`
  - **Timeline**: Clients must update before or immediately after deployment

### Existing Clients - No Code Changes

- **Subscriptions**: Will receive new notification types
  - Unknown payload types handled gracefully via GraphQL union
  - Clients can ignore unrecognized `NotificationEventPayload` values

- **Queries**: New fields appear but don't break existing queries
  - `UserSettingsNotificationSpace` queries return new field

### Updated Clients (Opt-in Features)

- Can render new `InAppNotificationPayloadSpaceCommunityCalendarEventComment` type
- Can filter notification lists by new `SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT` type

## Schema Baseline Impact

**Expected Diff Output** (from `pnpm run schema:diff`):

```json
{
  "changes": {
    "added": {
      "types": ["InAppNotificationPayloadSpaceCommunityCalendarEventComment"],
      "enumValues": [
        "NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT",
        "NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT"
      ]
    },
    "removed": {
      "fields": [
        "InAppNotificationPayloadSpaceCommunityCalendarEvent.createdBy"
      ]
    },
    "breaking": [
      {
        "type": "FIELD_REMOVED",
        "message": "Field 'createdBy' was removed from type 'InAppNotificationPayloadSpaceCommunityCalendarEvent'",
        "path": "InAppNotificationPayloadSpaceCommunityCalendarEvent.createdBy"
      }
    ]
  }
}
```

**Schema Contract Gate**: ⚠️ **BREAKING CHANGE DETECTED** - Requires approval via CODEOWNER comment `BREAKING-APPROVED` with migration plan

## Validation Commands

Run these before committing schema-affecting code:

```bash
# 1. Regenerate schema
pnpm run schema:print
pnpm run schema:sort

# 2. Generate diff (requires previous baseline)
pnpm run schema:diff

# 3. ⚠️ CRITICAL: Review breaking changes
# Review change-report.json for BREAKING or PREMATURE_REMOVAL entries
# Document migration path for any breaking changes

# 4. Optional: Validate against contract tests
pnpm run test:ci schema.contract.spec.ts
```

## Notes

- All GraphQL types auto-generated from TypeScript decorators
- No manual schema.graphql edits required
- Schema baseline updated automatically by `schema-baseline.yml` workflow post-merge
- Change report published as PR comment by `schema-contract.yml` on pull requests
- ⚠️ **Breaking changes require CODEOWNER approval** with `BREAKING-APPROVED` comment including migration strategy
