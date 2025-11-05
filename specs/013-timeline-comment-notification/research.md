# Research: Timeline Event Comment Notification

**Feature**: 013-timeline-comment-notification
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

**Question**: How should we resolve community members for a calendar event?

**Research Findings**:

- Examined `CommunityResolverService` methods
- Found `getCommunityFromCalendarEventOrFail` does not exist yet
- Calendar events belong to a Space's Timeline → Calendar → CalendarEvent hierarchy
- Space has direct Community relationship
- `spaceCommunityCalendarEventCreated` method fetches Space directly by ID

**Decision**: Resolve Space from CalendarEvent, then get Community from Space

**Implementation Approach**:

```typescript
// In RoomServiceEvents
1. Get CalendarEvent from Room (via RoomResolverService.getCalendarEventForRoom)
2. Get Space from CalendarEvent (via CalendarEventService.getSubspace or timeline traversal)
3. Pass Space ID to NotificationSpaceAdapter
4. Adapter resolves Community via Space's community relationship
5. NotificationRecipientsService filters by SPACE_MEMBER credential
```

**Rationale**:

- Leverages existing entity relationships
- No new repository methods required
- Follows established pattern from calendar event creation notification
- Works for both root Spaces and sub-spaces

**Alternatives Considered**:

- Add new `getCommunityFromCalendarEventOrFail` method → Rejected: Unnecessary indirection
- Direct CalendarEvent → Community relationship → Rejected: Violates existing entity model

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

- Examined `notification.recipients.service.ts` authorization patterns
- Calendar event creation requires: `AuthorizationPrivilege.READ` on Space authorization policy
- Community member credential: `AuthorizationCredential.SPACE_MEMBER`
- Existing authorization hierarchy handles Space-level access control

**Decision**: Require `READ` privilege on Space authorization policy with `SPACE_MEMBER` credential

**Rationale**:

- Users already with Space membership have implicit read access to calendar events
- Follows existing calendar event authorization pattern
- No additional privilege escalation needed
- Authorization policy checks handled by `NotificationRecipientsService`

**Alternatives Considered**:

- Require explicit CalendarEvent READ privilege → Rejected: Overly restrictive, adds complexity
- No authorization check → Rejected: Security risk

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
