# Quickstart Guide: Timeline Event Comment Notification

**Feature**: 013-timeline-comment-notification
**Date**: 2025-11-05
**Target Audience**: Developers implementing the feature

## Overview

This guide provides step-by-step instructions for implementing the timeline event comment notification feature. Follow these steps in order to ensure proper integration with existing notification infrastructure.

## Prerequisites

- Development environment set up per `docs/Developing.md`
- Local services running: `pnpm run start:services`
- Familiarity with `docs/Notifications.md`

## Implementation Steps

### Phase 1: Add Notification Event Enum

**File**: `src/common/enums/notification.event.ts`

```typescript
export enum NotificationEvent {
  // ... existing events
  SPACE_COMMUNITY_CALENDAR_EVENT_CREATED = 'SPACE_COMMUNITY_CALENDAR_EVENT_CREATED',
  SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT = 'SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT', // ADD THIS

  // User notifications
  USER_SPACE_COMMUNITY_INVITATION = 'USER_SPACE_COMMUNITY_INVITATION',
  // ... rest of events
}
```

**Verify**: Run `pnpm run schema:print` - should see new enum value in schema

---

### Phase 2: Create Input DTO

**File**: `src/services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.calendar.event.comment.ts`

```typescript
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCommunityCalendarEventComment
  extends NotificationInputBase {
  calendarEvent: ICalendarEvent;
  comments: IRoom;
  commentSent: IMessage;
}
```

**Verify**: TypeScript compilation succeeds

---

### Phase 3: Create In-App Notification Payload

**File**: `src/platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.calendar.event.comment.ts`

```typescript
import { Field, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';
import { NotificationEventPayload } from '@platform/in-app-notification-payload/notification.event.payload';

@ObjectType('InAppNotificationPayloadSpaceCommunityCalendarEventComment', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityCalendarEventComment extends InAppNotificationPayloadSpace {
  type!: NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT;

  @Field(() => UUID, {
    description: 'ID of the calendar event that was commented on.',
  })
  calendarEventID!: string;

  @Field(() => String, {
    description: 'Preview text of the comment (first 200 characters).',
  })
  commentText!: string;
}
```

**File**: `src/platform/in-app-notification-payload/notification.event.payload.ts`

```typescript
export enum NotificationEventPayload {
  // ... existing payloads
  SPACE_COMMUNITY_CALENDAR_EVENT = 'SPACE_COMMUNITY_CALENDAR_EVENT',
  SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT = 'SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT', // ADD THIS
  // ... rest of payloads
}
```

**Verify**: Run `pnpm run schema:print` - should see new type in schema

---

### Phase 4: Create Field Resolver

**File**: `src/platform/in-app-notification-payload/field-resolvers/space/in.app.notification.payload.space.community.calendar.event.comment.resolver.fields.ts`

```typescript
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { InAppNotificationPayloadSpaceCommunityCalendarEventComment } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.calendar.event.comment';

@Resolver(() => InAppNotificationPayloadSpaceCommunityCalendarEventComment)
export class InAppNotificationPayloadSpaceCommunityCalendarEventCommentResolverFields {
  constructor(private calendarEventService: CalendarEventService) {}

  @ResolveField('calendarEvent', () => ICalendarEvent, {
    nullable: true,
    description: 'The calendar event that was commented on.',
  })
  async calendarEvent(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunityCalendarEventComment
  ): Promise<ICalendarEvent | null> {
    try {
      return await this.calendarEventService.getCalendarEventOrFail(
        payload.calendarEventID
      );
    } catch (error) {
      return null;
    }
  }
}
```

**Register in Module**: `src/platform/in-app-notification-payload/in.app.notification.payload.module.ts`

```typescript
import { InAppNotificationPayloadSpaceCommunityCalendarEventCommentResolverFields } from './field-resolvers/space/in.app.notification.payload.space.community.calendar.event.comment.resolver.fields';

@Module({
  imports: [
    CalendarEventModule, // Add if not present
    // ... other imports
  ],
  providers: [
    InAppNotificationPayloadSpaceCommunityCalendarEventCommentResolverFields, // ADD THIS
    // ... other providers
  ],
})
export class InAppNotificationPayloadModule {}
```

**Update Interface Resolver**: `src/platform/in-app-notification-payload/in.app.notification.payload.interface.ts`

```typescript
import { InAppNotificationPayloadSpaceCommunityCalendarEventComment } from './dto/space/notification.in.app.payload.space.community.calendar.event.comment';

@InterfaceType('InAppNotificationPayload', {
  resolveType(payload) {
    switch (payload.type) {
      // ... existing cases
      case NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT:
        return InAppNotificationPayloadSpaceCommunityCalendarEvent;
      case NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT: // ADD THIS
        return InAppNotificationPayloadSpaceCommunityCalendarEventComment;
      // ... other cases
    }
  },
})
export abstract class IInAppNotificationPayload {
  @Field(() => NotificationEventPayload)
  type!: NotificationEventPayload;
}
```

**Verify**: GraphQL schema resolves correctly; run `pnpm build`

---

### Phase 5: Update Notification Recipients Service

**File**: `src/services/api/notification-recipients/notification.recipients.service.ts`

**A. Add to channel settings switch**:

```typescript
private getChannelsSettingsForEvent(
  eventType: NotificationEvent,
  notificationSettings: IUserSettingsNotification
): IUserSettingsNotificationChannels {
  switch (eventType) {
    // ... existing cases
    case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_CREATED:
    case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT:  // ADD THIS
      return notificationSettings.space.communityCalendarEvents;
    // ... other cases
  }
}
```

**B. Add to privilege/credential criteria switch**:

```typescript
private async getPrivilegeRequiredCredentialCriteria(
  eventType: NotificationEvent,
  spaceID?: string,
  // ... other params
): Promise<{
  privilegeRequired: AuthorizationPrivilege | undefined;
  credentialCriteria: CredentialsSearchInput[];
}> {
  switch (eventType) {
    // ... existing cases
    case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_CREATED:
    case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT: {  // ADD THIS
      privilegeRequired = AuthorizationPrivilege.READ;
      credentialCriteria = this.getSpaceMembershipCredentialCriteria(spaceID);
      break;
    }
    // ... other cases
  }
}
```

**C. Add to authorization policy switch**:

```typescript
private async getAuthorizationPolicy(
  eventType: NotificationEvent,
  spaceID?: string,
  // ... other params
): Promise<IAuthorizationPolicy> {
  switch (eventType) {
    // ... existing cases
    case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_CREATED:
    case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT: {  // ADD THIS
      return await this.spaceAuthorizationService.getSpaceAuthorizationPolicyOrFail(
        spaceID!
      );
    }
    // ... other cases
  }
}
```

**Verify**: Service compiles without errors

---

### Phase 6: Add Notification Adapter Method

**File**: `src/services/adapters/notification-adapter/notification.space.adapter.ts`

**Import the DTO**:

```typescript
import { NotificationInputCommunityCalendarEventComment } from './dto/space/notification.dto.input.space.community.calendar.event.comment';
import { InAppNotificationPayloadSpaceCommunityCalendarEventComment } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.calendar.event.comment';
```

**Add method** (after `spaceCommunityCalendarEventCreated`):

```typescript
public async spaceCommunityCalendarEventComment(
  eventData: NotificationInputCommunityCalendarEventComment,
  spaceID: string
): Promise<void> {
  const event = NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT;

  const space = await this.spaceLookupService.getSpaceOrFail(spaceID, {
    relations: {
      about: {
        profile: true,
      },
    },
  });

  const recipients = await this.getNotificationRecipientsSpace(
    event,
    eventData,
    space.id
  );

  // Exclude the commenter from both email and in-app recipients
  const commenterID = eventData.triggeredBy;
  const emailRecipientsExcludingCommenter = recipients.emailRecipients.filter(
    recipient => recipient.id !== commenterID
  );
  const inAppRecipientsExcludingCommenter = recipients.inAppRecipients.filter(
    recipient => recipient.id !== commenterID
  );

  // Send email notifications
  if (emailRecipientsExcludingCommenter.length > 0) {
    const payload =
      await this.notificationExternalAdapter.buildSpaceCommunityCalendarEventCommentPayload(
        event,
        eventData.triggeredBy,
        emailRecipientsExcludingCommenter,
        space,
        eventData.calendarEvent,
        eventData.commentSent
      );
    this.notificationExternalAdapter.sendExternalNotifications(
      event,
      payload
    );
  }

  // Send in-app notifications
  const inAppReceiverIDs = inAppRecipientsExcludingCommenter.map(
    recipient => recipient.id
  );
  if (inAppReceiverIDs.length > 0) {
    const commentPreview = eventData.commentSent.message.substring(0, 200);
    const inAppPayload: InAppNotificationPayloadSpaceCommunityCalendarEventComment =
      {
        type: NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT,
        spaceID: space.id,
        calendarEventID: eventData.calendarEvent.id,
        calendarEventTitle: eventData.calendarEvent.profile.displayName,
        commentText: commentPreview,
      };

    await this.notificationInAppAdapter.sendInAppNotifications(
      NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT,
      NotificationEventCategory.SPACE_MEMBER,
      eventData.triggeredBy,
      inAppReceiverIDs,
      inAppPayload
    );
  }
}
```

**Verify**: Adapter compiles without errors

---

### Phase 8: Add External Email Payload Builder

**File**: `src/services/adapters/notification-external-adapter/notification.external.adapter.ts`

**Add method** (after `buildSpaceCommunityCalendarEventCreatedPayload`):

```typescript
async buildSpaceCommunityCalendarEventCommentPayload(
  eventType: NotificationEvent,
  triggeredBy: string,
  recipients: IUser[],
  space: ISpace,
  calendarEvent: ICalendarEvent,
  comment: IMessage
): Promise<any> {
  const basePayload = await this.buildBaseEventPayload(
    eventType,
    triggeredBy,
    recipients
  );

  const commenter = await this.userLookupService.getUserOrFail(comment.sender);
  const commentPreview = comment.message.substring(0, 200);

  const payload = {
    ...basePayload,
    space: {
      id: space.id,
      displayName: space.profile.displayName,
      url: `${this.platformUrl}/spaces/${space.nameID}`,
    },
    calendarEvent: {
      id: calendarEvent.id,
      displayName: calendarEvent.profile.displayName,
      url: `${this.platformUrl}/spaces/${space.nameID}/calendar/events/${calendarEvent.id}`,
    },
    comment: {
      text: commentPreview,
      senderName: commenter.profile.displayName,
      senderUrl: `${this.platformUrl}/user/${commenter.nameID}`,
    },
  };

  return payload;
}
```

**Verify**: External adapter compiles without errors

---

### Phase 8: Add Room Event Handler

**File**: `src/domain/communication/room/room.service.events.ts`

**Import the DTO and CalendarEvent types**:

```typescript
import { NotificationInputCommunityCalendarEventComment } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.calendar.event.comment';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
```

**Add method** (after `processNotificationForumDiscussionComment`):

```typescript
public async processNotificationCalendarEventComment(
  calendarEvent: ICalendarEvent,
  room: IRoom,
  message: IMessage,
  agentInfo: AgentInfo
) {
  // Send the notification
  const notificationInput: NotificationInputCommunityCalendarEventComment = {
    triggeredBy: agentInfo.userID,
    calendarEvent,
    comments: room,
    commentSent: message,
  };

  // Get space ID from calendar event
  const space = await this.calendarEventService.getSubspace(calendarEvent);
  if (!space) {
    this.logger.warn?.(
      `Unable to find space for calendar event: ${calendarEvent.id}`,
      LogContext.NOTIFICATIONS
    );
    return;
  }

  await this.notificationSpaceAdapter.spaceCommunityCalendarEventComment(
    notificationInput,
    space.id
  );
}
```

**Update constructor** (add CalendarEventService):

```typescript
constructor(
  // ... existing injections
  private calendarEventService: CalendarEventService,  // ADD THIS
  @Inject(WINSTON_MODULE_NEST_PROVIDER)
  private readonly logger: LoggerService
) {}
```

**Update module imports**: `src/domain/communication/room/room.module.ts`

```typescript
import { CalendarEventModule } from '@domain/timeline/event/event.module';

@Module({
  imports: [
    CalendarEventModule, // ADD THIS
    // ... other imports
  ],
  // ... providers, exports
})
export class RoomModule {}
```

**Verify**: Service compiles; dependency injection works

---

### Phase 9: Integrate into Room Resolver

**File**: `src/domain/communication/room/room.resolver.mutations.ts`

**In `sendMessageToRoom` method, update the `CALENDAR_EVENT` case**:

```typescript
case RoomType.CALENDAR_EVENT:
  const calendarEvent = await this.roomResolverService.getCalendarEventForRoom(
    messageData.roomID
  );

  await this.roomMentionsService.processNotificationMentions(
    mentions,
    room,
    message,
    agentInfo
  );

  // ADD THIS:
  await this.roomServiceEvents.processNotificationCalendarEventComment(
    calendarEvent,
    room,
    message,
    agentInfo
  );

  break;
```

**Verify**: Resolver compiles correctly

---

## Testing

- Only manual testing for this feature

## Validation Checklist

- [ ] TypeScript compiles without errors (`pnpm build`)
- [ ] Schema generates correctly (`pnpm run schema:print`)
- [ ] Schema diff shows only additions (`pnpm run schema:diff`)
- [ ] In-app notifications delivered to eligible recipients
- [ ] Email notifications delivered to eligible recipients
- [ ] Comment author excluded from notifications
- [ ] Non-community members excluded from notifications
- [ ] Notification preferences respected (email/in-app toggles)
- [ ] GraphQL queries return new fields

---

## Troubleshooting

### Issue: "Cannot find module" errors

**Solution**: Ensure all imports use correct paths from `tsconfig.json` aliases

### Issue: GraphQL schema not updating

**Solution**:

1. Delete `dist/` folder
2. Run `pnpm build`
3. Run `pnpm run schema:print`

### Issue: No notifications received

**Solution**:

1. Check RoomType is `CALENDAR_EVENT`
2. Verify user is Space member
3. Check notification preferences enabled
4. Review logs for errors (`LogContext.NOTIFICATIONS`)

### Issue: Comment author receives notification

**Solution**: Verify filtering logic in adapter excludes `triggeredBy` user

---

## Next Steps

After completing implementation:

1. Run full test suite: `pnpm test:ci`
2. Generate schema baseline: `pnpm run schema:print && pnpm run schema:sort`
3. Create PR with schema diff artifact
4. Update documentation: `docs/Notifications.md` (add new event to list)
5. Coordinate with frontend team for UI changes

---

## Reference Files

- Notification pattern: `docs/Notifications.md`
- Calendar event creation notification: Search for `SPACE_COMMUNITY_CALENDAR_EVENT_CREATED`
- Callout comment notification: Search for `SPACE_COLLABORATION_CALLOUT_COMMENT`
- Forum discussion comment notification: Search for `PLATFORM_FORUM_DISCUSSION_COMMENT`

---

**Estimated Implementation Time**: 4-6 hours for experienced developer familiar with codebase
