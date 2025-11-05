# Data Model: Timeline Event Comment Notification

**Feature**: 013-timeline-comment-notification
**Phase**: 1 - Design & Contracts
**Date**: 2025-11-05

## Overview

This document defines the data structures and entities involved in the timeline event comment notification feature. The feature extends existing entities rather than creating new ones.

## Existing Entities (Reference Only)

### CalendarEvent (Timeline Event)

**Location**: `src/domain/timeline/event/event.entity.ts`

```typescript
@Entity()
export class CalendarEvent extends NameableEntity implements ICalendarEvent {
  type: CalendarEventType; // Event type (webinar, meetup, etc.)
  createdBy: string; // User ID who created the event (UUID)
  comments: Room; // Room for event comments (RoomType.CALENDAR_EVENT)
  calendar?: Calendar; // Parent calendar
  profile: IProfile; // Display name, description, visual
  startDate: Date;
  wholeDay: boolean;
  multipleDays: number;
  // ... other fields
}
```

**Relationships**:

- `comments`: OneToOne with `Room` (cascade: true, eager: true)
- `calendar`: ManyToOne with `Calendar`
- `profile`: OneToOne with `Profile`

**Validation Rules**: Existing validation preserved (no changes)

### Room (Comment Container)

**Location**: `src/domain/communication/room/room.entity.ts`

```typescript
@Entity()
export class Room extends BaseEntity implements IRoom {
  type: RoomType; // Enum: includes CALENDAR_EVENT
  externalRoomID: string; // Matrix room ID
  messagesCount: number;
  // ... other fields
}
```

**Relevant Type**: `RoomType.CALENDAR_EVENT` - used for calendar event comment rooms

### Message (Comment)

**Location**: `src/domain/communication/message/message.entity.ts`

```typescript
export class Message implements IMessage {
  id: string;
  message: string; // Comment text
  sender: string; // User ID (UUID)
  timestamp: number;
  threadID?: string;
  reactions: IReaction[];
  // ... other fields
}
```

## New Data Transfer Objects

### 1. NotificationInputCommunityCalendarEventComment

**Location**: `src/services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.calendar.event.comment.ts`

**Purpose**: Input DTO for calendar event comment notification event data

```typescript
export interface NotificationInputCommunityCalendarEventComment
  extends NotificationInputBase {
  calendarEvent: ICalendarEvent; // The calendar event being commented on
  comments: IRoom; // The room containing the comment
  commentSent: IMessage; // The comment message that was sent
}
```

**Extends**: `NotificationInputBase` (provides `triggeredBy: string`)

**Validation**: None required (interfaces validated by calling code)

**Usage Flow**:

1. Created in `RoomServiceEvents.processNotificationCalendarEventComment`
2. Passed to `NotificationSpaceAdapter.spaceCommunityCalendarEventComment`
3. Used to extract data for email and in-app payloads

---

### 2. InAppNotificationPayloadSpaceCommunityCalendarEventComment

**Location**: `src/platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.calendar.event.comment.ts`

**Purpose**: GraphQL type for in-app notification payload

```typescript
@ObjectType('InAppNotificationPayloadSpaceCommunityCalendarEventComment', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityCalendarEventComment extends InAppNotificationPayloadSpace {
  @Field(() => UUID, {
    description: 'ID of the calendar event that was commented on.',
  })
  calendarEventID!: string;

  @Field(() => String, {
    description: 'Display title of the calendar event.',
  })
  calendarEventTitle!: string;

  @Field(() => UUID, {
    description: 'ID of the comment message.',
  })
  commentID!: string;

  @Field(() => String, {
    description: 'Preview text of the comment (first 200 characters).',
  })
  commentText!: string;

  @Field(() => UUID, {
    description: 'ID of the user who posted the comment.',
  })
  commenterID!: string;
}
```

**Extends**: `InAppNotificationPayloadSpace` (provides `type`, `spaceID`)

**GraphQL Type**: Maps to `InAppNotificationPayloadSpaceCommunityCalendarEventComment` in schema

**Field Resolvers**: Registered in `InAppNotificationPayloadSpaceCommunityCalendarEventCommentResolverFields`

---

### 3. Email Notification Payload (Interface)

**Location**: Defined inline in `NotificationExternalAdapter.buildSpaceCommunityCalendarEventCommentPayload`

**Purpose**: Structure for email template rendering

```typescript
interface NotificationEventPayloadSpaceCommunityCalendarEventComment {
  emailRecipients: IUser[];
  triggeredBy: string;
  space: {
    id: string;
    displayName: string;
    url: string;
  };
  calendarEvent: {
    id: string;
    displayName: string;
    url: string;
  };
  comment: {
    text: string; // First 200 chars of comment
    senderName: string; // Display name of commenter
    senderUrl: string; // Profile URL of commenter
  };
}
```

**Usage**: Built in `NotificationExternalAdapter`, sent to external notification service

## Enum Extensions

### NotificationEvent Enum

**Location**: `src/common/enums/notification.event.ts`

**Addition**:

```typescript
export enum NotificationEvent {
  // ... existing events
  SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT = 'SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT',
}
```

**Purpose**: Identifies the notification event type throughout the system

---

### NotificationEventPayload Enum

**Location**: `src/platform/in-app-notification-payload/notification.event.payload.ts`

**Addition**:

```typescript
export enum NotificationEventPayload {
  // ... existing payloads
  SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT = 'SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT',
}
```

**Purpose**: Discriminator for GraphQL union type resolution

## User Settings Extension

- Reuse existing setting: communityCalendarEvents

## Database Schema Changes

### user_settings Table

**Column**: `notification` (JSON column - no schema change)

**Migration**: no

## State Transitions

### Notification Flow State Machine

```
[User posts comment to CalendarEvent Room]
         ↓
[RoomResolverMutations.sendMessageToRoom]
         ↓
    (Room type = CALENDAR_EVENT)
         ↓
[RoomServiceEvents.processNotificationCalendarEventComment]
         ↓
[NotificationSpaceAdapter.spaceCommunityCalendarEventComment]
         ↓
    ┌────────────────┴─────────────────┐
    ↓                                  ↓
[Get recipients]           [Build payloads]
    ↓                                  ↓
[Filter by preferences]    [Email payload]
    ↓                      [In-app payload]
[Exclude comment author]             ↓
    ↓                                  ↓
    └─────────────┬──────────────────┘
                  ↓
         [Send notifications]
              ↓         ↓
         [Email]   [In-app DB write]
```

**States**: N/A (stateless notification delivery)

**Transitions**: Unidirectional flow from comment creation to notification delivery

## Validation Rules

### Input Validation

1. **NotificationInputCommunityCalendarEventComment**:
   - `triggeredBy`: Must be valid UUID (validated by caller)
   - `calendarEvent`: Must exist and have loaded `profile` relation
   - `comments`: Must exist and be of type `CALENDAR_EVENT`
   - `commentSent`: Must exist with `id`, `message`, `sender` fields

2. **User Preference Values**:
   - `email`: boolean (true/false)
   - `inApp`: boolean (true/false)
   - At least one channel should be enabled (not enforced, user choice)

### Business Rules

1. **Recipient Eligibility**:
   - Must be a member of the Space community (`SPACE_MEMBER` credential)
   - Must have `READ` privilege on Space authorization policy
   - Must have notification preference enabled (email and/or in-app)
   - Must NOT be the comment author (`triggeredBy` user excluded)

2. **Authorization**:
   - Recipients validated against Space authorization policy
   - Existing `NotificationRecipientsService` handles privilege checks
   - No additional authorization logic required

## Entity Relationships Diagram

```
Space (1) ─────┐
               │
               ├─ has ─> Community (1)
               │              │
               │              └─ has members ─> User (*)
               │
               └─ has ─> Timeline (1)
                              │
                              └─ has ─> Calendar (1)
                                           │
                                           └─ has ─> CalendarEvent (*)
                                                          │
                                                          └─ has ─> Room (1) [type: CALENDAR_EVENT]
                                                                       │
                                                                       └─ has ─> Message (*) [comments]

[When Message created in CalendarEvent's Room]
    ↓
[Notification sent to Community members]
    (filtered by preferences & authorization)
```

## Data Flow Summary

1. **Trigger**: User posts `Message` to `Room` (type: `CALENDAR_EVENT`)
2. **Resolution**: `Room` → `CalendarEvent` → `Space` → `Community`
3. **Recipients**: Community members with appropriate credentials & preferences
4. **Filtering**: Exclude comment author, respect user preferences, check authorization
5. **Delivery**: Email and/or in-app notification to eligible recipients
6. **Payload**: Contains calendar event context, comment preview, navigation links

**No new database tables or columns required.** All changes are code-level additions to existing structures and JSON field values.
