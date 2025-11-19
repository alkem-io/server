# Notification System Documentation

## Overview

The notification system in Alkemio handles both email and in-app notifications across various platform events. The system is designed to:

- Send targeted notifications based on user preferences and permissions
- Support both email and in-app notification channels
- Filter recipients based on authorization privileges
- Provide a consistent interface for adding new notification types

## Architecture

### Core Components

1. **Notification Adapters** - Handle different entity types (Space, User, Organization, Platform, Virtual Contributor)
2. **External Notification Adapter** - Builds and sends email notifications
3. **In-App Notification Adapter** - Creates and stores in-app notifications
4. **Notification Recipients Service** - Determines who should receive notifications based on settings and privileges
5. **In-App Notification Service** - Manages in-app notification storage and state

### Key Files

- `src/common/enums/notification.event.ts` - Defines all notification event types
- `src/services/api/notification-recipients/notification.recipients.service.ts` - Core recipient filtering logic
- `src/services/adapters/notification-adapter/` - Entity-specific notification handlers
- `src/platform/in-app-notification/` - In-app notification management

## How Notifications Work

### 1. Event Triggering

When an action occurs (e.g., new community member, callout published), the relevant adapter method is called with event data.

### 2. Recipient Resolution

The `NotificationRecipientsService` determines recipients through:

1. **Credential Criteria**: Identifies potential recipients based on their roles/credentials
2. **Notification Settings**: Filters users based on their email/in-app preferences for the specific event
3. **Authorization Check**: Verifies users have required privileges to receive the notification

### 3. Notification Dispatch

- **Email**: `NotificationExternalAdapter` builds payload and sends external notifications
- **In-App**: `NotificationInAppAdapter` creates notifications and publishes via subscriptions

### 4. In-App Notification Storage

In-app notifications are stored in the `in_app_notification` table with:

- Event type and category
- Recipient and trigger information
- Payload with event-specific data
- State management (unread/read)

## Notification Event Categories

## Notification Event Categories

Events are categorized by their target audience:

- **PLATFORM** - Platform-wide notifications
- **SPACE_ADMIN** - Space administrators
- **SPACE_MEMBER** - Space members
- **ORGANIZATION** - Organization-related
- **USER** - User-specific notifications
- **VIRTUAL_CONTRIBUTOR** - Virtual contributor notifications

## Current Notification Events

### Platform Notifications

- `PLATFORM_ADMIN_USER_PROFILE_CREATED` - Admin notification when user profile is created
- `PLATFORM_ADMIN_USER_PROFILE_REMOVED` - Admin notification when user profile is removed
- `PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED` - Admin notification when user's global role changes
- `PLATFORM_ADMIN_SPACE_CREATED` - Admin notification when new space is created
- `PLATFORM_FORUM_DISCUSSION_CREATED` - General notification for new forum discussions
- `PLATFORM_FORUM_DISCUSSION_COMMENT` - Notification for forum discussion comments

### Organization Notifications

- `ORGANIZATION_ADMIN_MESSAGE` - Admin messages to organization members
- `ORGANIZATION_ADMIN_MENTIONED` - When admin is mentioned in organization context
- `ORGANIZATION_MESSAGE_SENDER` - Copy of message sent notification

### Space Notifications

- `SPACE_ADMIN_COMMUNITY_APPLICATION` - Admin notification for community applications
- `SPACE_ADMIN_COLLABORATION_CALLOUT_CONTRIBUTION` - Admin notification for callout contributions
- `SPACE_LEAD_COMMUNICATION_MESSAGE` - Communication messages to space leads
- `SPACE_ADMIN_COMMUNITY_NEW_MEMBER` - Admin notification for new community members
- `SPACE_ADMIN_VIRTUAL_CONTRIBUTOR_COMMUNITY_INVITATION_DECLINED` - Admin notification when a virtual contributor invitation is declined
- `SPACE_COMMUNITY_INVITATION_USER_PLATFORM` - Platform-level space invitations
- `SPACE_COMMUNICATION_UPDATE` - General space communication updates
- `SPACE_COLLABORATION_CALLOUT_PUBLISHED` - When callouts are published
- `SPACE_COLLABORATION_CALLOUT_COMMENT` - Comments on callouts
- `SPACE_COLLABORATION_CALLOUT_CONTRIBUTION` - Contributions to callouts
- `SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT` - Comments on post contributions
- `SPACE_COMMUNITY_CALENDAR_EVENT_CREATED` - When a calendar event is created in the space community
- `SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT` - When a comment is posted to a calendar event room
- `SPACE_COMMUNICATION_MESSAGE_SENDER` - Copy of space message sent

### User Notifications

- `USER_SPACE_COMMUNITY_INVITATION` - Direct space community invitations
- `USER_SPACE_COMMUNITY_JOINED` - When user joins a space community
- `USER_SPACE_COMMUNITY_APPLICATION` - User's own community applications
- `USER_SPACE_COMMUNITY_APPLICATION_DECLINED` - When user's space community application is declined
- `USER_SIGN_UP_WELCOME` - Welcome message for new users
- `USER_MENTIONED` - When user is mentioned
- `USER_MESSAGE` - Direct messages to users
- `USER_COMMENT_REPLY` - Replies to user's comments

### Virtual Contributor Notifications

- `VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION` - Space invitations for virtual contributors

## Adding a New Notification Event

### Step 1: Define the Event Type

Add your new event to `src/common/enums/notification.event.ts`:

```typescript
export enum NotificationEvent {
  // ... existing events
  YOUR_NEW_EVENT = 'YOUR_NEW_EVENT',
}
```

### Step 2: Update Recipient Service

In `notification.recipients.service.ts`:

#### A. Add Channel Settings Mapping

```typescript
private getChannelsSettingsForEvent(
  eventType: NotificationEvent,
  notificationSettings: IUserSettingsNotification
): IUserSettingsNotificationChannels {
  switch (eventType) {
    // ... existing cases
    case NotificationEvent.YOUR_NEW_EVENT:
      return notificationSettings.your.category.yourEventSetting;
    // ...
  }
}
```

#### B. Add Privilege and Credential Criteria

```typescript
private async getPrivilegeRequiredCredentialCriteria(
  eventType: NotificationEvent,
  spaceID?: string,
  userID?: string,
  organizationID?: string,
  virtualContributorID?: string
): Promise<{
  privilegeRequired: AuthorizationPrivilege | undefined;
  credentialCriteria: CredentialsSearchInput[];
}> {
  switch (eventType) {
    // ... existing cases
    case NotificationEvent.YOUR_NEW_EVENT: {
      privilegeRequired = AuthorizationPrivilege.SOME_PRIVILEGE; // or undefined
      credentialCriteria = this.getSomeCredentialCriteria(entityID);
      break;
    }
    // ...
  }
}
```

#### C. Add Authorization Policy (if privilege required)

```typescript
private async getAuthorizationPolicy(
  eventType: NotificationEvent,
  entityID?: string,
  userID?: string,
  organizationID?: string,
  virtualContributorID?: string
): Promise<IAuthorizationPolicy> {
  switch (eventType) {
    // ... existing cases
    case NotificationEvent.YOUR_NEW_EVENT: {
      // Return appropriate authorization policy
      return await this.getRelevantAuthorizationPolicy(entityID);
    }
    // ...
  }
}
```

### Step 3: Create Input DTO

Create an input DTO for your event data:

```typescript
// src/services/adapters/notification-adapter/dto/your-category/notification.dto.input.your.event.ts
export class NotificationInputYourEvent extends NotificationInputBase {
  yourEventData!: SomeType;
  additionalData?: string;
}
```

### Step 4: Create In-App Payload (if needed)

If supporting in-app notifications, create a payload type:

```typescript
// src/platform/in-app-notification-payload/dto/your-category/notification.in.app.payload.your.event.ts
@ObjectType('InAppNotificationPayloadYourEvent', {
  implements: () => IInAppNotificationPayload,
})
export class InAppNotificationPayloadYourEvent
  implements IInAppNotificationPayload
{
  @Field(() => NotificationEventPayload)
  type!: NotificationEventPayload.YOUR_EVENT_PAYLOAD;

  @Field()
  yourEventSpecificField!: string;
}
```

Add to the payload enum in `notification.event.payload.ts`:

```typescript
export enum NotificationEventPayload {
  // ... existing payloads
  YOUR_EVENT_PAYLOAD = 'YOUR_EVENT_PAYLOAD',
}
```

### Step 5: Update Payload Interface Resolver

Add your payload to the resolver in `in.app.notification.payload.interface.ts`:

```typescript
@InterfaceType('InAppNotificationPayload', {
  resolveType(payload) {
    switch (payload.type) {
      // ... existing cases
      case NotificationEventPayload.YOUR_EVENT_PAYLOAD:
        return InAppNotificationPayloadYourEvent;
      // ...
    }
  }
})
```

### Step 6: Build External Payload Method

Add a method to `NotificationExternalAdapter`:

```typescript
async buildYourEventNotificationPayload(
  eventType: NotificationEvent,
  triggeredBy: string,
  recipients: IUser[],
  eventData: YourEventData
): Promise<NotificationEventPayloadYourEvent> {
  const basePayload = await this.buildBaseEventPayload(
    eventType,
    triggeredBy,
    recipients
  );

  const payload: NotificationEventPayloadYourEvent = {
    yourEventSpecificData: eventData.someField,
    ...basePayload,
  };

  return payload;
}
```

### Step 7: Implement Adapter Method

Add a method to the appropriate adapter (Space, User, Organization, Platform, or VirtualContributor):

```typescript
// In NotificationYourCategoryAdapter
public async yourNewEventNotification(
  eventData: NotificationInputYourEvent
): Promise<void> {
  const event = NotificationEvent.YOUR_NEW_EVENT;

  // Get recipients
  const recipients = await this.getNotificationRecipientsYourCategory(
    event,
    eventData,
    eventData.entityID
  );

  // Send email notifications
  if (recipients.emailRecipients.length > 0) {
    const payload = await this.notificationExternalAdapter.buildYourEventNotificationPayload(
      event,
      eventData.triggeredBy,
      recipients.emailRecipients,
      eventData
    );
    this.notificationExternalAdapter.sendExternalNotifications(event, payload);
  }

  // Send in-app notifications
  const inAppReceiverIDs = recipients.inAppRecipients.map(r => r.id);
  if (inAppReceiverIDs.length > 0) {
    const inAppPayload: InAppNotificationPayloadYourEvent = {
      type: NotificationEventPayload.YOUR_EVENT_PAYLOAD,
      yourEventSpecificField: eventData.someField,
    };

    await this.notificationInAppAdapter.sendInAppNotifications(
      NotificationEvent.YOUR_NEW_EVENT,
      NotificationEventCategory.YOUR_CATEGORY,
      eventData.triggeredBy,
      inAppReceiverIDs,
      inAppPayload
    );
  }
}
```

### Step 8: Update User Settings Schema

Ensure the user notification settings interface includes your new event setting in the appropriate category structure.

### Step 9: Database Migration

If you're adding new notification settings or changing the structure, create a migration to update existing user settings.

## Recipient Filtering Logic

The notification system implements a multi-stage filtering process:

1. **Initial Candidate Selection**: Based on credential criteria (roles/permissions)
2. **Settings Filter**: Users must have notifications enabled for the specific event type
3. **Authorization Check**: Users must have required privileges for the specific entity

### Example Flow for Space Callout Published

```typescript
// 1. Get all space members
credentialCriteria = [
  {
    type: AuthorizationCredential.SPACE_MEMBER,
    resourceID: spaceID,
  },
];

// 2. Filter by notification settings
emailRecipients = candidates.filter(
  user =>
    user.settings?.notification &&
    getChannelsSettingsForEvent(event, user.settings.notification).email
);

// 3. Check space-level authorization
privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
authPolicy = await getSpaceAuthorizationPolicy(spaceID);
// Filter users based on privilege
```

## Best Practices

1. **Event Naming**: Use descriptive, hierarchical names (e.g., `SPACE_ADMIN_COMMUNITY_NEW_MEMBER`)
2. **Recipient Filtering**: Always filter out the triggering user from recipients when appropriate
3. **Privilege Checks**: Ensure proper authorization checks for sensitive notifications
4. **Payload Design**: Keep payloads minimal but include necessary data for notification rendering
5. **Error Handling**: Wrap notification sending in try-catch blocks to prevent failures from blocking main operations
6. **Logging**: Add appropriate logging for debugging recipient resolution and notification dispatch
7. **Settings Guard**: Always check `recipient.settings?.notification` exists before calling `getChannelsSettingsForEvent`

## Testing

When adding new notifications:

1. Test recipient resolution with different user permission combinations
2. Verify email and in-app notifications are sent correctly
3. Test notification settings properly filter recipients
4. Ensure proper authorization checks are in place
5. Verify payload data is correctly structured for both channels
6. Test edge cases like missing user settings

For logs add these to your .env file:

```
  LOGGING_CONTEXT_ENABLED=true
  LOGGING_CONTEXT_FILENAME=notification-events.log
  LOGGING_CONTEXT_ID=notifications
```

## Common Issues and Solutions

### Issue: Users with no notification settings receiving errors

**Solution**: Always guard against missing settings:

```typescript
const emailRecipients = candidates.filter(
  recipient =>
    recipient.settings?.notification &&
    this.getChannelsSettingsForEvent(event, recipient.settings.notification)
      .email
);
```

### Issue: Notification not appearing in correct category

**Solution**: Ensure proper `NotificationEventCategory` is used in `sendInAppNotifications`

### Issue: Authorization failures

**Solution**: Verify the correct authorization policy is returned in `getAuthorizationPolicy` method

### Issue: Missing payload types in GraphQL

**Solution**: Ensure payload is added to `resolveType` function in interface resolver

## Email Blacklist Configuration

The notification system supports blacklisting email addresses or domains to prevent certain recipients from receiving email notifications. This is useful for:

- Filtering out test accounts
- Blocking temporary email services
- Preventing notifications to invalid addresses

### Configuration

Email blacklist is configured in `alkemio.yml`:

```yaml
notifications:
  email:
    blacklist:
      domains: ${NOTIFICATIONS_EMAIL_BLACKLIST_DOMAINS}:
      addresses: ${NOTIFICATIONS_EMAIL_BLACKLIST_ADDRESSES}:
```

### Environment Variables

Set via environment variables with comma-separated values:

```bash
# Block entire domains
NOTIFICATIONS_EMAIL_BLACKLIST_DOMAINS=tempmail.com,throwaway.email,example.test

# Block specific email addresses
NOTIFICATIONS_EMAIL_BLACKLIST_ADDRESSES=spam@example.com,noreply@test.com
```

### How It Works

1. When building notification payloads, recipients are filtered through `isEmailBlacklisted()` utility
2. Matching is case-insensitive and trims whitespace
3. For domain blacklisting, only the domain part of the email is checked
4. For address blacklisting, the entire email address must match exactly
5. Blacklisted recipients are silently removed from the recipient list

### Usage Examples

**Block a test domain:**
```bash
NOTIFICATIONS_EMAIL_BLACKLIST_DOMAINS=test.example.com
```

**Block specific test accounts:**
```bash
NOTIFICATIONS_EMAIL_BLACKLIST_ADDRESSES=testuser1@example.com,testuser2@example.com
```

**Combine both:**
```bash
NOTIFICATIONS_EMAIL_BLACKLIST_DOMAINS=tempmail.com,disposable.email
NOTIFICATIONS_EMAIL_BLACKLIST_ADDRESSES=spam@example.com,bot@service.com
```

### Implementation Details

The blacklist check is performed in two places:

1. `NotificationExternalAdapter.buildBaseEventPayload()` - Filters regular user recipients
2. `NotificationExternalAdapter.buildSpaceCommunityExternalInvitationCreatedNotificationPayload()` - Filters external email invitations

Recipients are filtered before the payload is sent to the notifications service, ensuring blacklisted emails never receive notification events.

## Future Improvements

1. **Batch Processing**: Implement batching for large recipient lists
2. **Rate Limiting**: Add rate limiting for notification sending
3. **Retry Logic**: Implement retry mechanisms for failed notifications
4. **Analytics**: Add tracking for notification delivery and engagement
5. **Templates**: Create a template system for easier notification customization
