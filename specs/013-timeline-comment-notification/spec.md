# Feature Specification: Timeline Event Comment Notification

**Feature Branch**: `013-timeline-comment-notification`
**Created**: 2025-11-05
**Status**: Draft
**Input**: User description: "Implement new notification event for timeline comments"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Calendar Event Creator Receives Comment Notification (Priority: P1)

When a community member comments on a calendar event, the creator of that calendar event should receive a notification (both in-app and email). This keeps event creators engaged with discussions about their events and ensures they don't miss important event-related conversations.

**Why this priority**: This is the core functionality that directly addresses the stated purpose of keeping event creators aware of discussions on their calendar events. Without this, the feature doesn't exist.

**Independent Test**: Can be fully tested by creating a calendar event, having another member post a comment, and verifying that the event creator receives notifications through both channels (in-app and email). Delivers immediate value by enabling basic calendar event comment awareness for creators.

**Acceptance Scenarios**:

1. **Given** Alice creates a calendar event in a Space community, **When** Bob posts a comment on the calendar event, **Then** Alice receives both in-app and email notifications about Bob's comment.

2. **Given** Alice creates a calendar event, **When** Alice posts a comment on her own calendar event, **Then** Alice does NOT receive a notification about her own comment.

3. **Given** Alice creates a calendar event and has notification preferences enabled, **When** multiple members (Bob, Carol) comment on the event, **Then** Alice receives a separate notification for each comment.

---

### User Story 2 - Notification Preference Respect (Priority: P2)

The notification system must honor the event creator's notification preferences for calendar event comments. The creator can control whether they receive notifications via in-app, email, both, or neither channel, giving them control over their notification volume.

**Why this priority**: Essential for user experience and preventing notification fatigue, but depends on P1 existing first. Users need the ability to opt out or customize their notification channels.

**Independent Test**: Can be tested independently by configuring various notification preference combinations for the event creator and verifying notifications are sent only through enabled channels. Demonstrates that the system respects user preferences.

**Acceptance Scenarios**:

1. **Given** Alice creates a calendar event and has disabled all calendar event notifications in her preferences, **When** Bob comments on the calendar event, **Then** Alice receives no notification.

2. **Given** Alice creates a calendar event and has enabled only in-app notifications for calendar events, **When** Bob comments on the calendar event, **Then** Alice receives only an in-app notification (no email).

3. **Given** Alice creates a calendar event with no specific calendar event preference set, **When** Bob comments on the calendar event, **Then** default notification behavior applies (both channels enabled).

---

### User Story 3 - Authorization Validation (Priority: P3)

The notification system validates that the calendar event creator exists and has valid user credentials before sending notifications, ensuring system integrity and preventing errors.

**Why this priority**: Important for correctness and system stability, but builds on top of P1 and P2. This is a validation/safety concern rather than core functionality.

**Independent Test**: Can be tested by attempting to trigger notifications with various edge cases (missing creator, deleted user, invalid credentials) and verifying graceful handling.

**Acceptance Scenarios**:

1. **Given** Alice creates a calendar event and later her account is deleted, **When** Bob comments on the calendar event, **Then** the system handles gracefully without attempting to send notifications to the deleted user.

2. **Given** Alice creates a calendar event with valid user credentials, **When** Bob comments on the calendar event, **Then** the system validates Alice's user identity before sending notifications.

3. **Given** a calendar event exists without a valid creator reference, **When** a comment is posted, **Then** the system logs the error and does not crash or send invalid notifications.

---

### Edge Cases

- What happens when a calendar event creator's account is deleted? (No notifications sent, system handles gracefully)
- How does the system handle a comment posted by the event creator themselves? (Early return: no notification sent to avoid self-notification)
- What happens if the calendar event is deleted while notifications are being processed? (System handles gracefully via error handling in entity lookups)
- How are notifications handled for calendar events in archived Spaces? (Follow existing Space archival notification rules)
- What happens when a user has conflicting notification preferences (e.g., platform-level vs Space-level)? (Follow existing preference hierarchy: most specific wins)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST define a new notification event type `SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT` in the NotificationEvent enum.
- **FR-002**: System MUST trigger the notification when a comment is created within a calendar event's comment room (Room entity with type CALENDAR_EVENT).
- **FR-003**: System MUST identify the eligible notification recipient as the creator of the calendar event (stored in `CalendarEvent.createdBy` field).
- **FR-004**: System MUST exclude the comment author from receiving notifications about their own comment (i.e., if creator comments on their own event, no notification is sent).
- **FR-005**: System MUST respect the creator's notification preferences for the calendar event notification type (in-app and/or email channels).
- **FR-006**: System MUST send in-app notifications to the creator if they have in-app channel enabled for calendar event notifications.
- **FR-007**: System MUST send email notifications to the creator if they have email channel enabled for calendar event notifications.
- **FR-008**: System MUST include relevant context in notifications: commenter identity, calendar event details, comment preview, and link to the calendar event.
- **FR-009**: System MUST integrate with existing notification infrastructure (NotificationSpaceAdapter, NotificationRecipientsService, notification payload builders).
- **FR-010**: System MUST validate that the calendar event creator user exists and has valid credentials before attempting to send notifications.

### Key Entities _(include if feature involves data)_

- **NotificationEvent**: Enum value representing the new notification type for calendar event comments; will be added to existing notification event registry.
- **CalendarEvent (Timeline Event)**: The calendar event entity that contains a comments room where the triggering comment is posted; already exists with relationship to Room and `createdBy` field identifying the creator.
- **Room**: Communication room associated with a calendar event where comments are posted; already exists with type CALENDAR_EVENT.
- **Message**: The comment message posted in the calendar event's room; triggers the notification flow.
- **User (Creator)**: The user who created the calendar event; identified by `CalendarEvent.createdBy` field; the sole recipient of comment notifications.
- **User Notification Preferences**: Existing user settings that control notification channel enablement (in-app, email) for various notification types; will use existing `communityCalendarEvents` preference.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: When a comment is posted on a calendar event, the event creator receives a notification within 5 seconds.
- **SC-002**: The calendar event creator receives notifications according to their channel preferences when a comment is posted (email, in-app, both, or neither).
- **SC-003**: Zero notifications are sent to users other than the calendar event creator.
- **SC-004**: Users can disable calendar event notifications through their notification preferences and receive no comment notifications when disabled.
- **SC-005**: Email notifications contain sufficient context (event name, commenter, comment preview, link) for the creator to understand and act on the notification without opening the application.
- **SC-006**: In-app notifications display correctly in the creator's notification center with appropriate metadata and navigation links to the calendar event.
- **SC-007**: The feature integrates seamlessly with existing notification infrastructure without breaking existing notification flows or requiring migration of historical data.
