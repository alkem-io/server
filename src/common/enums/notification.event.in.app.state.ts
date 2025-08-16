import { registerEnumType } from '@nestjs/graphql';

export enum NotificationEventInAppState {
  READ = 'read',
  UNREAD = 'unread',
  ARCHIVED = 'archived',
}

registerEnumType(NotificationEventInAppState, {
  name: 'NotificationEventInAppState',
});
