# In-App Notification Entity Tracking Design

## Overview
This document describes the entity tracking strategy for in-app notifications to handle entity deletions gracefully.

## Problem Statement
Notifications reference entities that may be deleted. We need to:
1. Delete notifications when core entities are removed (notification becomes meaningless)
2. Keep notifications when secondary entities are removed (notification still has value)

## Solution: Hybrid FK + JSON Approach

### Core Entities (Database Foreign Keys with CASCADE DELETE)
These entities are essential to the notification's meaning. When deleted, the notification should be removed.

| Entity | Table | Cascade Delete | Reason |
|--------|-------|----------------|---------|
| **Receiver User** | `user` | **YES** | **CRITICAL: When user is deleted, all their notifications must be removed** |
| Space | `space` | YES | Without the space, space-related notifications are meaningless |
| Organization | `organization` | YES | Without the org, org-related notifications are meaningless |
| User (referenced) | `user` | YES | User-specific notifications need the user to exist |
| Application | `application` | YES | Application notifications need the application context |
| Invitation | `invitation` | YES | Invitation notifications need the invitation to exist |
| Callout | `callout` | YES | Callout notifications need the callout context |
| Contribution (Post) | `callout_contribution` | YES | Post comment notifications need the post |

### Secondary Entities (JSON only - No FK)
These entities provide additional context but notifications remain meaningful without them.

| Entity | Storage | Handle Missing | Reason |
|--------|---------|----------------|---------|
| Triggered By User | `triggeredByID` column | Frontend shows "Unknown User" | Notification still conveys the action |
| Room | JSON payload | Frontend shows null | Notification still valid |
| Message | JSON payload | Frontend shows null | Notification still valid |
| Contributor (referenced) | JSON payload | Frontend shows null | Context remains clear |
| Virtual Contributor | JSON payload | Frontend shows null | Context remains clear |

## Database Schema Changes
### Foreign Key for receiverID (CRITICAL)
```sql
-- receiverID already exists as a column, we're just adding the FK constraint
ALTER TABLE in_app_notification
  ADD CONSTRAINT fk_notification_receiver
  FOREIGN KEY (receiverID) REFERENCES user(id) ON DELETE CASCADE;
```


### New Columns (All Nullable)
```sql
ALTER TABLE in_app_notification ADD COLUMN spaceID CHAR(36) NULL;
ALTER TABLE in_app_notification ADD COLUMN organizationID CHAR(36) NULL;
ALTER TABLE in_app_notification ADD COLUMN userID CHAR(36) NULL;
ALTER TABLE in_app_notification ADD COLUMN applicationID CHAR(36) NULL;
ALTER TABLE in_app_notification ADD COLUMN invitationID CHAR(36) NULL;
ALTER TABLE in_app_notification ADD COLUMN calloutID CHAR(36) NULL;
ALTER TABLE in_app_notification ADD COLUMN contributionID CHAR(36) NULL;
```

### Foreign Key Constraints
-- CRITICAL: Receiver FK - deletes all notifications when user is deleted
ALTER TABLE in_app_notification
  ADD CONSTRAINT fk_notification_receiver
  FOREIGN KEY (receiverID) REFERENCES user(id) ON DELETE CASCADE;

```sql
ALTER TABLE in_app_notification
  ADD CONSTRAINT fk_notification_space
  ADD CONSTRAINT fk_notification_space
  FOREIGN KEY (spaceID) REFERENCES space(id) ON DELETE CASCADE;

ALTER TABLE in_app_notification
  ADD CONSTRAINT fk_notification_organization
  FOREIGN KEY (organizationID) REFERENCES organization(id) ON DELETE CASCADE;

ALTER TABLE in_app_notification
  ADD CONSTRAINT fk_notification_user
  FOREIGN KEY (userID) REFERENCES user(id) ON DELETE CASCADE;

ALTER TABLE in_app_notification
  ADD CONSTRAINT fk_notification_application
  FOREIGN KEY (applicationID) REFERENCES application(id) ON DELETE CASCADE;

ALTER TABLE in_app_notification
  ADD CONSTRAINT fk_notification_invitation
  FOREIGN KEY (invitationID) REFERENCES invitation(id) ON DELETE CASCADE;

ALTER TABLE in_app_notification
  ADD CONSTRAINT fk_notification_callout
  FOREIGN KEY (calloutID) REFERENCES callout(id) ON DELETE CASCADE;

ALTER TABLE in_app_notification
  ADD CONSTRAINT fk_notification_contribution
  FOREIGN KEY (contributionID) REFERENCES callout_contribution(id) ON DELETE CASCADE;
```

### Indexes
```sql
CREATE INDEX idx_notification_spaceID ON in_app_notification(spaceID);
CREATE INDEX idx_notification_organizationID ON in_app_notification(organizationID);
CREATE INDEX idx_notification_userID ON in_app_notification(userID);
CREATE INDEX idx_notification_applicationID ON in_app_notification(applicationID);
CREATE INDEX idx_notification_invitationID ON in_app_notification(invitationID);
CREATE INDEX idx_notification_calloutID ON in_app_notification(calloutID);
CREATE INDEX idx_notification_contributionID ON in_app_notification(contributionID);
```

## Notification Type Mapping

| Notification Type | Core FKs Populated |
|-------------------|-------------------|
| SPACE | spaceID |
| SPACE_COMMUNITY_APPLICATION | spaceID, applicationID |
| SPACE_COMMUNITY_CONTRIBUTOR | spaceID |
| SPACE_COMMUNITY_INVITATION | spaceID, invitationID |
| SPACE_COMMUNICATION_MESSAGE_DIRECT | spaceID |
| SPACE_COMMUNICATION_UPDATE | spaceID |
| SPACE_COLLABORATION_CALLOUT | spaceID, calloutID |
| SPACE_COLLABORATION_CALLOUT_COMMENT | spaceID, calloutID, contributionID |
| SPACE_COLLABORATION_CALLOUT_POST_COMMENT | spaceID, calloutID, contributionID |
| ORGANIZATION_MESSAGE_DIRECT | organizationID |
| ORGANIZATION_MESSAGE_ROOM | organizationID |
| USER | userID |
| USER_MESSAGE_DIRECT | userID |
| USER_MESSAGE_ROOM | userID |
| PLATFORM_FORUM_DISCUSSION | (no FKs - discussion stored as JSON) |
| PLATFORM_USER_PROFILE_REMOVED | (no FKs - user already deleted) |
| PLATFORM_GLOBAL_ROLE_CHANGE | (no FKs - platform-level) |
| VIRTUAL_CONTRIBUTOR | (TBD - need to check VC entity) |

## Migration Strategy

### Phase 1: Add Columns (Nullable)
- Add all FK columns as nullable
- Add indexes
- No foreign key constraints yet

### Phase 2: Backfill Data
- Extract entity IDs from JSON payload
- Populate FK columns for existing notifications
- Validate data integrity

### Phase 3: Add FK Constraints
- Add foreign key constraints with CASCADE DELETE
- Monitor deletion events

### Phase 4: Update Application Code
- Modify notification creation to populate FKs
- Keep JSON payload for backward compatibility
- Update field resolvers if needed

## Performance Impact

### Positive Impacts
✅ Faster queries using indexed FKs vs JSON queries
✅ Automatic cascade deletes (no application logic needed)
✅ Database-level data integrity

### Neutral Impacts
⚠️ 7 nullable columns per row (~28 bytes overhead for NULLs)
⚠️ One-time migration cost for backfill

### Mitigation
- Indexes prevent full table scans
- Nullable columns with sparse data are efficiently stored
- Medium volume (100 notifications retained) = negligible impact

## Frontend Changes Required

Frontend already handles missing entities gracefully with `resolveToNull: true` in DataLoaders. No changes needed for secondary entities (triggeredBy, rooms, messages, etc.).

## Retention Policy Integration

Separate concern: Last 100 notifications per user retention policy.
- Implement cleanup job (cron/scheduled task)
- Query: `DELETE FROM in_app_notification WHERE receiverID = ? ORDER BY triggeredAt DESC OFFSET 100`
- Run periodically (daily/weekly)

## Testing Strategy

1. **Unit Tests**: Verify FK population logic
2. **Integration Tests**: Test cascade deletes
3. **Migration Tests**: Validate backfill accuracy
4. **Performance Tests**: Measure query performance before/after
5. **E2E Tests**: Verify frontend handles null secondary entities

## Rollback Plan

If issues arise:
1. Drop FK constraints (keeps columns and data)
2. Revert application code changes
3. Continue using JSON-only approach
4. Optionally drop columns in future migration

## Timeline Estimate

- Schema changes: 1 day
- Backfill migration: 1 day
- Application code updates: 2-3 days
- Testing: 2 days
- **Total: ~1 week**

## Decision

✅ **Approved**: Database-level tracking with nullable FKs
- Hard cascade delete (no audit)
- Medium volume (minimal performance impact)
- Retain last 100 notifications (separate cleanup job)
- Daily entity deletions (FK cascade handles efficiently)

