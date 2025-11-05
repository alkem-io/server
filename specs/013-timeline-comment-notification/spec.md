# Feature Specification: Timeline Event Comment Notification

**Feature Branch**: `013-timeline-comment-notification`
**Created**: 2025-11-05
**Status**: Draft
**Input**: User description: "Implement new notification event for timeline comments"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Community Member Receives Timeline Comment Notification (Priority: P1)

When a community member comments on a timeline event (calendar event), other eligible community members who have appropriate notification preferences enabled should receive a notification (both in-app and email). This keeps members engaged with timeline discussions and ensures they don't miss important event-related conversations.

**Why this priority**: This is the core functionality that directly addresses the stated purpose of increasing engagement and awareness around timeline discussions. Without this, the feature doesn't exist.

**Independent Test**: Can be fully tested by creating a timeline event with multiple community members, having one member post a comment, and verifying that other eligible members receive notifications through both channels (in-app and email). Delivers immediate value by enabling basic timeline comment awareness.

**Acceptance Scenarios**:

1. **Given** a timeline event exists in a Space community with 3 members (Alice, Bob, Carol), **When** Alice posts a comment on the timeline event, **Then** Bob and Carol receive both in-app and email notifications about Alice's comment.

2. **Given** a timeline event exists with member preferences set (Bob has email disabled, Carol has both channels enabled), **When** Alice comments on the timeline event, **Then** Bob receives only an in-app notification and Carol receives both in-app and email notifications.

3. **Given** a timeline event exists with multiple community members, **When** Alice comments on the timeline event, **Then** Alice does NOT receive a notification about her own comment.

---

### User Story 2 - Notification Preference Respect (Priority: P2)

The notification system must honor existing user notification preferences for timeline comments. Members can control whether they receive notifications via in-app, email, both, or neither channel, giving them control over their notification volume.

**Why this priority**: Essential for user experience and preventing notification fatigue, but depends on P1 existing first. Users need the ability to opt out or customize their notification channels.

**Independent Test**: Can be tested independently by configuring various notification preference combinations for test users and verifying notifications are sent only through enabled channels. Demonstrates that the system respects user preferences.

**Acceptance Scenarios**:

1. **Given** a community member has disabled all timeline comment notifications in their preferences, **When** another member comments on a timeline event, **Then** the member with disabled preferences receives no notification.

2. **Given** a community member has enabled only in-app notifications for timeline comments, **When** another member comments on a timeline event, **Then** the member receives only an in-app notification (no email).

3. **Given** a community member has no specific timeline comment preference set, **When** another member comments on a timeline event, **Then** default notification behavior applies (both channels enabled).

---

### User Story 3 - Community Scope Filtering (Priority: P3)

Notifications are sent only to members of the same community where the timeline event exists, ensuring that only relevant stakeholders are notified and maintaining appropriate information boundaries.

**Why this priority**: Important for correctness and preventing notification spam to non-community members, but builds on top of P1 and P2. This is a filtering/boundary concern rather than core functionality.

**Independent Test**: Can be tested by creating timeline events in different Space communities with overlapping platform users, verifying that comments trigger notifications only within the correct community boundary.

**Acceptance Scenarios**:

1. **Given** a user is a member of Space A but not Space B, **When** a comment is posted on a timeline event in Space B, **Then** the user receives no notification.

2. **Given** a timeline event in a sub-space community, **When** a member comments on it, **Then** only members of that specific sub-space community receive notifications (not parent Space members unless they are also sub-space members).

3. **Given** a user was previously a community member but has since left, **When** a comment is posted on a timeline event in that community, **Then** the former member receives no notification.

---

### Edge Cases

- What happens when a timeline event has no community members except the commenter? (No notifications sent, system handles gracefully)
- How does the system handle a comment posted by a user who is immediately removed from the community? (Notification processing completes based on membership state at comment creation time)
- What happens if the timeline event is deleted while notifications are being processed? (System handles gracefully, may skip sending or include tombstone reference)
- How are notifications handled for timeline events in archived Spaces? (Follow existing Space archival notification rules)
- What happens when a user has conflicting notification preferences (e.g., platform-level vs Space-level)? (Follow existing preference hierarchy: most specific wins)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST define a new notification event type `SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT` in the NotificationEvent enum.
- **FR-002**: System MUST trigger the notification when a comment is created within a timeline event's comment room (Room entity with type CALENDAR_EVENT).
- **FR-003**: System MUST identify eligible notification recipients as all community members of the Space containing the timeline event.
- **FR-004**: System MUST exclude the comment author from receiving notifications about their own comment.
- **FR-005**: System MUST respect existing user notification preferences for the timeline comment notification type (in-app and/or email channels).
- **FR-006**: System MUST send in-app notifications to eligible recipients who have in-app channel enabled for timeline comments.
- **FR-007**: System MUST send email notifications to eligible recipients who have email channel enabled for timeline comments.
- **FR-008**: System MUST include relevant context in notifications: commenter identity, timeline event details, comment preview, and link to the timeline event.
- **FR-009**: System MUST integrate with existing notification infrastructure (NotificationSpaceAdapter, NotificationRecipientsService, notification payload builders).
- **FR-010**: System MUST follow existing authorization patterns to ensure recipients have READ privilege to the timeline event before sending notifications.

### Key Entities _(include if feature involves data)_

- **NotificationEvent**: Enum value representing the new notification type for timeline comments; will be added to existing notification event registry.
- **CalendarEvent (Timeline Event)**: The timeline event entity that contains a comments room where the triggering comment is posted; already exists with relationship to Room.
- **Room**: Communication room associated with a calendar event where comments are posted; already exists with type CALENDAR_EVENT.
- **Message**: The comment message posted in the calendar event's room; triggers the notification flow.
- **Community**: The Space community whose members are eligible to receive notifications; determines notification recipient scope.
- **User Notification Preferences**: Existing user settings that control notification channel enablement (in-app, email) for various notification types; will include new timeline comment preference.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: When a comment is posted on a timeline event, eligible community members receive a notification within 5 seconds.
- **SC-002**: 100% of eligible community members (excluding the comment author) receive notifications according to their channel preferences when a timeline comment is created.
- **SC-003**: Zero notifications are sent to users who are not members of the community containing the timeline event.
- **SC-004**: Users can disable timeline comment notifications through their notification preferences and receive no notifications when disabled.
- **SC-005**: Email notifications contain sufficient context (event name, commenter, comment preview, link) for recipients to understand and act on the notification without opening the application.
- **SC-006**: In-app notifications display correctly in the user's notification center with appropriate metadata and navigation links to the timeline event.
- **SC-007**: The feature integrates seamlessly with existing notification infrastructure without breaking existing notification flows or requiring migration of historical data.
