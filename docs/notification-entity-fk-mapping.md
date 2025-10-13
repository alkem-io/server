# Notification Entity FK Mapping

This table shows which foreign key columns are populated for each notification type.

Legend:
- ✅ = FK column is populated (CASCADE DELETE applies)
- ➖ = FK column not applicable for this notification type
- 🔵 = Always populated (receiverID exists for ALL notifications)

## Complete Notification Type to FK Column Mapping

| Notification Event Type | Notification Payload Type | receiverID | spaceID | organizationID | userID | applicationID | invitationID | calloutID | contributionID |
|------------------------|---------------------------|------------|---------|----------------|--------|---------------|--------------|-----------|----------------|
| **Platform Notifications** |
| PLATFORM_FORUM_DISCUSSION | PLATFORM_FORUM_DISCUSSION | 🔵 | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| PLATFORM_FORUM_DISCUSSION_COMMENT | PLATFORM_FORUM_DISCUSSION_COMMENT | 🔵 | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| PLATFORM_USER_PROFILE_REMOVED | PLATFORM_USER_PROFILE_REMOVED | 🔵 | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| PLATFORM_GLOBAL_ROLE_CHANGE | PLATFORM_GLOBAL_ROLE_CHANGE | 🔵 | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| **Organization Notifications** |
| ORGANIZATION_MESSAGE_DIRECT | ORGANIZATION_MESSAGE_DIRECT | 🔵 | ➖ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ |
| ORGANIZATION_MESSAGE_ROOM | ORGANIZATION_MESSAGE_ROOM | 🔵 | ➖ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ |
| **Space Notifications** |
| SPACE_CREATED | SPACE | 🔵 | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| SPACE_UPDATED | SPACE | 🔵 | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| SPACE_COMMUNITY_APPLICATION | SPACE_COMMUNITY_APPLICATION | 🔵 | ✅ | ➖ | ➖ | ✅ | ➖ | ➖ | ➖ |
| SPACE_COMMUNITY_CONTRIBUTOR_JOINED | SPACE_COMMUNITY_CONTRIBUTOR | 🔵 | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| SPACE_COMMUNITY_INVITATION_CREATED | SPACE_COMMUNITY_INVITATION | 🔵 | ✅ | ➖ | ➖ | ➖ | ✅ | ➖ | ➖ |
| SPACE_COMMUNITY_INVITATION_USER_PLATFORM | SPACE_COMMUNITY_INVITATION_USER_PLATFORM | 🔵 | ✅ | ➖ | ➖ | ➖ | ✅ | ➖ | ➖ |
| SPACE_COMMUNICATION_MESSAGE_DIRECT | SPACE_COMMUNICATION_MESSAGE_DIRECT | 🔵 | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| SPACE_COMMUNICATION_UPDATE_PUBLISHED | SPACE_COMMUNICATION_UPDATE | 🔵 | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| SPACE_COLLABORATION_CALLOUT_PUBLISHED | SPACE_COLLABORATION_CALLOUT | 🔵 | ✅ | ➖ | ➖ | ➖ | ➖ | ✅ | ➖ |
| SPACE_COLLABORATION_CALLOUT_POST_CREATED | SPACE_COLLABORATION_CALLOUT | 🔵 | ✅ | ➖ | ➖ | ➖ | ➖ | ✅ | ➖ |
| SPACE_COLLABORATION_CALLOUT_COMMENT | SPACE_COLLABORATION_CALLOUT_COMMENT | 🔵 | ✅ | ➖ | ➖ | ➖ | ➖ | ✅ | ✅ |
| SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT | SPACE_COLLABORATION_CALLOUT_POST_COMMENT | 🔵 | ✅ | ➖ | ➖ | ➖ | ➖ | ✅ | ✅ |
| **User Notifications** |
| USER_CREATED | USER | 🔵 | ➖ | ➖ | ✅ | ➖ | ➖ | ➖ | ➖ |
| USER_MESSAGE_DIRECT | USER_MESSAGE_DIRECT | 🔵 | ➖ | ➖ | ✅ | ➖ | ➖ | ➖ | ➖ |
| USER_MESSAGE_ROOM | USER_MESSAGE_ROOM | 🔵 | ➖ | ➖ | ✅ | ➖ | ➖ | ➖ | ➖ |
| **Virtual Contributor Notifications** |
| VIRTUAL_CONTRIBUTOR_CREATED | VIRTUAL_CONTRIBUTOR | 🔵 | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |

## Notes

### receiverID (🔵 - Universal)
- **Always populated** for every single notification
- Represents the user receiving the notification
- **CASCADE DELETE**: When user is deleted, all their notifications are removed
- Most critical FK - ensures no orphaned notifications

### spaceID (✅)
- Populated for all Space-related notifications
- **CASCADE DELETE**: When Space is deleted, all related notifications are removed
- Example: Space updates, callouts, community events

### organizationID (✅)
- Populated for Organization-related notifications
- **CASCADE DELETE**: When Organization is deleted, all related notifications are removed
- Example: Organization messages

### userID (✅)
- Populated for User-specific notifications (not the receiver, but the subject)
- **CASCADE DELETE**: When referenced User is deleted, notifications are removed
- Example: "User X joined", "Message from User Y"

### applicationID (✅)
- Populated for Application notifications
- **CASCADE DELETE**: When Application is deleted, notification is removed
- Example: New application submitted

### invitationID (✅)
- Populated for Invitation notifications
- **CASCADE DELETE**: When Invitation is deleted, notification is removed
- Example: Community invitation created

### calloutID (✅)
- Populated for Callout-related notifications
- **CASCADE DELETE**: When Callout is deleted, all related notifications are removed
- Example: Callout published, new post in callout

### contributionID (✅)
- Populated for Post/Contribution comment notifications
- **CASCADE DELETE**: When Post is deleted, comment notifications are removed
- Example: Comment on your post

## Platform Notifications (No FKs)
Platform-level notifications don't reference specific entities via FK because:
- **PLATFORM_FORUM_DISCUSSION**: Discussion data is embedded as JSON (external forum)
- **PLATFORM_USER_PROFILE_REMOVED**: User is already deleted (notification is informational)
- **PLATFORM_GLOBAL_ROLE_CHANGE**: Platform-level event, no specific entity

These notifications only have the `receiverID` FK and remain until manually deleted or expired.

## Cascade Delete Behavior Examples

### Scenario 1: User Deletes Their Account
**Action**: User with ID `user-123` is deleted

**Result**: ALL notifications where `receiverID = 'user-123'` are **CASCADE DELETED**
- Their space invitations ✅ Deleted
- Their callout notifications ✅ Deleted
- Their message notifications ✅ Deleted
- Their application notifications ✅ Deleted
- ALL notifications ✅ Deleted

### Scenario 2: Space is Deleted
**Action**: Space with ID `space-456` is deleted

**Result**: ALL notifications where `spaceID = 'space-456'` are **CASCADE DELETED**
- Space update notifications ✅ Deleted
- Community invitation notifications ✅ Deleted
- Callout notifications ✅ Deleted
- Post comment notifications ✅ Deleted

### Scenario 3: Post is Deleted
**Action**: Post (CalloutContribution) with ID `post-789` is deleted

**Result**: ALL notifications where `contributionID = 'post-789'` are **CASCADE DELETED**
- Comment notifications on that post ✅ Deleted

### Scenario 4: User Who Triggered Notification is Deleted
**Action**: User `alice` (who commented) is deleted, but the post/space still exists

**Result**: Notification remains, but:
- `triggeredByID` references deleted user
- Frontend shows "Unknown User" or null
- Notification still shows "Someone commented on your post"
- **NOT CASCADE DELETED** because `triggeredByID` has no FK

## Multiple CASCADE DELETE FKs - Safe and Intended

Some notifications have **multiple CASCADE DELETE foreign keys**. This is **safe and correct**!

### Example: Post Comment Notification
```
receiverID → user(id) ON DELETE CASCADE
spaceID → space(id) ON DELETE CASCADE
calloutID → callout(id) ON DELETE CASCADE
contributionID → callout_contribution(id) ON DELETE CASCADE
```

### How It Works:
1. **First deletion wins**: When ANY FK-referenced entity is deleted, notification is cascade deleted
2. **Already gone**: Subsequent entity deletions find nothing to delete (no error)
3. **Any trigger suffices**: Notification is invalid if ANY core entity is removed

### Why This Is Correct:
A post comment notification becomes meaningless when:
- Space is deleted OR
- Callout is deleted OR
- Post is deleted OR
- Receiver user is deleted

**Any one deletion** makes the notification invalid → CASCADE DELETE on all is correct!

### Database Guarantees:
✅ No cascade loops (only cascading TO notifications, not FROM)
✅ No conflicts (first delete removes row, others find nothing)
✅ Atomic operations (transaction-safe)
✅ Efficient (index lookup, O(1) to detect already deleted)

## Data Integrity

✅ **Before this implementation**: Orphaned notifications with broken entity references
✅ **After this implementation**: Automatic cleanup via database CASCADE DELETE
✅ **Multiple FKs**: Safe! First entity deletion removes notification, others no-op
✅ **Frontend compatibility**: Already handles null secondary entities gracefully
✅ **Performance**: Indexed FK columns improve query speed

## Validation Checklist

When testing the implementation:

- [ ] Create a notification → Verify correct FKs are populated
- [ ] Delete a space → Verify space notifications cascade delete
- [ ] Delete a user → Verify ALL their notifications cascade delete
- [ ] Delete a callout → Verify callout notifications cascade delete
- [ ] Delete a post → Verify comment notifications cascade delete
- [ ] Delete triggeredBy user → Verify notification remains (no FK on triggeredByID)
- [ ] Query notifications by FK → Verify indexes improve performance

