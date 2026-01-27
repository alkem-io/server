# Research: Timeline Event Comment Notification

**Feature**: 015-timeline-comment-notification
**Phase**: 0 - Outline & Research
**Date**: 2025-11-05

## Purpose

Resolve all technical unknowns and clarifications identified in the Technical Context section of the implementation plan, and research existing patterns to ensure consistent implementation.

## Research Tasks Completed

### 1. Notification Infrastructure Pattern

**Question**: What is the established pattern for adding comment-based notifications to entity rooms?

**Research Findings**:

- Analyzed `SPACE_COLLABORATION_CALLOUT_COMMENT` implementation (callout comment notifications)
- Analyzed `SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT` implementation (post comment notifications)
- Analyzed `PLATFORM_FORUM_DISCUSSION_COMMENT` implementation (forum discussion notifications)
- All follow consistent pattern in `room.resolver.mutations.ts` switch statement for `RoomType`

**Decision**: Follow the established pattern used for callout and forum discussion comments

**Rationale**:

- Proven pattern already in production
- Consistent with existing notification architecture
- Minimal risk - reuses well-tested infrastructure
- Easy to maintain and extend

**Alternatives Considered**:

- Create new notification mechanism → Rejected: Introduces unnecessary complexity
- Use existing calendar event creation notification → Rejected: Different semantic meaning (creation vs. comment)

### 2. User Preference Integration

**Question**: How should the calendar event comment preference be categorized in user settings?

**Research Findings**:

- Examined `IUserSettingsNotificationSpace` interface structure
- Found existing `communityCalendarEvents` preference for calendar event creation notifications
- Verified this follows the Space notification category pattern
- Reviewed migration `1761577546442-CalendarEventNotificationSettings.ts` for calendar event creation preference

**Decision**: Reuse existing setting `communityCalendarEvents` field in `IUserSettingsNotificationSpace` interface

**Rationale**:

- Keeps calendar event notifications grouped together under Space category
- Follows existing preference structure patterns

### 3. Payload Structure

**Question**: What data should be included in the in-app notification payload for calendar event comments?

**Research Findings**:

- Examined `InAppNotificationPayloadSpaceCommunityCalendarEvent` (calendar event creation payload)
- Examined `InAppNotificationPayloadSpaceCollaborationCalloutComment` (callout comment payload pattern)
- Identified that comment payloads typically include: message content, commenter ID, entity context

**Decision**: Extend `InAppNotificationPayloadSpace` base class with calendar event comment-specific fields

**Payload Structure**:

```typescript
{
  type: NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT,
  spaceID: string,           // Inherited from InAppNotificationPayloadSpace
  calendarEventID: string,   // ID of the calendar event
  commentText: string,        // Preview of comment (first 200 chars)
}
```

**Rationale**:

- Provides sufficient context for in-app notification display
- Supports navigation to specific calendar event and comment
- Follows existing payload patterns for comment notifications
- Enables rich notification UI rendering

**Alternatives Considered**:

- Reuse calendar event creation payload → Rejected: Missing comment-specific fields
- Minimal payload (just IDs) → Rejected: Requires additional queries for display

### 4. Recipient Resolution Strategy

**Question**: How should we resolve the calendar event creator for notifications?

**Research Findings**:

- Calendar events have `createdBy` field storing creator's user ID
- `USER_SELF_MANAGEMENT` credential pattern used for direct user notifications
- Examples: `USER_MENTIONED`, `USER_MESSAGE`, `USER_COMMENT_REPLY`

**Decision**: Use `CalendarEvent.createdBy` to identify recipient, query with `USER_SELF_MANAGEMENT` credential

**Implementation Approach**:

```typescript
// In NotificationSpaceAdapter.spaceCommunityCalendarEventComment
1. Extract creatorID from eventData.calendarEvent.createdBy
2. Check if creatorID === commenterID (early return if same person)
3. Pass creatorID as userID parameter to getNotificationRecipientsSpace
4. NotificationRecipientsService uses getUserSelfCriteria(userID)
5. Returns the creator user if they exist and have notifications enabled
```

**Rationale**:

- Leverages existing entity field (`createdBy`)
- No community membership queries needed
- Follows direct user notification pattern
- Simple and efficient (single user lookup)

**Alternatives Considered**:

- Query all community members → Rejected: Too broad, not the requirement
- Add new creator relationship → Rejected: `createdBy` field already exists

### 5. Notification Event Category

**Question**: Which `NotificationEventCategory` should calendar event comment notifications use?

**Research Findings**:

- Calendar event creation uses: `NotificationEventCategory.SPACE_MEMBER`
- Callout comments use: `NotificationEventCategory.SPACE_MEMBER`
- Forum discussion comments use: `NotificationEventCategory.PLATFORM`

**Decision**: Use `NotificationEventCategory.SPACE_MEMBER`

**Rationale**:

- Calendar events are Space-scoped entities
- Targets community members of the Space
- Consistent with calendar event creation notification
- Aligns with other Space collaboration notifications

**Alternatives Considered**:

- Create new category → Rejected: Unnecessary, existing category fits semantic meaning
- Use SPACE_ADMIN → Rejected: Not admin-only notification

### 6. Authorization and Privilege Requirements

**Question**: What authorization checks are required before sending notifications?

**Research Findings**:

- Direct user notifications (mentions, messages) use `USER_SELF_MANAGEMENT` credential
- No privilege check required for direct user notifications
- User preferences are still respected for channel filtering

**Decision**: Use `USER_SELF_MANAGEMENT` credential with no privilege requirement

**Rationale**:

- Calendar event creator is the sole recipient (direct notification)
- No authorization policy check needed for notifying a specific user
- Follows existing pattern for `USER_MENTIONED`, `USER_MESSAGE`, etc.
- User preferences still control delivery (in-app/email)

**Alternatives Considered**:

- Require READ privilege on Space → Rejected: Creator may have left the space but should still be notified
- No credential check → Rejected: Need to validate user exists

### 7. Email Notification Payload

**Question**: What should the email notification contain?

**Research Findings**:

- Examined `NotificationExternalAdapter.buildSpaceCommunityCalendarEventCreatedPayload`
- Email payloads include: Space context, entity details, action description, navigation URL
- Standard pattern: recipient list, email template variables, triggeredBy user

**Decision**: Create email payload method in `NotificationExternalAdapter`

**Email Payload Fields**:

```typescript
{
  emailRecipients: IUser[],
  triggeredBy: string,
  space: {
    id: string,
    displayName: string,
    url: string
  },
  calendarEvent: {
    id: string,
    displayName: string,
    url: string
  },
  comment: {
    text: string,
    senderName: string
  }
}
```

**Rationale**:

- Provides actionable information in email
- Includes navigation links for engagement
- Follows established email payload patterns
- Enables template-based email rendering

**Alternatives Considered**:

- Minimal email (just title) → Rejected: Poor user experience
- Full comment text → Rejected: Email brevity concerns, potential PII issues

## Summary

All technical unknowns resolved. Implementation can proceed with:

- Clear notification event flow pattern (Room → Event Service → Adapter)
- Defined payload structures for in-app and email channels
- Reuse User preference integration strategy
- Authorization approach leveraging existing Space membership checks
- Consistent naming and categorization with platform standards

**No blocking issues identified.** Phase 1 (Design & Contracts) ready to proceed.
