# Scope Change: Calendar Event Comment Notifications

**Date**: 2025-11-05
**Status**: Implemented
**Impact**: Reduced notification scope from community-wide to creator-only

---

## Change Summary

**Original Scope**: Send notifications to all Space community members when a comment is posted on a calendar event.

**Updated Scope**: Send notifications only to the calendar event creator when a comment is posted on their event.

---

## Rationale

- More targeted notification delivery
- Reduces notification noise for community members
- Focuses on the most relevant recipient (event creator)
- Follows creator-subscriber pattern common in collaboration tools

---

## Implementation Changes

### Code Changes

#### 1. NotificationRecipientsService (`notification.recipients.service.ts`)

**Changed**: Recipient credential criteria for `SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT`

**Before**:

```typescript
case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_CREATED:
case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT: {
  privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
  credentialCriteria = this.getSpaceCredentialCriteria(spaceID);
  break;
}
```

**After**:

```typescript
case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_CREATED: {
  privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
  credentialCriteria = this.getSpaceCredentialCriteria(spaceID);
  break;
}
case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT: {
  // Only notify the calendar event creator
  credentialCriteria = this.getUserSelfCriteria(userID);
  break;
}
```

**Impact**:

- Comment notifications now use `USER_SELF_MANAGEMENT` credential (specific user)
- No privilege check required (direct user notification)
- Removed from Space authorization policy switch case

---

#### 2. NotificationSpaceAdapter (`notification.space.adapter.ts`)

**Changed**: Recipient filtering and early return logic

**Before**:

```typescript
public async spaceCommunityCalendarEventComment(...): Promise<void> {
  // Get all space community members
  const recipients = await this.getNotificationRecipientsSpace(
    event,
    eventData,
    space.id
  );

  // Filter out commenter from both channels
  const emailRecipientsExcludingCommenter = recipients.emailRecipients.filter(...);
  const inAppRecipientsExcludingCommenter = recipients.inAppRecipients.filter(...);

  // Send to filtered lists...
}
```

**After**:

```typescript
public async spaceCommunityCalendarEventComment(...): Promise<void> {
  // Get the calendar event creator's user ID
  const creatorID = eventData.calendarEvent.createdBy;
  const commenterID = eventData.triggeredBy;

  // Only notify the creator if they are not the commenter
  if (creatorID === commenterID) {
    this.logger.verbose?.(`Skipping notification: creator is also the commenter`);
    return;
  }

  // Get creator as recipient
  const recipients = await this.getNotificationRecipientsSpace(
    event,
    eventData,
    space.id,
    creatorID // Pass creator's user ID
  );

  // Send notifications (no additional filtering needed)...
}
```

**Impact**:

- Early return when creator comments on their own event
- Direct lookup of creator user (no community query)
- Simplified recipient filtering logic

---

### Specification Changes

#### 1. spec.md - User Stories Updated

**Changed User Story 1**:

- **Before**: "Community Member Receives Timeline Comment Notification"
- **After**: "Calendar Event Creator Receives Comment Notification"

**Changed Acceptance Scenarios**:

- **Before**: Alice comments → Bob and Carol (all community members) receive notifications
- **After**: Alice creates event → Bob comments → Alice receives notification

**Changed User Story 3**:

- **Before**: "Community Scope Filtering" (validate community boundaries)
- **After**: "Authorization Validation" (validate creator exists)

---

#### 2. spec.md - Requirements Updated

**Functional Requirements**:

- **FR-003 Before**: "System MUST identify eligible notification recipients as all community members..."
- **FR-003 After**: "System MUST identify the eligible notification recipient as the creator of the calendar event..."

- **FR-004 Before**: "System MUST exclude the comment author from receiving notifications..."
- **FR-004 After**: "System MUST exclude the comment author... (i.e., if creator comments on their own event)..."

- **FR-010 Before**: "System MUST follow existing authorization patterns to ensure recipients have READ privilege..."
- **FR-010 After**: "System MUST validate that the calendar event creator user exists and has valid credentials..."

---

#### 3. research.md - Decision Updated

**Section 4 - Recipient Resolution**:

- **Before**: "Resolve Space from CalendarEvent, then get Community from Space"
- **After**: "Use `CalendarEvent.createdBy` to identify recipient, query with `USER_SELF_MANAGEMENT` credential"

**Section 6 - Authorization**:

- **Before**: "Require READ privilege on Space authorization policy with SPACE_MEMBER credential"
- **After**: "Use USER_SELF_MANAGEMENT credential with no privilege requirement"

---

#### 4. IMPLEMENTATION_SUMMARY.md - Pattern Updated

**Overview**:

- **Before**: "delivering both email and in-app notifications to space community members"
- **After**: "delivering both email and in-app notifications to calendar event creators"

**Authorization & Filtering**:

- **Before**:
  - Credential: `SPACE_MEMBER`
  - Privilege: `READ` on Space authorization policy
- **After**:
  - Recipient: Calendar event creator only
  - Credential: `USER_SELF_MANAGEMENT`
  - Privilege: None required

---

## Success Criteria Changes

### Before

- **SC-002**: "100% of eligible community members (excluding the comment author) receive notifications..."
- **SC-003**: "Zero notifications are sent to users who are not members of the community..."

### After

- **SC-002**: "The calendar event creator receives notifications according to their channel preferences..."
- **SC-003**: "Zero notifications are sent to users other than the calendar event creator."

---

## Migration Impact

**No database migration required**:

- No schema changes
- No data backfill needed
- Existing notification preferences reused (`communityCalendarEvents`)

**Behavioral change only**:

- Notifications sent to fewer recipients (creator only vs. entire community)
- Non-breaking: reduces notification volume, does not break existing functionality

---

## Testing Impact

**Updated Test Cases**:

- Manual validation tasks (Phase 4, 5) still relevant but interpret "community members" as "event creator"
- Task T027: "Test with non-community member" → Update to "Test with non-creator"
- Task T028: "Test with community member without READ privilege" → Update to "Test creator notification delivery"

---

## Benefits of This Change

1. **Reduced Notification Noise**: Community members no longer receive notifications for every comment on every calendar event
2. **Targeted Relevance**: Only the person who created the event (most invested stakeholder) is notified
3. **Simpler Logic**: Direct user notification vs. community membership queries
4. **Performance**: Single user lookup instead of community membership query
5. **Follows Pattern**: Matches direct notification patterns (mentions, messages)

---

## Future Considerations

If broader notification scope is needed in the future, consider:

- Allow creators to "subscribe" other users to their events
- Add "follow event" functionality for community members
- Separate notification preference for "events I created" vs. "all community events"
