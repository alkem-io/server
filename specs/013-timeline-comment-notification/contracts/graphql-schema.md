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
  ID of the calendar event that was commented on
  """
  calendarEventID: UUID!

  """
  Display title of the calendar event
  """
  calendarEventTitle: String!

  """
  ID of the comment message
  """
  commentID: UUID!

  """
  Preview text of the comment (first 200 characters)
  """
  commentText: String!

  """
  ID of the user who posted the comment
  """
  commenterID: UUID!
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

## Breaking Change Analysis

### Schema Contract Gate Checklist

- [x] No field removals
- [x] No field type changes
- [x] No required argument additions to existing fields
- [x] All new non-nullable fields have migration to populate existing data
- [x] All enum additions (no removals)
- [x] All union/interface implementations (no removals)

**Result**: ✅ **PASS** - All changes are non-breaking additions

## Migration Coordination

### GraphQL Schema Update Sequence

1. **Before Deployment**:
   - Schema baseline updated automatically post-merge to `develop`

2. **During Deployment**:
   - New code deployed with enum values and types
   - Existing clients can ignore new enum values (graceful degradation)
   - New notification types appear in subscriptions

3. **After Deployment**:
   - In-app notifications of new type deliverable
   - Schema diff reports new additions (non-breaking)

## Client Compatibility

### Existing Clients (No Code Changes)

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
    "removed": [],
    "breaking": []
  }
}
```

**Schema Contract Gate**: ✅ **PASS** (no breaking changes)

## Validation Commands

Run these before committing schema-affecting code:

```bash
# 1. Regenerate schema
pnpm run schema:print
pnpm run schema:sort

# 2. Generate diff (requires previous baseline)
pnpm run schema:diff

# 3. Validate no breaking changes
# Review change-report.json for BREAKING or PREMATURE_REMOVAL entries

# 4. Optional: Validate against contract tests
pnpm run test:ci schema.contract.spec.ts
```

## Notes

- All GraphQL types auto-generated from TypeScript decorators
- No manual schema.graphql edits required
- Schema baseline updated automatically by `schema-baseline.yml` workflow post-merge
- Change report published as PR comment by `schema-contract.yml` on pull requests
